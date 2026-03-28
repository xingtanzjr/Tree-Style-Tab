import TabTreeNode from './TabTreeNode';

/**
 * BookmarksTreeGenerator - Converts Chrome bookmark tree to TabTreeNode structure
 */
export default class BookmarksTreeGenerator {
    constructor(results) {
        this.rawTrees = results;
    }

    getFlattenTree(keyword = undefined) {
        this.rootNode = new TabTreeNode();
        this.copyTreeAsFlatten(this.rootNode, this.rawTrees, keyword);
        return this.rootNode;
    }

    copyTreeAsFlatten(tabTreeRootNode, bmNodes, keyword) {
        if (bmNodes) {
            bmNodes.forEach((bmNode) => {
                const childTabTreeNode = this.createTabTreeNodeByBMNode(bmNode);
                if (childTabTreeNode.isLeaf && !this.filterNode(keyword, childTabTreeNode.tab)) {
                    return;
                }
                if (childTabTreeNode.isLeaf) {
                    tabTreeRootNode.children.push(childTabTreeNode);
                }
                this.copyTreeAsFlatten(tabTreeRootNode, bmNode.children, keyword);
            });
        }
    }

    filterNode(keyword, tab) {
        try {
            const regex = new RegExp(keyword, 'i');
            return regex.test(tab.title) || regex.test(tab.url);
        } catch {
            return true;
        }
    }

    createTabTreeNodeByBMNode(bmNode) {
        const tabTreeNode = new TabTreeNode({
            id: this.genBMNodeId(bmNode.id),
            url: bmNode.url ? bmNode.url : '',
            title: bmNode.title ? bmNode.title : '',
            isBookmark: true,
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
