import { Router, Request, Response } from 'express';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UserRepo } from './userRepo';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = (process.env.BASE_URL ?? 'https://todo.kaylee.jp').replace(/\/$/, '');

type OAuthClient = { clientId: string; redirectUris: string[]; clientName?: string };
type AuthCode = {
    clientId: string;
    redirectUri: string;
    username: string;
    codeChallenge: string;
    state: string;
    expiresAt: number;
};

const clients = new Map<string, OAuthClient>();
const authCodes = new Map<string, AuthCode>();

// ── well-known metadata ───────────────────────────────────────────────────────

export const wellKnownHandler = (_req: Request, res: Response) => {
    res.json({
        issuer: BASE_URL,
        authorization_endpoint: `${BASE_URL}/oauth/authorize`,
        token_endpoint: `${BASE_URL}/oauth/token`,
        registration_endpoint: `${BASE_URL}/oauth/register`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
    });
};

export const protectedResourceHandler = (_req: Request, res: Response) => {
    res.json({
        resource: BASE_URL,
        authorization_servers: [BASE_URL],
        bearer_methods_supported: ['header'],
    });
};

// ── helpers ───────────────────────────────────────────────────────────────────

function escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function loginForm(params: Record<string, string>, error?: string): string {
    const hidden = Object.entries(params)
        .map(([k, v]) => `<input type="hidden" name="${escHtml(k)}" value="${escHtml(v)}">`)
        .join('\n    ');
    const errorHtml = error
        ? `<p class="error">Invalid username or password. Please try again.</p>`
        : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign in · TATETODO</title>
  <style>
    body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
    form{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.12);width:320px;display:flex;flex-direction:column;gap:.75rem}
    h1{margin:0 0 .5rem;font-size:1.25rem;text-align:center}
    input[type=text],input[type=password]{padding:.5rem .75rem;border:1px solid #ccc;border-radius:4px;font-size:1rem}
    button{padding:.6rem;background:#0066cc;color:#fff;border:none;border-radius:4px;font-size:1rem;cursor:pointer}
    button:hover{background:#0052a3}
    .error{color:#c00;margin:0;font-size:.9rem}
  </style>
</head>
<body>
  <form method="POST" action="/oauth/authorize">
    <h1>✅ TATETODO</h1>
    ${errorHtml}
    ${hidden}
    <input type="text" name="username" placeholder="Username" required autofocus autocomplete="username">
    <input type="password" name="password" placeholder="Password" required autocomplete="current-password">
    <button type="submit">Sign in</button>
  </form>
</body>
</html>`;
}

// ── router ────────────────────────────────────────────────────────────────────

export const oauthRouter = Router();

// Dynamic client registration (RFC 7591)
oauthRouter.post('/register', (req: Request, res: Response) => {
    const { redirect_uris, client_name } = req.body as { redirect_uris?: string[]; client_name?: string };
    if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
        res.status(400).json({ error: 'invalid_client_metadata', error_description: 'redirect_uris required' });
        return;
    }
    const clientId = randomUUID();
    clients.set(clientId, { clientId, redirectUris: redirect_uris, clientName: client_name });
    res.status(201).json({
        client_id: clientId,
        client_name,
        redirect_uris,
        grant_types: ['authorization_code'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
    });
});

// Authorization endpoint – GET (show login form)
oauthRouter.get('/authorize', (req: Request, res: Response) => {
    const q = req.query as Record<string, string>;
    const { client_id, redirect_uri, response_type, code_challenge, code_challenge_method, state, error } = q;

    if (response_type !== 'code') { res.status(400).send('unsupported_response_type'); return; }
    if (!code_challenge) { res.status(400).send('code_challenge required (S256 PKCE)'); return; }

    // Per RFC 6749 §4.1.2.1: invalid client_id or redirect_uri must NOT redirect
    const client = clients.get(client_id);
    if (!client) { res.status(400).send('Unknown client_id'); return; }
    if (!client.redirectUris.includes(redirect_uri)) { res.status(400).send('redirect_uri not registered'); return; }

    const oauthParams = {
        client_id, redirect_uri, response_type,
        code_challenge, code_challenge_method: code_challenge_method || 'S256',
        state: state || '',
    };
    res.send(loginForm(oauthParams, error));
});

// Authorization endpoint – POST (process login)
oauthRouter.post('/authorize', async (req: Request, res: Response) => {
    const { username, password, client_id, redirect_uri, code_challenge, code_challenge_method, state } =
        req.body as Record<string, string>;

    const client = clients.get(client_id);
    if (!client || !client.redirectUris.includes(redirect_uri)) {
        res.status(400).send('Invalid client or redirect_uri');
        return;
    }

    const oauthParams = {
        client_id, redirect_uri, response_type: 'code',
        code_challenge, code_challenge_method: code_challenge_method || 'S256',
        state: state || '',
    };

    const ok = await UserRepo.verifyPassword(username?.toLowerCase() ?? '', password ?? '');
    if (!ok) {
        const params = new URLSearchParams({ ...oauthParams, error: 'invalid_credentials' });
        res.redirect(`/oauth/authorize?${params}`);
        return;
    }

    const code = randomBytes(32).toString('hex');
    authCodes.set(code, {
        clientId: client_id,
        redirectUri: redirect_uri,
        username: username.toLowerCase(),
        codeChallenge: code_challenge,
        state: state || '',
        expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const callback = new URLSearchParams({ code });
    if (state) callback.set('state', state);
    res.redirect(`${redirect_uri}?${callback}`);
});

// Token endpoint
oauthRouter.post('/token', (req: Request, res: Response) => {
    const { grant_type, code, code_verifier, redirect_uri, client_id } =
        req.body as Record<string, string>;

    if (grant_type !== 'authorization_code') {
        res.status(400).json({ error: 'unsupported_grant_type' });
        return;
    }
    if (!code || !code_verifier) {
        res.status(400).json({ error: 'invalid_request' });
        return;
    }

    const record = authCodes.get(code);
    authCodes.delete(code); // always delete on first attempt

    if (!record) {
        res.status(400).json({ error: 'invalid_grant' });
        return;
    }
    if (record.expiresAt < Date.now()) {
        res.status(400).json({ error: 'invalid_grant' });
        return;
    }
    if (record.clientId !== client_id) {
        res.status(400).json({ error: 'invalid_grant' });
        return;
    }
    if (record.redirectUri !== redirect_uri) {
        res.status(400).json({ error: 'invalid_grant' });
        return;
    }

    const digest = createHash('sha256').update(code_verifier).digest('base64url');
    if (digest !== record.codeChallenge) {
        res.status(400).json({ error: 'invalid_grant' });
        return;
    }

    const access_token = jwt.sign({ username: record.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ access_token, token_type: 'Bearer', expires_in: 30 * 24 * 60 * 60 });
});
