import { memo } from 'react';
import { ImportOutlined, DeleteOutlined } from '@ant-design/icons';
import { t } from '../util/i18n';
import { formatWorkspaceDate } from '../hooks/useWorkspace';

/**
 * Workspace list view — displays all saved workspaces with restore / delete actions.
 */
function WorkspaceListView({
    wsList,
    onOpenPreview,
    onRestoreFromList,
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
                <button
                    className="ws-icon-btn ws-icon-btn-open"
                    title={t('restore')}
                    onClick={(e) => { e.stopPropagation(); onRestoreFromList(ws.id); }}
                >
                    <ImportOutlined />
                </button>
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
