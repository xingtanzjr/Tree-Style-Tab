import TabTreeGenerator from './TabTreeGenerator';

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
        let regex = new RegExp(keyword, "i");
        return tabs.filter((tab) => {
            return regex.test(tab.title) || regex.test(tab.url);
        })
    }

    needFilterByKeyword = (keyword) => {
        return keyword && keyword.trim().length > 1;
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
}

export default Initializer;