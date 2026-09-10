import fs from 'fs';
import path from 'path';
import vm from 'vm';
import MockChrome from '../mock/MockChrome';
import MockInitializer from '../mock/MockInitializer';
import { findNodeByTabId } from '../util/TreeNodeUtils';

function loadTracking() {
    const listeners = {};
    let parents = { 2: 1, 3: 2, 4: 3 };
    const context = vm.createContext({
        console,
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