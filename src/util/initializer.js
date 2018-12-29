import TabTreeGenerator from './TabTreeGenerator';

class Initializer {

    constructor(chrome) {
        this.chrome = chrome;
    }

    getTablist() {
        return new Promise((resolve) => {
            this.chrome.windows.getCurrent({ populate: true }, (window) => {
                let tabTitles = [];
                window.tabs.forEach(tab => {
                    tabTitles.push(tab);
                });
                resolve(tabTitles);
            });
        });
    }

    getTabParentMap() {
        return new Promise((resolve) => {
            this.chrome.runtime.getBackgroundPage((window) => {
                resolve(window.tabParentMap);
            });
        })
    }

    async getTree() {
        let tabParentMap = await this.getTabParentMap();
        let tabs = await this.getTablist();
        tabParentMap = this.cleanTabParentMap(tabs, tabParentMap);
        let treeGen = new TabTreeGenerator(tabs, tabParentMap);
        return treeGen.getTree();
    }

    cleanTabParentMap(tabs, tabParentMap) {
        let currentTabMap = {};
        tabs.forEach((tab) => {
            currentTabMap[tab.id] = 1;
        })
        console.log(Object.keys(tabParentMap));
        let ret = {};
        for(let key in tabParentMap) {
            if (currentTabMap[key]) {
                ret[key] = tabParentMap[key];
            }
        }
        
        // Object.keys(tabParentMap).forEach((key) => {
        //     if (currentTabMap[key]) {
        //         ret[key] = tabParentMap[key];
        //     }
        // });
        return ret;
    }
}

export default Initializer;