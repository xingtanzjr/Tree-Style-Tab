import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Input } from 'antd';
import {
    SearchOutlined, PlusOutlined, EditOutlined, CloseOutlined,
    TagOutlined, FolderOutlined, SaveOutlined, SettingOutlined,
    QuestionCircleOutlined, ExpandOutlined, ShrinkOutlined,
} from '@ant-design/icons';
import TabTreeView from './TabTreeView';
import WorkspaceListView from './WorkspaceListView';
import WorkspacePreviewView from './WorkspacePreviewView';
import WorkspaceToolbar from './WorkspaceToolbar';
import TabTreeNode from '../util/TabTreeNode';
import TabSequenceHelper from '../util/TabSequenceHelper';
import { findNodeByTabId, getSubtreeTabIds, getMaxIndexInSubtree } from '../util/TreeNodeUtils';
import DragPreviewLayer from './DragPreviewLayer';
import useWorkspace from '../hooks/useWorkspace';
import UpgradeGuide from './UpgradeGuide';
import PermissionBanner from './PermissionBanner';
import ContextMenu, { useContextMenu } from './ContextMenu';
import SettingsView from './SettingsView';
import { t } from '../util/i18n';

const MAX_SHOW_BOOKMARK_COUNT = 30;

/**
 * Custom hook to detect input mode (keyboard vs mouse)
 * Adds 'keyboard-mode' or 'mouse-mode' class to body
 */
