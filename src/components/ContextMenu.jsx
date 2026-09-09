import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { t } from '../util/i18n';

const ContextMenu = memo(({ x, y, items, onClose }) => {
    const menuRef = useRef(null);
    const [position, setPosition] = useState({ left: x, top: y });
    const [submenu, setSubmenu] = useState(null);
    const visibleItems = submenu || items;

    useEffect(() => {
        setSubmenu(null);
    }, [items]);

    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPosition({
            left: x + rect.width > vw ? Math.max(0, x - rect.width) : x,
            top: y + rect.height > vh ? Math.max(0, y - rect.height) : y,
        });
        menuRef.current.focus();
    }, [x, y, visibleItems]);

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
            role="menu"
            tabIndex={-1}
            onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Escape' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    if (submenu) setSubmenu(null);
                    else onClose();
                } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    const buttons = Array.from(menuRef.current.querySelectorAll('button:not(:disabled)'));
                    const current = buttons.indexOf(document.activeElement);
                    const direction = event.key === 'ArrowDown' ? 1 : -1;
                    buttons[(current + direction + buttons.length) % buttons.length]?.focus();
                } else if (event.key === 'Tab') {
                    onClose();
                }
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {submenu && (
                <button type="button" role="menuitem" className="ctx-menu-item" onClick={() => setSubmenu(null)}>
                    <span className="ctx-menu-icon" aria-hidden="true"><LeftOutlined /></span>
                    <span>{t('contextMenuBack')}</span>
                </button>
            )}
            {visibleItems.map((item, i) =>
                item.divider ? (
                    <div key={i} className="ctx-menu-divider" />
                ) : (
                    <button
                        key={i}
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        aria-haspopup={item.children ? 'menu' : undefined}
                        className={`ctx-menu-item${item.disabled ? ' disabled' : ''}`}
                        onClick={() => {
                            if (item.children) {
                                setSubmenu(item.children);
                            } else if (!item.disabled) {
                                item.onClick?.();
                                onClose();
                            }
                        }}
                    >
                        {item.icon && <span className="ctx-menu-icon" aria-hidden="true">{item.icon}</span>}
                        <span>{item.label}</span>
                        {item.children && <RightOutlined className="ctx-menu-arrow" aria-hidden="true" />}
                    </button>
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
