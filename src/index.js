/*global chrome*/
// import React from 'react';
// import ReactDOM from 'react-dom';
// import TabTree from './components/tabTree';
// import Initializer from './util/initializer';
// import './index.css';

// ReactDOM.render(
//     <TabTree
//         chrome={chrome}
//         initializer={new Initializer(chrome)}
//     />,
//     document.getElementById('root')
// );



import React from 'react';
import ReactDOM from 'react-dom';
import TabTree from './components/tabTree';
import MockChrome from './mock/mockChrome';
import MockInitializer from './mock/mockInitializer';
import 'antd/dist/antd.css';
import './index.css';

ReactDOM.render(
    <TabTree
        chrome={new MockChrome()}
        initializer={new MockInitializer()}
    />,
    document.getElementById('root')
);