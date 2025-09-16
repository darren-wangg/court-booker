const EmailParser = require('./emailParser');
const BookingService = require('./services/bookingService');
const EmailService = require('./services/emailService');

class EmailBookingHandler {
  constructor() {
    this.emailParser = new EmailParser(); // No userId needed - processes all users
    this.emailService = new EmailService();
    this.initialized = false;
  }

  async initialize() {
    try {
      await this.emailParser.initialize();
      this.initialized = true;
      console.log('✅ Email booking handler initialized');
    } catch (error) {
      console.error('Failed to initialize email booking handler:', error);
      // Don't throw the error - let the server start even if email parsing fails
      console.log('⚠️ Continuing without email parsing functionality');
      this.initialized = false;
    }
  }

  /**
   * Process a single booking request
   */
  async processBookingRequest(bookingRequest) {
    try {
      const user = bookingRequest.user;
      console.log(`🔄 Processing booking request for ${user.email}: ${bookingRequest.booking.formatted.date} at ${bookingRequest.booking.formatted.time}`);
      
      // Create a booking service instance for this specific user
      const bookingService = new BookingService(user.id);
      await bookingService.initialize();
      
      const bookingResult = await bookingService.bookTimeSlot(bookingRequest.booking);
      
      if (bookingResult.success) {
        console.log(`✅ Booking successful for ${user.email}!`);
      } else {
        console.log(`❌ Booking failed for ${user.email}:`, bookingResult.error);
      }
      
      await bookingService.cleanup();
      return bookingResult;
    } catch (error) {
      console.error('Error processing booking request:', error);
      console.log(`❌ Booking failed for ${bookingRequest.user.email}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for and process new booking requests and manual triggers
   */
  async checkAndProcessBookings() {
    try {
      if (!this.initialized) {
        console.log('⚠️ Email booking handler not initialized - skipping email processing');
        return [];
      }
      
      console.log('🔍 Checking for new booking requests and manual triggers...');
      
      const { bookingRequests, manualTriggers } = await this.emailParser.checkForBookingRequests();
      
      console.log(`📊 Found ${bookingRequests.length} booking requests and ${manualTriggers.length} manual triggers`);
      
      const results = [];
      
      // Process manual triggers first
      if (manualTriggers.length > 0) {
        console.log(`🔔 Found ${manualTriggers.length} manual trigger(s)`);
        
        for (const trigger of manualTriggers) {
          try {
            console.log(`🔄 Processing manual trigger for ${trigger.user.email}`);
            
            // Run availability check directly instead of via HTTP request
            const ReservationChecker = require('./services/reservationChecker');
            const EmailService = require('./services/emailService');
            const { generateEmailHTML } = require('./email-templates/availabilities');
            
            // Initialize services
            console.log('🔧 Creating ReservationChecker...');
            const checker = new ReservationChecker(trigger.user.id);
            console.log('🔧 Creating EmailService...');
            const emailService = new EmailService();
            
            // Try to initialize email service, but don't fail the entire check if it fails
            let emailServiceReady = false;
            try {
              console.log('🔧 Initializing email service...');
              await emailService.initialize();
              emailServiceReady = true;
              console.log('✅ Email service ready');
            } catch (error) {
              console.error('⚠️ Email service initialization failed, availability check will continue without email notifications:', error.message);
            }
            
            // Run availability check
            console.log('🔍 Running availability check...');
            const result = await checker.checkAvailability();
            console.log('🔍 Availability check completed:', result ? 'Success' : 'Failed');
            
            if (result && result.totalAvailableSlots > 0) {
              console.log(`✅ Found ${result.totalAvailableSlots} available slots`);
              
              // Send email notification only if email service is ready
              let emailResult = { success: false, error: 'Email service not available' };
              if (emailServiceReady) {
                try {
                  console.log('📧 Generating email HTML...');
                  const emailHTML = generateEmailHTML(result);
                  console.log('📧 Sending availability email to:', trigger.user.notificationEmail);
                  emailResult = await emailService.sendEmail({
                    to: trigger.user.notificationEmail,
                    subject: `🏀 Avalon Court Availability - ${result.totalAvailableSlots} slots available`,
                    html: emailHTML
                  });
                  console.log('📧 Email send result:', emailResult);
                } catch (error) {
                  console.error('❌ Failed to send email notification:', error.message);
                  emailResult = { success: false, error: error.message };
                }
              } else {
                console.log('⚠️ Skipping email notification due to email service unavailability');
              }
              
              results.push({
                type: 'manual_trigger',
                success: true,
                user: trigger.user.email,
                totalAvailableSlots: result.totalAvailableSlots,
                emailSent: emailResult.success
              });
            } else {
              console.log('⚠️ No available time slots found');
              results.push({
                type: 'manual_trigger',
                success: true,
                user: trigger.user.email,
                totalAvailableSlots: 0,
                emailSent: false,
                message: 'No available slots found'
              });
            }
          } catch (error) {
            console.error(`❌ Error processing manual trigger for ${trigger.user.email}:`, error);
            results.push({
              type: 'manual_trigger',
              success: false,
              user: trigger.user.email,
              error: error.message
            });
          }
        }
      }
      
      // Process booking requests
      if (bookingRequests.length > 0) {
        console.log(`📧 Found ${bookingRequests.length} booking request(s)`);
        
        for (const request of bookingRequests) {
          const result = await this.processBookingRequest(request);
          results.push({
            type: 'booking_request',
            ...result
          });
        }
      }
      
      if (results.length === 0) {
        console.log('📭 No new booking requests or manual triggers found');
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
