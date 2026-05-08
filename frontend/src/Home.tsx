import {useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {FooterText} from "./FooterText.tsx";
import {useColorScheme} from "./useColorScheme.ts";

export function Home() {
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [writingModeHorizontal, setWritingModeHorizontal] = useState(
        () => localStorage.getItem('writingModeHorizontal') === 'true'
    )
    const navigate = useNavigate()
    const {scheme, toggle: toggleColorScheme} = useColorScheme()

    return (
        <main style={{writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl"}}>
            <nav>
                <strong>✔︎ やることリスト</strong>
            </nav>

            <article>
                <h3>名前で開くもしくは作成：</h3>
                <p>
                    <form>
                        <fieldset>
                            <input placeholder={"リスト名"} ref={nameInputRef}/>
                            <button onClick={() => {
                                const name = nameInputRef.current?.value
                                if (name) {
                                    navigate(`/board/${name}`)
                                }
                            }}>リストを開く
                            </button>
                        </fieldset>
                    </form>
                </p>
                <p>
                    <mark>注意：リスト名を知っている人は誰でも編集できます</mark>
                </p>
            </article>

            <article>
                <h3>名前をランダムで作成する（UUID秘密）：</h3>
                <p>
                    <button onClick={() => {
                        navigate(`/board/${crypto.randomUUID()}`)
                    }}>リストを作成
                    </button>
                </p>
            </article>

            <article style={{writingMode: "horizontal-tb", overflowY: "auto", minWidth: "460px"}}>
                <h3>MCPサーバーの設定：</h3>
                <p>AIエージェント（Claude等）からリストを読み書きできます。</p>
                <p><strong>Claude Code</strong></p>
                <pre>claude mcp add --transport http tatetodo https://todo.kaylee.jp/mcp</pre>
                <p><strong>Claude Desktop</strong>（<code>claude_desktop_config.json</code>に追加）</p>
                <p><small>左下の名前をクリック → 設定 → 開発者 → 設定を編集、またはファイルを直接編集：<br/>Mac: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code><br/>Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></small></p>
                <p><small>Claude DesktopはHTTPに直接対応していないため、<code>mcp-remote</code>プロキシ経由で接続します（Node.js必要）。</small></p>
                <pre>{`{
  "mcpServers": {
    "tatetodo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://todo.kaylee.jp/mcp"]
    }
  }
}`}</pre>
            </article>


            <footer>
                <p>
                    <a href={"#"} onClick={() => setWritingModeHorizontal(v => {
                        const next = !v;
                        localStorage.setItem('writingModeHorizontal', String(next));
                        return next;
                    })}>縦横表示切替</a>
                    {" · "}
                    <a href={"#"} onClick={toggleColorScheme}>{scheme === 'dark' ? '☀ ライトモード' : '🌙 ダークモード'}</a>
                </p>
                <FooterText/>
            </footer>
        </main>
    );
}