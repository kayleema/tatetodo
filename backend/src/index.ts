import 'dotenv/config';
import express from 'express';
import {WebSocketServer, WebSocket} from 'ws';
import {createServer} from 'http';
import {TodoRepo} from "./todoRepo";

const port = process.env.PORT || 3003;

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({server});

export const boards = new Map<string, Set<WebSocket>>();

app.get('/api/health', (req, res) =>
    res.send('ok')
)

wss.on('connection', (ws: WebSocket) => {
    console.log('client connected');
    let subscribedBoardId: string | undefined;

    ws.on('message', async (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'insert' && subscribedBoardId) {
            await TodoRepo.saveListItem(subscribedBoardId, message.item);
        } else if (message.type === 'tombstone' && subscribedBoardId) {
            await TodoRepo.saveTombstone(subscribedBoardId, message.id);
        } else if (message.type === 'join') {
            subscribedBoardId = message.boardId;
            if (!subscribedBoardId) return;
            if (!boards.has(subscribedBoardId)) {
                boards.set(subscribedBoardId, new Set());
            }
            boards.get(subscribedBoardId)!.add(ws);
            const init = await TodoRepo.getBoardInit(subscribedBoardId);
            ws.send(JSON.stringify({type: 'init', inserts: init.inserts, tombstones: init.tombstones}));
        }
    });

    ws.on('close', () => {
        if (subscribedBoardId) {
            const board = boards.get(subscribedBoardId);
            if (board) {
                board.delete(ws);
            }
        }
        console.log('client disconnected')
    });
});

server.listen(port, async () => {
    await TodoRepo.initDb();
    await TodoRepo.watchChanges();
    console.log(`listening on http://localhost:${port}`)
});