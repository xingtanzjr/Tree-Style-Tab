import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Input } from 'antd';
import TabTreeView from './TabTreeView';
import TabTreeNode from '../util/TabTreeNode';
import TabSequenceHelper from '../util/TabSequenceHelper';
import DragPreviewLayer from './DragPreviewLayer';

const MAX_SHOW_BOOKMARK_COUNT = 30;

/**
 * Custom hook for keyboard navigation and shortcuts
 */
const useKeyboardNavigation = ({
    tabSequenceHelper,
    selectedTab,
    setSelectedTab,
    onContainerClick,
    onCloseAllTabs,
    rootNode,
    searchFieldRef,
    searchInputInComposition,
    collapsedTabs,
    onToggleCollapse,
}) => {
    const altKeyDownRef = useRef(false);

    const focusNextTabItem = useCallback(() => {
        const next = tabSequenceHelper.getNextTab();
        if (next) setSelectedTab(next);
    }, [tabSequenceHelper, setSelectedTab]);

    const focusPrevTabItem = useCallback(() => {
        const prev = tabSequenceHelper.getPreviousTab();
        if (prev) setSelectedTab(prev);
    }, [tabSequenceHelper, setSelectedTab]);

    const focusSearchField = useCallback(() => {
        searchFieldRef.current?.focus();
    }, [searchFieldRef]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusNextTabItem();
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                focusPrevTabItem();
            }

            // Left arrow: collapse current node or go to parent
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (selectedTab.id !== -1) {
                    const node = tabSequenceHelper.getNodeByTabId(selectedTab.id, rootNode);
                    const hasChildren = node?.children?.length > 0;
                    const isCollapsed = collapsedTabs?.has(selectedTab.id);
                    
                    if (hasChildren && !isCollapsed) {
                        // Collapse if expanded and has children
                        onToggleCollapse?.(selectedTab.id);
                    } else {
                        // Go to parent node
                        const parentTab = tabSequenceHelper.getParentTab(selectedTab.id, rootNode);
                        if (parentTab) {
                            setSelectedTab(parentTab);
                        }
                    }
                }
                return;
            }

            // Right arrow: expand current node or go to first child
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (selectedTab.id !== -1) {
                    const node = tabSequenceHelper.getNodeByTabId(selectedTab.id, rootNode);
                    const hasChildren = node?.children?.length > 0;
                    const isCollapsed = collapsedTabs?.has(selectedTab.id);
                    
                    if (hasChildren && isCollapsed) {
                        // Expand if collapsed and has children
                        onToggleCollapse?.(selectedTab.id);
                    } else if (hasChildren && !isCollapsed) {
                        // Go to first child
                        const firstChild = node.children[0]?.tab;
                        if (firstChild) {
                            setSelectedTab(firstChild);
                        }
                    }
                }
                return;
            }

            if (e.key === 'Enter') {
                if (searchInputInComposition.current) {
                    searchInputInComposition.current = false;
                    return;
                }
                onContainerClick(selectedTab);
            }

            if (e.key === 'Alt') {
                altKeyDownRef.current = true;
                searchFieldRef.current?.blur();
                return;
            }

            // Alt + W to close all tabs
            if (altKeyDownRef.current && (e.key === 'w' || e.key === 'W' || e.key === '∑')) {
                if (selectedTab.id !== -1) {
                    const node = tabSequenceHelper.getNodeByTabId(selectedTab.id, rootNode);
                    onCloseAllTabs(node);
                }
                return;
            }

            focusSearchField();
        };

        const handleKeyUp = (e) => {
            if (e.key === 'Alt') {
                altKeyDownRef.current = false;
                focusSearchField();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [
        focusNextTabItem,
        focusPrevTabItem,
        focusSearchField,
        onContainerClick,
        onCloseAllTabs,
        rootNode,
        selectedTab,
        collapsedTabs,
        onToggleCollapse,
        setSelectedTab,
        tabSequenceHelper,
        searchFieldRef,
        searchInputInComposition,
    ]);

    return { focusSearchField };
};

/**
 * Custom hook for tab data management
 */
