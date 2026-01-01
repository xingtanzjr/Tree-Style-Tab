class TabTreeNode {
    constructor(tab = undefined, children = [], parent = undefined) {
        this.tab = tab;
        this.children = children;
        this.parent = parent;
    }

    /**
     * 深拷贝节点树，用于不可变更新
     * @returns {TabTreeNode} 新的节点树副本
     */
    clone() {
        const clonedTab = this.tab ? { ...this.tab } : undefined;
        const clonedNode = new TabTreeNode(clonedTab, [], undefined);
        clonedNode.children = this.children.map(child => {
            const clonedChild = child.clone();
            clonedChild.parent = clonedNode;
            return clonedChild;
        });
        clonedNode.isLeaf = this.isLeaf;
        return clonedNode;
    }

    hasParent() {
        return this.parent !== undefined;
    }

    getParent() {
        return this.parent;
    }

    toString() {
        return this.tab === undefined ? "ROOT" : this.tab.id;
    }

    getAllTabIds() {
        let tabIds = this.tab ? [this.tab.id] : [];
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
     * 更新指定 tabId 的标题，返回新的根节点（不可变更新）
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
     * 更新指定 tabId 的图标，返回新的根节点（不可变更新）
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
     * 更新指定 tabId 的状态，返回新的根节点（不可变更新）
     */
    updateStatusById(tabId, status) {
        const newRoot = this.clone();
        const node = newRoot.findChildById(tabId);
        if (node !== null && node.tab) {
            node.tab.status = status;
        }
        return newRoot;
    }
}

export default TabTreeNode;