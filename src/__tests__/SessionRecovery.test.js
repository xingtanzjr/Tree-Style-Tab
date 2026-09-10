/** @jest-environment node */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Initializer = require('../util/Initializer').default;

const source = fs.readFileSync(path.resolve(__dirname, '../../public/session-recovery.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);
const { createSnapshot, matchSnapshot } = context.TreeSessionRecovery;

const tab = (id, index, url, extra = {}) => ({
    id, index, url: `https://example.com/${url}`, windowId: 1, groupId: -1, pinned: false, ...extra,
});
const original = [tab(1, 0, 'root'), tab(2, 1, 'branch'), tab(3, 2, 'leaf')];
const restored = original.map(item => ({ ...item, id: item.id + 100, windowId: 2 }));

describe('session recovery matching', () => {
    test('rebuilds only parent edges using new tab IDs', () => {
        const snapshot = createSnapshot(original, { 2: 1, 3: 2 });
        expect(matchSnapshot(snapshot, restored)).toEqual({ 102: 101, 103: 102 });
        expect(snapshot.entries[0]).not.toHaveProperty('id');
        expect(snapshot.entries[0]).not.toHaveProperty('title');
    });

    test('skips duplicate children and parents even when order matches', () => {
        const tabs = [...original, tab(4, 3, 'branch'), tab(5, 4, 'other')];
        const snapshot = createSnapshot(tabs, { 2: 1, 3: 2, 4: 1, 5: 1 });
        expect(matchSnapshot(snapshot, tabs)).toEqual({ 5: 1 });
    });

    test('waits for the complete ordered window instead of matching a partial restore', () => {
        const snapshot = createSnapshot(original, { 2: 1 });
        expect(matchSnapshot(snapshot, restored.slice(0, 2))).toBeNull();
        expect(matchSnapshot(snapshot, [...restored, tab(104, 3, 'extra')])).toBeNull();
        expect(matchSnapshot(snapshot, restored.map(item => ({ ...item, index: 2 - item.index })))).toBeNull();
    });

    test('does not record private or internal pages', () => {
        const snapshot = createSnapshot([
            ...original, tab(4, 3, 'secret', { incognito: true }),
            tab(5, 4, '', { url: 'chrome://newtab/' }),
        ], { 2: 1, 4: 1, 5: 1 });
        expect(snapshot.entries).toHaveLength(3);
        expect(JSON.stringify(snapshot)).not.toContain('secret');
    });

    test('uses pending URLs for discarded or still restoring tabs', () => {
        const snapshot = createSnapshot(original, { 2: 1 });
        expect(matchSnapshot(snapshot, restored.map(item => ({ ...item, pendingUrl: item.url, url: '', discarded: true }))))
            .toEqual({ 102: 101 });
    });

    test('allows changed group IDs but never restores across current groups or pins', () => {
        const grouped = original.map(item => ({ ...item, groupId: 10 }));
        const snapshot = createSnapshot(grouped, { 2: 1, 3: 2 });
        expect(matchSnapshot(snapshot, restored.map(item => ({ ...item, groupId: 90 })))).toEqual({ 102: 101, 103: 102 });
        expect(matchSnapshot(snapshot, restored.map(item => ({ ...item, groupId: item.id })))).toEqual({});
        expect(matchSnapshot(snapshot, restored)).toBeNull();
        expect(createSnapshot(original.map(item => ({ ...item, pinned: true })), { 2: 1 }).entries[1].parentIndex).toBeNull();
    });

    test('preserves existing parents and rejects cycles and invalid snapshots', () => {
        const snapshot = createSnapshot(original, { 2: 1, 3: 2 });
        expect(matchSnapshot(snapshot, restored, { 102: 999 })).toEqual({ 103: 102 });
        expect(matchSnapshot(snapshot, restored, { 101: 102 })).toEqual({ 103: 102 });
        expect(matchSnapshot({ ...snapshot, version: 999 }, restored)).toBeNull();
        expect(matchSnapshot({ version: 1, entries: [null] }, restored)).toBeNull();
    });
});

function createBrowser(local = {}, session = {}) {
    const event = () => {
        const listeners = [];
        return { addListener: listener => listeners.push(listener), emit: (...args) => listeners.forEach(listener => listener(...args)) };
    };
    const clone = value => JSON.parse(JSON.stringify(value));
    const onChanged = event();
    const storage = (data, area) => ({
        get: jest.fn(async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys])
            .filter(key => data[key] !== undefined).map(key => [key, clone(data[key])]))),
        set: jest.fn(async values => {
            const changes = {};
            for (const [key, value] of Object.entries(values)) {
                changes[key] = { oldValue: data[key], newValue: clone(value) };
                data[key] = clone(value);
            }
            onChanged.emit(changes, area);
        }),
    });
    let windows = [{ id: 2, type: 'normal', tabs: restored }];
    const chrome = {
        runtime: { onStartup: event() },
        storage: { local: storage(local, 'local'), session: storage(session, 'session'), onChanged },
        windows: { getAll: jest.fn(async () => clone(windows)), onCreated: event(), onRemoved: event() },
        tabs: Object.fromEntries(['onCreated', 'onUpdated', 'onMoved', 'onAttached', 'onDetached', 'onRemoved'].map(name => [name, event()])),
    };
    let parentQueue = Promise.resolve();
    const updateParentMap = update => {
        parentQueue = parentQueue.then(async () => {
            const { tabParentMap = {} } = await chrome.storage.session.get('tabParentMap');
            if (await update(tabParentMap) !== false) await chrome.storage.session.set({ tabParentMap });
        });
        return parentQueue;
    };
    const worker = vm.createContext({ console, setTimeout, clearTimeout, Date, crypto: require('crypto') });
    vm.runInContext(source, worker);
    const recovery = worker.TreeSessionRecovery.start(chrome, updateParentMap);
    return { chrome, local, session, recovery, setWindows: value => { windows = value; } };
}

