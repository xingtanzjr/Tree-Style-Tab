/**
 * Mock Chrome API for development and testing
 */
class MockChrome {
    constructor() {
        this.updateListeners = [];
        this.removeListeners = [];

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
        };
    }
}

export default MockChrome;
