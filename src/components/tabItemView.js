import React from 'react';
import Icon from 'antd/lib/icon';
import HighligthLabel from './highlightLabel';
import 'antd/lib/button/style/css';

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
            } else {
                return (
                    <Icon type="folder" className="front-icon" />
                )
            }
        }
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
        return (
            <Icon type="close" className="closeTabButton" onClick={this.props.onClosedButtonClick} />
            // <Button shape="circle" icon="minus" size="small"/>
        )
    }
}

export default class TabItemView extends React.Component {

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

    render() {
        return (
            <div className="fake-li">
                <div className="container">
                    <div className="icon-container" onClick={() => { this.props.onContainerClick(this.props.tab) }}>
                        <TabItemIcon tab={this.props.tab} />
                    </div>
                    <TabItemControl onClosedButtonClick={() => { this.props.onClosedButtonClick(this.props.tab) }} />
                    <div className="content-container" onClick={() => { this.props.onContainerClick(this.props.tab) }}>
                        <TabItemTitle tab={this.props.tab} keyword={this.props.keyword}/>
                        <TabItemUrl tab={this.props.tab} keyword={this.props.keyword}/>
                    </div>
                </div>
                {this.getChildren()}
            </div>
        )
    }
}

