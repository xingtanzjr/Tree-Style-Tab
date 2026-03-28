import TabTreeGenerator from '../util/TabTreeGenerator';

describe('TabTreeGenerator', () => {
    describe('basic tree building (no groups)', () => {
        it('should build tree from flat tabs with parent map', () => {
            const tabs = [
                { id: 1, title: 'Root Tab' },
                { id: 2, title: 'Child of 1' },
                { id: 3, title: 'Child of 1' },
                { id: 4, title: 'Another root' },
            ];
            const parentMap = { 2: 1, 3: 1 };

            const gen = new TabTreeGenerator(tabs, parentMap);
            const root = gen.getTree();

            expect(root.children).toHaveLength(2);
            expect(root.children[0].tab.id).toBe(1);
            expect(root.children[0].children).toHaveLength(2);
            expect(root.children[1].tab.id).toBe(4);
        });

        it('should handle empty tabs list', () => {
            const gen = new TabTreeGenerator([], {});
            const root = gen.getTree();
            expect(root.children).toHaveLength(0);
        });

        it('should treat orphaned parent references as root-level', () => {
            // Tab 2 has parent 99, but tab 99 doesn't exist
            const tabs = [
                { id: 1, title: 'Tab 1' },
                { id: 2, title: 'Tab 2' },
            ];
            const parentMap = { 2: 99 };

            const gen = new TabTreeGenerator(tabs, parentMap);
            const root = gen.getTree();

            // Tab 2 should become root-level since parent 99 doesn't exist
            expect(root.children).toHaveLength(2);
        });

        it('should handle deeply nested tree', () => {
            const tabs = [
                { id: 1, title: 'Level 0' },
                { id: 2, title: 'Level 1' },
                { id: 3, title: 'Level 2' },
                { id: 4, title: 'Level 3' },
            ];
            const parentMap = { 2: 1, 3: 2, 4: 3 };

            const gen = new TabTreeGenerator(tabs, parentMap);
            const root = gen.getTree();

            // root -> 1 -> 2 -> 3 -> 4
            expect(root.children).toHaveLength(1);
            expect(root.children[0].tab.id).toBe(1);
            expect(root.children[0].children).toHaveLength(1);
            expect(root.children[0].children[0].tab.id).toBe(2);
            expect(root.children[0].children[0].children).toHaveLength(1);
            expect(root.children[0].children[0].children[0].tab.id).toBe(3);
            expect(root.children[0].children[0].children[0].children).toHaveLength(1);
            expect(root.children[0].children[0].children[0].children[0].tab.id).toBe(4);
        });
    });

    describe('group-aware tree building', () => {
        it('should wrap grouped tabs in container nodes', () => {
            const tabs = [
                { id: 1, title: 'Grouped 1', groupId: 100 },
                { id: 2, title: 'Grouped 2', groupId: 100 },
                { id: 3, title: 'Ungrouped' },
            ];
            const parentMap = {};
            const groups = [
                { id: 100, title: 'My Group', color: 'blue', collapsed: false },
            ];

            const gen = new TabTreeGenerator(tabs, parentMap, groups);
            const root = gen.getTree();

            // Should have: [GroupContainer, UngroupedTab]
            expect(root.children).toHaveLength(2);
            expect(root.children[0].isGroupNode()).toBe(true);
            expect(root.children[0].groupInfo.title).toBe('My Group');
            expect(root.children[0].groupInfo.color).toBe('blue');
            expect(root.children[0].children).toHaveLength(2);
            expect(root.children[1].tab.id).toBe(3);
        });

        it('should count total tabs in group', () => {
            const tabs = [
                { id: 1, title: 'G1', groupId: 100 },
                { id: 2, title: 'G2', groupId: 100 },
                { id: 3, title: 'G3', groupId: 100 },
            ];
            const parentMap = { 2: 1 };
            const groups = [{ id: 100, title: 'Group', color: 'red', collapsed: false }];

            const gen = new TabTreeGenerator(tabs, parentMap, groups);
            const root = gen.getTree();

            expect(root.children[0].groupInfo.tabCount).toBe(3);
        });

        it('should only recognize parent within same group', () => {
            // Tab 2 (group 100) has parent 1 (group 200) — should NOT be recognized
            const tabs = [
                { id: 1, title: 'Group A Tab', groupId: 200 },
                { id: 2, title: 'Group B Tab', groupId: 100 },
            ];
            const parentMap = { 2: 1 };
            const groups = [
                { id: 100, title: 'B', color: 'blue' },
                { id: 200, title: 'A', color: 'red' },
            ];

            const gen = new TabTreeGenerator(tabs, parentMap, groups);
            const root = gen.getTree();

            // Both should be at root level (inside their group containers)
            // Group A container → [tab1], Group B container → [tab2]
            const groupA = root.children.find(c => c.groupInfo?.title === 'A');
            const groupB = root.children.find(c => c.groupInfo?.title === 'B');
            expect(groupA.children).toHaveLength(1);
            expect(groupB.children).toHaveLength(1);
            // Tab 2 should NOT be a child of Tab 1
            expect(groupA.children[0].children).toHaveLength(0);
        });

        it('should handle multiple groups and ungrouped tabs', () => {
            const tabs = [
                { id: 1, title: 'G1-1', groupId: 10 },
                { id: 2, title: 'G1-2', groupId: 10 },
                { id: 3, title: 'Ungrouped' },
                { id: 4, title: 'G2-1', groupId: 20 },
            ];
            const parentMap = {};
            const groups = [
                { id: 10, title: 'First', color: 'blue' },
                { id: 20, title: 'Second', color: 'green' },
            ];

            const gen = new TabTreeGenerator(tabs, parentMap, groups);
            const root = gen.getTree();

            // [GroupContainer(10), Ungrouped, GroupContainer(20)]
            expect(root.children).toHaveLength(3);
            expect(root.children[0].isGroupNode()).toBe(true);
            expect(root.children[0].groupInfo.id).toBe(10);
            expect(root.children[1].tab.id).toBe(3);
            expect(root.children[2].isGroupNode()).toBe(true);
            expect(root.children[2].groupInfo.id).toBe(20);
        });

        it('should preserve collapsed state', () => {
            const tabs = [{ id: 1, title: 'Tab', groupId: 10 }];
            const groups = [{ id: 10, title: 'Col', color: 'grey', collapsed: true }];

            const gen = new TabTreeGenerator(tabs, {}, groups);
            const root = gen.getTree();

            expect(root.children[0].groupInfo.collapsed).toBe(true);
        });
    });
});
