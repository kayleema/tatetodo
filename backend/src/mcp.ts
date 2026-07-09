import { Router, Request, Response } from 'express';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { TodoRepo, ListItem } from './todoRepo';
import { BoardRepo } from './boardRepo';
import { verifyToken } from './authRouter';

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

// Returns null if access is granted, or an error message string if denied.
async function checkAccess(boardId: string, username: string | null): Promise<string | null> {
    const board = await BoardRepo.getBoard(boardId);
    if (!board) return null; // legacy board with no metadata — open to all
    if (board.isPublic) return null;
    if (username && (board.ownerUsername === username || board.memberUsernames.includes(username))) return null;
    return `Access denied to board "${boardId}"`;
}

const siteUrl = (process.env.SITE_URL ?? 'http://localhost:3003').replace(/\/$/, '');

function boardUrl(boardId: string) { return `${siteUrl}/board/${boardId}`; }

export function createMcpServer(username: string | null): McpServer {
    const server = new McpServer({ name: 'tatetodo', version: '1.0.0' });

    server.registerTool(
        'create_board',
        {
            description: 'Create a new board owned by the authenticated user. Requires authentication.',
            inputSchema: { boardId: z.string().optional().describe('Board ID to use; omit to generate a random UUID') },
            outputSchema: { boardId: z.string(), url: z.string() },
            annotations: { readOnlyHint: false, destructiveHint: false },
        },
        async ({ boardId }) => {
            if (!username) throw new Error('Authentication required to create a board');
            const id = boardId ?? randomUUID();
            await BoardRepo.createBoard(id, username);
            const data = { boardId: id, url: boardUrl(id) };
            return { structuredContent: data, content: [{ type: 'text' as const, text: `Created board "${id}" at ${boardUrl(id)}` }] };
        }
    );

    server.registerTool(
        'get_board_info',
        {
            description: 'Get metadata for a board: owner, members, public status, and its URL',
            inputSchema: { boardId: z.string().describe('The board ID') },
            outputSchema: {
                boardId: z.string(),
                url: z.string(),
                ownerUsername: z.string().optional(),
                memberUsernames: z.array(z.string()).optional(),
                isPublic: z.boolean().optional(),
                note: z.string().optional(),
            },
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async ({ boardId }) => {
            const denied = await checkAccess(boardId, username);
            if (denied) throw new Error(denied);
            const board = await BoardRepo.getBoard(boardId);
            if (!board) {
                const data = { boardId, url: boardUrl(boardId), note: 'Legacy board — no ownership metadata' };
                return { structuredContent: data, content: [{ type: 'text' as const, text: `Board "${boardId}" — legacy board with no ownership metadata` }] };
            }
            const data = { boardId, url: boardUrl(boardId), ownerUsername: board.ownerUsername, memberUsernames: board.memberUsernames, isPublic: board.isPublic };
            return { structuredContent: data, content: [{ type: 'text' as const, text: `Board "${boardId}" — owner: ${board.ownerUsername}, members: ${board.memberUsernames.join(', ') || 'none'}, public: ${board.isPublic}` }] };
        }
    );

    server.registerTool(
        'get_board',
        {
            description: 'Get all visible todo items on a board in sorted order',
            inputSchema: { boardId: z.string().describe('The board ID') },
            outputSchema: { items: z.array(z.object({ uid: z.string(), text: z.string(), status: z.boolean(), afterId: z.string().optional() })) },
            annotations: { readOnlyHint: true, openWorldHint: true },
        },
        async ({ boardId }) => {
            const denied = await checkAccess(boardId, username);
            if (denied) throw new Error(denied);
            const visible = await getVisible(boardId);
            const items = visible.map(toDisplayItem);
            return { structuredContent: { items }, content: [{ type: 'text' as const, text: `${items.length} item(s) on board "${boardId}"` }] };
        }
    );

    server.registerTool(
        'add_item',
        {
            description: 'Add a new todo item to a board',
            inputSchema: {
                boardId: z.string().describe('The board ID'),
                text: z.string().describe('The todo item text'),
                status: z.boolean().optional().describe('Completion status (default: false)'),
                afterUid: z.string().optional().describe('UID of the item to insert after; omit to append at end'),
            },
            outputSchema: { uid: z.string() },
            annotations: { readOnlyHint: false, openWorldHint: true },
        },
        async ({ boardId, text, status = false, afterUid }) => {
            const denied = await checkAccess(boardId, username);
            if (denied) throw new Error(denied);
            const item: ListItem = { text, status, siteId, version: mcpVersion++, afterId: afterUid };
            await TodoRepo.saveListItem(boardId, item);
            const uid = getUID(item);
            return { structuredContent: { uid }, content: [{ type: 'text' as const, text: `Added item "${text}" with uid ${uid}` }] };
        }
    );

    server.registerTool(
        'update_item',
        {
            description: 'Update the text or completion status of a todo item (tombstones the old version and inserts a new one)',
            inputSchema: {
                boardId: z.string().describe('The board ID'),
                uid: z.string().describe('UID of the item to update (format: siteId:version)'),
                text: z.string().optional().describe('New text'),
                status: z.boolean().optional().describe('New completion status'),
            },
            outputSchema: { uid: z.string() },
            annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
        },
        async ({ boardId, uid, text, status }) => {
            const denied = await checkAccess(boardId, username);
            if (denied) throw new Error(denied);
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
            const newUid = getUID(newItem);
            return { structuredContent: { uid: newUid }, content: [{ type: 'text' as const, text: `Updated item, new uid ${newUid}` }] };
        }
    );

    server.registerTool(
        'move_item',
        {
            description: 'Move a todo item to a different position in the list',
            inputSchema: {
                boardId: z.string().describe('The board ID'),
                uid: z.string().describe('UID of the item to move'),
                afterUid: z.string().optional().describe('UID of the item to place this after; omit to move to top'),
            },
            outputSchema: { uid: z.string() },
            annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
        },
        async ({ boardId, uid, afterUid }) => {
            const denied = await checkAccess(boardId, username);
            if (denied) throw new Error(denied);
            const { inserts, tombstones } = await TodoRepo.getBoardInit(boardId);
            const dead = new Set(tombstones);
            const sorted = sortItems(inserts).filter(i => !dead.has(getUID(i)));
            const item = sorted.find(i => getUID(i) === uid);
            if (!item) throw new Error(`Item ${uid} not found on board ${boardId}`);
            await TodoRepo.saveTombstone(boardId, uid);
            const newItem: ListItem = { ...item, afterId: afterUid, siteId, version: mcpVersion++ };
            await TodoRepo.saveListItem(boardId, newItem);
            const newUid = getUID(newItem);
            return { structuredContent: { uid: newUid }, content: [{ type: 'text' as const, text: `Moved item, new uid ${newUid}` }] };
        }
    );

    server.registerTool(
        'delete_item',
        {
            description: 'Delete a todo item',
            inputSchema: {
                boardId: z.string().describe('The board ID'),
                uid: z.string().describe('UID of the item to delete (format: siteId:version)'),
            },
            outputSchema: { deleted: z.boolean() },
            annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
        },
        async ({ boardId, uid }) => {
            const denied = await checkAccess(boardId, username);
            if (denied) throw new Error(denied);
            await TodoRepo.saveTombstone(boardId, uid);
            return { structuredContent: { deleted: true }, content: [{ type: 'text' as const, text: `Deleted item ${uid}` }] };
        }
    );

    server.resource(
        'board',
        new ResourceTemplate('board://{boardId}', { list: undefined }),
        async (uri, { boardId }) => {
            const id = boardId as string;
            const denied = await checkAccess(id, username);
            if (denied) throw new Error(denied);
            const visible = await getVisible(id);
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
    const auth = req.headers.authorization;
    const username = auth?.startsWith('Bearer ') ? verifyToken(auth.slice(7))?.username ?? null : null;

    const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id: string) => { sessions.set(id, transport); },
    });
    transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
    };
    await createMcpServer(username).connect(transport);
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