const useInputMode = () => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only switch to keyboard mode for navigation keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
                document.body.classList.add('keyboard-mode');
                document.body.classList.remove('mouse-mode');
            }
        };

        const handleMouseMove = () => {
            document.body.classList.add('mouse-mode');
            document.body.classList.remove('keyboard-mode');
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousemove', handleMouseMove);

        // Initialize with mouse mode
        document.body.classList.add('mouse-mode');

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.body.classList.remove('keyboard-mode', 'mouse-mode');
        };
    }, []);
};

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
    groupEditingRef,
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
        if (groupEditingRef.current) return;
        searchFieldRef.current?.focus();
    }, [searchFieldRef, groupEditingRef]);

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
            const hasKeyword = searchKeyword && searchKeyword.length > 0;
            const [newRootNode, activeTab, bookmarks] = await Promise.all([
                initializer.getTree(searchKeyword),
                initializer.getActiveTab(),
                hasKeyword
                    ? initializer.getBookmarks(searchKeyword)
                    : Promise.resolve(new TabTreeNode()),
            ]);
            const newBookmarkRootNode = getTopNBookmarks(bookmarks, MAX_SHOW_BOOKMARK_COUNT);

            setRootNode(newRootNode);
            setBookmarkRootNode(newBookmarkRootNode);
            setSelectedTab(hasKeyword ? { id: -1 } : activeTab);
        } catch (error) {
            console.error('Failed to refresh root node:', error);
        }
    }, [initializer, getTopNBookmarks]);

    // Debounced refresh for Chrome events: collapses rapid-fire events
    // (onTabCreated + onStorageChanged + onTabUpdate all fire within ms)
    // into a single rebuild after data has settled, preventing stale async
    // results from overwriting correct ones.
    const refreshTimerRef = useRef(null);
    const keywordRef = useRef(keyword);
    keywordRef.current = keyword;

    const scheduleRefresh = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = setTimeout(() => {
            refreshRootNode(keywordRef.current);
            refreshTimerRef.current = null;
        }, 150);
    }, [refreshRootNode]);

    // Clean up pending timer on unmount
    useEffect(() => {
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);

    // Handle tab property updates (title, favicon, status) with in-place
    // immutable updates for smooth UI, no full tree rebuild needed.
    const onTabUpdate = useCallback((tabId, changeInfo) => {
        setRootNode((prev) => {
            let newNode = prev;
            if (changeInfo.title) {
                newNode = newNode.updateTitleById(tabId, changeInfo.title);
            }
            if (changeInfo.url) {
                newNode = newNode.updateUrlById(tabId, changeInfo.url);
            }
            if (changeInfo.favIconUrl) {
                newNode = newNode.updateFavIconUrlById(tabId, changeInfo.favIconUrl);
            }
            if (changeInfo.status) {
                newNode = newNode.updateStatusById(tabId, changeInfo.status);
            }
            if (changeInfo.active !== undefined) {
                newNode = newNode.updateActiveById(tabId, changeInfo.active);
            }
            return newNode;
        });
    }, []);

    // Subscribe to Chrome tab events — structural changes use debounced refresh
    useEffect(() => {
        chrome.tabs.onUpdated.addListener(onTabUpdate);
        chrome.tabs.onRemoved.addListener(scheduleRefresh);
        chrome.tabs.onCreated.addListener(scheduleRefresh);
        chrome.tabs.onActivated.addListener(scheduleRefresh);
        chrome.tabs.onMoved.addListener(scheduleRefresh);
        chrome.tabs.onAttached.addListener(scheduleRefresh);
        chrome.tabs.onDetached.addListener(scheduleRefresh);

        const onStorageChanged = (changes, areaName) => {
            if (areaName === 'session' && changes.tabParentMap) {
                scheduleRefresh();
            }
        };
        chrome.storage.onChanged.addListener(onStorageChanged);

        // Tab group events
        chrome.tabGroups?.onCreated?.addListener(scheduleRefresh);
        chrome.tabGroups?.onUpdated?.addListener(scheduleRefresh);
        chrome.tabGroups?.onRemoved?.addListener(scheduleRefresh);

        return () => {
            chrome.tabs.onUpdated.removeListener?.(onTabUpdate);
            chrome.tabs.onRemoved.removeListener?.(scheduleRefresh);
            chrome.tabs.onCreated.removeListener?.(scheduleRefresh);
            chrome.tabs.onActivated.removeListener?.(scheduleRefresh);
            chrome.tabs.onMoved.removeListener?.(scheduleRefresh);
            chrome.tabs.onAttached.removeListener?.(scheduleRefresh);
            chrome.tabs.onDetached.removeListener?.(scheduleRefresh);
            chrome.storage.onChanged.removeListener?.(onStorageChanged);
            chrome.tabGroups?.onCreated?.removeListener?.(scheduleRefresh);
            chrome.tabGroups?.onUpdated?.removeListener?.(scheduleRefresh);
            chrome.tabGroups?.onRemoved?.removeListener?.(scheduleRefresh);
        };
    }, [chrome.tabs, chrome.storage, chrome.tabGroups, onTabUpdate, scheduleRefresh]);

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
export default function TabTree({ chrome, initializer, panelMode = 'popup' }) {
    const searchFieldRef = useRef(null);
    const containerRef = useRef(null);
    const searchInputInComposition = useRef(false);
    const groupEditingRef = useRef(false);

    const onGroupEditingChange = useCallback((isEditing) => {
        groupEditingRef.current = isEditing;
    }, []);

    // Track input mode (keyboard vs mouse) for CSS styling
    useInputMode();

    const {
        rootNode,
        bookmarkRootNode,
        selectedTab,
        setSelectedTab,
        keyword,
        setKeyword,
        refreshRootNode,
    } = useTabData(initializer, chrome);

    // Collapsed tabs state - stores Set of collapsed tab IDs
    const [collapsedTabs, setCollapsedTabs] = useState(new Set());

    // Tab marks state - stores Map of tabId -> emoji
    const [tabMarks, setTabMarks] = useState(new Map());

    // Settings state
    const [showUrls, setShowUrls] = useState(true);
    const [settingsView, setSettingsView] = useState(false);

    // Load persisted settings from storage on mount
    useEffect(() => {
        chrome.storage?.local?.get(['tabMarks', 'showUrls'], (result) => {
            if (result?.tabMarks) {
                setTabMarks(new Map(Object.entries(result.tabMarks).map(([k, v]) => [Number(k), v])));
            }
            if (result?.showUrls !== undefined) {
                setShowUrls(result.showUrls);
            }
        });
    }, [chrome.storage]);

    const onToggleShowUrls = useCallback((value) => {
        setShowUrls(value);
        chrome.storage?.local?.set({ showUrls: value });
    }, [chrome.storage]);

    // Sync collapsedTabs from Chrome's group collapsed state
    // Merge group states into existing set, preserving non-group subtree collapse
    useEffect(() => {
        if (!rootNode) return;
        setCollapsedTabs(prev => {
            const next = new Set(prev);
            for (const child of rootNode.children) {
                if (child.tab?.isGroup) {
                    if (child.groupInfo?.collapsed) {
                        next.add(child.tab.id);
                    } else {
                        next.delete(child.tab.id);
                    }
                }
            }
            return next;
        });
    }, [rootNode]);

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
        // Close the overlay if running inside one
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'tst-close-overlay' }, '*');
        }
    }, [chrome.tabs, keyword, searchByGoogle]);

    // Handle close all tabs in a branch
    const onCloseAllTabs = useCallback((node) => {
        if (!node) return;
        const tabIds = node.getAllTabIds();
        if (tabIds.length === 0) return;
        chrome.tabs.remove(tabIds);
    }, [chrome.tabs]);

    // Handle close single tab (sidepanel mode)
    const onCloseTab = useCallback((tabId) => {
        chrome.tabs.remove(tabId);
    }, [chrome.tabs]);

    // Handle mark/unmark a tab with emoji
    const onMarkTab = useCallback((tabId, emoji) => {
        setTabMarks(prev => {
            const next = new Map(prev);
            if (emoji) {
                next.set(tabId, emoji);
            } else {
                next.delete(tabId);
            }
            // Persist to storage
            const obj = {};
            next.forEach((v, k) => { obj[k] = v; });
            chrome.storage?.local?.set({ tabMarks: obj });
            return next;
        });
    }, [chrome.storage]);

    // Handle toggle collapse
    const onToggleCollapse = useCallback((tabId) => {
        setCollapsedTabs(prev => {
            const next = new Set(prev);
            const willCollapse = !next.has(tabId);
            if (willCollapse) {
                next.add(tabId);
            } else {
                next.delete(tabId);
            }
            // Sync to Chrome: tabId is "group-{groupId}"
            const match = String(tabId).match(/^group-(\d+)$/);
            if (match) {
                const groupId = Number(match[1]);
                chrome.tabGroups?.update(groupId, { collapsed: willCollapse });
            }
            return next;
        });
    }, [chrome.tabGroups]);

    // Handle group property update (title, color)
    const onGroupUpdate = useCallback(async (groupId, updates) => {
        try {
            await chrome.tabGroups.update(groupId, updates);
        } catch (error) {
            console.error('Failed to update tab group:', error);
        }
    }, [chrome.tabGroups]);

    const onAddTabToGroup = useCallback(async (groupId) => {
        try {
            const tab = await chrome.tabs.create({});
            await chrome.tabs.group({ tabIds: [tab.id], groupId });
        } catch (error) {
            console.error('Failed to add tab to group:', error);
        }
    }, [chrome.tabs]);

    // Handle drag and drop — moves subtree and updates parent/group relationships
    const onTabDrop = useCallback(async (draggedTabId, targetTabId, targetTab, dropPosition) => {
        try {
            const draggedNode = findNodeByTabId(rootNode, draggedTabId);
            const targetNode = findNodeByTabId(rootNode, targetTabId);
            const draggedIndex = draggedNode?.tab?.index;
            const targetIndex = targetTab?.index;

            if (!draggedNode || !targetNode || draggedIndex === undefined || targetIndex === undefined) {
                console.error('Could not find tab indices');
                if (dropPosition === 'inside') {
                    await initializer.updateTabParent(draggedTabId, targetTabId);
                } else {
                    const tabParentMap = await initializer.getTabParentMap();
                    const targetParentId = tabParentMap[targetTabId] || null;
                    await initializer.updateTabParent(draggedTabId, targetParentId);
                }
                refreshRootNode(keyword);
                return;
            }

            const targetSubtreeMaxIndex = getMaxIndexInSubtree(targetNode);

            // Update parent relationship
            if (dropPosition === 'inside') {
                await initializer.updateTabParent(draggedTabId, targetTabId);
            } else {
                const tabParentMap = await initializer.getTabParentMap();
                const targetParentId = tabParentMap[targetTabId] || null;
                await initializer.updateTabParent(draggedTabId, targetParentId);
            }

            // Move all tabs in the subtree to maintain tree ordering
            if (initializer.moveTab) {
                const subtreeTabIds = getSubtreeTabIds(draggedNode);

                if (draggedIndex < targetIndex) {
                    // Dragged is before target — compute insertion point
                    let moveToIndex;
                    if (dropPosition === 'before') {
                        moveToIndex = targetIndex - 1;
                    } else if (dropPosition === 'after') {
                        moveToIndex = targetSubtreeMaxIndex;
                    } else {
                        moveToIndex = targetIndex;
                    }
                    for (const tabId of subtreeTabIds) {
                        await initializer.moveTab(tabId, moveToIndex);
                    }
                } else {
                    // Dragged is after target — incrementing positions
                    let baseIndex;
                    if (dropPosition === 'before') {
                        baseIndex = targetIndex;
                    } else if (dropPosition === 'after') {
                        baseIndex = targetSubtreeMaxIndex + 1;
                    } else {
                        baseIndex = targetIndex + 1;
                    }
                    for (let i = 0; i < subtreeTabIds.length; i++) {
                        await initializer.moveTab(subtreeTabIds[i], baseIndex + i);
                    }
                }
            }

            // Cross-group handling: sync tab group membership
            const targetGroupId = targetNode.tab.groupId;
            const draggedGroupId = draggedNode.tab.groupId;
            const NO_GROUP = -1;
            const targetInGroup = targetGroupId !== undefined && targetGroupId !== NO_GROUP;
            const draggedInGroup = draggedGroupId !== undefined && draggedGroupId !== NO_GROUP;

            if (targetGroupId !== draggedGroupId) {
                const subtreeTabIds = getSubtreeTabIds(draggedNode);
                if (targetInGroup) {
                    await chrome.tabs.group({ tabIds: subtreeTabIds, groupId: targetGroupId });
                } else if (draggedInGroup) {
                    await chrome.tabs.ungroup(subtreeTabIds);
                }
            }

            refreshRootNode(keyword);
        } catch (error) {
            console.error('Failed to update tab parent:', error);
        }
    }, [initializer, refreshRootNode, keyword, rootNode, chrome.tabs]);

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
        groupEditingRef,
    });

    // Initialize on mount
    useEffect(() => {
        refreshRootNode();
        focusSearchField();
    }, [refreshRootNode, focusSearchField]);

    // In sidepanel mode, focus search field whenever the panel gains focus (user clicks on it)
    useEffect(() => {
        if (panelMode !== 'sidepanel') return;

        const handleWindowFocus = () => {
            focusSearchField();
        };

        window.addEventListener('focus', handleWindowFocus);
        return () => window.removeEventListener('focus', handleWindowFocus);
    }, [panelMode, focusSearchField]);

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

    const showBookmarks = bookmarkRootNode.children.length > 0;
    const showBookmarkTitle = rootNode.children.length > 0;
    const showSearchTip = rootNode.children.length === 0 && bookmarkRootNode.children.length === 0;

    // ---- Workspace (sidepanel only) ----
    const ws = useWorkspace(chrome, tabMarks, setTabMarks);

    const isSidepanel = panelMode === 'sidepanel';

    // Handle workspace metadata changes from preview editor
    const onWorkspaceChanged = useCallback((changes) => {
        // Sync preview metadata so toolbar/header stays up to date
        if (ws.wsPreview && changes) {
            ws.setWsPreview?.(prev => prev ? { ...prev, ...changes } : prev);
        }
    }, [ws]);

    // ---- Context menu ----
    const { menu, showMenu, closeMenu } = useContextMenu();

    const handleGroupContextMenu = useCallback((e, node, groupInfo, isCollapsed) => {
        showMenu(e, [
            {
                icon: <PlusOutlined />,
                label: t('addTabToGroup'),
                onClick: () => onAddTabToGroup(groupInfo.id),
            },
            {
                icon: <EditOutlined />,
                label: t('editGroup'),
                onClick: () => {
                    // Dispatch a custom event so GroupContainerItem can enter edit mode
                    window.dispatchEvent(new CustomEvent('tst-edit-group', { detail: { groupTabId: node.tab.id } }));
                },
            },
            {
                icon: isCollapsed ? <ExpandOutlined /> : <ShrinkOutlined />,
                label: isCollapsed ? t('expandGroup') : t('collapseGroup'),
                onClick: () => onToggleCollapse(node.tab.id),
            },
        ]);
    }, [showMenu, onToggleCollapse, onAddTabToGroup]);

    const handleTabContextMenu = useCallback((e, node, tab, isCollapsed, hasChildren) => {
        const items = [];
        if (!tab.isBookmark) {
            items.push({
                icon: <TagOutlined />,
                label: t('markTab'),
                onClick: () => {
                    // Dispatch custom event to trigger mark popup
                    window.dispatchEvent(new CustomEvent('tst-mark-tab', { detail: { tabId: tab.id } }));
                },
            });
        }
        if (hasChildren) {
            items.push({
                icon: isCollapsed ? <ExpandOutlined /> : <ShrinkOutlined />,
                label: isCollapsed ? t('expand') : t('collapse'),
                onClick: () => onToggleCollapse(tab.id),
            });
        }
        if (tab.isBookmark) {
            items.push({
                label: t('openBookmark'),
                onClick: () => onContainerClick(tab),
            });
        } else {
            items.push({
                icon: <CloseOutlined />,
                label: t('closeTab'),
                onClick: () => onCloseTab(tab.id),
            });
        }
        showMenu(e, items);
    }, [showMenu, onToggleCollapse, onContainerClick, onCloseTab]);

    const handleEmptyContextMenu = useCallback((e) => {
        if (e.target.closest('.fake-li') || e.target.closest('.group-container-li')) return;
        showMenu(e, [
            {
                icon: <PlusOutlined />,
                label: t('newTab'),
                onClick: () => chrome.tabs.create({}),
            },
            { divider: true },
            {
                icon: <SaveOutlined />,
                label: t('saveAsWorkspace'),
                onClick: () => ws.handleStartSave(),
            },
            {
                icon: <FolderOutlined />,
                label: t('myWorkspaces'),
                onClick: () => ws.handleViewWorkspaces(),
            },
            { divider: true },
            {
                icon: <SettingOutlined />,
                label: t('settings'),
                onClick: () => setSettingsView(true),
            },
            {
                icon: <QuestionCircleOutlined />,
                label: t('help'),
                onClick: () => chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') }),
            },
        ]);
    }, [showMenu, chrome, ws]);

    // Render the main content area based on current view
    const renderContent = () => {
        if (settingsView) {
            return (
                <div className="tabTreeViewContainer" ref={containerRef}>
                    <SettingsView
                        chrome={chrome}
                        showUrls={showUrls}
                        onToggleShowUrls={onToggleShowUrls}
                    />
                </div>
            );
        }

        if (ws.wsView === 'preview') {
            return (
                <div className="tabTreeViewContainer" ref={containerRef}>
                    <WorkspacePreviewView
                        wsPreview={ws.wsPreview}
                        chrome={chrome}
                        onRestoreWorkspace={ws.handleRestoreWorkspace}
                        wsRestoring={ws.wsRestoring}
                        onGroupEditingChange={onGroupEditingChange}
                        onWorkspaceChanged={onWorkspaceChanged}
                    />
                </div>
            );
        }

        if (ws.wsView === 'list') {
            return (
                <div className="tabTreeViewContainer ws-list-container" ref={containerRef}>
                    <WorkspaceListView
                        wsList={ws.wsList}
                        onOpenPreview={ws.handleOpenPreview}
                        onRestoreFromList={ws.handleRestoreFromList}
                        wsRestoring={ws.wsRestoring}
                        wsDeleteConfirmId={ws.wsDeleteConfirmId}
                        setWsDeleteConfirmId={ws.setWsDeleteConfirmId}
                        onDeleteWorkspace={ws.handleDeleteWorkspace}
                    />
                </div>
            );
        }

        return (
            <div className="tabTreeViewContainer" ref={containerRef} onContextMenu={isSidepanel ? handleEmptyContextMenu : undefined}>
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
                    onGroupUpdate={onGroupUpdate}
                    onGroupEditingChange={onGroupEditingChange}
                    onAddTabToGroup={onAddTabToGroup}
                    panelMode={panelMode}
                    onCloseTab={onCloseTab}
                    onMarkTab={onMarkTab}
                    tabMarks={tabMarks}
                    showUrls={showUrls}
                    onGroupContextMenu={isSidepanel ? handleGroupContextMenu : undefined}
                    onTabContextMenu={isSidepanel ? handleTabContextMenu : undefined}
                />

                {showBookmarks && (
                    <div>
                        {showBookmarkTitle && (
                            <div className="splitLabel">
                                <span>{t('bookmarkAndSearch')}</span>
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
                        <span className="kbd">{t('enterKey')}</span>
                        <span> {t('searchOnInternet')}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <DragPreviewLayer />
            <div className="outContainer">
                <UpgradeGuide chrome={chrome} panelMode={panelMode} />
                {isSidepanel && <PermissionBanner chrome={chrome} onPermissionGranted={() => refreshRootNode(keyword)} />}
                <div className="filter-bar">
                    <Input
                        className="filter-input"
                        onChange={handleSearchChange}
                        onCompositionStart={() => { searchInputInComposition.current = true; }}
                        onCompositionEnd={() => { searchInputInComposition.current = false; }}
                        ref={searchFieldRef}
                        placeholder={t('filterPlaceholder')}
                        prefix={<SearchOutlined />}
                        autoFocus
                    />
                    {isSidepanel && (
                        <button
                            className="filter-bar-btn"
                            title={t('newTab')}
                            onClick={() => chrome.tabs.create({})}
                        >
                            <PlusOutlined />
                        </button>
                    )}
                </div>

                {renderContent()}

                {isSidepanel && (
                    <WorkspaceToolbar
                        chrome={chrome}
                        wsView={ws.wsView}
                        wsSaving={ws.wsSaving}
                        wsSaveName={ws.wsSaveName}
                        setWsSaveName={ws.setWsSaveName}
                        wsSaveInputRef={ws.wsSaveInputRef}
                        wsSaveStatus={ws.wsSaveStatus}
                        groupEditingRef={groupEditingRef}
                        onConfirmSave={ws.handleConfirmSave}
                        onCancelSave={ws.handleCancelSave}
                        onSaveKeyDown={ws.handleSaveKeyDown}
                        onBackFromPreview={ws.handleBackFromPreview}
                        onBackFromList={ws.handleBackFromList}
                        onViewWorkspaces={ws.handleViewWorkspaces}
                        onStartSave={ws.handleStartSave}
                        settingsView={settingsView}
                        onOpenSettings={() => setSettingsView(true)}
                        onBackFromSettings={() => setSettingsView(false)}
                    />
                )}
            </div>
            {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}
        </DndProvider>
    );
}
