import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { ImportOutlined, EditOutlined, LoadingOutlined, DownOutlined } from '@ant-design/icons';
import TabTreeView from './TabTreeView';
import { t } from '../util/i18n';
import { formatWorkspaceDate } from '../hooks/useWorkspace';
import useWorkspacePreviewEditor from '../hooks/useWorkspacePreviewEditor';

/**
 * Inline-editable workspace name header.
 * Double-click or click the edit icon to enter edit mode.
 */
const EditableWorkspaceName = memo(({ name, onRename }) => {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(name);
    const inputRef = useRef(null);
    const editorRef = useRef(null);

    const startEdit = useCallback((e) => {
        e?.stopPropagation?.();
        setEditValue(name);
        setEditing(true);
    }, [name]);

    const commitEdit = useCallback(() => {
        setEditing(false);
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== name) {
            onRename(trimmed);
        }
    }, [editValue, name, onRename]);

    const cancelEdit = useCallback(() => {
        setEditing(false);
        setEditValue(name);
    }, [name]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') commitEdit();
        else if (e.key === 'Escape') cancelEdit();
    }, [commitEdit, cancelEdit]);

    // Auto-focus input
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

    if (editing) {
        return (
            <div className="ws-preview-name-editor" ref={editorRef}>
                <input
                    ref={inputRef}
                    className="ws-preview-name-input"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('workspaceName')}
                />
            </div>
        );
    }

    return (
        <div className="ws-preview-name" onDoubleClick={startEdit}>
            {name}
            <EditOutlined className="ws-preview-name-edit-icon" onClick={startEdit} />
        </div>
    );
});

EditableWorkspaceName.displayName = 'EditableWorkspaceName';

/**
 * Split button for restore actions - main button + dropdown arrow
 */
const RestoreSplitButton = memo(({ onRestore, onRestoreInNewWindow, isRestoring }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    // Close dropdown on outside click
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

    const handleMainClick = useCallback(() => {
        if (!isRestoring) onRestore();
    }, [onRestore, isRestoring]);

    const handleArrowClick = useCallback((e) => {
        e.stopPropagation();
        setOpen(prev => !prev);
    }, []);

    const handleNewWindow = useCallback(() => {
        setOpen(false);
        onRestoreInNewWindow();
    }, [onRestoreInNewWindow]);

    return (
        <div className="ws-split-btn-wrap" ref={wrapRef}>
            <button
                className="ws-btn ws-btn-primary ws-btn-sm ws-split-btn-main"
                onClick={handleMainClick}
                disabled={isRestoring}
            >
                {isRestoring ? <LoadingOutlined spin /> : <><ImportOutlined /> {t('restore')}</>}
            </button>
            <button
                className="ws-btn ws-btn-primary ws-btn-sm ws-split-btn-arrow"
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
RestoreSplitButton.displayName = 'RestoreSplitButton';

/**
 * Workspace preview view — shows an editable tree of a saved workspace
 * along with its metadata and a restore button.
 *
 * Supports: rename workspace, remove tabs, drag-drop reparent,
 * edit groups, mark tabs.
 */
function WorkspacePreviewView({ wsPreview, chrome, onRestoreWorkspace, onRestoreInNewWindow, wsRestoring, onGroupEditingChange, onWorkspaceChanged }) {
    const editor = useWorkspacePreviewEditor(wsPreview, chrome, onWorkspaceChanged);

    if (!wsPreview?.exists) {
        return <div className="ws-empty">{t('wsPreviewEmpty')}</div>;
    }

    return (
        <>
            <div className="ws-preview-header">
                <div className="ws-preview-info">
                    <EditableWorkspaceName
                        name={editor.wsName}
                        onRename={editor.onRenameWorkspace}
                    />
                    <div className="ws-preview-meta">
                        {t('tabsCount', [String(editor.entries.length)])}
                        {editor.groups.length > 0
                            ? ` · ${t('groupsCount', [String(editor.groups.length)])}`
                            : ''}
                        {' · '}{formatWorkspaceDate(wsPreview.createdAt)}
                    </div>
                </div>
                <div className="ws-preview-actions">
                    <RestoreSplitButton
                        onRestore={onRestoreWorkspace}
                        onRestoreInNewWindow={onRestoreInNewWindow}
                        isRestoring={!!wsRestoring}
                    />
                </div>
            </div>
            <TabTreeView
                rootNode={editor.rootNode}
                panelMode="wsPreview"
                tabMarks={editor.tabMarks}
                tabNotes={editor.tabNotes}
                collapsedTabs={editor.collapsedTabs}
                onToggleCollapse={editor.onToggleCollapse}
                onGroupUpdate={editor.onGroupUpdate}
                onGroupEditingChange={onGroupEditingChange}
                onTabDrop={editor.onTabDrop}
                onCloseTab={editor.onCloseTab}
                onMarkTab={editor.onMarkTab}
                onNoteTab={editor.onNoteTab}
            />
        </>
    );
}

export default memo(WorkspacePreviewView);
