#!/usr/bin/env node

require('dotenv').config();
const GmailWebhook = require('../webhook/gmailWebhook');

async function startWebhook() {
  console.log('🚀 Starting Court Booker Gmail Webhook Server');
  console.log('==============================================');
  
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
    
    // Prevent the process from exiting
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start webhook server:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down webhook server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down webhook server...');
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
