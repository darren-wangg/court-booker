#!/usr/bin/env node

require('dotenv').config();
const EmailBookingHandler = require('../emailBookingHandler');

async function pollEmails() {
  console.log('📧 Polling for new emails...');
  console.log('============================');
  
  try {
    const bookingHandler = new EmailBookingHandler();
    await bookingHandler.initialize();
    
    console.log('🔍 Checking for new emails...');
    const results = await bookingHandler.checkAndProcessBookings();
    
    if (results.length > 0) {
      console.log(`✅ Processed ${results.length} email(s):`);
      results.forEach((result, index) => {
        console.log(`${index + 1}. Type: ${result.type}, Success: ${result.success}`);
        if (result.type === 'manual_trigger') {
          console.log(`   User: ${result.user}, Slots: ${result.totalAvailableSlots || 'N/A'}`);
        }
      });
    } else {
      console.log('📭 No new emails to process');
    }
    
  } catch (error) {
    console.error('❌ Polling failed:', error.message);
  }
  
  process.exit(0);
}

pollEmails();
