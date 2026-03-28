/**
 * Tree traversal utilities for TabTreeNode structures.
 * Used by drag-and-drop logic and other tree operations.
 */

/**
 * Find a node by tab id in the tree (DFS).
 * @param {TabTreeNode} node - Root node to search from
 * @param {*} tabId - Tab ID to find
 * @returns {TabTreeNode|null}
 */
export function findNodeByTabId(node, tabId) {
    if (node.tab?.id === tabId) return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findNodeByTabId(child, tabId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Get all tab IDs in a subtree (parent first, then children in DFS order).
 * @param {TabTreeNode} node
 * @returns {Array<*>}
 */
export function getSubtreeTabIds(node) {
    const ids = [node.tab.id];
    if (node.children) {
        for (const child of node.children) {
            ids.push(...getSubtreeTabIds(child));
        }
    }
    return ids;
}

/**
 * Get the maximum tab index in a subtree (node + all descendants).
 * @param {TabTreeNode} node
 * @returns {number}
 */
export function getMaxIndexInSubtree(node) {
    let maxIndex = node.tab?.index ?? -1;
    if (node.children) {
        for (const child of node.children) {
            maxIndex = Math.max(maxIndex, getMaxIndexInSubtree(child));
        }
    }
    return maxIndex;
}
