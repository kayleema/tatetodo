import nano from 'nano';
import bcrypt from 'bcrypt';

if (!process.env.COUCHDB_URL) throw new Error('COUCHDB_URL is not set');

const couch = nano(process.env.COUCHDB_URL);

type UserDoc = {
    _id: string;
    passwordHash: string;
    createdAt: string;
};

let db: nano.DocumentScope<UserDoc>;

const initUsersDb = async () => {
    try {
        await couch.db.create('tatetodo-users');
    } catch (e: any) {
        if (e.statusCode !== 412) throw e;
    }
    db = couch.db.use<UserDoc>('tatetodo-users');
};

const createUser = async (username: string, password: string): Promise<void> => {
    const existing = await findUser(username);
    if (existing) throw Object.assign(new Error('Username already taken'), { statusCode: 409 });
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert({ _id: username, passwordHash, createdAt: new Date().toISOString() });
};

const findUser = async (username: string): Promise<UserDoc | null> => {
    try {
        return await db.get(username);
    } catch (e: any) {
        if (e.statusCode === 404) return null;
        throw e;
    }
};

const verifyPassword = async (username: string, password: string): Promise<boolean> => {
    const user = await findUser(username);
    if (!user) return false;
    return bcrypt.compare(password, user.passwordHash);
};

export const UserRepo = { initUsersDb, createUser, findUser, verifyPassword };
