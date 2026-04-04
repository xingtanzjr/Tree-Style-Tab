/**
 * Mock Chrome API for development and testing.
 *
 * Fully simulates:
 *  - tabs (query, create, remove, update, move, group, ungroup)
 *  - tab events (onCreated, onRemoved, onUpdated, onActivated, onMoved)
 *  - tabGroups (query, update) + events
 *  - storage.session (tabParentMap) + storage.local (workspaces)
 *  - storage.onChanged events
 *  - runtime.sendMessage (all workspace actions: save/list/preview/open/delete/update)
 *  - i18n.getMessage
 */

const MAX_FREE_WORKSPACES = 3;

/** Simple event emitter matching Chrome's addListener/removeListener API */
function createEvent() {
    let listeners = [];
    return {
        addListener: (cb) => { listeners.push(cb); },
        removeListener: (cb) => { listeners = listeners.filter(l => l !== cb); },
        _fire: (...args) => { listeners.forEach(cb => cb(...args)); },
    };
}

class MockChrome {
    constructor() {
        // ---- Internal state ----
        this._nextTabId = 100;
        this._nextGroupId = 100;
        this._sessionStorage = {};  // { tabParentMap: {...} }
        this._localStorage = {};    // { workspaces: [...] }
        this._tabs = [];            // Array of tab objects
        this._groups = [];          // Array of group objects { id, title, color, collapsed, windowId }
        this._i18nMessages = {};

        // ---- Build mock tabs and groups ----
        this._initMockData();

        // ---- Events (stored as instance props so helper methods can fire them) ----
        const tabOnUpdated = this._tabOnUpdated = createEvent();
        const tabOnRemoved = this._tabOnRemoved = createEvent();
        const tabOnCreated = this._tabOnCreated = createEvent();
        const tabOnActivated = this._tabOnActivated = createEvent();
        const tabOnMoved = this._tabOnMoved = createEvent();
        const tabOnAttached = createEvent();
        const tabOnDetached = createEvent();
        const storageOnChanged = this._storageOnChanged = createEvent();
        const groupOnCreated = this._groupOnCreated = createEvent();
        const groupOnUpdated = this._groupOnUpdated = createEvent();
        const groupOnRemoved = createEvent();

        // ---- windows ----
        this.windows = {
            WINDOW_ID_CURRENT: -2,
            getLastFocused: async () => ({ id: 1 }),
        };

        // ---- tabs API ----
        this.tabs = {
            onUpdated: tabOnUpdated,
            onRemoved: tabOnRemoved,
            onCreated: tabOnCreated,
            onActivated: tabOnActivated,
            onMoved: tabOnMoved,
            onAttached: tabOnAttached,
            onDetached: tabOnDetached,

            query: (queryInfo, callback) => {
                let result = [...this._tabs];
                if (queryInfo?.active === true) {
                    result = result.filter(t => t.active);
                }
                // Sort by index
                result.sort((a, b) => a.index - b.index);
                if (callback) callback(result);
                return Promise.resolve(result);
            },

            create: (createInfo) => {
                const id = this._nextTabId++;
                const maxIndex = this._tabs.length > 0
                    ? Math.max(...this._tabs.map(t => t.index)) + 1 : 0;
                const tab = {
                    id,
                    index: maxIndex,
                    title: createInfo?.url || 'New Tab',
                    url: createInfo?.url || 'chrome://newtab/',
                    favIconUrl: null,
                    active: createInfo?.active ?? false,
                    status: 'loading',
                    groupId: -1,
                    windowId: 1,
                    openerTabId: undefined,
                };
                this._tabs.push(tab);
                tabOnCreated._fire(tab);
                // Simulate loading complete
                setTimeout(() => {
                    tab.status = 'complete';
                    if (createInfo?.url) {
                        try {
                            const hostname = new URL(createInfo.url).hostname;
                            tab.favIconUrl = `https://www.google.com/s2/favicons?domain=${hostname}`;
                        } catch { /* ignore */ }
                    }
                    tabOnUpdated._fire(tab.id, { status: 'complete', title: tab.title }, tab);
                }, 300);
                return Promise.resolve(tab);
            },

            remove: (tabIdOrIds) => {
                const ids = Array.isArray(tabIdOrIds) ? tabIdOrIds : [tabIdOrIds];
                for (const tabId of ids) {
                    const idx = this._tabs.findIndex(t => t.id === tabId);
                    if (idx !== -1) {
                        this._tabs.splice(idx, 1);
                        // Re-index
                        this._tabs.sort((a, b) => a.index - b.index)
                            .forEach((t, i) => { t.index = i; });
                        tabOnRemoved._fire(tabId, { windowId: 1, isWindowClosing: false });
                    }
                }
                return Promise.resolve();
            },

            update: (tabId, updateInfo) => {
                const tab = this._tabs.find(t => t.id === tabId);
                if (tab) {
                    Object.assign(tab, updateInfo);
                    if (updateInfo.active) {
                        // Deactivate others
                        this._tabs.forEach(t => { if (t.id !== tabId) t.active = false; });
                        tabOnActivated._fire({ tabId, windowId: 1 });
                    }
                    tabOnUpdated._fire(tabId, updateInfo, tab);
                }
                return Promise.resolve(tab);
            },

            move: (tabId, moveInfo, callback) => {
                const tab = this._tabs.find(t => t.id === tabId);
                if (tab) {
                    const oldIndex = tab.index;
                    const targetIndex = Math.min(moveInfo.index, this._tabs.length - 1);
                    if (oldIndex !== targetIndex) {
                        if (oldIndex < targetIndex) {
                            this._tabs.forEach(t => {
                                if (t.index > oldIndex && t.index <= targetIndex) t.index--;
                            });
                        } else {
                            this._tabs.forEach(t => {
                                if (t.index >= targetIndex && t.index < oldIndex) t.index++;
                            });
                        }
                        tab.index = targetIndex;
                        tabOnMoved._fire(tabId, { windowId: 1, fromIndex: oldIndex, toIndex: targetIndex });
                    }
                }
                if (callback) callback(tab);
                return Promise.resolve(tab);
            },

            group: async (options) => {
                const tabIds = Array.isArray(options.tabIds) ? options.tabIds : [options.tabIds];
                let groupId = options.groupId;
                if (!groupId && options.createProperties) {
                    groupId = this._nextGroupId++;
                    const newGroup = {
                        id: groupId,
                        title: '',
                        color: 'grey',
                        collapsed: false,
                        windowId: options.createProperties.windowId || 1,
                    };
                    this._groups.push(newGroup);
                    groupOnCreated._fire(newGroup);
                }
                if (groupId) {
                    for (const tabId of tabIds) {
                        const tab = this._tabs.find(t => t.id === tabId);
                        if (tab) tab.groupId = groupId;
                    }
                }
                return groupId;
            },

            ungroup: async (tabIdOrIds) => {
                const ids = Array.isArray(tabIdOrIds) ? tabIdOrIds : [tabIdOrIds];
                for (const tabId of ids) {
                    const tab = this._tabs.find(t => t.id === tabId);
                    if (tab) tab.groupId = -1;
                }
            },
        };

        // ---- tabGroups API ----
        this.tabGroups = {
            onCreated: groupOnCreated,
            onUpdated: groupOnUpdated,
            onRemoved: groupOnRemoved,

            query: (queryInfo, callback) => {
                const result = [...this._groups];
                if (callback) callback(result);
                return Promise.resolve(result);
            },

            update: async (groupId, updateProperties) => {
                const group = this._groups.find(g => g.id === groupId);
                if (group) {
                    Object.assign(group, updateProperties);
                    groupOnUpdated._fire(group);
                }
                return group;
            },
        };

        // ---- storage API ----
        this.storage = {
            session: {
                get: (keys) => {
                    if (typeof keys === 'string') keys = [keys];
                    if (Array.isArray(keys)) {
                        const result = {};
                        for (const k of keys) {
                            if (this._sessionStorage[k] !== undefined) {
                                result[k] = JSON.parse(JSON.stringify(this._sessionStorage[k]));
                            }
                        }
                        return Promise.resolve(result);
                    }
                    return Promise.resolve({ ...this._sessionStorage });
                },
                set: (items, callback) => {
                    const changes = {};
                    for (const [k, v] of Object.entries(items)) {
                        const oldValue = this._sessionStorage[k];
                        this._sessionStorage[k] = JSON.parse(JSON.stringify(v));
                        changes[k] = { oldValue, newValue: this._sessionStorage[k] };
                    }
                    storageOnChanged._fire(changes, 'session');
                    if (callback) callback();
                    return Promise.resolve();
                },
            },
            local: {
                get: (keys) => {
                    if (typeof keys === 'string') keys = [keys];
                    if (Array.isArray(keys)) {
                        const result = {};
                        for (const k of keys) {
                            if (this._localStorage[k] !== undefined) {
                                result[k] = JSON.parse(JSON.stringify(this._localStorage[k]));
                            }
                        }
                        return Promise.resolve(result);
                    }
                    return Promise.resolve({ ...this._localStorage });
                },
                set: (items) => {
                    for (const [k, v] of Object.entries(items)) {
                        this._localStorage[k] = JSON.parse(JSON.stringify(v));
                    }
                    return Promise.resolve();
                },
            },
            onChanged: storageOnChanged,
        };

        // ---- i18n ----
        this.i18n = {
            getMessage: (key, substitutions) => {
                const entry = this._i18nMessages[key];
                if (!entry) return '';
                let msg = entry.message;
                if (substitutions) {
                    const arr = Array.isArray(substitutions) ? substitutions : [substitutions];
                    arr.forEach((s, i) => {
                        msg = msg.replace(new RegExp('\\$' + (i + 1), 'g'), String(s));
                    });
                }
                return msg;
            },
        };

        // ---- permissions API (mock — always reports tabGroups as granted) ----
        this.permissions = {
            contains: (perms, callback) => { callback?.(true); },
            request: (perms, callback) => { callback?.(true); },
        };

        // ---- runtime API (workspace message router) ----
        this.runtime = {
            lastError: null,
            sendMessage: (message, callback) => {
                this._handleMessage(message).then(resp => {
                    callback?.(resp);
                });
            },
        };

        // ---- bookmarks (minimal mock) ----
        this.bookmarks = {
            getTree: (callback) => {
                callback?.([{
                    id: '0', title: '', children: [{
                        id: '1', title: 'Bookmarks Bar', children: [
                            { id: '10', title: 'React Docs', url: 'https://react.dev' },
                            { id: '11', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
                            { id: '12', title: 'GitHub', url: 'https://github.com' },
                            { id: '13', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
                            { id: '14', title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/' },
                        ],
                    }],
                }]);
            },
        };

        // ---- sidePanel (stub) ----
        this.sidePanel = {
            open: async () => {},
            setPanelBehavior: async () => {},
        };

        // ---- commands (stub) ----
        this.commands = {
            onCommand: createEvent(),
        };
    }

    // ============================================================
    // Internal: realistic mock data
    // ============================================================

    _initMockData() {
        const G1 = 1;  // "React Research" group
        const G2 = 2;  // "Work Tasks" group
        const G3 = 3;  // "Shopping" group

        this._groups = [
            { id: G1, title: 'React Research', color: 'blue', collapsed: false, windowId: 1 },
            { id: G2, title: 'Work Tasks', color: 'green', collapsed: false, windowId: 1 },
            { id: G3, title: 'Shopping', color: 'orange', collapsed: false, windowId: 1 },
        ];

        // Realistic tab set with groups and parent relationships (~35 tabs)
        this._tabs = [
            // ── Group 1: React Research (blue) ──
            { id: 1, index: 0, title: 'Google Search: react hooks best practices', url: 'https://www.google.com/search?q=react+hooks+best+practices', favIconUrl: 'https://www.google.com/favicon.ico', active: false, status: 'complete', groupId: G1, windowId: 1 },
            { id: 2, index: 1, title: 'React Docs - Hooks Reference', url: 'https://react.dev/reference/react/hooks', favIconUrl: 'https://react.dev/favicon.ico', active: false, status: 'complete', groupId: G1, windowId: 1 },
            { id: 3, index: 2, title: 'useState – React', url: 'https://react.dev/reference/react/useState', favIconUrl: 'https://react.dev/favicon.ico', active: false, status: 'complete', groupId: G1, windowId: 1 },
            { id: 4, index: 3, title: 'useEffect – React', url: 'https://react.dev/reference/react/useEffect', favIconUrl: 'https://react.dev/favicon.ico', active: false, status: 'complete', groupId: G1, windowId: 1 },
            { id: 5, index: 4, title: 'useMemo vs useCallback - Stack Overflow', url: 'https://stackoverflow.com/questions/usememo-vs-usecallback', favIconUrl: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico', active: false, status: 'complete', groupId: G1, windowId: 1 },
            { id: 6, index: 5, title: 'React Context vs Redux - Dev.to', url: 'https://dev.to/react-context-vs-redux', favIconUrl: 'https://dev.to/favicon.ico', active: false, status: 'complete', groupId: G1, windowId: 1 },
            { id: 7, index: 6, title: 'React Server Components Explained', url: 'https://react.dev/blog/2024/react-server-components', favIconUrl: 'https://react.dev/favicon.ico', active: false, status: 'complete', groupId: G1, windowId: 1 },

            // ── Group 2: Work Tasks (green) ──
            { id: 8, index: 7, title: 'Jira - Sprint Board', url: 'https://company.atlassian.net/jira/board', favIconUrl: 'https://company.atlassian.net/favicon.ico', active: false, status: 'complete', groupId: G2, windowId: 1 },
            { id: 9, index: 8, title: 'PR #1234 - Add workspace feature', url: 'https://github.com/AcmeCorp/project/pull/1234', favIconUrl: 'https://github.com/favicon.ico', active: false, status: 'complete', groupId: G2, windowId: 1 },
            { id: 10, index: 9, title: 'CI Build #5678 - Passed', url: 'https://github.com/AcmeCorp/project/actions/runs/5678', favIconUrl: 'https://github.com/favicon.ico', active: false, status: 'complete', groupId: G2, windowId: 1 },
            { id: 11, index: 10, title: 'Confluence - Architecture Doc', url: 'https://company.atlassian.net/wiki/architecture', favIconUrl: 'https://company.atlassian.net/favicon.ico', active: false, status: 'complete', groupId: G2, windowId: 1 },
            { id: 12, index: 11, title: 'Slack - #frontend Channel', url: 'https://app.slack.com/client/T123/C456', favIconUrl: 'https://app.slack.com/favicon.ico', active: false, status: 'complete', groupId: G2, windowId: 1 },
            { id: 13, index: 12, title: 'Figma - Dashboard Redesign', url: 'https://www.figma.com/file/abc123/dashboard', favIconUrl: 'https://www.figma.com/favicon.ico', active: false, status: 'complete', groupId: G2, windowId: 1 },

            // ── Ungrouped: Communication & Tools ──
            { id: 14, index: 13, title: 'Gmail - Inbox', url: 'https://mail.google.com/mail/u/0/#inbox', favIconUrl: 'https://mail.google.com/favicon.ico', active: true, status: 'complete', groupId: -1, windowId: 1 },
            { id: 15, index: 14, title: 'Gmail - Project Update Thread', url: 'https://mail.google.com/mail/u/0/#inbox/18f1234abcd', favIconUrl: 'https://mail.google.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 16, index: 15, title: 'Google Calendar', url: 'https://calendar.google.com', favIconUrl: 'https://calendar.google.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 17, index: 16, title: 'Google Drive - Shared Documents', url: 'https://drive.google.com/drive/shared-with-me', favIconUrl: 'https://drive.google.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 18, index: 17, title: 'ChatGPT', url: 'https://chat.openai.com', favIconUrl: 'https://chat.openai.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 19, index: 18, title: 'Claude', url: 'https://claude.ai/chat', favIconUrl: 'https://claude.ai/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },

            // ── Ungrouped: Learning ──
            { id: 20, index: 19, title: 'YouTube - React Conf 2025 Keynote', url: 'https://www.youtube.com/watch?v=react-conf-2025', favIconUrl: 'https://www.youtube.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 21, index: 20, title: 'YouTube - CSS Grid Tutorial', url: 'https://www.youtube.com/watch?v=css-grid-101', favIconUrl: 'https://www.youtube.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 22, index: 21, title: 'MDN - JavaScript Reference', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', favIconUrl: 'https://developer.mozilla.org/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 23, index: 22, title: 'MDN - Array.prototype.reduce()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce', favIconUrl: 'https://developer.mozilla.org/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 24, index: 23, title: 'MDN - Promise.allSettled()', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled', favIconUrl: 'https://developer.mozilla.org/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 25, index: 24, title: 'TypeScript Handbook - Generics', url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html', favIconUrl: 'https://www.typescriptlang.org/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 26, index: 25, title: 'TypeScript Handbook - Utility Types', url: 'https://www.typescriptlang.org/docs/handbook/utility-types.html', favIconUrl: 'https://www.typescriptlang.org/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },

            // ── Group 3: Shopping (orange) ──
            { id: 27, index: 26, title: 'Amazon - Mechanical Keyboards', url: 'https://www.amazon.com/s?k=mechanical+keyboard', favIconUrl: 'https://www.amazon.com/favicon.ico', active: false, status: 'complete', groupId: G3, windowId: 1 },
            { id: 28, index: 27, title: 'Keychron K8 Pro - Amazon', url: 'https://www.amazon.com/dp/B09YGLK231', favIconUrl: 'https://www.amazon.com/favicon.ico', active: false, status: 'complete', groupId: G3, windowId: 1 },
            { id: 29, index: 28, title: 'HHKB Professional - Amazon', url: 'https://www.amazon.com/dp/B082TSZ27Q', favIconUrl: 'https://www.amazon.com/favicon.ico', active: false, status: 'complete', groupId: G3, windowId: 1 },
            { id: 30, index: 29, title: 'r/MechanicalKeyboards - Reddit', url: 'https://www.reddit.com/r/MechanicalKeyboards/', favIconUrl: 'https://www.reddit.com/favicon.ico', active: false, status: 'complete', groupId: G3, windowId: 1 },

            // ── Ungrouped: Misc ──
            { id: 31, index: 30, title: 'Twitter / X', url: 'https://x.com/home', favIconUrl: 'https://x.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 32, index: 31, title: 'Hacker News', url: 'https://news.ycombinator.com', favIconUrl: 'https://news.ycombinator.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 33, index: 32, title: 'Notion - Personal Notes', url: 'https://www.notion.so/personal-notes', favIconUrl: 'https://www.notion.so/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 34, index: 33, title: 'Spotify Web Player', url: 'https://open.spotify.com', favIconUrl: 'https://open.spotify.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
            { id: 35, index: 34, title: 'GitHub - Tree-Style-Tab', url: 'https://github.com/nicepkg/tree-style-tab', favIconUrl: 'https://github.com/favicon.ico', active: false, status: 'complete', groupId: -1, windowId: 1 },
        ];

        this._nextTabId = 100;
        this._nextGroupId = 100;

        // Parent relationships: builds tree structure
        //
        // [React Research] (blue)
        //  Google Search (1)
        //    ├── React Docs (2)
        //    │     ├── useState (3)
        //    │     └── useEffect (4)
        //    ├── useMemo vs useCallback (5)
        //    └── Context vs Redux (6)
        //  React Server Components (7) [standalone in group]
        //
        // [Work Tasks] (green)
        //  Jira (8)
        //    ├── PR #1234 (9)
        //    │     └── CI Build (10)
        //    └── Confluence (11)
        //  Slack (12) [standalone in group]
        //  Figma (13) [standalone in group]
        //
        // Gmail (14) [active]
        //    └── Gmail Thread (15)
        // Google Calendar (16) [standalone]
        // Google Drive (17) [standalone]
        // ChatGPT (18)
        //    └── Claude (19)
        // YouTube Keynote (20)
        //    └── YouTube CSS Grid (21)
        // MDN JS Reference (22)
        //    ├── MDN Array.reduce (23)
        //    └── MDN Promise.allSettled (24)
        // TS Generics (25)
        //    └── TS Utility Types (26)
        //
        // [Shopping] (orange)
        //  Amazon Keyboards (27)
        //    ├── Keychron K8 (28)
        //    ├── HHKB (29)
        //    └── Reddit MechKB (30)
        //
        // Twitter (31) [standalone]
        // Hacker News (32) [standalone]
        // Notion (33) [standalone]
        // Spotify (34) [standalone]
        // GitHub TST (35) [standalone]

        this._sessionStorage = {
            tabParentMap: {
                2: 1,       // React Docs → Google Search
                3: 2,       // useState → React Docs
                4: 2,       // useEffect → React Docs
                5: 1,       // useMemo vs useCallback → Google Search
                6: 1,       // Context vs Redux → Google Search
                9: 8,       // PR → Jira
                10: 9,      // CI Build → PR
                11: 8,      // Confluence → Jira
                15: 14,     // Gmail Thread → Gmail
                19: 18,     // Claude → ChatGPT
                21: 20,     // YouTube CSS → YouTube Keynote
                23: 22,     // MDN reduce → MDN JS
                24: 22,     // MDN Promise → MDN JS
                26: 25,     // TS Utility → TS Generics
                28: 27,     // Keychron → Amazon Keyboards
                29: 27,     // HHKB → Amazon Keyboards
                30: 27,     // Reddit → Amazon Keyboards
            },
        };

        // Pre-populate one saved workspace for testing
        this._localStorage = {
            workspaces: [
                {
                    id: 'ws_mock_1',
                    name: 'Morning Research Session',
                    createdAt: Date.now() - 86400000, // yesterday
                    tabCount: 10,
                    entries: [
                        { url: 'https://react.dev/reference/react/hooks', title: 'React Docs - Hooks Reference', favIconUrl: 'https://react.dev/favicon.ico', index: 0, groupId: 1, parentIndex: null, mark: null },
                        { url: 'https://react.dev/reference/react/useState', title: 'useState – React', favIconUrl: 'https://react.dev/favicon.ico', index: 1, groupId: 1, parentIndex: 0, mark: 'check' },
                        { url: 'https://react.dev/reference/react/useEffect', title: 'useEffect – React', favIconUrl: 'https://react.dev/favicon.ico', index: 2, groupId: 1, parentIndex: 0, mark: 'pin' },
                        { url: 'https://react.dev/blog/2024/react-server-components', title: 'React Server Components Explained', favIconUrl: 'https://react.dev/favicon.ico', index: 3, groupId: 1, parentIndex: null, mark: null },
                        { url: 'https://stackoverflow.com/questions/usememo-vs-usecallback', title: 'useMemo vs useCallback - Stack Overflow', favIconUrl: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico', index: 4, groupId: -1, parentIndex: null, mark: 'warning' },
                        { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', title: 'MDN - JavaScript Reference', favIconUrl: 'https://developer.mozilla.org/favicon.ico', index: 5, groupId: -1, parentIndex: null, mark: null },
                        { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce', title: 'MDN - Array.prototype.reduce()', favIconUrl: 'https://developer.mozilla.org/favicon.ico', index: 6, groupId: -1, parentIndex: 5, mark: 'question' },
                        { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled', title: 'MDN - Promise.allSettled()', favIconUrl: 'https://developer.mozilla.org/favicon.ico', index: 7, groupId: -1, parentIndex: 5, mark: null },
                        { url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html', title: 'TypeScript Handbook - Generics', favIconUrl: 'https://www.typescriptlang.org/favicon.ico', index: 8, groupId: -1, parentIndex: null, mark: 'pin' },
                        { url: 'https://www.typescriptlang.org/docs/handbook/utility-types.html', title: 'TypeScript Handbook - Utility Types', favIconUrl: 'https://www.typescriptlang.org/favicon.ico', index: 9, groupId: -1, parentIndex: 8, mark: null },
                    ],
                    groups: [
                        { id: 1, title: 'React Research', color: 'blue' },
                    ],
                },
            ],
        };
    }

    // ============================================================
    // Message handler — mirrors service_worker.js logic
    // ============================================================

    async _handleMessage(msg) {
        const { action } = msg;

        if (action === 'saveWorkspace') {
            return this._saveWorkspace(msg.name || '', msg.marks || {});
        }
        if (action === 'listWorkspaces') {
            const workspaces = (this._localStorage.workspaces || []).map(ws => ({
                id: ws.id,
                name: ws.name,
                tabCount: ws.tabCount,
                groupCount: (ws.groups || []).length,
                createdAt: ws.createdAt,
            }));
            return { workspaces };
        }
        if (action === 'getWorkspacePreview') {
            const ws = (this._localStorage.workspaces || []).find(w => w.id === msg.id);
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
                })),
                groups: ws.groups || [],
            };
        }
        if (action === 'openWorkspace') {
            return this._openWorkspace(msg.id);
        }
        if (action === 'deleteWorkspace') {
            this._localStorage.workspaces = (this._localStorage.workspaces || [])
                .filter(w => w.id !== msg.id);
            return { success: true };
        }
        if (action === 'updateWorkspace') {
            const workspaces = this._localStorage.workspaces || [];
            const idx = workspaces.findIndex(w => w.id === msg.id);
            if (idx === -1) return { success: false, error: 'Not found' };
            const ws = workspaces[idx];
            const updates = msg.updates || {};
            if (updates.name !== undefined) ws.name = updates.name;
            if (updates.entries !== undefined) {
                ws.entries = updates.entries;
                ws.tabCount = updates.entries.length;
            }
            if (updates.groups !== undefined) ws.groups = updates.groups;
            return { success: true };
        }
        if (action === 'openSidePanel') {
            return { success: true };
        }
        return {};
    }

    /**
     * Mock saveWorkspace — captures current mock tabs into a workspace.
     */
    _saveWorkspace(name, marks) {
        const workspaces = this._localStorage.workspaces || [];
        if (workspaces.length >= MAX_FREE_WORKSPACES) {
            return { success: false, error: 'limit', max: MAX_FREE_WORKSPACES };
        }

        const tabParentMap = this._sessionStorage.tabParentMap || {};
        const tabIdToIdx = {};
        const entries = [];
        let idx = 0;

        const sortedTabs = [...this._tabs].sort((a, b) => a.index - b.index);
        for (const tab of sortedTabs) {
            tabIdToIdx[tab.id] = idx;
            entries.push({
                url: tab.url,
                title: tab.title || '',
                index: tab.index,
                groupId: tab.groupId ?? -1,
                favIconUrl: tab.favIconUrl || null,
                mark: marks[tab.id] || null,
                parentIndex: null,
            });
            idx++;
        }

        // Resolve parent indices
        for (const tab of sortedTabs) {
            const ei = tabIdToIdx[tab.id];
            const parentTabId = tabParentMap[tab.id];
            if (parentTabId !== undefined && tabIdToIdx[parentTabId] !== undefined) {
                entries[ei].parentIndex = tabIdToIdx[parentTabId];
            }
        }

        const groups = this._groups.map(g => ({
            id: g.id,
            title: g.title || '',
            color: g.color || 'grey',
        }));

        const workspace = {
            id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: name || 'Workspace',
            createdAt: Date.now(),
            tabCount: entries.length,
            entries,
            groups,
        };

        workspaces.push(workspace);
        this._localStorage.workspaces = workspaces;
        return { success: true, workspace };
    }

    /**
     * Mock openWorkspace — creates new tabs from workspace entries.
     */
    _openWorkspace(workspaceId) {
        const workspaces = this._localStorage.workspaces || [];
        const workspace = workspaces.find(w => w.id === workspaceId);
        if (!workspace) return { success: false, error: 'Not found' };

        const { entries, groups = [] } = workspace;
        const tabParentMap = { ...(this._sessionStorage.tabParentMap || {}) };

        // Build groupId mapping
        const groupIdMap = {};
        for (const g of groups) {
            const existing = this._groups.find(eg => eg.title === g.title && eg.color === g.color);
            if (existing) {
                groupIdMap[g.id] = existing.id;
            } else {
                const newId = this._nextGroupId++;
                const newGroup = { id: newId, title: g.title, color: g.color, collapsed: false, windowId: 1 };
                this._groups.push(newGroup);
                this._groupOnCreated._fire(newGroup);
                groupIdMap[g.id] = newId;
            }
        }

        // Create tabs
        const createdTabs = [];
        for (const entry of entries) {
            const id = this._nextTabId++;
            const maxIndex = this._tabs.length > 0 ? Math.max(...this._tabs.map(t => t.index)) + 1 : 0;
            const tab = {
                id,
                index: maxIndex,
                title: entry.title,
                url: entry.url,
                favIconUrl: entry.favIconUrl || null,
                active: false,
                status: 'complete',
                groupId: entry.groupId !== -1 && groupIdMap[entry.groupId] ? groupIdMap[entry.groupId] : -1,
                windowId: 1,
            };
            this._tabs.push(tab);
            createdTabs.push(tab);
        }

        // Rebuild parent map
        let count = 0;
        for (let i = 0; i < entries.length; i++) {
            if (entries[i].parentIndex !== null && entries[i].parentIndex !== undefined) {
                const childTab = createdTabs[i];
                const parentTab = createdTabs[entries[i].parentIndex];
                if (childTab && parentTab) {
                    tabParentMap[childTab.id] = parentTab.id;
                    count++;
                }
            }
        }
        if (count > 0) {
            const oldValue = this._sessionStorage.tabParentMap;
            this._sessionStorage.tabParentMap = tabParentMap;
            this._storageOnChanged._fire(
                { tabParentMap: { oldValue, newValue: tabParentMap } },
                'session'
            );
        }

        // Fire onCreated for the last tab to trigger a single debounced refresh
        if (createdTabs.length > 0) {
            this._tabOnCreated._fire(createdTabs[createdTabs.length - 1]);
        }

        // Collect restored marks
        const restoredMarks = {};
        for (let i = 0; i < entries.length; i++) {
            if (entries[i].mark && createdTabs[i]) {
                restoredMarks[createdTabs[i].id] = entries[i].mark;
            }
        }

        return { success: true, tabCount: createdTabs.length, marks: restoredMarks };
    }

    // ============================================================
    // i18n loader
    // ============================================================

    async loadI18n() {
        try {
            const resp = await fetch('/_locales/en/messages.json');
            this._i18nMessages = await resp.json();
        } catch {
            // dev server may not serve _locales; silently ignore
        }
    }
}

export default MockChrome;
