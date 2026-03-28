import BookmarksTreeGenerator from '../util/BookmarksTreeGenerator';

describe('BookmarksTreeGenerator', () => {
    const sampleBookmarks = [
        {
            id: '0',
            title: 'Bookmarks Bar',
            children: [
                { id: '1', title: 'React Docs', url: 'https://react.dev' },
                { id: '2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
                {
                    id: '3',
                    title: 'Folder', // folder - no url
                    children: [
                        { id: '4', title: 'Jest Testing', url: 'https://jestjs.io' },
                        { id: '5', title: 'Playwright', url: 'https://playwright.dev' },
                    ],
                },
            ],
        },
    ];

    describe('getFlattenTree', () => {
        it('should flatten all bookmarks (no keyword filter)', () => {
            const gen = new BookmarksTreeGenerator(sampleBookmarks);
            const root = gen.getFlattenTree();

            // Should contain only leaf nodes (URLs), not folders
            const titles = root.children.map(c => c.tab.title);
            expect(titles).toContain('React Docs');
            expect(titles).toContain('MDN Web Docs');
            expect(titles).toContain('Jest Testing');
            expect(titles).toContain('Playwright');
            expect(titles).not.toContain('Folder');
        });

        it('should mark all nodes as bookmarks', () => {
            const gen = new BookmarksTreeGenerator(sampleBookmarks);
            const root = gen.getFlattenTree();

            root.children.forEach(child => {
                expect(child.tab.isBookmark).toBe(true);
            });
        });

        it('should prefix bookmark ids with "bk"', () => {
            const gen = new BookmarksTreeGenerator(sampleBookmarks);
            const root = gen.getFlattenTree();

            root.children.forEach(child => {
                expect(child.tab.id).toMatch(/^bk/);
            });
        });
    });

    describe('keyword filtering', () => {
        it('should filter by title keyword', () => {
            const gen = new BookmarksTreeGenerator(sampleBookmarks);
            const root = gen.getFlattenTree('React');

            expect(root.children).toHaveLength(1);
            expect(root.children[0].tab.title).toBe('React Docs');
        });

        it('should filter by URL keyword', () => {
            const gen = new BookmarksTreeGenerator(sampleBookmarks);
            const root = gen.getFlattenTree('jestjs');

            expect(root.children).toHaveLength(1);
            expect(root.children[0].tab.title).toBe('Jest Testing');
        });

        it('should be case insensitive', () => {
            const gen = new BookmarksTreeGenerator(sampleBookmarks);
            const root = gen.getFlattenTree('react');

            expect(root.children).toHaveLength(1);
            expect(root.children[0].tab.title).toBe('React Docs');
        });

        it('should return all results for empty keyword', () => {
            const gen = new BookmarksTreeGenerator(sampleBookmarks);
            const root = gen.getFlattenTree(undefined);

            expect(root.children.length).toBeGreaterThan(0);
        });

        it('should handle invalid regex gracefully', () => {
            const gen = new BookmarksTreeGenerator(sampleBookmarks);
            // '[' is invalid regex - should return all bookmarks
            const root = gen.getFlattenTree('[');

            expect(root.children.length).toBeGreaterThan(0);
        });
    });

    describe('edge cases', () => {
        it('should handle empty bookmark tree', () => {
            const gen = new BookmarksTreeGenerator([]);
            const root = gen.getFlattenTree();
            expect(root.children).toHaveLength(0);
        });

        it('should handle bookmarks without title', () => {
            const gen = new BookmarksTreeGenerator([
                { id: '1', title: '', url: 'https://example.com' },
            ]);
            const root = gen.getFlattenTree();
            expect(root.children[0].tab.title).toBe('');
            expect(root.children[0].tab.url).toBe('https://example.com');
        });

        it('should handle deeply nested folders', () => {
            const deep = [
                {
                    id: '0', title: 'Root',
                    children: [{
                        id: '1', title: 'L1',
                        children: [{
                            id: '2', title: 'L2',
                            children: [
                                { id: '3', title: 'Deep Bookmark', url: 'https://deep.com' },
                            ],
                        }],
                    }],
                },
            ];
            const gen = new BookmarksTreeGenerator(deep);
            const root = gen.getFlattenTree();

            expect(root.children).toHaveLength(1);
            expect(root.children[0].tab.title).toBe('Deep Bookmark');
        });
    });
});
