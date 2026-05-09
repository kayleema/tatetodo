import {useTranslation} from "react-i18next";
import {useState} from "react";

interface MCPCardProps {
    token: string | null,
    writingModeHorizontal: boolean,
}

export function MCPCard({token, writingModeHorizontal}: MCPCardProps) {
    const {t} = useTranslation();
    const [showCard, setShowCard] = useState(false);

    return (
        <article style={{display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '12px'}}>
            <h3>{t('mcp.title')}</h3>
            <p>{t('mcp.description')}</p>
            <div>
                <button onClick={() => setShowCard(s => !s)}>
                    {showCard ? "-　" : "＋　"}
                    {t('mcp.setupSummary')}
                </button>
            </div>
            {showCard &&
                <div style={{
                    width: writingModeHorizontal ? "auto" : "400px",
                    writingMode: "horizontal-tb",
                    overflow: "auto",
                }}>
                    {token && (
                        <p><small>{t('mcp.tokenLabel')}<br/><code
                            style={{wordBreak: 'break-all'}}>{token}</code><br/>{t('mcp.tokenWarning')}</small></p>
                    )}
                    <p><strong>Claude Code</strong></p>
                    <pre>{token
                        ? `claude mcp add --transport http tatetodo https://todo.kaylee.jp/mcp --header "Authorization: Bearer ${token}"`
                        : 'claude mcp add --transport http tatetodo https://todo.kaylee.jp/mcp'
                    }</pre>
                    <p><strong>{t('mcp.claudeDesktopHeading', {filename: 'claude_desktop_config.json'})}</strong></p>
                    <p><small>{t('mcp.claudeDesktopNote')}<br/>Mac: <code>~/Library/Application
                        Support/Claude/claude_desktop_config.json</code><br/>Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></small>
                    </p>
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
                </div>
            }
        </article>
    );
}