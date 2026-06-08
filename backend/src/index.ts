import 'dotenv/config';
import express, { Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { TodoRepo } from './todoRepo';
import { mcpRouter } from './mcp';
import { authRouter, authenticateJWT, verifyToken, AuthRequest } from './authRouter';
import { oauthRouter, wellKnownHandler, protectedResourceHandler } from './oauthRouter';
import { BoardRepo } from './boardRepo';
import { UserRepo } from './userRepo';

const port = process.env.PORT || 3003;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const server = createServer(app);
const wss = new WebSocketServer({ server });

export const boards = new Map<string, Set<WebSocket>>();

app.get('/api/health', (_req, res) => res.send('ok'));

app.get('/.well-known/oauth-authorization-server', wellKnownHandler);
app.get('/.well-known/oauth-protected-resource', protectedResourceHandler);
app.use('/oauth', oauthRouter);
app.use('/api/auth', authRouter);
app.use('/mcp', mcpRouter);

app.post('/api/boards', authenticateJWT, async (req: AuthRequest, res: Response) => {
    const { boardId } = req.body;
    const id: string = boardId || crypto.randomUUID();
    try {
        await BoardRepo.createBoard(id, req.user!.username);
        res.json({ boardId: id });
    } catch (e: any) {
        res.status(e.statusCode ?? 500).json({ error: e.message });
    }
});

app.delete('/api/boards/:boardId', authenticateJWT, async (req: AuthRequest, res: Response) => {
    const boardId = req.params.boardId as string;
    const board = await BoardRepo.getBoard(boardId);
    if (!board) {
        res.status(404).json({error: 'Board not found'});
        return;
    }
    if (board.ownerUsername !== req.user!.username) {
        res.status(403).json({error: 'Only the owner can delete the board'});
        return;
    }
    await BoardRepo.deleteBoard(boardId);
    res.json({ok: true});
});

app.get('/api/boards', authenticateJWT, async (req: AuthRequest, res: Response) => {
    const boards = await BoardRepo.getBoardsByUser(req.user!.username);
    res.json(boards);
});

app.get('/api/boards/:boardId', async (req: AuthRequest, res: Response) => {
    const boardId = req.params.boardId as string;
    const board = await BoardRepo.getBoard(boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }

    const auth = req.headers.authorization;
    const username = auth?.startsWith('Bearer ')
        ? verifyToken(auth.slice(7))?.username ?? null
        : null;

    const canAccess =
        board.isPublic ||
        (username && (board.ownerUsername === username || board.memberUsernames.includes(username)));

    if (!canAccess) { res.status(403).json({ error: 'Forbidden' }); return; }

    res.json({
        ownerUsername: board.ownerUsername,
        memberUsernames: board.memberUsernames,
        isPublic: board.isPublic,
    });
});

app.post('/api/boards/:boardId/members', authenticateJWT, async (req: AuthRequest, res: Response) => {
    const boardId = req.params.boardId as string;
    const board = await BoardRepo.getBoard(boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    if (board.ownerUsername !== req.user!.username) { res.status(403).json({ error: 'Only the owner can add members' }); return; }
    const { username: rawMember } = req.body;
    if (!rawMember) { res.status(400).json({ error: 'username required' }); return; }
    const username = (rawMember as string).toLowerCase();
    const user = await UserRepo.findUser(username);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    await BoardRepo.addMember(boardId, username);
    res.json({ ok: true });
});

app.patch('/api/boards/:boardId/share', authenticateJWT, async (req: AuthRequest, res: Response) => {
    const boardId = req.params.boardId as string;
    const board = await BoardRepo.getBoard(boardId);
    if (!board) { res.status(404).json({ error: 'Board not found' }); return; }
    if (board.ownerUsername !== req.user!.username) { res.status(403).json({ error: 'Only the owner can change sharing' }); return; }
    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') { res.status(400).json({ error: 'isPublic (boolean) required' }); return; }
    await BoardRepo.setPublic(boardId, isPublic);
    res.json({ ok: true });
});

wss.on('connection', (ws: WebSocket) => {
    let subscribedBoardId: string | undefined;

    ws.on('message', async (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'insert' && subscribedBoardId) {
            await TodoRepo.saveListItem(subscribedBoardId, message.item);
        } else if (message.type === 'tombstone' && subscribedBoardId) {
            await TodoRepo.saveTombstone(subscribedBoardId, message.id);
        } else if (message.type === 'join') {
            const boardId: string = message.boardId;
            if (!boardId) return;

            const board = await BoardRepo.getBoard(boardId);
            if (board) {
                const username = message.token ? verifyToken(message.token)?.username : null;
                const authorized =
                    board.isPublic ||
                    (username && (board.ownerUsername === username || board.memberUsernames.includes(username)));
                if (!authorized) {
                    ws.send(JSON.stringify({ type: 'error', message: 'unauthorized' }));
                    ws.close();
                    return;
                }
            }

            subscribedBoardId = boardId;
            if (!boards.has(subscribedBoardId)) boards.set(subscribedBoardId, new Set());
            boards.get(subscribedBoardId)!.add(ws);
            const init = await TodoRepo.getBoardInit(subscribedBoardId);
            ws.send(JSON.stringify({ type: 'init', inserts: init.inserts, tombstones: init.tombstones }));
        }
    });

    ws.on('close', () => {
        if (subscribedBoardId) {
            boards.get(subscribedBoardId)?.delete(ws);
        }
    });
});

server.listen(port, async () => {
    await TodoRepo.initDb();
    await TodoRepo.watchChanges();
    await UserRepo.initUsersDb();
    console.log(`listening on http://localhost:${port}`);
});
