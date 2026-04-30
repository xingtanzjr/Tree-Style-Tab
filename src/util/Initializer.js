import TabTreeNode from './TabTreeNode';
import TabTreeGenerator from './TabTreeGenerator';
import BookmarksTreeGenerator from './BookmarksTreeGenerator';
import { getGhostIdentities, GHOST_DEFAULT_IDENTITY } from './ghostCompat';

/**
 * Initializer - Chrome API wrapper for tabs, storage, and bookmarks
 */
class Initializer {
    constructor(chrome) {
        this.chrome = chrome;
    }

    /**
     * Get list of tabs in current window
     */
    getTabList() {
        return new Promise((resolve) => {
            this.chrome.tabs.query(
                { windowId: this.chrome.windows.WINDOW_ID_CURRENT },
                (tabs) => resolve(tabs)
            );
        });
    }

    /**
     * Get the currently active tab
     */
    async getActiveTab() {
        const tabs = await this.getTabList();
        const activeTab = tabs.find((tab) => tab.active);
        return activeTab ?? { id: -1 };
    }

    _isSystemUrl(url) {
        return !url || /^(chrome|edge|about):/.test(url);
    }

    // Normalise a URL for consistent hierarchy matching across sessions.
    // Strips fragments (client-side state that changes between sessions) and,
    // for non-http(s) URLs (internal browser pages like ghost://extensions),
    // strips trailing slashes so "ghost://extensions" === "ghost://extensions/".
    _normalizeUrl(url) {
        if (!url) return url;
        const noFrag = url.includes('#') ? url.slice(0, url.indexOf('#')) : url;
        return /^https?:/.test(noFrag) ? noFrag : noFrag.replace(/\/$/, '');
    }

    // Converts the live tabId map to URL+index pairs and writes to local storage.
    // Accepts pre-fetched tabs to avoid a redundant query when called from getTree().
    async _saveHierarchy(tabParentMap, tabs = null) {
        try {
            if (!tabs) tabs = await this.getTabList();
            const tabById = {};
            for (const tab of tabs) tabById[tab.id] = tab;

            const entries = [];
            for (const [tabIdStr, parentTabId] of Object.entries(tabParentMap)) {
                const tab = tabById[Number(tabIdStr)];
                const parentTab = tabById[parentTabId];
                if (!tab || !parentTab) continue;
                // Only skip entries where the CHILD has no matchable URL (system pages,
                // empty URLs).  Parent may be any URL including system pages such as
                // chrome://extensions/ or ghost://extensions — if that tab is open on
                // restore, the relationship will be recovered.
                if (this._isSystemUrl(tab.url)) continue;
                entries.push({
                    url: this._normalizeUrl(tab.url),
                    index: tab.index,
                    parentUrl: this._normalizeUrl(parentTab.url),
                    parentIndex: parentTab.index,
                    ghostIdentityId: tab.ghostPublicAPI?.identity_id ?? null,
                    parentGhostIdentityId: parentTab.ghostPublicAPI?.identity_id ?? null,
                });
            }

            await new Promise((resolve) => {
                if (entries.length > 0) {
                    this.chrome.storage.local.set({ tabHierarchy: entries }, resolve);
                } else {
                    this.chrome.storage.local.remove('tabHierarchy', resolve);
                }
            });
        } catch {}
    }

