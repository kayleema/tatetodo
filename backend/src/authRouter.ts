import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserRepo } from './userRepo';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
const JWT_SECRET = process.env.JWT_SECRET;

export type AuthRequest = Request & { user?: { username: string } };

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Missing token' }); return; }
    try {
        const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { username: string };
        req.user = { username: payload.username };
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const verifyToken = (token: string): { username: string } | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as { username: string };
    } catch {
        return null;
    }
};

const credentialsSchema = z.object({ username: z.string().min(1).max(40), password: z.string().min(8) });

export const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
    const result = credentialsSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: 'Invalid username or password (min 8 chars)' }); return; }
    const { username: rawUsername, password } = result.data;
    const username = rawUsername.toLowerCase();
    try {
        await UserRepo.createUser(username, password);
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token });
    } catch (e: any) {
        res.status(e.statusCode ?? 500).json({ error: e.message });
    }
});

authRouter.post('/login', async (req: Request, res: Response) => {
    const result = credentialsSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json({ error: 'Invalid credentials' }); return; }
    const { username: rawUsername, password } = result.data;
    const username = rawUsername.toLowerCase();
    const ok = await UserRepo.verifyPassword(username, password);
    if (!ok) { res.status(401).json({ error: 'Invalid username or password' }); return; }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
});
