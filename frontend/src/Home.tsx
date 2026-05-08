import { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FooterText } from "./FooterText.tsx";
import { useColorScheme } from "./useColorScheme.ts";
import { useAuth } from "./AuthContext.tsx";
import { useTranslation } from 'react-i18next';
import { LangSwitcher } from './LangSwitcher.tsx';

type BoardMeta = { boardId: string; ownerUsername: string; isPublic: boolean; createdAt: string };

async function apiCreateBoard(boardId: string | undefined, token: string): Promise<string> {
    const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(boardId ? { boardId } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? '作成に失敗しました');
    return data.boardId;
}

export function Home() {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [writingModeHorizontal, setWritingModeHorizontal] = useState(
        () => localStorage.getItem('writingModeHorizontal') !== 'false'
    );
    const navigate = useNavigate();
    const { scheme, toggle: toggleColorScheme } = useColorScheme();
    const { token, username, logout } = useAuth();
    const { t } = useTranslation();
    const [boards, setBoards] = useState<BoardMeta[]>([]);
    const [boardError, setBoardError] = useState('');

    useEffect(() => {
        if (!token) return;
        fetch('/api/boards', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.json())
            .then(setBoards)
            .catch(() => {});
    }, [token]);

    const openOrCreate = async () => {
        const name = nameInputRef.current?.value.trim();
        if (!name) return;
        if (!token) { navigate(`/board/${name}`); return; }
        setBoardError('');
        try {
            await apiCreateBoard(name, token);
            navigate(`/board/${name}`);
        } catch (e: any) {
            if (e.message.includes('already exists')) {
                navigate(`/board/${name}`);
            } else {
                setBoardError(e.message);
            }
        }
    };

    const createRandom = async () => {
        if (!token) { navigate(`/board/${crypto.randomUUID()}`); return; }
        setBoardError('');
        try {
            const boardId = await apiCreateBoard(undefined, token);
            navigate(`/board/${boardId}`);
        } catch (e: any) {
            setBoardError(e.message);
        }
    };

    return (
        <main style={{ writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl" }}>
            <nav>
                <strong>{t('nav.appName')}</strong>
                {token
                    ? <span>{t('nav.hello', { username })}  · <a href="#" onClick={e => { e.preventDefault(); logout(); }}>{ t('nav.logout')}</a></span>
                    : <span><Link to="/login">{t('nav.login')}</Link> · <Link to="/register">{t('nav.register')}</Link></span>
                }
            </nav>

            {boards.length > 0 && (
                <article>
                    <h3>{t('home.myBoards')}</h3>
                    <ul>
                        {boards.map(b => (
                            <li key={b.boardId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/board/${b.boardId}`)}>
                                <fieldset>
                                    <input value={b.boardId} readOnly style={{ cursor: 'pointer', flexGrow: 1 }} />
                                    <button className="secondary" onClick={e => { e.stopPropagation(); navigate(`/board/${b.boardId}`); }}>{t('home.open')}</button>
                                </fieldset>
                            </li>
                        ))}
                    </ul>
                </article>
            )}

            <article>
                <h3>{t('home.openOrCreate')}</h3>
                <p>
                    <form onSubmit={e => { e.preventDefault(); openOrCreate(); }}>
                        <fieldset>
                            <input placeholder={t('home.listName')} ref={nameInputRef} />
                            <button type="submit">{t('home.openList')}</button>
                        </fieldset>
                    </form>
                </p>
                {boardError && <p><mark>{boardError}</mark></p>}
            </article>

            <article>
                <h3>{t('home.createRandom')}</h3>
                <p><button onClick={createRandom}>{t('home.createList')}</button></p>
            </article>

            <article style={{ writingMode: "horizontal-tb", overflowY: "auto", flexShrink: 0, width: writingModeHorizontal ? "auto" : "400px" }}>
                <h3>{t('mcp.title')}</h3>
                <p>{t('mcp.description')}</p>
                {token && (
                    <p><small>{t('mcp.tokenLabel')}<br /><code style={{ wordBreak: 'break-all' }}>{token}</code><br />{t('mcp.tokenWarning')}</small></p>
                )}
                <p><strong>Claude Code</strong></p>
                <pre>{token
                    ? `claude mcp add --transport http tatetodo https://todo.kaylee.jp/mcp --header "Authorization: Bearer ${token}"`
                    : 'claude mcp add --transport http tatetodo https://todo.kaylee.jp/mcp'
                }</pre>
                <p><strong>{t('mcp.claudeDesktopHeading', { filename: 'claude_desktop_config.json' })}</strong></p>
                <p><small>{t('mcp.claudeDesktopNote')}<br />Mac: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code><br />Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></small></p>
                <p><small>{t('mcp.claudeDesktopProxy')}</small></p>
                <pre>{token
                    ? `{
  "mcpServers": {
    "tatetodo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "--header", "Authorization: Bearer ${token}", "https://todo.kaylee.jp/mcp"]
    }
  }
}`
                    : `{
  "mcpServers": {
    "tatetodo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://todo.kaylee.jp/mcp"]
    }
  }
}`
                }</pre>
            </article>

            <footer>
                <p>
                    <a href="#" onClick={() => setWritingModeHorizontal(v => {
                        const next = !v;
                        localStorage.setItem('writingModeHorizontal', String(next));
                        return next;
                    })}>{t('footer.toggleWritingMode')}</a>
                    {" · "}
                    <a href="#" onClick={toggleColorScheme}>{scheme === 'dark' ? t('footer.lightMode') : t('footer.darkMode')}</a>
                    {" · "}
                    <LangSwitcher />
                </p>
                <FooterText />
            </footer>
        </main>
    );
}
