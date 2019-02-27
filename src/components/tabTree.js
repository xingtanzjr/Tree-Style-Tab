import React from 'react';
import TabTreeView from './TabTreeView';
import TabTreeNode from '../util/TabTreeNode';
import Input from 'antd/lib/input';
import TabSequenceHelper from '../util/tabSequenceHelper';
import 'antd/lib/input/style/css';
export default class TabTree extends React.Component {
    constructor(props) {
        super(props);
        this.initializer = this.props.initializer;
        const initalRootNode = new TabTreeNode();
        this.state = {
            selectedTabId: -1,
            keyword: "",
            rootNode: initalRootNode
        }
        this.refreshRootNode();
        this.props.chrome.tabs.onUpdated.addListener(this.onTabUpdate);
        this.props.chrome.tabs.onRemoved.addListener(this.onTabRemoved);
        this.initailKeyword = "";
        this.searchFieldRef = React.createRef();
        this.selfRef = React.createRef();
        this.TabSequenceHelper = new TabSequenceHelper(initalRootNode);
    }

    onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            this.focusNextTabItem();
        }

        if (e.key === 'ArrowUp') {
            this.focusPrevTabItem();
        }

        if (e.key === 'Enter') {
            this.onContainerClick({
                id: this.state.selectedTabId
            })
        }

        this.focusSearchField();
    }

    focusNextTabItem = () => {
        let selectedTabId = this.TabSequenceHelper.getNextTabId();
        this.setState({
            selectedTabId
        });
    }

    focusPrevTabItem = () => {
        let selectedTabId = this.TabSequenceHelper.getPreviousTabId();
        this.setState({
            selectedTabId
        });
    }

    componentDidMount() {
        this.focusSearchField();
        document.addEventListener("keydown", this.onKeyDown, false);
    }

    focusSearchField = () => {
        this.searchFieldRef.current.focus();
    }

    refreshRootNode = (keyword = undefined) => {
        this.initializer.getTree(keyword).then((rootNode) => {
            this.TabSequenceHelper.refreshQueue(rootNode);
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
        this.refreshRootNode(this.state.keyword);
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

    onSearchTextChanged = (e) => {
        let keyword = e.target.value;
        if (e.target.value.length <= 1) {
            keyword = this.initailKeyword;
        }
        this.setState({
            keyword,
        });
        this.refreshRootNode(keyword);
    }

    /* used when let scrollbar in whole window*/ 
    // onTabItemSelected = (rect) => {
    //     let selfRect = this.selfRef.current.getBoundingClientRect();

    //     if (rect.bottom > selfRect.height) {
    //         this.selfRef.current.scrollTop += (rect.bottom - selfRect.height);
    //     } else if (rect.top < 0) {
    //         this.selfRef.current.scrollTop -= (-rect.top);
    //     }

    //     // let x = rect.y + rect.height;

    //     // if (x > currentScrollTop + selfRect.height) {
    //     //     this.selfRef.current.scrollTop = x - selfRect.height;
    //     // } else if (x < currentScrollTop) {
    //     //     this.selfRef.current.scrollTop = rect.y;
    //     // }
    // }

    render() {
        let inputPlaceholder = "Search";
        for (let i = 0; i < 130; i++) {
            inputPlaceholder += ' ';
        }
        inputPlaceholder += '↑ and ↓ to select   ⏎ to GO';
        return (
            <div className="outContainer" ref={this.selfRef}>
                <Input
                    onChange={this.onSearchTextChanged}
                    ref={this.searchFieldRef}
                    placeholder={inputPlaceholder}
                />
                <TabTreeView
                    // onTabItemSelected={this.onTabItemSelected}
                    selectedTabId={this.state.selectedTabId}
                    rootNode={this.state.rootNode}
                    keyword={this.state.keyword}
                    onContainerClick={this.onContainerClick}
                    onClosedButtonClick={this.onClosedButtonClick}
                />
            </div>
        )
    }
}