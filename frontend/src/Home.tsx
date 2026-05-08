import { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FooterText } from "./FooterText.tsx";
import { useColorScheme } from "./useColorScheme.ts";
import { useAuth } from "./AuthContext.tsx";

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
        () => localStorage.getItem('writingModeHorizontal') === 'true'
    );
    const navigate = useNavigate();
    const { scheme, toggle: toggleColorScheme } = useColorScheme();
    const { token, username, logout } = useAuth();
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
                <strong>✔︎ やることリスト</strong>
                {token
                    ? <span>こんにちは、{username} · <a href="#" onClick={e => { e.preventDefault(); logout(); }}>ログアウト</a></span>
                    : <span><Link to="/login">ログイン</Link> · <Link to="/register">新規登録</Link></span>
                }
            </nav>

            {boards.length > 0 && (
                <article>
                    <h3>あなたのリスト</h3>
                    <ul>
                        {boards.map(b => (
                            <li key={b.boardId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/board/${b.boardId}`)}>
                                <fieldset>
                                    <input value={b.boardId} readOnly style={{ cursor: 'pointer', flexGrow: 1 }} />
                                    <button className="secondary" onClick={e => { e.stopPropagation(); navigate(`/board/${b.boardId}`); }}>開く</button>
                                </fieldset>
                            </li>
                        ))}
                    </ul>
                </article>
            )}

            <article>
                <h3>名前で開くもしくは作成：</h3>
                <p>
                    <form onSubmit={e => { e.preventDefault(); openOrCreate(); }}>
                        <fieldset>
                            <input placeholder="リスト名" ref={nameInputRef} />
                            <button type="submit">リストを開く</button>
                        </fieldset>
                    </form>
                </p>
                {boardError && <p><mark>{boardError}</mark></p>}
            </article>

            <article>
                <h3>名前をランダムで作成する（UUID秘密）：</h3>
                <p><button onClick={createRandom}>リストを作成</button></p>
            </article>

            <article style={{ writingMode: "horizontal-tb", overflowY: "auto", minWidth: "460px" }}>
                <h3>MCPサーバーの設定：</h3>
                <p>AIエージェント（Claude等）からリストを読み書きできます。公開ボードは認証不要です。プライベートボードにアクセスするにはトークンが必要です。</p>
                {token && (
                    <p><small>ログイン中のトークン（コピーして下記コマンドに使用）：<br /><code style={{ wordBreak: 'break-all' }}>{token}</code><br />⚠️ このトークンは30日間有効です。期限切れ後は再ログインして新しいトークンを取得し、設定を更新してください。</small></p>
                )}
                <p><strong>Claude Code</strong></p>
                <pre>{token
                    ? `claude mcp add --transport http --header "Authorization: Bearer ${token}" tatetodo https://todo.kaylee.jp/mcp`
                    : 'claude mcp add --transport http tatetodo https://todo.kaylee.jp/mcp'
                }</pre>
                <p><strong>Claude Desktop</strong>（<code>claude_desktop_config.json</code>に追加）</p>
                <p><small>左下の名前をクリック → 設定 → 開発者 → 設定を編集、またはファイルを直接編集：<br />Mac: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code><br />Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></small></p>
                <p><small>Claude DesktopはHTTPに直接対応していないため、<code>mcp-remote</code>プロキシ経由で接続します（Node.js必要）。</small></p>
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
                    })}>縦横表示切替</a>
                    {" · "}
                    <a href="#" onClick={toggleColorScheme}>{scheme === 'dark' ? '☀ ライトモード' : '🌙 ダークモード'}</a>
                </p>
                <FooterText />
            </footer>
        </main>
    );
}
