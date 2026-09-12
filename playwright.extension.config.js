const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './extension-tests',
    outputDir: './visual-tests/test-results/extension',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    timeout: 60000,
    expect: { timeout: 15000 },
    reporter: [
        ['line'],
        ['html', { outputFolder: 'playwright-report/extension', open: 'never' }],
    ],
    use: {
        channel: 'chromium',
        headless: true,
        viewport: { width: 900, height: 900 },
        locale: 'en-US',
    },
});