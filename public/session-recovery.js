globalThis.TreeSessionRecovery = (() => {
    const VERSION = 1;

    function eligibleTabs(tabs) {
        return tabs.filter(tab => !tab.incognito && /^https?:\/\//.test(tab.pendingUrl || tab.url || ''))
            .sort((first, second) => first.index - second.index);
    }

    function createSnapshot(tabs, parentMap) {
        const eligible = eligibleTabs(tabs);
        const indices = new Map(eligible.map((tab, index) => [tab.id, index]));
        return {
            version: VERSION,
            savedAt: Date.now(),
            entries: eligible.map((tab, index) => {
                const parentIndex = indices.get(parentMap[tab.id]);
                const parent = eligible[parentIndex];
                return {
                    url: tab.pendingUrl || tab.url,
                    pinned: !!tab.pinned,
                    grouped: (tab.groupId ?? -1) !== -1,
                    parentIndex: parent && parentIndex < index && !tab.pinned && !parent.pinned &&
                        (tab.groupId ?? -1) === (parent.groupId ?? -1) ? parentIndex : null,
                };
            }),
        };
    }

    function matchSnapshot(snapshot, tabs, parentMap = {}) {
        if (snapshot?.version !== VERSION || !Array.isArray(snapshot.entries)) return null;
        const eligible = eligibleTabs(tabs);
        const entries = snapshot.entries;
        if (entries.length < 2 || eligible.length !== entries.length) return null;
        if (entries.some((entry, index) => !entry || entry.url !== (eligible[index].pendingUrl || eligible[index].url) ||
            !!entry.pinned !== !!eligible[index].pinned ||
            !!entry.grouped !== ((eligible[index].groupId ?? -1) !== -1))) return null;

        const counts = new Map();
        for (const entry of entries) counts.set(entry.url, (counts.get(entry.url) || 0) + 1);
        const recovered = {};
        entries.forEach((entry, index) => {
            const parentIndex = entry.parentIndex;
            if (!Number.isInteger(parentIndex) || parentIndex < 0 || parentIndex >= index) return;
            const parentEntry = entries[parentIndex];
            const child = eligible[index];
            const parent = eligible[parentIndex];
            if (counts.get(entry.url) !== 1 || counts.get(parentEntry.url) !== 1 || child.pinned || parent.pinned ||
                (child.groupId ?? -1) !== (parent.groupId ?? -1) ||
                Object.prototype.hasOwnProperty.call(parentMap, child.id)) return;
            const visited = new Set([child.id]);
            let ancestor = parent.id;
            while (ancestor !== undefined) {
                if (visited.has(ancestor)) return;
                visited.add(ancestor);
                ancestor = recovered[ancestor] ?? parentMap[ancestor];
            }
            recovered[child.id] = parent.id;
        });
        return recovered;
    }

    const STORAGE_KEY = 'treeSessionRecovery';
    const SESSION_KEY = 'treeSessionRecoveryState';
    const WAIT_MS = 120000;
    const SETTLE_MS = 750;

    function start(chrome, updateParentMap) {
        if (chrome.extension?.inIncognitoContext) return null;
        let queue = Promise.resolve();
        let timer;
        let deadlineTimer;
        let revision = 0;
        let cancelled = false;
        const closingWindows = new Set();

        function enqueue(work) {
            queue = queue.then(work).catch(error => console.error('Tree session recovery failed:', error));
            return queue;
        }

        async function loadSession() {
            const stored = await chrome.storage.session.get([SESSION_KEY, 'treeRecoveryUserModified']);
            let state = stored[SESSION_KEY];
            if (!state) {
                state = { id: crypto.randomUUID(), deadline: Date.now() + WAIT_MS, phase: 'initializing' };
                await chrome.storage.session.set({ [SESSION_KEY]: state });
            }
            let data = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
            if (data?.sessionId !== state.id) {
                data = {
                    version: VERSION,
                    sessionId: state.id,
                    previous: data?.version === VERSION ? data.current : null,
                    current: null,
                };
                await chrome.storage.local.set({ [STORAGE_KEY]: data });
            }
            if (state.phase === 'initializing') {
                state.phase = data.previous?.version === VERSION &&
                    Array.isArray(data.previous.entries) &&
                    data.previous.entries.some(entry => Number.isInteger(entry?.parentIndex)) ? 'waiting' : 'done';
                await chrome.storage.session.set({ [SESSION_KEY]: state });
            }
            if (stored.treeRecoveryUserModified) cancelled = true;
            return { state, data };
        }

        async function finish(state) {
            state.phase = 'done';
            clearTimeout(deadlineTimer);
            await chrome.storage.session.set({ [SESSION_KEY]: state });
        }

        async function getWindows() {
            const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] });
            const normal = windows.filter(window => !window.incognito && window.type === 'normal');
            const withPages = normal.filter(window => eligibleTabs(window.tabs || []).length > 0);
            return withPages.length > 0 ? withPages : normal;
        }

        async function reconcile() {
            const { state, data } = await loadSession();
            const observedRevision = revision;
            const windows = await getWindows();
            if (windows.length > 1) {
                await finish(state);
                data.current = null;
                await chrome.storage.local.set({ [STORAGE_KEY]: data });
                return;
            }
            if (state.phase === 'waiting' && (cancelled || Date.now() >= state.deadline)) await finish(state);
            if (windows.length !== 1 || closingWindows.has(windows[0].id)) return;
            if (state.phase === 'waiting') {
                await updateParentMap(async parentMap => {
                    const currentWindows = await getWindows();
                    if (currentWindows.length !== 1 || closingWindows.has(currentWindows[0].id)) return false;
                    const recovered = matchSnapshot(data.previous, currentWindows[0].tabs || [], parentMap);
                    if (recovered === null || cancelled || revision !== observedRevision || Date.now() >= state.deadline) return false;
                    await finish(state);
                    if (cancelled || revision !== observedRevision) return false;
                    Object.assign(parentMap, recovered);
                    return Object.keys(recovered).length > 0;
                });
                if (state.phase === 'waiting') {
                    clearTimeout(deadlineTimer);
                    deadlineTimer = setTimeout(() => enqueue(reconcile), Math.max(0, state.deadline - Date.now()));
                    return;
                }
            }
            const snapshotRevision = revision;
            const currentWindows = await getWindows();
            const { tabParentMap = {} } = await chrome.storage.session.get('tabParentMap');
            if (currentWindows.length !== 1 || closingWindows.has(currentWindows[0].id) || revision !== snapshotRevision) return;
            if (state.snapshotWindowId !== undefined && state.snapshotWindowId !== currentWindows[0].id &&
                eligibleTabs(currentWindows[0].tabs || []).length === 0) return;
            data.current = createSnapshot(currentWindows[0].tabs || [], tabParentMap);
            await chrome.storage.local.set({ [STORAGE_KEY]: data });
            state.snapshotWindowId = currentWindows[0].id;
            await chrome.storage.session.set({ [SESSION_KEY]: state });
        }

        function schedule() {
            revision++;
            clearTimeout(timer);
            timer = setTimeout(() => enqueue(reconcile), SETTLE_MS);
        }

        function cancel() {
            cancelled = true;
            enqueue(async () => {
                const { state } = await loadSession();
                await finish(state);
            });
            schedule();
        }

        chrome.runtime.onStartup.addListener(schedule);
        chrome.tabs.onCreated.addListener(tab => { if (!tab.incognito) schedule(); });
        chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
            if (tab.incognito) return;
            if (change.pinned !== undefined) cancel();
            else if (change.url !== undefined || change.groupId !== undefined) schedule();
        });
        chrome.tabs.onMoved.addListener(cancel);
        chrome.tabs.onAttached.addListener(cancel);
        chrome.tabs.onDetached.addListener(cancel);
        chrome.tabs.onRemoved.addListener((tabId, info) => {
            if (info.isWindowClosing) {
                closingWindows.add(info.windowId);
                schedule();
            } else cancel();
        });
        chrome.windows.onCreated.addListener(schedule);
        chrome.windows.onRemoved.addListener(schedule);
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'session') return;
            if (changes.treeRecoveryUserModified?.newValue ||
                (changes.tabParentMap && JSON.stringify(changes.tabParentMap.oldValue || {}) !==
                    JSON.stringify(changes.tabParentMap.newValue || {}))) cancel();
        });

        schedule();
        return { flush: () => enqueue(reconcile), cancel };
    }

    return { createSnapshot, matchSnapshot, start };
})();