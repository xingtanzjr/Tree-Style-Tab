import TabTreeNode from '../util/TabTreeNode';

describe('TabTreeNode', () => {
    const createTestTree = () => {
        // Create a tree:
        //   root
        //   ├── node1 (id: 1, title: 'Tab 1')
        //   │   ├── node2 (id: 2, title: 'Tab 2')
        //   │   └── node3 (id: 3, title: 'Tab 3')
        //   └── node4 (id: 4, title: 'Tab 4')
        const root = new TabTreeNode();
        const node1 = new TabTreeNode({ id: 1, title: 'Tab 1', url: 'http://example.com/1', favIconUrl: 'icon1.png', status: 'complete' });
        const node2 = new TabTreeNode({ id: 2, title: 'Tab 2', url: 'http://example.com/2', favIconUrl: 'icon2.png', status: 'complete' });
        const node3 = new TabTreeNode({ id: 3, title: 'Tab 3', url: 'http://example.com/3', favIconUrl: 'icon3.png', status: 'loading' });
        const node4 = new TabTreeNode({ id: 4, title: 'Tab 4', url: 'http://example.com/4', favIconUrl: 'icon4.png', status: 'complete' });
        node1.parent = root;
        node2.parent = node1;
        node3.parent = node1;
        node4.parent = root;
        node1.children = [node2, node3];
        root.children = [node1, node4];
        return { root, node1, node2, node3, node4 };
    };

    describe('constructor', () => {
        it('should create empty root node', () => {
            const node = new TabTreeNode();
            expect(node.tab).toBeUndefined();
            expect(node.children).toEqual([]);
            expect(node.parent).toBeUndefined();
            expect(node.isLeaf).toBe(true);
            expect(node.groupInfo).toBeNull();
        });

        it('should create node with tab data', () => {
            const tab = { id: 1, title: 'Test' };
            const node = new TabTreeNode(tab);
            expect(node.tab).toBe(tab);
            expect(node.children).toEqual([]);
        });
    });

    describe('clone', () => {
        it('should deep clone the entire tree', () => {
            const { root } = createTestTree();
            const cloned = root.clone();

            expect(cloned).not.toBe(root);
            expect(cloned.children).toHaveLength(2);
            expect(cloned.children[0].tab.title).toBe('Tab 1');
            expect(cloned.children[0]).not.toBe(root.children[0]);
            expect(cloned.children[0].tab).not.toBe(root.children[0].tab);
        });

        it('should preserve parent references in clone', () => {
            const { root } = createTestTree();
            const cloned = root.clone();

            expect(cloned.children[0].parent).toBe(cloned);
            expect(cloned.children[0].children[0].parent).toBe(cloned.children[0]);
        });

        it('should clone groupInfo', () => {
            const node = new TabTreeNode({ id: 1, title: 'Group' });
            node.groupInfo = { id: 100, title: 'Test Group', color: 'blue', collapsed: false };
            const cloned = node.clone();

            expect(cloned.groupInfo).toEqual(node.groupInfo);
            expect(cloned.groupInfo).not.toBe(node.groupInfo);
        });
    });

    describe('findChildById', () => {
        it('should find direct child', () => {
            const { root } = createTestTree();
            const found = root.findChildById(1);
            expect(found.tab.title).toBe('Tab 1');
        });

        it('should find deeply nested child', () => {
            const { root } = createTestTree();
            const found = root.findChildById(2);
            expect(found.tab.title).toBe('Tab 2');
        });

        it('should return null for non-existent id', () => {
            const { root } = createTestTree();
            expect(root.findChildById(999)).toBeNull();
        });
    });

    describe('getAllTabIds', () => {
        it('should return all tab IDs in the tree', () => {
            const { root } = createTestTree();
            const ids = root.getAllTabIds();
            expect(ids).toEqual(expect.arrayContaining([1, 2, 3, 4]));
            expect(ids).toHaveLength(4);
        });

        it('should exclude group container nodes', () => {
            const { root } = createTestTree();
            root.children[0].groupInfo = { id: 100, title: 'Group', color: 'blue', collapsed: false };
            const ids = root.getAllTabIds();
            // node1 has groupInfo, so its own id should NOT be included
            expect(ids).not.toContain(1);
            expect(ids).toContain(2);
            expect(ids).toContain(3);
            expect(ids).toContain(4);
        });
    });

    describe('immutable updaters', () => {
        it('updateTitleById should NOT modify original tree', () => {
            const { root } = createTestTree();
            const updated = root.updateTitleById(2, 'New Title');

            expect(root.findChildById(2).tab.title).toBe('Tab 2');
            expect(updated.findChildById(2).tab.title).toBe('New Title');
            expect(updated).not.toBe(root);
        });

        it('updateFavIconUrlById should update favicon immutably', () => {
            const { root } = createTestTree();
            const updated = root.updateFavIconUrlById(3, 'new-icon.png');

            expect(root.findChildById(3).tab.favIconUrl).toBe('icon3.png');
            expect(updated.findChildById(3).tab.favIconUrl).toBe('new-icon.png');
        });

        it('updateStatusById should update status immutably', () => {
            const { root } = createTestTree();
            const updated = root.updateStatusById(3, 'complete');

            expect(root.findChildById(3).tab.status).toBe('loading');
            expect(updated.findChildById(3).tab.status).toBe('complete');
        });

        it('updateUrlById should update URL immutably', () => {
            const { root } = createTestTree();
            const updated = root.updateUrlById(1, 'http://new-url.com');

            expect(root.findChildById(1).tab.url).toBe('http://example.com/1');
            expect(updated.findChildById(1).tab.url).toBe('http://new-url.com');
        });

        it('updaters should handle non-existent tab ids gracefully', () => {
            const { root } = createTestTree();
            const updated = root.updateTitleById(999, 'Ghost');
            // Should still return a clone, just unchanged
            expect(updated).not.toBe(root);
            expect(updated.findChildById(999)).toBeNull();
        });
    });

    describe('isGroupNode / isFolder / hasParent', () => {
        it('isGroupNode returns true when groupInfo is set', () => {
            const node = new TabTreeNode({ id: 1, title: 'g' });
            node.groupInfo = { id: 1, title: 'G', color: 'blue', collapsed: false };
            expect(node.isGroupNode()).toBe(true);
        });

        it('isGroupNode returns false by default', () => {
            const node = new TabTreeNode({ id: 1, title: 'Tab' });
            expect(node.isGroupNode()).toBe(false);
        });

        it('hasParent / getParent', () => {
            const parent = new TabTreeNode({ id: 1, title: 'Parent' });
            const child = new TabTreeNode({ id: 2, title: 'Child' });
            child.parent = parent;
            expect(child.hasParent()).toBe(true);
            expect(child.getParent()).toBe(parent);
        });

        it('isFolder returns true when isLeaf is false', () => {
            const node = new TabTreeNode();
            node.isLeaf = false;
            expect(node.isFolder()).toBe(true);
        });
    });
});
