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
        let initializer = new Initializer(this.props.chrome);
        initializer.getTree().then((rootNode) => {
            this.setState({
                rootNode: rootNode
            });
        });
        this.props.chrome.tabs.onUpdated.addListener(this.getOnUpdateCallback());
    }

    getOnUpdateCallback() {
        return (tabId, changeInfo, tab) => {
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
    }

    render() {

        const onContainerClick = (tab) => {
            this.props.chrome.tabs.update(tab.id, {
                active: true
            })
        }

        return (
            <TabTreeView
                rootNode={this.state.rootNode}
                onContainerClick={onContainerClick}
            />
        )
    }
}