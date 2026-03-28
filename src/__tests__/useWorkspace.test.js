import { buildWorkspaceTree, formatWorkspaceDate } from '../hooks/useWorkspace';

describe('buildWorkspaceTree', () => {
    it('should return empty tree for null preview', () => {
        const { rootNode, tabMarks } = buildWorkspaceTree(null);
        expect(rootNode.children).toHaveLength(0);
        expect(tabMarks.size).toBe(0);
    });

    it('should return empty tree when exists is false', () => {
        const { rootNode } = buildWorkspaceTree({ exists: false, entries: [] });
        expect(rootNode.children).toHaveLength(0);
    });

    it('should build tree from workspace entries', () => {
        const preview = {
            exists: true,
            entries: [
                { title: 'Tab 1', url: 'https://example.com/1', favIconUrl: 'icon1.png' },
                { title: 'Tab 2', url: 'https://example.com/2', parentIndex: 0 },
                { title: 'Tab 3', url: 'https://example.com/3' },
            ],
        };

        const { rootNode } = buildWorkspaceTree(preview);

        // Tab 1 and Tab 3 should be root-level; Tab 2 is child of Tab 1
        expect(rootNode.children).toHaveLength(2);
        expect(rootNode.children[0].tab.title).toBe('Tab 1');
        expect(rootNode.children[0].children).toHaveLength(1);
        expect(rootNode.children[0].children[0].tab.title).toBe('Tab 2');
        expect(rootNode.children[1].tab.title).toBe('Tab 3');
    });

    it('should restore tab marks from entries', () => {
        const preview = {
            exists: true,
            entries: [
                { title: 'Tab 1', url: 'https://example.com', mark: 'check' },
                { title: 'Tab 2', url: 'https://example.com/2' },
                { title: 'Tab 3', url: 'https://example.com/3', mark: 'pin' },
            ],
        };

        const { tabMarks } = buildWorkspaceTree(preview);

        expect(tabMarks.get(1)).toBe('check');
        expect(tabMarks.has(2)).toBe(false);
        expect(tabMarks.get(3)).toBe('pin');
    });

    it('should handle grouped entries', () => {
        const preview = {
            exists: true,
            entries: [
                { title: 'G Tab 1', url: 'https://a.com', groupId: 100 },
                { title: 'G Tab 2', url: 'https://b.com', groupId: 100 },
                { title: 'Normal', url: 'https://c.com' },
            ],
            groups: [
                { id: 100, title: 'My Group', color: 'blue' },
            ],
        };

        const { rootNode } = buildWorkspaceTree(preview);

        // Should have group container + ungrouped tab
        expect(rootNode.children).toHaveLength(2);
        expect(rootNode.children[0].isGroupNode()).toBe(true);
        expect(rootNode.children[0].groupInfo.title).toBe('My Group');
    });

    it('should use url as title fallback', () => {
        const preview = {
            exists: true,
            entries: [
                { title: '', url: 'https://fallback.com' },
            ],
        };

        const { rootNode } = buildWorkspaceTree(preview);
        expect(rootNode.children[0].tab.title).toBe('https://fallback.com');
    });
});

describe('formatWorkspaceDate', () => {
    it('should format a timestamp into readable date-time', () => {
        const ts = new Date('2025-06-15T14:30:00').getTime();
        const result = formatWorkspaceDate(ts);

        // Should contain month abbreviation and day
        expect(result).toMatch(/Jun/i);
        expect(result).toMatch(/15/);
    });

    it('should handle different timestamps', () => {
        const ts1 = new Date('2025-01-01T09:05:00').getTime();
        const ts2 = new Date('2025-12-31T23:59:00').getTime();

        const r1 = formatWorkspaceDate(ts1);
        const r2 = formatWorkspaceDate(ts2);

        expect(r1).not.toBe(r2);
        expect(r1).toMatch(/Jan/i);
        expect(r2).toMatch(/Dec/i);
    });
});
