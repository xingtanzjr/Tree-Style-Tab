/*global chrome*/

const NEW_TAB_URLS = ['chrome://newtab/', 'edge://newtab/'];
const MAX_FREE_WORKSPACES = 3;

const isNewTabUrl = (url) => NEW_TAB_URLS.includes(url);

// Matches chrome://, edge://, about: pages and empty/null URLs.
// Used to exclude system pages from the persistent hierarchy backup.
const isSystemUrl = (url) => !url || /^(chrome|edge|about):/.test(url);

// Normalise a URL for consistent hierarchy matching across sessions.
// Strips fragments (client-side state) and, for non-http(s) URLs (internal
// browser pages like ghost://extensions), strips trailing slashes so that
// "ghost://extensions" and "ghost://extensions/" compare as equal.
const normalizeUrl = (url) => {
    if (!url) return url;
    const noFrag = url.includes('#') ? url.slice(0, url.indexOf('#')) : url;
    return /^https?:/.test(noFrag) ? noFrag : noFrag.replace(/\/$/, '');
};

// ============================================================
// Workspace: multi-slot save/restore (max 3 in free tier)
// ============================================================

async function saveWorkspace(name, marks = {}, notes = {}) {
    const focusedWindow = await chrome.windows.getLastFocused();
    const windowId = focusedWindow.id;
    const tabs = await chrome.tabs.query({ windowId });
    const { tabParentMap = {} } = await chrome.storage.session.get('tabParentMap');

    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    if (workspaces.length >= MAX_FREE_WORKSPACES) {
        return { success: false, error: 'limit', max: MAX_FREE_WORKSPACES };
    }

    const tabIdToIdx = {};
    const entries = [];
    let idx = 0;
    for (const tab of tabs) {
        if (isNewTabUrl(tab.url)) continue;
        tabIdToIdx[tab.id] = idx;
        const entry = {
            url: tab.url,
            title: tab.title || '',
            index: tab.index,
            groupId: tab.groupId ?? -1,
            favIconUrl: tab.favIconUrl || null,
        };
        if (marks[tab.id]) {
            entry.mark = marks[tab.id];
        }
        if (notes[tab.id]) {
            entry.note = notes[tab.id];
        }
        if (tab.ghostPublicAPI?.identity_id) {
            entry.ghostIdentityId = tab.ghostPublicAPI.identity_id;
        }
        if (tab.ghostPublicAPI?.workspace_id) {
            entry.ghostWorkspaceId = tab.ghostPublicAPI.workspace_id;
        }
        entries.push(entry);
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
        id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: name || 'Workspace',
        createdAt: Date.now(),
        tabCount: entries.length,
        entries,
        groups,
    };

    workspaces.push(workspace);
    await chrome.storage.local.set({ workspaces });
    return { success: true, workspace };
}

async function listWorkspaces() {
    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    return workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        tabCount: ws.tabCount,
        groupCount: (ws.groups || []).length,
        createdAt: ws.createdAt,
    }));
}

async function getWorkspacePreview(workspaceId) {
    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return { exists: false };
    return {
        exists: true,
        id: ws.id,
        name: ws.name,
        tabCount: ws.tabCount,
        groupCount: (ws.groups || []).length,
        createdAt: ws.createdAt,
        entries: (ws.entries || []).map(e => ({
            title: e.title,
            url: e.url,
            favIconUrl: e.favIconUrl || null,
            parentIndex: e.parentIndex ?? null,
            groupId: e.groupId ?? -1,
            mark: e.mark || null,
            note: e.note || null,
            ghostIdentityId: e.ghostIdentityId || null,
        })),
        groups: (ws.groups || []),
    };
}

async function deleteWorkspace(workspaceId) {
    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    const filtered = workspaces.filter(w => w.id !== workspaceId);
    await chrome.storage.local.set({ workspaces: filtered });
    return { success: true };
}

async function updateWorkspace(workspaceId, updates) {
    const { workspaces = [] } = await chrome.storage.local.get('workspaces');
    const idx = workspaces.findIndex(w => w.id === workspaceId);
    if (idx === -1) return { success: false, error: 'Not found' };

    const ws = workspaces[idx];
    if (updates.name !== undefined) ws.name = updates.name;
    if (updates.entries !== undefined) {
        ws.entries = updates.entries;
        ws.tabCount = updates.entries.length;
    }
    if (updates.groups !== undefined) ws.groups = updates.groups;

    workspaces[idx] = ws;
    await chrome.storage.local.set({ workspaces });
    return { success: true };
}

