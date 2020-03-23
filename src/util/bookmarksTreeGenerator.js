import TabTreeNode from './TabTreeNode';
import LCSUtil from './lcs-util';

export default class BookmarksTreeGenerator {
    constructor(results) {
        this.rawTrees = results;
    }

    getTree(keyword = undefined) {
        this.rootNode = new TabTreeNode();
        this.copyTree(this.rootNode, this.rawTrees, keyword);
        return this.rootNode;
    }

    getFlattenTree(keyword = undefined) {
        this.rootNode = new TabTreeNode();
        this.copyTreeAsFlatten(this.rootNode, this.rawTrees, keyword)
        return this.rootNode;
    }

    copyTree(tabTreeNodeParent, bmNodes, keyword) {
        if (bmNodes) {
            bmNodes.forEach((bmNode) => {
                let childTabTreeNode = this.createTabTreeNodeByBMNode(bmNode);
                if (!childTabTreeNode.isFolder() && !this.filterNode(keyword, childTabTreeNode)) {
                    return;
                }
                tabTreeNodeParent.children.push(childTabTreeNode);
                this.copyTree(childTabTreeNode, bmNode.children);
            })
        }
    }

    copyTreeAsFlatten(tabTreeRootNode, bmNodes, keyword) {
        if (bmNodes) {
            bmNodes.forEach((bmNode) => {
                let childTabTreeNode = this.createTabTreeNodeByBMNode(bmNode);
                if (childTabTreeNode.isLeaf && !this.filterNode(keyword, childTabTreeNode.tab)) {
                    return;
                }
                if (childTabTreeNode.isLeaf) {
                    tabTreeRootNode.children.push(childTabTreeNode);
                }
                this.copyTreeAsFlatten(tabTreeRootNode, bmNode.children, keyword);
            })
        }
    }

    filterNode(keyword, tab) {
        try {
            let titleMatchRet = LCSUtil.LCS(tab.title, keyword);
            let urlMatchRet = LCSUtil.LCS(tab.url, keyword);
            return titleMatchRet.length >= keyword.length || urlMatchRet.length >= keyword.length;
        } catch (e) {
            return true;
        }
    }

    createTabTreeNodeByBMNode(bmNode) {
        let tabTreeNode = new TabTreeNode({
            id: this.genBMNodeId(bmNode.id),
            url: bmNode.url ? bmNode.url : '',
            title: bmNode.title ? bmNode.title : '',
            isBookmark: true
        });
        tabTreeNode.isLeaf = !this.isFolder(bmNode);
        return tabTreeNode;
    }

    isFolder(bmNode) {
        return !bmNode.url || bmNode.url.length <= 0;
    }

    genBMNodeId(id) {
        return `bk${id}`;
    }
}