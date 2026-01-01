import React from 'react';
import { Button } from 'antd';
import { FolderOutlined, StarFilled, LoadingOutlined, SearchOutlined } from '@ant-design/icons';
import HighlightLabel from './HighlightLabel';

class TabItemIcon extends React.Component {
    render() {
        const { tab } = this.props;
        
        if (tab.status === 'loading') {
            return <LoadingOutlined className="front-icon" />;
        }
        
        if (tab.favIconUrl) {
            return <img width="16px" src={tab.favIconUrl} alt="" />;
        }
        
        if (tab.isBookmark) {
            return <StarFilled className="front-icon" style={{ color: '#FFC107' }} />;
        }
        
        if (tab.isGoogleSearch) {
            return <SearchOutlined className="front-icon" />;
        }
        
        return <FolderOutlined className="front-icon" />;
    }
}

class TabItemTitle extends React.Component {
    render() {
        const className = "title" + (this.props.tab.active ? " active" : "");
        if (!this.props.tab.title) {
            return <HighlightLabel className={className}>loading...</HighlightLabel>;
        }
        if (this.props.tab.isGoogleSearch) {
            return <span className="searchItem">{this.props.tab.title}</span>;
        }
        return (
            <HighlightLabel className={className} keyword={this.props.keyword}>
                {this.props.tab.title}
            </HighlightLabel>
        );
    }
}

class TabItemUrl extends React.Component {
    render() {
        const className = "url" + (this.props.tab.active ? " active" : "");
        return (
            <HighlightLabel className={className} keyword={this.props.keyword}>
                {this.props.tab.url}
            </HighlightLabel>
        );
    }
}

class TabItemControl extends React.Component {
    render() {
        if (this.props.show) {
            return (
                <div className="closeTabControl">
                    <span className="closeTabTip"><span className="kbd">Alt</span> + <span className="kbd">w</span> to close Sub-Tabs</span>
                    <span className="closeTabButton">
                        <Button className="kbd" size="small" onClick={this.props.onClosedButtonClick}>Close Sub-Tabs</Button>
                    </span>
                </div>
            )
        } else {
            return null;
        }
    }
}

class TreeParentSideLine extends React.Component {
    render() {
        const style = {
            minHeight: `${this.props.height}px`,
        };

        return <div className="vertical-line" style={style} />;
    }
}

export class TabItemView extends React.Component {

    constructor(props) {
        super(props);
        this.selfRef = React.createRef();
        this.state = {
            sideLineHeight: 0,
        };
    }

    getChildren() {
        if (this.props.children) {
            return (
                <div className="fake-ul treeParent">
                    <TreeParentSideLine height={this.getSidelineHeight()} />
                    {this.props.children}
                </div>
            );
        }
        return null;
    }

    getSidelineHeight() {
        if (this.itemHeight) {
            const directChildrenCount = this.props.node.children.length;
            const allChildrenCount = this.getAllChildrenCount(this.props.node);
            const lastBranchChildrenCount = 1 + this.getAllChildrenCount(this.props.node.children[directChildrenCount - 1]);
            const height = this.itemHeight;
            return (allChildrenCount - lastBranchChildrenCount) * height + height / 2;
        }
        return 0;
    }

    getAllChildrenCount(node) {
        if (node.children.length === 0) {
            return 0;
        }
        let count = node.children.length;
        for (let i = 0; i < node.children.length; i++) {
            count += this.getAllChildrenCount(node.children[i]);
        }
        return count;
    }

    onSelected = () => {
        if (this.selected() && this.props.onTabItemSelected) {
            this.props.onTabItemSelected(this.selfRef.current.getBoundingClientRect())
        }
    }

    updateSidelineLength = () => {
        if (this.props.node.children && this.props.node.children.length > 0) {
            this.setState({
                sideLineHeight: this.getSidelineHeight(),
            });
        }
    }

    componentDidMount() {
        this.itemHeight = this.selfRef.current.getBoundingClientRect().height;
        this.updateSidelineLength();
    }

    componentDidUpdate() {
        this.onSelected();
    }

    selected = () => {
        return this.props.selectedTabId && this.props.selectedTabId === this.props.tab.id;
    }

    render() {
        return (
            <div className="fake-li">
                <div className={this.selected() ? "container selected" : "container"} ref={this.selfRef}>
                    <div className="icon-container" onClick={() => { this.props.onContainerClick(this.props.tab) }}>
                        <TabItemIcon tab={this.props.tab} />
                    </div>
                    <TabItemControl show={!this.props.tab.isBookmark} onClosedButtonClick={() => { this.props.onClosedButtonClick(this.props.node) }} />
                    <div className="content-container" onClick={() => { this.props.onContainerClick(this.props.tab) }}>
                        <TabItemTitle tab={this.props.tab} keyword={this.props.keyword} />
                        <TabItemUrl tab={this.props.tab} keyword={this.props.keyword} />
                    </div>
                </div>
                {this.getChildren()}
            </div>
        )
    }
}

export class SearchItemView extends TabItemView {
    render() {
        return (
            <div className="fake-li">
                <div className={this.selected() ? "container selected" : "container"} ref={this.selfRef}>
                    <div className="icon-container" onClick={() => { this.props.onContainerClick(this.props.tab) }}>
                        <TabItemIcon tab={this.props.tab} />
                    </div>
                    <div className="content-container" onClick={() => { this.props.onContainerClick(this.props.tab) }}>
                        <TabItemTitle tab={this.props.tab} keyword={this.props.keyword} />
                    </div>
                </div>
                {this.getChildren()}
            </div>
        )
    }
}

