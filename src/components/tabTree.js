import React from 'react';
import TabTreeView from './tabTreeView';
import Initializer from '../util/initializer';
import TabTreeNode from '../util/TabTreeNode';

export default class TabTree extends React.Component {
    constructor(props) {
        super(props);
        const initalRootNode = new TabTreeNode();
        this.state = {
            rootNode: initalRootNode
        }
        // this.initializer = this.props.initializer;
        this.refreshRootNode();
        this.props.chrome.tabs.onUpdated.addListener(this.onTabUpdate);
        this.props.chrome.tabs.onRemoved.addListener(this.onTabRemoved);
    }

    refreshRootNode = () => {
        let initializer = new Initializer(this.props.chrome);
        initializer.getTree().then((rootNode) => {
            this.setState({
                rootNode: rootNode
            });
        });
    }

    onTabUpdate = (tabId, changeInfo, tab) => {
        let rootNode = this.state.rootNode;
        if (changeInfo.title) {
            rootNode.setTitleById(tabId, changeInfo.title);
            this.setState({
                rootNode: rootNode
            });
        }
        if (changeInfo.favIconUrl) {
            rootNode.setFavIconUrlById(tabId, changeInfo.favIconUrl);
            this.setState({
                rootNode: rootNode
            });
        }

        if (changeInfo.status) {
            rootNode.setStatusById(tabId, changeInfo.status);
            this.setState({
                rootNode: rootNode
            });
        }
    }

    onTabRemoved = (tabId, removeInfo) => {
        this.refreshRootNode();
    }

    onClosedButtonClick = (tab) => {
        this.props.chrome.tabs.remove(tab.id, () => {
            //TODO: check why this callback is not ensured to call AFTER removed.
            // this.refreshRootNode();
        })
    }

    onContainerClick = (tab) => {
        this.props.chrome.tabs.update(tab.id, {
            active: true
        })
    }

    render() {
        return (
            <TabTreeView
                rootNode={this.state.rootNode}
                onContainerClick={this.onContainerClick}
                onClosedButtonClick={this.onClosedButtonClick}
            />
        )
    }
}