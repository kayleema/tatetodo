import {generateSiteId, getListItemUID, ListItem} from "./ListItem.ts";

describe('ListItem Utils', () => {
    describe('getListItemUID', () => {
        it('should format UID as siteId:version', () => {
            const item = { siteId: 'abcd', version: 5 } as ListItem;
            expect(getListItemUID(item)).toBe('abcd:5');
        });
    });

    describe('generateSiteId', () => {
        it('should return a 4-character string', () => {
            const id = generateSiteId();
            expect(id).toHaveLength(4);
            // Ensure it only contains Base64 characters
            expect(id).toMatch(/^[A-Za-z0-9+/]+$/);
        });

        it('should produce different IDs on subsequent calls', () => {
            const id1 = generateSiteId();
            const id2 = generateSiteId();
            expect(id1).not.toBe(id2);
        });
    });
});