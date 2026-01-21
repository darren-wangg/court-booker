import { Page } from 'playwright-core';
interface PuppeteerCompatiblePage {
    goto: (url: string, options?: {
        waitUntil?: string;
        timeout?: number;
    }) => Promise<any>;
    $: (selector: string) => any;
    $$: (selector: string) => any;
    $$eval: (selector: string, pageFunction: Function) => Promise<any>;
    waitForSelector: (selector: string, options?: {
        timeout?: number;
        visible?: boolean;
    }) => Promise<any>;
    type: (selector: string, text: string) => Promise<void>;
    click: (selector: string, options?: {
        timeout?: number;
    }) => Promise<void>;
    url: () => string;
    content: () => Promise<string>;
    evaluate: (pageFunction: Function, ...args: any[]) => Promise<any>;
    screenshot: (options?: any) => Promise<Buffer | string>;
    close: () => Promise<void>;
    waitForNavigation: (options?: {
        waitUntil?: string;
        timeout?: number;
    }) => Promise<void>;
    setUserAgent: (userAgent: string) => Promise<void>;
    setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<void>;
    setViewport: (viewport: {
        width: number;
        height: number;
    }) => Promise<void>;
    setDefaultNavigationTimeout: (timeout: number) => void;
    setDefaultTimeout: (timeout: number) => void;
    waitForTimeout: (timeout: number) => Promise<void>;
    select: (selector: string, value: string) => Promise<void>;
    waitForLoadState: (state?: string) => Promise<void>;
    setViewportSize: (size: {
        width: number;
        height: number;
    }) => Promise<void>;
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
export declare class PlaywrightBrowser {
    private browser;
    private page;
    connect(browserWSEndpoint: string): Promise<BrowserInterface>;
    launch(options?: LaunchOptions): Promise<BrowserInterface>;
    private createPuppeteerCompatiblePage;
}
export {};
//# sourceMappingURL=playwrightBrowser.d.ts.map