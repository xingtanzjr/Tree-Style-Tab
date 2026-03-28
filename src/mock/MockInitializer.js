import TabTreeGenerator from '../util/TabTreeGenerator';
import TabTreeNode from '../util/TabTreeNode';
import BookmarksTreeGenerator from '../util/BookmarksTreeGenerator';

/**
 * Mock Initializer for development and testing.
 *
 * Mirrors the real Initializer API but delegates to MockChrome's
 * internal state, so tab/group/parent changes are fully consistent.
 *
 * @param {MockChrome} chrome - The MockChrome instance
 */
class MockInitializer {
    constructor(chrome) {
        this.chrome = chrome;
    }

    /**
     * Get mock tab list (sorted by index)
     */
    getTabList() {
        const tabs = [...this.chrome._tabs].sort((a, b) => a.index - b.index);
        return tabs;
    }

    /**
     * Get the currently active tab
     */
    async getActiveTab() {
        const tabs = this.getTabList();
        const activeTab = tabs.find((tab) => tab.active);
        return activeTab ?? { id: -1 };
    }

    /**
     * Get tab parent relationships from mock session storage
     */
    async getTabParentMap() {
        const result = await this.chrome.storage.session.get('tabParentMap');
        return result.tabParentMap || {};
    }

    /**
     * Filter tab by keyword
     */
    filterTab(keyword, tab) {
        try {
            const regex = new RegExp(keyword, 'i');
            return regex.test(tab.title) || regex.test(tab.url);
        } catch {
            return true;
        }
    }

    /**
     * Filter nodes by keyword
     */
    filterNodes(keyword, tabs) {
        return tabs.filter((tab) => this.filterTab(keyword, tab));
    }

    /**
     * Check if filtering is needed
     */
    needFilterByKeyword(keyword) {
        return keyword && keyword.length > 0;
    }

    /**
     * Get the tab tree (with groups)
     */
    async getTree(keyword = undefined) {
        const tabParentMap = await this.getTabParentMap();
        let tabs = this.getTabList();
        const tabGroups = [...this.chrome._groups];

        if (this.needFilterByKeyword(keyword)) {
            tabs = this.filterNodes(keyword, tabs);
        }

        const treeGen = new TabTreeGenerator(tabs, tabParentMap, tabGroups);
        return treeGen.getTree();
    }

    /**
     * Get bookmarks — delegates to chrome.bookmarks mock
     */
    async getBookmarks(keyword = undefined) {
        if (!keyword || keyword.length === 0) {
            return new TabTreeNode();
        }

        return new Promise((resolve) => {
            this.chrome.bookmarks.getTree((results) => {
                const treeGen = new BookmarksTreeGenerator(results);
                resolve(treeGen.getFlattenTree(keyword));
            });
        });
    }

    /**
     * Update tab parent relationship in session storage
     */
    async updateTabParent(tabId, newParentId) {
        const { tabParentMap = {} } = await this.chrome.storage.session.get('tabParentMap');
        if (newParentId === null || newParentId === undefined) {
            delete tabParentMap[tabId];
        } else {
            tabParentMap[tabId] = newParentId;
        }
        await this.chrome.storage.session.set({ tabParentMap });
    }

    /**
     * Detach tab from parent
     */
    async detachTab(tabId) {
        return this.updateTabParent(tabId, null);
    }

    /**
     * Move a tab to a new position via chrome.tabs.move
     */
    async moveTab(tabId, newIndex) {
        return new Promise((resolve) => {
            this.chrome.tabs.move(tabId, { index: newIndex }, resolve);
        });
    }
}

export default MockInitializer;
