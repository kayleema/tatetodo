import { Router, Request, Response } from 'express';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { TodoRepo, ListItem } from './todoRepo';

// Mirrors frontend/src/ListItem.ts — CRDT helpers for ordering and UID generation
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const siteId = Array.from(randomBytes(4), (b: number) => B64[b % 64]).join('');
let mcpVersion = 0;

const getUID = (item: ListItem) => `${item.siteId}:${item.version}`;

function sortItems(input: ListItem[]): ListItem[] {
    const byAfterId = new Map<string | undefined, ListItem[]>();
    for (const item of input) {
        if (!byAfterId.has(item.afterId)) byAfterId.set(item.afterId, []);
        byAfterId.get(item.afterId)!.push(item);
    }
    for (const siblings of byAfterId.values()) {
        siblings.sort((a, b) => b.version - a.version || b.siteId.localeCompare(a.siteId));
    }
    const result: ListItem[] = [];
    const visit = (afterId: string | undefined) => {
        for (const item of byAfterId.get(afterId) ?? []) {
            result.push(item);
            visit(getUID(item));
        }
    };
    visit(undefined);
    return result;
}

async function getVisible(boardId: string): Promise<ListItem[]> {
    const { inserts, tombstones } = await TodoRepo.getBoardInit(boardId);
    const dead = new Set(tombstones);
    return sortItems(inserts).filter(i => !dead.has(getUID(i)));
}

function toDisplayItem(item: ListItem) {
    const { siteId: _s, version: _v, ...rest } = item;
    return { uid: getUID(item), ...rest };
}

function createMcpServer(): McpServer {
    const server = new McpServer({ name: 'tatetodo', version: '1.0.0' });

    server.tool(
        'get_board',
        'Get all visible todo items on a board in sorted order',
        { boardId: z.string().describe('The board ID') },
        async ({ boardId }) => {
            const visible = await getVisible(boardId);
            return { content: [{ type: 'text' as const, text: JSON.stringify(visible.map(toDisplayItem), null, 2) }] };
        }
    );

    server.tool(
        'add_item',
        'Add a new todo item to a board',
        {
            boardId: z.string().describe('The board ID'),
            text: z.string().describe('The todo item text'),
            status: z.boolean().optional().describe('Completion status (default: false)'),
            afterUid: z.string().optional().describe('UID of the item to insert after; omit to append at end'),
        },
        async ({ boardId, text, status = false, afterUid }) => {
            const item: ListItem = { text, status, siteId, version: mcpVersion++, afterId: afterUid };
            await TodoRepo.saveListItem(boardId, item);
            return { content: [{ type: 'text' as const, text: getUID(item) }] };
        }
    );

    server.tool(
        'update_item',
        'Update the text or completion status of a todo item (tombstones the old version and inserts a new one)',
        {
            boardId: z.string().describe('The board ID'),
            uid: z.string().describe('UID of the item to update (format: siteId:version)'),
            text: z.string().optional().describe('New text'),
            status: z.boolean().optional().describe('New completion status'),
        },
        async ({ boardId, uid, text, status }) => {
            const { inserts, tombstones } = await TodoRepo.getBoardInit(boardId);
            const dead = new Set(tombstones);
            const sorted = sortItems(inserts).filter(i => !dead.has(getUID(i)));
            const index = sorted.findIndex(i => getUID(i) === uid);
            if (index === -1) throw new Error(`Item ${uid} not found on board ${boardId}`);
            const item = sorted[index];
            const newAfterId = index === 0 ? undefined : getUID(sorted[index - 1]);
            await TodoRepo.saveTombstone(boardId, uid);
            const newItem: ListItem = {
                ...item,
                afterId: newAfterId,
                ...(text !== undefined && { text }),
                ...(status !== undefined && { status }),
                siteId,
                version: mcpVersion++,
            };
            await TodoRepo.saveListItem(boardId, newItem);
            return { content: [{ type: 'text' as const, text: getUID(newItem) }] };
        }
    );

    server.tool(
        'move_item',
        'Move a todo item to a different position in the list',
        {
            boardId: z.string().describe('The board ID'),
            uid: z.string().describe('UID of the item to move'),
            afterUid: z.string().optional().describe('UID of the item to place this after; omit to move to top'),
        },
        async ({ boardId, uid, afterUid }) => {
            const { inserts, tombstones } = await TodoRepo.getBoardInit(boardId);
            const dead = new Set(tombstones);
            const sorted = sortItems(inserts).filter(i => !dead.has(getUID(i)));
            const item = sorted.find(i => getUID(i) === uid);
            if (!item) throw new Error(`Item ${uid} not found on board ${boardId}`);
            await TodoRepo.saveTombstone(boardId, uid);
            const newItem: ListItem = { ...item, afterId: afterUid, siteId, version: mcpVersion++ };
            await TodoRepo.saveListItem(boardId, newItem);
            return { content: [{ type: 'text' as const, text: getUID(newItem) }] };
        }
    );

    server.tool(
        'delete_item',
        'Delete a todo item',
        {
            boardId: z.string().describe('The board ID'),
            uid: z.string().describe('UID of the item to delete (format: siteId:version)'),
        },
        async ({ boardId, uid }) => {
            await TodoRepo.saveTombstone(boardId, uid);
            return { content: [{ type: 'text' as const, text: 'deleted' }] };
        }
    );

    server.resource(
        'board',
        new ResourceTemplate('board://{boardId}', { list: undefined }),
        async (uri, { boardId }) => {
            const visible = await getVisible(boardId as string);
            return {
                contents: [{
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify(visible.map(toDisplayItem), null, 2),
                }],
            };
        }
    );

    return server;
}

const sessions = new Map<string, StreamableHTTPServerTransport>();

export const mcpRouter = Router();

mcpRouter.post('/', async (req: Request, res: Response) => {
    const sid = req.headers['mcp-session-id'] as string | undefined;
    if (sid && sessions.has(sid)) {
        await sessions.get(sid)!.handleRequest(req, res, req.body);
        return;
    }
    if (!isInitializeRequest(req.body)) {
        res.status(400).json({ error: 'Expected initialize request or valid mcp-session-id header' });
        return;
    }
    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id: string) => { sessions.set(id, transport); },
    });
    transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
    };
    await createMcpServer().connect(transport);
    await transport.handleRequest(req, res, req.body);
});

mcpRouter.get('/', async (req: Request, res: Response) => {
    const sid = req.headers['mcp-session-id'] as string | undefined;
    if (!sid || !sessions.has(sid)) {
        res.status(400).json({ error: 'No active session — send an initialize request first' });
        return;
    }
    await sessions.get(sid)!.handleRequest(req, res);
});

mcpRouter.delete('/', async (req: Request, res: Response) => {
    const sid = req.headers['mcp-session-id'] as string | undefined;
    if (!sid || !sessions.has(sid)) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    await sessions.get(sid)!.handleRequest(req, res);
});
