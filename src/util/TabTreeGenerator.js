import TabTreeNode from './TabTreeNode';

class TreeGenerator {

    constructor(tabs, tabParentMap) {
        this.tabs = tabs;
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
            let parentId = this.tabParentMap[tab.id];
            let parentNode = this.getNode(this.tabMap[parentId]);
            node.parent = parentNode;
            parentNode.children.push(node);
        });
        return this.rootNode;
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
}

export default TreeGenerator;