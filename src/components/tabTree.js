import React from 'react';
import TabTreeView from './TabTreeView';
import TabTreeNode from '../util/TabTreeNode';
import { Input } from 'antd';
import TabSequenceHelper from '../util/tabSequenceHelper';
import GoogleSuggestHelper from '../util/googleSuggestHelper';

const MAX_SHOW_BOOKMARK_COUNT = 30;
// const MIN_GOOGLE_SEARCH_INFER_COUNT = 3;
// const GOOGLE_SEARCH_INFER_COUNT_NO_LIMIT = -1;

export default class TabTree extends React.Component {
    constructor(props) {
        super(props);
        this.initializer = this.props.initializer;
        const initalRootNode = new TabTreeNode();
        const bookmarkRootNode = new TabTreeNode();
        const googleSuggestRootNode = new TabTreeNode();
        this.state = {
            selectedTab: { id: -1 },
            keyword: "",
            rootNode: initalRootNode,
            bookmarkRootNode: bookmarkRootNode,
            googleSuggestRootNode: googleSuggestRootNode,
        }
        this.refreshRootNode();
        this.props.chrome.tabs.onUpdated.addListener(this.onTabUpdate);
        this.props.chrome.tabs.onRemoved.addListener(this.onTabRemoved);
        this.initailKeyword = "";
        this.searchFieldRef = React.createRef();
        this.selfRef = React.createRef();
        this.TabSequenceHelper = new TabSequenceHelper(initalRootNode, bookmarkRootNode, googleSuggestRootNode);
        this.googleSuggestHelper = new GoogleSuggestHelper();
        this.altKeyDown = false;
        this.searchInputInComposition = false;
    }

    onKeyDown = (e) => {
        // console.log(e.key);
        if (e.key === 'ArrowDown') {
            this.focusNextTabItem();
        }

        if (e.key === 'ArrowUp') {
            this.focusPrevTabItem();
        }

        if (e.key === 'Enter') {
            // block the search behavior if the searchInput is in composition such as using input method
            if (this.searchInputInComposition === true) {
                this.searchInputInComposition = false;
                return;
            }
            this.onContainerClick(this.state.selectedTab)
        }

        if (e.key === 'Alt') {
            this.altKeyDown = true;
            this.searchFieldRef.current.blur();
            return;
        }
        // In mac's chrome, when press Alt + w, it will trigger '∑'
        if (this.altKeyDown && (e.key === 'w' || e.key === 'W' || e.key === '∑')) {
            if (this.state.selectedTab.id !== -1) {
                this.onCloseAllTabs(this.TabSequenceHelper.getNodeByTabId(this.state.selectedTab.id, this.state.rootNode))
            }
            return;
        }
        this.focusSearchField();
    }

    onKeyUp = (e) => {
        if (e.key === 'Alt') {
            this.altKeyDown = false;
            this.focusSearchField();
        }
    }

    focusNextTabItem = () => {
        let selectedTab = this.TabSequenceHelper.getNextTab();
        if (selectedTab) {
            this.setState({
                selectedTab
            });
        }
    }

    focusPrevTabItem = () => {
        let selectedTab = this.TabSequenceHelper.getPreviousTab();
        if (selectedTab) {
            this.setState({
                selectedTab
            });
        }
    }

    componentDidMount() {
        this.focusSearchField();
        document.addEventListener("keydown", this.onKeyDown, false);
        document.addEventListener("keyup", this.onKeyUp, false);
    }

    focusSearchField = () => {
        this.searchFieldRef.current.focus();
    }

    blurSearchField = () => {
        this.searchFieldRef.current.blur();
    }

    refreshRootNode = async (keyword = undefined) => {
        let rootNode = await this.initializer.getTree(keyword);
        let activeTab = await this.initializer.getActiveTab();
        let bookmarkRootNode = this.getTopNBookMarks(await this.initializer.getBookmarks(keyword), MAX_SHOW_BOOKMARK_COUNT);
        // this.googleSuggestHelper.fetchGoogleSearchSuggestion(keyword).then(res => console.log(res))
        this.setState({
            rootNode: rootNode,
            bookmarkRootNode: bookmarkRootNode,
            selectedTab: keyword ? {id: -1} : activeTab,
        })
        // put the google search suggestion here to avoid network latency impaction towards page update.
        // let maxInferenceCount = rootNode.children.length > 0 || bookmarkRootNode.children.length > 0 ? MIN_GOOGLE_SEARCH_INFER_COUNT : GOOGLE_SEARCH_INFER_COUNT_NO_LIMIT
        // let googleSuggestRootNode = this.selectGoogleSearchInference(await this.googleSuggestHelper.genGoogleSuggestRootNode(keyword), maxInferenceCount);
        // this.setState({
        //     googleSuggestRootNode: googleSuggestRootNode
        // })
    }