    // Restores hierarchy from local URL+index pairs into session tabParentMap.
    // Accepts pre-fetched tabs to avoid a redundant query when called from getTree().
    async _restoreHierarchy(tabs = null) {
        try {
            const ret = await new Promise((resolve) => {
                this.chrome.storage.local.get(['tabHierarchy'], resolve);
            });
            const rawEntries = ret.tabHierarchy;
            if (!Array.isArray(rawEntries) || !rawEntries.length) return {};
            // Discard any legacy entries written before the child-URL filter was in
            // place — they have empty or system child URLs and can never match a tab.
            const entries = rawEntries.filter(e => !this._isSystemUrl(e.url));
            if (!entries.length) return {};

            if (!tabs) tabs = await this.getTabList();
            const realTabs = tabs.filter(t => !this._isSystemUrl(t.url));

            // Child candidates: only real (non-system) tabs — system-URL tabs can't be
            // reliably matched as children since their URLs may not persist across restarts.
            // Parent candidates: all tabs including system pages (chrome://extensions/,
            // ghost://extensions, etc.) — if the parent tab is currently open it can be
            // matched and the relationship restored.
            const parentTabs = tabs.filter(t => !!t.url); // only skip truly empty URLs

            const tabsByUrl = {};           // child lookup
            const tabsByUrlAndIdentity = {}; // child lookup with identity
            const parentByUrl = {};          // parent lookup (includes system pages)
            const parentByUrlAndIdentity = {};

            for (const tab of realTabs) {
                const normUrl = this._normalizeUrl(tab.url);
                if (!tabsByUrl[normUrl]) tabsByUrl[normUrl] = [];
                tabsByUrl[normUrl].push(tab);
                const identityKey = `${normUrl}::${tab.ghostPublicAPI?.identity_id ?? '__default__'}`;
                if (!tabsByUrlAndIdentity[identityKey]) tabsByUrlAndIdentity[identityKey] = [];
                tabsByUrlAndIdentity[identityKey].push(tab);
            }

            for (const tab of parentTabs) {
                const normUrl = this._normalizeUrl(tab.url);
                if (!parentByUrl[normUrl]) parentByUrl[normUrl] = [];
                parentByUrl[normUrl].push(tab);
                const identityKey = `${normUrl}::${tab.ghostPublicAPI?.identity_id ?? '__default__'}`;
                if (!parentByUrlAndIdentity[identityKey]) parentByUrlAndIdentity[identityKey] = [];
                parentByUrlAndIdentity[identityKey].push(tab);
            }

            const bestMatch = (candidates, savedIndex) =>
                candidates.reduce((best, tab) =>
                    Math.abs(tab.index - savedIndex) < Math.abs(best.index - savedIndex) ? tab : best
                );

            const tabParentMap = {};
            for (const entry of entries) {
                // Prefer identity-scoped lookup when the entry has ghost identity info
                // (prevents a Default-identity tab from being matched to a non-Default tab
                // that happens to share the same URL).
                const entryHasIdentity = 'ghostIdentityId' in entry;
                const eUrl = this._normalizeUrl(entry.url);
                const ePUrl = this._normalizeUrl(entry.parentUrl);
                const childCandidates = entryHasIdentity
                    ? (tabsByUrlAndIdentity[`${eUrl}::${entry.ghostIdentityId ?? '__default__'}`] ?? tabsByUrl[eUrl])
                    : tabsByUrl[eUrl];
                const parentCandidates = entryHasIdentity
                    ? (parentByUrlAndIdentity[`${ePUrl}::${entry.parentGhostIdentityId ?? '__default__'}`] ?? parentByUrl[ePUrl])
                    : parentByUrl[ePUrl];
                if (!childCandidates?.length || !parentCandidates?.length) continue;
                const childTab = bestMatch(childCandidates, entry.index);
                const parentTab = bestMatch(parentCandidates, entry.parentIndex);
                if (childTab.id !== parentTab.id) {
                    tabParentMap[childTab.id] = parentTab.id;
                }
            }

            if (Object.keys(tabParentMap).length > 0) {
                await new Promise((resolve) => {
                    this.chrome.storage.session.set({ tabParentMap }, resolve);
                });
            }
            return tabParentMap;
        } catch {
            return {};
        }
    }

