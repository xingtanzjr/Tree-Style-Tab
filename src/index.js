/*global chrome*/
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Initializer from './initializer';

class TabList extends React.Component {

    renderList(data) {
        return data.map((item, index) => {
            return (
                <TabListItem
                    onClick={this.props.onClick}
                    tab={item}
                />
            );
        });
    }

    render() {
        return (
            <ul>
                {this.renderList(this.props.tabs)}
            </ul>
        );
    }
}

class TabListItem extends React.Component {
    render() {
        return (
            <li onClick={() => this.props.onClick(this.props.tab.id)}>
                {this.props.tab.title}
            </li>
        );
    }
}

let onTabItemClick = (id) => {
    chrome.tabs.update(id, {
        active: true
    })
}

let initializer = new Initializer(chrome);
initializer.getTablist().then((tabs) => {
    ReactDOM.render(
        <TabList
            tabs={tabs}
            onClick={onTabItemClick}
        />,
        document.getElementById('root')
    );
});

