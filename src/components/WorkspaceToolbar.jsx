import { memo } from 'react';
import { FolderOutlined, SaveOutlined, ArrowLeftOutlined, SettingOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { t } from '../util/i18n';

/**
 * Bottom toolbar for sidepanel mode.
 * Shows workspace navigation, save input, status hints, and quick-action buttons.
 */
function WorkspaceToolbar({
    chrome,
    wsView,
    wsSaving,
    wsSaveName,
    setWsSaveName,
    wsSaveInputRef,
    wsSaveStatus,
    groupEditingRef,
    onConfirmSave,
    onCancelSave,
    onSaveKeyDown,
    onBackFromPreview,
    onBackFromList,
    onViewWorkspaces,
    onStartSave,
    settingsView,
    onOpenSettings,
    onBackFromSettings,
}) {
    if (wsSaving) {
        return (
            <div className="ws-toolbar">
                <div className="ws-save-row">
                    <input
                        ref={wsSaveInputRef}
                        className="ws-save-input"
                        placeholder={t('workspaceName')}
                        value={wsSaveName}
                        onChange={(e) => setWsSaveName(e.target.value)}
                        onKeyDown={onSaveKeyDown}
                        onFocus={() => { groupEditingRef.current = true; }}
                        onBlur={() => { groupEditingRef.current = false; }}
                    />
                    <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={onConfirmSave}>
                        {t('save')}
                    </button>
                    <button className="ws-btn ws-btn-sm" onClick={onCancelSave}>
                        {t('cancel')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="ws-toolbar">
            {wsView === 'preview' ? (
                <button className="ws-toolbar-btn" onClick={onBackFromPreview}>
                    <ArrowLeftOutlined /> {t('back')}
                </button>
            ) : wsView === 'list' ? (
                <button className="ws-toolbar-btn" onClick={onBackFromList}>
                    <ArrowLeftOutlined /> {t('back')}
                </button>
            ) : settingsView ? (
                <button className="ws-toolbar-btn" onClick={onBackFromSettings}>
                    <ArrowLeftOutlined /> {t('back')}
                </button>
            ) : (
                <div className="ws-menu-trigger">
                    <button className="ws-toolbar-btn ws-toolbar-icon">
                        <FolderOutlined />
                    </button>
                    <div className="ws-menu">
                        <div className="ws-menu-item" onClick={onViewWorkspaces}>
                            <FolderOutlined /> {t('myWorkspaces')}
                        </div>
                        <div className="ws-menu-item" onClick={onStartSave}>
                            <SaveOutlined /> {t('saveAsWorkspace')}
                        </div>
                    </div>
                </div>
            )}
            {wsSaveStatus === 'saved' && (
                <span className="ws-saved-hint">{t('saved')}</span>
            )}
            {wsSaveStatus === 'limit' && (
                <span className="ws-limit-hint">{t('wsLimitReached')}</span>
            )}
            <div className="ws-toolbar-spacer" />
            <button
                className="ws-toolbar-btn ws-toolbar-icon"
                onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') })}
            >
                <QuestionCircleOutlined />
            </button>
            <button
                className="ws-toolbar-btn ws-toolbar-icon"
                onClick={onOpenSettings}
            >
                <SettingOutlined />
            </button>
        </div>
    );
}

export default memo(WorkspaceToolbar);
