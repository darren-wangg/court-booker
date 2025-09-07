const puppeteer = require("puppeteer");
const config = require('../config');

class BookingService {
  constructor(userId = null) {
    this.browser = null;
    this.page = null;
    this.user = config.getUser(userId);
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true, // Always use headless in production
        defaultViewport: null,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
          "--single-process",
          "--disable-xss-auditor",
        ],
        timeout: 60000,
      });

      this.page = await this.browser.newPage();
      this.page.setDefaultNavigationTimeout(60000);
      this.page.setDefaultTimeout(30000);
      
      console.log('✅ Booking service initialized');
    } catch (error) {
      console.error("Failed to initialize booking service: ", error);
      throw error;
    }
  }

  async login() {
    try {
      console.log('🔐 Logging into amenity system...');
      
      await this.page.goto(config.amenityUrl, { waitUntil: "networkidle2" });

      // Wait for login form
      await this.page.waitForSelector(
        'input[type="text"], input[name="email"], input[id*="email"]',
        { timeout: 10000 }
      );

      const emailSelector = await this.findEmailField();
      await this.page.type(emailSelector, this.user.email);

      const passwordSelector = await this.findPasswordField();
      await this.page.type(passwordSelector, this.user.password);

      const submitButton = await this.findSubmitButton();
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: "networkidle2" }),
        this.page.click(submitButton),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('✅ Successfully logged in');
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

  /**
   * Navigate to the booking page for a specific date
   */
  async navigateToBookingPage(targetDate) {
    try {
      console.log(`📅 Navigating to booking page for ${targetDate.toLocaleDateString()}`);
      
      // Wait for the reservation date input field
      await this.page.waitForSelector('#resv-date', { timeout: 10000 });
      
      // Click on the date input to open the calendar
      const dateInput = await this.page.$('#resv-date');
      await dateInput.click();
      
      // Wait for the calendar to appear
      await this.page.waitForSelector('#ui-datepicker-div', { timeout: 5000 });
      await this.page.waitForSelector('.ui-datepicker-calendar', { timeout: 5000 });
      
      // Extract the target date components
      const targetDay = targetDate.getDate();
      const targetMonth = targetDate.getMonth(); // 0-based (0 = January)
      const targetYear = targetDate.getFullYear();
      
      console.log(`Looking for date: ${targetMonth + 1}/${targetDay}/${targetYear}`);
      console.log(`Target date object:`, targetDate);
      console.log(`Target date ISO string:`, targetDate.toISOString());
      
      // Find and click the correct date cell in the calendar
      const dateFound = await this.page.evaluate((day, month, year) => {
        const cells = document.querySelectorAll('.ui-datepicker-calendar td[data-handler="selectDay"]');
        
        console.log(`Looking for: day=${day}, month=${month}, year=${year}`);
        console.log(`Found ${cells.length} date cells in calendar`);
        
        for (const cell of cells) {
          const cellMonth = parseInt(cell.getAttribute('data-month'));
          const cellYear = parseInt(cell.getAttribute('data-year'));
          const cellDay = parseInt(cell.querySelector('a').textContent);
          
          console.log(`Calendar cell: ${cellMonth + 1}/${cellDay}/${cellYear}`);
          
          // Note: data-month is 0-based, so we need to add 1 to compare with targetMonth
          if (cellMonth === month && cellYear === year && cellDay === day) {
            console.log(`Found matching date! Clicking...`);
            cell.click();
            return true;
          }
        }
        return false;
      }, targetDay, targetMonth, targetYear);
      
      if (!dateFound) {
        throw new Error(`Date ${targetMonth + 1}/${targetDay}/${targetYear} not found in calendar`);
      }
      
      // Wait for calendar to close
      await this.page.waitForTimeout(1000);
      
      console.log('✅ Date selected successfully');
      return true;
    } catch (error) {
      console.error('Error navigating to booking page:', error);
      throw error;
    }
  }

  /**
   * Select start and end times from dropdowns
   */
  async selectTimeSlot(targetTime) {
    try {
      console.log(`⏰ Setting time slot: ${targetTime.formatted}`);
      
      // Wait for time dropdowns to load
      await this.page.waitForTimeout(2000);
      
      // Wait for start time dropdown
      await this.page.waitForSelector('#SelStartTime', { timeout: 10000 });
      await this.page.waitForSelector('#SelEndTime', { timeout: 10000 });
      
      // Convert 24-hour format to 12-hour format for dropdown selection
      const startTime12Hour = this.convertTo12HourFormat(targetTime.startHour);
      const endTime12Hour = this.convertTo12HourFormat(targetTime.endHour);
      
      console.log(`Setting start time: ${startTime12Hour}`);
      console.log(`Setting end time: ${endTime12Hour}`);
      
      // Select start time
      await this.page.select('#SelStartTime', startTime12Hour);
      await this.page.waitForTimeout(500);
      
      // Select end time
      await this.page.select('#SelEndTime', endTime12Hour);
      await this.page.waitForTimeout(500);
      
      console.log('✅ Time slot selected successfully');
      return true;
    } catch (error) {
      console.error('Error selecting time slot:', error);
      throw error;
    }
  }

  /**
   * Convert 24-hour format to 12-hour format for dropdown selection
   */
  convertTo12HourFormat(hour24) {
    if (hour24 === 0) return '12:00 AM';
    if (hour24 < 12) return `${hour24}:00 AM`;
    if (hour24 === 12) return '12:00 PM';
    return `${hour24 - 12}:00 PM`;
  }

  /**
   * Complete the booking process
   */
  async completeBooking() {
    try {
      console.log('📝 Completing booking...');
      
      // Wait for the submit button
      await this.page.waitForSelector('#submit-new-reservation', { timeout: 10000 });
      
      // Click the submit button
      const submitButton = await this.page.$('#submit-new-reservation');
      if (!submitButton) {
        throw new Error('Submit button not found');
      }
      
      console.log('Clicking submit button...');
      await submitButton.click();
      
      // Wait for page to process the booking
      await this.page.waitForTimeout(3000);
      
      // Check for success message or confirmation
      const successSelectors = [
        '.success-message',
        '.booking-confirmed',
        '.alert-success',
        'text*="confirmed"',
        'text*="success"',
        'text*="reserved"'
      ];

      let successMessage = null;
      for (const selector of successSelectors) {
        try {
          successMessage = await this.page.$(selector);
          if (successMessage) {
            const message = await this.page.evaluate(el => el.textContent, successMessage);
            console.log(`✅ Booking confirmed: ${message}`);
            return { success: true, message };
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // If no specific success message found, check if we're still on the booking page
      const stillOnBookingPage = await this.page.$('#submit-new-reservation');
      if (!stillOnBookingPage) {
        console.log('✅ Booking completed (redirected away from booking page)');
        return { success: true, message: 'Booking completed successfully' };
      }

      return { success: true, message: 'Booking completed (no confirmation message found)' };
    } catch (error) {
      console.error('Error completing booking:', error);
      throw error;
    }
  }

  /**
   * Main booking method
   */
  async bookTimeSlot(bookingRequest) {
    try {
      console.log(`🏀 Starting booking process for ${bookingRequest.formatted.date} at ${bookingRequest.formatted.time}`);
      
      await this.initialize();
      await this.login();
      await this.navigateToBookingPage(bookingRequest.date);
      await this.selectTimeSlot(bookingRequest.time);
      const result = await this.completeBooking();
      
      return {
        success: true,
        bookingRequest,
        result
      };
    } catch (error) {
      console.error('Booking failed:', error);
      return {
        success: false,
        bookingRequest,
        error: error.message
      };
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = BookingService;