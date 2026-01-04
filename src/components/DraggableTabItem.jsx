import { useRef, useEffect, useState, memo, useCallback, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { Button } from 'antd';
import { 
    FolderOutlined, 
    StarFilled, 
    LoadingOutlined, 
    SearchOutlined
} from '@ant-design/icons';
import HighlightLabel from './HighlightLabel';
import { DragItemTypes } from '../util/DragDropConstants';

/**
 * Collapse indicator badge - shows children count when collapsed
 */
const CollapsedBadge = memo(({ count }) => {
    if (!count) return null;
    return (
        <span className="collapsed-badge">
            +{count}
        </span>
    );
});

CollapsedBadge.displayName = 'CollapsedBadge';

/**
 * Tab item icon component
 */
const TabItemIcon = memo(({ tab }) => {
    if (tab.status === 'loading') {
        return <LoadingOutlined className="front-icon" />;
    }

    if (tab.favIconUrl) {
        return <img width="16px" src={tab.favIconUrl} alt="" />;
    }

    if (tab.isBookmark) {
        return <StarFilled className="front-icon" style={{ color: '#FFC107' }} />;
    }

    if (tab.isGoogleSearch) {
        return <SearchOutlined className="front-icon" />;
    }

    return <FolderOutlined className="front-icon" />;
});

TabItemIcon.displayName = 'TabItemIcon';

/**
 * Tab title component with keyword highlighting
 */
const TabItemTitle = memo(({ tab, keyword }) => {
    const className = 'title' + (tab.active ? ' active' : '');

    if (!tab.title) {
        return <HighlightLabel className={className}>loading...</HighlightLabel>;
    }

    if (tab.isGoogleSearch) {
        return <span className="searchItem">{tab.title}</span>;
    }

    return (
        <HighlightLabel className={className} keyword={keyword}>
            {tab.title}
        </HighlightLabel>
    );
});

TabItemTitle.displayName = 'TabItemTitle';

/**
 * Tab URL component with keyword highlighting
 */
const TabItemUrl = memo(({ tab, keyword }) => {
    const className = 'url' + (tab.active ? ' active' : '');
    return (
        <HighlightLabel className={className} keyword={keyword}>
            {tab.url}
        </HighlightLabel>
    );
});

TabItemUrl.displayName = 'TabItemUrl';

/**
 * Tab control buttons (close sub-tabs)
 */
const TabItemControl = memo(({ show, onClosedButtonClick }) => {
    if (!show) return null;

    return (
        <div className="closeTabControl">
            <span className="closeTabTip">
                <span className="kbd">Alt</span> + <span className="kbd">w</span> to close Sub-Tabs
            </span>
            <span className="closeTabButton">
                <Button className="kbd" size="small" onClick={onClosedButtonClick}>
                    Close Sub-Tabs
                </Button>
            </span>
        </div>
    );
});

TabItemControl.displayName = 'TabItemControl';

/**
 * Vertical line for tree structure
 */
const TreeParentSideLine = memo(({ height }) => {
    const style = useMemo(() => ({
        minHeight: `${height}px`,
    }), [height]);

    return <div className="vertical-line" style={style} />;
});

TreeParentSideLine.displayName = 'TreeParentSideLine';

/**
 * Calculate total children count recursively
 */
const getAllChildrenCount = (node) => {
    if (!node?.children?.length) return 0;
    return node.children.reduce((count, child) => {
        return count + 1 + getAllChildrenCount(child);
    }, 0);
};

/**
 * Check if target is a descendant of the dragged node
 */
const isDescendant = (parentNode, targetId) => {
    if (!parentNode?.children) return false;
    for (const child of parentNode.children) {
        if (child.tab?.id === targetId) return true;
        if (isDescendant(child, targetId)) return true;
    }
    return false;
};

/**
 * Draggable and Droppable Tab Item Component
 */
export const DraggableTabItem = memo(({
    node,
    tab,
    keyword,
    selectedTabId,
    onContainerClick,
    onClosedButtonClick,
    onTabDrop,
    onTabItemSelected,
    isCollapsed,
    hasChildren,
    onToggleCollapse,
    isTopLevel = false,
    children,
}) => {
    const selfRef = useRef(null);
    const containerRef = useRef(null);
    const [sideLineHeight, setSideLineHeight] = useState(0);
    const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after' | 'inside' | null
    const dropPositionRef = useRef(null); // Ref to get latest value in drop callback
    const itemHeightRef = useRef(0);

    const canDragItem = !tab.isBookmark && !tab.isGoogleSearch;

    // Calculate children count for drag preview
    const childrenCount = useMemo(() => getAllChildrenCount(node), [node]);

    // Drag source configuration - entire row is draggable
    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: DragItemTypes.TAB,
        item: { tabId: tab.id, node, title: tab.title, childrenCount },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        canDrag: () => canDragItem,
    }), [tab.id, node, tab.title, canDragItem, childrenCount]);

    // Hide default drag preview - we use custom DragPreviewLayer
    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    // Drop target configuration - entire row is droppable
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: DragItemTypes.TAB,
        drop: (item, monitor) => {
            if (!monitor.didDrop() && item.tabId !== tab.id) {
                // Pass target tab object, IDs, and drop position (use ref for latest value)
                onTabDrop?.(item.tabId, tab.id, tab, dropPositionRef.current);
            }
        },
        hover: (item, monitor) => {
            if (!containerRef.current || item.tabId === tab.id) {
                setDropPosition(null);
                return;
            }
            
            // Get target element bounds
            const hoverBoundingRect = containerRef.current.getBoundingClientRect();
            // Get mouse position
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset) {
                setDropPosition(null);
                return;
            }
            
            // Calculate relative Y position within target
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;
            const hoverHeight = hoverBoundingRect.height;
            
            // Determine drop position based on mouse Y position
            let newPosition;
            if (hoverClientY < hoverHeight * 0.25) {
                // Top 25% - insert before (as sibling)
                newPosition = 'before';
            } else if (hoverClientY > hoverHeight * 0.75) {
                // Bottom 25% - insert after (as sibling)
                newPosition = 'after';
            } else {
                // Middle 50% - insert inside (as child)
                newPosition = 'inside';
            }
            setDropPosition(newPosition);
            dropPositionRef.current = newPosition; // Keep ref in sync for drop callback
        },
        canDrop: (item) => {
            if (item.tabId === tab.id) return false;
            if (tab.isBookmark || tab.isGoogleSearch) return false;
            return !isDescendant(item.node, tab.id);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }),
            canDrop: monitor.canDrop(),
        }),
    }), [tab.id, node, onTabDrop]);

    // Reset drop position when not hovering
    useEffect(() => {
        if (!isOver) {
            setDropPosition(null);
        }
    }, [isOver]);

    // Combine drag and drop refs for the entire container
    const attachRef = useCallback((el) => {
        containerRef.current = el;
        if (canDragItem) {
            drag(el);
        }
        drop(el);
    }, [drag, drop, canDragItem]);

    // Calculate sidebar height
    const getSidelineHeight = useCallback(() => {
        if (!itemHeightRef.current || !node.children?.length) return 0;

        const directChildrenCount = node.children.length;
        const allChildrenCount = getAllChildrenCount(node);
        const lastBranchChildrenCount = 1 + getAllChildrenCount(node.children[directChildrenCount - 1]);
        const height = itemHeightRef.current;
        return (allChildrenCount - lastBranchChildrenCount) * height + height / 2;
    }, [node]);

    // Update sidebar height on mount and when children change
    useEffect(() => {
        if (selfRef.current) {
            itemHeightRef.current = selfRef.current.getBoundingClientRect().height;
            if (node.children?.length > 0) {
                setSideLineHeight(getSidelineHeight());
            }
        }
    }, [node.children, getSidelineHeight]);

    // Handle selection scrolling
    useEffect(() => {
        if (selectedTabId === tab.id && selfRef.current && onTabItemSelected) {
            onTabItemSelected(selfRef.current.getBoundingClientRect());
        }
    }, [selectedTabId, tab.id, onTabItemSelected]);

    const isSelected = selectedTabId === tab.id;

    // Build class names
    const containerClass = useMemo(() => {
        const classes = ['container'];
        if (isSelected) classes.push('selected');
        if (isDragging) classes.push('dragging');
        if (isOver && canDrop && dropPosition) {
            classes.push(`drop-${dropPosition}`);
        }
        if (isOver && !canDrop) classes.push('drop-invalid');
        if (canDragItem) classes.push('draggable');
        return classes.join(' ');
    }, [isSelected, isDragging, isOver, canDrop, canDragItem, dropPosition]);

    const handleContainerClick = useCallback((e) => {
        // Prevent click when finishing drag
        if (e.defaultPrevented) return;
        onContainerClick(tab);
    }, [onContainerClick, tab]);

    // Double click to toggle collapse
    const handleDoubleClick = useCallback((e) => {
        e.preventDefault();
        if (hasChildren) {
            onToggleCollapse?.(tab.id);
        }
    }, [hasChildren, onToggleCollapse, tab.id]);

    const handleCloseClick = useCallback((e) => {
        e.stopPropagation();
        onClosedButtonClick(node);
    }, [onClosedButtonClick, node]);

    // Calculate collapsed children count
    const collapsedChildrenCount = useMemo(() => {
        if (!isCollapsed || !hasChildren) return 0;
        return getAllChildrenCount(node);
    }, [isCollapsed, hasChildren, node]);

    return (
        <div className="fake-li" ref={preview}>
            <div 
                className={containerClass} 
                ref={(el) => {
                    selfRef.current = el;
                    attachRef(el);
                }}
                onClick={handleContainerClick}
                onDoubleClick={handleDoubleClick}
            >
                <div className="icon-container">
                    <TabItemIcon tab={tab} />
                    {isCollapsed && <CollapsedBadge count={collapsedChildrenCount} />}
                </div>

                <TabItemControl
                    show={!tab.isBookmark}
                    onClosedButtonClick={handleCloseClick}
                />

                <div className="content-container">
                    <TabItemTitle tab={tab} keyword={keyword} />
                    <TabItemUrl tab={tab} keyword={keyword} />
                </div>
            </div>

            {children && (
                <div className="fake-ul treeParent">
                    <TreeParentSideLine height={sideLineHeight} />
                    {children}
                </div>
            )}
        </div>
    );
});

