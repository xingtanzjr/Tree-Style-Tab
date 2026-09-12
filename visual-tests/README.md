# Visual Regression Testing Setup

This project uses **Playwright** for CSS visual regression testing. This catches unintended visual changes (layout shifts, color changes, missing styles, etc.).

## Quick Start

```bash
# Install Playwright (one-time setup)
npm run test:visual:install

# Run visual regression tests
npm run test:visual

# Update baseline screenshots (after intentional CSS changes)
npm run test:visual:update
```

## How It Works

1. Playwright renders the extension UI in a real browser
2. Takes screenshots of key UI states (tab tree, groups, sidebar, etc.)
3. Compares against saved baseline screenshots in `visual-tests/screenshots/`
4. Fails if pixel diff exceeds threshold — meaning unintended CSS regression

## Test File Location

- Config: `playwright.config.js`
- Tests: `visual-tests/*.spec.js`
- Baselines: `visual-tests/screenshots/` (committed to git)

## Reproducible Baselines

`tab-tree.spec.js` fixes the browser date at `2026-09-10T12:00:00Z`, locale at `en-US`, and time zone at `UTC`. Timers continue running normally. This stabilizes generated workspace names and relative mock workspace timestamps.

Screenshots still depend on the OS, installed fonts, Chromium version, and external favicon responses. Baselines reviewed on Linux use Ubuntu 26.04 with Playwright 1.58.2 Chromium; other font environments can produce text-only differences. Inspect expected/actual/diff images before accepting an update. Keep the 1% pixel tolerance unchanged, and report behavioral failures instead of accepting them as screenshots.

The onboarding page also needs an Emoji font. On Ubuntu, use `fonts-noto-color-emoji`; `fc-match emoji` should resolve to `Noto Color Emoji`. A user-local font installation is sufficient. Do not accept screenshots with missing-glyph boxes as new baselines.

After reviewing a failure, update only the relevant tests and then rerun without updating:

```bash
npx playwright test visual-tests/tab-tree.spec.js --grep 'test title' --update-snapshots=changed
PLAYWRIGHT_HTML_OPEN=never npx playwright test --reporter=line,html
```

## Pin / Unpin Interaction Tests

Run the complete context-menu pin/unpin workflows independently:

```bash
npx playwright test visual-tests/pin-unpin.spec.js --reporter=line
```

The five cases cover grouped and ungrouped parents, activation through the pinned button, promotion of children without moving their groups, unpinning without restoring old relationships, ordering with other pinned tabs, and filtered results with hidden descendants. The last pinned tab's removal must hide the pinned area.

These tests run the React UI against MockChrome, not an installed extension. Pin/unpin actions use the visible context menu; tab and parent snapshots are read only for assertions. No screenshot baselines are required. Chromium and its system libraries must be installed; `--list` only discovers tests and does not execute them.

## Popup Escape Interaction Tests

```bash
npx playwright test visual-tests/popup-escape.spec.js --reporter=line
```

The six cases use `public/content_overlay.js` to embed the MockChrome UI in a real iframe on a local test host. They verify Escape closes the popup from the search field, dismisses menus or cancels group editing first, respects IME composition and handled/repeated keys, and leaves sidepanel mode and note cancellation unchanged. The host and iframe use the same development-server origin to avoid Chromium local-network restrictions; this is not an installed-extension test.

## Tree Connector Geometry Tests

```bash
npx playwright test visual-tests/tree-lines.spec.js --reporter=line
```

Eight cases cover popup and sidepanel connector endpoints when a non-last branch collapses or expands, an ancestor reopens with a descendant still collapsed, the last branch collapses after a subtree move, and row heights change without a React render. These MockChrome tests compare the vertical line's endpoint with the last direct child's horizontal connector within one CSS pixel, independently of screenshot tolerance. They cover the regression reported in issue #40.

## Real Extension Tab-Close Regression Tests

```bash
npm run test:extension
```

This command builds the production extension with MockChrome disabled, then runs `extension-tests/tab-close.spec.js` using `playwright.extension.config.js`. It does not start the mock development server and is separate from `npm run test:visual`. Chromium and its system libraries must be installed (use `npm run test:visual:install` to install the browser).

Four independent tests cover closing a middle tab and a root tab, both ungrouped and grouped. Each creates `A -> B -> C -> D`, another child E under B, and a sibling F under A. Ungrouped tests close via the real `chrome.tabs.remove` API; grouped tests click the production React sidepanel's Close tab context-menu item. Assertions check the real session parent map, rendered DOM nesting and sibling order, and unchanged native tab order, groups, and pinned state for surviving tabs. The sidepanel document is opened as an extension page; these tests do not automate Chrome's native side-panel container or tab-strip controls.

Every test loads a temporary copy of the build in a fresh persistent Chromium profile and uses a local HTTP fixture. Only the temporary manifest pregrants the optional `tabGroups` permission. A test-only worker wrapper suppresses network fetches while importing the unchanged production worker; page-level external requests are stubbed too. Parent setup uses the production `updateTabParent` message, not direct storage writes. Browser profiles and fixture files are removed during teardown, including on failure; the user's browser is untouched.

Failures retain a Playwright trace under `visual-tests/test-results/extension/`; the HTML report is in `playwright-report/extension/`. No screenshot baselines are required. To rerun against an already-current build:

```bash
npx playwright test --config=playwright.extension.config.js
```

## Writing New Visual Tests

```js
test('description', async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Set up UI state...
    await expect(page).toHaveScreenshot('screenshot-name.png', {
        maxDiffPixelRatio: 0.01,
    });
});
```

## CI Integration

Add to your CI pipeline:

```yaml
- name: Visual Regression Tests
  run: |
    npm run start:dev &
    npx wait-on http://localhost:3000
    npm run test:visual
- name: Real Extension Regression Tests
    run: npm run test:extension
```
