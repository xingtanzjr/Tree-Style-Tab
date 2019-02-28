export default class TabSequenceHelper {
    constructor(rootNode) {
        this.refreshQueue(rootNode);
    }

    getNextTab() {
        this.currentIdx = (this.currentIdx + 1) % this.tabList.length;
        return this.tabList[this.currentIdx].tab;
    }

    getPreviousTab() {
        this.currentIdx = (this.currentIdx === -1 ?  0 : this.currentIdx);
        this.currentIdx = (this.currentIdx - 1 + this.tabList.length) % this.tabList.length;
        return this.tabList[this.currentIdx].tab;
    }

    refreshQueue(rootNode) {
        this.tabList = [];
        this.dfs(rootNode);
        this.currentIdx = -1;
    }

    refreshQueueWithBookmarks(rootNode, bookmarkRootNode) {
        this.tabList = [];
        this.dfs(rootNode);
        this.dfs(bookmarkRootNode);
        this.currentIdx = -1;
    }

    dfs = (node) => {
        if (node.children.length > 0) {
            for (let i = 0; i < node.children.length; i++) {
                this.tabList.push(node.children[i]);
                this.dfs(node.children[i]);
            }
        }
    }
}