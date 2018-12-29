import TabTreeGenerator from './util/TabTreeGenerator';
import assert from 'assert';

it('test TreeGenerator', () => {
    let tabs = [1, 2, 3, 4, 5].map((item) => {
        return {
            id: item,
            title: 'title ' + item
        }
    });
    let tabsParentMap = {
        2: 1,
        3: 1,
        5: 4
    };
    let gen = new TabTreeGenerator(tabs, tabsParentMap);
    let rootNode = gen.getTree();
    assert.equal(rootNode.children.length, 2);
    assert.equal(rootNode.children[0].children.length, 2);
    let aimNode = rootNode.findChildById(3);
    assert.equal(aimNode.tab.title, 'title 3');
});

it('Grammar Test', () => {
    let score = { a: 1, b: 2 };
    let ret = {};
    Object.keys(score).forEach((key) => {
        ret[key] = score[key];
    })
    console.log(ret);
});