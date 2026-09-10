const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.dev-mode-toggle button').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(async () => {
        for (const tabId of [2, 14, 16, 18, 20, 32, 33, 34, 35]) {
            await window.chrome.tabs.update(tabId, { pinned: true });
        }
    });
    await expect(page.locator('.pinned-tab')).toHaveCount(9);
});

for (const { width, colorScheme } of [{ width: 900, colorScheme: 'light' }, { width: 360, colorScheme: 'dark' }]) {
    test(`pinned tabs stay in one row with separate arrows at ${width}px in ${colorScheme}`, async ({ page }) => {
        if (width === 360) {
            const handle = await page.locator('.dev-resize-handle').boundingBox();
            await page.mouse.move(handle.x + handle.width / 2, handle.y + 20);
            await page.mouse.down();
            await page.mouse.move(260, handle.y + 20);
            await page.mouse.up();
        }
        await page.setViewportSize({ width, height: 700 });
        await page.emulateMedia({ colorScheme });
        const region = page.getByRole('region', { name: 'Pinned tabs' });
        const previous = page.getByRole('button', { name: 'Scroll pinned tabs left' });
        const next = page.getByRole('button', { name: 'Scroll pinned tabs right' });
        await expect(previous).toBeDisabled();
        await expect(next).toBeEnabled();
        const layout = await region.evaluate(element => {
            const viewport = element.querySelector('.pinned-tabs-viewport').getBoundingClientRect();
            const arrows = Array.from(element.querySelectorAll('.pinned-tabs-nav')).map(button => button.getBoundingClientRect());
            const buttons = Array.from(element.querySelectorAll('.pinned-tab'));
            return {
                singleRow: buttons.every(button => button.offsetTop === buttons[0].offsetTop),
                sizes: buttons.every(button => getComputedStyle(button).width === '36px' && getComputedStyle(button).height === '36px'),
                separate: arrows[0].right <= viewport.left && arrows[1].left >= viewport.right,
                fits: element.getBoundingClientRect().right <= window.innerWidth,
                height: element.offsetHeight,
            };
        });
        expect(layout).toMatchObject({ singleRow: true, sizes: true, separate: true, fits: true });
        expect(layout.height).toBeLessThanOrEqual(54);
        await next.click();
        await expect(previous).toBeEnabled();
        await region.locator('.pinned-tabs-viewport').hover();
        await page.mouse.wheel(0, 1000);
        await expect(next).toBeDisabled();
        await previous.click();
        await expect(next).toBeEnabled();
        await region.locator('.pinned-tabs-viewport').hover();
        await page.mouse.wheel(0, -1000);
        await expect(previous).toBeDisabled();
    });
}

test('wheel input preserves tree position and refreshes do not reset the strip', async ({ page }) => {
    const viewport = page.locator('.pinned-tabs-viewport');
    const tree = page.locator('.tabTreeViewContainer');
    const treeTop = await tree.evaluate(element => element.scrollTop);
    await viewport.hover();
    await page.mouse.wheel(0, 30);
    await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    const scrollLeft = await viewport.evaluate(element => element.scrollLeft);
    await page.evaluate(() => window.chrome.tabs.update(34, { title: 'Music updated', audible: true }));
    await expect(page.getByRole('button', { name: 'Music updated', exact: true })).toBeVisible();
    expect(await viewport.evaluate(element => element.scrollLeft)).toBeCloseTo(scrollLeft, 0);
    await page.mouse.wheel(0, -1000);
    await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBe(0);
    await page.mouse.wheel(30, 0);
    await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    expect(await tree.evaluate(element => element.scrollTop)).toBe(treeTop);
    await page.mouse.wheel(0, -1000);
    await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBe(0);
    await page.evaluate(() => window.chrome.tabs.update(35, { active: true }));
    await expect(page.locator('[data-pinned-tab-id="35"]')).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => viewport.evaluate(element => {
        const area = element.getBoundingClientRect();
        const active = element.querySelector('[data-pinned-tab-id="35"]').getBoundingClientRect();
        return active.left >= area.left && active.right <= area.right + 1;
    })).toBe(true);
});

test('arrows disappear when filtering leaves only one pinned tab', async ({ page }) => {
    await expect(page.locator('.pinned-tabs-nav')).toHaveCount(2);
    await page.getByPlaceholder('Filter').fill('Hooks Reference');
    await expect(page.locator('.pinned-tab')).toHaveCount(1);
    await expect(page.locator('.pinned-tabs-nav')).toHaveCount(0);
    await page.getByPlaceholder('Filter').fill('');
    await expect(page.locator('.pinned-tab')).toHaveCount(9);
    await expect(page.locator('.pinned-tabs-nav')).toHaveCount(2);
});