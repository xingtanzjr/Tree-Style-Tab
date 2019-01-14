import React from 'react';
import TabItemView from './tabItemView';

export default class TabTreeView extends React.Component {

    constructor(props) {
        super(props);
        this.selfRef = React.createRef();
    }

    renderChildren(tNode) {
        if (tNode.children.length === 0) {
            return null;
        }
        return tNode.children.map((child) => {
            return this.renderTabTreeNode(child);
        })
    }

    onTabItemSelected = (rect) => {
        let selfRect = this.selfRef.current.getBoundingClientRect();
        if (rect.bottom > selfRect.bottom) {
            this.selfRef.current.scrollTop += (rect.bottom - selfRect.bottom);
        } else if (rect.top < selfRect.top) {
            this.selfRef.current.scrollTop -= (selfRect.top - rect.top);
        }
    }

    renderTabTreeNode(tNode) {
        return (
            <TabItemView
                onTabItemSelected={this.onTabItemSelected}
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
            <div className="tabTreeView" ref={this.selfRef}>
                {this.renderChildren(this.props.rootNode)}
            </div>
        )
    }
}