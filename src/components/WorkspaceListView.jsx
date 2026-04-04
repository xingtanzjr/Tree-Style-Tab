import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { ImportOutlined, DeleteOutlined, LoadingOutlined, DownOutlined } from '@ant-design/icons';
import { t } from '../util/i18n';
import { formatWorkspaceDate } from '../hooks/useWorkspace';

/**
 * Restore button with dropdown for workspace list items
 */
const RestoreDropdownBtn = memo(({ wsId, onRestore, onRestoreInNewWindow, isRestoring }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const handleMainClick = useCallback((e) => {
        e.stopPropagation();
        if (!isRestoring) onRestore(wsId);
    }, [onRestore, wsId, isRestoring]);

    const handleArrowClick = useCallback((e) => {
        e.stopPropagation();
        setOpen(prev => !prev);
    }, []);

    const handleNewWindow = useCallback((e) => {
        e.stopPropagation();
        setOpen(false);
        onRestoreInNewWindow(wsId);
    }, [onRestoreInNewWindow, wsId]);

    return (
        <div className="ws-icon-btn-split" ref={wrapRef}>
            <button
                className="ws-icon-btn ws-icon-btn-open"
                title={t('restore')}
                onClick={handleMainClick}
                disabled={isRestoring}
            >
                {isRestoring ? <LoadingOutlined spin /> : <ImportOutlined />}
            </button>
            <button
                className="ws-icon-btn-arrow"
                onClick={handleArrowClick}
                disabled={isRestoring}
            >
                <DownOutlined />
            </button>
            {open && (
                <div className="ws-split-btn-dropdown">
                    <div className="ws-split-btn-option" onClick={handleNewWindow}>
                        {t('restoreInNewWindow')}
                    </div>
                </div>
            )}
        </div>
    );
});
RestoreDropdownBtn.displayName = 'RestoreDropdownBtn';

/**
 * Workspace list view — displays all saved workspaces with restore / delete actions.
 */
function WorkspaceListView({
    wsList,
    onOpenPreview,
    onRestoreFromList,
    onRestoreInNewWindow,
    wsRestoring,
    wsDeleteConfirmId,
    setWsDeleteConfirmId,
    onDeleteWorkspace,
}) {
    if (wsList.length === 0) {
        return <div className="ws-empty">{t('noSavedWorkspaces')}</div>;
    }

    return wsList.map(ws => (
        <div key={ws.id} className="ws-item" onClick={() => onOpenPreview(ws.id)}>
            <div className="ws-item-info">
                <div className="ws-item-name">{ws.name}</div>
                <div className="ws-item-meta">
                    {t('tabsCount', [String(ws.tabCount)])}
                    {ws.groupCount > 0 ? ` · ${t('groupsCount', [String(ws.groupCount)])}` : ''}
                    {' · '}{formatWorkspaceDate(ws.createdAt)}
                </div>
            </div>
            <div className="ws-item-actions">
                <RestoreDropdownBtn
                    wsId={ws.id}
                    onRestore={onRestoreFromList}
                    onRestoreInNewWindow={onRestoreInNewWindow}
                    isRestoring={wsRestoring === ws.id}
                />
                <div className="ws-delete-wrap">
                    <button
                        className="ws-icon-btn ws-icon-btn-delete"
                        title={t('delete')}
                        onClick={(e) => {
                            e.stopPropagation();
                            setWsDeleteConfirmId(wsDeleteConfirmId === ws.id ? null : ws.id);
                        }}
                    >
                        <DeleteOutlined />
                    </button>
                    {wsDeleteConfirmId === ws.id && (
                        <div className="ws-delete-popover" onClick={(e) => e.stopPropagation()}>
                            <span className="ws-delete-popover-text">{t('confirmDeleteWorkspace')}</span>
                            <button className="ws-btn ws-btn-sm ws-btn-danger-solid" onClick={() => onDeleteWorkspace(ws.id)}>
                                {t('delete')}
                            </button>
                            <button className="ws-btn ws-btn-sm" onClick={() => setWsDeleteConfirmId(null)}>
                                {t('cancel')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    ));
}

export default memo(WorkspaceListView);
