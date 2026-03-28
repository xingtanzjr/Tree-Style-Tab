import { useState, useCallback, useMemo } from 'react';
import TabTreeNode from '../util/TabTreeNode';
import TabTreeGenerator from '../util/TabTreeGenerator';

/**
 * Build a TabTreeNode tree from workspace entries and groups.
 * Used to reconstruct the tree after any edit operation.
 */
function buildTreeFromEntries(entries, groups) {
    if (!entries?.length) {
        return { rootNode: new TabTreeNode(), tabMarks: new Map() };
    }

    const fakeTabs = [];
    const parentMap = {};
    const wsMarks = new Map();

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const fakeId = i + 1;
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
            parentMap[fakeId] = e.parentIndex + 1;
        }
        if (e.mark) {
            wsMarks.set(fakeId, e.mark);
        }
    }

    const fakeGroups = (groups || []).map(g => ({
        id: g.id,
        title: g.title || '',
        color: g.color || 'grey',
        collapsed: false,
    }));

    const generator = new TabTreeGenerator(fakeTabs, parentMap, fakeGroups);
    const rootNode = generator.getTree();
    return { rootNode, tabMarks: wsMarks };
}

/**
 * Persist the current workspace state (entries, groups, name, marks) to chrome.storage.local.
 */
function persistWorkspace(chrome, wsId, entries, groups, name, tabMarks) {
    chrome.runtime.sendMessage({
        action: 'updateWorkspace',
        id: wsId,
        updates: { entries, groups, name, tabMarks: Object.fromEntries(tabMarks) },
    });
}

/**
 * Custom hook for editing a saved workspace's contents in preview mode.
 *
 * Manages local editing state (entries, groups, name, marks) and provides
 * callbacks compatible with the same signatures used by the live tab tree,
 * so DraggableTabItem/TabTreeView can be reused with panelMode='wsPreview'.
 *
 * @param {object} wsPreview - The workspace preview object from useWorkspace
 * @param {object} chrome - Chrome API (or mock)
 * @param {Function} onWorkspaceChanged - Called when workspace metadata changes (for parent to sync)
 */
