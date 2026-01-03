import TabTreeGenerator from './util/TabTreeGenerator';
import TabSequenceHelper from './util/TabSequenceHelper';
import TabTreeNode from './util/TabTreeNode';

describe('TabTreeGenerator', () => {
    it('should build correct tree structure from tabs and parent map', () => {
        const tabs = [1, 2, 3, 4, 5, 7].map((item) => ({
            id: item,
            title: `title ${item}`,
        }));
        
        const tabsParentMap = {
            2: 1,
            3: 1,
            5: 4,
            7: 6,
            6: 4,
        };

        const gen = new TabTreeGenerator(tabs, tabsParentMap);
        const rootNode = gen.getTree();

        expect(rootNode.children).toHaveLength(2);
        expect(rootNode.children[0].children).toHaveLength(2);
        expect(rootNode.children[1].children).toHaveLength(2);

        const aimNode = rootNode.findChildById(3);
        expect(aimNode.tab.title).toBe('title 3');
    });

    it('should navigate through tree with TabSequenceHelper', () => {
        const tabs = [1, 2, 3, 4, 5, 7].map((item) => ({
            id: item,
            title: `title ${item}`,
        }));
        
        const tabsParentMap = {
            2: 1,
            3: 1,
            5: 4,
            7: 6,
            6: 4,
        };

        const gen = new TabTreeGenerator(tabs, tabsParentMap);
        const rootNode = gen.getTree();
        const emptyRootNode = new TabTreeNode();

        const tabSequenceHelper = new TabSequenceHelper(rootNode, emptyRootNode, emptyRootNode);

        expect(tabSequenceHelper.getNextTab().id).toBe(1);
        expect(tabSequenceHelper.getNextTab().id).toBe(2);
        expect(tabSequenceHelper.getNextTab().id).toBe(3);
        expect(tabSequenceHelper.getNextTab().id).toBe(4);
        expect(tabSequenceHelper.getNextTab().id).toBe(5);
        expect(tabSequenceHelper.getNextTab().id).toBe(7);
    });
});

describe('TabTreeNode', () => {
    it('should update title immutably', () => {
        const tab = { id: 1, title: 'Original' };
        const node = new TabTreeNode(tab);
        const child = new TabTreeNode({ id: 2, title: 'Child' });
        node.children.push(child);

        const updated = node.updateTitleById(2, 'Updated');

        expect(updated).not.toBe(node);
        expect(node.children[0].tab.title).toBe('Child');
        expect(updated.children[0].tab.title).toBe('Updated');
    });
});