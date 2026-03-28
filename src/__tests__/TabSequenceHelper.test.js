import TabSequenceHelper from '../util/TabSequenceHelper';
import TabTreeNode from '../util/TabTreeNode';

const createTestTree = () => {
    //   root
    //   ├── node1 (id:1)
    //   │   ├── node2 (id:2)
    //   │   └── node3 (id:3)
    //   └── node4 (id:4)
    const root = new TabTreeNode();
    const node1 = new TabTreeNode({ id: 1, title: 'Tab 1' });
    const node2 = new TabTreeNode({ id: 2, title: 'Tab 2' });
    const node3 = new TabTreeNode({ id: 3, title: 'Tab 3' });
    const node4 = new TabTreeNode({ id: 4, title: 'Tab 4' });

    root.children = [node1, node4];
    node1.children = [node2, node3];
    node1.parent = root;
    node2.parent = node1;
    node3.parent = node1;
    node4.parent = root;

    return root;
};

const emptyRoot = () => new TabTreeNode();

describe('TabSequenceHelper', () => {
    describe('getNextTab', () => {
        it('should traverse in DFS order', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            expect(helper.getNextTab().id).toBe(1);
            expect(helper.getNextTab().id).toBe(2);
            expect(helper.getNextTab().id).toBe(3);
            expect(helper.getNextTab().id).toBe(4);
        });

        it('should wrap around to the beginning', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            // Go through all 4 tabs
            helper.getNextTab(); // 1
            helper.getNextTab(); // 2
            helper.getNextTab(); // 3
            helper.getNextTab(); // 4

            // Should wrap back to 1
            expect(helper.getNextTab().id).toBe(1);
        });

        it('should return null for empty tree', () => {
            const helper = new TabSequenceHelper(emptyRoot(), emptyRoot(), emptyRoot());
            expect(helper.getNextTab()).toBeNull();
        });
    });

    describe('getPreviousTab', () => {
        it('should go backwards from start (wraps to end)', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            // currentIdx starts at -1, getPreviousTab sets it to 0 then (0-1+4)%4=3
            expect(helper.getPreviousTab().id).toBe(4);
        });

        it('should navigate backwards after forward', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            helper.getNextTab(); // 1, idx=0
            helper.getNextTab(); // 2, idx=1
            expect(helper.getPreviousTab().id).toBe(1); // back to idx=0
        });

        it('should return null for empty tree', () => {
            const helper = new TabSequenceHelper(emptyRoot(), emptyRoot(), emptyRoot());
            expect(helper.getPreviousTab()).toBeNull();
        });
    });

    describe('setCurrentIdx', () => {
        it('should set navigation position by active tab', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            helper.setCurrentIdx({ id: 3 });
            // Now getNextTab should give the next after id=3 which is id=4
            expect(helper.getNextTab().id).toBe(4);
        });
    });

    describe('refreshQueue', () => {
        it('should rebuild the tab list and reset index', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            helper.getNextTab(); // move to idx=0
            helper.getNextTab(); // move to idx=1

            // Refresh with new tree
            const newRoot = new TabTreeNode();
            const tabA = new TabTreeNode({ id: 10, title: 'A' });
            newRoot.children = [tabA];
            tabA.parent = newRoot;

            helper.refreshQueue(newRoot, emptyRoot(), emptyRoot());
            expect(helper.getNextTab().id).toBe(10);
        });
    });

    describe('group nodes', () => {
        it('should skip group container nodes but traverse their children', () => {
            const root = new TabTreeNode();
            const group = new TabTreeNode({ id: 'group-1', title: 'Group', isGroup: true });
            group.groupInfo = { id: 1, title: 'Group', color: 'blue', collapsed: false };
            const child1 = new TabTreeNode({ id: 10, title: 'Grouped Tab 1' });
            const child2 = new TabTreeNode({ id: 11, title: 'Grouped Tab 2' });
            const ungrouped = new TabTreeNode({ id: 20, title: 'Ungrouped' });

            root.children = [group, ungrouped];
            group.children = [child1, child2];

            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            // Should traverse child1, child2 (skipping group), then ungrouped
            expect(helper.getNextTab().id).toBe(10);
            expect(helper.getNextTab().id).toBe(11);
            expect(helper.getNextTab().id).toBe(20);
        });
    });

    describe('combined trees', () => {
        it('should include bookmarks and search results after tabs', () => {
            const tabRoot = new TabTreeNode();
            const tab1 = new TabTreeNode({ id: 1, title: 'Tab' });
            tabRoot.children = [tab1];

            const bmRoot = new TabTreeNode();
            const bm1 = new TabTreeNode({ id: 'bk1', title: 'Bookmark' });
            bmRoot.children = [bm1];

            const searchRoot = new TabTreeNode();
            const s1 = new TabTreeNode({ id: 's1', title: 'Search Result' });
            searchRoot.children = [s1];

            const helper = new TabSequenceHelper(tabRoot, bmRoot, searchRoot);

            expect(helper.getNextTab().id).toBe(1);
            expect(helper.getNextTab().id).toBe('bk1');
            expect(helper.getNextTab().id).toBe('s1');
        });
    });

    describe('getParentTab', () => {
        it('should return parent tab for child', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            const parent = helper.getParentTab(2, root);
            expect(parent.id).toBe(1);
        });

        it('should return null for root-level tab', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            const parent = helper.getParentTab(1, root);
            // root has no tab, so parent?.tab is null
            expect(parent).toBeNull();
        });

        it('should return null for non-existent tab', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            expect(helper.getParentTab(999, root)).toBeNull();
        });
    });

    describe('getNodeByTabId', () => {
        it('should find node in tree', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            const node = helper.getNodeByTabId(3, root);
            expect(node.tab.id).toBe(3);
            expect(node.tab.title).toBe('Tab 3');
        });

        it('should return null for non-existent id', () => {
            const root = createTestTree();
            const helper = new TabSequenceHelper(root, emptyRoot(), emptyRoot());

            expect(helper.getNodeByTabId(999, root)).toBeNull();
        });
    });
});
