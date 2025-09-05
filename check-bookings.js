#!/usr/bin/env node

require('dotenv').config();
const EmailBookingHandler = require('./src/emailBookingHandler');

async function main() {
  console.log('🏀 Starting Avalon Court Booking Handler...');
  console.log('=====================================');
  
  try {
    const handler = new EmailBookingHandler();
    const results = await handler.run();
    
    if (results.length === 0) {
      console.log('✅ No booking requests to process');
    } else {
      console.log(`✅ Processed ${results.length} booking request(s)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Booking handler failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down booking handler...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down booking handler...');
  process.exit(0);
});

main();
