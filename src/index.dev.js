/*
 * Development mode entry point
 * Uses mock Chrome API for local development without browser extension context
 */
import React from 'react';
import ReactDOM from 'react-dom';
import TabTree from './components/TabTree';
import MockChrome from './mock/mockChrome';
import MockInitializer from './mock/mockInitializer';
import './index.css';

ReactDOM.render(
    <TabTree
        chrome={new MockChrome()}
        initializer={new MockInitializer()}
    />,
    document.getElementById('root')
);
