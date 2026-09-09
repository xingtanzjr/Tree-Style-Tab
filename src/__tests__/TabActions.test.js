import TabTreeGenerator from '../util/TabTreeGenerator';
import { moveTabToGroup, duplicateTab, createTabBelow } from '../util/TabActions';

const tabs = [
    { id: 1, index: 0, windowId: 7, groupId: -1 },
    { id: 2, index: 1, windowId: 7, groupId: -1 },
    { id: 3, index: 2, windowId: 7, groupId: 10 },
    { id: 4, index: 3, windowId: 7, groupId: 10 },
    { id: 5, index: 4, windowId: 7, groupId: 10 },
];

function setup() {
    const root = new TabTreeGenerator(tabs, { 2: 1, 4: 3, 5: 4 }, [
        { id: 10, title: 'Work', color: 'blue', collapsed: true },
    ]).getTree();
    return {
        chrome: { tabs: {
            group: jest.fn().mockResolvedValue(10),
            duplicate: jest.fn().mockResolvedValue({ id: 6 }),
            create: jest.fn().mockResolvedValue({ id: 6 }),
            update: jest.fn().mockResolvedValue({ id: 6 }),
        } },
        initializer: {
            getTree: jest.fn().mockResolvedValue(root),
            updateTabParent: jest.fn().mockResolvedValue(),
        },
    };
}

describe('TabActions', () => {
    it('moves the complete subtree into a collapsed group without expanding it', async () => {
        const { chrome, initializer } = setup();
        await moveTabToGroup(chrome, initializer, 1, 10);
        expect(initializer.getTree).toHaveBeenCalledWith();
        expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1, 2], groupId: 10 });
        expect(initializer.updateTabParent).toHaveBeenCalledWith(1, null);
        expect(chrome.tabs.update).not.toHaveBeenCalled();
    });

    it('does not detach a tab already in the selected group', async () => {
        const { chrome, initializer } = setup();
        await moveTabToGroup(chrome, initializer, 4, 10);
        expect(chrome.tabs.group).not.toHaveBeenCalled();
        expect(initializer.updateTabParent).not.toHaveBeenCalled();
    });

    it('does not change the tree when grouping fails', async () => {
        const { chrome, initializer } = setup();
        chrome.tabs.group.mockRejectedValue(new Error('Group was removed'));
        await expect(moveTabToGroup(chrome, initializer, 1, 10)).rejects.toThrow();
        expect(initializer.updateTabParent).not.toHaveBeenCalled();
    });

    it('rejects missing tabs and groups', async () => {
        const { chrome, initializer } = setup();
        await expect(moveTabToGroup(chrome, initializer, 99, 10)).rejects.toThrow();
        await expect(moveTabToGroup(chrome, initializer, 1, 99)).rejects.toThrow();
        expect(chrome.tabs.group).not.toHaveBeenCalled();
    });

    it('duplicates only the selected tab and preserves its parent and group', async () => {
        const { chrome, initializer } = setup();
        await duplicateTab(chrome, initializer, 4);
        expect(chrome.tabs.duplicate).toHaveBeenCalledTimes(1);
        expect(chrome.tabs.duplicate).toHaveBeenCalledWith(4);
        expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [6], groupId: 10 });
        expect(initializer.updateTabParent).toHaveBeenCalledWith(6, 3);
    });

    it('never stores a virtual group ID as a duplicated tab parent', async () => {
        const { chrome, initializer } = setup();
        await duplicateTab(chrome, initializer, 3);
        expect(initializer.updateTabParent).toHaveBeenCalledWith(6, null);
    });

    it('creates a sibling after the entire subtree in the same window and group', async () => {
        const { chrome, initializer } = setup();
        await createTabBelow(chrome, initializer, 4);
        expect(chrome.tabs.create).toHaveBeenCalledWith({ windowId: 7, index: 5, active: false });
        expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [6], groupId: 10 });
        expect(initializer.updateTabParent).toHaveBeenCalledWith(6, 3);
        expect(chrome.tabs.update).toHaveBeenCalledWith(6, { active: true });
    });

    it('creates an ungrouped root sibling without assigning a group', async () => {
        const { chrome, initializer } = setup();
        await createTabBelow(chrome, initializer, 1);
        expect(chrome.tabs.create).toHaveBeenCalledWith({ windowId: 7, index: 2, active: false });
        expect(chrome.tabs.group).not.toHaveBeenCalled();
        expect(initializer.updateTabParent).toHaveBeenCalledWith(6, null);
    });
});