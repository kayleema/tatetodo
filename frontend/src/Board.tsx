import { useTodoList } from "./useTodoList.tsx";
import { useState, useEffect } from "react";
import { getListItemUID } from "./ListItem.ts";
import { FooterText } from "./FooterText.tsx";
import { Link, useNavigate } from "react-router-dom";
import { useColorScheme } from "./useColorScheme.ts";
import { useAuth } from "./AuthContext.tsx";

type BoardMeta = { ownerUsername: string; memberUsernames: string[]; isPublic: boolean };

export function Board({ boardId }: { boardId: string }) {
    const { visibleListItems, update, insert, remove, unauthorized } = useTodoList(boardId)
    const { scheme, toggle: toggleColorScheme } = useColorScheme()
    const { token, username, logout } = useAuth()
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
        if (!res.ok) { setMemberError(data.error ?? '追加に失敗しました'); return; }
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
                <nav><strong>✔︎ やることリスト</strong></nav>
                <article>
                    <h3>アクセス拒否</h3>
                    <p>このリストを表示する権限がありません。</p>
                    <p><Link to="/">ホームへ戻る</Link></p>
                </article>
            </main>
        );
    }

    return (
        <main style={{ writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl" }}>
            <nav>
                <strong>✔︎ やることリスト</strong>
                {token
                    ? <span>{username} · <a href="#" onClick={e => { e.preventDefault(); logout(); navigate('/'); }}>ログアウト</a></span>
                    : <span><Link to="/login">ログイン</Link> · <Link to="/register">新規登録</Link></span>
                }
            </nav>
            <div>
                <Link to={'/'}>↩︎ ホームへ戻る</Link>
                <mark style={{ float: "right" }}>
                    同期中…
                </mark>
            </div>
            <h2>やることリスト</h2>
            <div>リスト識別子：<strong>{boardId}</strong></div>
            <ul style={{ minBlockSize: "200px" }}>
                {visibleListItems.map((item) => (
                    getListItemUID(item) == editingId ? (
                        <li key={getListItemUID(item) + "-editing"}>
                            <input type="checkbox" disabled checked={item.status} />
                            <fieldset>
                                <input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                                <button onClick={() => { update(getListItemUID(item), { text: editingText }); setEditingId(""); }}>保存</button>
                                <button onClick={() => setEditingId("")}>キャンセル</button>
                                <button onClick={() => remove(getListItemUID(item))} className="delete">削除</button>
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
                                <button className="secondary" onClick={() => { setEditingId(getListItemUID(item)); setEditingText(item.text); }}>編集</button>
                            </fieldset>
                        </li>
                    )
                ))}
                <li>
                    <input type="checkbox" disabled />
                    <fieldset>
                        <input type="text" value={newInputText} placeholder="新規タスク名を入力してください"
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
                        }} className="new">追加</button>
                    </fieldset>
                </li>
            </ul>

            {boardMeta && !isOwner && (
                <article>
                    <p><small><strong>オーナー:</strong> {boardMeta.ownerUsername}
                    {boardMeta.memberUsernames.length > 0 && <> · <strong>メンバー:</strong> {boardMeta.memberUsernames.join(', ')}</>}
                    </small></p>
                </article>
            )}

            {isOwner && (
                <article>
                    <h3>リストの設定</h3>
                    <p><strong>メンバー:</strong> {boardMeta!.ownerUsername}（オーナー）{boardMeta!.memberUsernames.map(m => `, ${m}`)}</p>
                    <p>
                        <fieldset>
                            <input placeholder="ユーザー名を追加" value={addMemberInput} onChange={e => setAddMemberInput(e.target.value)} />
                            <button onClick={addMember}>追加</button>
                        </fieldset>
                    </p>
                    {memberError && <p><mark>{memberError}</mark></p>}
                    <p>
                        <label>
                            <input type="checkbox" checked={boardMeta!.isPublic} onChange={toggleShareLink} style={{ width: 'auto', flexGrow: 0 }} />
                            {" "}共有リンクを有効にする（URLを知っている人は誰でもアクセス可能）
                        </label>
                    </p>
                    {boardMeta!.isPublic && (
                        <p><small>共有URL: <code>{window.location.href}</code></small></p>
                    )}
                </article>
            )}

            <footer>
                <p>
                    <a href="#" onClick={() => setWritingModeHorizontal(v => {
                        const next = !v;
                        localStorage.setItem('writingModeHorizontal', String(next));
                        return next;
                    })}>縦横表示切替</a>
                    {" · "}
                    <a href="#" onClick={toggleColorScheme}>{scheme === 'dark' ? '☀ ライトモード' : '🌙 ダークモード'}</a>
                </p>
                <p>
                    今日も一日お疲れ様でした！すべてのタスクが完了していなくても大丈夫。
                    大切なのは、毎日少しずつ前進すること。明日も素敵な一日になりますように。
                </p>
                <hr />
                <FooterText />
            </footer>
        </main>
    )
}
