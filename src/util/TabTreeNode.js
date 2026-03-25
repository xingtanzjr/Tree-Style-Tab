/**
 * TabTreeNode - Represents a node in the tab tree
 */
class TabTreeNode {
    constructor(tab = undefined, children = [], parent = undefined) {
        this.tab = tab;
        this.children = children;
        this.parent = parent;
        this.isLeaf = true;
        this.groupInfo = null; // { id, title, color, collapsed } for group container nodes
    }

    /**
     * Deep clone the node tree for immutable updates
     * @returns {TabTreeNode} A new copy of the node tree
     */
    clone() {
        const clonedTab = this.tab ? { ...this.tab } : undefined;
        const clonedNode = new TabTreeNode(clonedTab, [], undefined);
        clonedNode.children = this.children.map((child) => {
            const clonedChild = child.clone();
            clonedChild.parent = clonedNode;
            return clonedChild;
        });
        clonedNode.isLeaf = this.isLeaf;
        clonedNode.groupInfo = this.groupInfo ? { ...this.groupInfo } : null;
        return clonedNode;
    }

    isGroupNode() {
        return this.groupInfo !== null;
    }

    hasParent() {
        return this.parent !== undefined;
    }

    getParent() {
        return this.parent;
    }

    toString() {
        return this.tab === undefined ? 'ROOT' : this.tab.id;
    }

    getAllTabIds() {
        let tabIds = (this.tab && !this.groupInfo) ? [this.tab.id] : [];
        if (this.children.length > 0) {
            this.children.forEach((child) => {
                tabIds = tabIds.concat(child.getAllTabIds());
            });
        }
        return tabIds;
    }

    findChildById(tabId) {
        if (this.tab !== undefined && this.tab.id === tabId) {
            return this;
        }
        for (let i = 0; i < this.children.length; i++) {
            const found = this.children[i].findChildById(tabId);
            if (found !== null) {
                return found;
            }
        }
        return null;
    }

    isFolder() {
        return !this.isLeaf;
    }

    /**
     * Update title by tabId immutably
     */
    updateTitleById(tabId, title) {
        const newRoot = this.clone();
        const node = newRoot.findChildById(tabId);
        if (node !== null && node.tab) {
            node.tab.title = title;
        }
        return newRoot;
    }

    /**
     * Update favicon by tabId immutably
     */
    updateFavIconUrlById(tabId, favIconUrl) {
        const newRoot = this.clone();
        const node = newRoot.findChildById(tabId);
        if (node !== null && node.tab) {
            node.tab.favIconUrl = favIconUrl;
        }
        return newRoot;
    }

    /**
     * Update status by tabId immutably
     */
    updateStatusById(tabId, status) {
        const newRoot = this.clone();
        const node = newRoot.findChildById(tabId);
        if (node !== null && node.tab) {
            node.tab.status = status;
        }
        return newRoot;
    }

    /**
     * Update URL by tabId immutably
     */
    updateUrlById(tabId, url) {
        const newRoot = this.clone();
        const node = newRoot.findChildById(tabId);
        if (node !== null && node.tab) {
            node.tab.url = url;
        }
        return newRoot;
    }
}

export default TabTreeNode;
