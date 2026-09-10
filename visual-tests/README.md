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
```
