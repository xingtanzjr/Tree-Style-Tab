import { memo } from 'react';
import { useDragLayer } from 'react-dnd';
import { DragItemTypes } from '../util/DragDropConstants';

/**
 * Custom drag layer for real-time preview during drag
 */
const DragPreviewLayer = memo(() => {
    const { isDragging, item, currentOffset, itemType } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        currentOffset: monitor.getSourceClientOffset(),
        isDragging: monitor.isDragging(),
    }));

    if (!isDragging || itemType !== DragItemTypes.TAB || !currentOffset) {
        return null;
    }

    const style = {
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 9999,
        left: currentOffset.x,
        top: currentOffset.y,
        transform: 'translate(-10px, -50%)',
    };

    const hasChildren = item.childrenCount > 0;

    return (
        <div style={style}>
            <div className="drag-preview">
                <span className="drag-preview-title">
                    {item.title || 'Tab'}
                </span>
                {hasChildren && (
                    <span className="drag-preview-count">
                        +{item.childrenCount}
                    </span>
                )}
            </div>
        </div>
    );
});

DragPreviewLayer.displayName = 'DragPreviewLayer';

export default DragPreviewLayer;
