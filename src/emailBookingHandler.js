const EmailParser = require('./emailParser');
const BookingService = require('./services/bookingService');
const EmailService = require('./services/emailService');

class EmailBookingHandler {
  constructor() {
    this.emailParser = new EmailParser(); // No userId needed - processes all users
    this.emailService = new EmailService();
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
      console.log('🔍 Checking for new booking requests and manual triggers...');
      
      const { bookingRequests, manualTriggers } = await this.emailParser.checkForBookingRequests();
      
      const results = [];
      
      // Process manual triggers first
      if (manualTriggers.length > 0) {
        console.log(`🔔 Found ${manualTriggers.length} manual trigger(s)`);
        
        for (const trigger of manualTriggers) {
          try {
            console.log(`🔄 Processing manual trigger for ${trigger.user.email}`);
            
            // Trigger availability check via webhook endpoint
            const response = await fetch(`${process.env.WEBHOOK_URL || 'http://localhost:3000'}/gmail/check-availability`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: trigger.user.id
              })
            });
            
            const result = await response.json();
            
            if (response.ok) {
              console.log(`✅ Manual trigger processed for ${trigger.user.email}: ${result.totalAvailableSlots} slots found`);
              results.push({
                type: 'manual_trigger',
                success: true,
                user: trigger.user.email,
                totalAvailableSlots: result.totalAvailableSlots,
                emailSent: result.emailSent
              });
            } else {
              console.error(`❌ Manual trigger failed for ${trigger.user.email}:`, result.error);
              results.push({
                type: 'manual_trigger',
                success: false,
                user: trigger.user.email,
                error: result.error
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
