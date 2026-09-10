const path = require('node:path');
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page, baseURL }) => {
    const hostURL = new URL('/popup-escape-host', baseURL).href;
    await page.route(hostURL, route => route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><body><button>Host page</button></body></html>',
    }));
    await page.goto(hostURL);
    await page.evaluate(extensionURL => {
        window.chrome = { runtime: { getURL: file => new URL(file, extensionURL).href } };
    }, baseURL);
    await page.addScriptTag({ path: path.join(__dirname, '../public/content_overlay.js') });
    await expect(page.frameLocator('#tst-popup-overlay iframe').getByPlaceholder('Filter')).toBeFocused();
});

test('Escape from the popup search field closes the overlay', async ({ page }) => {
    const popup = page.frameLocator('#tst-popup-overlay iframe');
    await expect(popup.locator('.tabTreeViewContainer .container')).toHaveCount(35);
    await popup.getByPlaceholder('Filter').press('Escape');
    await expect(page.locator('#tst-popup-overlay')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Host page' })).toBeVisible();
});

test('Escape dismisses a submenu and its menu before closing the popup', async ({ page }) => {
    const popup = page.frameLocator('#tst-popup-overlay iframe');
    await popup.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' }).click({ button: 'right' });
    await popup.getByRole('menuitem', { name: 'Move to group', exact: true }).click();
    await popup.getByRole('menu').press('Escape');
    await expect(popup.getByRole('menuitem', { name: 'Pin tab', exact: true })).toBeVisible();
    await popup.getByRole('menu').press('Escape');
    await expect(popup.getByRole('menu')).toHaveCount(0);
    await expect(popup.getByPlaceholder('Filter')).toBeVisible();
    await popup.getByPlaceholder('Filter').press('Escape');
    await expect(page.locator('#tst-popup-overlay')).toHaveCount(0);
});

test('Escape cancels group editing before closing the popup', async ({ page }) => {
    const popup = page.frameLocator('#tst-popup-overlay iframe');
    const group = popup.locator('[data-group-id="1"]');
    await group.hover();
    await group.locator('.group-edit-icon').click();
    await group.locator('.group-title-input').fill('Unsaved name');
    await group.locator('.group-title-input').press('Escape');
    await expect(group.locator('.group-title')).toHaveText('React Research');
    await expect(group.locator('.group-title-input')).toHaveCount(0);
    await popup.getByPlaceholder('Filter').press('Escape');
    await expect(page.locator('#tst-popup-overlay')).toHaveCount(0);
});

test('Escape still cancels a note draft without closing sidepanel mode', async ({ page }) => {
    const popup = page.frameLocator('#tst-popup-overlay iframe');
    await popup.locator('.dev-mode-toggle button').click();
    await expect(popup.locator('body')).toHaveAttribute('data-mode', 'sidepanel');
    await popup.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' }).click({ button: 'right' });
    await popup.getByRole('menuitem', { name: 'Add Note', exact: true }).click();
    await popup.locator('.note-input').fill('Unsaved note');
    await popup.locator('.note-input').press('Escape');
    await expect(popup.locator('.note-input')).toHaveCount(0);
    await expect(popup.locator('.note-tag')).toHaveCount(0);
    await expect(popup.getByPlaceholder('Filter')).toBeVisible();
    await popup.getByPlaceholder('Filter').press('Escape');
    await expect(popup.locator('.tabTreeViewContainer .container')).toHaveCount(35);
});

test('composition, handled keys and repeated Escape do not close the popup', async ({ page }) => {
    const popup = page.frameLocator('#tst-popup-overlay iframe');
    const search = popup.getByPlaceholder('Filter');
    await search.evaluate(input => {
        input.addEventListener('keydown', event => event.preventDefault(), { once: true });
    });
    await search.press('Escape');
    await search.dispatchEvent('keydown', { key: 'Escape', isComposing: true });
    await search.dispatchEvent('compositionstart');
    await search.dispatchEvent('keydown', { key: 'Escape' });
    await search.dispatchEvent('compositionend');
    await search.dispatchEvent('keydown', { key: 'Escape', repeat: true });
    await search.fill('Hooks Reference');
    await expect(popup.locator('.container').filter({ hasText: 'React Docs - Hooks Reference' })).toBeVisible();
    await search.press('Escape');
    await expect(page.locator('#tst-popup-overlay')).toHaveCount(0);
});

test('Escape leaves sidepanel mode open and works again after switching back', async ({ page }) => {
    const popup = page.frameLocator('#tst-popup-overlay iframe');
    await popup.locator('.dev-mode-toggle button').click();
    await expect(popup.locator('body')).toHaveAttribute('data-mode', 'sidepanel');
    await popup.getByPlaceholder('Filter').press('Escape');
    await expect(popup.locator('.tabTreeViewContainer .container')).toHaveCount(35);
    await popup.locator('.dev-mode-toggle button').click();
    await expect(popup.locator('body')).not.toHaveAttribute('data-mode', 'sidepanel');
    await popup.getByPlaceholder('Filter').press('Escape');
    await expect(page.locator('#tst-popup-overlay')).toHaveCount(0);
});