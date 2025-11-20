const PlaywrightBrowser = require("../utils/playwrightBrowser");
const axios = require("axios");
const cheerio = require("cheerio");
const EmailService = require("./emailService");
const config = require("../config");
const { generateEmailHTML } = require("../email-templates/availabilities");
const FlyioChrome = require("../utils/flyioChrome");

// Increase timeouts in CI environments where network might be slower
const SIXTY_SECONDS = 60 * 1000;
const THIRTY_SECONDS = 30 * 1000;
const CI_TIMEOUT_MULTIPLIER = process.env.GITHUB_ACTIONS ? 2 : 1;
const NAVIGATION_TIMEOUT = SIXTY_SECONDS * CI_TIMEOUT_MULTIPLIER;
const DEFAULT_TIMEOUT = THIRTY_SECONDS * CI_TIMEOUT_MULTIPLIER;
const START_HOUR = 10; // 10 AM
const END_HOUR = 22; // 10 PM

class ReservationChecker {
  constructor(userId = null) {
    this.browser = null;
    this.page = null;
    this.user = config.getUser(userId);
    this.emailService = new EmailService();
  }

  async initialize() {
    try {
      console.log('🌐 Initializing browser service...');
      
      // Check for Browserless.io cloud browser token
      const browserlessToken = process.env.BROWSERLESS_TOKEN;
      if (browserlessToken) {
        console.log('☁️ Browserless.io token detected - using cloud browser service');
        return this.initializeBrowserlessChrome(browserlessToken);
      }
      
      // Detect Fly.io environment
      const isFlyio = process.env.FLY_APP_NAME || process.env.FLY_REGION || process.env.FLY_ALLOC_ID;
      
      // Initialize resource constraint flag (legacy name for compatibility)
      this.resourceConstraint = false;
      
      // Fly.io-optimized Chrome configuration
      if (isFlyio) {
        console.log('✈️ Fly.io environment detected - using optimized Chrome configuration');
        return this.initializeFlyioChrome();
      }
      
      console.log('🌐 Initializing Puppeteer browser...');
      
      // Enhanced configuration with CI-specific optimizations
      const launchOptions = {
        headless: true,
        defaultViewport: null,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          // Additional CI-specific flags for better content loading
          ...(process.env.GITHUB_ACTIONS ? [
            "--disable-extensions-except",
            "--disable-plugins",
            "--disable-default-apps",
            "--disable-sync",
            "--disable-translate",
            "--disable-web-security",
            "--disable-features=TranslateUI",
            "--disable-ipc-flooding-protection",
            "--allow-running-insecure-content",
            "--ignore-certificate-errors",
            "--ignore-ssl-errors",
            "--ignore-certificate-errors-spki-list"
          ] : [])
        ],
        timeout: NAVIGATION_TIMEOUT,
        protocolTimeout: process.env.GITHUB_ACTIONS ? 240000 : 120000,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false
      };

      // Try to launch Chrome with basic retry logic for local development
      const maxRetries = 3;
      let lastError = null;
      let browserLaunched = false;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🌐 Attempting to launch browser (attempt ${attempt}/${maxRetries})...`);
          console.log(`🌐 Chrome executable path: ${launchOptions.executablePath || 'bundled'}`);
          
          if (attempt > 1) {
            const delay = Math.random() * 2000 + 1000; // 1-3 seconds
            console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          const playwrightBrowser = new PlaywrightBrowser();
          this.browser = await playwrightBrowser.launch(launchOptions);
          console.log('✅ Browser launched successfully');
          browserLaunched = true;
          break;
          
        } catch (chromeError) {
          lastError = chromeError;
          console.log(`⚠️ Chrome launch failed (attempt ${attempt}/${maxRetries}): ${chromeError.message}`);
          
          // Try fallback without executable path on first failure
          if (attempt === 1) {
            try {
              console.log('🔄 Trying with bundled Chrome...');
              const fallbackOptions = { ...launchOptions };
              delete fallbackOptions.executablePath;
              
              const playwrightBrowser = new PlaywrightBrowser();
              this.browser = await playwrightBrowser.launch(fallbackOptions);
              console.log('✅ Browser launched successfully with bundled Chrome');
              browserLaunched = true;
              break;
              
            } catch (fallbackError) {
              console.log(`⚠️ Bundled Chrome also failed: ${fallbackError.message}`);
              lastError = fallbackError;
            }
          }
        }
      }
      
      if (!browserLaunched) {
        throw new Error(`Chrome launch failed after ${maxRetries} attempts: ${lastError?.message}`);
      }

      // Create page only after successful browser launch
      this.page = await this.browser.newPage();

      // Add extra stealth measures for CI environment
      if (process.env.GITHUB_ACTIONS) {
        console.log('🔍 Applying CI-specific browser configuration...');
        
        // Set a realistic user agent
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set additional headers
        await this.page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        });

        // Set viewport to common desktop size
        await this.page.setViewport({ width: 1366, height: 768 });
      }

      // Set increased timeouts for CI environments
      const pageNavigationTimeout = process.env.GITHUB_ACTIONS ? (NAVIGATION_TIMEOUT * 3) : NAVIGATION_TIMEOUT;
      const pageDefaultTimeout = process.env.GITHUB_ACTIONS ? (DEFAULT_TIMEOUT * 3) : DEFAULT_TIMEOUT;
      
      this.page.setDefaultNavigationTimeout(pageNavigationTimeout);
      this.page.setDefaultTimeout(pageDefaultTimeout);
    } catch (error) {
      console.error("Failed to initialize browser: ", error);
      throw error;
    }
  }

  async initializeBrowserlessChrome(token) {
    try {
      console.log('☁️ Connecting to Browserless.io cloud browser service...');
      console.log(`🔍 Token length: ${token ? token.length : 'undefined'} characters`);
      
      // Connect to cloud browser via WebSocket (updated endpoint)
      const browserWSEndpoint = `wss://production-sfo.browserless.io?token=${token}`;
      console.log('🔗 WebSocket endpoint:', browserWSEndpoint.replace(token, '[TOKEN_HIDDEN]'));
      
      const playwrightBrowser = new PlaywrightBrowser();
      
      // Add timeout to the connection attempt
      const connectionPromise = playwrightBrowser.connect(browserWSEndpoint);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000);
      });
      
      console.log('⏳ Attempting WebSocket connection with 30s timeout...');
      this.browser = await Promise.race([connectionPromise, timeoutPromise]);
      
      console.log('✅ Connected to Browserless.io cloud browser');
      
      // Create new page
      this.page = await this.browser.newPage();
      
      // Set realistic user agent and headers
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
      });
      
      // Set viewport
      await this.page.setViewport({ width: 1366, height: 768 });
      
      // Set generous timeouts for cloud browser
      this.page.setDefaultNavigationTimeout(90000); // 90 seconds
      this.page.setDefaultTimeout(60000); // 60 seconds
      
      console.log('✅ Browserless.io browser configured and ready');
      
    } catch (error) {
      console.error('❌ Failed to connect to Browserless.io:', error.message);
      console.error('💡 Possible issues:');
      console.error('   - Invalid or expired token');
      console.error('   - Network connectivity from Fly.io to Browserless.io');
      console.error('   - Rate limit exceeded (free tier)');
      console.error('   - Browserless.io service downtime');
      throw error;
    }
  }

  async initializeFlyioChrome() {
    try {
      console.log('✈️ Initializing Fly.io-optimized Chrome with enhanced resource management...');
      
      // Optimized Chrome configuration for Fly.io environment with context recovery
      const flyioOptions = {
        headless: 'shell', // Use shell headless mode (most minimal)
        args: [
          // Core sandbox and security flags
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          
          // Disable all GPU acceleration
          '--disable-gpu',
          '--disable-gpu-sandbox',
          '--disable-gpu-process',
          '--disable-accelerated-2d-canvas',
          '--disable-accelerated-video-decode',
          '--disable-accelerated-video-encode',
          
          // Force single process mode
          '--single-process',
          '--no-zygote',
          
          // Disable all background processes
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-background-mode',
          
          // Disable all extensions and plugins
          '--disable-extensions',
          '--disable-plugins',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          
          // Disable audio and media
          '--mute-audio',
          '--disable-audio-service-sandbox',
          
          // Disable networking features
          '--disable-sync',
          '--disable-translate',
          '--disable-domain-reliability',
          '--disable-background-networking',
          
          // Minimal memory usage
          '--memory-pressure-off',
          '--max_old_space_size=256',
          '--js-flags=--max-old-space-size=256',
          
          // Disable unnecessary features
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-features=VizHitTestSurfaceLayer',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-component-update',
          '--disable-breakpad',
          '--disable-crash-reporter',
          '--disable-client-side-phishing-detection',
          
          // Disable image loading to save resources
          '--disable-images',
          // Note: NOT disabling JavaScript as it's needed for form interactions and table loading
          
          // Process limits
          '--renderer-process-limit=1',
          '--disable-threaded-compositing',
          '--disable-threaded-scrolling',
          
          // Minimal logging
          '--silent',
          '--log-level=3',
          '--disable-logging'
        ],
        ignoreDefaultArgs: [
          '--disable-extensions', // We handle this manually
          '--enable-automation',   // Reduce automation detection
          '--disable-background-timer-throttling' // We handle this manually
        ],
        timeout: 30000, // Shorter timeout
        protocolTimeout: 45000,
        pipe: true, // Use pipe instead of websocket
        slowMo: 0,
        defaultViewport: { width: 800, height: 600 }, // Smaller viewport
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        dumpio: false,
        devtools: false,
        waitForInitialPage: false
      };

      // Force process cleanup before launching
      await this.forceProcessCleanup();

      let browser = null;
      let lastError = null;
      
      // Try ultra-minimal approach first
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          console.log(`✈️ Fly.io Chrome launch attempt ${attempt}/5`);
          
          if (attempt > 1) {
            // Progressive wait with cleanup
            await this.forceProcessCleanup();
            const delay = attempt * 2000; // 2s, 4s, 6s, 8s
            console.log(`⏳ Waiting ${delay}ms for Fly.io resources...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const playwrightBrowser = new PlaywrightBrowser();
          browser = await playwrightBrowser.launch(flyioOptions);
          console.log('✅ Fly.io Chrome launched successfully');
          break;
          
        } catch (error) {
          lastError = error;
          console.log(`⚠️ Fly.io Chrome attempt ${attempt} failed: ${error.message}`);
          
          // Try progressively more minimal configs
          if (attempt === 2) {
            // Remove JavaScript disable if it's causing issues
            flyioOptions.args = flyioOptions.args.filter(arg => arg !== '--disable-javascript');
            console.log('🔧 Re-enabling JavaScript for form interactions');
          }
          
          if (attempt === 3) {
            // Try with absolute minimal args
            flyioOptions.args = [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--single-process',
              '--disable-gpu'
            ];
            console.log('🔧 Using absolute minimal Chrome args');
          }
          
          if (attempt === 4) {
            // Try bundled Chrome
            delete flyioOptions.executablePath;
            console.log('🔧 Forcing bundled Chrome');
          }
        }
      }

      if (!browser) {
        console.log('❌ All Fly.io Chrome attempts failed, enabling fallback mode');
        this.resourceConstraint = true;
        return;
      }

      this.browser = browser;
      this.page = await browser.newPage();
      
      // Minimal page configuration
      this.page.setDefaultNavigationTimeout(30000);
      this.page.setDefaultTimeout(15000);
      
      // Set minimal user agent
      await this.page.setUserAgent('Mozilla/5.0 (Linux; Ubuntu)');
      
      console.log('✅ Fly.io Chrome initialization completed');
      
    } catch (error) {
      console.error('❌ Fly.io Chrome initialization failed:', error.message);
    }
  }

  async forceProcessCleanup() {
    try {
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }
      
      // Small delay to let system recover
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to kill any hanging Chrome processes (Fly.io-safe)
      try {
        const { execSync } = require('child_process');
        execSync('pkill -f "chrome" || true', { stdio: 'ignore', timeout: 2000 });
      } catch (killError) {
        // Ignore kill errors - this is just cleanup
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  // Fly.io fallback for when Chrome is unavailable
  async checkAvailabilityFallback() {
    try {
      console.log('✈️ Fly.io fallback mode - monitoring email requests only');
      
      // Generate realistic fallback data to keep the system functional
      const next7Days = this.getNext7Days();
      const fallbackResults = next7Days.map(dateInfo => ({
        date: dateInfo.fullDate,
        booked: [], // Unknown in fallback mode
        available: [], // Unknown in fallback mode  
        totalSlots: this.generateTimeSlots().length,
        checkedAt: new Date().toISOString(),
        fallbackMode: true,
        message: 'Chrome unavailable - email booking still functional'
      }));
      
      return {
        success: true,
        dates: fallbackResults,
        totalAvailableSlots: 0, // Unknown in fallback mode
        checkedAt: new Date().toISOString(),
        fallbackMode: true,
        flyioCompatibilityMode: true,
        message: 'Fly.io fallback mode active - email booking functionality preserved'
      };
      
    } catch (error) {
      console.error('❌ Fly.io fallback failed:', error.message);
      return {
        success: false,
        error: 'Fly.io fallback mode failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  async login() {
    try {
      // Check if page was created (resource constraints might prevent this)
      if (!this.page) {
        throw new Error('Browser page not available - likely due to resource constraints');
      }
      
      await this.page.goto(config.amenityUrl, { waitUntil: "networkidle2" });

      // Wait for login form
      await this.page.waitForSelector(
        'input[type="text"], input[name="email"], input[id*="email"]',
        {
          timeout: config.timeouts.waitForSelector,
        }
      );

      const emailSelector = await this.findEmailField();
      await this.page.type(emailSelector, this.user.email);

      const passwordSelector = await this.findPasswordField();
      await this.page.type(passwordSelector, this.user.password);

      const submitButton = await this.findSubmitButton();
      
      // Add debug logging for CI
      if (process.env.GITHUB_ACTIONS) {
        console.log('🔍 About to submit login form...');
        const currentUrl = this.page.url();
        console.log('🔍 Current URL before submit:', currentUrl);
      }
      
      // Click submit button without waiting for navigation
      console.log('🔍 Clicking submit button...');
      await this.page.click(submitButton);
      
      // Wait and check if login succeeded manually - longer wait for CI
      const loginWaitTime = process.env.GITHUB_ACTIONS ? 20000 : 10000; // 20s for GHA, 10s otherwise
      console.log(`🔍 Waiting ${loginWaitTime/1000}s for login to process...`);
      await new Promise(resolve => setTimeout(resolve, loginWaitTime));
      
      const currentUrl = this.page.url();
      console.log('🔍 Current URL after login attempt:', currentUrl);
      
      // Check if we're still on login page (indicates failure)
      if (currentUrl.includes('LogOn') || currentUrl.includes('login') || currentUrl.includes('Login')) {
        // Try to find error messages
        try {
          const errorElement = await this.page.$('.validation-summary-errors, .alert-danger, .error-message');
          if (errorElement) {
            const errorText = await this.page.evaluate(el => el.textContent, errorElement);
            throw new Error(`Login failed: ${errorText}`);
          }
        } catch (err) {
          // Ignore if we can't find error element
        }
        throw new Error('Login failed - still on login page');
      }
      
      console.log('✅ Login appears successful - redirected away from login page');
      
      // Add debug logging for CI  
      if (process.env.GITHUB_ACTIONS) {
        const newUrl = this.page.url();
        console.log('🔍 New URL after submit:', newUrl);
      }

      await new Promise((resolve) =>
        setTimeout(resolve, config.timeouts.betweenActions)
      );
    } catch (error) {
      console.error("Login failed: ", error);
      throw error;
    }
  }

  async findEmailField() {
    const selectors = [
      'input[type="text"]',
      'input[name="UserName"]',
      'input[id*="UserName"]',
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        return selector;
      }
    }

    throw new Error("Email field not found");
  }

  async findPasswordField() {
    const selectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[id*="password"]',
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        return selector;
      }
    }

    throw new Error("Password field not found");
  }

  async findSubmitButton() {
    const selectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button[id*="submit-sign-in"]',
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        return selector;
      }
    }

    throw new Error("Submit button not found");
  }

  async clickShowMoreReservations() {
    try {
      // Try multiple approaches to find and click the "Show More" button
      let moreLink = await this.page.$("#get-more");
      
      if (!moreLink) {
        // Try alternative selectors
        const alternativeSelectors = [
          "a[id='get-more']",
          "a[href*='more']",
          "button[id='get-more']",
          "#more-messages #get-more",
          "a:has-text('more')"
        ];
        
        for (const selector of alternativeSelectors) {
          try {
            moreLink = await this.page.$(selector);
            if (moreLink) break;
          } catch (e) {
            // Continue to next selector
          }
        }
      }

      if (moreLink) {
        // Check if visible using a more robust method
        try {
          const isVisible = await moreLink.isVisible();
          
          if (isVisible) {
            await moreLink.click();
            await new Promise((resolve) =>
              setTimeout(resolve, config.timeouts.betweenActions || 2000)
            );
            return true;
          } else {
            return false;
          }
        } catch (evalError) {
          // Try clicking anyway as fallback
          try {
            await moreLink.click();
            await new Promise((resolve) =>
              setTimeout(resolve, config.timeouts.betweenActions || 2000)
            );
            return true;
          } catch (clickError) {
            return false;
          }
        }
      } else {
        return false;
      }
    } catch (error) {
      console.error("Error clicking show more: ", error.message);
      return false;
    }
  }

  async loadAllReservations() {
    try {
      const allReservations = new Map();
      let hasMoreButton = true;
      let clickCount = 0;
      let previousTableContent = "";

      while (hasMoreButton && clickCount < 30) {
        const currentData = await this.page.evaluate(() => {
          const debug = {
            tableStructure: [],
            reservationsByDate: {},
            moreButtonInfo: {},
          };

          const reservations = [];

          const upcomingDiv = document.querySelector("#upcoming-resv");
          
          // Try multiple selectors to find tables
          let tables = [];
          const possibleSelectors = [
            "table.reservation-list.secondary-list",
            "table.reservation-list", 
            "table.secondary-list",
            "table[class*='reservation']",
            "table[class*='list']",
            "table"
          ];
          
          if (upcomingDiv) {
            for (const selector of possibleSelectors) {
              tables = Array.from(upcomingDiv.querySelectorAll(selector));
              if (tables.length > 0) {
                debug.tableStructure.push(`Found ${tables.length} tables using selector: ${selector}`);
                break;
              }
            }
          }
          
          // If no tables found in upcoming div, try the whole document
          if (tables.length === 0) {
            for (const selector of possibleSelectors) {
              tables = Array.from(document.querySelectorAll(selector));
              if (tables.length > 0) {
                debug.tableStructure.push(`Found ${tables.length} tables in document using selector: ${selector}`);
                break;
              }
            }
          }

          if (tables.length === 0) {
            debug.tableStructure.push(
              "ERROR: Could not find any reservation tables with any selector"
            );
            
            // Additional debugging: show what is available
            const allTables = document.querySelectorAll('table');
            debug.tableStructure.push(`Total tables on page: ${allTables.length}`);
            allTables.forEach((table, i) => {
              debug.tableStructure.push(`Table ${i}: class="${table.className || 'no-class'}", id="${table.id || 'no-id'}"`);
            });
            
            return { reservations, hasMore: false, debug, rowCount: 0 };
          }

          debug.tableStructure.push(
            `Found ${tables.length} reservation tables`
          );

          // Process all tables and combine their rows
          let allRows = [];
          tables.forEach((table, tableIndex) => {
            const tbody = table.querySelector("tbody");
            const tableRows = tbody ? tbody.querySelectorAll("tr") : [];
            debug.tableStructure.push(
              `Table ${tableIndex + 1}: ${tableRows.length} rows`
            );
            allRows = allRows.concat(Array.from(tableRows));
          });

          const rows = allRows;

          // First pass: identify all date headers and their positions
          const dateHeaders = [];
          rows.forEach((row, index) => {
            const dateCell = row.querySelector("td.resv-date");
            if (dateCell) {
              const dateSpan = dateCell.querySelector("span");
              if (dateSpan && dateSpan.textContent.trim()) {
                const dateText = dateSpan.textContent.trim();
                dateHeaders.push({
                  date: dateText,
                  rowIndex: index,
                });
                debug.tableStructure.push(
                  `Row ${index}: [DATE HEADER] ${dateText}`
                );
              }
            }
          });

          debug.dateHeadersCount = dateHeaders.length;
          debug.dateHeadersList = dateHeaders.map(
            (h) => `${h.date} at row ${h.rowIndex}`
          );

          // Process each row sequentially to maintain date context
          let currentDateSection = null;
          let rowsProcessed = 0;

          rows.forEach((row, index) => {
            rowsProcessed++;
            const dateCell = row.querySelector("td.resv-date");
            const timeCell = row.querySelector("td.resv-time");

            // First check if this row has a date header
            if (dateCell) {
              const dateSpan = dateCell.querySelector("span");
              if (dateSpan && dateSpan.textContent.trim()) {
                currentDateSection = dateSpan.textContent.trim();
                if (!debug.reservationsByDate[currentDateSection]) {
                  debug.reservationsByDate[currentDateSection] = [];
                }
                debug.tableStructure.push(
                  `Row ${index}: Found date "${currentDateSection}"`
                );
              }
            }

            // Then check if this row has a time slot (could be on same row as date or separate)
            if (timeCell && currentDateSection) {
              const timeSpan = timeCell.querySelector("span");
              if (timeSpan && timeSpan.textContent.trim()) {
                const time = timeSpan.textContent.trim();

                reservations.push({
                  date: currentDateSection,
                  time: time,
                });

                debug.reservationsByDate[currentDateSection].push(time);
                debug.tableStructure.push(
                  `Row ${index}: Found time "${time}" for ${currentDateSection}`
                );
              }
            }
          });

          debug.rowsProcessed = rowsProcessed;

          // Check for more button - look for the specific structure
          const moreMessagesDiv = upcomingDiv
            ? upcomingDiv.querySelector("#more-messages")
            : null;
          const getMoreLink = moreMessagesDiv
            ? moreMessagesDiv.querySelector("#get-more")
            : null;

          debug.moreButtonInfo = {
            upcomingDivExists: !!upcomingDiv,
            moreMessagesDivExists: !!moreMessagesDiv,
            getMoreLinkExists: !!getMoreLink,
            getMoreLinkVisible: getMoreLink
              ? getMoreLink.offsetParent !== null
              : false,
            getMoreLinkText: getMoreLink
              ? getMoreLink.textContent.trim()
              : "N/A",
          };

          const hasMore = getMoreLink && getMoreLink.offsetParent !== null;

          // Get full table HTML for comparison
          const tableHTML =
            tables.length > 0
              ? tables[0].innerHTML.substring(0, 500)
              : "NO TABLES";

          return {
            reservations,
            hasMore,
            debug,
            rowCount: rows.length,
            tableHTML,
          };
        });

        // Check if table content changed
        const tableChanged = currentData.tableHTML !== previousTableContent;
        if (!tableChanged && clickCount > 0) {
          console.log(
            '⚠️ WARNING ⚠️: Table content did not change after clicking "show more"!'
          );
        }
        previousTableContent = currentData.tableHTML;

        // Store all reservations (accumulating from each page)
        let newDatesAdded = 0;
        let newTimesAdded = 0;

        currentData.reservations.forEach((res) => {
          if (!allReservations.has(res.date)) {
            allReservations.set(res.date, new Set());
            newDatesAdded++;
          }
          const sizeBefore = allReservations.get(res.date).size;
          allReservations.get(res.date).add(res.time);
          if (allReservations.get(res.date).size > sizeBefore) {
            newTimesAdded++;
          }
        });

        hasMoreButton = currentData.hasMore;

        // Click to load next batch
        if (hasMoreButton && clickCount < 99) {
          const clicked = await this.clickShowMoreReservations();
          if (clicked) {
            clickCount++;
            // Longer wait for Fly.io environment
            const waitTime = process.env.FLY_APP_NAME ? 5000 : 2000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            
            // Additional wait for Fly.io after clicking "Show More"
            if (process.env.FLY_APP_NAME) {
              try {
                await this.page.waitForFunction(
                  () => document.readyState === 'complete',
                  { timeout: 10000 }
                );
              } catch (loadError) {
                await this.page.waitForTimeout(2000);
              }
            }
          } else {
            hasMoreButton = false;
          }
        }
      }

      return allReservations;
    } catch (error) {
      console.error("Failed to load reservations:", error);
      throw error;
    }
  }

  findTimeSlotsForDate(dateInfo, allReservations) {
    const allPossibleSlots = this.generateTimeSlots();
    const bookedSlots = [];

    // Extract target month and day
    const targetMonth = dateInfo.monthName || dateInfo.fullDate.split(" ")[0];
    const targetDay = parseInt(dateInfo.day, 10);

    // Look for matching date in reservations
    let foundMatch = false;
    for (const [resDate, timeSlots] of allReservations.entries()) {
      // Parse the reservation date (e.g., "Saturday, September 06")
      const parts = resDate.split(", ");

      if (parts.length >= 2) {
        const monthDayPart = parts[1]; // "September 06"
        const monthDayParts = monthDayPart.split(" ");

        if (monthDayParts.length >= 2) {
          const resMonth = monthDayParts[0];
          const resDay = monthDayParts[1];
          const resDayNum = parseInt(resDay, 10);

          // Check if this matches our target date
          if (resMonth === targetMonth && resDayNum === targetDay) {
            bookedSlots.push(...Array.from(timeSlots));
            foundMatch = true;
            break;
          }
        }
      }
    }

    // IMPORTANT: Available slots are those NOT in the reserved list
    const availableSlots = allPossibleSlots.filter(
      (slot) => !bookedSlots.includes(slot)
    );

    return {
      date: dateInfo.fullDate,
      booked: bookedSlots,
      available: availableSlots,
      totalSlots: allPossibleSlots.length,
    };
  }

  // Helper method to compare dates from different formats
  datesMatch(reservationDate, dateInfo) {
    // reservationDate format: "Saturday, December 07"
    // dateInfo.fullDate format: "December 2024 7"
    // dateInfo also has monthName and day properties

    try {
      // Extract day from reservation date
      const resvParts = reservationDate.split(", ");
      if (resvParts.length < 2) {
        console.log(`    ❌ Invalid format: "${reservationDate}"`);
        return false;
      }

      const resvMonthDay = resvParts[1]; // "December 07" or "December 7"
      const resvMonthDayParts = resvMonthDay.split(" ");
      if (resvMonthDayParts.length < 2) {
        console.log(`    ❌ Invalid month/day: "${resvMonthDay}"`);
        return false;
      }

      const resvMonth = resvMonthDayParts[0];
      const resvDay = resvMonthDayParts[1];
      const resvDayNum = parseInt(resvDay, 10);

      // Extract from dateInfo
      const dateInfoMonth =
        dateInfo.monthName || dateInfo.fullDate.split(" ")[0];
      const dateInfoDay = parseInt(dateInfo.day, 10);

      // Debug log
      const debugMatch = `"${resvMonth} ${resvDayNum}" vs "${dateInfoMonth} ${dateInfoDay}"`;

      // Compare month and day (ignore year since reservation doesn't show year)
      const match =
        resvMonth.toLowerCase() === dateInfoMonth.toLowerCase() &&
        resvDayNum === dateInfoDay;

      if (!match) {
        console.log(`    Comparing: ${debugMatch} - NO MATCH`);
      }

      return match;
    } catch (error) {
      console.error("Error comparing dates: ", error);
      console.error("  reservationDate:", reservationDate);
      console.error("  dateInfo:", JSON.stringify(dateInfo));
      return false;
    }
  }

  getNext7Days() {
    const days = [];
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Use current Eastern Time
    const now = new Date();
    const easternTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );

    // Start from tomorrow
    for (let i = 1; i <= 7; i++) {
      const date = new Date(easternTime);
      date.setDate(date.getDate() + i);

      const monthName = monthNames[date.getMonth()];
      const day = date.getDate().toString();
      const year = date.getFullYear();
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

      days.push({
        date: date,
        day: day,
        monthName: monthName,
        year: year,
        fullDate: `${dayOfWeek} ${monthName} ${day}, ${year}`,
      });
    }

    return days;
  }

  generateTimeSlots() {
    const slots = [];
    const startHour = START_HOUR;
    const endHour = END_HOUR;

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour > 12 ? hour - 12 : hour}:00 ${
        hour >= 12 ? "PM" : "AM"
      }`;
      const endHour = hour + 1;
      const endTime = `${endHour > 12 ? endHour - 12 : endHour}:00 ${
        endHour >= 12 ? "PM" : "AM"
      }`;
      slots.push(`${startTime} - ${endTime}`);
    }

    return slots;
  }

  /**
   * Robust browser operation wrapper with context recovery for Fly.io
   */
  async robustBrowserOperation(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Browser operation attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        if (error.message.includes('Target page, context or browser has been closed') || 
            error.message.includes('Protocol error')) {
          console.log(`⚠️ Browser context lost on attempt ${attempt}: ${error.message}`);
          
          if (attempt < maxRetries) {
            console.log(`🔄 Recovering browser context for attempt ${attempt + 1}...`);
            try {
              // Close current browser if it exists
              if (this.browser) {
                await this.browser.close().catch(() => {});
              }
              
              // Re-initialize with a short delay
              await new Promise(resolve => setTimeout(resolve, 2000));
              await this.initialize();
              console.log('✅ Browser context recovered');
            } catch (recoveryError) {
              console.log(`⚠️ Browser recovery failed: ${recoveryError.message}`);
              if (attempt === maxRetries) {
                throw error;
              }
            }
          } else {
            console.log('❌ Max retries reached, failing operation');
            throw error;
          }
        } else {
          // Non-browser-context error, don't retry
          throw error;
        }
      }
    }
  }

  async checkAvailability() {
    try {
      await this.initialize();
      
      // Handle resource constraints gracefully
      if (this.resourceConstraint) {
        console.log('✈️ Resource constraints detected - using fallback mode');
        const fallbackResult = await this.checkAvailabilityFallback();
        
        if (fallbackResult.success) {
          console.log('✅ Fallback mode completed successfully');
          // Send email notification about fallback mode
          await this.sendFallbackModeNotification();
          // Send the fallback results as a normal email report
          await this.sendEmailReport(fallbackResult);
          return {
            success: true,
            totalAvailableSlots: fallbackResult.totalAvailableSlots,
            dates: fallbackResult.dates,
            emailSent: true,
            message: 'Fallback mode - email monitoring active',
            fallbackMode: true,
            flyioCompatibilityMode: true,
            timestamp: new Date().toISOString()
          };
        } else {
          console.log('❌ Fallback mode failed');
          await this.sendResourceConstraintNotification();
          return {
            success: false,
            reason: 'Fallback mode failed',
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Use robust browser operation for login in Fly.io environment
      if (process.env.FLY_APP_NAME) {
        await this.robustBrowserOperation(() => this.login());
      } else {
        await this.login();
      }

      // Add debug info for CI
      if (process.env.GITHUB_ACTIONS) {
        console.log('🔍 Checking page content after login...');
        const currentUrl = this.page.url();
        console.log('🔍 Current URL:', currentUrl);
        
        // Check if any tables exist
        const tableCount = await this.page.$$eval('table', tables => tables.length);
        console.log('🔍 Total tables found:', tableCount);
        
        // Check if our specific table exists
        const targetTable = await this.page.$("table.reservation-list.secondary-list");
        console.log('🔍 Target table exists:', !!targetTable);
        
        if (!targetTable) {
          // Debug what tables do exist
          const tableInfo = await this.page.$$eval('table', tables => 
            tables.map((table, i) => ({
              index: i,
              id: table.id || 'no-id',
              className: table.className || 'no-class'
            }))
          );
          console.log('🔍 Available tables:', tableInfo);
        }
      }

      // Use much longer timeout for dynamic content loading
      let tableTimeout = config.timeouts.waitForSelector;
      if (process.env.GITHUB_ACTIONS) {
        tableTimeout = 120000;
      } else if (process.env.FLY_APP_NAME) {
        tableTimeout = 150000; // Even longer for Fly.io
      }
      console.log(`🔍 Waiting for reservation table (timeout: ${tableTimeout}ms)...`);
      
      // Wait for any loading indicators to disappear and table to be visible
      try {
        // First wait for the page to fully load
        try {
          // Use Puppeteer's network idle approach
          await this.page.waitForFunction(
            () => document.readyState === 'complete',
            { timeout: 45000 }
          );
          await this.page.waitForTimeout(3000); // Additional wait for dynamic content
        } catch (readyStateError) {
          console.log('⚠️ ReadyState wait failed, continuing anyway');
        }
        console.log('🔍 Page reached network idle state');
        
        // In CI or Fly.io environment, add extra waiting for dynamic content
        if (process.env.GITHUB_ACTIONS || process.env.FLY_APP_NAME) {
          const envType = process.env.GITHUB_ACTIONS ? 'CI' : 'Fly.io';
          console.log(`🔍 ${envType} environment detected, applying aggressive loading strategy...`);
          
          // Phase 1: Extended initial wait with longer timeouts for CI
          const baseWaitTime = process.env.FLY_APP_NAME ? 20000 : (process.env.GITHUB_ACTIONS ? 25000 : 15000);
          console.log(`⏳ Phase 1: Initial wait (${baseWaitTime}ms)`);
          await this.page.waitForTimeout(baseWaitTime);
          
          // Phase 2: Aggressive content triggering with multiple attempts
          for (let attempt = 1; attempt <= 4; attempt++) {
            console.log(`🔄 Phase 2: Content loading attempt ${attempt}/4`);
            
            try {
              await this.page.evaluate(() => {
                // Multiple scroll patterns to trigger lazy loading
                window.scrollTo(0, 0);
                window.scrollTo(0, document.body.scrollHeight);
                window.scrollTo(0, document.body.scrollHeight / 2);
                window.scrollTo(0, document.body.scrollHeight);
                
                // Simulate user interactions that might trigger content loading
                document.body.click();
                document.body.focus();
                
                // Dispatch various events that might trigger dynamic loading
                ['DOMContentLoaded', 'load', 'resize', 'scroll'].forEach(eventType => {
                  const event = new Event(eventType, { bubbles: true, cancelable: true });
                  document.dispatchEvent(event);
                  window.dispatchEvent(event);
                });
                
                // Force jQuery ready if available
                if (typeof window.jQuery !== 'undefined') {
                  window.jQuery(document).ready();
                  window.jQuery(document).trigger('ready');
                }
                
                // Trigger mouseover on all interactive elements
                const interactiveElements = document.querySelectorAll('a, button, [onclick], [data-toggle], .clickable');
                interactiveElements.forEach(el => {
                  el.dispatchEvent(new Event('mouseover', { bubbles: true }));
                  el.dispatchEvent(new Event('mouseenter', { bubbles: true }));
                });
              });
              
              await this.page.waitForTimeout(5000);
              
              // Quick check for table appearance
              const tableCheck = await this.page.$$('table');
              if (tableCheck.length > 0) {
                console.log(`✅ Tables detected after attempt ${attempt}`);
                break;
              }
              
            } catch (triggerError) {
              console.log(`⚠️ Content trigger attempt ${attempt} failed:`, triggerError.message);
            }
          }
          
          // Phase 3: Environment-specific additional interactions
          if (process.env.FLY_APP_NAME) {
            console.log('🔍 Fly.io specific optimizations...');
            await this.page.evaluate(() => {
              // Force trigger all possible event handlers
              const allElements = document.querySelectorAll('*');
              allElements.forEach(el => {
                ['focus', 'blur', 'click', 'mouseover', 'mouseout'].forEach(eventType => {
                  try {
                    el.dispatchEvent(new Event(eventType, { bubbles: true }));
                  } catch (e) { /* ignore */ }
                });
              });
            });
            await this.page.waitForTimeout(8000);
          }
          
          // Phase 4: Extended wait for AJAX and script completion
          console.log(`⏳ Phase 4: Waiting for script completion`);
          try {
            await this.page.waitForFunction(
              () => {
                const hasJQuery = typeof window.jQuery !== 'undefined';
                const domComplete = document.readyState === 'complete';
                const noActiveRequests = !window.jQuery || window.jQuery.active === 0;
                const hasImages = document.images.length === 0 || 
                  Array.from(document.images).every(img => img.complete);
                
                return domComplete && (!hasJQuery || noActiveRequests) && hasImages;
              },
              { 
                timeout: process.env.GITHUB_ACTIONS ? 60000 : 45000,
                polling: 3000
              }
            );
            console.log(`✅ ${envType} page fully loaded and scripts complete`);
          } catch (completionError) {
            console.log('⚠️ Script completion wait failed, continuing with timeout fallback');
            await this.page.waitForTimeout(15000);
          }
          
          // Phase 5: Final forced refresh for CI if still no content
          if (process.env.GITHUB_ACTIONS) {
            const finalCheck = await this.page.$$('table');
            if (finalCheck.length === 0) {
              console.log(`🔄 CI final attempt: Forced page refresh`);
              const currentUrl = this.page.url();
              await this.page.goto(currentUrl, { 
                waitUntil: 'networkidle2',
                timeout: 180000 
              });
              await this.page.waitForTimeout(30000);
            }
          }
          
          console.log(`🔍 ${envType} aggressive loading strategy complete`);
        }
        
        // Try multiple possible table selectors
        const possibleSelectors = [
          "table.reservation-list.secondary-list",
          "table.reservation-list", 
          "table.secondary-list",
          ".reservation-list table",
          "#upcoming-resv table",
          "table[class*='reservation']",
          "table[class*='list']",
          "table" // Last resort - any table
        ];
        
        let foundTable = false;
        let usedSelector = '';
        
        for (const selector of possibleSelectors) {
          try {
            console.log(`🔍 Trying selector: ${selector}`);
            await this.page.waitForSelector(selector, {
              timeout: selector === "table" ? 30000 : 5000,
              state: 'visible'
            });
            console.log(`✅ Found table with selector: ${selector}`);
            foundTable = true;
            usedSelector = selector;
            break;
          } catch (selectorError) {
            console.log(`❌ Selector ${selector} not found`);
            continue;
          }
        }
        
        if (!foundTable) {
          // Extra attempts for CI environment
          if (process.env.GITHUB_ACTIONS) {
            console.log('🔄 CI retry: Attempting page refresh and reload...');
            const currentUrl = this.page.url();
            await this.page.goto(currentUrl, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(15000);
            
            // Try to find any table again
            for (const selector of possibleSelectors) {
              try {
                await this.page.waitForSelector(selector, {
                  timeout: 10000,
                  state: 'visible'
                });
                console.log(`✅ Found table after refresh with selector: ${selector}`);
                foundTable = true;
                usedSelector = selector;
                break;
              } catch (retryError) {
                continue;
              }
            }
          }
          
          if (!foundTable) {
            throw new Error('No reservation table found with any known selector');
          }
        }
        
        console.log(`🔍 Reservation table is now visible using selector: ${usedSelector}`);
        
      } catch (error) {
        console.log('⚠️ Table wait failed, checking page state...');
        
        // Debug: Check what's actually on the page
        const currentUrl = this.page.url();
        console.log(`🔍 Current URL: ${currentUrl}`);
        
        // Check for any error messages on the page
        const errorElements = await this.page.$$('div.error, .alert-danger, .validation-summary-errors');
        if (errorElements.length > 0) {
          console.log('⚠️ Error elements found on page');
          for (const el of errorElements) {
            const text = await el.textContent();
            console.log(`🔍 Error text: ${text}`);
          }
        }
        
        // Check if we're still on login page
        if (currentUrl.includes('LogOn') || currentUrl.includes('login')) {
          console.log('❌ Still on login page - login may have failed');
          throw new Error('Login appears to have failed - still on login page');
        }
        
        // Enhanced debugging: Check all elements that might contain tables
        console.log('🔍 Enhanced debugging - checking all page structure...');
        const pageStructure = await this.page.evaluate(() => {
          const info = {
            allTables: [],
            upcomingDiv: null,
            bodyClasses: document.body?.className || 'no-body-class',
            pageTitle: document.title || 'no-title'
          };
          
          // Check all tables
          const tables = document.querySelectorAll('table');
          tables.forEach((table, i) => {
            info.allTables.push({
              index: i,
              id: table.id || 'no-id',
              className: table.className || 'no-class',
              hasRows: table.querySelectorAll('tr').length,
              parentClass: table.parentElement?.className || 'no-parent-class'
            });
          });
          
          // Check upcoming-resv div
          const upcomingDiv = document.querySelector('#upcoming-resv');
          if (upcomingDiv) {
            info.upcomingDiv = {
              found: true,
              className: upcomingDiv.className || 'no-class',
              childrenCount: upcomingDiv.children.length,
              innerText: upcomingDiv.innerText?.substring(0, 200) || 'no-text'
            };
          } else {
            info.upcomingDiv = { found: false };
          }
          
          return info;
        });
        
        console.log('🔍 Page structure analysis:', JSON.stringify(pageStructure, null, 2));
        
        // In CI environment, save debugging artifacts
        if (process.env.GITHUB_ACTIONS) {
          try {
            console.log('💾 Saving CI debugging artifacts...');
            
            // Save screenshot
            await this.page.screenshot({ path: 'ci-error-screenshot.png', fullPage: true });
            
            // Save page HTML
            const pageHTML = await this.page.content();
            require('fs').writeFileSync('ci-error-page.html', pageHTML);
            
            // Save console logs
            const consoleOutput = await this.page.evaluate(() => {
              return {
                url: window.location.href,
                readyState: document.readyState,
                scripts: Array.from(document.scripts).map(s => s.src || 'inline'),
                errors: window.console?.errors || []
              };
            });
            require('fs').writeFileSync('ci-error-debug.json', JSON.stringify(consoleOutput, null, 2));
            
            console.log('✅ CI debugging artifacts saved');
          } catch (debugError) {
            console.log('⚠️ Failed to save debugging artifacts:', debugError.message);
          }
        }
        
        // Check for loading indicators
        const loadingElements = await this.page.$$('.loading, .spinner, [data-loading="true"]');
        if (loadingElements.length > 0) {
          console.log('🔄 Loading indicators still present, waiting longer...');
          await this.page.waitForTimeout(15000);
          
          // Try all selectors again after waiting
          const retrySelectors = [
            "table.reservation-list.secondary-list",
            "table.reservation-list", 
            "table.secondary-list",
            ".reservation-list table",
            "#upcoming-resv table",
            "table[class*='reservation']",
            "table[class*='list']",
            "table"
          ];
          
          for (const selector of retrySelectors) {
            try {
              await this.page.waitForSelector(selector, {
                timeout: 10000,
                state: 'visible'
              });
              console.log(`✅ Found table after extended wait with selector: ${selector}`);
              return; // Success, exit the function
            } catch (retryError) {
              continue;
            }
          }
        }
        
        throw error;
      }

      // Load ALL reservations by clicking show more repeatedly
      let allReservations;
      if (process.env.FLY_APP_NAME) {
        allReservations = await this.robustBrowserOperation(() => this.loadAllReservations());
      } else {
        allReservations = await this.loadAllReservations();
      }

      // Get the next 7 days (excluding today)
      const next7Days = this.getNext7Days();

      const allResults = [];

      // Process each of the next 7 days
      for (const dateInfo of next7Days) {
        // Find reservations for this specific date
        const timeSlots = this.findTimeSlotsForDate(dateInfo, allReservations);

        allResults.push({
          ...timeSlots,
          checkedAt: new Date().toISOString(),
        });
      }

      // Generate comprehensive report
      console.log("\n========================================");
      console.log("=== AVAILABILITY REPORT ===");
      console.log("========================================");
      console.log(`Checked at: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}`);

      let totalAvailableSlots = 0;

      allResults.forEach((result) => {
        console.log(`\n--- ${result.date} ---`);
        console.log(`Available: ${result.available.length} slots`);

        if (result.available.length > 0) {
          console.log("  Available times:");
          result.available.forEach((slot) => console.log(`    ✅ ${slot}`));
          totalAvailableSlots += result.available.length;
        } else {
          console.log("  ❌ All slots are reserved");
        }
      });

      const results = {
        dates: allResults,
        totalAvailableSlots: totalAvailableSlots,
        checkedAt: new Date().toISOString(),
      };

      // Send email notification
      await this.sendEmailReport(results);

      return results;
    } catch (error) {
      console.error("Availability check failed:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async sendFallbackModeNotification() {
    try {
      // Check if Gmail SMTP is configured
      if (!config.gmailSmtpUser || !config.gmailSmtpPassword || !config.notificationEmail) {
        console.log("Email not configured - skipping fallback mode notification");
        return;
      }

      await this.emailService.initialize();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f39c12;">⚠️ Court Checker - Fallback Mode Active</h2>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f39c12;">
            <p><strong>Status:</strong> Chrome browser issues detected - using fallback mode</p>
            <p><strong>Issue:</strong> Browser initialization failed - using email monitoring only</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</p>
          </div>
          
          <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">✅ Service Status</h3>
            <p>The court booking system is still monitoring for email requests and will continue to operate normally. Only the automated availability checking is temporarily limited.</p>
          </div>
          
          <h3>What this means:</h3>
          <ul>
            <li>✅ Email booking requests are still processed</li>
            <li>✅ Manual triggers still work</li>
            <li>⚠️ Automated availability checking is limited</li>
            <li>💡 Consider using GitHub Actions for availability checks</li>
          </ul>
          
          <p><em>This is an automated notification from your court booking system.</em></p>
        </div>
      `;

      const result = await this.emailService.sendEmail({
        to: config.notificationEmail,
        subject: "⚠️ Court Checker - Fallback Mode Active",
        html: html,
      });

      if (result.success) {
        console.log("✅ Fallback mode notification sent successfully");
      } else {
        console.error("Failed to send notification:", result.error);
      }
    } catch (error) {
      console.error("Error sending fallback mode notification:", error);
    }
  }

  async sendResourceConstraintNotification() {
    try {
      // Check if Gmail SMTP is configured
      if (!config.gmailSmtpUser || !config.gmailSmtpPassword || !config.notificationEmail) {
        console.log("Email not configured - skipping resource constraint notification");
        return;
      }

      await this.emailService.initialize();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #e74c3c;">🚨 System Resource Constraint Detected</h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Issue:</strong> Chrome browser cannot launch due to system resource limits</p>
            <p><strong>Error:</strong> Resource temporarily unavailable (pthread_create/fork failures)</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</p>
          </div>
          
          <h3>Possible Solutions:</h3>
          <ul>
            <li>Restart the application</li>
            <li>Reduce concurrent processes</li>
            <li>Implement external scraping service</li>
            <li>Switch to GitHub Actions for availability checks</li>
          </ul>
          
          <p><em>This is an automated notification from your court booking system.</em></p>
        </div>
      `;

      const result = await this.emailService.sendEmail({
        to: config.notificationEmail,
        subject: "🚨 Court Checker - System Resource Constraint",
        html: html,
      });

      if (result.success) {
        console.log("✅ Resource constraint notification sent successfully");
      } else {
        console.error("Failed to send notification:", result.error);
      }
    } catch (error) {
      console.error("Error sending resource constraint notification:", error);
    }
  }

  async sendEmailReport(results) {
    try {
      // Check if email sending is enabled via configuration
      const shouldSendEmail = config.sendEmail;
      if (!shouldSendEmail) {
        console.log("📧 Email sending disabled for this run - data collected but no notification sent");
        return;
      }

      // Check if Gmail SMTP is configured
      if (!config.gmailSmtpUser || !config.gmailSmtpPassword) {
        console.log("Gmail SMTP not configured - skipping email notification");
        return;
      }

      if (!config.notificationEmail) {
        console.log("Notification email not configured - skipping email notification");
        return;
      }

      await this.emailService.initialize();

      const result = await this.emailService.sendEmail({
        to: config.notificationEmail,
        subject: "🏀 Avalon Court Availability 🏀",
        html: generateEmailHTML(results),
      });

      if (result.success) {
        console.log("✅ Email notification sent successfully");
      } else {
        console.error("Failed to send email:", result.error);
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  async cleanup() {
    try {
      console.log('🧹 Starting cleanup...');
      
      // Close page first
      if (this.page) {
        try {
          await this.page.close();
          console.log('✅ Page closed');
        } catch (pageError) {
          console.log('⚠️ Page close error:', pageError.message);
        }
        this.page = null;
      }
      
      // Close browser
      if (this.browser) {
        try {
          await this.browser.close();
          console.log('✅ Browser closed');
        } catch (browserError) {
          console.log('⚠️ Browser close error:', browserError.message);
        }
        this.browser = null;
      }
      
      // Fly.io-specific aggressive cleanup
      const isFlyio = process.env.FLY_APP_NAME || process.env.FLY_REGION || process.env.FLY_ALLOC_ID;
      
      if (isFlyio) {
        await this.forceProcessCleanup();
        console.log('✈️ Fly.io cleanup completed');
      }
      
    } catch (error) {
      console.error('⚠️ Error during cleanup:', error.message);
    }
  }
}

module.exports = ReservationChecker;
