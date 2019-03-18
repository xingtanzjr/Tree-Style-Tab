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
        const bookmarkRootNode = new TabTreeNode();
        this.state = {
            selectedTab: { id: -1 },
            keyword: "",
            rootNode: initalRootNode,
            bookmarkRootNode: bookmarkRootNode
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
            this.onContainerClick(this.state.selectedTab)
        }

        this.focusSearchField();
    }

    focusNextTabItem = () => {
        let selectedTab = this.TabSequenceHelper.getNextTab();
        this.setState({
            selectedTab
        });
    }

    focusPrevTabItem = () => {
        let selectedTab = this.TabSequenceHelper.getPreviousTab();
        this.setState({
            selectedTab
        });
    }

    componentDidMount() {
        this.focusSearchField();
        document.addEventListener("keydown", this.onKeyDown, false);
    }

    focusSearchField = () => {
        this.searchFieldRef.current.focus();
    }

    refreshRootNode = async (keyword = undefined) => {
        let rootNode = await this.initializer.getTree(keyword);
        let bookmarkRootNode = await this.initializer.getBookmarks(keyword);
        if (this.showBookmarks()) {
            this.TabSequenceHelper.refreshQueueWithBookmarks(rootNode, bookmarkRootNode);
        } else {
            this.TabSequenceHelper.refreshQueue(rootNode);
        }
        this.setState({
            rootNode: rootNode,
            bookmarkRootNode: bookmarkRootNode
        })

        // this.initializer.getTree(keyword).then((rootNode) => {
        //     this.TabSequenceHelper.refreshQueue(rootNode);
        //     this.setState({
        //         rootNode: rootNode
        //     });
        // });
        // this.initializer.getBookmarks(keyword).then((rootNode) => {
        //     this.setState({
        //         bookmarkRootNode: rootNode
        //     })
        // })
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
        if (tab.isBookmark) {
            this.props.chrome.tabs.create({
                url: tab.url
            }, (tab) => {

            })
        } else {
            this.props.chrome.tabs.update(tab.id, { 
                active: true
            })
        }
    }

    onSearchTextChanged = (e) => {
        let keyword = this.normalizeString(e.target.value);
        /*these codes are used to improve effeciency */
        // if (e.target.value.length <= 1) {
        //     keyword = this.initailKeyword;
        // }
        this.setState({
            keyword,
        });
        this.refreshRootNode(keyword);
    }

    normalizeString(str) {
        return str.replace(/\\/g, "\\\\");
    }

    /* used when let scrollbar in tabTreeViewContainer*/
    onTabItemSelected = (rect) => {
        let selfRect = this.selfRef.current.getBoundingClientRect();
        if (rect.bottom > selfRect.bottom) {
            this.selfRef.current.scrollTop += (rect.bottom - selfRect.bottom);
        } else if (rect.top < selfRect.top) {
            this.selfRef.current.scrollTop -= (selfRect.top - rect.top);
        }
    }

    showBookmarks = () => {
        return this.state.keyword.length > 0 && this.state.bookmarkRootNode.children.length >0;
    }

    render() {
        let inputPlaceholder = "Search";
        for (let i = 0; i < 130; i++) {
            inputPlaceholder += ' ';
        }
        inputPlaceholder += '↑ and ↓ to select   ⏎ to GO';

        let bookmarks = null;
        if (this.showBookmarks()) {
            bookmarks = (
                <div>
                    <div className="splitLabel"><span>Bookmarks</span></div>
                    <TabTreeView
                        onTabItemSelected={this.onTabItemSelected}
                        selectedTabId={this.state.selectedTab.id}
                        rootNode={this.state.bookmarkRootNode}
                        onContainerClick={this.onContainerClick}
                        keyword={this.state.keyword}
                    />
                </div>
            );
        }

        return (
            <div className="outContainer" >
                <Input
                    onChange={this.onSearchTextChanged}
                    ref={this.searchFieldRef}
                    placeholder={inputPlaceholder}
                />
                <div className="tabTreeViewContainer" ref={this.selfRef}>
                    <TabTreeView
                        onTabItemSelected={this.onTabItemSelected}
                        selectedTabId={this.state.selectedTab.id}
                        rootNode={this.state.rootNode}
                        keyword={this.state.keyword}
                        onContainerClick={this.onContainerClick}
                        onClosedButtonClick={this.onClosedButtonClick}
                    />
                    {bookmarks}
                </div>
            </div>
        )
    }
}