import { useRef, useState } from "react";
import { generateSiteId, getListItemUID, ListItem, sortListItems } from "./ListItem.ts";
import { useWebSocketSync } from "./useWebSocketSync.ts";

const siteId = generateSiteId()

export const useTodoList = (boardId: string, userId?: string) => {
    const listItems = useRef(new Map<string, ListItem>())
    const tombstoneIds = useRef(new Set<string>())
    const version = useRef(0)
    const lastAckedVersion = useRef(-1)
    const pendingTombstoneIds = useRef(new Set<string>())
    const [unauthorized, setUnauthorized] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)

    const token = localStorage.getItem('auth_token')
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/`;

    function recalculatePending() {
        const unackedInserts = Array.from(listItems.current.values())
            .filter(item => item.siteId === siteId && item.version > lastAckedVersion.current)
            .length
        setPendingCount(unackedInserts + pendingTombstoneIds.current.size)
    }

    const { send, status } = useWebSocketSync(wsUrl, boardId, token, (data) => {
        if (data.type === 'error' && data.message === 'unauthorized') {
            setUnauthorized(true)
            return
        }
        if (data.type === "insert") {
            listItems.current.set(getListItemUID(data.item), data.item)
            version.current = Math.max(version.current, data.item.version + 1)
            if (data.item.siteId === siteId) {
                lastAckedVersion.current = Math.max(lastAckedVersion.current, data.item.version)
            }
            recalculateVisible()
            recalculatePending()
        } else if (data.type === "tombstone") {
            tombstoneIds.current.add(data.id)
            pendingTombstoneIds.current.delete(data.id)
            recalculateVisible()
            recalculatePending()
        } else if (data.type === 'init') {
            const serverUids = new Set(data.inserts.map(item => getListItemUID(item)))
            const serverTombstones = new Set(data.tombstones)

            data.tombstones.forEach(id => tombstoneIds.current.add(id))
            data.inserts.forEach(item => {
                listItems.current.set(getListItemUID(item), item)
                version.current = Math.max(version.current, item.version + 1)
                if (item.siteId === siteId) {
                    lastAckedVersion.current = Math.max(lastAckedVersion.current, item.version)
                }
            })

            // Re-broadcast our inserts the server hasn't persisted yet
            listItems.current.forEach(item => {
                if (item.siteId === siteId && !serverUids.has(getListItemUID(item))) {
                    send({ type: 'insert', item })
                }
            })

            // Re-broadcast pending tombstones the server hasn't persisted yet
            pendingTombstoneIds.current.forEach(id => {
                if (serverTombstones.has(id)) {
                    pendingTombstoneIds.current.delete(id)
                } else {
                    send({ type: 'tombstone', id })
                }
            })

            recalculateVisible()
            recalculatePending()
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
            send({ type: "insert", item })
            listItems.current.set(getListItemUID(item), item)
            recalculateVisible()
            recalculatePending()
        }
    }

    function dispatchTombstone(id: string) {
        if (!tombstoneIds.current.has(id)) {
            send({ type: "tombstone", id })
            tombstoneIds.current.add(id)
            pendingTombstoneIds.current.add(id)
            recalculateVisible()
            recalculatePending()
        }
    }

    return {
        listItems,
        visibleListItems,
        unauthorized,
        status,
        pendingCount,
        update: (uid: string, updateInfo: Partial<ListItem>) => {
            const item = listItems.current.get(uid)
            if (!item) { console.error("Item to update not found", uid); return ""; }
            const index = visibleListItems.findIndex(i => getListItemUID(i) === uid)
            const newAfterId = index <= 0 ? undefined : getListItemUID(visibleListItems[index - 1])
            dispatchTombstone(uid)
            const newItem = {
                ...item,
                afterId: newAfterId,
                ...updateInfo,
                siteId,
                version: version.current++,
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
            }
            dispatchInsert(newItem)
            return getListItemUID(newItem)
        },
        insert: (newItemInput: { text: string, status: boolean, afterId?: string }) => {
            const toInsert = {
                ...newItemInput,
                siteId,
                version: version.current++,
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
                id: `${siteId}${version.current}`
            }
            dispatchInsert(toInsert)
            return getListItemUID(toInsert)
        },
        remove: (id: string) => dispatchTombstone(id),
    }
}
