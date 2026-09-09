const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.dev-mode-toggle button').click();
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'sidepanel');
    await expect(page.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' })).toBeVisible();
});

test('group headers accept subtree drops both collapsed and expanded', async ({ page }) => {
    const target = page.locator('[data-group-id="2"]');
    await target.locator('.group-title').click();
    await expect(target).toHaveClass(/collapsed/);
    await page.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' }).dragTo(target);
    await expect(target.locator('.group-count')).toHaveText('(9)');
    await expect(target).toHaveClass(/collapsed/);
    await expect.poll(() => page.evaluate(() => [2, 3, 4].map(id => window.chrome._tabs.find(tab => tab.id === id).groupId))).toEqual([2, 2, 2]);
    const expanded = page.locator('[data-group-id="1"]');
    await page.locator('.container').filter({ hasText: 'Google Calendar' }).dragTo(expanded);
    await expect(expanded.locator('.group-count')).toHaveText('(5)');
    await expect(expanded).not.toHaveClass(/collapsed/);
});

test('filtered tab menu lists every current-window group and moves hidden descendants', async ({ page }) => {
    await page.getByPlaceholder('Filter').fill('Hooks Reference');
    const tab = page.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' });
    await tab.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Move to group', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'React Research', exact: true })).toBeDisabled();
    await expect(page.getByRole('menuitem', { name: 'Shopping', exact: true })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Work Tasks', exact: true }).click();
    await expect.poll(() => page.evaluate(() => [2, 3, 4].map(id => window.chrome._tabs.find(tab => tab.id === id).groupId))).toEqual([2, 2, 2]);
});

test('duplicate and new-below affect one tab, and reload targets the clicked tab', async ({ page }) => {
    const source = page.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' }).first();
    await source.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Duplicate tab', exact: true }).click();
    await expect(page.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' })).toHaveCount(2);
    await expect.poll(() => page.evaluate(() => window.chrome._tabs.length)).toBe(36);
    await source.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'New tab below', exact: true }).click();
    await expect(page.locator('.container').filter({ hasText: 'New Tab' })).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => window.chrome._tabs.length)).toBe(37);
    await page.evaluate(() => {
        window.__tabReloadEvents = [];
        window.chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (changeInfo.status) window.__tabReloadEvents.push({ tabId, status: changeInfo.status });
        });
    });
    await source.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Reload tab', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__tabReloadEvents.some(event => event.tabId === 2 && event.status === 'loading'))).toBe(true);
});

test('compact groups are opt-in, keep expanded styling, and survive a panel remount', async ({ page }) => {
    const header = page.locator('[data-group-id="1"]');
    await header.locator('.group-title').click();
    await expect(header.locator('.group-count')).toBeVisible();
    await expect(header.locator('.group-favicon-strip')).toBeVisible();
    await page.locator('.ws-toolbar-btn:has(.anticon-setting)').click();
    const setting = page.getByRole('checkbox', { name: 'Simple collapsed groups' });
    await expect(setting).not.toBeChecked();
    await setting.check();
    await page.locator('.ws-toolbar-btn:has(.anticon-arrow-left)').click();
    await expect(header).toHaveClass(/\bcompact\b(?!-)/);
    await expect(header).not.toHaveCSS('background-color', 'rgb(26, 115, 232)');
    await expect(header.locator('.group-dot')).toBeVisible();
    await expect(header.locator('.group-dot')).toHaveCSS('background-color', 'rgb(26, 115, 232)');
    await expect(header.locator('.group-count')).toHaveCount(0);
    await expect(header.locator('.group-favicon-strip')).toHaveCount(0);
    await header.locator('.group-title').click();
    await expect(header).not.toHaveClass(/\bcompact\b(?!-)/);
    await expect(header.locator('.group-count')).toBeVisible();
    await page.locator('.dev-mode-toggle button').click();
    await page.locator('.dev-mode-toggle button').click();
    await header.locator('.group-title').click();
    await expect(header).toHaveClass(/\bcompact\b(?!-)/);
});

for (const colorScheme of ['light', 'dark']) {
    test(`compact groups keep title alignment and theme colors in ${colorScheme} mode`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        await page.locator('.ws-toolbar-btn:has(.anticon-setting)').click();
        await page.getByRole('checkbox', { name: 'Simple collapsed groups' }).check();
        await page.locator('.ws-toolbar-btn:has(.anticon-arrow-left)').click();
        const header = page.locator('[data-group-id="1"]');
        const title = header.locator('.group-title');
        const expandedTitle = await title.boundingBox();
        await page.mouse.move(800, 800);
        const expandedBackground = await header.evaluate(element => getComputedStyle(element).backgroundColor);
        await title.click();
        await page.mouse.move(800, 800);
        await expect(header).toHaveClass(/\bcompact\b(?!-)/);
        const collapsedTitle = await title.boundingBox();
        expect(collapsedTitle.x).toBeCloseTo(expandedTitle.x, 1);
        expect(collapsedTitle.y).toBeCloseTo(expandedTitle.y, 1);
        await expect(title).toHaveCSS('color', colorScheme === 'light' ? 'rgb(63, 63, 63)' : 'rgb(224, 224, 224)');
        await expect(header.locator('.group-dot')).toHaveCSS('background-color', 'rgb(26, 115, 232)');
        await expect(header).toHaveCSS('--group-tint', colorScheme === 'light' ? '12%' : '20%');
        await expect(header).toHaveCSS('background-color', /color\(srgb /);
        const collapsedBackground = await header.evaluate(element => getComputedStyle(element).backgroundColor);
        await header.hover();
        await expect(header).not.toHaveCSS('background-color', collapsedBackground);
        await title.click();
        await page.mouse.move(800, 800);
        await expect(header).toHaveCSS('background-color', expandedBackground);
        await expect(header).toHaveCSS('transition-duration', '0s');
    });
}

test('group selection menu fits a narrow side panel', async ({ page }) => {
    const handle = await page.locator('.dev-resize-handle').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 20);
    await page.mouse.down();
    await page.mouse.move(260, handle.y + 20);
    await page.mouse.up();
    await page.setViewportSize({ width: 280, height: 700 });
    await page.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Move to group', exact: true }).click();
    const bounds = await page.getByRole('menu').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(280);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(700);
});