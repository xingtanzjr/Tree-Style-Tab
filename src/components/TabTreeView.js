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
                onTabItemSelected={this.props.onTabItemSelected}
                selectedTabId={this.props.selectedTabId}
                key={tNode.tab.id}
                tab={tNode.tab}
                keyword={this.props.keyword}
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