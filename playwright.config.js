// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for visual regression testing.
 * Run `npm run test:visual` to execute.
 */
module.exports = defineConfig({
    testDir: './visual-tests',
    outputDir: './visual-tests/test-results',
    snapshotDir: './visual-tests/screenshots',
    // Put all screenshots flat in screenshots/ with just the given name
    snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [['html', { open: 'never' }]],

    expect: {
        toHaveScreenshot: {
            // Allow 1% pixel difference to account for font rendering
            maxDiffPixelRatio: 0.01,
        },
    },

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Consistent viewport for screenshot comparison
                viewport: { width: 900, height: 900 },
                launchOptions: {
                    args: ['--disable-features=OverlayScrollbar'],
                },
            },
        },
    ],

    // Start dev server before running tests
    webServer: {
        command: 'REACT_APP_USE_MOCK=true npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
