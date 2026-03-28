import { memo, useMemo } from 'react';
import { ImportOutlined } from '@ant-design/icons';
import TabTreeView from './TabTreeView';
import { t } from '../util/i18n';
import { buildWorkspaceTree, formatWorkspaceDate } from '../hooks/useWorkspace';

/**
 * Workspace preview view — shows a read-only tree of a saved workspace
 * along with its metadata and a restore button.
 */
function WorkspacePreviewView({ wsPreview, onRestoreWorkspace }) {
    const { rootNode, tabMarks } = useMemo(
        () => buildWorkspaceTree(wsPreview),
        [wsPreview]
    );

    if (!wsPreview?.exists) {
        return <div className="ws-empty">{t('wsPreviewEmpty')}</div>;
    }

    return (
        <>
            <div className="ws-preview-header">
                <div className="ws-preview-info">
                    <div className="ws-preview-name">{wsPreview.name}</div>
                    <div className="ws-preview-meta">
                        {t('tabsCount', [String(wsPreview.tabCount)])}
                        {wsPreview.groupCount > 0
                            ? ` · ${t('groupsCount', [String(wsPreview.groupCount)])}`
                            : ''}
                        {' · '}{formatWorkspaceDate(wsPreview.createdAt)}
                    </div>
                </div>
                <div className="ws-preview-actions">
                    <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={onRestoreWorkspace}>
                        <ImportOutlined /> {t('restore')}
                    </button>
                </div>
            </div>
            <TabTreeView
                rootNode={rootNode}
                panelMode="readonly"
                tabMarks={tabMarks}
            />
        </>
    );
}

export default memo(WorkspacePreviewView);
