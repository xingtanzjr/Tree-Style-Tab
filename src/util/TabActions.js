import { findNodeByTabId, getSubtreeTabIds, getMaxIndexInSubtree } from './TreeNodeUtils';

export async function moveTabToGroup(chrome, initializer, tabId, groupId) {
    const root = await initializer.getTree();
    const source = findNodeByTabId(root, tabId);
    const group = root.children.find(node => node.groupInfo?.id === groupId);
    if (!source || !group) throw new Error('Tab or group no longer exists');
    if (source.tab.groupId === groupId) return;

    const tabIds = getSubtreeTabIds(source);
    await chrome.tabs.group({ tabIds, groupId });
    await initializer.updateTabParent(tabId, null);
}

export async function duplicateTab(chrome, initializer, tabId) {
    const root = await initializer.getTree();
    const source = findNodeByTabId(root, tabId);
    if (!source) throw new Error('Tab no longer exists');

    const duplicate = await chrome.tabs.duplicate(tabId);
    if (!duplicate) throw new Error('Could not duplicate tab');
    await initializer.updateTabParent(duplicate.id, source.parent?.groupInfo ? null : source.parent?.tab?.id ?? null);
    if (source.tab.groupId !== undefined && source.tab.groupId !== -1) {
        await chrome.tabs.group({ tabIds: [duplicate.id], groupId: source.tab.groupId });
    }
    return duplicate;
}

export async function createTabBelow(chrome, initializer, tabId) {
    const root = await initializer.getTree();
    const source = findNodeByTabId(root, tabId);
    if (!source) throw new Error('Tab no longer exists');

    const tab = await chrome.tabs.create({
        windowId: source.tab.windowId,
        index: getMaxIndexInSubtree(source) + 1,
        active: false,
    });
    if (source.tab.groupId !== undefined && source.tab.groupId !== -1) {
        await chrome.tabs.group({ tabIds: [tab.id], groupId: source.tab.groupId });
    }
    await initializer.updateTabParent(tab.id, source.parent?.groupInfo ? null : source.parent?.tab?.id ?? null);
    await chrome.tabs.update(tab.id, { active: true });
    return tab;
}