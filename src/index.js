/*global chrome*/
import React from 'react';
import ReactDOM from 'react-dom';/*  */
import TabTree from './components/tabTree';
import Initializer from './util/initializer';
import './index.css';

// restore page zoom to 1 when user set a browser-wise global zoom
// to prevent page from exceeding border
chrome.tabs.getZoom(null, (zoomFactor) => {
    const scale = 1 / zoomFactor;
    document.documentElement.style.zoom = scale.toString(); 
});

ReactDOM.render(
    <TabTree
        chrome={chrome}
        initializer={new Initializer(chrome)}
    />,
    document.getElementById('root')
);


// import React from 'react';
// import ReactDOM from 'react-dom';
// import TabTree from './components/tabTree';
// import MockChrome from './mock/mockChrome';
// import MockInitializer from './mock/mockInitializer';
// import './index.css';

// ReactDOM.render(
//     <TabTree
//         chrome={new MockChrome()}
//         initializer={new MockInitializer()}
//     />,
//     document.getElementById('root')
// );