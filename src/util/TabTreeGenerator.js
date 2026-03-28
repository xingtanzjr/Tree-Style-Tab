import TabTreeNode from './TabTreeNode';

/**
 * TreeGenerator - Builds a tree structure from flat tab list.
 * Group info is treated as a constraint on parent-child relationships:
 * a tab only recognizes a parent in the same group (or both ungrouped).
 */
class TreeGenerator {
    constructor(tabs, tabParentMap, tabGroups = []) {
        this.tabs = tabs;
        this.tabParentMap = tabParentMap;
        this.tabGroups = tabGroups;
        this.nodeMap = {};
        this.tabMap = {};
        this.rootNode = new TabTreeNode();

        // Build groupId → group info map
        this.groupMap = {};
        tabGroups.forEach((group) => {
            this.groupMap[group.id] = group;
        });

        // Build tabId → groupId map (undefined = ungrouped)
        this.tabGroupIdMap = {};
        tabs.forEach((tab) => {
            this.tabMap[tab.id] = tab;
            if (tab.groupId !== undefined && tab.groupId !== -1) {
                this.tabGroupIdMap[tab.id] = tab.groupId;
            }
        });
    }

    getTree() {
        // Step 1: Build tree with group-aware parent resolution
        this.tabs.forEach((tab) => {
            const node = this.getNode(tab);
            const parentTab = this._getEffectiveParent(tab.id);
            const parentNode = this.getNode(parentTab);
            node.parent = parentNode;
            parentNode.children.push(node);
        });

        // Step 2: Wrap consecutive root children in same group into container nodes
        if (this.tabGroups.length > 0) {
            this._wrapGroupNodes();
        }

        return this.rootNode;
    }

    /**
     * Find the effective parent for a tab, honoring group boundaries.
     * Only returns a parent that is in the same group as tabId.
     * If the direct parent is in a different group (or doesn't exist),
     * walks up the chain to find the closest ancestor in the same group.
     *
     * When no groups are used, tabGroupIdMap is empty, so every tab has
     * groupId = undefined, meaning all tabs are "in the same group" and
     * this behaves identically to the original getParentTabId().
     */
    _getEffectiveParent(tabId) {
        const myGroupId = this.tabGroupIdMap[tabId]; // undefined if ungrouped
        return this._findAncestorInGroup(tabId, myGroupId);
    }

    _findAncestorInGroup(tabId, targetGroupId) {
        const parentTabId = this.tabParentMap[tabId];
        if (parentTabId === undefined) return undefined;

        if (this.tabMap[parentTabId]) {
            // Parent tab exists — check if same group
            if (this.tabGroupIdMap[parentTabId] === targetGroupId) {
                return this.tabMap[parentTabId];
            }
        }

        // Parent doesn't exist in current tabs or is in a different group — walk up
        return this._findAncestorInGroup(parentTabId, targetGroupId);
    }

    /**
     * Post-process: wrap consecutive root-level children that share
     * the same groupId into a group container node.
     * 
     * This works because Chrome guarantees tabs in the same group
     * are adjacent, so their root-level tree nodes are also consecutive.
     */
    _wrapGroupNodes() {
        const oldChildren = this.rootNode.children;
        const newChildren = [];

        // Pre-count tabs per group for display
        const groupTabCounts = {};
        this.tabs.forEach((tab) => {
            const gid = this.tabGroupIdMap[tab.id];
            if (gid !== undefined) {
                groupTabCounts[gid] = (groupTabCounts[gid] || 0) + 1;
            }
        });

        let i = 0;
        while (i < oldChildren.length) {
            const child = oldChildren[i];
            const groupId = this.tabGroupIdMap[child.tab?.id];

            if (groupId !== undefined && this.groupMap[groupId]) {
                // Create group container and collect consecutive same-group children
                const groupInfo = this.groupMap[groupId];
                const containerNode = new TabTreeNode();
                containerNode.tab = {
                    id: `group-${groupId}`,
                    title: groupInfo.title || '',
                    isGroup: true,
                };
                containerNode.groupInfo = {
                    id: groupId,
                    title: groupInfo.title || '',
                    color: groupInfo.color || 'grey',
                    collapsed: groupInfo.collapsed || false,
                    tabCount: groupTabCounts[groupId] || 0,
                };
                containerNode.parent = this.rootNode;

                while (i < oldChildren.length && this.tabGroupIdMap[oldChildren[i].tab?.id] === groupId) {
                    const node = oldChildren[i];
                    node.parent = containerNode;
                    containerNode.children.push(node);
                    i++;
                }

                newChildren.push(containerNode);
            } else {
                newChildren.push(child);
                i++;
            }
        }

        this.rootNode.children = newChildren;
    }

    getNode(tab) {
        if (tab === undefined) {
            return this.rootNode;
        }
        if (!this.nodeMap[tab.id]) {
            this.nodeMap[tab.id] = new TabTreeNode(tab);
        }
        return this.nodeMap[tab.id];
    }
}

export default TreeGenerator;
