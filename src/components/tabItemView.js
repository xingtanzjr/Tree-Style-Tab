import React from 'react';
import Icon from 'antd/lib/icon';
import HighligthLabel from './highlightLabel';
import 'antd/lib/icon/style/css';

class TabItemIcon extends React.Component {
    render() {
        let tab = this.props.tab;
        if (tab.status === 'loading') {
            return (
                <Icon type="loading" className="front-icon" />
            )
        } else {
            if (tab.favIconUrl) {
                return (
                    <img width="16px" src={tab.favIconUrl} alt="" />
                );
            } else if (tab.isBookmark) {
                return (
                    <Icon type="star" className="front-icon" theme="twoTone" twoToneColor="#ffbf2b"/>
                )
            } else {
                return (
                    <Icon type="folder" className="front-icon" />
                )
            }
        }

        //TODO: to identify the relationship between tab's status and tab's favIconUrl
        // if (tab.favIconUrl) {
        //     return (
        //         <img src={tab.favIconUrl} alt="" />
        //     );
        // } else if (tab.status === 'loading') {
        //     return (
        //         <Icon type="loading" className="front-icon" />
        //     )
        // } else {
        //     return (
        //         <Icon type="folder" className="front-icon" />
        //     )
        // }
    }
}

class TabItemTitle extends React.Component {
    //TODO: we can add keyword bold here
    render() {
        const className = "title" + (this.props.tab.active ? " active" : "");
        if (!this.props.tab.title) {
            return <HighligthLabel className={className}>loading...</HighligthLabel>
        }
        return (
            <HighligthLabel className={className} keyword={this.props.keyword}>{this.props.tab.title}</HighligthLabel>
        )
    }
}

class TabItemUrl extends React.Component {
    render() {
        return <HighligthLabel className="url" keyword={this.props.keyword}>{this.props.tab.url}</HighligthLabel>
    }
}

class TabItemControl extends React.Component {
    render() {
        if (this.props.visible) {
            return (
                <Icon type="close" className="closeTabButton" onClick={this.props.onClosedButtonClick} />
                // <Button shape="circle" icon="minus" size="small"/>
            )
        } else {
            return null;
        }
    }
}

export default class TabItemView extends React.Component {

    constructor(props) {
        super(props)
        this.selfRef = React.createRef();
    }

    getChildren() {
        if (this.props.children) {
            return (
                <div className="fake-ul treeParent">
                    {this.props.children}
                </div>
            )
        }
        return null;
    }

    onSelected = () => {
        if (this.selected() && this.props.onTabItemSelected) {
            this.props.onTabItemSelected(this.selfRef.current.getBoundingClientRect())
        }
    }

    componentDidMount() {

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
                    <TabItemControl visible={!this.props.tab.isBookmark} onClosedButtonClick={() => { this.props.onClosedButtonClick(this.props.tab) }} />
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

