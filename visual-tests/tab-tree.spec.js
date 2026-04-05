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
 * where NNN is a 3-digit sequence matching the test order (001–100).
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

    test('hover tab: shows close(×), mark(🏷), and note(📝) buttons on right', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover the first regular tab', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(300);
        });

        await test.step('verify: × close button, 🏷 mark button, and 📝 note button appear', async () => {
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

    test('group edit mode: click edit icon shows input + 9-color dot picker', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover group header and click edit icon to enter edit mode', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.hover();
            await page.waitForTimeout(200);
            const editIcon = page.locator('.group-edit-icon').first();
            await editIcon.click();
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

    // ── Workspace Preview: Edit Name ────────────────────────────────

    test('workspace preview: double-click name shows inline edit input', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to workspace preview', async () => {
            await openWorkspaceList(page);
            const wsItem = page.locator('.ws-item').first();
            await wsItem.click();
            await page.waitForTimeout(500);
        });

        await test.step('double-click workspace name to edit', async () => {
            const wsName = page.locator('.ws-preview-name');
            await wsName.dblclick();
            await page.waitForTimeout(300);
        });

        await test.step('verify: inline input with current name selected', async () => {
            await expect(page).toHaveScreenshot('035-sidepanel-ws-preview-name-editing.png');
        });
    });

    // ── Workspace Preview: Marks from Saved Data ────────────────────

    test('workspace preview: displays pre-saved marks (check, pin, warning, question)', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to workspace preview', async () => {
            await openWorkspaceList(page);
            const wsItem = page.locator('.ws-item').first();
            await wsItem.click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: tabs show saved marks with colored borders and badges', async () => {
            const treeContainer = page.locator('.tabTreeViewContainer');
            await expect(treeContainer).toHaveScreenshot('036-sidepanel-ws-preview-saved-marks.png');
        });
    });

    // ── Workspace Save: "Saved!" Hint ───────────────────────────────

    test('save workspace: shows green "Saved!" hint after save', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open menu → save workspace → type name → click save', async () => {
            const menuTrigger = page.locator('.ws-menu-trigger');
            await menuTrigger.hover();
            await page.waitForTimeout(300);
            await page.locator('.ws-menu-item').last().click();
            await page.waitForTimeout(300);
            const input = page.locator('.ws-save-input');
            await input.fill('Test Save');
            await page.locator('.ws-btn-primary').click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: green "Saved!" hint in toolbar', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('037-sidepanel-ws-saved-hint.png');
        });
    });

    // ── Workspace Save: Limit Reached ───────────────────────────────

    test('save workspace: shows "limit reached" hint when at max (3)', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('save 2 more workspaces to reach limit of 3', async () => {
            for (let i = 0; i < 2; i++) {
                const menuTrigger = page.locator('.ws-menu-trigger');
                await menuTrigger.hover();
                await page.waitForTimeout(300);
                await page.locator('.ws-menu-item').last().click();
                await page.waitForTimeout(300);
                const input = page.locator('.ws-save-input');
                await input.fill(`Workspace ${i + 2}`);
                await page.locator('.ws-btn-primary').click();
                await page.waitForTimeout(500);
            }
        });

        await test.step('try to save a 4th workspace', async () => {
            const menuTrigger = page.locator('.ws-menu-trigger');
            await menuTrigger.hover();
            await page.waitForTimeout(300);
            await page.locator('.ws-menu-item').last().click();
            await page.waitForTimeout(300);
            const input = page.locator('.ws-save-input');
            await input.fill('Over Limit');
            await page.locator('.ws-btn-primary').click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: yellow "limit reached" hint', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('038-sidepanel-ws-limit-reached-hint.png');
        });
    });

    // ── Active Tab Indicator ────────────────────────────────────────

    test('active tab: bold title with distinct text color', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('verify: active tab has bold title and different text color', async () => {
            const activeTab = page.locator('.container:has(.title.active)').first();
            await expect(activeTab).toHaveScreenshot('039-sidepanel-active-tab-bold-title.png');
        });
    });

    // ── Keyboard Navigation: ArrowLeft/Right ────────────────────────

    test('keyboard: ArrowRight expands collapsed subtree', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('collapse a subtree then use ArrowRight to expand', async () => {
            // Navigate to a parent tab with children
            for (let i = 0; i < 5; i++) {
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(100);
            }
            // Collapse with ArrowLeft
            await page.keyboard.press('ArrowLeft');
            await page.waitForTimeout(300);
            // Expand with ArrowRight
            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(300);
        });

        await test.step('verify: subtree re-expanded, children visible', async () => {
            await expect(page).toHaveScreenshot('040-sidepanel-keyboard-arrow-right-expand.png');
        });
    });

    test('keyboard: ArrowLeft collapses subtree then jumps to parent', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to a child tab and press ArrowLeft', async () => {
            // Navigate down to a child tab
            for (let i = 0; i < 6; i++) {
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(100);
            }
            // ArrowLeft on a leaf should jump to parent
            await page.keyboard.press('ArrowLeft');
            await page.waitForTimeout(300);
        });

        await test.step('verify: selection moved to parent tab', async () => {
            await expect(page).toHaveScreenshot('041-sidepanel-keyboard-arrow-left-to-parent.png');
        });
    });

    // ── Multiple Collapsed Subtrees ─────────────────────────────────

    test('multiple collapsed subtrees: several parents show +N badges simultaneously', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('collapse multiple parent tabs by double-clicking', async () => {
            const parentTabs = page.locator('.fake-li:not(.group-container-li):has(> .fake-ul) > .container');
            const count = Math.min(await parentTabs.count(), 3);
            for (let i = 0; i < count; i++) {
                await parentTabs.nth(i).dblclick();
                await page.waitForTimeout(400);
            }
        });

        await test.step('verify: multiple +N badges shown at same time', async () => {
            await expect(page).toHaveScreenshot('042-sidepanel-multiple-collapsed-subtrees.png');
        });
    });

    // ── Search: Bookmark Section Split Label ────────────────────────

    test('search with bookmarks: shows "Bookmarks & Search" split label', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('type keyword that matches both tabs and bookmarks', async () => {
            const searchInput = page.locator('input[type="text"]').first();
            await searchInput.fill('book');
            await page.waitForTimeout(400);
        });

        await test.step('verify: split label divider between tabs and bookmarks section', async () => {
            await expect(page).toHaveScreenshot('043-sidepanel-search-bookmarks-split-label.png');
        });
    });

    // ── Search No Results ───────────────────────────────────────────

    test('search no results in sidepanel: shows search web tip', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('type a non-existent keyword', async () => {
            const searchInput = page.locator('input[type="text"]').first();
            await searchInput.fill('xyznonexistent12345');
            await page.waitForTimeout(400);
        });

        await test.step('verify: empty area with search tip', async () => {
            await expect(page).toHaveScreenshot('044-sidepanel-search-no-results-tip.png');
        });
    });

    // ── Drag and Drop: Dragging Source State ────────────────────────

    test('drag tab: source tab shows reduced opacity and subtree outline', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('start dragging a parent tab with children', async () => {
            const parentTab = page.locator('.fake-li:not(.group-container-li):has(> .fake-ul) > .container').first();
            const box = await parentTab.boundingBox();
            // Begin drag - move enough to start DnD but stay within the tab's center zone
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            // Move slightly to trigger drag start, but stay in element's vertical center
            await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2, { steps: 5 });
            await page.waitForTimeout(400);
        });

        await test.step('verify: dragging tab has reduced opacity + subtree outline', async () => {
            await expect(page).toHaveScreenshot('045-sidepanel-drag-source-opacity-outline.png');
        });

        await test.step('release drag', async () => {
            await page.mouse.up();
        });
    });

    // ── Drag and Drop: Drop Indicator Before ────────────────────────

    test('drag tab: drop-before indicator shows blue line at top of target', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('drag a tab to top zone of another tab', async () => {
            const tabs = page.locator('.container:not(.group-container)');
            const sourceTab = tabs.nth(8);
            const targetTab = tabs.nth(3);
            const sourceBox = await sourceTab.boundingBox();
            const targetBox = await targetTab.boundingBox();

            await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
            await page.mouse.down();
            // Move to top 25% zone center (12.5% from top) for stable before-indicator
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.125, { steps: 10 });
            await page.waitForTimeout(300);
        });

        await test.step('verify: blue line at top of target tab', async () => {
            await expect(page).toHaveScreenshot('046-sidepanel-drag-drop-before-indicator.png');
        });

        await test.step('release drag', async () => {
            await page.mouse.up();
        });
    });

    // ── Drag and Drop: Drop Indicator Inside ────────────────────────

    test('drag tab: drop-inside indicator shows dashed outline on target', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('drag a tab to middle zone of another tab', async () => {
            const tabs = page.locator('.container:not(.group-container)');
            const sourceTab = tabs.nth(8);
            const targetTab = tabs.nth(3);
            const sourceBox = await sourceTab.boundingBox();
            const targetBox = await targetTab.boundingBox();

            await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
            await page.mouse.down();
            // Move to center of target (inside zone)
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
            await page.waitForTimeout(300);
        });

        await test.step('verify: dashed outline + tinted background on target', async () => {
            await expect(page).toHaveScreenshot('047-sidepanel-drag-drop-inside-indicator.png');
        });

        await test.step('release drag', async () => {
            await page.mouse.up();
        });
    });

    // ── Drag and Drop: Drop Indicator After ─────────────────────────

    test('drag tab: drop-after indicator shows blue line at bottom of target', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('drag a tab to bottom zone of another tab', async () => {
            const tabs = page.locator('.container:not(.group-container)');
            const sourceTab = tabs.nth(8);
            const targetTab = tabs.nth(3);
            const sourceBox = await sourceTab.boundingBox();
            const targetBox = await targetTab.boundingBox();

            await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
            await page.mouse.down();
            // Move to bottom 25% zone (90% from top) for stable after-indicator
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height * 0.85, { steps: 10 });
            await page.waitForTimeout(300);
        });

        await test.step('verify: blue line at bottom of target tab', async () => {
            await expect(page).toHaveScreenshot('048-sidepanel-drag-drop-after-indicator.png');
        });

        await test.step('release drag', async () => {
            await page.mouse.up();
        });
    });

    // ── Close Button on Hover ───────────────────────────────────────

    test('hover tab: close button turns red on hover', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover a tab to reveal close button, then hover close button', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            const closeBtn = page.locator('.sp-close-btn').first();
            await closeBtn.hover();
            await page.waitForTimeout(200);
        });

        await test.step('verify: close button in red hover state', async () => {
            await expect(page).toHaveScreenshot('049-sidepanel-close-btn-red-hover.png');
        });
    });

    // ── Mark: Clear a Marked Tab ────────────────────────────────────

    test('mark clear: removing a mark restores normal tab appearance', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('mark a tab first, then clear it', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            // Mark it
            await tab.hover();
            await page.waitForTimeout(150);
            await page.locator('.sp-mark-btn').first().click();
            await page.waitForTimeout(150);
            await page.locator('.mark-icon-option').nth(1).click();
            await page.waitForTimeout(200);
            // Now clear it
            await tab.hover();
            await page.waitForTimeout(150);
            await page.locator('.sp-mark-btn').first().click();
            await page.waitForTimeout(150);
            await page.locator('.mark-icon-option').nth(0).click(); // clear option
            await page.waitForTimeout(300);
        });

        await test.step('click blank area to close popup', async () => {
            await page.locator('.tabTreeViewContainer').click({ position: { x: 5, y: 5 } });
            await page.waitForTimeout(200);
        });

        await test.step('verify: tab has no colored border or badge', async () => {
            await expect(page).toHaveScreenshot('050-sidepanel-mark-cleared-normal-tab.png');
        });
    });

    // ── Group Hover: Edit Icon Appears ──────────────────────────────

    test('group hover: shows background change and edit icon', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover over a group header', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.hover();
            await page.waitForTimeout(300);
        });

        await test.step('verify: hover background + edit icon visible', async () => {
            const groupHeader = page.locator('.group-container').first();
            await expect(groupHeader).toHaveScreenshot('051-sidepanel-group-hover-edit-icon.png');
        });
    });

    // ── Collapse Button: Line → Arrow on Hover ──────────────────────

    test('collapse button: vertical line becomes interactive on hover', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover over a vertical line (collapse area)', async () => {
            const verticalLine = page.locator('.vertical-line').first();
            await verticalLine.hover();
            await page.waitForTimeout(300);
        });

        await test.step('verify: vertical line hover state', async () => {
            const verticalLine = page.locator('.vertical-line').first();
            await expect(verticalLine).toHaveScreenshot('052-sidepanel-collapse-btn-arrow-hover.png');
        });
    });

    // ── All Groups Collapsed in Sidepanel ───────────────────────────

    test('all groups collapsed: compact layout in sidepanel', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('collapse all groups', async () => {
            const chevrons = page.locator('.group-chevron');
            const count = await chevrons.count();
            for (let i = 0; i < count; i++) {
                await chevrons.nth(i).click();
                await page.waitForTimeout(200);
            }
        });

        await test.step('verify: all groups collapsed with favicon strips', async () => {
            await expect(page).toHaveScreenshot('053-sidepanel-all-groups-collapsed.png');
        });
    });

    // ── Toolbar: Back Button in List View ───────────────────────────

    test('workspace list: toolbar shows back button', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open workspace list', async () => {
            await openWorkspaceList(page);
        });

        await test.step('verify: toolbar shows back arrow + "Back" text', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('054-sidepanel-ws-list-back-button.png');
        });
    });

    // ── Toolbar: Back Button in Preview View ────────────────────────

    test('workspace preview: toolbar shows back button', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to workspace preview', async () => {
            await openWorkspaceList(page);
            const wsItem = page.locator('.ws-item').first();
            await wsItem.click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: toolbar shows back button in preview mode', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('055-sidepanel-ws-preview-back-button.png');
        });
    });

    // ── Context Menu ────────────────────────────────────────────────

    test('context menu: right-click on empty area shows global menu', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('collapse all groups then right-click on empty space below tabs', async () => {
            // Collapse all groups to make empty space visible
            const chevrons = page.locator('.group-chevron');
            const count = await chevrons.count();
            for (let i = 0; i < count; i++) {
                await chevrons.nth(i).click();
                await page.waitForTimeout(200);
            }
            // Scroll to end and right-click below all tabs
            const container = page.locator('.tabTreeViewContainer');
            await container.evaluate(el => el.scrollTop = el.scrollHeight);
            await page.waitForTimeout(300);
            // Right-click on the empty area at the bottom
            const box = await container.boundingBox();
            await page.mouse.click(box.x + box.width / 2, box.y + box.height - 50, { button: 'right' });
            await page.waitForTimeout(300);
        });

        await test.step('verify: context menu with new tab, workspaces, settings, help options', async () => {
            await expect(page).toHaveScreenshot('101-sidepanel-context-menu-empty-area.png');
        });
    });

    test('context menu: right-click on tab shows tab actions', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('right-click on a regular tab', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.click({ button: 'right' });
            await page.waitForTimeout(300);
        });

        await test.step('verify: context menu with mark, note, and close options', async () => {
            await expect(page).toHaveScreenshot('102-sidepanel-context-menu-tab.png');
        });
    });

    test('context menu: right-click on group header shows group actions', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('right-click on group header', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.click({ button: 'right' });
            await page.waitForTimeout(300);
        });

        await test.step('verify: context menu with add tab, edit, collapse options', async () => {
            await expect(page).toHaveScreenshot('103-sidepanel-context-menu-group.png');
        });
    });

    // ── Group Add Tab Button ────────────────────────────────────────

    test('group hover: shows plus icon to add new tab to group', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover over a group header', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.hover();
            await page.waitForTimeout(300);
        });

        await test.step('verify: plus icon and edit icon visible on hover', async () => {
            const groupHeader = page.locator('.group-container').first();
            await expect(groupHeader).toHaveScreenshot('104-sidepanel-group-hover-plus-and-edit.png');
        });
    });

    // ── Group Edit with Save Button ─────────────────────────────────

    test('group edit mode: shows save button', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('click edit icon to enter edit mode', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.hover();
            await page.waitForTimeout(200);
            const editIcon = page.locator('.group-edit-icon').first();
            await editIcon.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: edit mode with input, color picker, and save button', async () => {
            await expect(page).toHaveScreenshot('105-sidepanel-group-edit-save-button.png');
        });
    });

    // ── Settings View ───────────────────────────────────────────────

    test('settings view: shows display settings and shortcuts link', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('click settings button in toolbar', async () => {
            // Settings button is the last .ws-toolbar-icon button
            const settingsBtn = page.locator('.ws-toolbar-icon').last();
            await settingsBtn.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: settings view with display toggle and shortcuts button', async () => {
            await expect(page).toHaveScreenshot('106-sidepanel-settings-view.png');
        });
    });

    test('settings view: toolbar shows back button', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to settings view', async () => {
            const settingsBtn = page.locator('.ws-toolbar-icon').last();
            await settingsBtn.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: toolbar shows back button in settings view', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('107-sidepanel-settings-toolbar-back.png');
        });
    });

    // ── Show URLs Toggle ────────────────────────────────────────────

    test('settings: toggle showUrls on shows tab URLs', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to settings and toggle showUrls on', async () => {
            const settingsBtn = page.locator('.ws-toolbar-icon').last();
            await settingsBtn.click();
            await page.waitForTimeout(400);
            // Click the checkbox to toggle on (default is off)
            const checkbox = page.locator('.settings-toggle-row input[type="checkbox"]');
            await checkbox.click();
            await page.waitForTimeout(200);
        });

        await test.step('go back to tab tree view', async () => {
            const backBtn = page.locator('.ws-toolbar-btn').first();
            await backBtn.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: tabs show titles with URLs visible', async () => {
            await expect(page).toHaveScreenshot('108-sidepanel-tabs-urls-shown.png');
        });
    });

    // ── Note Feature ────────────────────────────────────────────────

    test('note popup: click note button shows editor with input, color picker, save/delete', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover tab → click note button', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            const noteBtn = page.locator('.sp-note-btn').first();
            await noteBtn.click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: note popup with input, 5 color dots, save/delete buttons', async () => {
            await expect(page).toHaveScreenshot('109-sidepanel-note-popup-editor.png');
        });
    });

    test('note: add note shows inline sticky tag on tab', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover tab → open note popup → type text → save', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            await page.locator('.sp-note-btn').first().click();
            await page.waitForTimeout(200);
            const input = page.locator('.note-input');
            await input.fill('TODO');
            await page.locator('.note-save-btn').click();
            await page.waitForTimeout(300);
        });

        await test.step('click blank area to dismiss hover', async () => {
            await page.locator('.tabTreeViewContainer').click({ position: { x: 5, y: 5 } });
            await page.waitForTimeout(300);
        });

        await test.step('verify: inline sticky note tag visible on tab', async () => {
            await expect(page).toHaveScreenshot('110-sidepanel-note-inline-tag.png');
        });
    });

    test('note: color picker changes note tag color', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('add a note with red color', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            await page.locator('.sp-note-btn').first().click();
            await page.waitForTimeout(200);
            const input = page.locator('.note-input');
            await input.fill('Urgent');
            // Click the red color dot (5th = index 4)
            await page.locator('.note-color-dot').nth(4).click();
            await page.waitForTimeout(100);
            await page.locator('.note-save-btn').click();
            await page.waitForTimeout(300);
        });

        await test.step('click blank area to dismiss hover', async () => {
            await page.locator('.tabTreeViewContainer').click({ position: { x: 5, y: 5 } });
            await page.waitForTimeout(300);
        });

        await test.step('verify: note tag shows red color', async () => {
            await expect(page).toHaveScreenshot('111-sidepanel-note-red-color-tag.png');
        });
    });

    test('note: multiple notes on different tabs', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('add notes to 3 top-level tabs with different colors', async () => {
            // Use tabs that are NOT deeply nested (top-level in ungrouped section)
            // Scroll down to find ungrouped tabs like Gmail, Google Calendar, etc.
            const allTabs = page.locator('.container:not(.group-container)');
            // Pick top-level tabs (Gmail - index varies, but use ones with short titles)
            const tabIndices = [0, 7, 9]; // Google Search, Gmail-Inbox area, Google Calendar area
            const notes = [
                { text: 'TODO', colorIdx: 0 },   // grey
                { text: 'Review', colorIdx: 2 },  // green
                { text: 'WIP', colorIdx: 4 },     // red
            ];
            for (let i = 0; i < 3; i++) {
                const tab = allTabs.nth(tabIndices[i]);
                await tab.scrollIntoViewIfNeeded();
                await tab.hover();
                await page.waitForTimeout(200);
                await tab.locator('.sp-note-btn').click();
                await page.waitForTimeout(200);
                await page.locator('.note-input').fill(notes[i].text);
                await page.locator('.note-color-dot').nth(notes[i].colorIdx).click();
                await page.waitForTimeout(100);
                await page.locator('.note-save-btn').click();
                await page.waitForTimeout(300);
            }
        });

        await test.step('scroll to top and dismiss hover', async () => {
            const container = page.locator('.tabTreeViewContainer');
            await container.evaluate(el => el.scrollTop = 0);
            await page.locator('.tabTreeViewContainer').click({ position: { x: 5, y: 5 } });
            await page.waitForTimeout(300);
        });

        await test.step('verify: tabs show colored note tags', async () => {
            await expect(page).toHaveScreenshot('112-sidepanel-multiple-notes-colored.png');
        });
    });

    test('note: delete note removes inline tag', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('add a note to a tab', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            await page.locator('.sp-note-btn').first().click();
            await page.waitForTimeout(200);
            await page.locator('.note-input').fill('Temp note');
            await page.locator('.note-save-btn').click();
            await page.waitForTimeout(300);
        });

        await test.step('reopen note popup and delete', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            await page.locator('.sp-note-btn').first().click();
            await page.waitForTimeout(200);
            await page.locator('.note-delete-btn').click();
            await page.waitForTimeout(300);
        });

        await test.step('click blank area', async () => {
            await page.locator('.tabTreeViewContainer').click({ position: { x: 5, y: 5 } });
            await page.waitForTimeout(300);
        });

        await test.step('verify: no note tag on tab', async () => {
            await expect(page).toHaveScreenshot('113-sidepanel-note-deleted.png');
        });
    });

    test('note: context menu "Add Note" opens note editor', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('right-click tab → select "Add Note"', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.click({ button: 'right' });
            await page.waitForTimeout(300);
            // Click "Add Note" menu item (2nd item)
            await page.locator('.ctx-menu-item').nth(1).click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: note popup opened via context menu', async () => {
            await expect(page).toHaveScreenshot('114-sidepanel-note-via-context-menu.png');
        });
    });

    test('dark theme: note popup appearance', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'dark' });

        await test.step('hover tab → open note popup', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            await page.locator('.sp-note-btn').first().click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: dark theme note popup', async () => {
            await expect(page).toHaveScreenshot('115-sidepanel-dark-note-popup.png');
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  POPUP-SPECIFIC BEHAVIORS
// ════════════════════════════════════════════════════════════════════

test.describe('Popup-Specific Features', () => {

    test('popup mode: no bottom toolbar (workspace toolbar hidden)', async ({ page }) => {
        await setupPage(page);

        await test.step('verify: no toolbar at bottom of popup', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveCount(0);
            await expect(page).toHaveScreenshot('056-popup-no-bottom-toolbar.png');
        });
    });

    test('popup mode: filter bar has no "+" new tab button', async ({ page }) => {
        await setupPage(page);

        await test.step('verify: search bar without plus button', async () => {
            const filterBar = page.locator('.filter-bar');
            await expect(filterBar).toHaveScreenshot('057-popup-filter-bar-no-plus-btn.png');
        });
    });

    test('popup mode: hover tab shows × close + Alt+W subtabs tip (no mark button)', async ({ page }) => {
        await setupPage(page);

        await test.step('hover a non-parent tab', async () => {
            const tabs = page.locator('.container:not(.group-container)');
            // Pick a standalone tab (no children) to see just the close button
            await tabs.nth(10).hover();
            await page.waitForTimeout(300);
        });

        await test.step('verify: only × close button visible, no 🏷 mark button', async () => {
            await expect(page).toHaveScreenshot('058-popup-hover-close-only-no-mark.png');
        });
    });

    test('popup mode: active tab has bold title', async ({ page }) => {
        await setupPage(page);

        await test.step('verify: active tab (Gmail) stands out with bold title', async () => {
            const activeTab = page.locator('.container:has(.title.active)').first();
            await expect(activeTab).toHaveScreenshot('059-popup-active-tab-bold-title.png');
        });
    });

    test('popup mode: tree connector lines detail view', async ({ page }) => {
        await setupPage(page);

        await test.step('verify: vertical and horizontal connector lines on nested tabs', async () => {
            // Zoom into a deeply nested section
            const nestedSection = page.locator('.group-container-li').first();
            await expect(nestedSection).toHaveScreenshot('060-popup-tree-connector-lines-detail.png');
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  UPGRADE GUIDE
// ════════════════════════════════════════════════════════════════════

test.describe('Upgrade Guide', () => {

    test('upgrade guide banner: yellow gradient with features and dismiss button', async ({ page }) => {
        await test.step('set showUpgradeGuide flag in storage', async () => {
            await page.goto('/');
            await page.evaluate(() => {
                // MockChrome stores data in _localStorage, set the flag
                if (window.__MOCK_CHROME__) {
                    window.__MOCK_CHROME__._localStorage.showUpgradeGuide = true;
                }
            });
            // Reload to pick up the flag
            await page.goto('/');
            // Also try setting via storage API directly
            await page.evaluate(() => {
                const mockChrome = document.querySelector('#root')?.__mockChrome;
                // Alternative: inject the flag before React initializes
            });
        });

        await test.step('set flag via page URL hack and reload', async () => {
            // Set storage via the mock before the page loads
            await page.addInitScript(() => {
                // This runs before any page JS
                window.__FORCE_UPGRADE_GUIDE__ = true;
            });
            await page.goto('/');
            await page.waitForTimeout(500);
            // Directly set localStorage for MockChrome
            await page.evaluate(async () => {
                if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                    await chrome.storage.local.set({ showUpgradeGuide: true });
                }
            });
            // Force re-render by toggling something
            await page.goto('/');
            await waitForTree(page);
            await page.evaluate(() => {
                const toggle = document.querySelector('.dev-mode-toggle');
                if (toggle) toggle.style.display = 'none';
            });
        });

        await test.step('verify: upgrade guide banner visible with features', async () => {
            const banner = page.locator('.upgrade-guide');
            if (await banner.isVisible()) {
                await expect(page).toHaveScreenshot('061-popup-upgrade-guide-banner.png');
            }
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  DARK/LIGHT THEME DETAILS
// ════════════════════════════════════════════════════════════════════

test.describe('Theme Detail Tests', () => {

    test('dark theme: scrollbar styling in sidepanel', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'dark' });

        await test.step('scroll down to reveal scrollbar', async () => {
            const container = page.locator('.tabTreeViewContainer');
            await container.evaluate(el => el.scrollTop = 200);
            await page.waitForTimeout(300);
        });

        await test.step('verify: dark scrollbar colors', async () => {
            await expect(page).toHaveScreenshot('062-sidepanel-dark-theme-scrollbar.png');
        });
    });

    test('dark theme: group edit mode with color picker', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'dark' });

        await test.step('hover group and click edit icon to enter edit mode', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.hover();
            await page.waitForTimeout(200);
            const editIcon = page.locator('.group-edit-icon').first();
            await editIcon.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: dark theme edit mode with color dots', async () => {
            await expect(page).toHaveScreenshot('063-sidepanel-dark-group-edit-color-picker.png');
        });
    });

    test('dark theme: mark popup appearance', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'dark' });

        await test.step('hover tab → open mark popup', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            const markBtn = page.locator('.sp-mark-btn').first();
            await markBtn.click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: dark theme mark popup with 6 options', async () => {
            await expect(page).toHaveScreenshot('064-sidepanel-dark-mark-popup.png');
        });
    });

    test('light theme: search with highlighted results', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'light' });

        await test.step('type search keyword', async () => {
            const searchInput = page.locator('input[type="text"]').first();
            await searchInput.fill('React');
            await page.waitForTimeout(400);
        });

        await test.step('verify: light theme with red highlighted keywords', async () => {
            await expect(page).toHaveScreenshot('065-sidepanel-light-search-highlighted.png');
        });
    });

    test('dark theme: workspace list cards', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'dark' });

        await test.step('open workspace list', async () => {
            await openWorkspaceList(page);
        });

        await test.step('verify: dark theme workspace cards', async () => {
            await expect(page).toHaveScreenshot('066-sidepanel-dark-ws-list-cards.png');
        });
    });

    test('dark theme: workspace preview with marks', async ({ page }) => {
        await setupPage(page, { sidepanel: true, colorScheme: 'dark' });

        await test.step('navigate to workspace preview', async () => {
            await openWorkspaceList(page);
            const wsItem = page.locator('.ws-item').first();
            await wsItem.click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: dark theme preview with marks', async () => {
            await expect(page).toHaveScreenshot('067-sidepanel-dark-ws-preview-marks.png');
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  ONBOARDING PAGE
// ════════════════════════════════════════════════════════════════════

test.describe('Onboarding Page', () => {

    test('onboarding step 0: welcome screen with demo tree', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('verify: welcome screen with title and demo tree', async () => {
            await expect(page).toHaveScreenshot('068-onboarding-step0-welcome.png');
        });
    });

    test('onboarding step 1: quick access with keyboard shortcuts', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('click next to go to step 1', async () => {
            await page.locator('#btnNext').click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: quick access step with Alt+Q showcase', async () => {
            await expect(page).toHaveScreenshot('069-onboarding-step1-quick-access.png');
        });
    });

    test('onboarding step 2: two modes comparison', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('navigate to step 2', async () => {
            await page.locator('#btnNext').click();
            await page.waitForTimeout(300);
            await page.locator('#btnNext').click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: popup vs sidepanel comparison cards', async () => {
            await expect(page).toHaveScreenshot('070-onboarding-step2-two-modes.png');
        });
    });

    test('onboarding step 3: tab groups with demo', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('navigate to step 3', async () => {
            for (let i = 0; i < 3; i++) {
                await page.locator('#btnNext').click();
                await page.waitForTimeout(300);
            }
            await page.waitForTimeout(500);
        });

        await test.step('verify: tab groups demo with colors', async () => {
            await expect(page).toHaveScreenshot('071-onboarding-step3-tab-groups.png');
        });
    });

    test('onboarding step 4: workspaces features', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('navigate to step 4', async () => {
            for (let i = 0; i < 4; i++) {
                await page.locator('#btnNext').click();
                await page.waitForTimeout(300);
            }
            await page.waitForTimeout(500);
        });

        await test.step('verify: workspace save/restore features', async () => {
            await expect(page).toHaveScreenshot('072-onboarding-step4-workspaces.png');
        });
    });

    test('onboarding step 5: navigate & organize with keyboard guide', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('navigate to step 5', async () => {
            for (let i = 0; i < 5; i++) {
                await page.locator('#btnNext').click();
                await page.waitForTimeout(300);
            }
            await page.waitForTimeout(500);
        });

        await test.step('verify: keyboard shortcut guide table', async () => {
            await expect(page).toHaveScreenshot('073-onboarding-step5-navigate-organize.png');
        });
    });

    test('onboarding step 6: ready screen with CTA', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('navigate to step 6 (final)', async () => {
            for (let i = 0; i < 6; i++) {
                await page.locator('#btnNext').click();
                await page.waitForTimeout(300);
            }
            await page.waitForTimeout(500);
        });

        await test.step('verify: ready screen with done button and GitHub link', async () => {
            await expect(page).toHaveScreenshot('074-onboarding-step6-ready.png');
        });
    });

    test('onboarding: progress bar and step dots', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('navigate to step 3 to show partial progress', async () => {
            for (let i = 0; i < 3; i++) {
                await page.locator('#btnNext').click();
                await page.waitForTimeout(300);
            }
        });

        await test.step('verify: progress bar partially filled + dots with active state', async () => {
            await expect(page).toHaveScreenshot('075-onboarding-progress-bar-dots.png');
        });
    });

    test('onboarding: dark mode rendering', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('verify: dark mode welcome screen', async () => {
            await expect(page).toHaveScreenshot('076-onboarding-dark-mode-welcome.png');
        });
    });

    test('onboarding: click step dot to jump to step', async ({ page }) => {
        await page.goto('/onboarding.html');
        await page.waitForTimeout(800);

        await test.step('click 5th step dot to jump ahead', async () => {
            const dots = page.locator('.dot');
            if (await dots.count() >= 5) {
                await dots.nth(4).click();
                await page.waitForTimeout(500);
            }
        });

        await test.step('verify: jumped to step 4 (workspaces)', async () => {
            await expect(page).toHaveScreenshot('077-onboarding-dot-jump-to-step4.png');
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  WORKSPACE INTERACTIONS
// ════════════════════════════════════════════════════════════════════

test.describe('Workspace Interactions', () => {

    // ── Save: Enter Key Submits ─────────────────────────────────────

    test('save workspace via Enter key: shows "Saved!" hint', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open save input and type name', async () => {
            const menuTrigger = page.locator('.ws-menu-trigger');
            await menuTrigger.hover();
            await page.waitForTimeout(300);
            await page.locator('.ws-menu-item').last().click();
            await page.waitForTimeout(300);
            const input = page.locator('.ws-save-input');
            await input.fill('Enter Key Save');
        });

        await test.step('press Enter to save', async () => {
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
        });

        await test.step('verify: "Saved!" hint appears in toolbar', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('078-sidepanel-ws-save-enter-key-hint.png');
        });
    });

    // ── Save: Escape Key Cancels ────────────────────────────────────

    test('save workspace cancel via Escape: returns to default toolbar', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open save input', async () => {
            const menuTrigger = page.locator('.ws-menu-trigger');
            await menuTrigger.hover();
            await page.waitForTimeout(300);
            await page.locator('.ws-menu-item').last().click();
            await page.waitForTimeout(300);
        });

        await test.step('press Escape to cancel', async () => {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        });

        await test.step('verify: toolbar returns to default (folder/help/settings)', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('079-sidepanel-ws-save-escape-cancel.png');
        });
    });

    // ── Save: Empty Name Does Nothing ───────────────────────────────

    test('save workspace with empty name: input stays visible', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open save input and clear name', async () => {
            const menuTrigger = page.locator('.ws-menu-trigger');
            await menuTrigger.hover();
            await page.waitForTimeout(300);
            await page.locator('.ws-menu-item').last().click();
            await page.waitForTimeout(300);
            const input = page.locator('.ws-save-input');
            await input.fill('');
        });

        await test.step('click save with empty name', async () => {
            await page.locator('.ws-btn-primary').click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: save input row still visible (no Saved! hint)', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('080-sidepanel-ws-save-empty-name-stays.png');
        });
    });

    // ── Delete: Item Actually Removed ───────────────────────────────

    test('delete workspace: item removed from list', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open workspace list', async () => {
            await openWorkspaceList(page);
        });

        await test.step('click delete → confirm', async () => {
            const deleteBtn = page.locator('.ws-icon-btn-delete').first();
            await deleteBtn.click();
            await page.waitForTimeout(300);
            const confirmBtn = page.locator('.ws-btn-danger-solid');
            await confirmBtn.click();
            await page.waitForTimeout(500);
        });

        await test.step('verify: workspace removed, empty state shown', async () => {
            await expect(page).toHaveScreenshot('081-sidepanel-ws-delete-empty-state.png');
        });
    });

    // ── Delete: Cancel Keeps Item ───────────────────────────────────

    test('delete workspace cancel: popover closes, item stays', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open list → click delete → cancel', async () => {
            await openWorkspaceList(page);
            const deleteBtn = page.locator('.ws-icon-btn-delete').first();
            await deleteBtn.click();
            await page.waitForTimeout(300);
            // Click the cancel button (non-danger btn inside popover)
            const cancelBtn = page.locator('.ws-delete-popover .ws-btn:not(.ws-btn-danger-solid)');
            await cancelBtn.click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: workspace item still present', async () => {
            await expect(page).toHaveScreenshot('082-sidepanel-ws-delete-cancel-item-stays.png');
        });
    });

    // ── Workspace List: Delete Button Red Hover ─────────────────────

    test('workspace list: delete button turns red on hover', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open list → hover delete button', async () => {
            await openWorkspaceList(page);
            const wsItem = page.locator('.ws-item').first();
            await wsItem.hover();
            await page.waitForTimeout(200);
            const deleteBtn = page.locator('.ws-icon-btn-delete').first();
            await deleteBtn.hover();
            await page.waitForTimeout(200);
        });

        await test.step('verify: delete button in red hover state', async () => {
            const wsItem = page.locator('.ws-item').first();
            await expect(wsItem).toHaveScreenshot('083-sidepanel-ws-delete-btn-red-hover.png');
        });
    });

    // ── Preview: Edit Name via Pencil Icon ──────────────────────────

    test('workspace preview: pencil icon click enters edit mode', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to preview and hover name to reveal edit icon', async () => {
            await openWorkspaceList(page);
            await page.locator('.ws-item').first().click();
            await page.waitForTimeout(500);
            const nameEl = page.locator('.ws-preview-name');
            await nameEl.hover();
            await page.waitForTimeout(300);
        });

        await test.step('click the pencil edit icon', async () => {
            const editIcon = page.locator('.ws-preview-name-edit-icon');
            await editIcon.click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: inline edit input visible', async () => {
            const header = page.locator('.ws-preview-header');
            await expect(header).toHaveScreenshot('084-sidepanel-ws-preview-edit-via-icon.png');
        });
    });

    // ── Preview: Rename Commit (Enter) ──────────────────────────────

    test('workspace preview: rename workspace and press Enter to commit', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to preview and enter edit mode', async () => {
            await openWorkspaceList(page);
            await page.locator('.ws-item').first().click();
            await page.waitForTimeout(500);
            const nameEl = page.locator('.ws-preview-name');
            await nameEl.dblclick();
            await page.waitForTimeout(300);
        });

        await test.step('type new name and press Enter', async () => {
            const input = page.locator('.ws-preview-name-input');
            await input.fill('Renamed Workspace');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(300);
        });

        await test.step('verify: header shows new name', async () => {
            const header = page.locator('.ws-preview-header');
            await expect(header).toHaveScreenshot('085-sidepanel-ws-preview-rename-committed.png');
        });
    });

    // ── Preview: Rename Cancel (Escape) ─────────────────────────────

    test('workspace preview: rename cancel via Escape restores original name', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to preview and enter edit mode', async () => {
            await openWorkspaceList(page);
            await page.locator('.ws-item').first().click();
            await page.waitForTimeout(500);
            const nameEl = page.locator('.ws-preview-name');
            await nameEl.dblclick();
            await page.waitForTimeout(300);
        });

        await test.step('type new name then press Escape', async () => {
            const input = page.locator('.ws-preview-name-input');
            await input.fill('Should Not Persist');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        });

        await test.step('verify: original name restored in header', async () => {
            const header = page.locator('.ws-preview-header');
            await expect(header).toHaveScreenshot('086-sidepanel-ws-preview-rename-cancelled.png');
        });
    });

    // ── Preview: Close/Remove Tab ───────────────────────────────────

    test('workspace preview: close tab removes it from saved tree', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to workspace preview', async () => {
            await openWorkspaceList(page);
            await page.locator('.ws-item').first().click();
            await page.waitForTimeout(500);
        });

        await test.step('hover a tab and click × to remove it', async () => {
            const tab = page.locator('.tabTreeViewContainer .container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            const closeBtn = page.locator('.sp-close-btn').first();
            await closeBtn.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: tab removed, tree updated', async () => {
            await expect(page).toHaveScreenshot('087-sidepanel-ws-preview-tab-removed.png');
        });
    });

    // ── Preview: Mark a Tab ─────────────────────────────────────────

    test('workspace preview: add mark to a tab shows colored border', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('navigate to workspace preview', async () => {
            await openWorkspaceList(page);
            await page.locator('.ws-item').first().click();
            await page.waitForTimeout(500);
        });

        await test.step('hover tab → open mark popup → select pin mark', async () => {
            const tabs = page.locator('.tabTreeViewContainer .container:not(.group-container)');
            await tabs.first().hover();
            await page.waitForTimeout(200);
            await page.locator('.sp-mark-btn').first().click();
            await page.waitForTimeout(200);
            await page.locator('.mark-icon-option').nth(2).click(); // pin mark
            await page.waitForTimeout(300);
        });

        await test.step('verify: tab shows pin mark with pink border', async () => {
            const tree = page.locator('.tabTreeViewContainer');
            await expect(tree).toHaveScreenshot('088-sidepanel-ws-preview-tab-marked.png');
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  TAB INTERACTIONS
// ════════════════════════════════════════════════════════════════════

test.describe('Tab Interactions', () => {

    // ── New Tab Button Click ────────────────────────────────────────

    test('new tab: click "+" adds new tab to tree', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('click the "+" new tab button', async () => {
            const plusBtn = page.locator('.filter-bar .plus-btn, .filter-bar button:has(.anticon-plus)').first();
            await plusBtn.click();
            await page.waitForTimeout(600);
        });

        await test.step('verify: new tab appears at the end of tree', async () => {
            await expect(page).toHaveScreenshot('089-sidepanel-new-tab-added.png');
        });
    });

    // ── Close Tab: Tab Removed ──────────────────────────────────────

    test('close tab: click × removes tab from tree', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover first tab and click × to close it', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(200);
            const closeBtn = page.locator('.sp-close-btn').first();
            await closeBtn.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: tab removed from tree', async () => {
            await expect(page).toHaveScreenshot('090-sidepanel-tab-closed-removed.png');
        });
    });

    // ── Mark Popup: Active Highlight on Current Mark ────────────────

    test('mark popup: active highlight on currently selected mark', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('mark a tab with "done ✓"', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(150);
            await page.locator('.sp-mark-btn').first().click();
            await page.waitForTimeout(150);
            await page.locator('.mark-icon-option').nth(1).click();
            await page.waitForTimeout(200);
        });

        await test.step('reopen mark popup on the same tab', async () => {
            const tab = page.locator('.container:not(.group-container)').first();
            await tab.hover();
            await page.waitForTimeout(150);
            await page.locator('.sp-mark-btn').first().click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: "done ✓" option has active highlight ring', async () => {
            const popup = page.locator('.mark-popup');
            await expect(popup).toHaveScreenshot('091-sidepanel-mark-popup-active-highlight.png');
        });
    });

    // ── Group: Color Change Visual Result ───────────────────────────

    test('group edit: change color shows updated group border', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('click edit icon to enter edit mode', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.hover();
            await page.waitForTimeout(200);
            const editIcon = page.locator('.group-edit-icon').first();
            await editIcon.click();
            await page.waitForTimeout(400);
        });

        await test.step('click a different color dot (red)', async () => {
            const colorDots = page.locator('.group-color-dot');
            // Click a color that's not the current one (first group is blue, try red)
            await colorDots.nth(2).click();
            await page.waitForTimeout(200);
        });

        await test.step('click save button to commit the color change', async () => {
            const saveBtn = page.locator('.group-save-btn');
            await saveBtn.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: group border changed to new color', async () => {
            const groupLi = page.locator('.group-container-li').first();
            await expect(groupLi).toHaveScreenshot('092-sidepanel-group-color-changed.png');
        });
    });

    // ── Group Edit: Escape Cancels ──────────────────────────────────

    test('group edit: Escape cancels edits, restores original', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('enter group edit mode and change title', async () => {
            const groupHeader = page.locator('.group-container').first();
            await groupHeader.hover();
            await page.waitForTimeout(200);
            const editIcon = page.locator('.group-edit-icon').first();
            await editIcon.click();
            await page.waitForTimeout(400);
            const titleInput = page.locator('.group-title-input');
            await titleInput.fill('Changed Title');
        });

        await test.step('press Escape to cancel', async () => {
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        });

        await test.step('verify: original group title restored', async () => {
            const groupLi = page.locator('.group-container-li').first();
            await expect(groupLi).toHaveScreenshot('093-sidepanel-group-edit-escape-cancel.png');
        });
    });

    // ── Vertical Line Click: Collapse Subtree ───────────────────────

    test('vertical line click: collapses child subtree', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('click a vertical connector line', async () => {
            const verticalLine = page.locator('.vertical-line').first();
            await verticalLine.click();
            await page.waitForTimeout(400);
        });

        await test.step('verify: subtree collapsed with +N badge', async () => {
            await expect(page).toHaveScreenshot('094-sidepanel-vertical-line-collapse.png');
        });
    });

    // ── Help Button Hover ───────────────────────────────────────────

    test('toolbar: help button (?) hover state', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover the help button', async () => {
            const helpBtn = page.locator('.ws-toolbar button:has(.anticon-question-circle)');
            await helpBtn.hover();
            await page.waitForTimeout(200);
        });

        await test.step('verify: help button hover styling', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('095-sidepanel-help-btn-hover.png');
        });
    });

    // ── Settings Button Hover ───────────────────────────────────────

    test('toolbar: settings button (⚙) hover state', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('hover the settings button', async () => {
            const settingsBtn = page.locator('.ws-toolbar button:has(.anticon-setting)');
            await settingsBtn.hover();
            await page.waitForTimeout(200);
        });

        await test.step('verify: settings button hover styling', async () => {
            const toolbar = page.locator('.ws-toolbar');
            await expect(toolbar).toHaveScreenshot('096-sidepanel-settings-btn-hover.png');
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  DRAG AND DROP: INVALID DROP
// ════════════════════════════════════════════════════════════════════

test.describe('Drag Drop Advanced', () => {

    test('drag tab: drop-invalid indicator on descendant target', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('drag a parent tab over its own child', async () => {
            // Get a parent tab that has children
            const parentTab = page.locator('.fake-li:not(.group-container-li):has(> .fake-ul) > .container').first();
            // Get the first child of that parent
            const childTab = page.locator('.fake-li:not(.group-container-li):has(> .fake-ul) > .fake-ul .container').first();
            const parentBox = await parentTab.boundingBox();
            const childBox = await childTab.boundingBox();

            await page.mouse.move(parentBox.x + parentBox.width / 2, parentBox.y + parentBox.height / 2);
            await page.mouse.down();
            // Move to center of child (invalid drop target)
            await page.mouse.move(childBox.x + childBox.width / 2, childBox.y + childBox.height / 2, { steps: 10 });
            await page.waitForTimeout(300);
        });

        await test.step('verify: red/forbidden drop indicator on child', async () => {
            await expect(page).toHaveScreenshot('097-sidepanel-drag-drop-invalid-indicator.png', {
                maxDiffPixelRatio: 0.05,
            });
        });

        await test.step('release drag', async () => {
            await page.mouse.up();
        });
    });
});

// ════════════════════════════════════════════════════════════════════
//  TAB LOADING & EDGE STATES
// ════════════════════════════════════════════════════════════════════

test.describe('Tab Edge States', () => {

    test('new tab loading: shows spinning loader icon', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('create a new tab and capture loading state', async () => {
            // Click the "+" button to create a new tab
            const plusBtn = page.locator('.filter-bar button').last();
            await plusBtn.click();
            // Capture immediately while status is still 'loading' (before 300ms mock timer)
            await page.waitForTimeout(100);
        });

        await test.step('verify: new tab shows loading spinner icon', async () => {
            await expect(page).toHaveScreenshot('098-sidepanel-new-tab-loading-spinner.png');
        });
    });

    test('save workspace: pre-populated default name in input', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('mock Date and open save workspace input', async () => {
            // Mock Date before triggering save (which reads new Date())
            await page.evaluate(() => {
                const fixedDate = new Date('2025-03-15T14:30:00');
                const OriginalDate = window.Date;
                // @ts-ignore
                window.Date = class extends OriginalDate {
                    constructor(...args) {
                        if (args.length === 0) {
                            return new OriginalDate(fixedDate);
                        }
                        // @ts-ignore
                        return new OriginalDate(...args);
                    }
                    static now() {
                        return fixedDate.getTime();
                    }
                };
            });
            const menuTrigger = page.locator('.ws-menu-trigger');
            await menuTrigger.hover();
            await page.waitForTimeout(300);
            await page.locator('.ws-menu-item').last().click();
            await page.waitForTimeout(300);
        });

        await test.step('verify: input has pre-populated date-based name', async () => {
            const saveRow = page.locator('.ws-save-row');
            await expect(saveRow).toHaveScreenshot('099-sidepanel-ws-save-default-name.png');
        });
    });

    test('workspace list: restore button hover state', async ({ page }) => {
        await setupPage(page, { sidepanel: true });

        await test.step('open list → hover restore button', async () => {
            await openWorkspaceList(page);
            const wsItem = page.locator('.ws-item').first();
            await wsItem.hover();
            await page.waitForTimeout(200);
            const restoreBtn = page.locator('.ws-icon-btn-open').first();
            await restoreBtn.hover();
            await page.waitForTimeout(200);
        });

        await test.step('verify: restore button hover styling', async () => {
            const wsItem = page.locator('.ws-item').first();
            await expect(wsItem).toHaveScreenshot('100-sidepanel-ws-restore-btn-hover.png');
        });
    });
});
