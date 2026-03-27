/**
 * Mock Chrome API for development and testing
 */
class MockChrome {
    constructor() {
        this.updateListeners = [];
        this.removeListeners = [];

        const noopEvent = {
            addListener: () => {},
            removeListener: () => {},
        };

        this.tabs = {
            onUpdated: {
                addListener: (callback) => {
                    this.updateListeners.push(callback);
                },
                removeListener: (callback) => {
                    this.updateListeners = this.updateListeners.filter((l) => l !== callback);
                },
            },
            onRemoved: {
                addListener: (callback) => {
                    this.removeListeners.push(callback);
                },
                removeListener: (callback) => {
                    this.removeListeners = this.removeListeners.filter((l) => l !== callback);
                },
            },
            onCreated: noopEvent,
            onActivated: noopEvent,
            onMoved: noopEvent,
            onAttached: noopEvent,
            onDetached: noopEvent,
            create: (createInfo) => {
                console.log('[Mock] Creating tab:', createInfo?.url);
            },
            remove: (tabId) => {
                console.log('[Mock] Removing tab:', tabId);
                this.removeListeners.forEach((listener) => {
                    listener(tabId, {});
                });
            },
            update: (tabId, updateInfo) => {
                console.log('[Mock] Updating tab:', tabId, updateInfo);
                this.updateListeners.forEach((listener) => {
                    listener(tabId, updateInfo, { id: tabId, ...updateInfo });
                });
            },
            group: async (options) => {
                console.log('[Mock] Grouping tabs:', options);
                return options.groupId || 0;
            },
            ungroup: async (tabIds) => {
                console.log('[Mock] Ungrouping tabs:', tabIds);
            },
        };

        this.storage = {
            session: {
                get: async (keys) => {
                    return {};
                },
                set: async (items) => {
                    console.log('[Mock] Storage set:', items);
                },
            },
            onChanged: noopEvent,
        };

        this.tabGroups = {
            query: (queryInfo, callback) => {
                callback([]);
            },
            update: async (groupId, updateProperties) => {
                console.log('[Mock] Updating tab group:', groupId, updateProperties);
            },
            onCreated: noopEvent,
            onUpdated: noopEvent,
            onRemoved: noopEvent,
        };

        // Mock workspace storage
        this._workspaces = [];
        this._wsIdCounter = 1;

        // i18n mock — messages loaded asynchronously via loadI18n()
        this._i18nMessages = {};
        this.i18n = {
            getMessage: (key, substitutions) => {
                const entry = this._i18nMessages[key];
                if (!entry) return '';
                let msg = entry.message;
                if (substitutions) {
                    const arr = Array.isArray(substitutions) ? substitutions : [substitutions];
                    arr.forEach((s, i) => { msg = msg.replace(new RegExp('\\$' + (i + 1), 'g'), String(s)); });
                }
                return msg;
            },
        };

        this.runtime = {
            sendMessage: (message, callback) => {
                const { action, name, id } = message;
                if (action === 'getWorkspaces') {
                    callback({ workspaces: [...this._workspaces] });
                } else if (action === 'saveWorkspace') {
                    this._workspaces.push({ id: this._wsIdCounter++, name, createdAt: Date.now(), tabCount: 0 });
                    callback({ success: true });
                } else if (action === 'openWorkspace') {
                    console.log('[Mock] Opening workspace:', id);
                    callback({ success: true });
                } else if (action === 'deleteWorkspace') {
                    this._workspaces = this._workspaces.filter(w => w.id !== id);
                    callback({ success: true });
                } else {
                    callback({});
                }
            },
        };
    }

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