async function openWorkspace(workspaceId, inNewWindow = false) {
    let windowId;
    if (inNewWindow) {
        const newWindow = await chrome.windows.create({});
        windowId = newWindow.id;
        // Close the default blank tab in the new window
        const tabs = await chrome.tabs.query({ windowId });
        if (tabs.length === 1 && tabs[0].url === 'chrome://newtab/') {
            await chrome.tabs.remove(tabs[0].id).catch(() => {});
        }
    } else {
        const focusedWindow = await chrome.windows.getLastFocused();
        windowId = focusedWindow.id;
    }
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
            let tab;
            if (entry.ghostIdentityId && chrome.ghostPublicAPI?.openTab) {
                tab = await new Promise((resolve, reject) => {
                    chrome.ghostPublicAPI.openTab(
                        { url: entry.url, identity: entry.ghostIdentityId, active: false },
                        (t) => {
                            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                            else resolve(t);
                        }
                    );
                });
            } else {
                tab = await chrome.tabs.create({ url: entry.url, active: false, windowId });
            }
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

    // Step 4: Collect marks and notes for newly created tabs
    const restoredMarks = {};
    const restoredNotes = {};
    for (let i = 0; i < entries.length; i++) {
        if (entries[i].mark && createdTabs[i]) {
            restoredMarks[createdTabs[i].id] = entries[i].mark;
        }
        if (entries[i].note && createdTabs[i]) {
            restoredNotes[createdTabs[i].id] = entries[i].note;
        }
    }

    return { success: true, tabCount: createdTabs.filter(Boolean).length, marks: restoredMarks, notes: restoredNotes };
}

// ============================================================
// Message handler for UI ↔ Service Worker
// ============================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'saveWorkspace') {
        const marks = msg.marks || {};
        const notes = msg.notes || {};
        const name = msg.name || '';
        saveWorkspace(name, marks, notes).then((result) => {
            sendResponse(result);
        }).catch((e) => {
            sendResponse({ success: false, error: e.message });
        });
        return true;
    }
    if (msg.action === 'listWorkspaces') {
        listWorkspaces().then((list) => {
            sendResponse({ workspaces: list });
        }).catch(() => {
            sendResponse({ workspaces: [] });
        });
        return true;
    }
    if (msg.action === 'getWorkspacePreview') {
        getWorkspacePreview(msg.id).then((preview) => {
            sendResponse(preview);
        }).catch(() => {
            sendResponse({ exists: false });
        });
        return true;
    }
    if (msg.action === 'openWorkspace') {
        openWorkspace(msg.id, msg.inNewWindow).then((result) => {
            sendResponse(result);
        }).catch((e) => {
            sendResponse({ success: false, error: e.message });
        });
        return true;
    }
    if (msg.action === 'deleteWorkspace') {
        deleteWorkspace(msg.id).then((result) => {
            sendResponse(result);
        }).catch((e) => {
            sendResponse({ success: false, error: e.message });
        });
        return true;
    }
    if (msg.action === 'updateWorkspace') {
        updateWorkspace(msg.id, msg.updates || {}).then((result) => {
            sendResponse(result);
        }).catch((e) => {
            sendResponse({ success: false, error: e.message });
        });
        return true;
    }
    if (msg.action === 'openSidePanel') {
        (async () => {
            try {
                const windowId = sender.tab?.windowId
                    || (await chrome.windows.getLastFocused()).id;
                await chrome.sidePanel.open({ windowId });
                sendResponse({ success: true });
            } catch {
                sendResponse({ success: false });
            }
        })();
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
    if (details.reason === 'update') {
        const prev = details.previousVersion || '';
        // Show upgrade guide for users upgrading from 1.x (popup-only era)
        if (prev.startsWith('1.')) {
            chrome.storage.local.set({ showUpgradeGuide: true });
        }
    }
});

// Click icon → open sidebar
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Alt+S → open sidebar via _execute_side_panel (handled natively by Chrome)

// Alt+Q → inject overlay popup into the active tab
async function openOverlayPopup() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || /^(chrome|edge|chrome-extension|edge-extension|about):/.test(tab.url)) {
        // Cannot inject into restricted pages, silently ignore
        return;
    }
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_overlay.js'],
        });
    } catch {
        // Silently ignore injection failures (e.g. browser internal pages)
    }
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'open-popup') {
        openOverlayPopup();
    }
});

// ============================================================
// Persistent tab hierarchy (survives browser restarts)
// ============================================================

