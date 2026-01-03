import TabTreeGenerator from '../util/TabTreeGenerator';
import TabTreeNode from '../util/TabTreeNode';

/**
 * Mock Initializer for development and testing
 */
class MockInitializer {
    constructor() {
        this._tabParentMap = null;
        this._bookmarkList = null;
        this._tabs = null; // Store tabs with mutable order
    }

    /**
     * Initialize mock tab list (called once)
     */
    _initTabs() {
        if (this._tabs) return;
        
        const tabIds = [111, 211, 311, 411, 5, 6, 721, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 1122, 3344, 5566, 7788];
        this._tabs = tabIds.map((item, index) => ({
            id: index + 1,
            index: index,  // Chrome tabs have an index property
            title: `Web ${item} - This is title ${item}`,
            active: item === 6,
            url: `https://example.com/page/${item}`,
            favIconUrl: 'https://www.google.com/s2/favicons?domain=example.com',
        }));
    }

    /**
     * Get mock tab list (sorted by index)
     */
    getTabList() {
        this._initTabs();
        // Return tabs sorted by index (like Chrome does)
        return [...this._tabs].sort((a, b) => a.index - b.index);
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
     * Get tab parent relationships
     */
    getTabParentMap() {
        if (this._tabParentMap) {
            return this._tabParentMap;
        }
        return {
            2: 1,
            3: 1,
            4: 1,
            5: 4,
            6: 2,
            7: 2,
            8: 4,
            9: 1,
            11: 9,
            12: 9,
            16: 15,
            18: 16,
        };
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
     * Get the tab tree
     */
    async getTree(keyword = undefined) {
        const tabParentMap = this.getTabParentMap();
        let tabs = this.getTabList();

        if (this.needFilterByKeyword(keyword)) {
            tabs = this.filterNodes(keyword, tabs);
        }

        const treeGen = new TabTreeGenerator(tabs, tabParentMap);
        return treeGen.getTree();
    }

    /**
     * Get bookmarks
     */
    async getBookmarks(keyword = undefined) {
        const rootNode = new TabTreeNode();

        if (!keyword || keyword.length === 0) {
            return rootNode;
        }

        // Generate random bookmark list once
        if (!this._bookmarkList) {
            this._bookmarkList = Array.from({ length: 1000 }, () =>
                Math.floor(Math.random() * 100000)
            );
        }

        this._bookmarkList.forEach((id) => {
            const tab = {
                id,
                title: `Bookmark ${id}`,
                url: `http://bookmark.example.com/${id}`,
                isBookmark: true,
            };
            if (!keyword || this.filterTab(keyword, tab)) {
                rootNode.children.push(new TabTreeNode(tab));
            }
        });

        return rootNode;
    }

    /**
     * Update tab parent relationship
     */
    async updateTabParent(tabId, newParentId) {
        // eslint-disable-next-line no-console
        console.log(`[Mock] Updating tab ${tabId} parent to ${newParentId}`);

        const tabParentMap = this.getTabParentMap();
        if (newParentId === null || newParentId === undefined) {
            delete tabParentMap[tabId];
        } else {
            tabParentMap[tabId] = newParentId;
        }

        this._tabParentMap = tabParentMap;
    }

    /**
     * Detach tab from parent
     */
    async detachTab(tabId) {
        return this.updateTabParent(tabId, null);
    }

    /**
     * Move a tab to a new position
     * @param {number} tabId - The ID of the tab to move
     * @param {number} newIndex - The target index (-1 means move to end)
     */
    async moveTab(tabId, newIndex) {
        this._initTabs();
        
        const tab = this._tabs.find(t => t.id === tabId);
        if (!tab) return;

        const oldIndex = tab.index;
        const maxIndex = this._tabs.length - 1;
        
        // Handle -1 (move to end) or clamp to valid range
        const targetIndex = newIndex === -1 ? 0 : Math.min(newIndex, maxIndex);
        
        if (oldIndex === targetIndex) return;

        // Update indices for all affected tabs
        if (oldIndex < targetIndex) {
            // Moving right: shift tabs between old and new position left
            this._tabs.forEach(t => {
                if (t.index > oldIndex && t.index <= targetIndex) {
                    t.index--;
                }
            });
        } else {
            // Moving left: shift tabs between new and old position right
            this._tabs.forEach(t => {
                if (t.index >= targetIndex && t.index < oldIndex) {
                    t.index++;
                }
            });
        }
        
        // Set the moved tab's new index
        tab.index = targetIndex;
        
        // eslint-disable-next-line no-console
        console.log(`[Mock] Moved tab ${tabId} from index ${oldIndex} to ${targetIndex}`);
    }
}

export default MockInitializer;
