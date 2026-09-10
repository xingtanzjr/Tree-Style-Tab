const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { chromium, expect } = require('@playwright/test');

const crashTest = process.env.TST_CRASH_TEST === '1';
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tst-recovery-test-'));
const profile = path.join(temporary, 'profile');
const extension = path.join(temporary, 'extension');
let context;
let browserPid;

async function bounded(promise, label) {
    let timer;
    try {
        return await Promise.race([promise, new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out`)), 20000);
        })]);
    } finally {
        clearTimeout(timer);
    }
}

function ownedBrowserPid() {
    for (const entry of fs.readdirSync('/proc')) {
        if (!/^\d+$/.test(entry)) continue;
        try {
            const status = fs.readFileSync(`/proc/${entry}/status`, 'utf8');
            const command = fs.readFileSync(`/proc/${entry}/cmdline`, 'utf8');
            if (new RegExp(`^PPid:\\s+${process.pid}$`, 'm').test(status) &&
                command.includes(`--user-data-dir=${profile}`)) return Number(entry);
        } catch {}
    }
    throw new Error('Cannot identify the owned test browser');
}

async function launch(restore = false) {
    context = await chromium.launchPersistentContext(profile, {
        channel: 'chromium', headless: !crashTest, viewport: null, timeout: 20000,
        ignoreDefaultArgs: ['--enable-automation'],
        args: [
            '--enable-unsafe-extension-debugging', '--window-size=1000,760',
            `--disable-extensions-except=${extension}`, `--load-extension=${extension}`,
            ...(restore ? ['--restore-last-session'] : []),
        ],
    });
    context.setDefaultTimeout(15000);
    if (crashTest) browserPid = ownedBrowserPid();
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    return new URL('recovery-test.html', worker.url()).href;
}

async function inspect(url) {
    const page = await context.newPage();
    await page.goto(url);
    return page;
}

async function state(page, origin) {
    return bounded(page.evaluate(async origin => ({
        tabs: (await chrome.tabs.query({})).filter(tab => (tab.pendingUrl || tab.url || '').startsWith(origin))
            .sort((first, second) => first.index - second.index),
        local: (await chrome.storage.local.get('treeSessionRecovery')).treeSessionRecovery,
        session: await chrome.storage.session.get(['tabParentMap', 'treeSessionRecoveryState']),
        windows: await chrome.windows.getAll({ windowTypes: ['normal'] }),
    }), origin), 'Read extension state');
}

function checkpointContains(marker) {
    const directory = path.join(profile, 'Default', 'Sessions');
    if (!fs.existsSync(directory)) return false;
    return fs.readdirSync(directory).filter(name => name.startsWith('Session_'))
        .some(name => fs.readFileSync(path.join(directory, name)).includes(Buffer.from(marker)));
}

const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Recovery fixture</title><h1>Recovery fixture</h1>');
});

(async () => {
    if (crashTest) assert.equal(process.platform, 'linux', 'The optional crash test requires Linux and a display');
    fs.cpSync(path.resolve(__dirname, '../build'), extension, { recursive: true });
    const manifestPath = path.join(extension, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.background.service_worker = 'recovery-test-worker.js';
    manifest.permissions.push('sessions');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    fs.writeFileSync(path.join(extension, 'recovery-test-worker.js'),
        "globalThis.fetch = async () => new Response('{}');\nimportScripts('service_worker.js');\n");
    fs.writeFileSync(path.join(extension, 'recovery-test.html'), '<!doctype html><title>Recovery test inspector</title>');
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${server.address().port}`;

    await launch();
    await bounded(context.close(), 'Initialize persistent profile');
    context = null;
    const inspector = await inspect(await launch());
    await bounded(inspector.evaluate(async origin => {
        const routes = ['root', 'branch', 'leaf', 'duplicate', 'duplicate', 'checkpoint'];
        const parents = [null, 0, 1, 0, 1, null];
        const tabs = [];
        for (const [index, route] of routes.entries()) {
            tabs.push(await chrome.tabs.create({ url: `${origin}/${route}`, active: index === 0,
                ...(parents[index] === null ? {} : { openerTabId: tabs[parents[index]].id }) }));
        }
        await chrome.tabs.group({ tabIds: tabs.slice(0, 5).map(tab => tab.id) });
    }, origin), 'Create tree fixture');
    await expect.poll(async () => (await state(inspector, origin)).tabs.filter(tab => tab.status === 'complete').length,
        { timeout: 15000 }).toBe(6);
    await inspector.evaluate(async origin => {
        const tabs = (await chrome.tabs.query({})).filter(tab => tab.url.startsWith(origin))
            .sort((first, second) => first.index - second.index);
        for (const [childIndex, parentIndex] of [[1, 0], [2, 1], [3, 0], [4, 1]]) {
            const response = await chrome.runtime.sendMessage({
                action: 'updateTabParent', tabId: tabs[childIndex].id, parentId: tabs[parentIndex].id,
            });
            if (!response?.success) throw new Error(response?.error || 'Parent update failed');
        }
    }, origin);
    await expect.poll(async () => (await state(inspector, origin)).local?.current?.entries.map(entry => entry.parentIndex),
        { timeout: 15000 }).toEqual([null, 0, 1, 0, 1, null]);
    const before = await state(inspector, origin);
    console.log('Real extension recorded all four parent edges.');

    if (crashTest) {
        await expect.poll(() => checkpointContains(`${origin}/checkpoint`), { timeout: 20000 }).toBe(true);
        await expect.poll(() => {
            const preferences = JSON.parse(fs.readFileSync(path.join(profile, 'Default', 'Preferences'), 'utf8'));
            return preferences.profile?.exit_type;
        }, { timeout: 20000 }).toBe('Crashed');
        const closed = context.waitForEvent('close');
        assert.equal(ownedBrowserPid(), browserPid);
        process.kill(browserPid, 'SIGKILL');
        await bounded(closed, 'Test browser crash');
    }
    await bounded(context.close(), 'Close fixture browser');
    context = null;
    const restoredInspectorUrl = await launch(!crashTest);
    const restoredInspector = await inspect(restoredInspectorUrl);
    if (crashTest) {
        await expect.poll(() => restoredInspector.evaluate(async origin =>
            (await chrome.sessions.getRecentlyClosed()).some(session =>
                session.window?.tabs.filter(tab => tab.url.startsWith(origin)).length === 6), origin),
        { timeout: 15000 }).toBe(true);
        await bounded(restoredInspector.evaluate(async origin => {
            const sessions = await chrome.sessions.getRecentlyClosed();
            const session = sessions.find(item => item.window?.tabs.filter(tab => tab.url.startsWith(origin)).length === 6);
            await chrome.sessions.restore(session.window.sessionId);
        }, origin), 'Chrome native crash-session restore');
    }
    try {
        await expect.poll(async () => {
            const after = await state(restoredInspector, origin);
            if (after.tabs.length !== 6) return null;
            return after.tabs.map(tab => after.tabs.findIndex(parent => parent.id === after.session.tabParentMap?.[tab.id]));
        }, { timeout: 20000 }).toEqual([-1, 0, 1, -1, -1, -1]);
    } catch (error) {
        console.error(JSON.stringify(await state(restoredInspector, origin), null, 2));
        throw error;
    }
    const after = await state(restoredInspector, origin);
    assert.deepEqual(after.tabs.map(tab => tab.url), before.tabs.map(tab => tab.url));
    assert.ok(after.tabs.every(tab => !before.tabs.some(old => old.id === tab.id)));
    assert.deepEqual(after.local.previous, before.local.current);
    assert.equal(after.session.treeSessionRecoveryState.phase, 'done');
    assert.deepEqual(after.local.current.entries.map(entry => entry.parentIndex), [null, 0, 1, null, null, null]);
    assert.ok(after.tabs.slice(0, 5).every(tab => tab.groupId === after.tabs[0].groupId && tab.groupId !== -1));
    console.log(`PASS: Chromium ${context.browser().version()}, ${crashTest ? 'SIGKILL + Chrome sessions.restore' : 'native clean-session restore'}, six tabs, two recovered edges, duplicate edges skipped.`);
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
}).finally(async () => {
    try {
        if (context) await bounded(context.close(), 'Browser cleanup');
    } finally {
        await new Promise(resolve => server.close(resolve));
        fs.rmSync(temporary, { recursive: true, force: true });
    }
});