const puppeteer = require("puppeteer");

/**
 * Railway-optimized Chrome launch configuration
 * Handles Protocol errors and resource constraints
 */
class RailwayChrome {
  static getExtremeRailwayLaunchOptions() {
    return {
      headless: true,
      defaultViewport: null,
      executablePath: undefined, // Always use bundled Chrome on Railway
      args: [
        // Core Railway requirements
        "--no-sandbox",
        "--disable-setuid-sandbox", 
        "--disable-dev-shm-usage",
        
        // Extreme resource limiting
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
        "--max_old_space_size=128", // Very low memory limit
        "--aggressive-memory-allocation",
        
        // Disable unnecessary features
        "--disable-extensions",
        "--disable-plugins", 
        "--disable-images",
        // Note: NOT disabling JavaScript as it's needed for form interactions
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-features=RendererCodeIntegrity",
        "--disable-features=TranslateUI",
        "--disable-features=BlinkGenPropertyTrees",
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
        "--disable-vulkan",
        "--disable-metal",
        "--disable-skia-runtime-opts",
        "--use-gl=swiftshader-webgl",
        "--use-angle=swiftshader",
        
        // Threading and compositing
        "--disable-threaded-animation",
        "--disable-threaded-scrolling", 
        "--disable-threaded-compositing",
        "--disable-smooth-scrolling",
        "--disable-checker-imaging",
        "--disable-new-content-rendering-timeout",
        "--disable-image-animation-resync",
        
        // UI/UX disabling
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-infobars",
        "--disable-popup-blocking",
        "--no-first-run",
        "--no-startup-window",
        "--no-default-browser-check",
        "--no-pings",
        "--no-zygote",
        
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
        "--disable-gl-drawing-for-tests",
        
        // Force minimal resource usage
        "--renderer-process-limit=1",
        "--max-gum-fps=5",
        "--force-color-profile=srgb",
        "--force-fieldtrials=*BackgroundTracing/default/",
        "--disable-field-trial-config",
        "--allow-running-insecure-content",
        "--metrics-recording-only"
      ],
      timeout: 120000, // 2 minutes
      protocolTimeout: 240000, // 4 minutes  
      pipe: true,
      slowMo: 500, // Very slow to reduce resource usage
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false
    };
  }

  static async launchWithRetries(maxRetries = 5) {
    console.log('🚂 Launching Chrome with extreme Railway optimizations...');
    
    const launchOptions = this.getExtremeRailwayLaunchOptions();
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 Chrome launch attempt ${attempt}/${maxRetries}...`);
        
        if (attempt > 1) {
          // Progressive delay with jitter
          const baseDelay = attempt * 3000; // 3s, 6s, 9s, 12s, 15s
          const jitter = Math.random() * 2000; // 0-2s random
          const delay = baseDelay + jitter;
          
          console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Force garbage collection
          if (global.gc) {
            console.log('🗑️ Running garbage collection...');
            global.gc();
          }
        }
        
        const browser = await puppeteer.launch(launchOptions);
        console.log('✅ Chrome launched successfully with Railway optimizations');
        
        // Test the connection immediately
        const pages = await browser.pages();
        if (pages.length === 0) {
          await browser.newPage();
        }
        
        console.log('✅ Chrome protocol connection verified');
        return browser;
        
      } catch (error) {
        lastError = error;
        console.log(`❌ Chrome launch failed (attempt ${attempt}): ${error.message}`);
        
        // Special handling for protocol errors
        if (error.message.includes('Protocol error') || 
            error.message.includes('Target closed') ||
            error.message.includes('setDiscoverTargets')) {
          console.log('🔧 Protocol error detected - Chrome closing too quickly');
        }
        
        // Try with even more extreme settings on later attempts
        if (attempt > 2) {
          launchOptions.args.push(
            '--disable-features=VizHitTestSurfaceLayer',
            '--disable-features=VizHitTestDrawQuad', 
            '--disable-partial-raster',
            '--disable-skia-runtime-opts',
            '--disable-threaded-compositing'
          );
          console.log('🔧 Added extra restrictive flags for attempt', attempt);
        }
      }
    }
    
    console.log(`💥 All ${maxRetries} Chrome launch attempts failed`);
    console.log(`💥 Last error: ${lastError?.message}`);
    
    // Determine if this is a resource constraint issue
    const isResourceConstraint = lastError && (
      lastError.message.includes('Resource temporarily unavailable') ||
      lastError.message.includes('pthread_create') ||
      lastError.message.includes('fork') ||
      lastError.message.includes('EAGAIN') ||
      lastError.message.includes('spawn') ||
      lastError.message.includes('Protocol error') ||
      lastError.message.includes('Target closed') ||
      lastError.message.includes('Failed to launch')
    );
    
    if (isResourceConstraint) {
      console.log('🚨 Railway resource constraints detected');
      return null; // Return null for graceful handling
    }
    
    throw lastError || new Error('Chrome launch failed for unknown reasons');
  }
}

module.exports = RailwayChrome;