    // On first load after a browser restart the session flag 'hierarchyRestored' is absent.
    // Ghost Browser fires onCreated with openerTabId during its restore pass, which puts
    // wrong entries in session with new tab IDs that pass validation.  The flag lets us
    // detect a fresh session and override session with our authoritative local backup
    // before any of those entries can fool the validator.
    //
    // Additional wrinkle: Ghost Browser preserves chrome.storage.session across browser
    // restarts (unlike plain Chrome, which clears it).  That means 'hierarchyRestored'
    // can be true even though the browser restarted and tab IDs were all reassigned.
    // We detect this by checking whether ANY session entry references a current tab ID.
    // If the session has entries but NONE match current tabs it's a stale-session restart.
    async _getValidatedMap(rawMap, tabs) {
        const tabIdSet = new Set(tabs.map(t => t.id));
        const rawEntries = Object.entries(rawMap);

        const flagRet = await new Promise(resolve =>
            this.chrome.storage.session.get(['hierarchyRestored'], resolve)
        );
        const alreadyRestored = flagRet.hierarchyRestored === true;

        // Stale-session: had entries but none reference a tab that currently exists.
        const sessionIsStale = rawEntries.length > 0 &&
            !rawEntries.some(([k, v]) => tabIdSet.has(Number(k)) && tabIdSet.has(v));

        if (!alreadyRestored || sessionIsStale) {
            // Mark immediately so concurrent/re-entrant calls don't also restore.
            this.chrome.storage.session.set({ hierarchyRestored: true });
            // Pull local backup; if found it wins over whatever openerTabId put in session.
            const restored = await this._restoreHierarchy(tabs);
            if (Object.keys(restored).length > 0) {
                return restored;
            }
            // No local backup — fall through and use whatever session has.
        }

        // Normal path: strip entries whose tab IDs no longer exist.
        const validMap = {};
        for (const [k, v] of rawEntries) {
            if (tabIdSet.has(Number(k)) && tabIdSet.has(v)) {
                validMap[Number(k)] = v;
            }
        }
        if (Object.keys(validMap).length !== rawEntries.length) {
            this.chrome.storage.session.set({ tabParentMap: validMap });
        }
        return validMap;
    }

    /**
     * Get tab parent relationships from storage (raw session read).
     */
    getTabParentMap() {
        return new Promise((resolve) => {
            this.chrome.storage.session.get(['tabParentMap'], (ret) => {
                resolve(ret.tabParentMap || {});
            });
        });
    }

