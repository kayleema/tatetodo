import './App.css'
import {useState} from "react";

function App() {
    const [listItems, setListItems] = useState([
        {id: "1", text: "雲の上のお散歩", status: true},
        {id: "2", text: "お花に水やり", status: true},
        {id: "3", text: "うさぎさんとティーパーティー", status: true},
        {id: "4", text: "お部屋をピカピカに掃除", status: false},
        {id: "5", text: "おいしいケーキを焼いてみよう", status: false},
        {id: "6", text: "お手紙を書いてお友達に送ろう", status: true},
        {id: "7", text: "星に願いごと", status: false},
    ])
    const [editingId, setEditingId] = useState("")

    return (
        <>
            <nav>
                <strong>やることリスト</strong>
                <span><button>ログアウト</button></span>
            </nav>
            <div className="list">
                <div style={{
                    float: "right",
                    padding: "10px 2px",
                    background: "#f005",
                    borderRadius: "10px",
                    marginRight: "22px"
                }}>
                    同期中…
                </div>
                <h1>やることリスト</h1>
                <hr/>
                <ul>
                    {listItems.map((item) => (
                        item.id == editingId ? (
                            <li key={item.id}>
                                <input type="text" value={item.text}/>
                                <button onClick={() => {
                                    setEditingId("")
                                }}>保存
                                </button>
                                <button className="delete">削除</button>
                            </li>
                        ) : (
                            <li key={item.id}>
                                <input type="checkbox" defaultChecked={item.status}/>
                                <span>{item.text}</span>
                                <button className="edit" onClick={() => {
                                    setEditingId(item.id)
                                }}>編集
                                </button>
                            </li>
                        )
                    ))}
                    <li>
                        <button className="new">追加</button>
                    </li>
                </ul>
            </div>
            <footer>
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
        </>
    )
}

export default App
