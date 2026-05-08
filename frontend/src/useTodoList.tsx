import {useRef, useState} from "react";
import {generateSiteId, getListItemUID, ListItem, sortListItems} from "./ListItem.ts";
import {useWebSocketSync} from "./useWebSocketSync.ts";

const siteId = generateSiteId()

export const useTodoList = (boardId: string) => {
    const listItems = useRef(new Map<string, ListItem>())
    const tombstoneIds = useRef(new Set<string>())
    const version = useRef(0)
    // const unsyncedTombstoneIds = useRef(new Set<string>())
    // const unsyncedListItemsIds = useRef(new Set<string>())

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/`;

    const {send} = useWebSocketSync(wsUrl, boardId, (data) => {
        console.log("received", data);
        if (data.type === "insert") {
            listItems.current.set(getListItemUID(data.item), data.item)
            version.current = Math.max(version.current, data.item.version + 1)
            recalculateVisible()
        } else if (data.type === "tombstone") {
            tombstoneIds.current.add(data.id)
            recalculateVisible()
        } else if (data.type === 'init') {
            data.tombstones.forEach(id => {
                tombstoneIds.current.add(id)
            })
            data.inserts.forEach(item => {
                listItems.current.set(getListItemUID(item), item)
                version.current = Math.max(version.current, item.version + 1)
            })
            recalculateVisible()
        }
    })

    const [visibleListItems, setVisibleListItems] = useState<ListItem[]>([])

    function recalculateVisible() {
        setVisibleListItems(
            sortListItems(Array.from(listItems.current.values()))
                .filter(item => !tombstoneIds.current.has(getListItemUID(item)))
        )
    }

    function dispatchInsert(item: ListItem) {
        if (!listItems.current.has(getListItemUID(item)) && !tombstoneIds.current.has(getListItemUID(item))) {
            console.log("dispatchInsert", item)
            send({type: "insert", item})
            listItems.current.set(getListItemUID(item), item)
            recalculateVisible()
        }
    }

    function dispatchTombstone(id: string) {
        if (!tombstoneIds.current.has(id)) {
            console.log("dispatchTombstone", id)
            send({type: "tombstone", id})
            tombstoneIds.current.add(id)
            recalculateVisible()
        }
    }

    return {
        listItems,
        visibleListItems,
        update: (uid: string, updateInfo: Partial<ListItem>) => {
            const item = listItems.current.get(uid)
            if (!item) {
                console.error("Item to update not found", uid)
                return
            }
            const index = visibleListItems.findIndex(i => getListItemUID(i) === uid)
            const newAfterId = index <= 0 ? undefined : getListItemUID(visibleListItems[index - 1])
            dispatchTombstone(uid)
            dispatchInsert({...item, afterId: newAfterId, ...updateInfo, siteId, version: version.current++})
        },
        insert: (newItemInput: { text: string, status: boolean, afterId?: string }) => {
            const toInsert = {...newItemInput, siteId, version: version.current++}
            dispatchInsert(toInsert)
            return getListItemUID(toInsert)
        },
        remove: (id: string) => {
            dispatchTombstone(id)
        },
    }
}