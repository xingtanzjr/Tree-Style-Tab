import TabTreeNode from './TabTreeNode';
import TabTreeGenerator from './TabTreeGenerator';
import BookmarksTreeGenerator from './BookmarksTreeGenerator';

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

    /**
     * Get tab parent relationships from storage
     */
    getTabParentMap() {
        return new Promise((resolve) => {
            this.chrome.storage.session.get(['tabParentMap'], (ret) => {
                const tabParentMap = ret.tabParentMap || {};
                resolve(tabParentMap);
            });
        });
    }

    /**
     * Filter tabs by keyword
     */
    filterNodes(keyword, tabs) {
        try {
            const regex = new RegExp(keyword, 'i');
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
     */
    async getTree(keyword = undefined) {
        const tabParentMap = await this.getTabParentMap();
        let tabs = await this.getTabList();

        if (this.needFilterByKeyword(keyword)) {
            tabs = this.filterNodes(keyword, tabs);
        }

        const treeGen = new TabTreeGenerator(tabs, tabParentMap);
        return treeGen.getTree();
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