const useTabData = (initializer, chrome) => {
    const [rootNode, setRootNode] = useState(() => new TabTreeNode());
    const [bookmarkRootNode, setBookmarkRootNode] = useState(() => new TabTreeNode());
    const [selectedTab, setSelectedTab] = useState({ id: -1 });
    const [keyword, setKeyword] = useState('');

    const getTopNBookmarks = useCallback((bookmarks, count) => {
        if (bookmarks.children.length > count) {
            const cloned = bookmarks.clone();
            cloned.children = cloned.children.slice(0, count);
            return cloned;
        }
        return bookmarks;
    }, []);

    const refreshRootNode = useCallback(async (searchKeyword = undefined) => {
        try {
            const newRootNode = await initializer.getTree(searchKeyword);
            const activeTab = await initializer.getActiveTab();
            const bookmarks = await initializer.getBookmarks(searchKeyword);
            const newBookmarkRootNode = getTopNBookmarks(bookmarks, MAX_SHOW_BOOKMARK_COUNT);

            setRootNode(newRootNode);
            setBookmarkRootNode(newBookmarkRootNode);
            setSelectedTab(searchKeyword ? { id: -1 } : activeTab);
        } catch (error) {
            console.error('Failed to refresh root node:', error);
        }
    }, [initializer, getTopNBookmarks]);

    // Handle tab updates from Chrome
    const onTabUpdate = useCallback((tabId, changeInfo) => {
        setRootNode((prev) => {
            let newNode = prev;
            if (changeInfo.title) {
                newNode = newNode.updateTitleById(tabId, changeInfo.title);
            }
            if (changeInfo.favIconUrl) {
                newNode = newNode.updateFavIconUrlById(tabId, changeInfo.favIconUrl);
            }
            if (changeInfo.status) {
                newNode = newNode.updateStatusById(tabId, changeInfo.status);
            }
            return newNode;
        });
    }, []);

    const onTabRemoved = useCallback(() => {
        refreshRootNode(keyword);
    }, [refreshRootNode, keyword]);

    // Subscribe to Chrome tab events
    useEffect(() => {
        chrome.tabs.onUpdated.addListener(onTabUpdate);
        chrome.tabs.onRemoved.addListener(onTabRemoved);

        return () => {
            // Cleanup listeners if supported
            chrome.tabs.onUpdated.removeListener?.(onTabUpdate);
            chrome.tabs.onRemoved.removeListener?.(onTabRemoved);
        };
    }, [chrome.tabs, onTabUpdate, onTabRemoved]);

    return {
        rootNode,
        bookmarkRootNode,
        selectedTab,
        setSelectedTab,
        keyword,
        setKeyword,
        refreshRootNode,
    };
};

/**
 * Main TabTree component - displays browser tabs in a tree structure
 */
