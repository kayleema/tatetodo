# ✅ TateTodo（縦todo）

A real-time collaborative todo app with a Japanese vertical-writing UI, built with React, TypeScript, and CouchDB.

- Syncs instantly across multiple devices and browser tabs using a custom CRDT (conflict-free replicated data type) over WebSocket.
- Exposes an MCP server so AI agents like Claude can read and manage your todo lists directly over HTTP.
- Try it live at https://todo.kaylee.jp.

## Development

**Backend** (Node.js + Express + WebSocket, requires CouchDB):
```sh
cd backend
cp .env.example .env   # set COUCHDB_URL and COUCHDB_DB
npm install
npm run dev
```

**Frontend** (React + Vite):
```sh
cd frontend
npm install
npm run dev
```

The frontend dev server proxies `/api/` and `/mcp` to `localhost:3003` via Vite. Open a board at `http://localhost:5173/board/<name>`.

## MCP Server

AI agents can read and manage todo boards over HTTP at `https://todo.kaylee.jp/mcp`.

**Claude Code:**
```sh
claude mcp add --transport http tatetodo https://todo.kaylee.jp/mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "tatetodo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://todo.kaylee.jp/mcp"]
    }
  }
}
```

Available tools: `get_board`, `add_item`, `update_item`, `move_item`, `delete_item`.

## Deployment

Ansible playbook targeting `todo.kaylee.jp` (nginx + systemd):
```sh
cd ansible
ansible-playbook site.yml -i inventory/hosts.yml
```
