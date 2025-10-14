const { chromium } = require('playwright');

/**
 * Playwright Browser Service - Drop-in replacement for Puppeteer
 * Keeps all existing selectors and logic intact
 */
class PlaywrightBrowser {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch(options = {}) {
    // Convert Puppeteer options to Playwright options
    const playwrightOptions = {
      headless: options.headless !== false,
      args: options.args || [],
      timeout: options.timeout || 30000,
      // Playwright-specific optimizations for cloud environments
      channel: 'chrome', // Use system Chrome if available
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
    this.browser = await chromium.launch(playwrightOptions);
    
    return {
      newPage: async () => {
        this.page = await this.browser.newPage();
        
        // Set viewport for consistency
        await this.page.setViewportSize({ width: 1280, height: 720 });
        
        // Return Puppeteer-compatible page object
        return this.createPuppeteerCompatiblePage(this.page);
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
      goto: (url, options = {}) => page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 30000
      }),
      
      // Selectors - exact same API as Puppeteer
      $: (selector) => page.locator(selector).first(),
      $$: (selector) => page.locator(selector),
      $$eval: (selector, pageFunction) => page.$$eval(selector, pageFunction),
      waitForSelector: (selector, options = {}) => page.waitForSelector(selector, {
        timeout: options.timeout || 10000,
        state: options.visible !== false ? 'visible' : 'attached'
      }),
      
      // Form interactions
      type: (selector, text) => page.fill(selector, text),
      click: (selector, options = {}) => page.click(selector, options),
      
      // Page info
      url: () => page.url(),
      content: () => page.content(),
      
      // Evaluation
      evaluate: (pageFunction, ...args) => page.evaluate(pageFunction, ...args),
      
      // Screenshots and debugging
      screenshot: (options = {}) => page.screenshot(options),
      
      // Page lifecycle
      close: () => page.close(),
      
      // Advanced interactions
      waitForNavigation: (options = {}) => page.waitForLoadState(options.waitUntil || 'networkidle', {
        timeout: options.timeout || 30000
      }),
      
      // Browser configuration - Puppeteer compatibility
      setUserAgent: (userAgent) => page.setExtraHTTPHeaders({ 'User-Agent': userAgent }),
      setExtraHTTPHeaders: (headers) => page.setExtraHTTPHeaders(headers),
      setViewport: (viewport) => page.setViewportSize(viewport),
      setDefaultNavigationTimeout: (timeout) => page.setDefaultNavigationTimeout(timeout),
      setDefaultTimeout: (timeout) => page.setDefaultTimeout(timeout),
      
      // Additional Puppeteer compatibility methods
      waitForTimeout: (timeout) => page.waitForTimeout(timeout),
      select: (selector, value) => page.selectOption(selector, value),
      
      // Playwright-specific improvements
      waitForLoadState: (state = 'networkidle') => page.waitForLoadState(state),
      setViewportSize: (size) => page.setViewportSize(size),
      
      // Raw Playwright page for advanced use
      _playwrightPage: page
    };
  }
}

module.exports = PlaywrightBrowser;