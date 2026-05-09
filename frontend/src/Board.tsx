import {useTodoList} from "./useTodoList.tsx";
import {useState, useEffect} from "react";
import {getListItemUID} from "./ListItem.ts";
import {FooterText} from "./FooterText.tsx";
import {Link, useNavigate} from "react-router-dom";
import {useColorScheme} from "./useColorScheme.ts";
import {useAuth} from "./AuthContext.tsx";
import {useTranslation} from 'react-i18next';
import {LangSwitcher} from './LangSwitcher.tsx';
import {ThemeSwitcher} from './ThemeSwitcher.tsx';

type BoardMeta = { ownerUsername: string; memberUsernames: string[]; isPublic: boolean };

const isHeading = (text: string) => text.startsWith('#') || text.startsWith('＃');

export function Board({boardId}: { boardId: string }) {
    const {visibleListItems, update, insert, remove, unauthorized, status, pendingCount} = useTodoList(boardId)
    useColorScheme()
    const {token, username, logout} = useAuth()
    const {t} = useTranslation()
    const navigate = useNavigate()
    const [editingId, setEditingId] = useState("")
    const [dragOverId, setDragOverId] = useState("")
    const [writingModeHorizontal, setWritingModeHorizontal] = useState(
        () => localStorage.getItem('writingModeHorizontal') !== 'false'
    )
    const [editingText, setEditingText] = useState("")
    const [newInputText, setNewInputText] = useState("")
    const [boardMeta, setBoardMeta] = useState<BoardMeta | null>(null)
    const [addMemberInput, setAddMemberInput] = useState("")
    const [memberError, setMemberError] = useState("")

    useEffect(() => {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch(`/api/boards/${boardId}`, {headers})
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) setBoardMeta(data);
            })
            .catch(() => {
            });
    }, [boardId, token]);

    const isOwner = boardMeta?.ownerUsername === username;

    const addMember = async () => {
        if (!addMemberInput.trim() || !token) return;
        setMemberError('');
        const res = await fetch(`/api/boards/${boardId}/members`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({username: addMemberInput.trim()}),
        });
        const data = await res.json();
        if (!res.ok) {
            setMemberError(data.error ?? t('board.addMemberFailed'));
            return;
        }
        setBoardMeta(m => m ? {...m, memberUsernames: [...m.memberUsernames, addMemberInput.trim()]} : m);
        setAddMemberInput('');
    };

    const toggleShareLink = async () => {
        if (!token || !boardMeta) return;
        const next = !boardMeta.isPublic;
        const res = await fetch(`/api/boards/${boardId}/share`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({isPublic: next}),
        });
        if (res.ok) setBoardMeta(m => m ? {...m, isPublic: next} : m);
    };

    if (unauthorized) {
        return (
            <main style={{writingMode: 'horizontal-tb'}}>
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
        <main style={{writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl"}}>
            <nav>
                <strong>{t('nav.appName')}</strong>
                {token
                    ? <span>{username} · <a href="#" onClick={e => {
                        e.preventDefault();
                        logout();
                        navigate('/');
                    }}>{t('nav.logout')}</a></span>
                    : <span><Link to="/login">{t('nav.login')}</Link> · <Link to="/register">{t('nav.register')}</Link></span>
                }
            </nav>
            <div>
                <Link to={'/'}>{t('board.back')}</Link>
                {status !== 'connected'
                    ? <mark style={{float: "right"}} className="animate">
                        {t('board.reconnecting')}{pendingCount > 0 ? ` (${pendingCount})` : ''}
                      </mark>
                    : pendingCount > 0
                        ? <mark style={{float: "right"}} className="animate">{t('board.pending', {count: pendingCount})}</mark>
                        : <mark style={{float: "right"}} className="success">{t('board.connected')}</mark>
                }
            </div>
            <h2>{t('board.title')}</h2>
            <h3>{t('board.boardId')}<strong>{boardId}</strong></h3>
            <ul>
                {visibleListItems.map((item) => (
                    getListItemUID(item) == editingId ? (
                        <li key={getListItemUID(item) + "-editing"} className={isHeading(editingText) ? "heading" : ""}>
                            {!isHeading(editingText) && <input type="checkbox" disabled checked={item.status}/>}
                            <div style={{
                                display: 'flex',
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: "3px 10px",
                                flexGrow: 1,
                                justifyContent: "end"
                            }}>
                                <fieldset style={{flexGrow: 1}}>
                                    <textarea
                                        ref={el => { if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }}
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                                e.preventDefault();
                                                if (e.metaKey || e.ctrlKey) {
                                                    update(getListItemUID(item), {text: editingText});
                                                    setEditingId("");
                                                } else {
                                                    const newAfterId = update(getListItemUID(item), {text: editingText});
                                                    const newUid = insert({ text: "", status: false, afterId: newAfterId });
                                                    setEditingId(newUid);
                                                    setEditingText("");
                                                }
                                            } else if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
                                                setEditingId("");
                                            }
                                        }}
                                    />
                                </fieldset>
                                <fieldset style={{flexGrow: 0, alignItems: "end"}}>
                                    <button onClick={() => {
                                        update(getListItemUID(item), {text: editingText});
                                        setEditingId("");
                                    }}>{t('board.save')}</button>
                                    <button onClick={() => setEditingId("")}>{t('board.cancel')}</button>
                                    <button
                                        onClick={() => {
                                            remove(getListItemUID(item))
                                            setEditingId("")
                                        }}
                                        className="delete">{t('board.delete')}</button>
                                </fieldset>
                            </div>
                        </li>
                    ) : (
                        <li
                            key={getListItemUID(item)}
                            onDragOver={(e) => {
                                e.preventDefault(); setDragOverId(getListItemUID(item));
                            }}
                            onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(""); }}
                            onDrop={(e) => {
                                const droppedId = e.dataTransfer.getData("text/plain");
                                if (droppedId) update(droppedId, {afterId: getListItemUID(item)});
                                setDragOverId("");
                            }}
                            className={isHeading(item.text) ? "heading" : ""}
                            style={{
                                paddingBlockEnd: dragOverId === getListItemUID(item) ? '40px' : '10px',
                                transition: 'padding-block-end 0.1s ease',
                            }}
                        >
                            {!isHeading(item.text) && <input type="checkbox" checked={item.status}
                                                                  onChange={(e) => update(getListItemUID(item), {status: e.target.checked})}/>
                            }
                            <fieldset
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", getListItemUID(item))}
                            >
                                <textarea value={isHeading(item.text) ? item.text.slice(1) : item.text} readOnly
                                          style={{cursor: "move", flexGrow: 1}}
                                          onClick={() => {
                                              setEditingId(getListItemUID(item));
                                              setEditingText(item.text);
                                          }}
                                />
                                <button className="secondary" onClick={() => {
                                    setEditingId(getListItemUID(item));
                                    setEditingText(item.text);
                                }} disabled={editingId !== ""}>{t('board.edit')}</button>
                            </fieldset>
                        </li>
                    )
                ))}
                <li className={isHeading(newInputText) ? "heading" : ""}>
                    {!isHeading(newInputText) && <input type="checkbox" disabled/>}
                    <fieldset>
                        <textarea value={newInputText} placeholder={t('board.newTask')}
                               disabled={editingId !== ""}
                               onChange={(e) => setNewInputText(e.target.value)}
                               onKeyDown={(e) => {
                                   if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                       e.preventDefault();
                                       if (!newInputText.trim()) return;
                                       insert({
                                           text: newInputText,
                                           status: false,
                                           afterId: visibleListItems.length === 0
                                               ? undefined
                                               : getListItemUID(visibleListItems[visibleListItems.length - 1]),
                                       });
                                       setNewInputText("");
                                   } else if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
                                       setNewInputText("");
                                   }
                               }}/>
                        <button onClick={() => {
                            insert({
                                text: newInputText,
                                status: false,
                                afterId: visibleListItems.length === 0
                                    ? undefined
                                    : getListItemUID(visibleListItems[visibleListItems.length - 1]),
                            });
                            setNewInputText("");
                        }} className="new" disabled={editingId !== ""}>{t('board.add')}</button>
                    </fieldset>
                </li>
            </ul>
            <p><small>{t('board.headingHint')}</small></p>

            {boardMeta && !isOwner && (
                <article>
                    <small>
                        <strong>{t('board.owner')}:</strong> {boardMeta.ownerUsername}<br/>
                        {boardMeta.memberUsernames.length > 0 && <>
                            <strong>{t('board.members')}:</strong> {boardMeta.memberUsernames.join(', ')}</>}
                    </small>
                </article>
            )}

            {isOwner && (
                <article>
                    <h3>{t('board.settings')}</h3>
                    <p>
                        <strong>{t('board.members')}:</strong> {boardMeta!.ownerUsername}（{t('board.owner')}）{boardMeta!.memberUsernames.map(m => `, ${m}`)}
                    </p>
                    <p>
                        <fieldset>
                            <input placeholder={t('board.addMemberPlaceholder')} value={addMemberInput}
                                   onChange={e => setAddMemberInput(e.target.value)}/>
                            <button onClick={addMember}>{t('board.addMemberBtn')}</button>
                        </fieldset>
                    </p>
                    {memberError && <p>
                        <mark>{memberError}</mark>
                    </p>}
                    <p>
                        <label>
                            <input type="checkbox" checked={boardMeta!.isPublic} onChange={toggleShareLink}
                                   style={{width: 'auto', flexGrow: 0}}/>
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
                    <button className="secondary" onClick={() => setWritingModeHorizontal(v => {
                        const next = !v;
                        localStorage.setItem('writingModeHorizontal', String(next));
                        return next;
                    })}>{t('footer.toggleWritingMode')}</button>
                    {" · "}
                    <ThemeSwitcher />
                    {" · "}
                    <LangSwitcher/>
                </p>
                <p>{t('board.motivational')}</p>
                <hr/>
                <FooterText/>
            </footer>
        </main>
    )
}
