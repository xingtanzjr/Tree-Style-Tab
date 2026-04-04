import { useRef, useEffect, useState, memo, useCallback, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import {
    FolderOutlined,
    StarFilled,
    LoadingOutlined,
    SearchOutlined,
    EditOutlined,
    CloseOutlined,
    TagOutlined,
    PlusOutlined,
    CheckOutlined,
    PushpinOutlined,
    WarningOutlined,
    QuestionOutlined,
    StopOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import HighlightLabel from './HighlightLabel';
import { DragItemTypes } from '../util/DragDropConstants';
import { t } from '../util/i18n';

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
        return <img src={tab.favIconUrl} alt="" />;
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
            {tab.url || '\u00A0'}
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
                <span className="kbd">Alt</span> + <span className="kbd">w</span> {t('closeSubTabs')}
            </span>
            <span className="closeTabButton">
                <span className="kbd closeTabBtn" onClick={onClosedButtonClick}>
                    {t('closeSubTabs')}
                </span>
            </span>
        </div>
    );
});

TabItemControl.displayName = 'TabItemControl';

/**
 * Mark definitions: icon + color for left bar and favicon badge
 */
const MARK_OPTIONS = [
    { key: 'check',    icon: CheckOutlined,    color: '#4caf50', label: 'markDone' },
    { key: 'pin',      icon: PushpinOutlined,  color: '#e91e63', label: 'markPin' },
    { key: 'close',    icon: CloseOutlined,    color: '#f44336', label: 'markReject' },
    { key: 'warning',  icon: WarningOutlined,  color: '#ff9800', label: 'markWIP' },
    { key: 'question', icon: QuestionOutlined, color: '#9c27b0', label: 'markQuestion' },
];

const MARK_MAP = Object.fromEntries(MARK_OPTIONS.map(m => [m.key, m]));

/**
 * Favicon badge - small colored dot with icon overlay on bottom-right of favicon
 */
const FaviconBadge = memo(({ markKey }) => {
    const mark = MARK_MAP[markKey];
    if (!mark) return null;
    const Icon = mark.icon;
    return (
        <span className="favicon-badge" style={{ backgroundColor: mark.color }}>
            <Icon style={{ fontSize: 9, color: '#fff' }} />
        </span>
    );
});
FaviconBadge.displayName = 'FaviconBadge';

/**
 * Close button for sidepanel hover
 */
const SidepanelCloseBtn = memo(({ tabId, onCloseTab }) => {
    const handleClose = useCallback((e) => {
        e.stopPropagation();
        onCloseTab(tabId);
    }, [onCloseTab, tabId]);

    return (
        <span className="sp-action-btn sp-close-btn" onClick={handleClose}>
            <CloseOutlined />
        </span>
    );
});
SidepanelCloseBtn.displayName = 'SidepanelCloseBtn';

/**
 * Mark button for sidepanel hover - with click popup picker
 */
