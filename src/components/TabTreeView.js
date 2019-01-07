import React from 'react';
import TabItemView from './tabItemView';

export default class TabTreeView extends React.Component {

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
            <TabItemView
                key={tNode.tab.id}
                tab={tNode.tab}
                onContainerClick={this.props.onContainerClick}
                onClosedButtonClick={this.props.onClosedButtonClick}
            >
                {this.renderChildren(tNode)}
            </TabItemView>
        );
    }

    render() {
        return (
            <div className="tabTreeView">
                {this.renderChildren(this.props.rootNode)}
            </div>
        )
    }
}