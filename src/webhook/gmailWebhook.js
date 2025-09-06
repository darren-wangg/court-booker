const express = require('express');
const EmailBookingHandler = require('../emailBookingHandler');
const config = require('../config');

class GmailWebhook {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.bookingHandler = new EmailBookingHandler();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));
    
    // Logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Court Booker Gmail Webhook'
      });
    });

    // Gmail push notification endpoint
    this.app.post('/gmail/webhook', async (req, res) => {
      try {
        console.log('📧 Received Gmail push notification');
        
        // Verify the request is from Gmail (basic validation)
        if (!this.isValidGmailRequest(req)) {
          console.log('⚠️ Invalid Gmail request - ignoring');
          return res.status(400).json({ error: 'Invalid request' });
        }

        // Process the notification
        await this.processGmailNotification(req.body);
        
        res.status(200).json({ status: 'processed' });
      } catch (error) {
        console.error('❌ Error processing Gmail notification:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Manual booking check endpoint (for testing)
    this.app.post('/gmail/check-bookings', async (req, res) => {
      try {
        console.log('🔍 Manual booking check requested');
        
        await this.bookingHandler.initialize();
        const results = await this.bookingHandler.checkAndProcessBookings();
        
        res.json({
          status: 'completed',
          processed: results.length,
          results: results
        });
      } catch (error) {
        console.error('❌ Error in manual booking check:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Manual availability check endpoint (for manual triggers)
    this.app.post('/gmail/check-availability', async (req, res) => {
      try {
        console.log('🔍 Manual availability check requested');
        
        const ReservationChecker = require('../services/reservationChecker');
        const EmailService = require('../services/emailService');
        const { generateEmailHTML } = require('../email-templates/availabilities');
        
        // Get user ID from request body or use first user
        const userId = req.body.userId || null;
        const user = config.getUser(userId);
        
        if (!user) {
          return res.status(400).json({ 
            error: 'No user configuration found',
            availableUsers: config.users.map(u => ({ id: u.id, email: u.email }))
          });
        }
        
        console.log(`🔍 Running availability check for user: ${user.email}`);
        
        // Initialize services
        const checker = new ReservationChecker(userId);
        const emailService = new EmailService();
        await emailService.initialize();
        
        // Run availability check
        const result = await checker.checkAvailability();
        
        if (result && result.totalAvailableSlots > 0) {
          console.log(`✅ Found ${result.totalAvailableSlots} available slots`);
          
          // Send email notification
          const emailHTML = generateEmailHTML(result);
          const emailResult = await emailService.sendEmail({
            to: user.notificationEmail,
            subject: `🏀 Avalon Court Availability - ${result.totalAvailableSlots} slots available`,
            html: emailHTML
          });
          
          res.json({
            status: 'completed',
            totalAvailableSlots: result.totalAvailableSlots,
            dates: result.dates.length,
            emailSent: emailResult.success,
            user: user.email
          });
        } else {
          console.log('⚠️ No available time slots found');
          res.json({
            status: 'completed',
            totalAvailableSlots: 0,
            dates: 0,
            emailSent: false,
            user: user.email,
            message: 'No available slots found'
          });
        }
        
      } catch (error) {
        console.error('❌ Error in manual availability check:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }

  isValidGmailRequest(req) {
    // Basic validation - in production, you'd want to verify the signature
    // For now, we'll just check if it looks like a Gmail notification
    return req.body && (
      req.body.message || 
      req.body.data || 
      req.headers['user-agent']?.includes('Google')
    );
  }

  async processGmailNotification(notification) {
    try {
      console.log('🔄 Processing Gmail notification...');
      
      // Initialize booking handler if not already done
      if (!this.bookingHandler.initialized) {
        await this.bookingHandler.initialize();
      }

      // Check for new booking requests
      const results = await this.bookingHandler.checkAndProcessBookings();
      
      if (results.length > 0) {
        console.log(`✅ Processed ${results.length} booking request(s) from Gmail notification`);
        results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.success ? '✅ Success' : '❌ Failed'}: ${result.bookingRequest?.formatted?.date || 'Unknown'}`);
        });
      } else {
        console.log('📭 No new booking requests found');
      }
      
    } catch (error) {
      console.error('❌ Error processing Gmail notification:', error);
      throw error;
    }
  }

  async start() {
    try {
      await this.bookingHandler.initialize();
      console.log('✅ Booking handler initialized');
      
      this.app.listen(this.port, () => {
        console.log(`🚀 Gmail Webhook server running on port ${this.port}`);
        console.log(`📧 Webhook endpoint: http://localhost:${this.port}/gmail/webhook`);
        console.log(`🔍 Manual check endpoint: http://localhost:${this.port}/gmail/check-bookings`);
        console.log(`❤️ Health check: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      console.error('❌ Failed to start webhook server:', error);
      throw error;
    }
  }

  async stop() {
    console.log('🛑 Stopping Gmail webhook server...');
    process.exit(0);
  }
}

module.exports = GmailWebhook;
