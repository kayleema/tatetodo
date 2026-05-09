import { useEffect, useRef, useCallback, useState } from 'react';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { ListItem } from './ListItem.ts';

type InsertMessage = { type: 'insert', item: ListItem }
type TombstoneMessage = { type: 'tombstone', id: string }
type JoinMessage = { type: 'join', boardId: string, token?: string }
type InitMessage = { type: 'init', inserts: ListItem[], tombstones: string[] }
type ErrorMessage = { type: 'error', message: string }

export type WebSocketMessage = InsertMessage | TombstoneMessage | JoinMessage | InitMessage | ErrorMessage

export type SyncStatus = 'connecting' | 'connected';

export const useWebSocketSync = (
    url: string,
    boardId: string,
    token: string | null,
    onMessage: (data: WebSocketMessage) => void
) => {
    const ws = useRef<ReconnectingWebSocket | null>(null);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;
    const [status, setStatus] = useState<SyncStatus>('connecting');

    useEffect(() => {
        ws.current = new ReconnectingWebSocket(url);

        ws.current.onopen = () => {
            setStatus('connected');
            const msg: JoinMessage = { type: 'join', boardId };
            if (token) msg.token = token;
            ws.current?.send(JSON.stringify(msg));
        }

        ws.current.onmessage = (event) => {
            onMessageRef.current(JSON.parse(event.data));
        };

        ws.current.onclose = () => setStatus('connecting');
        ws.current.onerror = (e) => console.error('websocket error', e);

        return () => ws.current?.close();
    }, [url, boardId, token]);

    const send = useCallback((data: unknown) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    }, []);

    return { send, status };
};