const savedSession = () => ({
    treeSessionRecovery: { version: 1, sessionId: 'previous', current: createSnapshot(original, { 2: 1, 3: 2 }) },
});

describe('session recovery lifecycle', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('rotates once, recovers existing tabs and snapshots the new IDs without tab mutations', async () => {
        const browser = createBrowser(savedSession());
        await browser.recovery.flush();
        expect(browser.session.tabParentMap).toEqual({ 102: 101, 103: 102 });
        expect(browser.session.treeSessionRecoveryState.phase).toBe('done');
        expect(browser.local.treeSessionRecovery.previous.entries).toHaveLength(3);
        expect(browser.local.treeSessionRecovery.current.entries[2].parentIndex).toBe(1);
        expect(browser.chrome.tabs.create).toBeUndefined();
    });

    test('protects the old snapshot during a partial restore, including worker suspension', async () => {
        const browser = createBrowser(savedSession());
        browser.setWindows([{ id: 2, type: 'normal', tabs: restored.slice(0, 1) }]);
        await browser.recovery.flush();
        expect(browser.session.treeSessionRecoveryState.phase).toBe('waiting');
        expect(browser.local.treeSessionRecovery.current).toBeNull();
        const previous = JSON.stringify(browser.local.treeSessionRecovery.previous);
        const resumed = createBrowser(browser.local, browser.session);
        await resumed.recovery.flush();
        expect(JSON.stringify(resumed.local.treeSessionRecovery.previous)).toBe(previous);
        expect(resumed.session.tabParentMap).toEqual({ 102: 101, 103: 102 });
    });

    test('never retries recovery after completion or on the next browser session', async () => {
        const browser = createBrowser(savedSession());
        await browser.recovery.flush();
        await browser.chrome.storage.session.set({ tabParentMap: {} });
        await browser.recovery.flush();
        expect(browser.session.tabParentMap).toEqual({});
        const next = createBrowser(browser.local);
        await next.recovery.flush();
        expect(next.session.tabParentMap).toBeUndefined();
        expect(next.local.treeSessionRecovery.previous.entries.every(entry => entry.parentIndex === null)).toBe(true);
    });

    test('stops after the startup deadline even if the worker slept through it', async () => {
        const browser = createBrowser(savedSession());
        browser.setWindows([{ id: 2, type: 'normal', tabs: [] }]);
        await browser.recovery.flush();
        jest.setSystemTime(Date.now() + 120001);
        browser.setWindows([{ id: 2, type: 'normal', tabs: restored }]);
        await browser.recovery.flush();
        expect(browser.session.treeSessionRecoveryState.phase).toBe('done');
        expect(browser.session.tabParentMap).toBeUndefined();
    });

    test('honors explicit root detachment even when the parent map was already empty', async () => {
        const browser = createBrowser(savedSession());
        browser.setWindows([{ id: 2, type: 'normal', tabs: [] }]);
        await browser.recovery.flush();
        await browser.chrome.storage.session.set({ tabParentMap: {}, treeRecoveryUserModified: true });
        browser.setWindows([{ id: 2, type: 'normal', tabs: restored }]);
        await browser.recovery.flush();
        expect(browser.session.tabParentMap).toEqual({});
        expect(browser.local.treeSessionRecovery.current.entries[1].parentIndex).toBeNull();
    });

    test('skips multiple normal windows and excludes incognito windows from durable data', async () => {
        const browser = createBrowser(savedSession());
        browser.setWindows([
            { id: 2, type: 'normal', tabs: restored },
            { id: 3, type: 'normal', tabs: original },
        ]);
        await browser.recovery.flush();
        expect(browser.session.tabParentMap).toBeUndefined();
        expect(browser.local.treeSessionRecovery.current).toBeNull();
        browser.setWindows([
            { id: 2, type: 'normal', tabs: restored },
            { id: 3, type: 'normal', incognito: true, tabs: [tab(9, 0, 'secret')] },
        ]);
        await browser.recovery.flush();
        expect(JSON.stringify(browser.local)).not.toContain('secret');
        expect(browser.local.treeSessionRecovery.current.entries).toHaveLength(3);
    });

    test('allows an empty startup window beside the single restored web window', async () => {
        const browser = createBrowser(savedSession());
        browser.setWindows([
            { id: 2, type: 'normal', tabs: restored },
            { id: 3, type: 'normal', tabs: [tab(9, 0, '', { url: 'chrome://newtab/' })] },
        ]);
        await browser.recovery.flush();
        expect(browser.session.tabParentMap).toEqual({ 102: 101, 103: 102 });
        expect(browser.local.treeSessionRecovery.current.entries).toHaveLength(3);
    });

    test('keeps the last complete snapshot while the only window closes', async () => {
        const browser = createBrowser(savedSession());
        await browser.recovery.flush();
        const saved = JSON.stringify(browser.local.treeSessionRecovery.current);
        browser.chrome.tabs.onRemoved.emit(103, { windowId: 2, isWindowClosing: true });
        browser.setWindows([{ id: 2, type: 'normal', tabs: restored.slice(0, 2) }]);
        await browser.chrome.storage.session.set({ tabParentMap: { 102: 101 } });
        await browser.recovery.flush();
        expect(JSON.stringify(browser.local.treeSessionRecovery.current)).toBe(saved);
        browser.setWindows([]);
        await browser.recovery.flush();
        expect(JSON.stringify(browser.local.treeSessionRecovery.current)).toBe(saved);
    });

    test('an empty startup window cannot replace a closed source window snapshot, even after suspension', async () => {
        const browser = createBrowser(savedSession());
        const emptyWindow = { id: 3, type: 'normal', tabs: [tab(9, 0, '', { url: 'chrome://newtab/' })] };
        browser.setWindows([{ id: 2, type: 'normal', tabs: restored }, emptyWindow]);
        await browser.recovery.flush();
        const saved = JSON.stringify(browser.local.treeSessionRecovery.current);
        browser.chrome.tabs.onRemoved.emit(103, { windowId: 2, isWindowClosing: true });
        browser.setWindows([emptyWindow]);
        await browser.recovery.flush();
        expect(JSON.stringify(browser.local.treeSessionRecovery.current)).toBe(saved);
        const resumed = createBrowser(browser.local, browser.session);
        resumed.setWindows([emptyWindow]);
        await resumed.recovery.flush();
        expect(JSON.stringify(resumed.local.treeSessionRecovery.current)).toBe(saved);
    });

    test.each(['onMoved', 'onAttached', 'onDetached'])('cancels when %s occurs before matching', async eventName => {
        const browser = createBrowser(savedSession());
        browser.chrome.tabs[eventName].emit(102, {});
        await browser.recovery.flush();
        expect(browser.session.tabParentMap).toBeUndefined();
        expect(browser.session.treeSessionRecoveryState.phase).toBe('done');
    });

    test('a user edit arriving during the final query wins over recovery', async () => {
        const browser = createBrowser(savedSession());
        browser.chrome.windows.getAll.mockImplementationOnce(async () => [{ id: 2, type: 'normal', tabs: restored }]);
        browser.chrome.windows.getAll.mockImplementationOnce(async () => {
            await browser.chrome.storage.session.set({ tabParentMap: { 102: 999 }, treeRecoveryUserModified: true });
            return [{ id: 2, type: 'normal', tabs: restored }];
        });
        await browser.recovery.flush();
        expect(browser.session.tabParentMap).toEqual({ 102: 999 });
    });

    test('ignores malformed stored snapshots and checkpoints the current session', async () => {
        const saved = savedSession();
        saved.treeSessionRecovery.current.entries = {};
        const browser = createBrowser(saved);
        await browser.recovery.flush();
        expect(browser.session.treeSessionRecoveryState.phase).toBe('done');
        expect(browser.local.treeSessionRecovery.current.entries).toHaveLength(3);
    });

    test('resumes interrupted snapshot rotation without rotating twice', async () => {
        const browser = createBrowser(savedSession(), {
            treeSessionRecoveryState: { id: 'new-session', deadline: Date.now() + 120000, phase: 'initializing' },
        });
        await browser.recovery.flush();
        expect(browser.local.treeSessionRecovery.sessionId).toBe('new-session');
        expect(browser.session.tabParentMap).toEqual({ 102: 101, 103: 102 });
    });

    test('an explicit UI detach marks even an unchanged root as user-modified', async () => {
        const chrome = {
            runtime: { sendMessage: jest.fn((message, callback) => callback({ success: true })) },
        };
        await new Initializer(chrome).detachTab(102);
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            { action: 'updateTabParent', tabId: 102, parentId: null }, expect.any(Function),
        );
    });

    test('UI parent updates surface background and messaging errors', async () => {
        const chrome = { runtime: { sendMessage: (message, callback) => callback({ success: false, error: 'Storage unavailable' }) } };
        await expect(new Initializer(chrome).updateTabParent(102, 101)).rejects.toThrow('Storage unavailable');
        chrome.runtime.lastError = new Error('Worker unavailable');
        await expect(new Initializer(chrome).updateTabParent(102, 101)).rejects.toThrow('Worker unavailable');
    });
});