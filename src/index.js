/*global chrome*/
import React from 'react';
import ReactDOM from 'react-dom';
import Initializer from './util/initializer';
import TabTreeView from './components/TabTreeView';
import './index.css';

let initializer = new Initializer(chrome);
let activeTabId = chrome.extension.getBackgroundPage().activeTabId;
initializer.getTree().then((rootNode) => {
    ReactDOM.render(
        <TabTreeView
            rootNode={rootNode}
            chrome={chrome}
            activeTabId={activeTabId}
        />,
        document.getElementById('root')
    );
    console.log(rootNode);
})