export default function useWorkspacePreviewEditor(wsPreview, chrome, onWorkspaceChanged) {
    // Local mutable copies of workspace data
    const [entries, setEntries] = useState(() => wsPreview?.entries || []);
    const [groups, setGroups] = useState(() => wsPreview?.groups || []);
    const [wsName, setWsName] = useState(() => wsPreview?.name || '');
    const [tabMarks, setTabMarks] = useState(() => {
        const m = new Map();
        if (wsPreview?.entries) {
            wsPreview.entries.forEach((e, i) => {
                if (e.mark) m.set(i + 1, e.mark);
            });
        }
        return m;
    });
    const [collapsedTabs, setCollapsedTabs] = useState(new Set());

    // Rebuild tree whenever entries/groups change
    const { rootNode } = useMemo(
        () => buildTreeFromEntries(entries, groups),
        [entries, groups]
    );

    const wsId = wsPreview?.id;

    // Helper: sync marks into entries and persist
    const persistWithMarks = useCallback((newEntries, newGroups, newName, newMarks) => {
        // Embed marks into entries for storage
        const entriesWithMarks = newEntries.map((e, i) => {
            const mark = newMarks.get(i + 1) || null;
            return mark !== e.mark ? { ...e, mark } : e;
        });
        persistWorkspace(chrome, wsId, entriesWithMarks, newGroups, newName, newMarks);
        onWorkspaceChanged?.({
            tabCount: newEntries.length,
            groupCount: newGroups.length,
            name: newName,
        });
    }, [chrome, wsId, onWorkspaceChanged]);

    // ---- Rename workspace ----
    const onRenameWorkspace = useCallback((newName) => {
        setWsName(newName);
        persistWithMarks(entries, groups, newName, tabMarks);
    }, [entries, groups, tabMarks, persistWithMarks]);

    // ---- Remove tab ----
    const onCloseTab = useCallback((fakeTabId) => {
        const idx = fakeTabId - 1; // fakeId = index + 1
        if (idx < 0 || idx >= entries.length) return;

        const removedEntry = entries[idx];
        const removedParentIndex = removedEntry.parentIndex;

        // Build new entries: remove the tab, reparent its children to its parent
        const newEntries = [];
        const oldToNew = {}; // old index → new index

        for (let i = 0; i < entries.length; i++) {
            if (i === idx) continue;
            oldToNew[i] = newEntries.length;
            newEntries.push({ ...entries[i] });
        }

        // Fix parentIndex references
        for (const entry of newEntries) {
            if (entry.parentIndex === null || entry.parentIndex === undefined) continue;
            if (entry.parentIndex === idx) {
                // Reparent to the removed tab's parent
                entry.parentIndex = removedParentIndex !== null && removedParentIndex !== undefined
                    ? (oldToNew[removedParentIndex] ?? null)
                    : null;
            } else {
                entry.parentIndex = oldToNew[entry.parentIndex] ?? null;
            }
        }

        // Rebuild marks with new fakeIds
        const newMarks = new Map();
        let newIdx = 0;
        for (let i = 0; i < entries.length; i++) {
            if (i === idx) continue;
            const oldFakeId = i + 1;
            const newFakeId = newIdx + 1;
            if (tabMarks.has(oldFakeId)) {
                newMarks.set(newFakeId, tabMarks.get(oldFakeId));
            }
            newIdx++;
        }

        setEntries(newEntries);
        setTabMarks(newMarks);
        persistWithMarks(newEntries, groups, wsName, newMarks);
    }, [entries, groups, wsName, tabMarks, persistWithMarks]);

    // ---- Mark tab ----
    const onMarkTab = useCallback((fakeTabId, markKey) => {
        setTabMarks(prev => {
            const next = new Map(prev);
            if (markKey) {
                next.set(fakeTabId, markKey);
            } else {
                next.delete(fakeTabId);
            }
            // Persist
            const entriesWithMarks = entries.map((e, i) => {
                const mark = next.get(i + 1) || null;
                return mark !== e.mark ? { ...e, mark } : e;
            });
            persistWorkspace(chrome, wsId, entriesWithMarks, groups, wsName, next);
            return next;
        });
    }, [entries, groups, wsName, chrome, wsId]);

    // ---- Toggle collapse (UI-only, no persist) ----
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

    // ---- Group update (title, color) ----
    const onGroupUpdate = useCallback((groupId, updates) => {
        setGroups(prev => {
            const next = prev.map(g => {
                if (g.id === groupId) {
                    return { ...g, ...updates };
                }
                return g;
            });
            persistWithMarks(entries, next, wsName, tabMarks);
            return next;
        });
    }, [entries, wsName, tabMarks, persistWithMarks]);

    // ---- Drag and drop: rearrange entries ----
    const onTabDrop = useCallback((draggedFakeId, targetFakeId, targetTab, dropPosition) => {
        const dragIdx = draggedFakeId - 1;
        const targetIdx = targetFakeId - 1;
        if (dragIdx < 0 || targetIdx < 0 || dragIdx >= entries.length || targetIdx >= entries.length) return;
        if (dragIdx === targetIdx) return;

        // Collect dragged subtree indices (DFS)
        const getSubtreeIndices = (rootIdx) => {
            const result = [rootIdx];
            for (let i = 0; i < entries.length; i++) {
                if (entries[i].parentIndex === rootIdx) {
                    result.push(...getSubtreeIndices(i));
                }
            }
            return result;
        };

        const subtreeIndices = new Set(getSubtreeIndices(dragIdx));
        // Safety: target cannot be in dragged subtree
        if (subtreeIndices.has(targetIdx)) return;

        // Build new order: remove subtree, then insert at target position
        const subtreeList = []; // entries in subtree, in original order
        const remaining = [];   // entries NOT in subtree
        const subtreeOldIndices = [];
        const remainingOldIndices = [];

        for (let i = 0; i < entries.length; i++) {
            if (subtreeIndices.has(i)) {
                subtreeList.push({ ...entries[i] });
                subtreeOldIndices.push(i);
            } else {
                remaining.push({ ...entries[i] });
                remainingOldIndices.push(i);
            }
        }

        // Find target's position in the remaining array
        const targetPosInRemaining = remainingOldIndices.indexOf(targetIdx);

        // Determine insertion index in remaining
        let insertAt;
        if (dropPosition === 'before') {
            insertAt = targetPosInRemaining;
        } else if (dropPosition === 'after') {
            // Insert after target and its subtree in remaining
            const targetSubtreeInRemaining = getSubtreeIndicesFromList(remaining, targetPosInRemaining);
            insertAt = Math.max(...targetSubtreeInRemaining) + 1;
        } else {
            // 'inside' — insert right after target
            insertAt = targetPosInRemaining + 1;
        }

        // Update parent of dragged root
        if (dropPosition === 'inside') {
            // Dragged root becomes child of target
            subtreeList[0].parentIndex = targetIdx; // will be remapped below
        } else {
            // Dragged root becomes sibling of target — same parent as target
            subtreeList[0].parentIndex = entries[targetIdx].parentIndex;
        }

        // Build merged array
        const merged = [
            ...remaining.slice(0, insertAt),
            ...subtreeList,
            ...remaining.slice(insertAt),
        ];

        // Build old→new index mapping
        const mergedOldIndices = [
            ...remainingOldIndices.slice(0, insertAt),
            ...subtreeOldIndices,
            ...remainingOldIndices.slice(insertAt),
        ];
        const oldToNew = {};
        for (let i = 0; i < mergedOldIndices.length; i++) {
            oldToNew[mergedOldIndices[i]] = i;
        }

        // Remap all parentIndex references
        for (const entry of merged) {
            if (entry.parentIndex !== null && entry.parentIndex !== undefined) {
                entry.parentIndex = oldToNew[entry.parentIndex] ?? null;
            }
        }

        // Handle group assignment for 'inside' drops
        if (dropPosition === 'inside') {
            const targetGroupId = entries[targetIdx].groupId;
            for (const idx of subtreeIndices) {
                const newIdx = oldToNew[idx];
                if (newIdx !== undefined) {
                    merged[newIdx].groupId = targetGroupId;
                }
            }
        }

        // Rebuild marks
        const newMarks = new Map();
        for (let i = 0; i < mergedOldIndices.length; i++) {
            const oldFakeId = mergedOldIndices[i] + 1;
            if (tabMarks.has(oldFakeId)) {
                newMarks.set(i + 1, tabMarks.get(oldFakeId));
            }
        }

        setEntries(merged);
        setTabMarks(newMarks);
        persistWithMarks(merged, groups, wsName, newMarks);
    }, [entries, groups, wsName, tabMarks, persistWithMarks]);

    return {
        rootNode,
        tabMarks,
        collapsedTabs,
        wsName,
        entries,
        groups,
        // Callbacks (same signatures as live tab tree)
        onCloseTab,
        onMarkTab,
        onToggleCollapse,
        onGroupUpdate,
        onTabDrop,
        onRenameWorkspace,
    };
}

/**
 * Get subtree indices from a list using parentIndex references within that list.
 */
function getSubtreeIndicesFromList(list, rootIdx) {
    const result = [rootIdx];
    for (let i = 0; i < list.length; i++) {
        if (list[i].parentIndex === rootIdx && !result.includes(i)) {
            result.push(...getSubtreeIndicesFromList(list, i));
        }
    }
    return result;
}
