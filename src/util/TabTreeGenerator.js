import TabTreeNode from './TabTreeNode';
import { GHOST_DEFAULT_IDENTITY } from './ghostCompat';

/**
 * TreeGenerator - Builds a tree structure from flat tab list.
 * Group info is treated as a constraint on parent-child relationships:
 * a tab only recognizes a parent in the same group (or both ungrouped).
 */
class TreeGenerator {
    constructor(tabs, tabParentMap, tabGroups = [], identityInfoMap = {}) {
        this.tabs = tabs;
        this.tabParentMap = tabParentMap;
        this.tabGroups = tabGroups;
        this.identityInfoMap = identityInfoMap;
        // Ghost Browser is present if any tab has the ghostPublicAPI property.
        // Used to assign the default-identity sentinel to tabs that lack it.
        this.isGhostBrowser = tabs.some(t => t.ghostPublicAPI !== undefined);
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

        // Step 3: Wrap root children by Ghost identity into collapsible identity containers
        this._wrapIdentityNodes();

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

    /**
     * Get the Ghost identity ID for a root-level node.
     * For group container nodes, use the identity of the first child tab.
     * For regular tab nodes, use ghostIdentityId directly.
     */
    _getNodeIdentityId(node) {
        if (node.tab?.isGroup) {
            for (const child of (node.children || [])) {
                const id = child.tab?.ghostIdentityId;
                if (id) return id;
            }
            return null;
        }
        return node.tab?.ghostIdentityId ?? null;
    }

    /**
     * Post-process: collect root-level children that share a Ghost identity
     * into per-identity container nodes. Preserves first-appearance order;
     * tabs with no identity are appended after all identity containers.
     */
    _wrapIdentityNodes() {
        const oldChildren = this.rootNode.children;
        const hasAny = oldChildren.some(c => this._getNodeIdentityId(c) !== null);
        if (!hasAny) return;

        const identityOrder = [];
        const identityGroups = {};
        const noIdentityChildren = [];

        for (const child of oldChildren) {
            const identityId = this._getNodeIdentityId(child);
            if (identityId) {
                if (!identityGroups[identityId]) {
                    identityGroups[identityId] = [];
                    identityOrder.push(identityId);
                }
                identityGroups[identityId].push(child);
            } else {
                noIdentityChildren.push(child);
            }
        }

        const newChildren = [];
        for (const identityId of identityOrder) {
            const nodes = identityGroups[identityId];
            const info = this.identityInfoMap[identityId];
            const tabCount = nodes.reduce((sum, n) => sum + this._countTabs(n), 0);

            const containerNode = new TabTreeNode();
            containerNode.tab = {
                id: `ghost-identity-${identityId}`,
                title: info?.name || identityId,
                isGhostIdentity: true,
            };
            containerNode.ghostIdentityInfo = {
                id: identityId,
                name: info?.name || identityId,
                isTemporary: info?.isTemporary || false,
                color: info?.color || null,
                tabCount,
            };
            containerNode.parent = this.rootNode;

            for (const node of nodes) {
                node.parent = containerNode;
                containerNode.children.push(node);
            }
            newChildren.push(containerNode);
        }

        this.rootNode.children = [...newChildren, ...noIdentityChildren];
    }

    _countTabs(node) {
        let count = (node.tab && !node.tab.isGroup && !node.tab.isGhostIdentity) ? 1 : 0;
        for (const child of (node.children || [])) {
            count += this._countTabs(child);
        }
        return count;
    }

    getNode(tab) {
        if (tab === undefined) {
            return this.rootNode;
        }
        if (!this.nodeMap[tab.id]) {
            // In Ghost Browser every tab gets a ghostIdentityId. Tabs with an
            // explicit identity_id use that; tabs without one (default identity,
            // or tabs where Ghost doesn't set ghostPublicAPI) get the sentinel.
            // The || instead of ?? also handles the empty-string case.
            let normalizedTab = tab;
            if (this.isGhostBrowser) {
                normalizedTab = {
                    ...tab,
                    ghostIdentityId:  tab.ghostPublicAPI?.identity_id  || GHOST_DEFAULT_IDENTITY,
                    ghostWorkspaceId: tab.ghostPublicAPI?.workspace_id  ?? null,
                    ghostIsTemporary: tab.ghostPublicAPI?.is_temporary_identity ?? false,
                };
            }
            this.nodeMap[tab.id] = new TabTreeNode(normalizedTab);
        }
        return this.nodeMap[tab.id];
    }
}

export default TreeGenerator;
