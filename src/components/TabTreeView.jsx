import { memo, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { DraggableTabItem, SearchItem } from './DraggableTabItem';
import { DragItemTypes } from '../util/DragDropConstants';

/**
 * Root drop zone - allows dropping tabs to make them top-level
 */
const RootDropZone = memo(({ onTabDrop }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: DragItemTypes.TAB,
        drop: (item) => {
            // Drop to root level (null parent), move to index 0
            onTabDrop?.(item.tabId, null, { index: -1 });
        },
        canDrop: () => true,
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [onTabDrop]);

    const className = `root-drop-zone${isOver && canDrop ? ' active' : ''}`;

    return (
        <div ref={drop} className={className}>
            <span>拖拽到此处移至顶级</span>
        </div>
    );
});

RootDropZone.displayName = 'RootDropZone';

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
    isTopLevel = true,
}) => {
    const isCollapsed = collapsedTabs?.has(node.tab.id);
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
                isTopLevel={false}
            />
        ));
    }, [keyword, selectedTabId, onContainerClick, onClosedButtonClick, onTabDrop, onTabItemSelected, collapsedTabs, onToggleCollapse]);

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
}) {
    if (!rootNode?.children?.length) {
        return <div className="tabTreeView" />;
    }

    return (
        <div className="tabTreeView">
            {onTabDrop && <RootDropZone onTabDrop={onTabDrop} />}
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
                />
            ))}
        </div>
    );
}

export default memo(TabTreeView);
