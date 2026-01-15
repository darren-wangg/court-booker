import { chromium, Browser, Page, BrowserContext } from 'playwright';

interface PuppeteerCompatiblePage {
  goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<any>;
  $: (selector: string) => any;
  $$: (selector: string) => any;
  $$eval: (selector: string, pageFunction: Function) => Promise<any>;
  waitForSelector: (selector: string, options?: { timeout?: number; visible?: boolean }) => Promise<any>;
  type: (selector: string, text: string) => Promise<void>;
  click: (selector: string, options?: { timeout?: number }) => Promise<void>;
  url: () => string;
  content: () => Promise<string>;
  evaluate: (pageFunction: Function, ...args: any[]) => Promise<any>;
  screenshot: (options?: any) => Promise<Buffer | string>;
  close: () => Promise<void>;
  waitForNavigation: (options?: { waitUntil?: string; timeout?: number }) => Promise<void>;
  setUserAgent: (userAgent: string) => Promise<void>;
  setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<void>;
  setViewport: (viewport: { width: number; height: number }) => Promise<void>;
  setDefaultNavigationTimeout: (timeout: number) => void;
  setDefaultTimeout: (timeout: number) => void;
  waitForTimeout: (timeout: number) => Promise<void>;
  select: (selector: string, value: string) => Promise<void>;
  waitForLoadState: (state?: string) => Promise<void>;
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  _playwrightPage: Page;
}

interface BrowserInterface {
  newPage: () => Promise<PuppeteerCompatiblePage>;
  close: () => Promise<void>;
}

interface LaunchOptions {
  headless?: boolean;
  args?: string[];
  timeout?: number;
}

/**
 * Playwright Browser Service - Drop-in replacement for Puppeteer
 * Keeps all existing selectors and logic intact
 */
export class PlaywrightBrowser {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async connect(browserWSEndpoint: string): Promise<BrowserInterface> {
    console.log('🌐 Connecting to remote browser via WebSocket...');
    this.browser = await chromium.connect(browserWSEndpoint);
    
    return {
      newPage: async () => {
        const page = await this.browser!.newPage();
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

  async launch(options: LaunchOptions = {}): Promise<BrowserInterface> {
    // Convert Puppeteer options to Playwright options
    const playwrightOptions: any = {
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
    this.browser = await chromium.launch(playwrightOptions);
    
    return {
      newPage: async () => {
        const page = await this.browser!.newPage();
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

  private createPuppeteerCompatiblePage(page: Page): PuppeteerCompatiblePage {
    return {
      // Core navigation
      goto: async (url: string, options: { waitUntil?: string; timeout?: number } = {}) => {
        // Convert Puppeteer waitUntil values to Playwright equivalents
        let waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle';
        if (options.waitUntil === 'networkidle0' || options.waitUntil === 'networkidle2') {
          waitUntil = 'networkidle';
        } else if (options.waitUntil === 'load') {
          waitUntil = 'load';
        } else if (options.waitUntil === 'domcontentloaded') {
          waitUntil = 'domcontentloaded';
        }
        return page.goto(url, {
          waitUntil,
          timeout: options.timeout || 30000
        });
      },
      
      // Selectors - exact same API as Puppeteer
      $: (selector: string) => page.locator(selector).first(),
      $$: (selector: string) => page.locator(selector),
      $$eval: async (selector: string, pageFunction: Function) => {
        const elements = await page.locator(selector).all();
        const results = await Promise.all(elements.map(el => el.evaluate(pageFunction as any)));
        return results;
      },
      waitForSelector: async (selector: string, options: { timeout?: number; visible?: boolean } = {}) => {
        await page.waitForSelector(selector, {
          timeout: options.timeout || 10000,
          state: options.visible !== false ? 'visible' : 'attached'
        });
        return page.locator(selector).first();
      },
      
      // Form interactions
      type: async (selector: string, text: string) => {
        await page.fill(selector, text);
      },
      click: async (selector: string, options: { timeout?: number } = {}) => {
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
          } catch (clickError: any) {
            console.log(`🔄 Normal click failed, trying force click: ${clickError.message}`);
            // Force click for stubborn form elements
            await page.click(selector, { 
              timeout: options.timeout || 5000,
              force: true 
            });
          }
        } catch (error: any) {
          console.error(`❌ Click failed for selector ${selector}:`, error.message);
          throw error;
        }
      },
      
      // Page info
      url: () => page.url(),
      content: () => page.content(),
      
      // Evaluation
      evaluate: async (pageFunction: Function, ...args: any[]) => {
        return page.evaluate(pageFunction as any, ...args);
      },
      
      // Screenshots and debugging
      screenshot: async (options: any = {}) => {
        return page.screenshot(options);
      },
      
      // Page lifecycle
      close: () => page.close(),
      
      // Advanced interactions
      waitForNavigation: async (options: { waitUntil?: string; timeout?: number } = {}) => {
        // Convert Puppeteer waitUntil values to Playwright equivalents
        let waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle';
        if (options.waitUntil === 'networkidle0' || options.waitUntil === 'networkidle2') {
          waitUntil = 'networkidle';
        } else if (options.waitUntil === 'load') {
          waitUntil = 'load';
        } else if (options.waitUntil === 'domcontentloaded') {
          waitUntil = 'domcontentloaded';
        }
        return page.waitForLoadState(waitUntil, {
          timeout: options.timeout || 30000
        });
      },
      
      // Browser configuration - Puppeteer compatibility
      setUserAgent: async (userAgent: string) => {
        await page.setExtraHTTPHeaders({ 'User-Agent': userAgent });
      },
      setExtraHTTPHeaders: async (headers: Record<string, string>) => {
        await page.setExtraHTTPHeaders(headers);
      },
      setViewport: async (viewport: { width: number; height: number }) => {
        await page.setViewportSize(viewport);
      },
      setDefaultNavigationTimeout: (timeout: number) => {
        page.setDefaultNavigationTimeout(timeout);
      },
      setDefaultTimeout: (timeout: number) => {
        page.setDefaultTimeout(timeout);
      },
      
      // Additional Puppeteer compatibility methods
      waitForTimeout: (timeout: number) => page.waitForTimeout(timeout),
      select: async (selector: string, value: string) => {
        await page.selectOption(selector, value);
      },
      
      // Playwright-specific improvements
      waitForLoadState: (state: string = 'networkidle') => {
        return page.waitForLoadState(state as any);
      },
      setViewportSize: (size: { width: number; height: number }) => {
        return page.setViewportSize(size);
      },
      
      // Raw Playwright page for advanced use
      _playwrightPage: page
    };
  }
}
