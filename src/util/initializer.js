import TabTreeNode from './TabTreeNode';
import TabTreeGenerator from './TabTreeGenerator';
import BookmarksTreeGenerator from './bookmarksTreeGenerator';

class Initializer {

    constructor(chrome) {
        this.chrome = chrome;
    }

    getTablist() {
        // return new Promise((resolve) => {
        //     this.chrome.windows.getCurrent({ populate: true }, (window) => {
        //         let tabTitles = [];
        //         window.tabs.forEach(tab => {
        //             tabTitles.push(tab);
        //         });
        //         resolve(tabTitles);
        //     });
        // });

        return new Promise((resolve) => {
            this.chrome.tabs.query({ windowId: this.chrome.windows.WINDOW_ID_CURRENT }, (tabs) => {
                resolve(tabs);
            })
        })
    }

    async getActiveTab() {
        let tabs = await this.getTablist();
        let activeTab = tabs.find(tab => tab.active);
        if (!activeTab) {
            activeTab = {id: -1};
        }
        return activeTab;
    }

    getTabParentMap() {
        return new Promise((resolve) => {
            this.chrome.runtime.getBackgroundPage((window) => {
                resolve(window.tabParentMap);
            });
        })
    }

    filterNodes = (keyword, tabs) => {
        try {
            let regex = new RegExp(keyword, "i");
            return tabs.filter((tab) => {
                return regex.test(tab.title) || regex.test(tab.url);
            })
        } catch (e) {
            return tabs;
        }
    }

    needFilterByKeyword = (keyword) => {
        return keyword && keyword.length > 0;
    }

    async getTree(keyword = undefined) {
        let tabParentMap = await this.getTabParentMap();
        let tabs = await this.getTablist();
        if (this.needFilterByKeyword(keyword)) {
            tabs = this.filterNodes(keyword, tabs);
        }
        let treeGen = new TabTreeGenerator(tabs, tabParentMap);
        return treeGen.getTree();
    }

    async getBookmarks(keyword = undefined) {
        if (!keyword || keyword.length === 0) {
            return Promise.resolve(new TabTreeNode());
        }
        let rawBookmarkTree = await this.getBookmarksTree();
        let treeGen = new BookmarksTreeGenerator(rawBookmarkTree);
        return treeGen.getFlattenTree(keyword);
    }

    getBookmarksTree() {
        return new Promise((resolve) => {
            this.chrome.bookmarks.getTree((results) => {
                resolve(results);
            })
        })
    }
}

export default Initializer;