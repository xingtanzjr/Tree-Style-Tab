// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Visual regression tests for Tab Tree extension.
 *
 * Run against the mock dev server (REACT_APP_USE_MOCK=true).
 * Mock data: ~35 tabs in 3 groups (React Research/blue, Work Tasks/green,
 * Shopping/orange), ungrouped tabs with parent-child tree, one saved workspace.
 *
 * ## How to verify baselines
 *
 * 1. Run `npx playwright test --update-snapshots` to generate/update baselines.
 * 2. Open `visual-tests/screenshots/` and review each PNG manually.
 *    - Or run `npx playwright show-report` to browse the HTML report with
 *      all screenshots inline (click any test → "Attachments" section).
 * 3. Each test uses `test.step()` to capture intermediate states — the HTML
 *    report shows step-by-step breakdown with embedded screenshots.
 * 4. Commit the screenshots/ folder to git. On future runs, any pixel diff
 *    beyond 1% will fail the test and show a visual diff in the report.
 *
 * ## Naming convention
 *
 * Screenshots are named: `{NNN}-{mode}-{feature}-{state}.png`
 * where NNN is a 3-digit sequence matching the test order (001–034).
 *   e.g. `004-popup-search-keyword-highlighted.png`
 *        `020-sidepanel-mark-popup-6-options.png`
 */

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

async function waitForTree(page) {
    await page.waitForSelector('.tabTreeView', { timeout: 8000 });
    await page.waitForTimeout(500);
}

async function switchToSidepanel(page) {
    const toggleBtn = page.locator('.dev-mode-toggle button');
    await toggleBtn.click();
    await page.waitForTimeout(300);
    const text = await toggleBtn.textContent();
    if (text.includes('Popup')) {
        await toggleBtn.click();
        await page.waitForTimeout(300);
    }
}

async function setupPage(page, opts = {}) {
    if (opts.colorScheme) {
        await page.emulateMedia({ colorScheme: opts.colorScheme });
    }
    await page.goto('/');
    await waitForTree(page);
    if (opts.sidepanel) {
        await switchToSidepanel(page);
        await page.waitForTimeout(500);
    }
    await page.evaluate(() => {
        const toggle = document.querySelector('.dev-mode-toggle');
        if (toggle) toggle.style.display = 'none';
    });
}

/** Navigate to workspace list in sidepanel */
async function openWorkspaceList(page) {
    const menuTrigger = page.locator('.ws-menu-trigger');
    await menuTrigger.hover();
    await page.waitForTimeout(300);
    await page.locator('.ws-menu-item').first().click();
    await page.waitForTimeout(500);
}

// ════════════════════════════════════════════════════════════════════
//  POPUP MODE
// ════════════════════════════════════════════════════════════════════