export default function TabTree({ chrome, initializer }) {
    const searchFieldRef = useRef(null);
    const containerRef = useRef(null);
    const searchInputInComposition = useRef(false);

    // Collapsed tabs state - stores Set of collapsed tab IDs
    const [collapsedTabs, setCollapsedTabs] = useState(new Set());

    const {
        rootNode,
        bookmarkRootNode,
        selectedTab,
        setSelectedTab,
        keyword,
        setKeyword,
        refreshRootNode,
    } = useTabData(initializer, chrome);

    // Tab sequence helper for keyboard navigation
    const tabSequenceHelper = useMemo(
        () => new TabSequenceHelper(rootNode, bookmarkRootNode, new TabTreeNode()),
        [rootNode, bookmarkRootNode]
    );

    // Update tab sequence when data changes
    useEffect(() => {
        tabSequenceHelper.refreshQueue(rootNode, bookmarkRootNode, new TabTreeNode());
        tabSequenceHelper.setCurrentIdx(selectedTab);
    }, [rootNode, bookmarkRootNode, selectedTab, tabSequenceHelper]);

    const searchByGoogle = useCallback((query) => {
        if (!query || query.trim() === '') return;
        const encodedQuery = encodeURIComponent(query);
        const url = `https://www.google.com/search?q=${encodedQuery}`;
        chrome.tabs.create({ url });
    }, [chrome.tabs]);

    // Handle tab click
    const onContainerClick = useCallback((tab) => {
        const noTabSelected = !tab || tab.id === -1;
        
        if (noTabSelected) {
            searchByGoogle(keyword);
        } else if (tab.isBookmark) {
            chrome.tabs.create({ url: tab.url });
        } else if (tab.isGoogleSearch) {
            searchByGoogle(tab.title);
        } else {
            chrome.tabs.update(tab.id, { active: true });
        }
    }, [chrome.tabs, keyword, searchByGoogle]);

    // Handle close all tabs in a branch
    const onCloseAllTabs = useCallback((node) => {
        if (!node) return;
        const tabIds = node.getAllTabIds();
        if (tabIds.length === 0) return;
        chrome.tabs.remove(tabIds);
    }, [chrome.tabs]);

    // Handle toggle collapse
    const onToggleCollapse = useCallback((tabId) => {
        setCollapsedTabs(prev => {
            const next = new Set(prev);
            if (next.has(tabId)) {
                next.delete(tabId);
            } else {
                next.add(tabId);
            }
            return next;
        });
    }, []);

    // Handle drag and drop
    const onTabDrop = useCallback(async (draggedTabId, targetTabId, targetTab) => {
        try {
            // Update parent-child relationship
            await initializer.updateTabParent(draggedTabId, targetTabId);
            
            // Move tab in browser to position after target tab
            if (targetTab?.index !== undefined && initializer.moveTab) {
                // Move to position right after the target tab
                await initializer.moveTab(draggedTabId, targetTab.index + 1);
            }
            
            refreshRootNode(keyword);
        } catch (error) {
            console.error('Failed to update tab parent:', error);
        }
    }, [initializer, refreshRootNode, keyword]);

    // Keyboard navigation
    const { focusSearchField } = useKeyboardNavigation({
        tabSequenceHelper,
        selectedTab,
        setSelectedTab,
        onContainerClick,
        onCloseAllTabs,
        rootNode,
        searchFieldRef,
        searchInputInComposition,
        collapsedTabs,
        onToggleCollapse,
    });

    // Initialize on mount
    useEffect(() => {
        refreshRootNode();
        focusSearchField();
    }, [refreshRootNode, focusSearchField]);

    // Handle search text change
    const handleSearchChange = useCallback((e) => {
        const normalizedKeyword = e.target.value.replace(/\\/g, '\\\\');
        setKeyword(normalizedKeyword);
        refreshRootNode(normalizedKeyword);
    }, [setKeyword, refreshRootNode]);

    // Handle tab item selection (scroll into view)
    const onTabItemSelected = useCallback((rect) => {
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        if (rect.bottom > containerRect.bottom) {
            container.scrollTop += rect.bottom - containerRect.bottom;
        } else if (rect.top < containerRect.top) {
            container.scrollTop -= containerRect.top - rect.top;
        }
    }, []);

    const inputPlaceholder = 'Filter' + ' '.repeat(108) + '↑ and ↓ to select         ⏎ to switch/search';

    const showBookmarks = bookmarkRootNode.children.length > 0;
    const showBookmarkTitle = rootNode.children.length > 0;
    const showSearchTip = rootNode.children.length === 0 && bookmarkRootNode.children.length === 0;

    return (
        <DndProvider backend={HTML5Backend}>
            <DragPreviewLayer />
            <div className="outContainer">
                <Input
                    onChange={handleSearchChange}
                    onCompositionStart={() => { searchInputInComposition.current = true; }}
                    onCompositionEnd={() => { searchInputInComposition.current = false; }}
                    ref={searchFieldRef}
                    placeholder={inputPlaceholder}
                />
                <div className="tabTreeViewContainer" ref={containerRef}>
                    <TabTreeView
                        onTabItemSelected={onTabItemSelected}
                        selectedTabId={selectedTab.id}
                        rootNode={rootNode}
                        keyword={keyword}
                        onContainerClick={onContainerClick}
                        onClosedButtonClick={onCloseAllTabs}
                        onTabDrop={onTabDrop}
                        collapsedTabs={collapsedTabs}
                        onToggleCollapse={onToggleCollapse}
                    />

                    {showBookmarks && (
                        <div>
                            {showBookmarkTitle && (
                                <div className="splitLabel">
                                    <span>Bookmark & Search</span>
                                </div>
                            )}
                            <TabTreeView
                                onTabItemSelected={onTabItemSelected}
                                selectedTabId={selectedTab.id}
                                rootNode={bookmarkRootNode}
                                onContainerClick={onContainerClick}
                                keyword={keyword}
                            />
                        </div>
                    )}

                    {showSearchTip && (
                        <div className="operationTip">
                            <span className="kbd">ENTER</span>
                            <span> to search on the Internet</span>
                        </div>
                    )}
                </div>
            </div>
        </DndProvider>
    );
}
