import MockChrome from '../mock/MockChrome';
import MockInitializer from '../mock/MockInitializer';
import { createTabBelow, duplicateTab, moveTabToGroup } from '../util/TabActions';

describe('tab actions with MockChrome', () => {
    let chrome;
    let initializer;

    beforeEach(() => {
        jest.useFakeTimers();
        chrome = new MockChrome();
        initializer = new MockInitializer(chrome);
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('inserts below the subtree rather than at the end of the browser', async () => {
        const created = await createTabBelow(chrome, initializer, 2);
        const parentMap = await initializer.getTabParentMap();
        const tree = await initializer.getTree();
        expect(tree.findChildById(created.id).parent.tab.id).toBe(tree.findChildById(2).parent.tab.id);
        expect(parentMap[created.id]).toBe(parentMap[2]);
        expect(created.index).toBeLessThan(10);
    });

    it('duplicates one tab and no descendants', async () => {
        const before = await initializer.getTabList();
        const duplicate = await duplicateTab(chrome, initializer, 2);
        expect(await initializer.getTabList()).toHaveLength(before.length + 1);
        expect((await initializer.getTree()).findChildById(duplicate.id).children).toHaveLength(0);
    });

    it('keeps moved subtree members adjacent to the target group', async () => {
        const groups = await chrome.tabGroups.query({ windowId: 1 });
        const target = groups[groups.length - 1];
        await moveTabToGroup(chrome, initializer, 2, target.id);
        const tabs = await initializer.getTabList();
        const members = tabs.filter(tab => tab.groupId === target.id);
        expect(members[members.length - 1].index - members[0].index + 1).toBe(members.length);
        expect((await initializer.getTree()).children.filter(node => node.groupInfo?.id === target.id)).toHaveLength(1);
    });

    it('reloads only the selected tab', async () => {
        const updated = jest.fn();
        chrome.tabs.onUpdated.addListener(updated);
        await chrome.tabs.reload(2);
        expect(updated).toHaveBeenCalledWith(2, { status: 'loading' }, expect.anything());
        jest.runOnlyPendingTimers();
        expect(updated).toHaveBeenLastCalledWith(2, { status: 'complete' }, expect.anything());
    });

    it('loads the saved display preference through the Chrome callback API', async () => {
        await chrome.storage.local.set({ compactGroups: true });
        const callback = jest.fn();
        await chrome.storage.local.get(['compactGroups'], callback);
        expect(callback).toHaveBeenCalledWith({ compactGroups: true });
    });

    it('only lists groups in the requested window', async () => {
        expect(await chrome.tabGroups.query({ windowId: 99 })).toEqual([]);
        expect(await chrome.tabGroups.query({ windowId: -2 })).toHaveLength(3);
    });
});