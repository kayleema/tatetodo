import {generateSiteId, ListItem, makeListItem} from "./ListItem.ts";

export const generateMockData = () => {
    const mockText = [
        "雲の上のお散歩",
        "お花に水やり",
        "うさぎさんとティーパーティー",
        "お部屋をピカピカに掃除",
        "おいしいケーキを焼いてみよう",
        "お手紙を書いてお友達に送ろう",
        "星に願いごと",
    ]
    const mockSiteId = generateSiteId()
    const result: ListItem[] = []
    mockText.forEach((text, i) =>
        result.push(makeListItem(text, Math.random() > 0.5, mockSiteId, i, result[i - 1]))
    )
    return result
}