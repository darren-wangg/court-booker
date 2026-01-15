import { Browser, LaunchOptions } from 'puppeteer';
/**
 * Cloud-optimized Chrome launch configuration
 * Handles Protocol errors and resource constraints in cloud environments
 */
export declare class CloudChrome {
    static getOptimizedLaunchOptions(): LaunchOptions;
    static launchWithRetries(maxRetries?: number): Promise<Browser | null>;
}
//# sourceMappingURL=cloudChrome.d.ts.map