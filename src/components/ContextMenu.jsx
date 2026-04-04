import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';

const ContextMenu = memo(({ x, y, items, onClose }) => {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ left: x, top: y });

    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPosition({
            left: x + rect.width > vw ? Math.max(0, x - rect.width) : x,
            top: y + rect.height > vh ? Math.max(0, y - rect.height) : y,
        });
    }, [x, y]);

    useEffect(() => {
        const handleClick = () => onClose();
        const handleContextMenu = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        // Close when window loses focus (e.g., clicking on webpage content)
        const handleBlur = () => onClose();

        document.addEventListener('click', handleClick);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('blur', handleBlur);
        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('blur', handleBlur);
        };
    }, [onClose]);

    return createPortal(
        <div
            ref={menuRef}
            className="ctx-menu"
            style={{ left: position.left, top: position.top }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((item, i) =>
                item.divider ? (
                    <div key={i} className="ctx-menu-divider" />
                ) : (
                    <div
                        key={i}
                        className={`ctx-menu-item${item.disabled ? ' disabled' : ''}`}
                        onClick={() => {
                            if (!item.disabled) {
                                item.onClick?.();
                                onClose();
                            }
                        }}
                    >
                        {item.icon && <span className="ctx-menu-icon">{item.icon}</span>}
                        <span>{item.label}</span>
                    </div>
                )
            )}
        </div>,
        document.body
    );
});

ContextMenu.displayName = 'ContextMenu';

/**
 * Hook for managing context menu state
 */
export function useContextMenu() {
    const [menu, setMenu] = useState(null);

    const showMenu = useCallback((e, items) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY, items });
    }, []);

    const closeMenu = useCallback(() => {
        setMenu(null);
    }, []);

    return { menu, showMenu, closeMenu };
}

export default ContextMenu;
