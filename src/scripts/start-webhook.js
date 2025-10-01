#!/usr/bin/env node

require('dotenv').config();
const GmailWebhook = require('../webhook/gmailWebhook');

async function startWebhook() {
  console.log('🚀 Starting Court Booker Gmail Webhook Server');
  console.log('==============================================');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${process.env.PORT || '3000'}`);
  console.log(`📧 Webhook URL: ${process.env.WEBHOOK_URL || 'http://localhost:3000'}`);
  console.log(`🚂 Railway Environment: ${process.env.RAILWAY_ENVIRONMENT || 'false'}`);
  
  try {
    // Validate required environment variables
    const requiredVars = [
      'GMAIL_CLIENT_ID',
      'GMAIL_CLIENT_SECRET', 
      'GMAIL_REFRESH_TOKEN',
      'GMAIL_SMTP_USER',
      'GMAIL_SMTP_PASSWORD',
      'NOTIFICATION_EMAIL'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\nPlease add these to your .env file and try again.');
      process.exit(1);
    }

    // Create and start webhook server
    const webhook = new GmailWebhook();
    await webhook.start();
    
    console.log('\n✅ Webhook server is running and ready to process booking requests!');
    console.log('\n📧 To test:');
    console.log('1. Reply to an availability email with a booking request');
    console.log('2. Check the logs above for processing status');
    console.log('3. You should receive a confirmation email');
    
    // Keep the process alive
    console.log('\n🔄 Server is running... Press Ctrl+C to stop');
    console.log('🔄 Process will stay alive until manually terminated');
    
    // Prevent the process from exiting - this is critical for Railway
    process.stdin.resume();
    
    // Add a keep-alive mechanism
    const keepAliveInterval = setInterval(() => {
      console.log('💓 Process keep-alive - still running');
      console.log(`💓 Memory usage: ${JSON.stringify(process.memoryUsage())}`);
      console.log(`💓 Uptime: ${process.uptime()} seconds`);
    }, 60000); // Every minute
    
    // Store the webhook instance to prevent garbage collection
    global.webhook = webhook;
    global.keepAliveInterval = keepAliveInterval;
    
    // Add a more aggressive keep-alive for Railway
    const railwayKeepAlive = setInterval(() => {
      // This ensures the event loop stays active
      if (global.webhook && global.webhook.server) {
        console.log('💓 Railway keep-alive - server is active');
      }
    }, 10000); // Every 10 seconds
    
    global.railwayKeepAlive = railwayKeepAlive;
    
  } catch (error) {
    console.error('❌ Failed to start webhook server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT - Shutting down webhook server...');
  if (global.webhook) {
    await global.webhook.stop();
  }
  if (global.keepAliveInterval) {
    clearInterval(global.keepAliveInterval);
  }
  if (global.railwayKeepAlive) {
    clearInterval(global.railwayKeepAlive);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM - Shutting down webhook server...');
  console.log('🛑 SIGTERM received - this usually means Railway is terminating the process');
  if (global.webhook) {
    await global.webhook.stop();
  }
  if (global.keepAliveInterval) {
    clearInterval(global.keepAliveInterval);
  }
  if (global.railwayKeepAlive) {
    clearInterval(global.railwayKeepAlive);
  }
  process.exit(0);
});

// Prevent the process from exiting unexpectedly
process.on('exit', (code) => {
  console.log(`\n🛑 Process exiting with code: ${code}`);
});

process.on('beforeExit', (code) => {
  console.log(`\n⚠️ Process about to exit with code: ${code}`);
  // Don't let it exit unless it's intentional
});

startWebhook();
