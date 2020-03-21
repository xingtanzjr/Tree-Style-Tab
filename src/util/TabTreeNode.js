class TabTreeNode {
    constructor(tab = undefined, children = [], parent = undefined) {
        this.tab = tab;
        this.children = children;
        this.parent = parent;
    }

    hasParent() {
        return this.parentId !== undefined;
    }

    getParent() {
        return this.parent;
    }

    toString() {
        return this.tab === undefined ? "ROOT" : this.tab.id;
    }

    getAllTabIds() {
        let tabIds = [this.tab.id];
        if (this.children.length > 0) {
            this.children.forEach((child) => {
                tabIds = tabIds.concat(child.getAllTabIds())
            });
        }
        return tabIds;
    }

    findChildById(tabId) {
        if (this.tab !== undefined && this.tab.id === tabId) {
            return this;
        }
        for (let i = 0; i < this.children.length; i++) {
            let tab = this.children[i].findChildById(tabId);
            if (tab !== null) {
                return tab;
            }
        }
        return null;
    }

    setTitle(title) {
        this.tab.title = title;
    }

    setFavIconUrl(favIconUrl) {
        this.tab.favIconUrl = favIconUrl;
    }

    setStatus(status) {
        this.tab.status = status;
    }

    setTitleById(tabId, title) {
        let node = this.findChildById(tabId);
        if (node !== null) {
            node.setTitle(title);
        }
    }

    setFavIconUrlById(tabId, favIconUrl) {
        let node = this.findChildById(tabId);
        if (node !== null) {
            node.setFavIconUrl(favIconUrl);
        }
    }

    setStatusById(tabId, status) {
        let node = this.findChildById(tabId);
        if (node !== null) {
            node.setStatus(status);
        }
    }
}

export default TabTreeNode;