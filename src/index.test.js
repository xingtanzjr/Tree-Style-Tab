import TabTreeGenerator from './util/TabTreeGenerator';
import TabSequenceHelper from './util/tabSequenceHelper'
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

    let tabSequenceHelper = new TabSequenceHelper(rootNode);
    // assert.equal(tabSequenceHelper.getNextTabId(), 1);
    assert.equal(tabSequenceHelper.getNextTabId(), 2);
    assert.equal(tabSequenceHelper.getNextTabId(), 3);
    assert.equal(tabSequenceHelper.getNextTabId(), 4);
    assert.equal(tabSequenceHelper.getNextTabId(), 5);
    assert.equal(tabSequenceHelper.getNextTabId(), 7);
    
});

it('Grammar Test', () => {
    let score = { a: 1, b: 2 };
    let ret = {};
    Object.keys(score).forEach((key) => {
        ret[key] = score[key];
    })
    console.log(ret);
});