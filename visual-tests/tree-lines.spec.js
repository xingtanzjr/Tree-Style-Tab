const { test, expect } = require('@playwright/test');

function tabRow(page, title) {
    return page.locator('.container').filter({ hasText: title });
}

async function measureLine(row) {
    return row.evaluate(element => {
        const subtree = element.parentElement.querySelector(':scope > .treeParent');
        const line = subtree.querySelector(':scope > .vertical-line').getBoundingClientRect();
        const lastChild = subtree.querySelector(':scope > .fake-li:last-child');
        const connectorTop = parseFloat(getComputedStyle(lastChild, '::before').top);
        return {
            height: line.height,
            endpointError: line.bottom - (lastChild.getBoundingClientRect().top + connectorTop),
        };
    });
}

async function expectLineAligned(row) {
    await expect.poll(async () => Math.abs((await measureLine(row)).endpointError)).toBeLessThanOrEqual(1);
}

for (const mode of ['popup', 'sidepanel']) {
    test.describe(`${mode} tree lines`, () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/');
            await expect(page.getByPlaceholder('Filter')).toBeVisible();
            if (mode === 'sidepanel') {
                await page.locator('.dev-mode-toggle button').click();
                await expect(page.locator('body')).toHaveAttribute('data-mode', 'sidepanel');
            }
        });

        test('ancestor line follows a non-last branch collapsing and expanding', async ({ page }) => {
            const ancestor = tabRow(page, 'Google Search: react hooks best practices');
            const branch = tabRow(page, 'React Docs - Hooks Reference');
            const descendant = tabRow(page, 'useState');
            await expectLineAligned(ancestor);
            const expanded = await measureLine(ancestor);
            const hiddenRow = await descendant.boundingBox();

            await branch.dblclick();
            await expect(descendant).toHaveCount(0);
            await expectLineAligned(ancestor);
            expect((await measureLine(ancestor)).height).toBeCloseTo(expanded.height - hiddenRow.height * 2, 1);

            await branch.dblclick();
            await expect(descendant).toBeVisible();
            await expectLineAligned(ancestor);
            expect((await measureLine(ancestor)).height).toBeCloseTo(expanded.height, 1);
        });

        test('reopened ancestor respects an already collapsed descendant branch', async ({ page }) => {
            const ancestor = tabRow(page, 'Google Search: react hooks best practices');
            const branch = tabRow(page, 'React Docs - Hooks Reference');
            await branch.dblclick();
            await expect(branch.locator('.collapsed-badge')).toBeVisible();
            await ancestor.dblclick();
            await expect(branch).toHaveCount(0);
            await ancestor.dblclick();
            await expect(branch.locator('.collapsed-badge')).toBeVisible();
            await expect(tabRow(page, 'useState')).toHaveCount(0);
            await expectLineAligned(ancestor);
            await branch.dblclick();
            await expect(tabRow(page, 'useState')).toBeVisible();
            await expectLineAligned(ancestor);
            await expectLineAligned(branch);
        });

        test('collapsing the last branch preserves the ancestor endpoint', async ({ page }) => {
            const ancestor = tabRow(page, 'Google Search: react hooks best practices');
            const lastBranch = tabRow(page, 'React Context vs Redux');
            const descendant = tabRow(page, 'useEffect');
            await descendant.dragTo(lastBranch);
            await expect(lastBranch.locator('..').locator('.container').filter({ hasText: 'useEffect' })).toBeVisible();
            await expectLineAligned(ancestor);
            await expectLineAligned(lastBranch);
            const expanded = await measureLine(ancestor);

            await lastBranch.dblclick();
            await expect(descendant).toHaveCount(0);
            await expectLineAligned(ancestor);
            expect((await measureLine(ancestor)).height).toBeCloseTo(expanded.height, 1);

            await lastBranch.dblclick();
            await expect(descendant).toBeVisible();
            await expectLineAligned(ancestor);
            await expectLineAligned(lastBranch);
            expect((await measureLine(ancestor)).height).toBeCloseTo(expanded.height, 1);
        });

        test('line follows row size changes without a React render', async ({ page }) => {
            const ancestor = tabRow(page, 'Google Search: react hooks best practices');
            await expectLineAligned(ancestor);
            const initial = await measureLine(ancestor);
            const style = await page.addStyleTag({ content: '.fake-li .content-container { padding-block: 8px; }' });
            await expect.poll(async () => (await measureLine(ancestor)).height).toBeGreaterThan(initial.height);
            await expectLineAligned(ancestor);
            await expectLineAligned(tabRow(page, 'React Docs - Hooks Reference'));

            await style.evaluate(element => element.remove());
            await expectLineAligned(ancestor);
            expect((await measureLine(ancestor)).height).toBeCloseTo(initial.height, 1);
        });
    });
}