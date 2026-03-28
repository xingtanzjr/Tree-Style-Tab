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
