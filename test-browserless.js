#!/usr/bin/env node

/**
 * Test script for Browserless.io cloud browser integration
 */

require('dotenv').config();
const ReservationChecker = require('./src/services/reservationChecker');

async function testBrowserlessIntegration() {
  console.log('🧪 Testing Browserless.io cloud browser integration...');
  
  // Check for token
  if (!process.env.BROWSERLESS_TOKEN) {
    console.error('❌ BROWSERLESS_TOKEN environment variable not set');
    console.log('💡 Add BROWSERLESS_TOKEN=your_token to your .env file');
    process.exit(1);
  }
  
  console.log('✅ Browserless.io token found');
  
  let checker;
  try {
    console.log('🔄 Initializing ReservationChecker with cloud browser...');
    checker = new ReservationChecker();
    await checker.initialize();
    
    console.log('🔄 Testing basic browser navigation...');
    await checker.page.goto('https://example.com');
    
    const title = await checker.page.evaluate(() => document.title);
    console.log(`✅ Successfully navigated to page with title: "${title}"`);
    
    console.log('🔄 Testing court booking website access...');
    await checker.page.goto('https://www.avalonaccess.com');
    
    const avalonTitle = await checker.page.evaluate(() => document.title);
    console.log(`✅ Successfully accessed court booking site: "${avalonTitle}"`);
    
    console.log('🎉 Browserless.io integration test PASSED!');
    console.log('🚀 Ready to deploy to Fly.io');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Common issues:');
    console.log('   - Invalid or expired token');
    console.log('   - Network connectivity issues');
    console.log('   - Rate limit exceeded (free tier)');
  } finally {
    if (checker) {
      await checker.cleanup();
    }
  }
}

// Run test if called directly
if (require.main === module) {
  testBrowserlessIntegration().catch(console.error);
}

module.exports = testBrowserlessIntegration;