const SidepanelMarkBtn = memo(({ tabId, markKey, onMarkTab }) => {
    const [open, setOpen] = useState(false);
    const popupRef = useRef(null);
    const btnRef = useRef(null);

    // Listen for external mark trigger (from context menu)
    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.tabId === tabId) setOpen(true);
        };
        window.addEventListener('tst-mark-tab', handler);
        return () => window.removeEventListener('tst-mark-tab', handler);
    }, [tabId]);

    const handleSelectMark = useCallback((key) => {
        onMarkTab(tabId, key);
        setOpen(false);
    }, [onMarkTab, tabId]);

    const handleClearMark = useCallback((e) => {
        e?.stopPropagation?.();
        onMarkTab(tabId, null);
        setOpen(false);
    }, [onMarkTab, tabId]);

    const handleToggle = useCallback((e) => {
        e.stopPropagation();
        setOpen(prev => !prev);
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return (
        <>
            <span ref={btnRef} className="sp-action-btn sp-mark-btn" onClick={handleToggle}>
                <TagOutlined />
            </span>
            {open && (
                <div ref={popupRef} className="mark-popup" onClick={e => e.stopPropagation()}>
                    <div className="mark-icon-row">
                        <span
                            className={`mark-icon-option mark-clear-btn${!markKey ? ' active' : ''}`}
                            onClick={handleClearMark}
                            title={t('markClear')}
                        >
                            <StopOutlined />
                        </span>
                        {MARK_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            return (
                                <span
                                    key={opt.key}
                                    className={`mark-icon-option${markKey === opt.key ? ' active' : ''}`}
                                    style={{ color: opt.color }}
                                    onClick={() => handleSelectMark(opt.key)}
                                    title={t(opt.label)}
                                >
                                    <Icon />
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
});
SidepanelMarkBtn.displayName = 'SidepanelMarkBtn';

/**
 * Note color presets (5 colors like tabGroup)
 */
const NOTE_COLORS = [
    { key: 'grey',   color: '#5f6368' },
    { key: 'blue',   color: '#1a73e8' },
    { key: 'green',  color: '#188038' },
    { key: 'yellow', color: '#f9ab00' },
    { key: 'red',    color: '#d93025' },
];

const NOTE_COLOR_MAP = Object.fromEntries(NOTE_COLORS.map(c => [c.key, c.color]));
const NOTE_MAX_LENGTH = 30;
const NOTE_INLINE_THRESHOLD = 8;

/**
 * Note button for sidepanel hover - click to open note editor
 */
const SidepanelNoteBtn = memo(({ tabId, note, onNoteTab }) => {
    const [open, setOpen] = useState(false);

    // Listen for external note trigger (from context menu)
    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.tabId === tabId) setOpen(true);
        };
        window.addEventListener('tst-note-tab', handler);
        return () => window.removeEventListener('tst-note-tab', handler);
    }, [tabId]);

    const handleClick = useCallback((e) => {
        e.stopPropagation();
        setOpen(true);
    }, []);

    const handleSave = useCallback((newNote) => {
        onNoteTab(tabId, newNote);
        setOpen(false);
    }, [onNoteTab, tabId]);

    const handleDelete = useCallback(() => {
        onNoteTab(tabId, null);
        setOpen(false);
    }, [onNoteTab, tabId]);

    const handleClose = useCallback(() => {
        setOpen(false);
    }, []);

    return (
        <>
            <span className="sp-action-btn sp-note-btn" onClick={handleClick}>
                <FileTextOutlined />
            </span>
            {open && (
                <NoteEditPopup
                    note={note}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onClose={handleClose}
                />
            )}
        </>
    );
});
SidepanelNoteBtn.displayName = 'SidepanelNoteBtn';

/**
 * NoteTag - displays note as a small sticky note at the end of tab row
 * - Click to open edit popup
 * - Styled like a small sticky note (14px font, nice padding)
 */
const NoteTag = memo(({ note, onClick }) => {
    if (!note?.text) return null;

    const bgColor = NOTE_COLOR_MAP[note.color] || NOTE_COLOR_MAP.grey;
    const isLong = note.text.length > NOTE_INLINE_THRESHOLD;
    const displayText = isLong ? note.text.slice(0, NOTE_INLINE_THRESHOLD) + '…' : note.text;

    return (
        <span
            className="note-tag"
            style={{ backgroundColor: bgColor }}
            onClick={onClick}
            title={isLong ? note.text : undefined}
        >
            {displayText}
        </span>
    );
});
NoteTag.displayName = 'NoteTag';

/**
 * Note edit popup - input + 5 color picker + save/delete
 */
const NoteEditPopup = memo(({ note, onSave, onDelete, onClose }) => {
    const [text, setText] = useState(note?.text || '');
    const [color, setColor] = useState(note?.color || 'grey');
    const inputRef = useRef(null);
    const popupRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSave = useCallback(() => {
        const trimmed = text.trim();
        if (trimmed) {
            onSave({ text: trimmed, color });
        } else {
            onDelete();
        }
    }, [text, color, onSave, onDelete]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [handleSave, onClose]);

    const handleTextChange = useCallback((e) => {
        const val = e.target.value;
        if (val.length <= NOTE_MAX_LENGTH) {
            setText(val);
        }
    }, []);

    return (
        <div ref={popupRef} className="note-popup" onClick={e => e.stopPropagation()}>
            <input
                ref={inputRef}
                className="note-input"
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onFocus={e => e.stopPropagation()}
                placeholder={t('notePlaceholder')}
                maxLength={NOTE_MAX_LENGTH}
            />
            <div className="note-color-picker">
                {NOTE_COLORS.map(c => (
                    <span
                        key={c.key}
                        className={`note-color-dot${color === c.key ? ' active' : ''}`}
                        style={{ backgroundColor: c.color }}
                        onClick={() => setColor(c.key)}
                    />
                ))}
            </div>
            <div className="note-actions">
                <button className="note-save-btn" onClick={handleSave}>{t('save')}</button>
                {note?.text && (
                    <button className="note-delete-btn" onClick={onDelete}>{t('delete')}</button>
                )}
            </div>
        </div>
    );
});
NoteEditPopup.displayName = 'NoteEditPopup';

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
    panelMode = 'popup',
    onCloseTab,
    onMarkTab,
    tabMarks,
    onNoteTab,
    tabNotes,
    onTabContextMenu,
    showUrls,
    children,
}) => {
    const selfRef = useRef(null);
    const containerRef = useRef(null);
    const [sideLineHeight, setSideLineHeight] = useState(0);
    const [dropPosition, setDropPosition] = useState(null); // 'before' | 'after' | 'inside' | null
    const dropPositionRef = useRef(null); // Ref to get latest value in drop callback
    const itemHeightRef = useRef(0);

    const canDragItem = !tab.isBookmark && !tab.isGoogleSearch && panelMode !== 'readonly';
    const showHoverActions = panelMode === 'sidepanel' || panelMode === 'wsPreview';

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
    const markKey = tabMarks?.get(tab.id);
    const containerClass = useMemo(() => {
        const classes = ['container'];
        if (isSelected) classes.push('selected');
        if (isDragging) classes.push('dragging');
        if (isOver && canDrop && dropPosition) {
            classes.push(`drop-${dropPosition}`);
        }
        if (isOver && !canDrop) classes.push('drop-invalid');
        if (canDragItem) classes.push('draggable');
        if (markKey) classes.push('marked');
        return classes.join(' ');
    }, [isSelected, isDragging, isOver, canDrop, canDragItem, dropPosition, markKey]);

    const containerStyle = useMemo(() => {
        if (!markKey) return undefined;
        const mark = MARK_MAP[markKey];
        return mark ? { borderRightColor: mark.color } : undefined;
    }, [markKey]);

    const handleContainerClick = useCallback((e) => {
        // Prevent click when finishing drag
        if (e.defaultPrevented) return;
        onContainerClick?.(tab);
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

    const handleContextMenu = useCallback((e) => {
        onTabContextMenu?.(e, node, tab, isCollapsed, hasChildren);
    }, [onTabContextMenu, node, tab, isCollapsed, hasChildren]);

    // Calculate collapsed children count
    const collapsedChildrenCount = useMemo(() => {
        if (!isCollapsed || !hasChildren) return 0;
        return getAllChildrenCount(node);
    }, [isCollapsed, hasChildren, node]);

    return (
        <div className="fake-li" ref={preview}>
            <div
                className={containerClass}
                style={containerStyle}
                ref={(el) => {
                    selfRef.current = el;
                    attachRef(el);
                }}
                onClick={handleContainerClick}
                onDoubleClick={handleDoubleClick}
                onContextMenu={handleContextMenu}
            >
                <div className="icon-container">
                    <TabItemIcon tab={tab} />
                    {isCollapsed && <CollapsedBadge count={collapsedChildrenCount} />}
                    {tabMarks?.get(tab.id) && <FaviconBadge markKey={tabMarks.get(tab.id)} />}
                </div>

                <TabItemControl
                    show={!tab.isBookmark && panelMode !== 'sidepanel' && panelMode !== 'readonly' && panelMode !== 'wsPreview'}
                    onClosedButtonClick={handleCloseClick}
                />

                <div className="content-container">
                    <TabItemTitle tab={tab} keyword={keyword} />
                    {(showUrls !== false || keyword) && <TabItemUrl tab={tab} keyword={keyword} />}
                </div>

                {showHoverActions && !tab.isBookmark && onNoteTab && (
                    <SidepanelNoteBtn
                        tabId={tab.id}
                        note={tabNotes?.get(tab.id)}
                        onNoteTab={onNoteTab}
                    />
                )}
                {showHoverActions && !tab.isBookmark && onMarkTab && (
                    <SidepanelMarkBtn
                        tabId={tab.id}
                        markKey={tabMarks?.get(tab.id)}
                        onMarkTab={onMarkTab}
                    />
                )}
                {showHoverActions && !tab.isBookmark && onCloseTab && (
                    <SidepanelCloseBtn
                        tabId={tab.id}
                        onCloseTab={onCloseTab}
                    />
                )}

                {tabNotes?.get(tab.id) && (
                    <NoteTag
                        note={tabNotes.get(tab.id)}
                        onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('tst-note-tab', { detail: { tabId: tab.id } }));
                        }}
                    />
                )}
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

const getUrlInitial = (url) => {
    if (!url) return 'S';
    try {
        const hostname = new URL(url).hostname;
        if (!hostname) return 'S';
        return hostname.replace(/^www\./, '').charAt(0).toUpperCase();
    } catch { return 'S'; }
};

const GroupFavicon = memo(({ favIconUrl, url }) => {
    const [failed, setFailed] = useState(false);
    if (!favIconUrl || failed) {
        return <span className="group-favicon-dot">{getUrlInitial(url)}</span>;
    }
    return <img className="group-favicon" src={favIconUrl} alt="" onError={() => setFailed(true)} />;
});
GroupFavicon.displayName = 'GroupFavicon';

/**
 * Chrome tab group color mapping
 */
const GROUP_COLORS = {
    grey:   '#5f6368',
    blue:   '#1a73e8',
    red:    '#d93025',
    yellow: '#f9ab00',
    green:  '#188038',
    pink:   '#d01884',
    purple: '#a142f4',
    cyan:   '#007b83',
    orange: '#fa903e',
};

const GROUP_COLOR_NAMES = Object.keys(GROUP_COLORS);

/**
 * Group Container Item - renders a tab group header with its children
 * Double-click to enter inline edit mode for title and color.
 */
export const GroupContainerItem = memo(({
    node,
    groupInfo,
    isCollapsed,
    onToggleCollapse,
    onGroupUpdate,
    onGroupEditingChange,
    onAddTabToGroup,
    onGroupContextMenu,
    children,
}) => {
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(groupInfo.title || '');
    const [editColor, setEditColor] = useState(groupInfo.color || 'grey');
    const inputRef = useRef(null);
    const editorRef = useRef(null);

    const activeColor = GROUP_COLORS[editing ? editColor : groupInfo.color] || GROUP_COLORS.grey;
    const tabId = node.tab.id;

    // Collect favicons from all descendant tabs for collapsed preview (max 8)
    const MAX_COLLAPSED_ICONS = 8;
    const collapsedIcons = useMemo(() => {
        if (!isCollapsed) return [];
        const icons = [];
        const collect = (n) => {
            if (icons.length >= MAX_COLLAPSED_ICONS) return;
            if (n.tab && !n.isGroupNode?.()) {
                icons.push({ id: n.tab.id, favIconUrl: n.tab.favIconUrl, url: n.tab.url });
            }
            if (n.children) n.children.forEach(collect);
        };
        if (node.children) node.children.forEach(collect);
        return icons;
    }, [isCollapsed, node]);
    const hiddenIconCount = useMemo(() => {
        if (!isCollapsed) return 0;
        let total = 0;
        const count = (n) => {
            if (n.tab && !n.isGroupNode?.()) total++;
            if (n.children) n.children.forEach(count);
        };
        if (node.children) node.children.forEach(count);
        return Math.max(0, total - MAX_COLLAPSED_ICONS);
    }, [isCollapsed, node]);

    const commitEdit = useCallback(() => {
        setEditing(false);
        onGroupEditingChange?.(false);
        const titleChanged = editTitle !== (groupInfo.title || '');
        const colorChanged = editColor !== (groupInfo.color || 'grey');
        if (titleChanged || colorChanged) {
            onGroupUpdate?.(groupInfo.id, {
                ...(titleChanged ? { title: editTitle } : {}),
                ...(colorChanged ? { color: editColor } : {}),
            });
        }
    }, [editTitle, editColor, groupInfo, onGroupUpdate, onGroupEditingChange]);

    const cancelEdit = useCallback(() => {
        setEditing(false);
        onGroupEditingChange?.(false);
        setEditTitle(groupInfo.title || '');
        setEditColor(groupInfo.color || 'grey');
    }, [groupInfo, onGroupEditingChange]);

    const enterEdit = useCallback((e) => {
        e.stopPropagation();
        setEditTitle(groupInfo.title || '');
        setEditColor(groupInfo.color || 'grey');
        setEditing(true);
        onGroupEditingChange?.(true);
    }, [groupInfo, onGroupEditingChange]);

    const handleClick = useCallback((e) => {
        if (editing) return;
        onToggleCollapse?.(tabId);
    }, [onToggleCollapse, tabId, editing]);

    const handleChevronClick = useCallback((e) => {
        e.stopPropagation();
        onToggleCollapse?.(tabId);
    }, [onToggleCollapse, tabId]);

    const handleContextMenu = useCallback((e) => {
        if (editing) return;
        onGroupContextMenu?.(e, node, groupInfo, isCollapsed);
    }, [onGroupContextMenu, node, groupInfo, isCollapsed, editing]);

    // Listen for external edit-group request (from context menu)
    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.groupTabId === tabId) {
                setEditTitle(groupInfo.title || '');
                setEditColor(groupInfo.color || 'grey');
                setEditing(true);
                onGroupEditingChange?.(true);
            }
        };
        window.addEventListener('tst-edit-group', handler);
        return () => window.removeEventListener('tst-edit-group', handler);
    }, [tabId, groupInfo, onGroupEditingChange]);

    // Auto-focus input when entering edit mode
    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    // Click-outside to confirm
    useEffect(() => {
        if (!editing) return;
        const handleClickOutside = (e) => {
            if (editorRef.current && !editorRef.current.contains(e.target)) {
                commitEdit();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [editing, commitEdit]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            commitEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    }, [commitEdit, cancelEdit]);

    const groupStyle = useMemo(() => ({
        borderLeftColor: activeColor,
    }), [activeColor]);

    const dotStyle = useMemo(() => ({
        backgroundColor: activeColor,
    }), [activeColor]);

    const childrenStyle = useMemo(() => ({
        borderLeftColor: activeColor,
    }), [activeColor]);

    return (
        <div className="fake-li group-container-li">
            <div
                className={`group-container${isCollapsed ? ' collapsed' : ''}${editing ? ' editing' : ''}`}
                style={groupStyle}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
            >
                {editing ? (
                    <div className="group-editor" ref={editorRef} onClick={e => e.stopPropagation()}>
                        <div className="group-editor-row">
                            <span className="group-dot" style={dotStyle} />
                            <input
                                ref={inputRef}
                                className="group-title-input"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('groupNamePlaceholder')}
                            />
                        </div>
                        <div className="group-color-picker">
                            {GROUP_COLOR_NAMES.map(name => (
                                <span
                                    key={name}
                                    className={`group-color-dot${editColor === name ? ' active' : ''}`}
                                    style={{ backgroundColor: GROUP_COLORS[name] }}
                                    onClick={() => setEditColor(name)}
                                />
                            ))}
                        </div>
                        <button className="group-save-btn" onClick={commitEdit}>{t('save')}</button>
                    </div>
                ) : (
                    <>
                        <span className="group-dot" style={dotStyle} />
                        <span className="group-title">{groupInfo.title || t('unnamedGroup')}</span>
                        <span className="group-count">({groupInfo.tabCount})</span>
                        {isCollapsed && collapsedIcons.length > 0 && (
                            <span className="group-favicon-strip">
                                {collapsedIcons.map(icon => (
                                    <GroupFavicon key={icon.id} favIconUrl={icon.favIconUrl} url={icon.url} />
                                ))}
                                {hiddenIconCount > 0 && (
                                    <span className="group-favicon-more">+{hiddenIconCount}</span>
                                )}
                            </span>
                        )}
                        <PlusOutlined className="group-add-icon" onClick={(e) => { e.stopPropagation(); onAddTabToGroup?.(groupInfo.id); }} />
                        <EditOutlined className="group-edit-icon" onClick={enterEdit} />
                        <span className={`group-chevron${isCollapsed ? ' collapsed' : ''}`} onClick={handleChevronClick}>
                            {isCollapsed ? '›' : '‹'}
                        </span>
                    </>
                )}
            </div>
            {!isCollapsed && children && (
                <div className="group-children" style={childrenStyle}>
                    {children}
                </div>
            )}
        </div>
    );
});

GroupContainerItem.displayName = 'GroupContainerItem';

// Named exports for sub-components
export { TabItemIcon, TabItemTitle, TabItemUrl, TabItemControl };
