import nano from 'nano';

if (!process.env.COUCHDB_URL) throw new Error('COUCHDB_URL is not set');
if (!process.env.COUCHDB_DB) throw new Error('COUCHDB_DB is not set');

const couch = nano(process.env.COUCHDB_URL);
const db = couch.db.use<BoardMetaDoc>(process.env.COUCHDB_DB);

export type BoardMeta = {
    ownerUsername: string;
    memberUsernames: string[];
    isPublic: boolean;
    createdAt: string;
};

type BoardMetaDoc = BoardMeta & { _id: string; _rev?: string };

const docId = (boardId: string) => `board-meta:${boardId}`;

const createBoard = async (boardId: string, ownerUsername: string): Promise<void> => {
    try {
        await db.insert({
            _id: docId(boardId),
            ownerUsername,
            memberUsernames: [],
            isPublic: false,
            createdAt: new Date().toISOString(),
        });
    } catch (e: any) {
        if (e.statusCode === 409) throw Object.assign(new Error('Board already exists'), { statusCode: 409 });
        throw e;
    }
};

const getBoard = async (boardId: string): Promise<BoardMetaDoc | null> => {
    try {
        return await db.get(docId(boardId));
    } catch (e: any) {
        if (e.statusCode === 404) return null;
        throw e;
    }
};

const getBoardsByUser = async (username: string): Promise<(BoardMeta & { boardId: string })[]> => {
    const result = await db.partitionedList('board-meta', { include_docs: true });
    return result.rows
        .filter(row => {
            const doc = row.doc as BoardMetaDoc | undefined;
            return doc && (doc.ownerUsername === username || doc.memberUsernames.includes(username));
        })
        .map(row => {
            const doc = row.doc as BoardMetaDoc;
            const boardId = doc._id.split(':')[1];
            return { boardId, ownerUsername: doc.ownerUsername, memberUsernames: doc.memberUsernames, isPublic: doc.isPublic, createdAt: doc.createdAt };
        });
};

const addMember = async (boardId: string, username: string): Promise<void> => {
    const doc = await db.get(docId(boardId));
    if (doc.memberUsernames.includes(username)) return;
    await db.insert({ ...doc, memberUsernames: [...doc.memberUsernames, username] });
};

const setPublic = async (boardId: string, isPublic: boolean): Promise<void> => {
    const doc = await db.get(docId(boardId));
    await db.insert({ ...doc, isPublic });
};

const deleteBoard = async (boardId: string): Promise<void> => {
    try {
        const doc = await db.get(docId(boardId));
        await db.destroy(doc._id, doc._rev!);
    } catch (e: any) {
        if (e.statusCode === 404) throw Object.assign(new Error('Board not found'), {statusCode: 404});
        throw e;
    }
};

export const BoardRepo = {createBoard, getBoard, getBoardsByUser, addMember, setPublic, deleteBoard};
