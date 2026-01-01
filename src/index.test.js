import TabTreeGenerator from './util/TabTreeGenerator';
import TabSequenceHelper from './util/TabSequenceHelper';
import TabTreeNode from './util/TabTreeNode';
import assert from 'assert';

it('test TreeGenerator', () => {
    let tabs = [1, 2, 3, 4, 5, 7].map((item) => {
        return {
            id: item,
            title: 'title ' + item
        }
    });
    let tabsParentMap = {
        2: 1,
        3: 1,
        5: 4,
        7: 6,
        6: 4
    };
    let gen = new TabTreeGenerator(tabs, tabsParentMap);
    let rootNode = gen.getTree();
    assert.equal(rootNode.children.length, 2);
    assert.equal(rootNode.children[0].children.length, 2);
    assert.equal(rootNode.children[1].children.length, 2);
    let aimNode = rootNode.findChildById(3);
    assert.equal(aimNode.tab.title, 'title 3');

    // TabSequenceHelper now requires 3 parameters and uses getNextTab()
    let emptyRootNode = new TabTreeNode();
    let tabSequenceHelper = new TabSequenceHelper(rootNode, emptyRootNode, emptyRootNode);
    assert.equal(tabSequenceHelper.getNextTab().id, 1);
    assert.equal(tabSequenceHelper.getNextTab().id, 2);
    assert.equal(tabSequenceHelper.getNextTab().id, 3);
    assert.equal(tabSequenceHelper.getNextTab().id, 4);
    assert.equal(tabSequenceHelper.getNextTab().id, 5);
    assert.equal(tabSequenceHelper.getNextTab().id, 7);
    
});

it('Grammar Test', () => {
    let score = { a: 1, b: 2 };
    let ret = {};
    Object.keys(score).forEach((key) => {
        ret[key] = score[key];
    })
    console.log(ret);
});