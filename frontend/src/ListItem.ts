export type ListItem = {
    text: string,
    status: boolean,
    siteId: string,
    version: number,
    afterId?: string,

    updatedAt?: string,
    updatedBy?: string,
    id?: string,
    deleted?: boolean
}

export const getListItemUID = (item: ListItem) => (`${item.siteId}:${item.version}`)

export function makeListItem(text: string, status: boolean, siteId: string, version: number, after?: ListItem): ListItem {
    return {
        text,
        status,
        siteId,
        version,
        afterId: after ? getListItemUID(after) : undefined,
    }
}

const B64CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// const B64MIN = B64CHARS[0];        // 'A'
// const B64MAX = B64CHARS[B64CHARS.length - 1];
// const charIndex = (c: string) => B64CHARS.indexOf(c);
// const fromIndex = (i: number) => B64CHARS[i];
const makeJitter = (len = 4): string => {
    const bytes = crypto.getRandomValues(new Uint8Array(len));
    return Array.from(bytes, (b) => B64CHARS[b % B64CHARS.length]).join('');
};

export const generateSiteId = (): string => makeJitter(4)

export const sortListItems = (input: ListItem[]): ListItem[] => {
    // Build a map of afterId -> items that come after it
    const byAfterId = new Map<string | undefined, ListItem[]>();
    for (const item of input) {
        const key = item.afterId;
        if (!byAfterId.has(key)) byAfterId.set(key, []);
        byAfterId.get(key)!.push(item);
    }

    // Sort siblings (items with same afterId) by version descending
    // so newer items appear first (at the top)
    for (const siblings of byAfterId.values()) {
        siblings.sort((a, b) => b.version - a.version || b.siteId.localeCompare(a.siteId));
    }

    // Traverse the linked list
    const result: ListItem[] = [];
    const visit = (afterId: string | undefined) => {
        const siblings = byAfterId.get(afterId) ?? [];
        for (const item of siblings) {
            result.push(item);
            visit(getListItemUID(item));
        }
    };

    visit(undefined);
    return result;
};
