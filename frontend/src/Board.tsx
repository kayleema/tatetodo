import {useTodoList} from "./useTodoList.tsx";
import {useState, useEffect, useRef} from "react";
import {getListItemUID, ListItem} from "./ListItem.ts";
import {FooterText} from "./FooterText.tsx";
import {Link, useNavigate} from "react-router-dom";
import {useColorScheme} from "./useColorScheme.ts";
import {useAuth} from "./AuthContext.tsx";
import {useTranslation} from 'react-i18next';
import {LangSwitcher} from './LangSwitcher.tsx';
import {ThemeSwitcher} from './ThemeSwitcher.tsx';
import {CheckIcon} from './CheckIcon.tsx';
import AutofitTextarea from "./AutofitTextarea.tsx";
import {ChatPanel} from "./ChatPanel.tsx";
import {Mascot} from "./Mascot.tsx";

type BoardMeta = { ownerUsername: string; memberUsernames: string[]; isPublic: boolean };

function isTokenExpired(token: string): boolean {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const payload = JSON.parse(new TextDecoder().decode(bytes));
        return typeof payload.exp === 'number' ? payload.exp * 1000 < Date.now() : false;
    } catch {
        return false;
    }
}

const isHeading = (text: string) => text.startsWith('#') || text.startsWith('＃');

