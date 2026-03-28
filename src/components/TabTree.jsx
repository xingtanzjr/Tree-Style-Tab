import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Input } from 'antd';
import { FolderOutlined, SaveOutlined, ArrowLeftOutlined, ImportOutlined, SearchOutlined, PlusOutlined, SettingOutlined, QuestionCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import TabTreeView from './TabTreeView';
import TabTreeNode from '../util/TabTreeNode';
import TabSequenceHelper from '../util/TabSequenceHelper';
import TreeGenerator from '../util/TabTreeGenerator';
import DragPreviewLayer from './DragPreviewLayer';
import { t } from '../util/i18n';

const MAX_SHOW_BOOKMARK_COUNT = 30;

/**
 * Build a TabTreeNode tree from workspace preview data so we can reuse TabTreeView.
 * Creates fake tab objects from entries, reconstructs parentMap, and runs TreeGenerator.
 * Returns { rootNode, tabMarks }.
 */
function buildWorkspaceTree(preview) {
    if (!preview?.exists || !preview.entries?.length) {
        return { rootNode: new TabTreeNode(), tabMarks: new Map() };
    }
    const { entries, groups = [] } = preview;

    // Create fake tab objects and parentMap
    const fakeTabs = [];
    const parentMap = {};
    const wsMarks = new Map();

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const fakeId = i + 1; // 1-based fake IDs
        const tab = {
            id: fakeId,
            title: e.title || e.url,
            url: e.url,
            favIconUrl: e.favIconUrl || null,
            index: i,
            groupId: e.groupId ?? -1,
            active: false,
            status: 'complete',
        };
        fakeTabs.push(tab);
        if (e.parentIndex !== null && e.parentIndex !== undefined) {
            parentMap[fakeId] = e.parentIndex + 1; // parent's fake ID
        }
        if (e.mark) {
            wsMarks.set(fakeId, e.mark);
        }
    }

    // Build fake group objects matching Chrome's tabGroups format
    const fakeGroups = groups.map(g => ({
        id: g.id,
        title: g.title || '',
        color: g.color || 'grey',
        collapsed: false,
    }));

    const generator = new TreeGenerator(fakeTabs, parentMap, fakeGroups);
    const rootNode = generator.getTree();
    return { rootNode, tabMarks: wsMarks };
}

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

    // Sync collapsedTabs from Chrome's group collapsed state
    useEffect(() => {
        if (!rootNode) return;
        const collapsed = new Set();
        for (const child of rootNode.children) {
            if (child.tab?.isGroup && child.groupInfo?.collapsed) {
                collapsed.add(child.tab.id);
            }
        }
        setCollapsedTabs(collapsed);
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
            return next;
        });
    }, []);

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

    // Handle drag and drop
    const onTabDrop = useCallback(async (draggedTabId, targetTabId, targetTab, dropPosition) => {
        try {
            // Find a node by tab id
            const findNode = (node, tabId) => {
                if (node.tab?.id === tabId) return node;
                if (node.children) {
                    for (const child of node.children) {
                        const found = findNode(child, tabId);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            // Get all tab IDs in a subtree (parent first, then children in order)
            const getSubtreeTabIds = (node) => {
                const ids = [node.tab.id];
                if (node.children) {
                    for (const child of node.children) {
                        ids.push(...getSubtreeTabIds(child));
                    }
                }
                return ids;
            };
            
            // Get the max index in a subtree (including the node itself and all descendants)
            const getMaxIndexInSubtree = (node) => {
                let maxIndex = node.tab?.index ?? -1;
                if (node.children) {
                    for (const child of node.children) {
                        maxIndex = Math.max(maxIndex, getMaxIndexInSubtree(child));
                    }
                }
                return maxIndex;
            };
            
            const draggedNode = findNode(rootNode, draggedTabId);
            const targetNode = findNode(rootNode, targetTabId);
            const draggedIndex = draggedNode?.tab?.index;
            const targetIndex = targetTab?.index;
            
            if (!draggedNode || !targetNode || draggedIndex === undefined || targetIndex === undefined) {
                console.error('Could not find tab indices');
                // Fallback: just update parent relationship
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
            
            // For 'after' position, we need to insert after the target's entire subtree
            const targetSubtreeMaxIndex = getMaxIndexInSubtree(targetNode);
            
            // Update parent relationship first
            if (dropPosition === 'inside') {
                await initializer.updateTabParent(draggedTabId, targetTabId);
            } else {
                const tabParentMap = await initializer.getTabParentMap();
                const targetParentId = tabParentMap[targetTabId] || null;
                await initializer.updateTabParent(draggedTabId, targetParentId);
            }
            
            // Move all tabs in the subtree
            if (initializer.moveTab) {
                const subtreeTabIds = getSubtreeTabIds(draggedNode);
                const subtreeSize = subtreeTabIds.length;
                
                if (draggedIndex < targetIndex) {
                    // Moving forward (dragged is before target)
                    // When we remove a tab from dragged subtree and insert it later,
                    // target's index decreases by 1 each time. But if we always insert
                    // to the same original-based position, the tabs stack correctly.
                    let moveToIndex;
                    if (dropPosition === 'before') {
                        // Insert before target: after removing first tab, target is at targetIndex-1
                        // We insert at that position (targetIndex-1), pushing target right
                        moveToIndex = targetIndex - 1;
                    } else if (dropPosition === 'after') {
                        // Insert after target's entire subtree
                        moveToIndex = targetSubtreeMaxIndex;
                    } else {
                        // 'inside' - insert right after target
                        // After removing first tab, target is at targetIndex-1
                        // Insert at targetIndex puts it after target
                        moveToIndex = targetIndex;
                    }
                    
                    // Insert all tabs to the same position - they stack in order
                    for (const tabId of subtreeTabIds) {
                        await initializer.moveTab(tabId, moveToIndex);
                    }
                } else {
                    // Moving forward (dragged is after target)
                    // Each move should go to incrementing positions
                    let baseIndex;
                    if (dropPosition === 'before') {
                        baseIndex = targetIndex;
                    } else if (dropPosition === 'after') {
                        // Insert after target's entire subtree
                        baseIndex = targetSubtreeMaxIndex + 1;
                    } else {
                        // 'inside' - insert right after target
                        baseIndex = targetIndex + 1;
                    }
                    
                    for (let i = 0; i < subtreeTabIds.length; i++) {
                        await initializer.moveTab(subtreeTabIds[i], baseIndex + i);
                    }
                }
            }
            
            // Cross-group handling: move dragged subtree to target's group
            const targetGroupId = targetNode.tab.groupId;
            const draggedGroupId = draggedNode.tab.groupId;
            const NO_GROUP = -1;
            const targetInGroup = targetGroupId !== undefined && targetGroupId !== NO_GROUP;
            const draggedInGroup = draggedGroupId !== undefined && draggedGroupId !== NO_GROUP;

            if (targetGroupId !== draggedGroupId) {
                const subtreeTabIds = getSubtreeTabIds(draggedNode);
                if (targetInGroup) {
                    // Target is in a group → move dragged tabs into that group
                    await chrome.tabs.group({ tabIds: subtreeTabIds, groupId: targetGroupId });
                } else if (draggedInGroup) {
                    // Target is ungrouped → remove dragged tabs from their group
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
    const [wsView, setWsView] = useState(null); // null | 'list' | 'preview'
    const [wsList, setWsList] = useState([]); // [{id, name, tabCount, groupCount, createdAt}]
    const [wsPreview, setWsPreview] = useState(null); // full preview data for one workspace
    const [wsSaveStatus, setWsSaveStatus] = useState(null); // null | 'saved' | 'limit'
    const [wsSaving, setWsSaving] = useState(false); // true when save input is shown
    const [wsSaveName, setWsSaveName] = useState('');
    const wsSaveInputRef = useRef(null);
    const [wsDeleteConfirmId, setWsDeleteConfirmId] = useState(null);

    // Dismiss delete popover on outside click
    useEffect(() => {
        if (!wsDeleteConfirmId) return;
        const dismiss = () => setWsDeleteConfirmId(null);
        document.addEventListener('click', dismiss);
        return () => document.removeEventListener('click', dismiss);
    }, [wsDeleteConfirmId]);

    const MAX_FREE_WORKSPACES = 3;

    const handleViewWorkspaces = useCallback(() => {
        chrome.runtime.sendMessage({ action: 'listWorkspaces' }, (resp) => {
            setWsList(resp?.workspaces || []);
            setWsView('list');
            setWsPreview(null);
        });
    }, [chrome]);

    const handleBackFromList = useCallback(() => {
        setWsView(null);
    }, []);

    const handleBackFromPreview = useCallback(() => {
        // Go back to list
        chrome.runtime.sendMessage({ action: 'listWorkspaces' }, (resp) => {
            setWsList(resp?.workspaces || []);
            setWsView('list');
            setWsPreview(null);
        });
    }, [chrome]);

    const handleOpenPreview = useCallback((wsId) => {
        chrome.runtime.sendMessage({ action: 'getWorkspacePreview', id: wsId }, (resp) => {
            if (resp?.exists) {
                setWsPreview(resp);
                setWsView('preview');
            }
        });
    }, [chrome]);

    const handleStartSave = useCallback(() => {
        if (wsList.length >= MAX_FREE_WORKSPACES) {
            setWsSaveStatus('limit');
            setTimeout(() => setWsSaveStatus(null), 3000);
            return;
        }
        const now = new Date();
        const defaultName = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            + ' ' + now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        setWsSaving(true);
        setWsSaveName(defaultName);
        setTimeout(() => {
            wsSaveInputRef.current?.focus();
            wsSaveInputRef.current?.select();
        }, 50);
    }, [wsList.length]);

    const handleCancelSave = useCallback(() => {
        setWsSaving(false);
        setWsSaveName('');
    }, []);

    const handleConfirmSave = useCallback(() => {
        const name = wsSaveName.trim();
        if (!name) return;
        const marks = {};
        tabMarks.forEach((value, key) => { marks[key] = value; });
        chrome.runtime.sendMessage({ action: 'saveWorkspace', name, marks }, (resp) => {
            if (resp?.success) {
                setWsSaving(false);
                setWsSaveName('');
                setWsSaveStatus('saved');
                setTimeout(() => setWsSaveStatus(null), 2000);
            } else if (resp?.error === 'limit') {
                setWsSaving(false);
                setWsSaveStatus('limit');
                setTimeout(() => setWsSaveStatus(null), 3000);
            }
        });
    }, [chrome, tabMarks, wsSaveName]);

    const handleSaveKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleConfirmSave();
        } else if (e.key === 'Escape') {
            handleCancelSave();
        }
    }, [handleConfirmSave, handleCancelSave]);

    const handleRestoreWorkspace = useCallback(() => {
        if (!wsPreview?.id) return;
        chrome.runtime.sendMessage({ action: 'openWorkspace', id: wsPreview.id }, (resp) => {
            if (resp?.marks) {
                setTabMarks(prev => {
                    const next = new Map(prev);
                    for (const [tabId, mark] of Object.entries(resp.marks)) {
                        next.set(Number(tabId), mark);
                    }
                    return next;
                });
            }
            setWsView(null);
        });
    }, [chrome, wsPreview]);

    const handleRestoreFromList = useCallback((wsId) => {
        chrome.runtime.sendMessage({ action: 'openWorkspace', id: wsId }, (resp) => {
            if (resp?.marks) {
                setTabMarks(prev => {
                    const next = new Map(prev);
                    for (const [tabId, mark] of Object.entries(resp.marks)) {
                        next.set(Number(tabId), mark);
                    }
                    return next;
                });
            }
            setWsView(null);
        });
    }, [chrome]);

    const handleDeleteWorkspace = useCallback((wsId) => {
        setWsDeleteConfirmId(null);
        chrome.runtime.sendMessage({ action: 'deleteWorkspace', id: wsId }, (resp) => {
            if (resp?.success) {
                // If we're on preview of the deleted workspace, go back to list
                if (wsView === 'preview' && wsPreview?.id === wsId) {
                    chrome.runtime.sendMessage({ action: 'listWorkspaces' }, (r) => {
                        setWsList(r?.workspaces || []);
                        setWsView('list');
                        setWsPreview(null);
                    });
                } else {
                    // Refresh list
                    setWsList(prev => prev.filter(w => w.id !== wsId));
                }
            }
        });
    }, [chrome, wsView, wsPreview]);

    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const isSidepanel = panelMode === 'sidepanel';

    return (
        <DndProvider backend={HTML5Backend}>
            <DragPreviewLayer />
            <div className="outContainer">
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

                {/* Main content: tree view, workspace list, or workspace preview */}
                {wsView === 'preview' ? (
                    <div className="tabTreeViewContainer" ref={containerRef}>
                        {!wsPreview?.exists ? (
                            <div className="ws-empty">{t('wsPreviewEmpty')}</div>
                        ) : (() => {
                            const { rootNode: wsRoot, tabMarks: wsMarks } = buildWorkspaceTree(wsPreview);
                            return (
                                <>
                                    <div className="ws-preview-header">
                                        <div className="ws-preview-info">
                                            <div className="ws-preview-name">{wsPreview.name}</div>
                                            <div className="ws-preview-meta">
                                                {t('tabsCount', [String(wsPreview.tabCount)])}
                                                {wsPreview.groupCount > 0 ? ` · ${t('groupsCount', [String(wsPreview.groupCount)])}` : ''}
                                                {' · '}{formatDate(wsPreview.createdAt)}
                                            </div>
                                        </div>
                                        <div className="ws-preview-actions">
                                            <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={handleRestoreWorkspace}>
                                                <ImportOutlined /> {t('restore')}
                                            </button>
                                        </div>
                                    </div>
                                    <TabTreeView
                                        rootNode={wsRoot}
                                        panelMode="readonly"
                                        tabMarks={wsMarks}
                                    />
                                </>
                            );
                        })()}
                    </div>
                ) : wsView === 'list' ? (
                    <div className="tabTreeViewContainer ws-list-container" ref={containerRef}>
                        {wsList.length === 0 ? (
                            <div className="ws-empty">{t('noSavedWorkspaces')}</div>
                        ) : (
                            wsList.map(ws => (
                                <div key={ws.id} className="ws-item" onClick={() => handleOpenPreview(ws.id)}>
                                    <div className="ws-item-info">
                                        <div className="ws-item-name">{ws.name}</div>
                                        <div className="ws-item-meta">
                                            {t('tabsCount', [String(ws.tabCount)])}
                                            {ws.groupCount > 0 ? ` · ${t('groupsCount', [String(ws.groupCount)])}` : ''}
                                            {' · '}{formatDate(ws.createdAt)}
                                        </div>
                                    </div>
                                    <div className="ws-item-actions">
                                        <button className="ws-icon-btn ws-icon-btn-open" title={t('restore')} onClick={(e) => { e.stopPropagation(); handleRestoreFromList(ws.id); }}>
                                            <ImportOutlined />
                                        </button>
                                        <div className="ws-delete-wrap">
                                            <button className="ws-icon-btn ws-icon-btn-delete" title={t('delete')} onClick={(e) => { e.stopPropagation(); setWsDeleteConfirmId(wsDeleteConfirmId === ws.id ? null : ws.id); }}>
                                                <DeleteOutlined />
                                            </button>
                                            {wsDeleteConfirmId === ws.id && (
                                                <div className="ws-delete-popover" onClick={(e) => e.stopPropagation()}>
                                                    <span className="ws-delete-popover-text">{t('confirmDeleteWorkspace')}</span>
                                                    <button className="ws-btn ws-btn-sm ws-btn-danger-solid" onClick={() => handleDeleteWorkspace(ws.id)}>{t('delete')}</button>
                                                    <button className="ws-btn ws-btn-sm" onClick={() => setWsDeleteConfirmId(null)}>{t('cancel')}</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
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
                            onGroupUpdate={onGroupUpdate}
                            onGroupEditingChange={onGroupEditingChange}
                            panelMode={panelMode}
                            onCloseTab={onCloseTab}
                            onMarkTab={onMarkTab}
                            tabMarks={tabMarks}
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
                )}

                {/* Bottom toolbar (sidepanel only) */}
                {isSidepanel && (
                    <div className="ws-toolbar">
                        {wsSaving ? (
                            <div className="ws-save-row">
                                <input
                                    ref={wsSaveInputRef}
                                    className="ws-save-input"
                                    placeholder={t('workspaceName')}
                                    value={wsSaveName}
                                    onChange={(e) => setWsSaveName(e.target.value)}
                                    onKeyDown={handleSaveKeyDown}
                                    onFocus={() => { groupEditingRef.current = true; }}
                                    onBlur={() => { groupEditingRef.current = false; }}
                                />
                                <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={handleConfirmSave}>
                                    {t('save')}
                                </button>
                                <button className="ws-btn ws-btn-sm" onClick={handleCancelSave}>
                                    {t('cancel')}
                                </button>
                            </div>
                        ) : (
                            <>
                                {wsView === 'preview' ? (
                                    <button className="ws-toolbar-btn" onClick={handleBackFromPreview}>
                                        <ArrowLeftOutlined /> {t('back')}
                                    </button>
                                ) : wsView === 'list' ? (
                                    <button className="ws-toolbar-btn" onClick={handleBackFromList}>
                                        <ArrowLeftOutlined /> {t('back')}
                                    </button>
                                ) : (
                                    <div className="ws-menu-trigger">
                                        <button className="ws-toolbar-btn ws-toolbar-icon">
                                            <FolderOutlined />
                                        </button>
                                        <div className="ws-menu">
                                            <div className="ws-menu-item" onClick={handleViewWorkspaces}>
                                                <FolderOutlined /> {t('myWorkspaces')}
                                            </div>
                                            <div className="ws-menu-item" onClick={handleStartSave}>
                                                <SaveOutlined /> {t('saveAsWorkspace')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {wsSaveStatus === 'saved' && (
                                    <span className="ws-saved-hint">{t('saved')}</span>
                                )}
                                {wsSaveStatus === 'limit' && (
                                    <span className="ws-limit-hint">{t('wsLimitReached')}</span>
                                )}
                                <div className="ws-toolbar-spacer" />
                                <button className="ws-toolbar-btn ws-toolbar-icon" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') })}>
                                    <QuestionCircleOutlined />
                                </button>
                                <button className="ws-toolbar-btn ws-toolbar-icon" onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>
                                    <SettingOutlined />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </DndProvider>
    );
}
