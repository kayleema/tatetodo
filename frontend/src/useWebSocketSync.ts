import {useEffect, useRef, useCallback} from 'react';
import ReconnectingWebSocket from "reconnecting-websocket";
import {ListItem} from "./ListItem.ts";

type InsertMessage = { type: 'insert', item: ListItem }
type TombstoneMessage = { type: 'tombstone', id: string }
type JoinMessage = { type: 'join', boardId: string }
type InitMessage = { type: 'init', inserts: ListItem[], tombstones: string[] }

export type WebSocketMessage = InsertMessage | TombstoneMessage | JoinMessage | InitMessage

export const useWebSocketSync = (url: string, boardId: string, onMessage: (data: WebSocketMessage) => void) => {
    const ws = useRef<ReconnectingWebSocket | null>(null);
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    useEffect(() => {
        ws.current = new ReconnectingWebSocket(url);

        ws.current.onopen = () => {
            ws.current?.send(JSON.stringify({type: 'join', boardId}));
        }

        ws.current.onmessage = (event) => {
            onMessageRef.current(JSON.parse(event.data));
        };

        ws.current.onclose = () => console.log('disconnected');
        ws.current.onerror = (e) => console.error('websocket error', e);

        return () => ws.current?.close();
    }, [url, boardId]);

    const send = useCallback((data: unknown) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(data));
        }
    }, []);

    return {send};
};