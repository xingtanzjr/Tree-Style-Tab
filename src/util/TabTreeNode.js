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

    findChildById(tabId) {
        if (this.tab !== undefined && this.tab.id === tabId) {
            return this;
        } 
        for (let i = 0; i < this.children.length; i ++) {
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

    setTitleById(tabId, title) {
        let node = this.findChildById(tabId);
        if (node !== null) {
            node.setTitle(title);
        }
    }
}

export default TabTreeNode;