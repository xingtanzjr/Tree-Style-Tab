import React from 'react';
import TabTreeView from './TabTreeView';
import TabTreeNode from '../util/TabTreeNode';
import { Input } from 'antd';
import TabSequenceHelper from '../util/TabSequenceHelper';

const MAX_SHOW_BOOKMARK_COUNT = 30;

export default class TabTree extends React.Component {
    constructor(props) {
        super(props);
        this.initializer = this.props.initializer;
        const initialRootNode = new TabTreeNode();
        const bookmarkRootNode = new TabTreeNode();
        this.state = {
            selectedTab: { id: -1 },
            keyword: "",
            rootNode: initialRootNode,
            bookmarkRootNode: bookmarkRootNode,
        };
        this.searchFieldRef = React.createRef();
        this.selfRef = React.createRef();
        this.tabSequenceHelper = new TabSequenceHelper(initialRootNode, bookmarkRootNode, new TabTreeNode());
        this.altKeyDown = false;
        this.searchInputInComposition = false;
    }

    onKeyDown = (e) => {
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
        const selectedTab = this.tabSequenceHelper.getNextTab();
        if (selectedTab) {
            this.setState({ selectedTab });
        }
    }

    focusPrevTabItem = () => {
        const selectedTab = this.tabSequenceHelper.getPreviousTab();
        if (selectedTab) {
            this.setState({ selectedTab });
        }
    }

    componentDidMount() {
        this.props.chrome.tabs.onUpdated.addListener(this.onTabUpdate);
        this.props.chrome.tabs.onRemoved.addListener(this.onTabRemoved);
        this.refreshRootNode();
        this.focusSearchField();
        document.addEventListener('keydown', this.onKeyDown, false);
        document.addEventListener('keyup', this.onKeyUp, false);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.onKeyDown, false);
        document.removeEventListener('keyup', this.onKeyUp, false);
    }

    componentDidUpdate(prevProps, prevState) {
        // Update tab sequence when state changes
        if (prevState.rootNode !== this.state.rootNode ||
            prevState.bookmarkRootNode !== this.state.bookmarkRootNode ||
            prevState.selectedTab !== this.state.selectedTab) {
            this.updateTabSequence();
        }
    }

    focusSearchField = () => {
        this.searchFieldRef.current.focus();
    }

    blurSearchField = () => {
        this.searchFieldRef.current.blur();
    }

    refreshRootNode = async (keyword = undefined) => {
        try {
            const rootNode = await this.initializer.getTree(keyword);
            const activeTab = await this.initializer.getActiveTab();
            const bookmarkRootNode = this.getTopNBookmarks(await this.initializer.getBookmarks(keyword), MAX_SHOW_BOOKMARK_COUNT);
            
            this.setState({
                rootNode,
                bookmarkRootNode,
                selectedTab: keyword ? { id: -1 } : activeTab,
            });
        } catch (error) {
            console.error('Failed to refresh root node:', error);
        }
    }

    updateTabSequence = () => {
        this.tabSequenceHelper.refreshQueue(this.state.rootNode, this.state.bookmarkRootNode, new TabTreeNode());
        this.tabSequenceHelper.setCurrentIdx(this.state.selectedTab);
    }

    getTopNBookmarks = (bookmarkRootNode, count) => {
        if (bookmarkRootNode.children.length > count) {
            const cloned = bookmarkRootNode.clone();
            cloned.children = cloned.children.slice(0, count);
            return cloned;
        }
        return bookmarkRootNode;
    }

    onTabUpdate = (tabId, changeInfo, tab) => {
        let newRootNode = this.state.rootNode;
        
        if (changeInfo.title) {
            newRootNode = newRootNode.updateTitleById(tabId, changeInfo.title);
        }
        if (changeInfo.favIconUrl) {
            newRootNode = newRootNode.updateFavIconUrlById(tabId, changeInfo.favIconUrl);
        }
        if (changeInfo.status) {
            newRootNode = newRootNode.updateStatusById(tabId, changeInfo.status);
        }
        
        if (newRootNode !== this.state.rootNode) {
            this.setState({ rootNode: newRootNode });
        }
    }

    onTabRemoved = (tabId, removeInfo) => {
        this.refreshRootNode(this.state.keyword);
    }

    onCloseAllTabs = (tNode) => {
        if (!tNode) return;
        const tabIds = tNode.getAllTabIds();
        if (tabIds.length === 0) return;
        
        this.props.chrome.tabs.remove(tabIds, () => {
            // Tab removal handled by onTabRemoved listener
        });
    }

    onClosedButtonClick = (tab) => {
        if (!tab || !tab.id) return;
        this.props.chrome.tabs.remove(tab.id);
    }

    onContainerClick = (tab) => {
        if (this.noTabSelected(tab)) {
            this.searchByGoogle(this.state.keyword);
        } else if (tab.isBookmark) {
            this.props.chrome.tabs.create({ url: tab.url });
        } else if (tab.isGoogleSearch) {
            this.searchByGoogle(tab.title);
        } else {
            this.props.chrome.tabs.update(tab.id, { active: true });
        }
    }

    noTabSelected = (tab) => {
        return !tab || tab.id === -1;
    }

    searchByGoogle = (query) => {
        if (!query || query.trim() === '') return;
        const encodedQuery = encodeURIComponent(query);
        const url = `https://www.google.com/search?q=${encodedQuery}`;
        this.props.chrome.tabs.create({ url });
    }

    onSearchTextChanged = (e) => {
        const keyword = this.normalizeString(e.target.value);
        this.setState({ keyword });
        this.refreshRootNode(keyword);
    }

    normalizeString = (str) => {
        return str.replace(/\\/g, '\\\\');
    }

    onTabItemSelected = (rect) => {
        const selfRect = this.selfRef.current.getBoundingClientRect();
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
        return this.state.rootNode.children.length === 0 && 
               this.state.bookmarkRootNode.children.length === 0;
    }

    showBookmarks = () => {
        return this.state.bookmarkRootNode.children.length > 0;
    }
    
    showBookmarkTitle = () => {
        return this.state.rootNode.children.length > 0;
    }

    render() {
        const inputPlaceholder = 'Filter' + ' '.repeat(108) + '↑ and ↓ to select         ⏎ to switch/search';

        return (
            <div className="outContainer">
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
                    
                    {this.showBookmarks() && (
                        <div>
                            {this.showBookmarkTitle() && (
                                <div className="splitLabel">
                                    <span>Bookmark & Search</span>
                                </div>
                            )}
                            <TabTreeView
                                onTabItemSelected={this.onTabItemSelected}
                                selectedTabId={this.state.selectedTab.id}
                                rootNode={this.state.bookmarkRootNode}
                                onContainerClick={this.onContainerClick}
                                keyword={this.state.keyword}
                            />
                        </div>
                    )}
                    
                    {this.showSearchTip() && (
                        <div className="operationTip">
                            <span className="kbd">ENTER</span>
                            <span> to search on the Internet</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}