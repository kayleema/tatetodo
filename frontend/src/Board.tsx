import {useTodoList} from "./useTodoList.tsx";
import {useState} from "react";
import {getListItemUID} from "./ListItem.ts";
import {FooterText} from "./FooterText.tsx";
import {Link} from "react-router-dom";
import {useColorScheme} from "./useColorScheme.ts";

export function Board({boardId}: { boardId: string }) {
    const {visibleListItems, update, insert, remove} = useTodoList(boardId)
    const {scheme, toggle: toggleColorScheme} = useColorScheme()
    const [editingId, setEditingId] = useState("")
    const [writingModeHorizontal, setWritingModeHorizontal] = useState(
        () => localStorage.getItem('writingModeHorizontal') === 'true'
    )
    const [editingText, setEditingText] = useState("")
    const [newInputText, setNewInputText] = useState("")

    return (
        <main style={{writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl"}}>
            <nav>
                <strong>✔︎ やることリスト</strong>
            </nav>
            <div>
                <Link to={'/'}>↩︎ ホームへ戻る</Link>
                <mark style={{float: "right"}}>
                    同期中…
                </mark>
            </div>
            <h2>やることリスト</h2>
            <hr/>
            <ul style={{minBlockSize: "400px"}}>
                {visibleListItems.map((item) => (
                    getListItemUID(item) == editingId ? (
                        <li key={getListItemUID(item) + "-editing"}>
                            <input type="checkbox" disabled checked={item.status}/>
                            <fieldset>
                                <input type="text" value={editingText} onChange={(e) => {
                                    setEditingText(e.target.value)
                                }}/>
                                <button onClick={() => {
                                    update(getListItemUID(item), {text: editingText})
                                    setEditingId("")
                                }}>保存
                                </button>
                                <button onClick={() => {
                                    setEditingId("")
                                }}>キャンセル
                                </button>
                                <button onClick={() => {
                                    remove(getListItemUID(item))
                                }} className="delete">削除
                                </button>
                            </fieldset>
                        </li>
                    ) : (
                        <li
                            key={getListItemUID(item)}
                            onDragOver={(e) => {
                                e.preventDefault()
                            }}
                            onDrop={(e) => {
                                const droppedId = e.dataTransfer.getData("text/plain")
                                if (droppedId) {
                                    update(droppedId, {afterId: getListItemUID(item)})
                                }
                            }}
                        >
                            <input type="checkbox" checked={item.status} onChange={(e) => {
                                update(getListItemUID(item), {status: e.target.checked})
                            }}/>
                            <fieldset
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", getListItemUID(item))
                                }}
                            >
                                <input value={item.text} readOnly style={{cursor: "move", flexGrow: 1}}/>
                                <button className="secondary" onClick={() => {
                                    setEditingId(getListItemUID(item))
                                    setEditingText(item.text)
                                }}>編集
                                </button>
                            </fieldset>
                        </li>
                    )
                ))}
                <li>
                    <input type="checkbox" disabled/>
                    <fieldset>
                        <input type="text" value={newInputText} placeholder={"新規タスク名を入力してください"}
                               onChange={(e) => {
                                   setNewInputText(e.target.value)
                               }}/>
                        <button onClick={() => {
                            insert({
                                text: newInputText,
                                status: false,
                                afterId: visibleListItems.length === 0
                                    ? undefined
                                    : getListItemUID(visibleListItems[visibleListItems.length - 1]),
                            })
                            setNewInputText("")
                        }} className="new">追加
                        </button>
                    </fieldset>
                </li>
            </ul>
            <hr/>
            <footer>
                <p>
                    <a href={"#"} onClick={() => setWritingModeHorizontal(v => {
                        const next = !v;
                        localStorage.setItem('writingModeHorizontal', String(next));
                        return next;
                    })}>縦横表示切替</a>
                    {" · "}
                    <a href={"#"} onClick={toggleColorScheme}>{scheme === 'dark' ? '☀ ライトモード' : '🌙 ダークモード'}</a>
                </p>
                <p>
                    今日も一日お疲れ様でした！すべてのタスクが完了していなくても大丈夫。
                    大切なのは、毎日少しずつ前進すること。明日も素敵な一日になりますように。
                </p>
                <hr/>
                <FooterText/>
            </footer>
        </main>
    )
}