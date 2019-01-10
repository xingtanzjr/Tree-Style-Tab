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
        let treeGen = new TabTreeGenerator(tabs, tabParentMap);
        return treeGen.getTree();
    }
}

export default Initializer;