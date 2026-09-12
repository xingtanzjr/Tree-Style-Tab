import fs from 'fs';
import path from 'path';
import vm from 'vm';
import MockChrome from '../mock/MockChrome';
import MockInitializer from '../mock/MockInitializer';
import TabTreeGenerator from '../util/TabTreeGenerator';
import { findNodeByTabId } from '../util/TreeNodeUtils';

function loadTracking(initialParents = { 2: 1, 3: 2, 4: 3 }) {
    const listeners = {};
    let parents = { ...initialParents };
    const context = vm.createContext({
        console,
        TreeSessionRecovery: { start: jest.fn() },
        chrome: {
            tabs: {
                get: async () => ({ pinned: true }),
                onCreated: { addListener: listener => { listeners.created = listener; } },
                onUpdated: { addListener: listener => { listeners.updated = listener; } },
                onRemoved: { addListener: listener => { listeners.removed = listener; } },
            },
            storage: { session: {
                get: async () => ({ tabParentMap: { ...parents } }),
                set: async value => { parents = { ...value.tabParentMap }; },
            } },
        },
        isNewTabUrl: url => url === 'chrome://newtab/',
    });
    const source = fs.readFileSync(path.join(process.cwd(), 'public/service_worker.js'), 'utf8');
    vm.runInContext(source.slice(source.indexOf('let parentUpdateQueue')), context);
    return { listeners, parents: () => parents };
}

test.each([-1, 100])('native close promotes all direct children while preserving descendants and order in group %s', async groupId => {
    const tracking = loadTracking({ 2: 1, 3: 2, 4: 3, 5: 2, 6: 1 });
    const tabs = [1, 2, 3, 4, 5, 6].map((id, index) => ({ id, index, groupId, pinned: false }));
    const groups = groupId === -1 ? [] : [{ id: groupId, title: 'Test group', color: 'blue' }];

    await tracking.listeners.removed(2, { windowId: 1, isWindowClosing: false });

    expect(tracking.parents()).toEqual({ 3: 1, 4: 3, 5: 1, 6: 1 });
    const remainingTabs = tabs.filter(tab => tab.id !== 2);
    const tree = new TabTreeGenerator(remainingTabs, tracking.parents(), groups).getTree();
    const ancestor = findNodeByTabId(tree, 1);
    expect(ancestor.children.map(node => node.tab.id)).toEqual([3, 5, 6]);
    expect(findNodeByTabId(tree, 3).children.map(node => node.tab.id)).toEqual([4]);
    expect(findNodeByTabId(tree, 2)).toBeNull();
    expect(tree.getAllTabIds()).toEqual([1, 3, 4, 5, 6]);
    for (const tab of remainingTabs) {
        expect(findNodeByTabId(tree, tab.id).tab).toEqual(tab);
    }
    if (groupId !== -1) {
        expect(tree.children).toHaveLength(1);
        expect(tree.children[0].groupInfo.id).toBe(groupId);
        expect(ancestor.parent).toBe(tree.children[0]);
    }
});

test.each([-1, 100])('native close of a root promotes only direct children within group %s', async groupId => {
    const tracking = loadTracking({ 2: 1, 3: 2, 4: 1 });
    const groups = groupId === -1 ? [] : [{ id: groupId, title: 'Test group', color: 'blue' }];

    await tracking.listeners.removed(1, { windowId: 1, isWindowClosing: false });

    expect(tracking.parents()).toEqual({ 3: 2 });
    const tree = new TabTreeGenerator([2, 3, 4].map(id => ({ id, groupId })), tracking.parents(), groups).getTree();
    const container = groupId === -1 ? tree : tree.children[0];
    expect(container.children.map(node => node.tab.id)).toEqual([2, 4]);
    expect(findNodeByTabId(tree, 2).children.map(node => node.tab.id)).toEqual([3]);
    expect(tree.getAllTabIds()).toEqual([2, 3, 4]);
});

test.each([
    [[2, 3], { 4: 1 }],
    [[3, 2], { 4: 1 }],
    [[1, 2], { 4: 3 }],
    [[2, 1], { 4: 3 }],
    [[2, 3, 4], {}],
    [[4, 3, 2], {}],
])('native closes serialize relationship updates for tabs %j', async (tabIds, expectedParents) => {
    const tracking = loadTracking();

    await Promise.all(tabIds.map(tabId => tracking.listeners.removed(tabId, { windowId: 1, isWindowClosing: false })));

    expect(tracking.parents()).toEqual(expectedParents);
});

test('native close of a leaf leaves other relationships unchanged', async () => {
    const tracking = loadTracking();

    await tracking.listeners.removed(4, { windowId: 1, isWindowClosing: false });

    expect(tracking.parents()).toEqual({ 2: 1, 3: 2 });
});

test('native pin and unpin permanently promote children without restoring old relationships', async () => {
    const tracking = loadTracking();
    await tracking.listeners.updated(2, { pinned: true }, { id: 2, pinned: true });
    expect(tracking.parents()).toEqual({ 3: 1, 4: 3 });
    await tracking.listeners.updated(2, { pinned: false }, { id: 2, pinned: false });
    expect(tracking.parents()).toEqual({ 3: 1, 4: 3 });
});

test('rapid native pins serialize parent updates and children opened from pinned tabs stay roots', async () => {
    const tracking = loadTracking();
    await Promise.all([
        tracking.listeners.updated(2, { pinned: true }, { id: 2 }),
        tracking.listeners.updated(1, { pinned: true }, { id: 1 }),
    ]);
    expect(tracking.parents()).toEqual({ 4: 3 });
    await tracking.listeners.created({ id: 5, openerTabId: 1, url: 'https://example.com' });
    expect(tracking.parents()).toEqual({ 4: 3 });
});

test('mock pin moves only the chosen tab out of its group and unpin leaves it at the ordinary boundary', async () => {
    const chrome = new MockChrome();
    const initializer = new MockInitializer(chrome);
    const before = await initializer.getTree();
    const source = findNodeByTabId(before, 2);
    const childIds = source.children.map(child => child.tab.id);
    const groupId = source.tab.groupId;
    await chrome.tabs.update(2, { pinned: true });
    await chrome.tabs.update(8, { pinned: true });
    expect((await initializer.getTree()).children.slice(0, 2).map(node => node.tab.id)).toEqual([2, 8]);
    for (const childId of childIds) {
        const child = findNodeByTabId(await initializer.getTree(), childId);
        expect(child.tab.groupId).toBe(groupId);
        expect(child.tab.pinned).not.toBe(true);
        expect(child.parent.tab.id).not.toBe(2);
    }
    await chrome.tabs.update(2, { pinned: false });
    const tab = await chrome.tabs.get(2);
    expect(tab).toMatchObject({ index: 1, pinned: false, groupId: -1 });
    expect(findNodeByTabId(await initializer.getTree(), 2).children).toHaveLength(0);
});