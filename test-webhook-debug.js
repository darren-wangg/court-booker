#!/usr/bin/env node

/**
 * Comprehensive webhook debugging script
 * Tests each component of the email→availability check flow
 */

require('dotenv').config();

async function testWebhookComponents() {
  console.log('🚀 Starting Comprehensive Webhook Debug Tests');
  console.log('================================================\n');

  const results = {
    flyioConnectivity: false,
    gmailApiAuth: false,
    emailParsing: false,
    availabilityCheck: false,
    emailSending: false
  };

  // Test 1: Fly.io Webhook Connectivity
  console.log('📡 Test 1: Fly.io Webhook Connectivity');
  console.log('--------------------------------------');
  try {
    const webhookUrl = process.env.WEBHOOK_URL || 'https://court-booker-production.up.railway.app';
    console.log(`Testing: ${webhookUrl}/health`);
    
    const response = await fetch(`${webhookUrl}/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook server is reachable');
      console.log(`   Status: ${data.status}`);
      console.log(`   Uptime: ${data.uptime}s`);
      results.flyioConnectivity = true;
    } else {
      console.log('❌ Webhook server responded with error:', response.status);
    }
  } catch (error) {
    console.log('❌ Webhook server is unreachable:', error.message);
  }

  // Test 2: Gmail API Authentication
  console.log('\n📧 Test 2: Gmail API Authentication');
  console.log('-----------------------------------');
  try {
    const EmailParser = require('./src/emailParser');
    const parser = new EmailParser();
    
    console.log('Initializing Gmail API...');
    await parser.initialize();
    
    console.log('Testing Gmail API with recent emails...');
    const emails = await parser.getRecentEmails(5);
    
    console.log(`✅ Gmail API authenticated successfully`);
    console.log(`   Found ${emails.length} recent emails`);
    results.gmailApiAuth = true;
  } catch (error) {
    console.log('❌ Gmail API authentication failed:', error.message);
  }

  // Test 3: Email Parsing for Manual Triggers
  console.log('\n🔍 Test 3: Email Parsing for Manual Triggers');
  console.log('--------------------------------------------');
  try {
    const EmailParser = require('./src/emailParser');
    const parser = new EmailParser();
    await parser.initialize();
    
    const { bookingRequests, manualTriggers } = await parser.checkForBookingRequests();
    
    console.log(`✅ Email parsing completed`);
    console.log(`   Manual triggers: ${manualTriggers.length}`);
    console.log(`   Booking requests: ${bookingRequests.length}`);
    
    if (manualTriggers.length > 0) {
      console.log('   Recent manual triggers:');
      manualTriggers.forEach((trigger, i) => {
        console.log(`     ${i+1}. Subject: "${trigger.email.subject}"`);
        console.log(`        From: ${trigger.email.from}`);
        console.log(`        User: ${trigger.user.email}`);
      });
    }
    
    results.emailParsing = true;
  } catch (error) {
    console.log('❌ Email parsing failed:', error.message);
  }

  // Test 4: Availability Check
  console.log('\n🏀 Test 4: Availability Check');
  console.log('-----------------------------');
  try {
    const ReservationChecker = require('./src/services/reservationChecker');
    const config = require('./src/config');
    
    const user = config.getUser(); // Get first user
    console.log(`Testing availability check for user: ${user.email}`);
    
    const checker = new ReservationChecker(user.id);
    const result = await checker.checkAvailability();
    
    if (result) {
      console.log('✅ Availability check completed successfully');
      console.log(`   Total available slots: ${result.totalAvailableSlots}`);
      console.log(`   Dates processed: ${result.dates.length}`);
      results.availabilityCheck = true;
    } else {
      console.log('⚠️ Availability check returned no results');
    }
  } catch (error) {
    console.log('❌ Availability check failed:', error.message);
  }

  // Test 5: Email Sending
  console.log('\n📨 Test 5: Email Sending (SMTP)');
  console.log('-------------------------------');
  try {
    const EmailService = require('./src/services/emailService');
    const config = require('./src/config');
    
    const user = config.getUser(); // Get first user
    const emailService = new EmailService();
    
    console.log('Initializing SMTP service...');
    await emailService.initialize();
    
    console.log(`Sending test email to: ${user.notificationEmail}`);
    const emailResult = await emailService.sendEmail({
      to: user.notificationEmail,
      subject: '🧪 Webhook Debug Test Email',
      html: `
        <h2>🧪 Webhook Debug Test</h2>
        <p>This is a test email from your court booking system.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Purpose:</strong> Verify SMTP configuration and email sending</p>
        <p>If you received this email, your SMTP setup is working correctly! 🎉</p>
      `
    });
    
    if (emailResult.success) {
      console.log('✅ Test email sent successfully');
      console.log(`   Message ID: ${emailResult.messageId}`);
      results.emailSending = true;
    } else {
      console.log('❌ Test email failed:', emailResult.error);
    }
  } catch (error) {
    console.log('❌ Email sending failed:', error.message);
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All systems working! Your webhook should be functional.');
    console.log('\n📝 To test the full flow:');
    console.log('1. Send an email with subject "Check" to courtbooker824@gmail.com');
    console.log('2. Wait 1-2 minutes for Gmail push notification');
    console.log('3. Check your notification email for availability results');
  } else {
    console.log('\n⚠️  Some components failed. Focus on fixing the failing tests first.');
    
    // Specific recommendations
    if (!results.flyioConnectivity) {
      console.log('\n🔧 Fix Fly.io connectivity:');
      console.log('   - Check if your Fly.io app is deployed and running');
      console.log('   - Verify WEBHOOK_URL environment variable');
      console.log('   - Check Fly.io app logs: flyctl logs');
    }
    
    if (!results.gmailApiAuth) {
      console.log('\n🔧 Fix Gmail API authentication:');
      console.log('   - Verify GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
      console.log('   - Run: node src/scripts/setup-gmail-auth.js');
    }
    
    if (!results.availabilityCheck) {
      console.log('\n🔧 Fix availability check:');
      console.log('   - This may be a browser/Puppeteer issue in your environment');
      console.log('   - Try running: node src/scripts/check-now.js');
    }
    
    if (!results.emailSending) {
      console.log('\n🔧 Fix email sending:');
      console.log('   - Verify GMAIL_SMTP_USER and GMAIL_SMTP_PASSWORD');
      console.log('   - Check if 2FA is enabled and app password is correct');
    }
  }

  console.log('\n🔍 Next Steps for Live Testing:');
  console.log('1. Test manual webhook trigger:');
  console.log(`   curl -X POST ${process.env.WEBHOOK_URL}/gmail/process-emails`);
  console.log('2. Test manual availability check:');
  console.log(`   curl -X POST ${process.env.WEBHOOK_URL}/gmail/check-availability`);
  console.log('3. Monitor Fly.io logs while testing:');
  console.log('   flyctl logs --app court-booker-production');
}

// Run the tests
testWebhookComponents().catch(error => {
  console.error('❌ Debug test failed:', error);
  process.exit(1);
});