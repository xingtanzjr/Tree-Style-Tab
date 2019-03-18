import TabTreeGenerator from '../util/TabTreeGenerator';
import TabTreeNode from '../util/TabTreeNode';

class MockInitializer {

    constructor(chrome) {
        this.chrome = chrome;
    }

    getTablist = () => {
        return [111, 211, 311, 411, 5, 6, 721, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 1122, 3344, 5566, 7788].map((item, index) => {
            //return [1, 2].map((item, index) => {
            return {
                id: index + 1,
                title: 'Web ' + item + '- \\This is\\\\ title itle next apple apple apple apple is what ' + item,
                active: item === 6,
                url: 'https://stackoverflow.com/questions/12559763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-elements-not-showing'
            }
        });
    }


    getTabParentMap = () => {
        return {
            2: 1,
            3: 1,
            4: 1,
            5: 4,
            6: 2,
            7: 2,
            8: 4,
            9: 1,
            11: 9,
            12: 9,
            16: 15,
            18: 16
        };
    }

    filterTab = (keyword, tab) => {
        try {
            let regex = new RegExp(keyword, "i");
            return regex.test(tab.title) || regex.test(tab.url);
        } catch (e) {
            return true;
        }
    }

    filterNodes = (keyword, tabs) => {
        return tabs.filter((tab) => {
            return this.filterTab(keyword, tab);
        });
    }

    needFilterByKeyword = (keyword) => {
        return keyword && keyword.length > 0;
    }

    async getTree(keyword = undefined) {
        let tabParentMap = this.getTabParentMap();
        let tabs = this.getTablist();
        if (this.needFilterByKeyword(keyword)) {
            tabs = this.filterNodes(keyword, tabs);
        }
        let treeGen = new TabTreeGenerator(tabs, tabParentMap);
        return treeGen.getTree();
    }

    async getBookmarks(keyword = undefined) {
        let rootNode = new TabTreeNode();

        if (!this.list) {
            let list = [];

            for (let i = 0; i < 10; i++) {
                list.push(this.getRandomInt(100000));
            }
            this.list = list;
        }
        this.list.forEach((id) => {
            const tab = {
                id: id,
                title: `Bookmarks 211 ${id}`,
                url: `http://Bookmarks.Url=${id}`,
                isBookmark: true
            };
            if (!keyword || this.filterTab(keyword, tab)) {
                rootNode.children.push(new TabTreeNode(tab));
            }

        })
        this.bookmarkRootNode = rootNode;
        return rootNode;
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * Math.floor(max));
    }
}

export default MockInitializer;