import { findNodeByTabId, getSubtreeTabIds, getMaxIndexInSubtree } from '../util/TreeNodeUtils';
import TabTreeNode from '../util/TabTreeNode';

// Helper to build a test tree
const createTestTree = () => {
    //   root
    //   ├── node1 (id:1, index:0)
    //   │   ├── node2 (id:2, index:1)
    //   │   └── node3 (id:3, index:2)
    //   └── node4 (id:4, index:3)
    //       └── node5 (id:5, index:4)
    const root = new TabTreeNode();
    const node1 = new TabTreeNode({ id: 1, title: 'Tab 1', index: 0 });
    const node2 = new TabTreeNode({ id: 2, title: 'Tab 2', index: 1 });
    const node3 = new TabTreeNode({ id: 3, title: 'Tab 3', index: 2 });
    const node4 = new TabTreeNode({ id: 4, title: 'Tab 4', index: 3 });
    const node5 = new TabTreeNode({ id: 5, title: 'Tab 5', index: 4 });

    root.children = [node1, node4];
    node1.children = [node2, node3];
    node4.children = [node5];
    node1.parent = root;
    node2.parent = node1;
    node3.parent = node1;
    node4.parent = root;
    node5.parent = node4;

    return { root, node1, node2, node3, node4, node5 };
};

describe('TreeNodeUtils', () => {
    describe('findNodeByTabId', () => {
        it('should find root-level node', () => {
            const { root, node1 } = createTestTree();
            const found = findNodeByTabId(root, 1);
            expect(found).toBe(node1);
        });

        it('should find deeply nested node', () => {
            const { root, node5 } = createTestTree();
            const found = findNodeByTabId(root, 5);
            expect(found).toBe(node5);
        });

        it('should return null for non-existent id', () => {
            const { root } = createTestTree();
            expect(findNodeByTabId(root, 999)).toBeNull();
        });

        it('should match root node when searching undefined', () => {
            const { root } = createTestTree();
            // root.tab is undefined, root.tab?.id is undefined, so searching undefined matches root
            const found = findNodeByTabId(root, undefined);
            expect(found).toBe(root);
        });

        it('should find first matching node in DFS order', () => {
            const { root, node2 } = createTestTree();
            const found = findNodeByTabId(root, 2);
            expect(found).toBe(node2);
            expect(found.tab.title).toBe('Tab 2');
        });
    });

    describe('getSubtreeTabIds', () => {
        it('should return single id for leaf node', () => {
            const { node2 } = createTestTree();
            expect(getSubtreeTabIds(node2)).toEqual([2]);
        });

        it('should return all ids in subtree (DFS order)', () => {
            const { node1 } = createTestTree();
            expect(getSubtreeTabIds(node1)).toEqual([1, 2, 3]);
        });

        it('should return all ids from deeper subtree', () => {
            const { node4 } = createTestTree();
            expect(getSubtreeTabIds(node4)).toEqual([4, 5]);
        });
    });

    describe('getMaxIndexInSubtree', () => {
        it('should return index for leaf node', () => {
            const { node2 } = createTestTree();
            expect(getMaxIndexInSubtree(node2)).toBe(1);
        });

        it('should return max index across subtree', () => {
            const { node1 } = createTestTree();
            // node1(0), node2(1), node3(2) => max is 2
            expect(getMaxIndexInSubtree(node1)).toBe(2);
        });

        it('should return max index from entire tree', () => {
            const { root } = createTestTree();
            // root has no index (-1), but descendants go up to 4
            expect(getMaxIndexInSubtree(root)).toBe(4);
        });

        it('should return -1 for node without index', () => {
            const node = new TabTreeNode({});
            expect(getMaxIndexInSubtree(node)).toBe(-1);
        });
    });
});
