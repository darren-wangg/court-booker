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
      console.log('❤️ Health check requested');
      const healthData = { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Court Booker Gmail Webhook',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        port: this.port,
        serverRunning: !!this.server
      };
      console.log('❤️ Health check response:', healthData);
      res.status(200).json(healthData);
    });
    
    // Root endpoint for Railway
    this.app.get('/', (req, res) => {
      res.status(200).json({
        message: 'Court Booker Gmail Webhook Server',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    // Gmail push notification endpoint
    this.app.post('/gmail/webhook', async (req, res) => {
      try {
        console.log('📧 Received Gmail push notification');
        console.log('📧 Request body:', JSON.stringify(req.body, null, 2));
        console.log('📧 Request headers:', JSON.stringify(req.headers, null, 2));
        
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
    
    // Debug endpoint to test webhook connectivity
    this.app.get('/gmail/webhook', (req, res) => {
      console.log('🔍 Webhook endpoint accessed via GET');
      res.json({ 
        message: 'Gmail webhook endpoint is accessible',
        timestamp: new Date().toISOString(),
        method: 'GET'
      });
    });

    // Manual booking check endpoint (for testing)
    this.app.post('/gmail/check-bookings', async (req, res) => {
      try {
        console.log('🔍 Manual booking check requested');
        
        if (!this.bookingHandler.initialized) {
          try {
            await this.bookingHandler.initialize();
          } catch (error) {
            console.error('❌ Failed to initialize booking handler:', error);
            return res.status(500).json({ error: 'Failed to initialize booking handler', details: error.message });
          }
        }
        
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

    // Polling endpoint for email checking (backup to push notifications)
    this.app.post('/gmail/poll', async (req, res) => {
      try {
        console.log('📧 Manual email polling requested');
        
        if (!this.bookingHandler.initialized) {
          try {
            await this.bookingHandler.initialize();
          } catch (error) {
            console.error('❌ Failed to initialize booking handler:', error);
            return res.status(500).json({ error: 'Failed to initialize booking handler', details: error.message });
          }
        }
        
        const results = await this.bookingHandler.checkAndProcessBookings();
        
        res.json({
          status: 'completed',
          processed: results.length,
          results: results
        });
      } catch (error) {
        console.error('❌ Error in email polling:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
      }
    });

    // Clear processed emails endpoint (for testing)
    this.app.post('/gmail/clear-processed', async (req, res) => {
      try {
        console.log('🧹 Clearing processed emails for testing');
        
        if (!this.bookingHandler.initialized) {
          try {
            await this.bookingHandler.initialize();
          } catch (error) {
            console.error('❌ Failed to initialize booking handler:', error);
            return res.status(500).json({ error: 'Failed to initialize booking handler', details: error.message });
          }
        }
        
        // Clear the processed emails set
        this.bookingHandler.emailParser.processedEmails.clear();
        console.log('✅ Processed emails cleared');
        
        res.json({
          status: 'completed',
          message: 'Processed emails cleared successfully'
        });
      } catch (error) {
        console.error('❌ Error clearing processed emails:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
      }
    });

    // Manual email processing endpoint (for testing without push notifications)
    this.app.post('/gmail/process-emails', async (req, res) => {
      try {
        console.log('📧 Manual email processing requested');
        
        if (!this.bookingHandler.initialized) {
          try {
            await this.bookingHandler.initialize();
          } catch (error) {
            console.error('❌ Failed to initialize booking handler:', error);
            return res.status(500).json({ error: 'Failed to initialize booking handler', details: error.message });
          }
        }
        
        const results = await this.bookingHandler.checkAndProcessBookings();
        
        res.json({
          status: 'completed',
          processed: results.length,
          results: results
        });
      } catch (error) {
        console.error('❌ Error in manual email processing:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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
        
        // Try to initialize email service, but don't fail the entire check if it fails
        let emailServiceReady = false;
        try {
          await emailService.initialize();
          emailServiceReady = true;
        } catch (error) {
          console.error('⚠️ Email service initialization failed, availability check will continue without email notifications:', error.message);
        }
        
        // Run availability check
        const result = await checker.checkAvailability();
        
        if (result && result.totalAvailableSlots > 0) {
          console.log(`✅ Found ${result.totalAvailableSlots} available slots`);
          
          // Send email notification only if email service is ready
          let emailResult = { success: false, error: 'Email service not available' };
          if (emailServiceReady) {
            try {
              const emailHTML = generateEmailHTML(result);
              emailResult = await emailService.sendEmail({
                to: user.notificationEmail,
                subject: `🏀 Avalon Court Availability - ${result.totalAvailableSlots} slots available`,
                html: emailHTML
              });
            } catch (error) {
              console.error('❌ Failed to send email notification:', error.message);
              emailResult = { success: false, error: error.message };
            }
          } else {
            console.log('⚠️ Skipping email notification due to email service unavailability');
          }
          
          res.json({
            status: 'completed',
            totalAvailableSlots: result.totalAvailableSlots,
            dates: result.dates.length,
            emailSent: emailResult.success,
            emailError: emailResult.error,
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
        try {
          await this.bookingHandler.initialize();
        } catch (error) {
          console.error('❌ Failed to initialize booking handler:', error);
          return; // Exit early if initialization fails
        }
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
      console.log('🔄 Initializing booking handler...');
      await this.bookingHandler.initialize();
      console.log('✅ Booking handler initialized');
      
      console.log(`🔄 Starting server on port ${this.port}...`);
      
      // Store the server instance to prevent it from being garbage collected
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.log(`🚀 Gmail Webhook server running on port ${this.port}`);
        console.log(`📧 Webhook endpoint: http://0.0.0.0:${this.port}/gmail/webhook`);
        console.log(`🔍 Manual check endpoint: http://0.0.0.0:${this.port}/gmail/check-bookings`);
        console.log(`❤️ Health check: http://0.0.0.0:${this.port}/health`);
        console.log('✅ Server startup completed successfully');
        console.log('✅ Server is now listening for requests');
      });
      
      // Add error handling for the server
      this.server.on('error', (error) => {
        console.error('❌ Server error:', error);
      });

      // Add error handlers to prevent crashes
      this.app.on('error', (error) => {
        console.error('❌ Express app error:', error);
      });

      process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        // Don't exit, just log the error
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        // Don't exit, just log the error
      });

      // Keep the process alive
      setInterval(() => {
        console.log('💓 Heartbeat - Server is alive');
        console.log(`💓 Server status: ${this.server ? 'running' : 'stopped'}`);
      }, 30000); // Every 30 seconds
      
      // Additional keep-alive mechanism
      this.keepAliveInterval = setInterval(() => {
        // This ensures the event loop stays active
        if (this.server) {
          // Server is still running
        }
      }, 1000);
      
      // Railway-specific health monitoring
      this.railwayHealthInterval = setInterval(() => {
        console.log('💓 Railway health check - process is active');
        // This helps Railway detect that the process is healthy
      }, 15000); // Every 15 seconds
      
    } catch (error) {
      console.error('❌ Failed to start webhook server:', error);
      throw error;
    }
  }

  async stop() {
    console.log('🛑 Stopping Gmail webhook server...');
    
    // Clean up intervals
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    if (this.railwayHealthInterval) {
      clearInterval(this.railwayHealthInterval);
    }
    
    // Close the server properly
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

module.exports = GmailWebhook;
