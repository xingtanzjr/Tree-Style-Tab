import TabTreeNode from './TabTreeNode';

class TreeGenerator {

    constructor(tabs, tabParentMap) {
        this.tabs = tabs;
        //TODO: solve how to clean tabMap later
        // this.tabParentMap = this.cleanTabParentMap(tabs, tabParentMap)
        this.tabParentMap = tabParentMap;
        this.nodeMap = {};
        this.tabMap = {};
        this.rootNode = new TabTreeNode();
        tabs.forEach((tab) => {
            this.tabMap[tab.id] = tab;
        });
    }

    getTree() {
        this.tabs.forEach(tab => {
            let node = this.getNode(tab);
            let parentNode = this.getNode(this.getParentTabId(tab.id));
            node.parent = parentNode;
            parentNode.children.push(node);
        });
        return this.rootNode;
    }

    getParentTabId(tabId) {
        let parentTabId = this.tabParentMap[tabId];
        if (this.tabMap[parentTabId]) {
            return this.tabMap[parentTabId];
        } else if (!this.tabMap[parentTabId] && this.tabParentMap[parentTabId]) {
            return this.getParentTabId(parentTabId);
        } else {
            return undefined;
        }
    }

    getNode(tab) {
        if (tab === undefined) {
            return this.rootNode;
        }
        if (!this.nodeMap[tab.id]) {
            this.nodeMap[tab.id] = new TabTreeNode(tab);
        }
        return this.nodeMap[tab.id];
    }

    cleanTabParentMap(tabs, tabParentMap) {
        let currentTabMap = {};
        tabs.forEach((tab) => {
            currentTabMap[tab.id] = 1;
        })
        let ret = {};
        for(let key in tabParentMap) {
            if (currentTabMap[key]) {
                ret[key] = tabParentMap[key];
            }
        }
        return ret;
    }
}

export default TreeGenerator;