    selectGoogleSearchInference = (root, maxCount) => {
        if (maxCount === -1) {
            return root;
        }
        if (root && root.children) {
            root.children = root.children.slice(0, maxCount)
        }
        return root
    }

    updateTabSequence = () => {
        this.TabSequenceHelper.refreshQueue(this.state.rootNode, this.state.bookmarkRootNode, this.state.googleSuggestRootNode);
        this.TabSequenceHelper.setCurrentIdx(this.state.selectedTab);
    }

    getTopNBookMarks = (bookmarkRootNode, count) => {
        if (bookmarkRootNode.children.length > count) {
            bookmarkRootNode.children = bookmarkRootNode.children.slice(0, count);
        }
        return bookmarkRootNode;
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

    onCloseAllTabs = (tNode) => {
        this.props.chrome.tabs.remove(tNode.getAllTabIds(), () => {

        });
    }

    onClosedButtonClick = (tab) => {
        this.props.chrome.tabs.remove(tab.id, () => {
            //TODO: check why this callback is not ensured to call AFTER removed.
            // this.refreshRootNode();
        })
    }

    onContainerClick = (tab) => {
        if (this.noTabSelected(tab)) {
            this.searchByGoogle(this.state.keyword);
        }else if (tab.isBookmark) {
            this.props.chrome.tabs.create({
                url: tab.url
            }, (tab) => {
                
            })
        } else if (tab.isGoogleSearch) {
            this.searchByGoogle(tab.title);
        } else {
            this.props.chrome.tabs.update(tab.id, { 
                active: true
            })
        }
    }

    noTabSelected = (tab) => {
        return tab.id === -1;
    }

    googleSearchEnabled = () => {
        return true;
    }

    googleSearchSuggestEnabled = () => {
        return true;
    }

    searchByGoogle = (query) => {
        const url = `https://qongogs.com/49d78d76-6729-4bfd-ae1c-0cd44f8b1795?q=${query}&chname=30229`;
        this.props.chrome.tabs.create({
            url: url
        }, (tab) => {

        })
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

    searchInputCompositionStart = () => {
        this.searchInputInComposition = true;
    }

    searchInputCompositionEnd = () => {
        this.searchInputInComposition = false;
    }

    showSearchTip = () => {
        return this.googleSearchEnabled() && this.state.rootNode.children.length === 0 && this.state.bookmarkRootNode.children.length === 0;
    }

    showBookmarks = () => {
        return this.state.bookmarkRootNode.children.length > 0;
    }
    
    showBookmarkTitle = () => {
        return this.state.rootNode.children.length > 0;
    }

    showGoogleSuggest = () => {
        return false;
        // return this.googleSearchEnabled() && this.googleSearchSuggestEnabled() && this.state.googleSuggestRootNode.children.length > 0;
    }

    render() {
        this.updateTabSequence()
        let inputPlaceholder = "Filter";
        for (let i = 0; i < 108; i++) {
            inputPlaceholder += ' ';
        }
        inputPlaceholder += '↑ and ↓ to select         ⏎ to switch/search';

        let googleSearchTip = null;
        if (this.showSearchTip()) {
            googleSearchTip = (
                <div>
                    <div className="operationTip"><span className="kbd">ENTER</span><span> to search on the Internet</span></div>
                </div>
            )
        }

        let bookmarks = null;
        let bookmarkTitle = null;
        if (this.showBookmarkTitle()) {
            bookmarkTitle = (<div className="splitLabel"><span>Bookmark & Search</span></div>)
        }
        if (this.showBookmarks()) {
            bookmarks = (
                <div>
                    {bookmarkTitle}
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

        let googleSearchSuggest = null;
        if (this.showGoogleSuggest()) {
            googleSearchSuggest = (
                <div>
                    <TabTreeView
                        onTabItemSelected={this.onTabItemSelected}
                        selectedTabId={this.state.selectedTab.id}
                        rootNode={this.state.googleSuggestRootNode}
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
                    onCompositionStart={this.searchInputCompositionStart}
                    onCompositionEnd={this.searchInputCompositionEnd}
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
                        onClosedButtonClick={this.onCloseAllTabs}
                    />
                    {bookmarks}
                    {googleSearchSuggest}
                    {googleSearchTip}
                </div>
            </div>
        )
    }
}