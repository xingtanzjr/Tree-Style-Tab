const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { test: base, expect } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const names = ['A', 'B', 'C', 'D', 'E', 'F'].map(name => `close-parent-${name}`);
const initialParents = [null, 0, 1, 2, 1, 0];

const test = base.extend({
    extension: async ({ playwright, channel, headless, viewport, locale }, use, testInfo) => {
        expect(
            fs.readFileSync(path.join(root, 'build/service_worker.js'))
                .equals(fs.readFileSync(path.join(root, 'public/service_worker.js'))),
            'Build must contain the current worker; run npm run test:extension',
        ).toBe(true);

        const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tst-close-parent-test-'));
        const extensionPath = path.join(temporary, 'extension');
        const server = http.createServer((request, response) => {
            const title = request.url.match(/^\/(close-parent-[A-F])$/)?.[1] || 'fixture';
            response.setHeader('Content-Type', 'text/html');
            response.end(`<!doctype html><title>${title}</title><link rel="icon" href="data:,"><h1>${title}</h1>`);
        });
        let context;
        let tracing = false;

        try {
            fs.cpSync(path.join(root, 'build'), extensionPath, { recursive: true });
            const manifestPath = path.join(extensionPath, 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            manifest.background.service_worker = 'close-parent-test-worker.js';
            manifest.permissions = [...new Set([...manifest.permissions, 'tabGroups'])];
            manifest.optional_permissions = (manifest.optional_permissions || []).filter(permission => permission !== 'tabGroups');
            fs.writeFileSync(manifestPath, JSON.stringify(manifest));
            fs.writeFileSync(path.join(extensionPath, 'close-parent-test-worker.js'),
                "globalThis.fetch = async () => new Response('{}');\nimportScripts('service_worker.js');\n");

            server.listen(0, '127.0.0.1');
            await once(server, 'listening');
            const origin = `http://127.0.0.1:${server.address().port}`;
            context = await playwright.chromium.launchPersistentContext(path.join(temporary, 'profile'), {
                channel, headless, viewport, locale, timeout: 20000,
                args: [
                    '--enable-unsafe-extension-debugging', '--lang=en-US',
                    `--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`,
                ],
            });
            context.setDefaultTimeout(15000);
            await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
            tracing = true;
            await context.route(/^https?:\/\/(?!127\.0\.0\.1[:/])/, route => route.fulfill({
                status: 200, contentType: 'application/json', body: '{}',
            }));
            const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
            const panel = await context.newPage();
            await panel.goto(new URL('sidepanel.html', worker.url()).href);
            await expect(panel.locator('body')).toHaveAttribute('data-mode', 'sidepanel');
            await expect(panel.locator('.dev-mode-toggle')).toHaveCount(0);
            await use({ panel, origin });
        } finally {
            try {
                if (tracing) {
                    if (testInfo.status !== testInfo.expectedStatus) {
                        const tracePath = testInfo.outputPath('trace.zip');
                        await context.tracing.stop({ path: tracePath });
                        await testInfo.attach('trace', { path: tracePath, contentType: 'application/zip' });
                    } else {
                        await context.tracing.stop();
                    }
                }
            } finally {
                try {
                    if (context) await context.close();
                } finally {
                    await new Promise(resolve => server.close(resolve));
                    fs.rmSync(temporary, { recursive: true, force: true });
                }
            }
        }
    },
});

async function createTree(panel, origin, grouped) {
    return panel.evaluate(async ({ origin, names, parents, grouped }) => {
        const current = await chrome.tabs.getCurrent();
        const startIndex = (await chrome.tabs.query({ windowId: current.windowId })).length;
        const tabs = [];
        for (const [index, name] of names.entries()) {
            tabs.push(await chrome.tabs.create({
                url: `${origin}/${name}`, index: startIndex + index,
                active: false, windowId: current.windowId,
            }));
        }
        if (grouped) {
            const groupId = await chrome.tabs.group({ tabIds: tabs.map(tab => tab.id) });
            await chrome.tabGroups.update(groupId, { title: 'Close parent fixture', color: 'blue', collapsed: false });
        }
        for (const [index, parentIndex] of parents.entries()) {
            const response = await chrome.runtime.sendMessage({
                action: 'updateTabParent', tabId: tabs[index].id,
                parentId: parentIndex === null ? null : tabs[parentIndex].id,
            });
            if (!response?.success) throw new Error(response?.error || 'Parent setup failed');
        }
        return tabs.map(tab => tab.id);
    }, { origin, names, parents: initialParents, grouped });
}

async function fixtureState(panel, ids) {
    return panel.evaluate(async ids => {
        const { tabParentMap = {} } = await chrome.storage.session.get('tabParentMap');
        const tabs = (await chrome.tabs.query({})).filter(tab => ids.includes(tab.id))
            .sort((first, second) => first.index - second.index);
        return {
            parents: ids.map(id => tabParentMap[id] ?? null),
            tabs: tabs.map(({ id, groupId, pinned }) => ({ id, groupId, pinned: !!pinned })),
        };
    }, ids);
}

async function renderedTree(panel) {
    return panel.evaluate(names => {
        const rows = Array.from(document.querySelectorAll('.tabTreeViewContainer .container'));
        const nameOf = element => names.find(name => element.textContent.includes(name));
        return {
            order: rows.map(nameOf).filter(Boolean),
            parents: names.map(name => {
                const row = rows.find(element => nameOf(element) === name);
                if (!row) return 'MISSING';
                const ancestor = row.parentElement.parentElement.closest('.fake-li')?.querySelector(':scope > .container');
                return ancestor ? nameOf(ancestor) || 'OTHER' : null;
            }),
        };
    }, names);
}

for (const grouped of [false, true]) {
    for (const scenario of [
        { label: 'middle tab', removedIndex: 1, parents: [null, null, 0, 2, 0, 0] },
        { label: 'root tab', removedIndex: 0, parents: [null, null, 1, 2, 1, null] },
    ]) {
        test(`${grouped ? 'grouped menu' : 'ungrouped native'} close of ${scenario.label} preserves the remaining tree`, async ({ extension }) => {
            const { panel, origin } = extension;
            const ids = await createTree(panel, origin, grouped);
            await expect.poll(() => renderedTree(panel)).toEqual({
                order: names,
                parents: initialParents.map(parentIndex => parentIndex === null ? null : names[parentIndex]),
            });
            await expect.poll(async () => (await fixtureState(panel, ids)).parents)
                .toEqual(initialParents.map(parentIndex => parentIndex === null ? null : ids[parentIndex]));
            const before = await fixtureState(panel, ids);
            expect(before.tabs.map(tab => tab.id)).toEqual(ids);
            expect(before.tabs.every(tab => tab.groupId === before.tabs[0].groupId)).toBe(true);
            expect(before.tabs[0].groupId === -1).toBe(!grouped);

            if (grouped) {
                await panel.locator('.tabTreeViewContainer .container')
                    .filter({ hasText: names[scenario.removedIndex] }).click({ button: 'right' });
                await panel.getByRole('menuitem', { name: /^close tab$/i }).click();
            } else {
                await panel.evaluate(tabId => chrome.tabs.remove(tabId), ids[scenario.removedIndex]);
            }

            await expect.poll(() => fixtureState(panel, ids)).toEqual({
                parents: scenario.parents.map(parentIndex => parentIndex === null ? null : ids[parentIndex]),
                tabs: before.tabs.filter(tab => tab.id !== ids[scenario.removedIndex]),
            });
            await expect.poll(() => renderedTree(panel)).toEqual({
                order: names.filter((name, index) => index !== scenario.removedIndex),
                parents: scenario.parents.map((parentIndex, index) => index === scenario.removedIndex
                    ? 'MISSING' : parentIndex === null ? null : names[parentIndex]),
            });
        });
    }
}