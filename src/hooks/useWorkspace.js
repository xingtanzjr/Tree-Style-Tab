import { useState, useCallback, useRef, useEffect } from 'react';
import TabTreeNode from '../util/TabTreeNode';
import TabTreeGenerator from '../util/TabTreeGenerator';

const MAX_FREE_WORKSPACES = 3;

/**
 * Build a TabTreeNode tree from workspace preview data for read-only display.
 * Creates fake tab objects from entries, reconstructs parentMap, and runs TreeGenerator.
 */
export function buildWorkspaceTree(preview) {
    if (!preview?.exists || !preview.entries?.length) {
        return { rootNode: new TabTreeNode(), tabMarks: new Map(), tabNotes: new Map() };
    }
    const { entries, groups = [] } = preview;

    const fakeTabs = [];
    const parentMap = {};
    const wsMarks = new Map();
    const wsNotes = new Map();

    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const fakeId = i + 1;
        const tab = {
            id: fakeId,
            title: e.title || e.url,
            url: e.url,
            favIconUrl: e.favIconUrl || null,
            index: i,
            groupId: e.groupId ?? -1,
            active: false,
            status: 'complete',
        };
        fakeTabs.push(tab);
        if (e.parentIndex !== null && e.parentIndex !== undefined) {
            parentMap[fakeId] = e.parentIndex + 1;
        }
        if (e.mark) {
            wsMarks.set(fakeId, e.mark);
        }
        if (e.note) {
            wsNotes.set(fakeId, e.note);
        }
    }

    const fakeGroups = groups.map(g => ({
        id: g.id,
        title: g.title || '',
        color: g.color || 'grey',
        collapsed: false,
    }));

    const generator = new TabTreeGenerator(fakeTabs, parentMap, fakeGroups);
    const rootNode = generator.getTree();
    return { rootNode, tabMarks: wsMarks, tabNotes: wsNotes };
}

/**
 * Format timestamp for workspace display.
 */
export function formatWorkspaceDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

/**
 * Custom hook managing all workspace state and operations (sidepanel only).
 *
 * @param {object} chrome - Chrome API (or mock)
 * @param {Map} tabMarks - Current tab marks (for saving)
 * @param {Function} setTabMarks - Setter to merge restored marks
 * @param {Map} tabNotes - Current tab notes (for saving)
 * @param {Function} setTabNotes - Setter to merge restored notes
 */
