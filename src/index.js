/*global chrome*/
import React from 'react';
import ReactDOM from 'react-dom';
import TabTree from './components/tabTree';
import './index.css';

ReactDOM.render(
    <TabTree
        chrome={chrome}
    // activeTabId={activeTabId}
    />,
    document.getElementById('root')
);



// import React from 'react';
// import ReactDOM from 'react-dom';
// import 'antd/lib/icon/style/css';
// import './index.css';
// import TabTreeView from './components/tabTreeView';
// import TabTreeGenerator from './util/TabTreeGenerator'

// const mockTab = {
//     status: 'loading',
//     title: 'See What is a big apple'
// }

// const genRootNode = () => {
//     let tabs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((item) => {
//         return {
//             id: item,
//             title: 'Web ' + item + '- This is title itle next apple apple apple apple is what ' + item,
//             active: item === 6,
//             url: 'https://stackoverflow.com/questions/12559763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-e59763/pseudo-elements-not-showing'
//         }
//     });
//     let tabsParentMap = {
//         2: 1,
//         3: 1,
//         4: 1,
//         5: 4,
//         6: 2,
//         7: 2,
//         8: 4,
//         9: 1,
//         11: 9,
//         12: 9,
//         16: 15,
//         18: 16
//     };
//     let gen = new TabTreeGenerator(tabs, tabsParentMap);
//     let rootNode = gen.getTree();
//     return rootNode;
// }

// const onClosedButtonClick = (tab) => {
//     console.log("Closed: " + tab.id);
// }

// const onContainerClick = (tab) => {
//     console.log("change to: " + tab.id);
// }

// ReactDOM.render(
//     <TabTreeView rootNode={genRootNode()} onClosedButtonClick={onClosedButtonClick} onContainerClick={onContainerClick} />,
//     document.getElementById('root')
// );