const puppeteer = require("puppeteer");
const EmailService = require("./emailService");
const config = require("../config");
const { generateEmailHTML } = require("../email-templates/availabilities");

const SIXTY_SECONDS = 60 * 1000;
const THIRTY_SECONDS = 30 * 1000;
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
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor"
        ],
        timeout: SIXTY_SECONDS,
      });

      this.page = await this.browser.newPage();

      this.page.setDefaultNavigationTimeout(SIXTY_SECONDS);
      this.page.setDefaultTimeout(THIRTY_SECONDS);
    } catch (error) {
      console.error("Failed to initialize browser: ", error);
      throw error;
    }
  }

  async login() {
    try {
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
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: "networkidle2" }),
        this.page.click(submitButton),
      ]);

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
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = ReservationChecker;
