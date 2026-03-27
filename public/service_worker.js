/*global chrome*/

const NEW_TAB_URLS = ['chrome://newtab/', 'edge://newtab/'];

const isNewTabUrl = (url) => NEW_TAB_URLS.includes(url);

// ============================================================
// Workspace: named session save/restore
// ============================================================

async function saveWorkspace(name) {
    const focusedWindow = await chrome.windows.getLastFocused();
    const windowId = focusedWindow.id;
    const tabs = await chrome.tabs.query({ windowId });
    const { tabParentMap = {} } = await chrome.storage.session.get('tabParentMap');

    const tabIdToIdx = {};
    const entries = [];
    let idx = 0;
    for (const tab of tabs) {
        if (isNewTabUrl(tab.url)) continue;
        tabIdToIdx[tab.id] = idx;
        entries.push({
            url: tab.url,
            title: tab.title || '',
            index: tab.index,
            groupId: tab.groupId ?? -1,
        });
        idx++;
    }

    // Store parent as index into entries array
    for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (isNewTabUrl(tab.url)) continue;
        const ei = tabIdToIdx[tab.id];
        const parentTabId = tabParentMap[tab.id];
        entries[ei].parentIndex = (parentTabId !== undefined && tabIdToIdx[parentTabId] !== undefined)
            ? tabIdToIdx[parentTabId] : null;
    }

    // Group info
    let groups = [];
    try {
        if (chrome.tabGroups?.query) {
            const tabGroups = await chrome.tabGroups.query({});
            groups = tabGroups.map(g => ({
                id: g.id,
                title: g.title || '',
                color: g.color || 'grey',
            }));
        }
    } catch {}

    const workspace = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        createdAt: Date.now(),
        tabCount: entries.length,
        entries,
        groups,
    };

    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    workspaces.push(workspace);
    await chrome.storage.local.set({ workspaces });
    return workspace;
}

async function getWorkspaces() {
    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    return workspaces.map(w => ({
        id: w.id,
        name: w.name,
        createdAt: w.createdAt,
        tabCount: w.tabCount,
        groupCount: (w.groups || []).length,
    }));
}

async function openWorkspace(workspaceId) {
    const focusedWindow = await chrome.windows.getLastFocused();
    const windowId = focusedWindow.id;
    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return { success: false, error: 'Not found' };

    const { entries, groups } = workspace;

    // Build group info map: old groupId → { title, color }
    const groupInfoMap = {};
    for (const g of (groups || [])) {
        groupInfoMap[g.id] = g;
    }

    // Find existing groups to reuse (match by title+color)
    let existingGroups = [];
    try {
        if (chrome.tabGroups?.query) {
            existingGroups = await chrome.tabGroups.query({});
        }
    } catch {}

    const existingByKey = {};
    for (const g of existingGroups) {
        const key = `${g.title || ''}\t${g.color || 'grey'}`;
        if (!existingByKey[key]) existingByKey[key] = [];
        existingByKey[key].push(g.id);
    }

    const groupIdMap = {};
    for (const g of (groups || [])) {
        const key = `${g.title}\t${g.color}`;
        if (existingByKey[key]?.length > 0) {
            groupIdMap[g.id] = existingByKey[key].shift();
        }
    }

    // Step 1: Create all tabs
    const createdTabs = [];
    for (const entry of entries) {
        try {
            const tab = await chrome.tabs.create({ url: entry.url, active: false, windowId });
            createdTabs.push(tab);
        } catch {
            createdTabs.push(null);
        }
    }

    // Step 2: Restore tab groups
    const tabsByOldGroup = {};
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const tab = createdTabs[i];
        if (!tab || entry.groupId === -1) continue;
        if (!tabsByOldGroup[entry.groupId]) tabsByOldGroup[entry.groupId] = [];
        tabsByOldGroup[entry.groupId].push(tab.id);
    }

    for (const [oldGroupId, tabIds] of Object.entries(tabsByOldGroup)) {
        try {
            if (groupIdMap[oldGroupId]) {
                await chrome.tabs.group({ tabIds, groupId: groupIdMap[oldGroupId] });
            } else {
                const newGroupId = await chrome.tabs.group({ tabIds, createProperties: { windowId } });
                groupIdMap[oldGroupId] = newGroupId;
                const info = groupInfoMap[Number(oldGroupId)];
                if (info) {
                    await chrome.tabGroups.update(newGroupId, { title: info.title, color: info.color });
                }
            }
        } catch (e) {
            console.error('[Workspace] group failed:', e);
        }
    }

    // Step 3: Rebuild parent map
    const { tabParentMap = {} } = await chrome.storage.session.get('tabParentMap');
    let count = 0;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.parentIndex == null) continue;
        const childTab = createdTabs[i];
        const parentTab = createdTabs[entry.parentIndex];
        if (childTab && parentTab) {
            tabParentMap[childTab.id] = parentTab.id;
            count++;
        }
    }
    if (count > 0) {
        await chrome.storage.session.set({ tabParentMap });
    }

    return { success: true, tabCount: createdTabs.filter(Boolean).length };
}

async function deleteWorkspace(workspaceId) {
    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    const filtered = workspaces.filter(w => w.id !== workspaceId);
    await chrome.storage.local.set({ workspaces: filtered });
}

// ============================================================
// Message handler for UI ↔ Service Worker
// ============================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'saveWorkspace') {
        saveWorkspace(msg.name).then((ws) => {
            sendResponse({ success: true, workspace: { id: ws.id, name: ws.name, createdAt: ws.createdAt, tabCount: ws.tabCount } });
        }).catch((e) => {
            sendResponse({ success: false, error: e.message });
        });
        return true;
    }
    if (msg.action === 'getWorkspaces') {
        getWorkspaces().then((list) => {
            sendResponse({ success: true, workspaces: list });
        }).catch(() => {
            sendResponse({ success: false, workspaces: [] });
        });
        return true;
    }
    if (msg.action === 'openWorkspace') {
        openWorkspace(msg.id).then((result) => {
            sendResponse(result);
        }).catch((e) => {
            sendResponse({ success: false, error: e.message });
        });
        return true;
    }
    if (msg.action === 'deleteWorkspace') {
        deleteWorkspace(msg.id).then(() => {
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    }
    if (msg.action === 'openSidePanel') {
        const windowId = sender.tab?.windowId;
        if (windowId) {
            chrome.sidePanel.open({ windowId }).then(() => {
                sendResponse({ success: true });
            }).catch(() => {
                sendResponse({ success: false });
            });
        } else {
            sendResponse({ success: false });
        }
        return true;
    }
});

// ============================================================
// Extension lifecycle
// ============================================================

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
    }
});

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error(error));

chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'open-side-panel' && tab) {
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
});

// ============================================================
// Tab parent tracking
// ============================================================

chrome.tabs.onCreated.addListener((tab) => {
    if (!isNewTabUrl(tab.url) && tab.openerTabId !== undefined) {
        chrome.storage.session.get(['tabParentMap'], (ret) => {
            let tabParentMap = ret.tabParentMap || {};
            tabParentMap[tab.id] = tab.openerTabId;
            chrome.storage.session.set({ tabParentMap });
        });
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        if (isNewTabUrl(tab.url)) {
            chrome.storage.session.get(['tabParentMap'], (ret) => {
                let tabParentMap = ret.tabParentMap || {};
                delete tabParentMap[tab.id];
                chrome.storage.session.set({ tabParentMap });
            });
        }
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.get(['tabParentMap'], (ret) => {
        let tabParentMap = ret.tabParentMap || {};
        delete tabParentMap[tabId];
        chrome.storage.session.set({ tabParentMap });
    });
});