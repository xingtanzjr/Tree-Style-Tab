const { test, expect } = require('@playwright/test');

const tabRow = (page, title) => page.locator('.tabTreeViewContainer .container').filter({ hasText: title });

async function tabState(page) {
    return page.evaluate(async () => {
        const tabs = await window.chrome.tabs.query({ windowId: 1 });
        const { tabParentMap = {} } = await window.chrome.storage.session.get('tabParentMap');
        return {
            tabs: tabs.map(tab => ({
                id: tab.id, title: tab.title, index: tab.index,
                groupId: tab.groupId, pinned: !!tab.pinned, active: !!tab.active,
            })),
            parents: tabParentMap,
        };
    });
}

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.dev-mode-toggle button').click();
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'sidepanel');
    await expect(tabRow(page, 'React Docs - Hooks Reference')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Pinned tabs' })).toHaveCount(0);
});

for (const source of [
    { id: 2, title: 'React Docs - Hooks Reference', parentId: 1, childIds: [3, 4] },
    { id: 8, title: 'Jira - Sprint Board', parentId: null, childIds: [9, 11] },
    { id: 14, title: 'Gmail - Inbox', parentId: null, childIds: [15] },
]) {
    test(`context menu pins and unpins only ${source.title}, preserving its former subtree`, async ({ page }) => {
        const before = await tabState(page);
        const previousTab = before.tabs.find(tab => tab.id === source.id);
        const expectedParents = { ...before.parents };
        delete expectedParents[source.id];
        for (const childId of source.childIds) {
            if (source.parentId === null) delete expectedParents[childId];
            else expectedParents[childId] = source.parentId;
        }
        const remainingTabs = before.tabs.filter(tab => tab.id !== source.id)
            .map(({ id, groupId, pinned }) => ({ id, groupId, pinned }));

        await tabRow(page, source.title).click({ button: 'right' });
        await expect(page.getByRole('menuitem', { name: 'Unpin tab', exact: true })).toHaveCount(0);
        await page.getByRole('menuitem', { name: 'Pin tab', exact: true }).click();
        const region = page.getByRole('region', { name: 'Pinned tabs' });
        const pinnedButton = region.getByRole('button', { name: source.title, exact: true });
        await expect(pinnedButton).toBeVisible();
        await expect(region.locator('.pinned-tab')).toHaveCount(1);
        await expect(tabRow(page, source.title)).toHaveCount(0);
        await expect.poll(async () => (await tabState(page)).parents).toEqual(expectedParents);

        const afterPin = await tabState(page);
        expect(afterPin.tabs).toHaveLength(before.tabs.length);
        expect(afterPin.tabs.filter(tab => tab.pinned).map(tab => tab.id)).toEqual([source.id]);
        expect(afterPin.tabs[0]).toMatchObject({ id: source.id, index: 0, pinned: true, groupId: -1 });
        expect(afterPin.tabs.filter(tab => tab.id !== source.id)
            .map(({ id, groupId, pinned }) => ({ id, groupId, pinned }))).toEqual(remainingTabs);
        for (const childId of source.childIds) {
            await expect(tabRow(page, before.tabs.find(tab => tab.id === childId).title)).toBeVisible();
        }
        if (previousTab.groupId !== -1) {
            const groupCount = before.tabs.filter(tab => tab.groupId === previousTab.groupId).length;
            await expect(page.locator(`[data-group-id="${previousTab.groupId}"] .group-count`)).toHaveText(`(${groupCount - 1})`);
        }

        await pinnedButton.click();
        await expect(pinnedButton).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(async () => (await tabState(page)).tabs.filter(tab => tab.active).map(tab => tab.id)).toEqual([source.id]);
        await pinnedButton.click({ button: 'right' });
        await expect(page.getByRole('menuitem', { name: 'Pin tab', exact: true })).toHaveCount(0);
        await page.getByRole('menuitem', { name: 'Unpin tab', exact: true }).click();

        await expect(region).toHaveCount(0);
        await expect(tabRow(page, source.title)).toBeVisible();
        await expect.poll(async () => (await tabState(page)).parents).toEqual(expectedParents);
        const afterUnpin = await tabState(page);
        expect(afterUnpin.tabs).toHaveLength(before.tabs.length);
        expect(afterUnpin.tabs[0]).toMatchObject({ id: source.id, index: 0, pinned: false, groupId: -1, active: true });
        expect(afterUnpin.tabs[0].index).not.toBe(previousTab.index);
        expect(afterUnpin.tabs.filter(tab => tab.id !== source.id)
            .map(({ id, groupId, pinned }) => ({ id, groupId, pinned }))).toEqual(remainingTabs);
        await tabRow(page, source.title).click({ button: 'right' });
        await expect(page.getByRole('menuitem', { name: 'Pin tab', exact: true })).toBeEnabled();
        await expect(page.getByRole('menuitem', { name: 'Collapse', exact: true })).toHaveCount(0);
        await page.getByRole('menu').press('Escape');
    });
}

