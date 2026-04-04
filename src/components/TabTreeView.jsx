import { memo, useCallback } from 'react';
import { DraggableTabItem, SearchItem, GroupContainerItem } from './DraggableTabItem';

/**
 * Renders tree nodes recursively
 */
const TreeNodeRenderer = memo(({
    node,
    keyword,
    selectedTabId,
    onContainerClick,
    onClosedButtonClick,
    onTabDrop,
    onTabItemSelected,
    collapsedTabs,
    onToggleCollapse,
    onGroupUpdate,
    onGroupEditingChange,
    onAddTabToGroup,
    onGroupContextMenu,
    onTabContextMenu,
    isTopLevel = true,
    panelMode = 'popup',
    onCloseTab,
    onMarkTab,
    tabMarks,
    showUrls,
}) => {
    const isCollapsed = node.isGroupNode()
        ? collapsedTabs?.has(node.tab.id)
        : collapsedTabs?.has(node.tab.id);
    const hasChildren = node?.children?.length > 0;

    const renderChildren = useCallback((parentNode) => {
        if (!parentNode?.children?.length) return null;
        
        return parentNode.children.map((child) => (
            <TreeNodeRenderer
                key={child.tab.id}
                node={child}
                keyword={keyword}
                selectedTabId={selectedTabId}
                onContainerClick={onContainerClick}
                onClosedButtonClick={onClosedButtonClick}
                onTabDrop={onTabDrop}
                onTabItemSelected={onTabItemSelected}
                collapsedTabs={collapsedTabs}
                onToggleCollapse={onToggleCollapse}
                onGroupUpdate={onGroupUpdate}
                onGroupEditingChange={onGroupEditingChange}
                onAddTabToGroup={onAddTabToGroup}
                onGroupContextMenu={onGroupContextMenu}
                onTabContextMenu={onTabContextMenu}
                isTopLevel={false}
                panelMode={panelMode}
                onCloseTab={onCloseTab}
                onMarkTab={onMarkTab}
                tabMarks={tabMarks}
                showUrls={showUrls}
            />
        ));
    }, [keyword, selectedTabId, onContainerClick, onClosedButtonClick, onTabDrop, onTabItemSelected, collapsedTabs, onToggleCollapse, onGroupUpdate, onGroupEditingChange, onAddTabToGroup, onGroupContextMenu, onTabContextMenu, panelMode, onCloseTab, onMarkTab, tabMarks, showUrls]);

    // Group container node
    if (node.isGroupNode()) {
        return (
            <GroupContainerItem
                node={node}
                groupInfo={node.groupInfo}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                onGroupUpdate={onGroupUpdate}
                onGroupEditingChange={onGroupEditingChange}
                onAddTabToGroup={onAddTabToGroup}
                onGroupContextMenu={onGroupContextMenu}
            >
                {!isCollapsed && renderChildren(node)}
            </GroupContainerItem>
        );
    }

    // Use SearchItem for Google search results
    if (node.tab.isGoogleSearch) {
        return (
            <SearchItem
                node={node}
                tab={node.tab}
                keyword={keyword}
                selectedTabId={selectedTabId}
                onContainerClick={onContainerClick}
                onTabItemSelected={onTabItemSelected}
            >
                {renderChildren(node)}
            </SearchItem>
        );
    }

    // Use DraggableTabItem for regular tabs
    return (
        <DraggableTabItem
            node={node}
            tab={node.tab}
            keyword={keyword}
            selectedTabId={selectedTabId}
            onContainerClick={onContainerClick}
            onClosedButtonClick={onClosedButtonClick}
            onTabDrop={onTabDrop}
            onTabItemSelected={onTabItemSelected}
            isCollapsed={isCollapsed}
            hasChildren={hasChildren}
            onToggleCollapse={onToggleCollapse}
            isTopLevel={isTopLevel}
            panelMode={panelMode}
            onCloseTab={onCloseTab}
            onMarkTab={onMarkTab}
            tabMarks={tabMarks}
            onTabContextMenu={onTabContextMenu}
            showUrls={showUrls}
        >
            {!isCollapsed && renderChildren(node)}
        </DraggableTabItem>
    );
});

TreeNodeRenderer.displayName = 'TreeNodeRenderer';

/**
 * TabTreeView - Renders the tree structure of tabs
 */
function TabTreeView({
    rootNode,
    keyword,
    selectedTabId,
    onContainerClick,
    onClosedButtonClick,
    onTabDrop,
    onTabItemSelected,
    collapsedTabs,
    onToggleCollapse,
    onGroupUpdate,
    onGroupEditingChange,
    onAddTabToGroup,
    onGroupContextMenu,
    onTabContextMenu,
    panelMode = 'popup',
    onCloseTab,
    onMarkTab,
    tabMarks,
    showUrls,
}) {
    if (!rootNode?.children?.length) {
        return <div className="tabTreeView" />;
    }

    return (
        <div className="tabTreeView">
            {rootNode.children.map((child) => (
                <TreeNodeRenderer
                    key={child.tab.id}
                    node={child}
                    keyword={keyword}
                    selectedTabId={selectedTabId}
                    onContainerClick={onContainerClick}
                    onClosedButtonClick={onClosedButtonClick}
                    onTabDrop={onTabDrop}
                    onTabItemSelected={onTabItemSelected}
                    collapsedTabs={collapsedTabs}
                    onToggleCollapse={onToggleCollapse}
                    onGroupUpdate={onGroupUpdate}
                    onGroupEditingChange={onGroupEditingChange}
                    onAddTabToGroup={onAddTabToGroup}
                    onGroupContextMenu={onGroupContextMenu}
                    onTabContextMenu={onTabContextMenu}
                    panelMode={panelMode}
                    onCloseTab={onCloseTab}
                    onMarkTab={onMarkTab}
                    tabMarks={tabMarks}
                    showUrls={showUrls}
                />
            ))}
        </div>
    );
}

export default memo(TabTreeView);
