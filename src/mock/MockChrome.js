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
                console.log('[Mock] Creating tab:', createInfo.url);
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
    }
}

export default MockChrome;