    /**
     * Filter tabs by keyword
     */
    filterNodes(keyword, tabs) {
        try {
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'i');
            return tabs.filter((tab) => regex.test(tab.title) || regex.test(tab.url));
        } catch {
            return tabs;
        }
    }

    /**
     * Check if filtering is needed
     */
    needFilterByKeyword(keyword) {
        return keyword && keyword.length > 0;
    }

    /**
     * Get the tab tree
     * @param {string} [keyword] - Search keyword filter
     * @param {string|null} [ghostIdentityFilter] - When set, only include tabs
     *   whose ghostPublicAPI.identity_id matches this value (Ghost Browser only).
     */
    getCustomIdentityNames() {
        return new Promise((resolve) => {
            this.chrome.storage.local.get(['ghostIdentityNames'], (ret) => {
                resolve(ret.ghostIdentityNames || {});
            });
        });
    }

    async setCustomIdentityName(identityId, name) {
        const names = await this.getCustomIdentityNames();
        if (name && name.trim()) {
            names[identityId] = name.trim();
        } else {
            delete names[identityId];
        }
        return new Promise((resolve, reject) => {
            this.chrome.storage.local.set({ ghostIdentityNames: names }, () => {
                if (this.chrome.runtime.lastError) {
                    reject(this.chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    getCustomIdentityColors() {
        return new Promise((resolve) => {
            this.chrome.storage.local.get(['ghostIdentityColors'], (ret) => {
                resolve(ret.ghostIdentityColors || {});
            });
        });
    }

    async setCustomIdentityColor(identityId, color) {
        const colors = await this.getCustomIdentityColors();
        if (color) {
            colors[identityId] = color;
        } else {
            delete colors[identityId];
        }
        return new Promise((resolve, reject) => {
            this.chrome.storage.local.set({ ghostIdentityColors: colors }, () => {
                if (this.chrome.runtime.lastError) {
                    reject(this.chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }

    async getTree(keyword = undefined, ghostIdentityFilter = null) {
        const [rawTabParentMap, tabs, tabGroups, apiIdentityMap, customNames, customColors] = await Promise.all([
            this.getTabParentMap(),
            this.getTabList(),
            this.getTabGroups(),
            getGhostIdentities(this.chrome),
            this.getCustomIdentityNames(),
            this.getCustomIdentityColors(),
        ]);

        // Validate session map with current tab IDs; restore from local if empty/stale.
        const tabParentMap = await this._getValidatedMap(rawTabParentMap, tabs);

        // Always persist so hierarchy survives the next restart.
        if (Object.keys(tabParentMap).length > 0) {
            this._saveHierarchy(tabParentMap, tabs);
        }

        // Merge API identity info with custom names and colors — custom values win
        const identityInfoMap = { ...apiIdentityMap };
        for (const [id, customName] of Object.entries(customNames)) {
            identityInfoMap[id] = { ...(identityInfoMap[id] || { id, isTemporary: false }), name: customName };
        }
        for (const [id, customColor] of Object.entries(customColors)) {
            identityInfoMap[id] = { ...(identityInfoMap[id] || { id, isTemporary: false }), color: customColor };
        }

        // Ensure the default identity always has a display name.
        // Custom name (if set) was already merged above; fall back to "Default".
        if (!identityInfoMap[GHOST_DEFAULT_IDENTITY]) {
            identityInfoMap[GHOST_DEFAULT_IDENTITY] = { id: GHOST_DEFAULT_IDENTITY, name: 'Default', isTemporary: false };
        }

        let filteredTabs = tabs;

        if (this.needFilterByKeyword(keyword)) {
            filteredTabs = this.filterNodes(keyword, filteredTabs);
        }

        if (ghostIdentityFilter) {
            filteredTabs = filteredTabs.filter(
                (tab) => (tab.ghostPublicAPI?.identity_id ?? null) === ghostIdentityFilter
            );
        }

        const treeGen = new TabTreeGenerator(filteredTabs, tabParentMap, tabGroups, identityInfoMap);
        return treeGen.getTree();
    }

    /**
     * Get tab groups in current window
     */
    getTabGroups() {
        return new Promise((resolve) => {
            if (!this.chrome.tabGroups?.query) {
                resolve([]);
                return;
            }
            this.chrome.tabGroups.query(
                { windowId: this.chrome.windows.WINDOW_ID_CURRENT },
                (groups) => resolve(groups || [])
            );
        });
    }

    /**
     * Get bookmarks tree
     */
    async getBookmarks(keyword = undefined) {
        if (!keyword || keyword.length === 0) {
            return new TabTreeNode();
        }

        const rawBookmarkTree = await this.getBookmarksTree();
        const treeGen = new BookmarksTreeGenerator(rawBookmarkTree);
        return treeGen.getFlattenTree(keyword);
    }

    /**
     * Get raw bookmarks tree from Chrome API
     */
    getBookmarksTree() {
        return new Promise((resolve) => {
            this.chrome.bookmarks.getTree((results) => {
                resolve(results);
            });
        });
    }

    /**
     * Update the parent of a tab in the tabParentMap
     * @param {number} tabId - The ID of the tab to update
     * @param {number} newParentId - The ID of the new parent tab
     * @returns {Promise<void>}
     */
    async updateTabParent(tabId, newParentId) {
        return new Promise((resolve, reject) => {
            this.chrome.storage.session.get(['tabParentMap'], (ret) => {
                const tabParentMap = ret.tabParentMap || {};

                if (newParentId === null || newParentId === undefined) {
                    delete tabParentMap[tabId];
                } else {
                    tabParentMap[tabId] = newParentId;
                }

                this.chrome.storage.session.set({ tabParentMap }, () => {
                    if (this.chrome.runtime.lastError) {
                        reject(this.chrome.runtime.lastError);
                    } else {
                        this._saveHierarchy(tabParentMap);
                        resolve();
                    }
                });
            });
        });
    }

    /**
     * Remove a tab from being a child of any parent
     * @param {number} tabId - The ID of the tab to detach
     * @returns {Promise<void>}
     */
    async detachTab(tabId) {
        return this.updateTabParent(tabId, null);
    }

    /**
     * Move a tab to a new position in the browser
     * @param {number} tabId - The ID of the tab to move
     * @param {number} index - The new index position
     * @returns {Promise<void>}
     */
    async moveTab(tabId, index) {
        return new Promise((resolve, reject) => {
            this.chrome.tabs.move(tabId, { index }, (tab) => {
                if (this.chrome.runtime.lastError) {
                    reject(this.chrome.runtime.lastError);
                } else {
                    resolve(tab);
                }
            });
        });
    }
}

export default Initializer;
