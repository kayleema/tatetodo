import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from './mcp';
import { verifyToken } from './authRouter';

// OpenRouter exposes an OpenAI-compatible /chat/completions API — see https://openrouter.ai/docs
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-3.5-sonnet';
const MAX_TOOL_ITERATIONS = 8;

const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3003').replace(/\/$/, '');

let openRouterClient: OpenAI | null = null;
function getOpenRouterClient(): OpenAI {
    if (!openRouterClient) {
        if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set');
        openRouterClient = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: OPENROUTER_BASE_URL,
            defaultHeaders: {
                'HTTP-Referer': siteUrl,
                'X-Title': 'tatetodo',
            },
        });
    }
    return openRouterClient;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const chatRouter = Router();

chatRouter.post('/', async (req: Request, res: Response) => {
    const { boardId, messages } = req.body as { boardId?: string; messages?: ChatMessage[] };
    if (!boardId || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'boardId and messages are required' });
        return;
    }

    const auth = req.headers.authorization;
    const username = auth?.startsWith('Bearer ') ? verifyToken(auth.slice(7))?.username ?? null : null;

    const mcpServer = createMcpServer(username);
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    const mcpClient = new Client({ name: 'tatetodo-chat', version: '1.0.0' });

    try {
        await mcpServer.connect(serverTransport);
        await mcpClient.connect(clientTransport);

        const { tools: mcpTools } = await mcpClient.listTools();
        const tools: ChatCompletionTool[] = mcpTools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description ?? '',
                parameters: tool.inputSchema,
            },
        }));

        const system = `You are a helpful assistant embedded in a todo list app called tatetodo. You are helping the user manage the todo board with id "${boardId}" — always pass this exact boardId to tools; never ask the user for it. Use the available tools to read, add, edit, move, or delete items on the board. Keep replies short and conversational.`;

        console.log(`[chat] request boardId=${boardId} username=${username ?? '(anon)'} tools=[${mcpTools.map(t => t.name).join(', ')}] messages=${messages.length}`);

        const openai = getOpenRouterClient();
        const conversation: ChatCompletionMessageParam[] = [
            { role: 'system', content: system },
            ...messages.map((m): ChatCompletionMessageParam => ({ role: m.role, content: m.content })),
        ];

        let finalText = '';
        for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
            console.log(`[chat] iteration ${i}: calling model ${MODEL}`);
            const completion = await openai.chat.completions.create({
                model: MODEL,
                messages: conversation,
                tools,
            });

            const message = completion.choices[0].message;
            finalText = message.content ?? '';

            const toolCalls = (message.tool_calls ?? []).filter(tc => tc.type === 'function');
            console.log(`[chat] iteration ${i}: model replied content=${JSON.stringify(finalText).slice(0, 300)} toolCalls=${toolCalls.length}`);
            if (toolCalls.length === 0) break;

            conversation.push({ role: 'assistant', content: message.content, tool_calls: message.tool_calls });

            for (const toolCall of toolCalls) {
                const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
                console.log(`[chat] tool_call ${toolCall.function.name}(${JSON.stringify(args)})`);
                try {
                    const result = await mcpClient.callTool({ name: toolCall.function.name, arguments: args });
                    const text = (result.content as Array<{ type: string; text?: string }>)
                        .filter(c => c.type === 'text')
                        .map(c => c.text ?? '')
                        .join('\n');
                    // Tools return a short human-readable summary in `content` plus the
                    // actual data (item uids/text/status) in `structuredContent` — the
                    // model needs both, otherwise it only ever sees the summary line.
                    const structured = 'structuredContent' in result ? result.structuredContent : undefined;
                    const parts = [text || '(no output)'];
                    if (structured !== undefined) parts.push(JSON.stringify(structured));
                    console.log(`[chat] tool_result ${toolCall.function.name} isError=${result.isError === true} structuredContent=${JSON.stringify(structured)}`);
                    conversation.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: (result.isError ? 'Error: ' : '') + parts.join('\n'),
                    });
                } catch (e: any) {
                    console.log(`[chat] tool_call ${toolCall.function.name} threw: ${e.message ?? e}`);
                    conversation.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: `Error: ${e.message ?? 'Tool call failed'}`,
                    });
                }
            }
        }

        console.log(`[chat] final reply: ${JSON.stringify(finalText).slice(0, 300)}`);
        res.json({ reply: finalText || "(I wasn't able to come up with a response.)" });
    } catch (e: any) {
        console.error('chat request failed', e);
        res.status(500).json({ error: e.message ?? 'Chat request failed' });
    } finally {
        await mcpClient.close().catch(() => {});
        await mcpServer.close().catch(() => {});
    }
});
