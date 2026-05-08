import {useTodoList} from "./useTodoList.tsx";
import {useState} from "react";
import {getListItemUID} from "./ListItem.ts";

export function Board({boardId}: { boardId: string }) {
    const {visibleListItems, update, insert, remove} = useTodoList(boardId)
    const [editingId, setEditingId] = useState("")
    const [writingModeHorizontal, setWritingModeHorizontal] = useState(false)
    const [editingText, setEditingText] = useState("")

    return (
        <main style={{writingMode: writingModeHorizontal ? "horizontal-tb" : "vertical-rl"}}>
            <nav>
                <strong>やることリスト</strong>
                <span><button>ログアウト</button></span>
            </nav>
            <div className="list">
                <mark style={{float: "right"}}>
                    同期中…
                </mark>
                <h1>やることリスト</h1>
                <hr/>
                <ul>
                    {visibleListItems.map((item) => (
                        getListItemUID(item) == editingId ? (
                            <li key={getListItemUID(item) + "-editing"}>
                                <input type="checkbox" disabled checked={item.status}/>
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
                            </li>
                        ) : (
                            <li
                                key={getListItemUID(item)}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", getListItemUID(item))
                                }}
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
                                <span style={{cursor: "move"}}>{item.text}</span>
                                <button className="edit" onClick={() => {
                                    setEditingId(getListItemUID(item))
                                    setEditingText(item.text)
                                }}>編集
                                </button>
                            </li>
                        )
                    ))}
                    <li>
                        <button onClick={() => {
                            const newId = insert({
                                text: "",
                                status: false,
                                afterId: visibleListItems.length === 0
                                    ? undefined
                                    : getListItemUID(visibleListItems[visibleListItems.length - 1]),
                            })
                            setEditingText("")
                            setEditingId(newId)
                        }} className="new">追加
                        </button>
                    </li>
                </ul>
            </div>
            <footer>
                <p>
                    <button onClick={() => setWritingModeHorizontal(v => !v)}>縦横表示切替</button>
                </p>
                <p>
                    今日も一日お疲れ様でした！すべてのタスクが完了していなくても大丈夫。
                    大切なのは、毎日少しずつ前進すること。明日も素敵な一日になりますように。
                </p>
                <hr/>
                <p><small>
                    © 2025 小林ケイリー. All rights reserved.

                    本アプリのご利用にあたっては、以下の利用規約に同意したものとみなされます。利用規約の全文は利用規約をご覧ください。

                    お客様のプライバシーは非常に重要です。個人情報の取り扱いについては、プライバシーポリシーをご覧ください。

                    本アプリは、お客様に非独占的、譲渡不能なライセンスを供与するものであり、販売するものではありません。詳細については、エンドユーザー使用許諾契約をご覧ください。

                    本アプリは現状有姿で提供され、明示または黙示を問わず、いかなる保証も提供しません。
                </small></p>
            </footer>
        </main>
    )
}