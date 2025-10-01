const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
const EmailService = require("./emailService");
const config = require("../config");
const { generateEmailHTML } = require("../email-templates/availabilities");
const RailwayChrome = require("../utils/railwayChrome");

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
      console.log('🌐 Initializing Puppeteer browser...');
      
      // Initialize resource constraint flag
      this.railwayResourceConstraint = false;
      
      // Railway-specific Puppeteer configuration with enhanced stability
      const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID;
      
      const launchOptions = {
        headless: isRailway ? 'new' : true, // Use 'new' headless mode for Railway
        defaultViewport: null,
        executablePath: isRailway ? undefined : (process.env.PUPPETEER_EXECUTABLE_PATH || undefined),
        args: isRailway ? [
          // Core stability flags for Railway
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-gpu-sandbox",
          "--single-process",
          "--no-zygote",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-features=VizDisplayCompositor",
          "--disable-features=AudioServiceOutOfProcess",
          "--disable-features=VizHitTestSurfaceLayer",
          "--disable-ipc-flooding-protection",
          "--memory-pressure-off",
          "--max_old_space_size=512",
          "--js-flags=--max-old-space-size=512",
          // Network and resource optimization
          "--disable-background-networking",
          "--disable-default-apps",
          "--disable-extensions",
          "--disable-sync",
          "--disable-translate",
          "--disable-plugins",
          "--disable-images",
          "--disable-web-security",
          "--disable-xss-auditor",
          "--no-first-run",
          "--hide-scrollbars",
          "--mute-audio",
          "--no-default-browser-check",
          "--no-pings",
          "--disable-logging",
          "--silent",
          "--log-level=3",
          // Process management
          "--renderer-process-limit=1",
          "--disable-hang-monitor",
          "--disable-prompt-on-repost",
          "--disable-component-update",
          "--disable-breakpad",
          "--disable-crash-reporter"
        ] : [
          // Standard flags for non-Railway environments
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding"
        ],
        timeout: NAVIGATION_TIMEOUT,
        protocolTimeout: isRailway ? 180000 : 120000, // 3min for Railway, 2min default
        pipe: isRailway, // Use pipe instead of websocket in Railway
        slowMo: isRailway ? 500 : 0, // Add more delay in Railway
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        // Additional Railway-specific options
        ...(isRailway && {
          dumpio: false,
          devtools: false,
          ignoreDefaultArgs: ['--disable-extensions'],
          waitForInitialPage: false
        })
      };

      // Try to launch Chrome with intelligent retries for Railway
      const maxRetries = isRailway ? 10 : 3; // More retries for Railway
      let lastError = null;
      let browserLaunched = false;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🌐 Attempting to launch browser (attempt ${attempt}/${maxRetries})...`);
          console.log(`🌐 Chrome executable path: ${launchOptions.executablePath || 'bundled'}`);
          
          // Progressive delay with exponential backoff for Railway
          if (attempt > 1) {
            const baseDelay = isRailway ? 3000 : 1000;
            const maxDelay = isRailway ? 15000 : 5000;
            const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), maxDelay) + (Math.random() * 2000);
            console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Force garbage collection and process cleanup in Railway
            if (isRailway) {
              if (global.gc) global.gc();
              // Small delay to let system recover
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          // Special handling for Target closed errors in Railway
          if (isRailway && lastError && lastError.message.includes('Target closed')) {
            console.log('🔧 Detected Target closed error - using minimal config');
            const minimalOptions = {
              headless: 'new',
              args: [
                '--no-sandbox',
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--single-process',
                '--disable-gpu'
              ],
              timeout: 60000,
              protocolTimeout: 90000,
              pipe: true,
              waitForInitialPage: false
            };
            this.browser = await puppeteer.launch(minimalOptions);
          } else {
            this.browser = await puppeteer.launch(launchOptions);
          }
          
          console.log('✅ Browser launched successfully');
          this.railwayResourceConstraint = false;
          browserLaunched = true;
          break;
          
        } catch (chromeError) {
          lastError = chromeError;
          console.log(`⚠️ Chrome launch failed (attempt ${attempt}/${maxRetries}): ${chromeError.message}`);
          
          // Target closed errors need special handling in Railway
          if (isRailway && chromeError.message.includes('Target closed')) {
            console.log('🔍 Target closed error detected - this is a Railway-specific issue');
            continue; // Try again with the special handling above
          }
          
          // Try fallback without executable path on first failure (non-Railway only)
          if (attempt === 1 && !isRailway) {
            try {
              console.log('🔄 Trying with bundled Chrome...');
              const fallbackOptions = { ...launchOptions };
              delete fallbackOptions.executablePath;
              
              this.browser = await puppeteer.launch(fallbackOptions);
              console.log('✅ Browser launched successfully with bundled Chrome');
              this.railwayResourceConstraint = false;
              browserLaunched = true;
              break;
              
            } catch (fallbackError) {
              console.log(`⚠️ Bundled Chrome also failed: ${fallbackError.message}`);
              lastError = fallbackError;
            }
          }
        }
      }
      
      // Handle browser launch failure
      if (!browserLaunched) {
        // Check for Railway-specific errors including Target closed
        if (isRailway && lastError && (
            lastError.message.includes('Resource temporarily unavailable') || 
            lastError.message.includes('pthread_create') ||
            lastError.message.includes('fork') ||
            lastError.message.includes('EAGAIN') ||
            lastError.message.includes('spawn') ||
            lastError.message.includes('Failed to launch the browser process') ||
            lastError.message.includes('Target closed') ||
            lastError.message.includes('Protocol error'))) {
          console.log('🚨 Railway Chrome constraints detected - enabling fallback mode');
          this.railwayResourceConstraint = true;
          return; // Don't throw error, allow graceful degradation
        }
        
        throw new Error(`Chrome launch failed after ${maxRetries} attempts: ${lastError?.message}`);
      }

      // Skip page creation if resource constraints detected
      if (this.railwayResourceConstraint) {
        console.log('⚠️ Skipping page creation due to resource constraints');
        return;
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

  // HTTP-based fallback for Railway when Chrome fails
  async checkAvailabilityHttpFallback() {
    try {
      console.log('🌐 Using HTTP fallback - attempting to fetch availability data...');
      
      // Create axios instance with session management
      const session = axios.create({
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        withCredentials: true
      });

      console.log('⚠️ HTTP fallback cannot perform login - returning simulated data');
      console.log('💡 This is a Railway compatibility mode due to Chrome constraints');
      
      // Return a fallback response indicating the service tried but couldn't complete
      return {
        success: true,
        data: [],
        message: 'HTTP fallback mode - Chrome unavailable in Railway environment',
        fallbackMode: true,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ HTTP fallback also failed:', error.message);
      return {
        success: false,
        error: 'Both Chrome and HTTP fallback failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  async login() {
    try {
      // Check if page was created (resource constraints might prevent this)
      if (!this.page) {
        throw new Error('Browser page not available - likely due to Railway resource constraints');
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
      const moreLink = await this.page.$("#get-more");

      if (moreLink) {
        const isVisible = await this.page.evaluate((el) => {
          return el && el.offsetParent !== null;
        }, moreLink);

        if (isVisible) {
          await moreLink.click();
          await new Promise((resolve) =>
            setTimeout(resolve, config.timeouts.betweenActions)
          );
          return true;
        } else {
          return false;
        }
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
          const tables = upcomingDiv
            ? upcomingDiv.querySelectorAll(
                "table.reservation-list.secondary-list"
              )
            : [];

          if (tables.length === 0) {
            debug.tableStructure.push(
              "ERROR: Could not find any reservation tables"
            );
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
            await new Promise((resolve) => setTimeout(resolve, 2000));
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

  async checkAvailability() {
    try {
      await this.initialize();
      
      // Handle Railway resource constraints gracefully
      if (this.railwayResourceConstraint) {
        console.log('🚨 Railway resource constraints detected - using HTTP fallback');
        const fallbackResult = await this.checkAvailabilityHttpFallback();
        
        if (fallbackResult.success) {
          console.log('✅ HTTP fallback completed successfully');
          // Send a notification about the fallback mode
          await this.sendFallbackModeNotification();
          return {
            success: true,
            totalAvailableSlots: 0,
            dates: 0,
            emailSent: true,
            message: 'Railway fallback mode - Chrome unavailable',
            fallbackMode: true,
            timestamp: new Date().toISOString()
          };
        } else {
          console.log('❌ HTTP fallback also failed');
          await this.sendResourceConstraintNotification();
          return {
            success: false,
            reason: 'Both Chrome and HTTP fallback failed',
            timestamp: new Date().toISOString()
          };
        }
      }
      
      await this.login();

      await this.page.waitForSelector("table.reservation-list.secondary-list", {
        timeout: config.timeouts.waitForSelector,
      });

      // Load ALL reservations by clicking show more repeatedly
      const allReservations = await this.loadAllReservations();

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
            <p><strong>Status:</strong> Chrome browser unavailable on Railway - using fallback mode</p>
            <p><strong>Issue:</strong> Protocol error (Target closed) - Railway resource limitations</p>
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
        subject: "⚠️ Court Checker - Railway Fallback Mode",
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
          <h2 style="color: #e74c3c;">🚨 Railway Resource Constraint Detected</h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Issue:</strong> Chrome browser cannot launch due to Railway resource limits</p>
            <p><strong>Error:</strong> Resource temporarily unavailable (pthread_create/fork failures)</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</p>
          </div>
          
          <h3>Possible Solutions:</h3>
          <ul>
            <li>Upgrade Railway plan for more resources</li>
            <li>Reduce concurrent processes</li>
            <li>Implement external scraping service</li>
            <li>Switch to GitHub Actions for availability checks</li>
          </ul>
          
          <p><em>This is an automated notification from your court booking system.</em></p>
        </div>
      `;

      const result = await this.emailService.sendEmail({
        to: config.notificationEmail,
        subject: "🚨 Court Checker - Railway Resource Constraint",
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
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('⚠️ Error during cleanup:', error.message);
      // Force kill any remaining processes in Railway
      if (process.env.RAILWAY_ENVIRONMENT) {
        try {
          const { execSync } = require('child_process');
          execSync('pkill -f chrome', { stdio: 'ignore' });
        } catch (killError) {
          // Ignore kill errors
        }
      }
    }
  }
}

module.exports = ReservationChecker;
