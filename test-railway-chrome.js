const puppeteer = require("puppeteer");

async function testRailwayChrome() {
  console.log('🚀 Testing Railway Chrome compatibility...');
  
  // Simulate Railway environment
  process.env.RAILWAY_ENVIRONMENT = 'true';
  
  const launchOptions = {
    headless: true,
    defaultViewport: null,
    // Don't use system Chrome in Railway - use bundled version
    executablePath: undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-extensions",
      "--disable-plugins",
      "--disable-images",
      "--disable-javascript",
      "--memory-pressure-off",
      "--max_old_space_size=256",
      "--disable-background-networking",
      "--disable-ipc-flooding-protection",
      "--disable-hang-monitor",
      "--no-startup-window",
      "--disable-canvas-aa",
      "--disable-2d-canvas-clip-aa",
      "--disable-gl-drawing-for-tests",
      "--disable-software-rasterizer",
      "--disable-background-mode",
      "--disable-features=AudioServiceOutOfProcess",
      "--disable-dev-tools",
      "--disable-logging",
      "--silent",
      "--log-level=3"
    ],
    timeout: 60000,
    protocolTimeout: 300000,
    pipe: true,
    slowMo: 250,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false
  };

  const maxRetries = 3;
  let browser = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 Attempt ${attempt}/${maxRetries}...`);
      
      if (attempt > 1) {
        const delay = Math.random() * 5000 + (attempt * 2000);
        console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (global.gc) {
          global.gc();
        }
      }
      
      browser = await puppeteer.launch(launchOptions);
      console.log('✅ Browser launched successfully!');
      
      const page = await browser.newPage();
      console.log('✅ Page created successfully!');
      
      await page.goto('https://httpbin.org/html', { timeout: 30000 });
      console.log('✅ Navigation successful!');
      
      const title = await page.title();
      console.log(`✅ Page title: ${title}`);
      
      await page.close();
      await browser.close();
      
      console.log('🎉 Railway Chrome test PASSED!');
      return true;
      
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
      
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.log('⚠️ Error closing browser:', closeError.message);
        }
      }
      
      if (attempt === maxRetries) {
        console.log('💥 All attempts failed - Railway Chrome not compatible');
        return false;
      }
    }
  }
  
  return false;
}

testRailwayChrome()
  .then(success => {
    console.log(`\n🏁 Test result: ${success ? 'SUCCESS' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });