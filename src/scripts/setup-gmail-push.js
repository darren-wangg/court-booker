#!/usr/bin/env node

require('dotenv').config();
const GmailPushService = require('../services/gmailPushService');

async function setupGmailPush() {
  console.log('🔔 Setting up Gmail Push Notifications for Court Booker');
  console.log('=====================================================');
  
  try {
    // Validate required environment variables
    const requiredVars = [
      'GMAIL_CLIENT_ID',
      'GMAIL_CLIENT_SECRET', 
      'GMAIL_REFRESH_TOKEN',
      'GMAIL_PROJECT_ID',
      'GMAIL_TOPIC_NAME',
      'WEBHOOK_URL'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\nPlease add these to your .env file and try again.');
      process.exit(1);
    }

    const webhookUrl = process.env.WEBHOOK_URL;
    console.log(`🔗 Webhook URL: ${webhookUrl}`);
    
    // Initialize Gmail Push Service
    const pushService = new GmailPushService();
    await pushService.initialize();
    
    // Check current status
    const status = await pushService.getWatchStatus();
    console.log(`📧 Gmail Account: ${status.email}`);
    console.log(`🔔 Watch Active: ${status.watchActive ? 'Yes' : 'No'}`);
    
    if (status.watchActive && status.watchExpiration) {
      console.log(`⏰ Watch Expires: ${status.watchExpiration}`);
      
      // Check if watch expires soon (within 24 hours)
      const hoursUntilExpiry = (status.watchExpiration - new Date()) / (1000 * 60 * 60);
      if (hoursUntilExpiry < 24) {
        console.log('⚠️ Watch expires soon - refreshing...');
        await pushService.refreshWatchRequest(webhookUrl);
      } else {
        console.log('✅ Watch is still active and valid');
      }
    } else {
      // Set up new watch
      console.log('🔔 Setting up new Gmail push notifications...');
      await pushService.setupPushNotifications(webhookUrl);
    }
    
    console.log('\n✅ Gmail Push Notifications setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Start your webhook server: node src/scripts/start-webhook.js');
    console.log('2. Test by sending a booking request email');
    console.log('3. Check the webhook logs for processing');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    
    if (error.message.includes('insufficient authentication')) {
      console.error('\n💡 Try running: pnpm run setup-gmail');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Setup interrupted');
  process.exit(0);
});

setupGmailPush();