DraggableTabItem.displayName = 'DraggableTabItem';

/**
 * Search Item (non-draggable)
 */
export const SearchItem = memo(({
    node,
    tab,
    keyword,
    selectedTabId,
    onContainerClick,
    onTabItemSelected,
    children,
}) => {
    const selfRef = useRef(null);
    const [sideLineHeight] = useState(0);

    useEffect(() => {
        if (selectedTabId === tab.id && selfRef.current && onTabItemSelected) {
            onTabItemSelected(selfRef.current.getBoundingClientRect());
        }
    }, [selectedTabId, tab.id, onTabItemSelected]);

    const isSelected = selectedTabId === tab.id;

    const handleClick = useCallback(() => {
        onContainerClick(tab);
    }, [onContainerClick, tab]);

    return (
        <div className="fake-li">
            <div
                className={isSelected ? 'container selected' : 'container'}
                ref={selfRef}
            >
                <div className="icon-container" onClick={handleClick}>
                    <TabItemIcon tab={tab} />
                </div>
                <div className="content-container" onClick={handleClick}>
                    <TabItemTitle tab={tab} keyword={keyword} />
                </div>
            </div>

            {children && (
                <div className="fake-ul treeParent">
                    <TreeParentSideLine height={sideLineHeight} />
                    {children}
                </div>
            )}
        </div>
    );
});

SearchItem.displayName = 'SearchItem';

// Named exports for sub-components
export { TabItemIcon, TabItemTitle, TabItemUrl, TabItemControl };
