# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`cd backend`)
- `npm run dev` — run with nodemon + ts-node (hot reload)
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled output

### Frontend (`cd frontend`)
- `npm run dev` — Vite dev server
- `npm run build` — type-check + Vite build
- `npm run lint` — ESLint
- `npm test` — Vitest (watch mode)
- `npx vitest run src/ListItem.test.ts` — run a single test file

### Deployment
```
cd ansible && ansible-playbook site.yml -i inventory/hosts.yml
```
Tags: `setup`, `deploy-frontend`, `deploy-backend`

## Architecture

This is a real-time collaborative todo app (やることリスト) using a CRDT-based sync model.

### Stack
- **Frontend**: React 18 + TypeScript + Vite, served as static files by nginx at `/var/www/tatetodo`
- **Backend**: Express + `ws` WebSocket server, TypeScript compiled to `dist/`, runs as a systemd service on port 3003
- **Database**: CouchDB (accessed via `nano`), partitioned by `boardId`
- **Proxy**: nginx at `todo.kaylee.jp` — routes `/api/` to the backend, everything else to the SPA

### CRDT Data Model (`frontend/src/ListItem.ts`)

Items are never mutated — every "edit" is a tombstone + re-insert. The list is an append-only linked list:
- Each item has a `siteId` (random 4-char base64, stable per browser tab) and a monotonically increasing `version`
- UID = `siteId:version`
- Items reference their predecessor via `afterId` (the UID of the item above them)
- Ordering is deterministic: siblings (same `afterId`) are sorted by `version desc`, then `siteId desc`
- Deletions are tombstones (a set of UIDs); tombstoned items are filtered from the visible list

### WebSocket Sync Protocol

Client connects to `wss://{host}/api/` and exchanges JSON messages:

| Direction | Type | Payload |
|-----------|------|---------|
| C→S | `join` | `{ boardId }` |
| S→C | `init` | `{ inserts: ListItem[], tombstones: string[] }` |
| C↔S | `insert` | `{ item: ListItem }` |
| C↔S | `tombstone` | `{ id: string }` |

On join the server sends the full board state. The backend watches CouchDB's changes feed (`changesReader`) and fans out new inserts/tombstones to all other connected clients on the same board.

### CouchDB Document IDs

Partitioned by `boardId`:
- Items: `${boardId}:item#${siteId}#${version}`
- Tombstones: `${boardId}:tombstone#${tombstoneId}`

### Frontend Data Flow

```
useWebSocketSync  ←→  backend WebSocket
       ↓
  useTodoList         (holds listItems map + tombstoneIds set in refs)
       ↓
    Board.tsx         (renders visibleListItems, handles drag-and-drop reorder)
```

`useTodoList` applies optimistic updates locally before sending to the server; the server's change-feed echo to the client is a no-op because the UID already exists in the local map.

### Backend `.env`
```
COUCHDB_URL=http://<user>:<pass>@localhost:5984
COUCHDB_DB=tatetodo
PORT=3003
```
