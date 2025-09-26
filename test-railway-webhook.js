#!/usr/bin/env node

const config = require('./src/config');

async function testRailwayWebhook() {
  console.log('🚂 Testing Railway Webhook Configuration');
  console.log('=======================================');
  
  // Check if WEBHOOK_URL is configured
  console.log('\n📋 Railway Configuration Check:');
  console.log(`WEBHOOK_URL: ${config.webhookUrl || '❌ Missing'}`);
  
  if (!config.webhookUrl || config.webhookUrl.includes('localhost')) {
    console.log('❌ WEBHOOK_URL not configured for Railway. Please set it to your Railway deployment URL.');
    console.log('💡 Example: https://your-app-name.railway.app/gmail/webhook');
    return;
  }
  
  // Test webhook endpoints
  const baseUrl = config.webhookUrl.replace('/gmail/webhook', '');
  const endpoints = [
    { name: 'Health Check', url: `${baseUrl}/health`, method: 'GET' },
    { name: 'Root Endpoint', url: `${baseUrl}/`, method: 'GET' },
    { name: 'Manual Email Processing', url: `${baseUrl}/gmail/process-emails`, method: 'POST' },
    { name: 'Manual Availability Check', url: `${baseUrl}/gmail/check-availability`, method: 'POST' },
    { name: 'SMTP Test', url: `${baseUrl}/gmail/test-smtp`, method: 'POST' }
  ];
  
  console.log('\n🔍 Testing Railway Webhook Endpoints:');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing ${endpoint.name}...`);
      console.log(`   URL: ${endpoint.url}`);
      
      const startTime = Date.now();
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Court-Booker-Debug/1.0'
        },
        body: endpoint.method === 'POST' ? JSON.stringify({
          test: true,
          timestamp: new Date().toISOString()
        }) : undefined,
        timeout: 30000 // 30 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      const status = response.status;
      const statusText = response.statusText;
      
      console.log(`   Status: ${status} ${statusText} (${responseTime}ms)`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success:`, JSON.stringify(data, null, 2));
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error Response:`, errorText);
      }
      
    } catch (error) {
      console.log(`   ❌ Request Failed:`, error.message);
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💡 Connection refused - Railway app may not be running`);
      } else if (error.code === 'ENOTFOUND') {
        console.log(`   💡 Domain not found - check your Railway deployment URL`);
      } else if (error.name === 'AbortError') {
        console.log(`   💡 Request timeout - Railway app may be slow to respond`);
      }
    }
  }
  
  // Test Gmail Push Notification endpoint specifically
  console.log('\n📧 Testing Gmail Push Notification Endpoint:');
  try {
    const pushData = {
      message: {
        data: Buffer.from(JSON.stringify({
          emailAddress: config.gmailSmtpUser || 'test@example.com',
          historyId: Date.now()
        })).toString('base64'),
        messageId: 'test-message-' + Date.now(),
        publishTime: new Date().toISOString()
      }
    };
    
    console.log(`📡 Sending test push notification to: ${config.webhookUrl}`);
    
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GooglePubSub/1.0'
      },
      body: JSON.stringify(pushData),
      timeout: 30000
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Push notification processed successfully:`, data);
    } else {
      const errorText = await response.text();
      console.log(`❌ Push notification failed:`, errorText);
    }
    
  } catch (error) {
    console.log(`❌ Push notification test failed:`, error.message);
  }
}

async function testManualEmailTrigger() {
  console.log('\n\n📧 Testing Manual Email Trigger');
  console.log('================================');
  
  if (!config.webhookUrl || config.webhookUrl.includes('localhost')) {
    console.log('❌ Cannot test manual email trigger - WEBHOOK_URL not configured');
    return;
  }
  
  const baseUrl = config.webhookUrl.replace('/gmail/webhook', '');
  
  try {
    console.log('🔄 Triggering manual email processing...');
    
    const response = await fetch(`${baseUrl}/gmail/process-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        manual: true,
        requestedBy: 'debug-script',
        timestamp: new Date().toISOString()
      }),
      timeout: 60000 // 60 second timeout for email processing
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Manual email processing result:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Manual email processing failed:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Manual email trigger failed:', error.message);
  }
}

async function testSMTPConnection() {
  console.log('\n\n📧 Testing Railway SMTP Connection');
  console.log('==================================');
  
  if (!config.webhookUrl || config.webhookUrl.includes('localhost')) {
    console.log('❌ Cannot test SMTP - WEBHOOK_URL not configured');
    return;
  }
  
  const baseUrl = config.webhookUrl.replace('/gmail/webhook', '');
  
  try {
    console.log('🔄 Testing SMTP connection on Railway...');
    
    const response = await fetch(`${baseUrl}/gmail/test-smtp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sendTest: true,
        testEmail: config.notificationEmail || config.gmailSmtpUser
      }),
      timeout: 30000
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SMTP test result:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ SMTP test failed:', errorText);
    }
    
  } catch (error) {
    console.log('❌ SMTP test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testRailwayWebhook();
    await testManualEmailTrigger();
    await testSMTPConnection();
    console.log('\n✅ All Railway webhook tests completed!');
    
    console.log('\n💡 Next Steps:');
    console.log('1. If endpoints are not responding, check your Railway deployment');
    console.log('2. If SMTP tests fail, check Railway environment variables');
    console.log('3. If manual email processing works, try sending a "Check" email to test the full flow');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { testRailwayWebhook, testManualEmailTrigger, testSMTPConnection };