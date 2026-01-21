"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaywrightBrowser = void 0;
// Use playwright-core for serverless environments (no browser binaries)
// Full playwright package is only needed for local development
const playwright_core_1 = require("playwright-core");
/**
 * Playwright Browser Service - Drop-in replacement for Puppeteer
 * Keeps all existing selectors and logic intact
 */
class PlaywrightBrowser {
    constructor() {
        this.browser = null;
        this.page = null;
    }
    async connect(browserWSEndpoint) {
        console.log('🌐 Connecting to remote browser via WebSocket...');
        this.browser = await playwright_core_1.chromium.connect(browserWSEndpoint);
        return {
            newPage: async () => {
                const page = await this.browser.newPage();
                this.page = page;
                // Set viewport for consistency
                await page.setViewportSize({ width: 1280, height: 720 });
                // Return Puppeteer-compatible page object
                return this.createPuppeteerCompatiblePage(page);
            },
            close: async () => {
                if (this.browser) {
                    await this.browser.close();
                }
            }
        };
    }
    async launch(options = {}) {
        // Convert Puppeteer options to Playwright options
        const playwrightOptions = {
            headless: options.headless !== false,
            args: options.args || [],
            timeout: options.timeout || 30000,
            // Use bundled Playwright Chromium for cloud compatibility
        };
        // Add cloud-optimized Chrome args if not provided
        if (!options.args || options.args.length === 0) {
            playwrightOptions.args = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--memory-pressure-off',
                '--max_old_space_size=128',
            ];
        }
        console.log('🎭 Launching Playwright Chromium...');
        this.browser = await playwright_core_1.chromium.launch(playwrightOptions);
        return {
            newPage: async () => {
                const page = await this.browser.newPage();
                this.page = page;
                // Set viewport for consistency
                await page.setViewportSize({ width: 1280, height: 720 });
                // Return Puppeteer-compatible page object
                return this.createPuppeteerCompatiblePage(page);
            },
            close: async () => {
                if (this.browser) {
                    await this.browser.close();
                }
            }
        };
    }
    createPuppeteerCompatiblePage(page) {
        return {
            // Core navigation
            goto: async (url, options = {}) => {
                // Convert Puppeteer waitUntil values to Playwright equivalents
                let waitUntil = 'networkidle';
                if (options.waitUntil === 'networkidle0' || options.waitUntil === 'networkidle2') {
                    waitUntil = 'networkidle';
                }
                else if (options.waitUntil === 'load') {
                    waitUntil = 'load';
                }
                else if (options.waitUntil === 'domcontentloaded') {
                    waitUntil = 'domcontentloaded';
                }
                return page.goto(url, {
                    waitUntil,
                    timeout: options.timeout || 30000
                });
            },
            // Selectors - exact same API as Puppeteer
            $: (selector) => page.locator(selector).first(),
            $$: (selector) => page.locator(selector),
            $$eval: async (selector, pageFunction) => {
                const elements = await page.locator(selector).all();
                const results = await Promise.all(elements.map(el => el.evaluate(pageFunction)));
                return results;
            },
            waitForSelector: async (selector, options = {}) => {
                await page.waitForSelector(selector, {
                    timeout: options.timeout || 10000,
                    state: options.visible !== false ? 'visible' : 'attached'
                });
                return page.locator(selector).first();
            },
            // Form interactions
            type: async (selector, text) => {
                await page.fill(selector, text);
            },
            click: async (selector, options = {}) => {
                // Enhanced click with better error handling for form elements
                try {
                    // First try to wait for the element to be ready
                    await page.waitForSelector(selector, {
                        state: 'attached',
                        timeout: options.timeout || 5000
                    });
                    // For form elements, try force click if normal click fails
                    try {
                        await page.click(selector, {
                            timeout: options.timeout || 5000,
                            force: false // Try non-force first
                        });
                    }
                    catch (clickError) {
                        console.log(`🔄 Normal click failed, trying force click: ${clickError.message}`);
                        // Force click for stubborn form elements
                        await page.click(selector, {
                            timeout: options.timeout || 5000,
                            force: true
                        });
                    }
                }
                catch (error) {
                    console.error(`❌ Click failed for selector ${selector}:`, error.message);
                    throw error;
                }
            },
            // Page info
            url: () => page.url(),
            content: () => page.content(),
            // Evaluation
            evaluate: async (pageFunction, ...args) => {
                return page.evaluate(pageFunction, ...args);
            },
            // Screenshots and debugging
            screenshot: async (options = {}) => {
                return page.screenshot(options);
            },
            // Page lifecycle
            close: () => page.close(),
            // Advanced interactions
            waitForNavigation: async (options = {}) => {
                // Convert Puppeteer waitUntil values to Playwright equivalents
                let waitUntil = 'networkidle';
                if (options.waitUntil === 'networkidle0' || options.waitUntil === 'networkidle2') {
                    waitUntil = 'networkidle';
                }
                else if (options.waitUntil === 'load') {
                    waitUntil = 'load';
                }
                else if (options.waitUntil === 'domcontentloaded') {
                    waitUntil = 'domcontentloaded';
                }
                return page.waitForLoadState(waitUntil, {
                    timeout: options.timeout || 30000
                });
            },
            // Browser configuration - Puppeteer compatibility
            setUserAgent: async (userAgent) => {
                await page.setExtraHTTPHeaders({ 'User-Agent': userAgent });
            },
            setExtraHTTPHeaders: async (headers) => {
                await page.setExtraHTTPHeaders(headers);
            },
            setViewport: async (viewport) => {
                await page.setViewportSize(viewport);
            },
            setDefaultNavigationTimeout: (timeout) => {
                page.setDefaultNavigationTimeout(timeout);
            },
            setDefaultTimeout: (timeout) => {
                page.setDefaultTimeout(timeout);
            },
            // Additional Puppeteer compatibility methods
            waitForTimeout: (timeout) => page.waitForTimeout(timeout),
            select: async (selector, value) => {
                await page.selectOption(selector, value);
            },
            // Playwright-specific improvements
            waitForLoadState: (state = 'networkidle') => {
                return page.waitForLoadState(state);
            },
            setViewportSize: (size) => {
                return page.setViewportSize(size);
            },
            // Raw Playwright page for advanced use
            _playwrightPage: page
        };
    }
}
exports.PlaywrightBrowser = PlaywrightBrowser;
//# sourceMappingURL=playwrightBrowser.js.map