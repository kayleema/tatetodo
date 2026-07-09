import {useEffect, useRef, useState} from "react";
import {useTranslation} from 'react-i18next';
import {useAuth} from "./AuthContext.tsx";
import {Mascot} from "./Mascot.tsx";

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export function ChatPanel({boardId, onClose}: { boardId: string; onClose: () => void }) {
    const {t} = useTranslation()
    const {token} = useAuth()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        listRef.current?.scrollTo({top: listRef.current.scrollHeight})
    }, [messages, loading]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;
        const nextMessages: ChatMessage[] = [...messages, {role: 'user', content: text}];
        setMessages(nextMessages);
        setInput("");
        setLoading(true);
        try {
            const headers: Record<string, string> = {'Content-Type': 'application/json'};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({boardId, messages: nextMessages}),
            });
            const data = await res.json();
            setMessages(m => [...m, {role: 'assistant', content: res.ok ? data.reply : (data.error ?? t('chat.error'))}]);
        } catch {
            setMessages(m => [...m, {role: 'assistant', content: t('chat.error')}]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <aside className="chat-panel">
            <div className="chat-panel-header">
                <span className="chat-panel-header-title">
                    <Mascot size="1.7em"/>
                    <strong>{t('chat.title')}</strong>
                </span>
                <button className="secondary" onClick={onClose}>{t('chat.close')}</button>
            </div>
            <div className="chat-panel-messages" ref={listRef}>
                {messages.length === 0 && (
                    <p className="chat-empty">
                        <Mascot size="4.5em" className="mascot-big"/>
                        <br/>
                        <small>{t('chat.empty')}</small>
                    </p>
                )}
                {messages.map((m, i) => (
                    <p key={i} className={`chat-message chat-message-${m.role}`}>{m.content}</p>
                ))}
                {loading && <mark className="chat-thinking animate">{t('chat.thinking')}</mark>}
            </div>
            <fieldset className="chat-panel-input">
                <textarea
                    value={input}
                    placeholder={t('chat.placeholder')}
                    disabled={loading}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                            e.preventDefault();
                            void send();
                        }
                    }}
                />
                <button onClick={() => void send()} disabled={loading || !input.trim()}>{t('chat.send')}</button>
            </fieldset>
        </aside>
    )
}
