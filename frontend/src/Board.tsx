import { useTodoList } from "./useTodoList.tsx";
import { useState, useEffect } from "react";
import { getListItemUID } from "./ListItem.ts";
import { FooterText } from "./FooterText.tsx";
import { Link, useNavigate } from "react-router-dom";
import { useColorScheme } from "./useColorScheme.ts";
import { useAuth } from "./AuthContext.tsx";
import { useTranslation } from 'react-i18next';
import { LangSwitcher } from './LangSwitcher.tsx';

type BoardMeta = { ownerUsername: string; memberUsernames: string[]; isPublic: boolean };

export function Board({ boardId }: { boardId: string }) {
    const { visibleListItems, update, insert, remove, unauthorized } = useTodoList(boardId)
    const { scheme, toggle: toggleColorScheme } = useColorScheme()
    const { token, username, logout } = useAuth()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [editingId, setEditingId] = useState("")
    const [writingModeHorizontal, setWritingModeHorizontal] = useState(
        () => localStorage.getItem('writingModeHorizontal') === 'true'
    )
    const [editingText, setEditingText] = useState("")
    const [newInputText, setNewInputText] = useState("")
    const [boardMeta, setBoardMeta] = useState<BoardMeta | null>(null)
    const [addMemberInput, setAddMemberInput] = useState("")
    const [memberError, setMemberError] = useState("")

    useEffect(() => {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch(`/api/boards/${boardId}`, { headers })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setBoardMeta(data); })
            .catch(() => {});
    }, [boardId, token]);

    const isOwner = boardMeta?.ownerUsername === username;

    const addMember = async () => {
        if (!addMemberInput.trim() || !token) return;
        setMemberError('');
        const res = await fetch(`/api/boards/${boardId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ username: addMemberInput.trim() }),
        });
        const data = await res.json();
        if (!res.ok) { setMemberError(data.error ?? t('board.addMemberFailed')); return; }
        setBoardMeta(m => m ? { ...m, memberUsernames: [...m.memberUsernames, addMemberInput.trim()] } : m);
        setAddMemberInput('');
    };

    const toggleShareLink = async () => {
        if (!token || !boardMeta) return;
        const next = !boardMeta.isPublic;
        const res = await fetch(`/api/boards/${boardId}/share`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ isPublic: next }),
        });
        if (res.ok) setBoardMeta(m => m ? { ...m, isPublic: next } : m);
    };

    if (unauthorized) {
        return (
            <main style={{ writingMode: 'horizontal-tb' }}>
                <nav><strong>{t('nav.appName')}</strong></nav>
                <article>
                    <h3>{t('board.accessDenied')}</h3>
                    <p>{t('board.accessDeniedMsg')}</p>
                    <p><Link to="/">{t('board.backToHome')}</Link></p>
                </article>
            </main>
        );
    }

    return (
        <main style={{ writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl" }}>
            <nav>
                <strong>{t('nav.appName')}</strong>
                {token
                    ? <span>{username} · <a href="#" onClick={e => { e.preventDefault(); logout(); navigate('/'); }}>{t('nav.logout')}</a></span>
                    : <span><Link to="/login">{t('nav.login')}</Link> · <Link to="/register">{t('nav.register')}</Link></span>
                }
            </nav>
            <div>
                <Link to={'/'}>{t('board.back')}</Link>
                <mark style={{ float: "right" }}>
                    {t('board.syncing')}
                </mark>
            </div>
            <h2>{t('board.title')}</h2>
            <div>{t('board.boardId')}<strong>{boardId}</strong></div>
            <ul style={{ minBlockSize: "200px" }}>
                {visibleListItems.map((item) => (
                    getListItemUID(item) == editingId ? (
                        <li key={getListItemUID(item) + "-editing"}>
                            <input type="checkbox" disabled checked={item.status} />
                            <fieldset>
                                <input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                                <button onClick={() => { update(getListItemUID(item), { text: editingText }); setEditingId(""); }}>{t('board.save')}</button>
                                <button onClick={() => setEditingId("")}>{t('board.cancel')}</button>
                                <button onClick={() => remove(getListItemUID(item))} className="delete">{t('board.delete')}</button>
                            </fieldset>
                        </li>
                    ) : (
                        <li
                            key={getListItemUID(item)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                const droppedId = e.dataTransfer.getData("text/plain");
                                if (droppedId) update(droppedId, { afterId: getListItemUID(item) });
                            }}
                        >
                            <input type="checkbox" checked={item.status} onChange={(e) => update(getListItemUID(item), { status: e.target.checked })} />
                            <fieldset
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", getListItemUID(item))}
                            >
                                <input value={item.text} readOnly style={{ cursor: "move", flexGrow: 1 }} />
                                <button className="secondary" onClick={() => { setEditingId(getListItemUID(item)); setEditingText(item.text); }}>{t('board.edit')}</button>
                            </fieldset>
                        </li>
                    )
                ))}
                <li>
                    <input type="checkbox" disabled />
                    <fieldset>
                        <input type="text" value={newInputText} placeholder={t('board.newTask')}
                            onChange={(e) => setNewInputText(e.target.value)} />
                        <button onClick={() => {
                            insert({
                                text: newInputText,
                                status: false,
                                afterId: visibleListItems.length === 0
                                    ? undefined
                                    : getListItemUID(visibleListItems[visibleListItems.length - 1]),
                            });
                            setNewInputText("");
                        }} className="new">{t('board.add')}</button>
                    </fieldset>
                </li>
            </ul>

            {boardMeta && !isOwner && (
                <article>
                    <p><small><strong>{t('board.owner')}:</strong> {boardMeta.ownerUsername}
                    {boardMeta.memberUsernames.length > 0 && <> · <strong>{t('board.members')}:</strong> {boardMeta.memberUsernames.join(', ')}</>}
                    </small></p>
                </article>
            )}

            {isOwner && (
                <article>
                    <h3>{t('board.settings')}</h3>
                    <p><strong>{t('board.members')}:</strong> {boardMeta!.ownerUsername}（{t('board.owner')}）{boardMeta!.memberUsernames.map(m => `, ${m}`)}</p>
                    <p>
                        <fieldset>
                            <input placeholder={t('board.addMemberPlaceholder')} value={addMemberInput} onChange={e => setAddMemberInput(e.target.value)} />
                            <button onClick={addMember}>{t('board.addMemberBtn')}</button>
                        </fieldset>
                    </p>
                    {memberError && <p><mark>{memberError}</mark></p>}
                    <p>
                        <label>
                            <input type="checkbox" checked={boardMeta!.isPublic} onChange={toggleShareLink} style={{ width: 'auto', flexGrow: 0 }} />
                            {" "}{t('board.shareLink')}
                        </label>
                    </p>
                    {boardMeta!.isPublic && (
                        <p><small>{t('board.shareUrl')} <code>{window.location.href}</code></small></p>
                    )}
                </article>
            )}

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
                <p>{t('board.motivational')}</p>
                <hr />
                <FooterText />
            </footer>
        </main>
    )
}
