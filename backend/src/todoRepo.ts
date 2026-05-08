import nano from 'nano';
import {boards} from "./index";

if (!process.env.COUCHDB_URL) throw new Error('COUCHDB_URL is not set');
if (!process.env.COUCHDB_DB) throw new Error('COUCHDB_DB is not set');

export type ListItem = {
    text: string,
    status: boolean,
    siteId: string,
    version: number,
    afterId?: string,
}

type ListItemDoc = {
    _id: string,
    item: ListItem,
}
type TombstoneDoc = {
    _id: string
}

const couch = nano(process.env.COUCHDB_URL);
const db = couch.db.use<ListItemDoc | TombstoneDoc>(process.env.COUCHDB_DB);

// ensure db exists on startup
const initDb = async () => {
    try {
        await couch.db.create('tatetodo', {partitioned: true});
    } catch (e: any) {
        if (e.statusCode !== 412) throw e; // 412 = already exists, that's fine
    }
};

const saveListItem = async (boardId: string, data: ListItem) => {
    const docId = `${boardId}:item#${data.siteId}#${data.version}`;
    await db.insert({_id: docId, item: data});
};

const saveTombstone = async (boardId: string, tombstoneId: string) => {
    const docId = `${boardId}:tombstone#${tombstoneId}`;
    await db.insert({_id: docId});
};

const getBoardInit = async (boardId: string) => {
    const result = await db.partitionedList(boardId, { include_docs: true });
    const tombstones: string[] = []
    const items: ListItem[] = []
    result.rows.forEach(row => {
        const doc = row.doc
        if (!doc) return
        const type = doc._id.split(":")[1].split(/[#:]/)[0]
        if (type === 'item') {
            items.push((doc as ListItemDoc).item)
        } else if (type === 'tombstone') {
            const tombstoneId = doc._id.split("#")[1]
            tombstones.push(tombstoneId)
        }
    })
    return {inserts: items, tombstones: tombstones}
}

const watchChanges = async () => {
    db.changesReader.start({includeDocs: true}).on('change', (change) => {
        const doc = change.doc;
        const boardId = doc._id.split(':')[0];
        const type = doc._id.split(":")[1].split(/[#:]/)[0]
        boards.get(boardId)?.forEach(ws => {
            if (ws.readyState !== WebSocket.OPEN) return;
            if (type === 'item') {
                ws.send(JSON.stringify({type: "insert", item: doc.item}))
            } else if (type === 'tombstone') {
                const tombstoneId = doc._id.split("#")[1]
                ws.send(JSON.stringify({type: 'tombstone', id: tombstoneId}))
            }
        })
    })
}

export const TodoRepo = {
    initDb,
    saveListItem,
    saveTombstone,
    getBoardInit,
    watchChanges,
} as const;