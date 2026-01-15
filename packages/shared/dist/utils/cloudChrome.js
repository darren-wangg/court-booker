"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudChrome = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
/**
 * Cloud-optimized Chrome launch configuration
 * Handles Protocol errors and resource constraints in cloud environments
 */
class CloudChrome {
    static getOptimizedLaunchOptions() {
        return {
            headless: true,
            defaultViewport: null,
            executablePath: undefined, // Use bundled Chrome
            args: [
                // Core cloud environment requirements
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                // Resource optimizations
                "--single-process",
                "--disable-gpu",
                "--disable-gpu-sandbox",
                "--disable-software-rasterizer",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--disable-background-networking",
                "--disable-background-mode",
                // Memory optimizations
                "--memory-pressure-off",
                "--max_old_space_size=128", // Reasonable memory limit
                "--disable-dev-shm-usage",
                "--shm-size=256m",
                // Disable unnecessary features
                "--disable-extensions",
                "--disable-plugins",
                "--disable-images",
                // Note: NOT disabling JavaScript as it's needed for form interactions
                "--disable-web-security",
                "--disable-features=VizDisplayCompositor",
                "--disable-features=AudioServiceOutOfProcess",
                "--disable-features=TranslateUI",
                "--disable-component-extensions-with-background-pages",
                "--disable-default-apps",
                "--disable-sync",
                "--disable-translate",
                // Protocol error prevention
                "--disable-ipc-flooding-protection",
                "--disable-hang-monitor",
                "--disable-crash-reporter",
                "--disable-breakpad",
                "--disable-client-side-phishing-detection",
                "--disable-prompt-on-repost",
                "--disable-domain-reliability",
                "--disable-component-update",
                // Graphics/rendering optimizations
                "--disable-accelerated-2d-canvas",
                "--disable-accelerated-mjpeg-decode",
                "--disable-accelerated-video-decode",
                "--disable-accelerated-video-encode",
                "--disable-gpu-memory-buffer-video-frames",
                "--disable-gpu-memory-buffer-compositor-resources",
                "--disable-zero-copy",
                "--use-gl=swiftshader-webgl",
                "--use-angle=swiftshader",
                // Threading and compositing
                "--disable-threaded-animation",
                "--disable-threaded-scrolling",
                "--disable-threaded-compositing",
                "--disable-smooth-scrolling",
                "--disable-checker-imaging",
                // UI/UX disabling
                "--hide-scrollbars",
                "--mute-audio",
                "--disable-infobars",
                "--disable-popup-blocking",
                "--no-first-run",
                "--no-startup-window",
                "--no-default-browser-check",
                "--no-pings",
                // Logging and debugging
                "--disable-logging",
                "--disable-dev-tools",
                "--silent",
                "--log-level=3",
                // Process management
                "--disable-permissions-api",
                "--disable-presentation-api",
                "--disable-print-preview",
                "--disable-speech-api",
                "--disable-file-system",
                "--password-store=basic",
                "--use-mock-keychain",
                // Automation flags
                "--enable-automation",
                "--disable-blink-features=AutomationControlled",
                "--disable-canvas-aa",
                "--disable-2d-canvas-clip-aa",
                "--disable-gl-drawing-for-tests"
            ],
            timeout: 120000, // 2 minutes
            protocolTimeout: 180000, // 3 minutes  
            pipe: true,
            slowMo: 300, // Moderate slowdown for stability
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false
        };
    }
    static async launchWithRetries(maxRetries = 3) {
        console.log('🌐 Launching Chrome with cloud optimizations...');
        const launchOptions = this.getOptimizedLaunchOptions();
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🚀 Chrome launch attempt ${attempt}/${maxRetries}...`);
                if (attempt > 1) {
                    // Progressive delay with jitter
                    const baseDelay = attempt * 2000; // 2s, 4s, 6s
                    const jitter = Math.random() * 1000; // 0-1s random
                    const delay = baseDelay + jitter;
                    console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    // Force garbage collection
                    if (global.gc) {
                        console.log('🗑️ Running garbage collection...');
                        global.gc();
                    }
                }
                const browser = await puppeteer_1.default.launch(launchOptions);
                console.log('✅ Chrome launched successfully with cloud optimizations');
                // Test the connection immediately
                const pages = await browser.pages();
                if (pages.length === 0) {
                    await browser.newPage();
                }
                console.log('✅ Chrome protocol connection verified');
                return browser;
            }
            catch (error) {
                lastError = error;
                console.log(`❌ Chrome launch failed (attempt ${attempt}): ${lastError.message}`);
                // Special handling for protocol errors
                if (lastError.message.includes('Protocol error') ||
                    lastError.message.includes('Target closed') ||
                    lastError.message.includes('setDiscoverTargets')) {
                    console.log('🔧 Protocol error detected - Chrome closing too quickly');
                }
                // Try with additional restrictive settings on later attempts
                if (attempt > 1 && launchOptions.args) {
                    launchOptions.args.push('--disable-features=VizHitTestSurfaceLayer', '--disable-partial-raster', '--disable-skia-runtime-opts');
                    console.log('🔧 Added extra restrictive flags for attempt', attempt);
                }
            }
        }
        console.log(`💥 All ${maxRetries} Chrome launch attempts failed`);
        console.log(`💥 Last error: ${lastError?.message}`);
        // Determine if this is a resource constraint issue
        const isResourceConstraint = lastError && (lastError.message.includes('Resource temporarily unavailable') ||
            lastError.message.includes('pthread_create') ||
            lastError.message.includes('fork') ||
            lastError.message.includes('EAGAIN') ||
            lastError.message.includes('spawn') ||
            lastError.message.includes('Protocol error') ||
            lastError.message.includes('Target closed') ||
            lastError.message.includes('Failed to launch'));
        if (isResourceConstraint) {
            console.log('🚨 Cloud environment resource constraints detected');
            return null; // Return null for graceful handling
        }
        throw lastError || new Error('Chrome launch failed for unknown reasons');
    }
}
exports.CloudChrome = CloudChrome;
//# sourceMappingURL=cloudChrome.js.map