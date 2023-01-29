export default class TabSequenceHelper {
    constructor(rootNode, bookmarkRootNode, googleSearchNode) {
        this.refreshQueue(rootNode, bookmarkRootNode, googleSearchNode);
    }

    getNextTab() {
        if (this.tabList.length === 0) {
            return null;
        }
        this.currentIdx = (this.currentIdx + 1) % this.tabList.length;
        return this.tabList[this.currentIdx].tab;
    }

    getPreviousTab() {
        if (this.tabList.length === 0) {
            return null;
        }
        this.currentIdx = (this.currentIdx === -1 ?  0 : this.currentIdx);
        this.currentIdx = (this.currentIdx - 1 + this.tabList.length) % this.tabList.length;
        return this.tabList[this.currentIdx].tab;
    }

    refreshQueue(rootNode, bookmarkRootNode, googleSearchNode) {
        this.tabList = [];
        this.dfs(rootNode);
        this.dfs(bookmarkRootNode);
        this.dfs(googleSearchNode);
        this.currentIdx = -1;
    }

    setCurrentIdx(activeTab) {
        for (let i = 0; i < this.tabList.length; i ++) {
            if (this.tabList[i].tab.id === activeTab.id) {
                this.currentIdx = i;
            }
        }
    }

    dfs = (node) => {
        if (node && node.children && node.children.length > 0) {
            for (let i = 0; i < node.children.length; i++) {
                this.tabList.push(node.children[i]);
                this.dfs(node.children[i]);
            }
        }
    }

    getNodeByTabId(tabId, node = this.rootNode) {
        if (node.tab && node.tab.id === tabId) {
            return node;
        }
        for (var i = 0; i < node.children.length ; i ++ ) {
            const ret = this.getNodeByTabId(tabId, node.children[i]);
            if (ret !== null) {
                return ret;
            }
        }
        return null;
    }
}