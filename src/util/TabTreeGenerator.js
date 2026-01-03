import TabTreeNode from './TabTreeNode';

/**
 * TreeGenerator - Builds a tree structure from flat tab list
 */
class TreeGenerator {
    constructor(tabs, tabParentMap, priorityTabId = null) {
        this.tabs = tabs;
        this.tabParentMap = tabParentMap;
        this.priorityTabId = priorityTabId;
        this.nodeMap = {};
        this.tabMap = {};
        this.rootNode = new TabTreeNode();

        tabs.forEach((tab) => {
            this.tabMap[tab.id] = tab;
        });
    }

    getTree() {
        this.tabs.forEach((tab) => {
            const node = this.getNode(tab);
            const parentNode = this.getNode(this.getParentTabId(tab.id));
            node.parent = parentNode;
            // Use unshift for priority tab (recently dragged) to put it first
            if (tab.id === this.priorityTabId) {
                parentNode.children.unshift(node);
            } else {
                parentNode.children.push(node);
            }
        });
        return this.rootNode;
    }

    getParentTabId(tabId) {
        const parentTabId = this.tabParentMap[tabId];
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
        const currentTabMap = {};
        tabs.forEach((tab) => {
            currentTabMap[tab.id] = 1;
        });
        const ret = {};
        for (const key in tabParentMap) {
            if (currentTabMap[key]) {
                ret[key] = tabParentMap[key];
            }
        }
        return ret;
    }
}

export default TreeGenerator;
