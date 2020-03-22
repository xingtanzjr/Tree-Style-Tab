import TabTreeGenerator from './TabTreeGenerator';
import BookmarksTreeGenerator from './bookmarksTreeGenerator';
import LCSUtil from './lcs-util';
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

    getTabParentMap() {
        return new Promise((resolve) => {
            this.chrome.runtime.getBackgroundPage((window) => {
                resolve(window.tabParentMap);
            });
        })
    }

    filterNodes = (keyword, tabs) => {
        try {
            return tabs.filter((tab) => {
                let titleMatchRet = LCSUtil.LCS(tab.title, keyword);
                let urlMatchRet = LCSUtil.LCS(tab.url, keyword);
                return titleMatchRet.length >= keyword.length || urlMatchRet.length >= keyword.length;
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