test.describe('Popup Mode', () => {

    // ── Layout & Theme ──────────────────────────────────────────────

    test('default view: full tab tree with groups, children, connector lines', async ({ page }) => {
        await setupPage(page);
        await expect(page).toHaveScreenshot('001-popup-default-full-tree-with-groups.png');
    });

    test('dark theme: overall tab tree color scheme', async ({ page }) => {
        await setupPage(page, { colorScheme: 'dark' });
        await expect(page).toHaveScreenshot('002-popup-theme-dark-overall.png');
    });

    test('light theme: overall tab tree color scheme', async ({ page }) => {
        await setupPage(page, { colorScheme: 'light' });
        await expect(page).toHaveScreenshot('003-popup-theme-light-overall.png');
    });

    // ── Search & Filter ─────────────────────────────────────────────

    test('search filter: matching text highlighted in red in title and URL', async ({ page }) => {
        await setupPage(page);

        await test.step('type search keyword "React"', async () => {
            const searchInput = page.locator('input[type="text"]').first();
            await searchInput.fill('React');
            await page.waitForTimeout(400);
        });

        await test.step('verify: matching tabs highlighted, non-matching filtered out', async () => {
            await expect(page).toHaveScreenshot('004-popup-search-keyword-highlighted.png');
        });
    });

    test('search no results: shows "press Enter to search the web" tip', async ({ page }) => {
        await setupPage(page);

        await test.step('type a non-existent keyword', async () => {
            const searchInput = page.locator('input[type="text"]').first();
            await searchInput.fill('xyznonexistent12345');
            await page.waitForTimeout(400);
        });

        await test.step('verify: tab area empty, search tip displayed', async () => {
            await expect(page).toHaveScreenshot('005-popup-search-no-match-shows-tip.png');
        });
    });

    test('search bookmarks: keyword matches bookmark entries', async ({ page }) => {
        await setupPage(page);

        await test.step('type keyword to search bookmarks', async () => {
            const searchInput = page.locator('input[type="text"]').first();
            await searchInput.fill('book');
            await page.waitForTimeout(400);
        });

        await test.step('verify: bookmark results shown with star icon', async () => {
            await expect(page).toHaveScreenshot('006-popup-search-bookmark-results-shown.png');
        });
    });

    // ── Selection & Navigation ──────────────────────────────────────

    test('click to select tab: blue background highlight', async ({ page }) => {
        await setupPage(page);

        await test.step('click the 3rd tab', async () => {
            const tabs = page.locator('.container').filter({ hasNot: page.locator('.group-container') });
            await tabs.nth(2).click();
            await page.waitForTimeout(200);
        });

        await test.step('verify: tab has selected background color', async () => {
            await expect(page).toHaveScreenshot('007-popup-tab-selected-blue-highlight.png');
        });
    });

    test('keyboard navigation: ArrowDown selects tabs sequentially, hover effect gone', async ({ page }) => {
        await setupPage(page);

        await test.step('press ArrowDown 3 times to enter keyboard mode', async () => {
            for (let i = 0; i < 3; i++) {
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(150);
            }
        });

        await test.step('verify: body switches to keyboard-mode, selected item stays highlighted', async () => {
            await expect(page).toHaveScreenshot('008-popup-keyboard-nav-selected-persistent.png');
        });
    });

    // ── Collapse & Expand ───────────────────────────────────────────

    test('collapse group: click chevron to collapse, show favicon strip', async ({ page }) => {
        await setupPage(page);

        await test.step('click first group chevron to collapse', async () => {
            const chevron = page.locator('.group-chevron').first();
            await chevron.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: group collapsed, favicon preview strip shown', async () => {
            await expect(page).toHaveScreenshot('009-popup-group-collapsed-favicon-strip.png');
        });
    });

    test('all groups collapsed: compact layout with all groups folded', async ({ page }) => {
        await setupPage(page);

        await test.step('collapse all groups one by one', async () => {
            const chevrons = page.locator('.group-chevron');
            const count = await chevrons.count();
            for (let i = 0; i < count; i++) {
                await chevrons.nth(i).click();
                await page.waitForTimeout(200);
            }
        });

        await test.step('verify: compact view with all groups collapsed', async () => {
            await expect(page).toHaveScreenshot('010-popup-all-groups-collapsed-compact.png');
        });
    });

    test('collapse subtree: double-click parent hides children, shows +N badge', async ({ page }) => {
        await setupPage(page);

        await test.step('double-click a tab that has children', async () => {
            // Find a non-group tab that has child tabs (.fake-ul sibling)
            const parentTab = page.locator('.fake-li:not(.group-container-li):has(> .fake-ul) > .container').first();
            await parentTab.dblclick();
            await page.waitForTimeout(600);
        });

        await test.step('verify: children hidden, +N badge shown on favicon', async () => {
            await expect(page.locator('.collapsed-badge').first()).toBeVisible({ timeout: 3000 });
            await expect(page).toHaveScreenshot('011-popup-subtree-collapsed-badge-count.png');
        });
    });

    // ── Tree Structure ──────────────────────────────────────────────

    test('tree structure: indentation levels and dashed connector lines', async ({ page }) => {
        await setupPage(page);
        const treeContainer = page.locator('.tabTreeViewContainer');
        await expect(treeContainer).toHaveScreenshot('012-popup-tree-indentation-connector-lines.png');
    });

    // ── Hover Controls ──────────────────────────────────────────────

    test('hover parent tab: shows "close subtabs" control bar (Alt+W hint)', async ({ page }) => {
        await setupPage(page);

        await test.step('hover over a tab that has children', async () => {
            const parentTab = page.locator('.fake-li:has(.fake-ul) > .container').first();
            if (await parentTab.count() > 0) {
                await parentTab.hover();
                await page.waitForTimeout(300);
            }
        });

        await test.step('verify: Alt+W close subtabs button shown', async () => {
            await expect(page).toHaveScreenshot('013-popup-hover-close-subtabs-control.png');
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  SIDEPANEL MODE
// ════════════════════════════════════════════════════════════════════

test.describe('Sidepanel Mode', () => {

    // ── Layout & Theme ──────────────────────────────────────────────

    test('default view: full-height layout with bottom toolbar and new-tab button', async ({ page }) => {
        await setupPage(page, { sidepanel: true });
        await expect(page).toHaveScreenshot('014-sidepanel-default-full-height-with-toolbar.png');
    });

    test('dark theme: sidepanel overall color scheme', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'dark' });
        await expect(page).toHaveScreenshot('015-sidepanel-theme-dark-overall.png');
    });

    test('light theme: sidepanel overall color scheme', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'light' });
        await expect(page).toHaveScreenshot('016-sidepanel-theme-light-overall.png');
    });

    test('filter bar: search input + "+" new tab button', async ({ page }) => {
        await setupPage(page, { sidepanel: true });
        const filterBar = page.locator('.filter-bar');
        await expect(filterBar).toHaveScreenshot('017-sidepanel-filter-bar-with-new-tab-btn.png');
    });

    // ── Search ──────────────────────────────────────────────────────

    test('search filter: keyword highlighted in sidepanel', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('type search keyword "React"', async () => {
            const searchInput = page.locator('input[type="text"]').first();
            await searchInput.fill('React');
            await page.waitForTimeout(400);
        });

        await test.step('verify: matching tabs highlighted, filter bar + toolbar visible', async () => {
            await expect(page).toHaveScreenshot('018-sidepanel-search-keyword-highlighted.png');
        });
    });

    // ── Hover Actions ───────────────────────────────────────────────

    test('hover tab: shows close(×) and mark(🏷) buttons on right', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover the first regular tab', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(300);
        });

        await test.step('verify: × close button and 🏷 mark button appear', async () => {
            await expect(page).toHaveScreenshot('019-sidepanel-hover-close-and-mark-btns.png');
        });
    });

    // ── Mark System ─────────────────────────────────────────────────

    test('mark popup: click 🏷 shows 6 options (clear + 5 marks)', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover tab → click mark button', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            const markBtn = page.locator('.sp-mark-btn').first();
            await markBtn.click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: popup shows clear + ✓ 📌 ✕ ⚠ ? (6 icons total)', async () => {
            await expect(page).toHaveScreenshot('020-sidepanel-mark-popup-6-options.png');
        });
    });

    test('mark tab: select "done ✓" shows green right border + icon badge', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover → open mark popup → select first mark (check)', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            await page.locator('.sp-mark-btn').first().click();
            await page.waitForTimeout(200);
            await page.locator('.mark-icon-option').nth(1).click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: green right border + green ✓ badge on favicon', async () => {
            await expect(page).toHaveScreenshot('021-sidepanel-tab-marked-check-green-border.png');
        });
    });

    test('all 5 mark types: check/pin/close/warning/question with colored borders', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('assign a different mark to each of 5 tabs', async () => {
            const tabs = page.locator('.container:not(.group-container)');
            const tabCount = Math.min(await tabs.count(), 5);
            for (let i = 0; i < tabCount; i++) {
                await tabs.nth(i).hover();
                await page.waitForTimeout(150);
                await page.locator('.sp-mark-btn').first().click();
                await page.waitForTimeout(150);
                await page.locator('.mark-icon-option').nth(i + 1).click();
                await page.waitForTimeout(150);
            }
        });

        await test.step('click blank area to close popup', async () => {
            await page.locator('.tabTreeViewContainer').click({ position: { x: 5, y: 5 } });
            await page.waitForTimeout(300);
        });

        await test.step('verify: 5 tabs show green/pink/red/orange/purple borders and badges', async () => {
            await expect(page).toHaveScreenshot('022-sidepanel-5-mark-types-colored-borders.png');
        });
    });

    // ── Tab Groups ──────────────────────────────────────────────────

    test('group expanded: colored left border + group name + tab count + chevron', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('screenshot the first expanded group area', async () => {
            const groupContainer = page.locator('.group-container').first();
            const groupParent = groupContainer.locator('..');
            await expect(groupParent).toHaveScreenshot('023-sidepanel-group-expanded-colored-border.png');
        });
    });

    test('group collapsed: click chevron hides children, shows favicon strip', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('click chevron to collapse first group', async () => {
            const chevron = page.locator('.group-chevron').first();
            await chevron.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: group header visible, children hidden, favicon strip shown', async () => {
            await expect(page).toHaveScreenshot('024-sidepanel-group-collapsed-favicon-strip.png');
        });
    });

    test('group edit mode: double-click title shows input + 9-color dot picker', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('double-click group header to enter edit mode', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.dblclick();
            await page.waitForTimeout(400);
        });

        await test.step('verify: title input + 9 color dot picker shown', async () => {
            await expect(page).toHaveScreenshot('025-sidepanel-group-edit-title-color-picker.png');
        });
    });

    // ── Keyboard Navigation ─────────────────────────────────────────

    test('keyboard navigation: ArrowDown selects tab, body switches to keyboard-mode', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('press ArrowDown 3 times', async () => {
            for (let i = 0; i < 3; i++) {
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(150);
            }
        });

        await test.step('verify: keyboard-mode selection style in sidepanel', async () => {
            await expect(page).toHaveScreenshot('026-sidepanel-keyboard-nav-selected.png');
        });
    });

    // ── Collapse Subtree ────────────────────────────────────────────

    test('collapse subtree: double-click hides children + shows +N badge', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('double-click a tab with children', async () => {
            const parentTabs = page.locator('.fake-li:has(.fake-ul) > .container');
            if (await parentTabs.count() > 0) {
                await parentTabs.first().dblclick();
                await page.waitForTimeout(400);
            }
        });

        await test.step('verify: children hidden, +N shown on favicon', async () => {
            await expect(page).toHaveScreenshot('027-sidepanel-subtree-collapsed-badge.png');
        });
    });

    // ── Workspace Toolbar ───────────────────────────────────────────

    test('toolbar: fixed bottom bar with folder, help, and settings buttons', async ({ page }) => {
        await setupPage(page, { sidepanel: true });
        const toolbar = page.locator('.ws-toolbar');
        await expect(toolbar).toHaveScreenshot('028-sidepanel-toolbar-3-buttons.png');
    });

    test('toolbar menu: hover folder icon shows "My Workspaces" + "Save Workspace"', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover folder icon to trigger menu', async () => {
            const menuTrigger = page.locator('.ws-menu-trigger');
            await menuTrigger.hover();
            await page.waitForTimeout(400);
        });

        await test.step('verify: popup menu with 2 options', async () => {
            await expect(page).toHaveScreenshot('029-sidepanel-toolbar-menu-2-items.png');
        });
    });

    // ── Workspace Save ──────────────────────────────────────────────

    test('save workspace: shows name input + save/cancel buttons', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open menu → click "Save Workspace"', async () => {
            const menuTrigger = page.locator('.ws-menu-trigger');
            await menuTrigger.hover();
            await page.waitForTimeout(300);
            await page.locator('.ws-menu-item').last().click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: toolbar replaced by input + buttons', async () => {
            await expect(page).toHaveScreenshot('030-sidepanel-ws-save-name-input-buttons.png');
        });
    });

    // ── Workspace List ──────────────────────────────────────────────

    test('workspace list: shows saved workspace cards (name + tab count + date)', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open workspace list', async () => {
            await openWorkspaceList(page);
        });

        await test.step('verify: list cards show name, tab count, date', async () => {
            await expect(page).toHaveScreenshot('031-sidepanel-ws-list-cards.png');
        });
    });

    test('workspace list hover: shows restore and delete action buttons', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open list → hover first workspace card', async () => {
            await openWorkspaceList(page);
            const wsItem = page.locator('.ws-item').first();
            await wsItem.hover();
            await page.waitForTimeout(300);
        });

        await test.step('verify: restore ↗ and delete 🗑 buttons on card right side', async () => {
            await expect(page).toHaveScreenshot('032-sidepanel-ws-list-hover-actions.png');
        });
    });

    test('delete confirmation: click 🗑 shows "confirm delete?" + delete/cancel buttons', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open list → click delete button', async () => {
            await openWorkspaceList(page);
            const deleteBtn = page.locator('.ws-icon-btn-delete').first();
            await deleteBtn.click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: inline popover with confirmation text + red delete button', async () => {
            await expect(page).toHaveScreenshot('033-sidepanel-ws-delete-confirm-popover.png');
        });
    });

    // ── Workspace Preview ───────────────────────────────────────────

    test('workspace preview: header (name + tab count + date + restore button) + tab tree', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open list → click workspace card to enter preview', async () => {
            await openWorkspaceList(page);
            const wsItem = page.locator('.ws-item').first();
            await wsItem.click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: preview header + full tab tree', async () => {
            await expect(page).toHaveScreenshot('034-sidepanel-ws-preview-header-and-tree.png');
        });
    });
});
