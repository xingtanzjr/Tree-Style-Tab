import React from 'react';
import Tree from 'antd/lib/tree'
import 'antd/lib/tree/style/css'

const { TreeNode } = Tree;

class TabTreeView extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            rootNode : this.props.rootNode
        }
    }

    renderChildren(tNode) {
        if (tNode.children.length === 0) {
            return null;
        }
        return tNode.children.map((child) => {
            return this.renderTabTreeNode(child);
        })
    }

    renderTabTreeNode(tNode) {
        return (
            <TreeNode
                tabId={tNode.tab.id}
                title={tNode.tab.title}
                icon={this.getIcon(tNode)}
            >
                {this.renderChildren(tNode)}
            </TreeNode>
        );

    }

    getIcon(tNode) {
        return (
            <img width="16px" src={tNode.tab.favIconUrl} alt="" />
        );
    }

    render() {

        const treeNodeOnClick = (selectedKeys, e) => {
            this.props.chrome.tabs.update(e.node.props.tabId, {
                active: true
            })
        }

        const highligthCurrentTabNode = (node) => {
            return node.props.tabId === this.props.activeTabId;            
        }

        return (
            <Tree
                showIcon={true}
                defaultExpandAll={true}
                showLine
                defaultExpandedKeys={['0-0-0']}
                onSelect={treeNodeOnClick}
                filterTreeNode={highligthCurrentTabNode}
            >
                {this.renderChildren(this.state.rootNode)}
            </Tree>
        );
    }
}

export default TabTreeView;