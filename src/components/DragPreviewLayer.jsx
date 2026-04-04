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
        currentOffset: monitor.getClientOffset(),
        isDragging: monitor.isDragging(),
    }));

    if (!isDragging || itemType !== DragItemTypes.TAB || !currentOffset) {
        return null;
    }

    const hasChildren = item.childrenCount > 0;
    const count = hasChildren ? item.childrenCount + 1 : 1;

    return (
        <div
            className="drag-preview-count"
            style={{
                position: 'fixed',
                pointerEvents: 'none',
                zIndex: 9999,
                left: currentOffset.x + 6,
                top: currentOffset.y + 6,
            }}
        >
            {count}
        </div>
    );
});

DragPreviewLayer.displayName = 'DragPreviewLayer';

export default DragPreviewLayer;
