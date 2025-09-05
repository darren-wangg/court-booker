const { Resend } = require('resend');
const EmailParser = require('./emailParser');
const BookingService = require('./services/bookingService');
const config = require('./config');
const { generateBookingConfirmationHTML, generateBookingErrorHTML } = require('./email-templates/booking');

class EmailBookingHandler {
  constructor() {
    this.emailParser = new EmailParser();
    this.bookingService = new BookingService();
    this.resend = new Resend(config.resendApiKey);
  }

  async initialize() {
    try {
      await this.emailParser.initialize();
      console.log('✅ Email booking handler initialized');
    } catch (error) {
      console.error('Failed to initialize email booking handler:', error);
      throw error;
    }
  }

  /**
   * Send confirmation email after successful booking
   */
  async sendConfirmationEmail(bookingResult) {
    try {
      if (!config.resendApiKey || !config.notificationEmail) {
        console.log('Email not configured - skipping confirmation email');
        return;
      }

      const { bookingRequest, result } = bookingResult;
      
      const subject = `✅ Court Booking Confirmed - ${bookingRequest.formatted.date}`;
      const html = generateBookingConfirmationHTML(bookingResult);

      const { data, error } = await this.resend.emails.send({
        from: "court booker <onboarding@resend.dev>",
        to: [config.notificationEmail],
        subject: subject,
        html: html,
      });

      if (error) {
        console.error("Failed to send confirmation email:", error);
      } else {
        console.log("✅ Confirmation email sent successfully:", data);
      }
    } catch (error) {
      console.error("Error sending confirmation email:", error);
    }
  }

  /**
   * Send error notification email
   */
  async sendErrorEmail(bookingRequest, error) {
    try {
      if (!config.resendApiKey || !config.notificationEmail) {
        console.log('Email not configured - skipping error email');
        return;
      }

      const subject = `❌ Court Booking Failed - ${bookingRequest.formatted.date}`;
      const html = generateBookingErrorHTML(bookingRequest, error);

      const { data, error: emailError } = await this.resend.emails.send({
        from: "court booker <onboarding@resend.dev>",
        to: [config.notificationEmail],
        subject: subject,
        html: html,
      });

      if (emailError) {
        console.error("Failed to send error email:", emailError);
      } else {
        console.log("✅ Error email sent successfully:", data);
      }
    } catch (error) {
      console.error("Error sending error email:", error);
    }
  }

  /**
   * Process a single booking request
   */
  async processBookingRequest(bookingRequest) {
    try {
      console.log(`🔄 Processing booking request: ${bookingRequest.formatted.date} at ${bookingRequest.formatted.time}`);
      
      const bookingResult = await this.bookingService.bookTimeSlot(bookingRequest.booking);
      
      if (bookingResult.success) {
        console.log('✅ Booking successful!');
        await this.sendConfirmationEmail(bookingResult);
      } else {
        console.log('❌ Booking failed:', bookingResult.error);
        await this.sendErrorEmail(bookingRequest.booking, bookingResult.error);
      }
      
      return bookingResult;
    } catch (error) {
      console.error('Error processing booking request:', error);
      await this.sendErrorEmail(bookingRequest.booking, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for and process new booking requests
   */
  async checkAndProcessBookings() {
    try {
      console.log('🔍 Checking for new booking requests...');
      
      const bookingRequests = await this.emailParser.checkForBookingRequests();
      
      if (bookingRequests.length === 0) {
        console.log('📭 No new booking requests found');
        return [];
      }
      
      console.log(`📧 Found ${bookingRequests.length} booking request(s)`);
      
      const results = [];
      for (const request of bookingRequests) {
        const result = await this.processBookingRequest(request);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error checking and processing bookings:', error);
      throw error;
    }
  }

  /**
   * Run the booking handler (for scheduled execution)
   */
  async run() {
    try {
      await this.initialize();
      const results = await this.checkAndProcessBookings();
      
      console.log(`\n📊 Booking Handler Summary:`);
      console.log(`Processed: ${results.length} request(s)`);
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.success ? '✅ Success' : '❌ Failed'}: ${result.bookingRequest?.formatted?.date || 'Unknown'}`);
      });
      
      return results;
    } catch (error) {
      console.error('Booking handler failed:', error);
      throw error;
    }
  }
}

module.exports = EmailBookingHandler;