test('unpinning one of multiple pinned tabs places it after the remaining pinned tabs', async ({ page }) => {
    for (const title of ['React Docs - Hooks Reference', 'Jira - Sprint Board']) {
        await tabRow(page, title).click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Pin tab', exact: true }).click();
        await expect(page.getByRole('region', { name: 'Pinned tabs' }).getByRole('button', { name: title, exact: true })).toBeVisible();
    }
    const region = page.getByRole('region', { name: 'Pinned tabs' });
    await expect(region.locator('.pinned-tab')).toHaveCount(2);
    await expect.poll(() => region.locator('.pinned-tab').evaluateAll(buttons => buttons.map(button => Number(button.dataset.pinnedTabId)))).toEqual([2, 8]);
    await region.getByRole('button', { name: 'React Docs - Hooks Reference', exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Unpin tab', exact: true }).click();
    await expect(region.locator('.pinned-tab')).toHaveCount(1);
    await expect(region.getByRole('button', { name: 'Jira - Sprint Board', exact: true })).toBeVisible();
    await expect(tabRow(page, 'React Docs - Hooks Reference')).toBeVisible();
    await expect.poll(async () => (await tabState(page)).tabs.slice(0, 2).map(({ id, index, pinned, groupId }) => ({ id, index, pinned, groupId }))).toEqual([
        { id: 8, index: 0, pinned: true, groupId: -1 },
        { id: 2, index: 1, pinned: false, groupId: -1 },
    ]);
});

test('pin and unpin from filtered results preserve hidden descendants', async ({ page }) => {
    await page.getByPlaceholder('Filter').fill('Hooks Reference');
    await expect(tabRow(page, 'useState')).toHaveCount(0);
    await expect(tabRow(page, 'useEffect')).toHaveCount(0);
    await tabRow(page, 'React Docs - Hooks Reference').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Pin tab', exact: true }).click();
    const pinnedButton = page.getByRole('region', { name: 'Pinned tabs' }).getByRole('button', { name: 'React Docs - Hooks Reference', exact: true });
    await expect(pinnedButton).toBeVisible();
    await expect.poll(async () => {
        const state = await tabState(page);
        return [3, 4].map(id => ({ id, pinned: state.tabs.find(tab => tab.id === id).pinned, groupId: state.tabs.find(tab => tab.id === id).groupId, parentId: state.parents[id] }));
    }).toEqual([
        { id: 3, pinned: false, groupId: 1, parentId: 1 },
        { id: 4, pinned: false, groupId: 1, parentId: 1 },
    ]);
    await pinnedButton.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Unpin tab', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Pinned tabs' })).toHaveCount(0);
    await page.getByPlaceholder('Filter').fill('');
    await expect(tabRow(page, 'useState')).toBeVisible();
    await expect(tabRow(page, 'useEffect')).toBeVisible();
    await expect.poll(async () => {
        const state = await tabState(page);
        return { sourceParent: state.parents[2] ?? null, childParents: [state.parents[3], state.parents[4]] };
    }).toEqual({ sourceParent: null, childParents: [1, 1] });
});