export function Board({boardId}: { boardId: string }) {
    const {token, username, logout} = useAuth()
    const {visibleListItems, update, insert, remove, unauthorized, status, pendingCount, listItems} = useTodoList(boardId, username ?? undefined)
    useColorScheme()
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
    const [showChat, setShowChat] = useState(false)
    const editTextareaRef = useRef<HTMLTextAreaElement>(null)
    const focusUidRef = useRef<string>("")
    const dragStartedOnHandleRef = useRef(false)

    useEffect(() => {
        if (unauthorized && token && isTokenExpired(token)) {
            logout();
            navigate('/login');
        }
    }, [logout, navigate, token, unauthorized]);

    useEffect(() => {
        const hasUnsaved = newInputText.trim() !== "" || editingId !== "";
        if (!hasUnsaved) return;
        const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [newInputText, editingId]);

    useEffect(() => {
        if (editingId) {
            if (editTextareaRef.current) {
                const el = editTextareaRef.current;
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
            }
        } else if (focusUidRef.current) {
            document.querySelector<HTMLTextAreaElement>(`textarea[data-uid="${focusUidRef.current}"]`)?.focus();
            focusUidRef.current = "";
        }
    }, [editingId])

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

    const onOpenHistory = (item: ListItem) => {
        const historyItems = listItems.current
            ? Array.from(listItems.current.values()).filter(listItem => listItem.id && (listItem.id === item.id))
            : [];
        historyItems.sort((a, b) => a.updatedAt?.localeCompare(b.updatedAt ?? "") ?? 0)
        alert(
            t('board.historyTitle') + "\n" +
            historyItems.map((historyItem) =>
                t('board.historyLine', {
                    updatedAt: historyItem.updatedAt ?? "",
                    updatedBy: historyItem.updatedBy ?? "",
                    text: historyItem.text,
                    status: historyItem.status ? t('board.historyDone') : "",
                    deleted: historyItem.deleted ? t('board.historyDeleted') : "",
                })
            ).join("\n")
        )
    }

    if (unauthorized) {
        if (token && isTokenExpired(token)) return null;
        return (
            <main style={{writingMode: 'horizontal-tb'}}>
                <nav><strong><CheckIcon /> {t('nav.appName')}</strong></nav>
                <article>
                    <h3>{t('board.accessDenied')}</h3>
                    <p>{t('board.accessDeniedMsg')}</p>
                    <p>
                        {!token && <><Link to="/login">{t('nav.login')}</Link> · </>}
                        <Link to="/">{t('board.backToHome')}</Link>
                    </p>
                </article>
            </main>
        );
    }

    return (
        <>
        <main style={{
            writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl",
            marginLeft: showChat ? 0 : "auto",
            marginRight: showChat ? "min(380px, 100vw)" : "auto",
        }}>
            <nav>
                <strong><CheckIcon /> {t('nav.appName')}</strong>
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
                                    <AutofitTextarea
                                        ref={editTextareaRef}
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                                e.preventDefault();
                                                if (e.metaKey || e.ctrlKey) {
                                                    focusUidRef.current = update(getListItemUID(item), {text: editingText});
                                                    setEditingId("");
                                                } else {
                                                    const newAfterId = update(getListItemUID(item), {text: editingText});
                                                    const newUid = insert({ text: "", status: false, afterId: newAfterId });
                                                    setEditingId(newUid);
                                                    setEditingText("");
                                                }
                                            } else if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
                                                focusUidRef.current = getListItemUID(item);
                                                setEditingId("");
                                            }
                                        }}
                                    />
                                </fieldset>
                                <fieldset style={{flexGrow: 0, alignItems: "end"}}>
                                    <button className="primary" onClick={() => {
                                        focusUidRef.current = update(getListItemUID(item), {text: editingText});
                                        setEditingId("");
                                    }}>{t('board.save')}</button>
                                    <button className="warn" onClick={() => {
                                        focusUidRef.current = getListItemUID(item);
                                        setEditingId("");
                                    }}>{t('board.cancel')}</button>
                                    <button className="secondary" onClick={() => {onOpenHistory(item)}}>{t('board.history')}</button>
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
                            {!isHeading(item.text) && <input
                                type="checkbox"
                                checked={item.status}
                                onChange={(e) => update(getListItemUID(item), {status: e.target.checked})}
                            />}
                            <fieldset
                                className="todo-drag-fieldset"
                                draggable
                                onPointerDownCapture={(e) => {
                                    dragStartedOnHandleRef.current = Boolean(
                                        (e.target as HTMLElement).closest(".todo-drag-handle")
                                    );
                                }}
                                onDragStart={(e) => {
                                    if (!dragStartedOnHandleRef.current) {
                                        e.preventDefault();
                                        return;
                                    }
                                    e.dataTransfer.setData("text/plain", getListItemUID(item));
                                }}
                                onDragEnd={() => {
                                    dragStartedOnHandleRef.current = false;
                                }}
                            >
                                <AutofitTextarea value={isHeading(item.text) ? item.text.slice(1) : item.text} readOnly
                                          className="readonly-todo-textarea"
                                          data-uid={getListItemUID(item)}
                                          onClick={() => {
                                              setEditingId(getListItemUID(item));
                                              setEditingText(item.text);
                                          }}
                                          onKeyDown={(e) => {
                                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                                  e.preventDefault();
                                                  setEditingId(getListItemUID(item));
                                                  setEditingText(item.text);
                                              } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                                  e.preventDefault();
                                                  const idx = visibleListItems.findIndex(i => getListItemUID(i) === getListItemUID(item));
                                                  const next = visibleListItems[e.key === 'ArrowDown' ? idx + 1 : idx - 1];
                                                  if (next) document.querySelector<HTMLTextAreaElement>(`textarea[data-uid="${getListItemUID(next)}"]`)?.focus();
                                              }
                                          }}
                                />
                                <span className="todo-drag-handle" aria-hidden="true" />
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
                        <AutofitTextarea value={newInputText} placeholder={t('board.newTask')}
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
            <p><small>{t('board.headingHint')}</small><br/><small>{t('board.keybindingHint')}</small></p>

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
                            <input type="checkbox" checked={boardMeta!.isPublic} onChange={toggleShareLink}/>
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
                    <button className="secondary" onClick={() => setShowChat(v => !v)}><Mascot size="1.3em"/> {t('chat.toggle')}</button>
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
        {showChat && <ChatPanel boardId={boardId} onClose={() => setShowChat(false)}/>}
        </>
    )
}