export default function useWorkspace(chrome, tabMarks, setTabMarks, tabNotes, setTabNotes) {
    const [wsView, setWsView] = useState(null);           // null | 'list' | 'preview'
    const [wsList, setWsList] = useState([]);
    const [wsPreview, setWsPreview] = useState(null);
    const [wsSaveStatus, setWsSaveStatus] = useState(null); // null | 'saved' | 'limit'
    const [wsSaving, setWsSaving] = useState(false);
    const [wsSaveName, setWsSaveName] = useState('');
    const wsSaveInputRef = useRef(null);
    const [wsDeleteConfirmId, setWsDeleteConfirmId] = useState(null);
    const [wsRestoring, setWsRestoring] = useState(null); // null | workspaceId

    // Dismiss delete popover on outside click
    useEffect(() => {
        if (!wsDeleteConfirmId) return;
        const dismiss = () => setWsDeleteConfirmId(null);
        document.addEventListener('click', dismiss);
        return () => document.removeEventListener('click', dismiss);
    }, [wsDeleteConfirmId]);

    // ---- Navigation ----

    const handleViewWorkspaces = useCallback(() => {
        chrome.runtime.sendMessage({ action: 'listWorkspaces' }, (resp) => {
            setWsList(resp?.workspaces || []);
            setWsView('list');
            setWsPreview(null);
        });
    }, [chrome]);

    const handleBackFromList = useCallback(() => {
        setWsView(null);
    }, []);

    const handleBackFromPreview = useCallback(() => {
        chrome.runtime.sendMessage({ action: 'listWorkspaces' }, (resp) => {
            setWsList(resp?.workspaces || []);
            setWsView('list');
            setWsPreview(null);
        });
    }, [chrome]);

    const handleOpenPreview = useCallback((wsId) => {
        chrome.runtime.sendMessage({ action: 'getWorkspacePreview', id: wsId }, (resp) => {
            if (resp?.exists) {
                setWsPreview(resp);
                setWsView('preview');
            }
        });
    }, [chrome]);

    // ---- Save ----

    const handleStartSave = useCallback(() => {
        if (wsList.length >= MAX_FREE_WORKSPACES) {
            setWsSaveStatus('limit');
            setTimeout(() => setWsSaveStatus(null), 3000);
            return;
        }
        const now = new Date();
        const defaultName = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            + ' ' + now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
        setWsSaving(true);
        setWsSaveName(defaultName);
        setTimeout(() => {
            wsSaveInputRef.current?.focus();
            wsSaveInputRef.current?.select();
        }, 50);
    }, [wsList.length]);

    const handleCancelSave = useCallback(() => {
        setWsSaving(false);
        setWsSaveName('');
    }, []);

    const handleConfirmSave = useCallback(() => {
        const name = wsSaveName.trim();
        if (!name) return;
        const marks = {};
        tabMarks.forEach((value, key) => { marks[key] = value; });
        const notes = {};
        tabNotes?.forEach((value, key) => { notes[key] = value; });
        chrome.runtime.sendMessage({ action: 'saveWorkspace', name, marks, notes }, (resp) => {
            if (resp?.success) {
                setWsSaving(false);
                setWsSaveName('');
                setWsSaveStatus('saved');
                setTimeout(() => setWsSaveStatus(null), 2000);
            } else if (resp?.error === 'limit') {
                setWsSaving(false);
                setWsSaveStatus('limit');
                setTimeout(() => setWsSaveStatus(null), 3000);
            }
        });
    }, [chrome, tabMarks, tabNotes, wsSaveName]);

    const handleSaveKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            handleConfirmSave();
        } else if (e.key === 'Escape') {
            handleCancelSave();
        }
    }, [handleConfirmSave, handleCancelSave]);

    // ---- Restore ----

    const mergeRestoredMarks = useCallback((resp) => {
        setWsRestoring(null);
        if (resp?.marks) {
            setTabMarks(prev => {
                const next = new Map(prev);
                for (const [tabId, mark] of Object.entries(resp.marks)) {
                    next.set(Number(tabId), mark);
                }
                return next;
            });
        }
        if (resp?.notes && setTabNotes) {
            setTabNotes(prev => {
                const next = new Map(prev);
                for (const [tabId, note] of Object.entries(resp.notes)) {
                    next.set(Number(tabId), note);
                }
                return next;
            });
        }
        setWsView(null);
    }, [setTabMarks, setTabNotes]);

    const handleRestoreWorkspace = useCallback((inNewWindow = false) => {
        if (!wsPreview?.id || wsRestoring) return;
        setWsRestoring(wsPreview.id);
        chrome.runtime.sendMessage({ action: 'openWorkspace', id: wsPreview.id, inNewWindow }, mergeRestoredMarks);
    }, [chrome, wsPreview, wsRestoring, mergeRestoredMarks]);

    const handleRestoreFromList = useCallback((wsId, inNewWindow = false) => {
        if (wsRestoring) return;
        setWsRestoring(wsId);
        chrome.runtime.sendMessage({ action: 'openWorkspace', id: wsId, inNewWindow }, mergeRestoredMarks);
    }, [chrome, wsRestoring, mergeRestoredMarks]);

    // ---- Delete ----

    const handleDeleteWorkspace = useCallback((wsId) => {
        setWsDeleteConfirmId(null);
        chrome.runtime.sendMessage({ action: 'deleteWorkspace', id: wsId }, (resp) => {
            if (resp?.success) {
                if (wsView === 'preview' && wsPreview?.id === wsId) {
                    chrome.runtime.sendMessage({ action: 'listWorkspaces' }, (r) => {
                        setWsList(r?.workspaces || []);
                        setWsView('list');
                        setWsPreview(null);
                    });
                } else {
                    setWsList(prev => prev.filter(w => w.id !== wsId));
                }
            }
        });
    }, [chrome, wsView, wsPreview]);

    return {
        // State
        wsView,
        wsList,
        wsPreview,
        setWsPreview,
        wsSaveStatus,
        wsSaving,
        wsSaveName,
        setWsSaveName,
        wsSaveInputRef,
        wsDeleteConfirmId,
        setWsDeleteConfirmId,
        wsRestoring,
        // Handlers
        handleViewWorkspaces,
        handleBackFromList,
        handleBackFromPreview,
        handleOpenPreview,
        handleStartSave,
        handleCancelSave,
        handleConfirmSave,
        handleSaveKeyDown,
        handleRestoreWorkspace,
        handleRestoreFromList,
        handleDeleteWorkspace,
    };
}