// Converts the live tabId-based map to URL+index pairs and saves to local storage.
// Called whenever tabParentMap changes in session storage.
// Writes the current tab hierarchy to local storage as URL+index pairs.
// This is called from onCreated to capture naturally-opened child tabs
// (cmd+click etc.).  It NEVER deletes the backup — deletion is handled
// exclusively by Initializer._saveHierarchy when the user explicitly
// removes all hierarchy relationships.  Keeping writes additive-only
// ensures the backup survives browser shutdown (where onRemoved fires
// for every tab and would otherwise progressively empty the session and
// trigger a spurious delete).
async function saveHierarchy() {
    try {
        const { tabParentMap = {} } = await chrome.storage.session.get('tabParentMap');
        if (!Object.keys(tabParentMap).length) return;

        const tabs = await chrome.tabs.query({});
        const tabById = {};
        for (const tab of tabs) tabById[tab.id] = tab;

        const entries = [];
        for (const [tabIdStr, parentTabId] of Object.entries(tabParentMap)) {
            const tab = tabById[Number(tabIdStr)];
            const parentTab = tabById[parentTabId];
            if (!tab || !parentTab) continue;
            // Skip system pages (chrome://, edge://, about:) and tabs whose URL
            // hasn't loaded yet (empty string).
            // Only skip entries where the child has no matchable URL.
            // Parent may be a system page (chrome://extensions/, ghost://extensions)
            // — if it is open on restore the relationship will be recovered.
            if (isSystemUrl(tab.url)) continue;
            entries.push({
                url: normalizeUrl(tab.url),
                index: tab.index,
                parentUrl: normalizeUrl(parentTab.url),
                parentIndex: parentTab.index,
                ghostIdentityId: tab.ghostPublicAPI?.identity_id ?? null,
                parentGhostIdentityId: parentTab.ghostPublicAPI?.identity_id ?? null,
            });
        }

        if (entries.length > 0) {
            await chrome.storage.local.set({ tabHierarchy: entries });
        }
    } catch (e) {
        console.error('[Hierarchy] save failed:', e);
    }
}

// On browser startup, tab IDs are reassigned. Match saved URL+index pairs to
// the newly restored tabs and rebuild tabParentMap in session storage.
async function restoreHierarchy() {
    try {
        const { tabHierarchy: entries } = await chrome.storage.local.get('tabHierarchy');
        if (!Array.isArray(entries) || !entries.length) return;

        const tabs = await chrome.tabs.query({});
        const realTabs = tabs.filter(t => !isSystemUrl(t.url));

        // Child lookup: only non-system tabs.
        // Parent lookup: all tabs with a URL (system pages like chrome://extensions/
        // or ghost://extensions can be valid parents if they are currently open).
        const tabsByUrl = {};
        const parentByUrl = {};
        for (const tab of realTabs) {
            const key = normalizeUrl(tab.url);
            if (!tabsByUrl[key]) tabsByUrl[key] = [];
            tabsByUrl[key].push(tab);
        }
        for (const tab of tabs) {
            if (!tab.url) continue;
            const key = normalizeUrl(tab.url);
            if (!parentByUrl[key]) parentByUrl[key] = [];
            parentByUrl[key].push(tab);
        }

        // Pick the candidate whose index is closest to the saved index
        const bestMatch = (candidates, savedIndex) =>
            candidates.reduce((best, tab) =>
                Math.abs(tab.index - savedIndex) < Math.abs(best.index - savedIndex) ? tab : best
            );

        const tabParentMap = {};
        for (const entry of entries) {
            const childCandidates = tabsByUrl[normalizeUrl(entry.url)];
            const parentCandidates = parentByUrl[normalizeUrl(entry.parentUrl)];
            if (!childCandidates?.length || !parentCandidates?.length) continue;

            const childTab = bestMatch(childCandidates, entry.index);
            const parentTab = bestMatch(parentCandidates, entry.parentIndex);
            if (childTab.id !== parentTab.id) {
                tabParentMap[childTab.id] = parentTab.id;
            }
        }

        if (Object.keys(tabParentMap).length > 0) {
            await chrome.storage.session.set({ tabParentMap });
        }
    } catch (e) {
        console.error('[Hierarchy] restore failed:', e);
    }
}

// Restore on every browser launch (belt-and-suspenders alongside Initializer restore)
chrome.runtime.onStartup.addListener(() => {
    restoreHierarchy();
});

// ============================================================
// Tab parent tracking
// ============================================================

chrome.tabs.onCreated.addListener((tab) => {
    if (tab.openerTabId === undefined) return;
    // Look up the opener to make sure it's a real page, not a system page.
    // Tabs opened from chrome://, edge://, about: or with no URL yet should not
    // be recorded as children — those relationships are noise, not hierarchy.
    chrome.tabs.get(tab.openerTabId, (openerTab) => {
        if (chrome.runtime.lastError) return;
        if (isSystemUrl(openerTab.url)) return;
        chrome.storage.session.get(['tabParentMap'], (ret) => {
            let tabParentMap = ret.tabParentMap || {};
            tabParentMap[tab.id] = tab.openerTabId;
            chrome.storage.session.set({ tabParentMap }, () => saveHierarchy());
        });
    });
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
    // Only update session — do NOT call saveHierarchy() here.
    // During browser shutdown onRemoved fires for every tab, progressively
    // emptying the session map.  Calling saveHierarchy() after each removal
    // would eventually write an empty map and delete the local backup right
    // before the browser exits.  Initializer._saveHierarchy (triggered by
    // getTree() on tab-change events) keeps the local backup accurate during
    // normal use without this risk.
    chrome.storage.session.get(['tabParentMap'], (ret) => {
        let tabParentMap = ret.tabParentMap || {};
        delete tabParentMap[tabId];
        chrome.storage.session.set({ tabParentMap });
    });
});