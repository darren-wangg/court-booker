#!/usr/bin/env node

/**
 * Comprehensive debugging tool for Fly.io webhook system
 * Tests each component of the webhook monitoring for "Check" emails
 */

const axios = require('axios');

class FlyioWebhookDebugger {
  constructor() {
    this.webhookUrl = process.env.WEBHOOK_URL || 'https://court-booker-production.up.railway.app';
    this.testResults = [];
  }

  log(message, data = null) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  error(message, error = null) {
    console.error(`[${new Date().toISOString()}] ❌ ${message}`);
    if (error) {
      console.error(error.message);
      if (error.response?.data) {
        console.error('Response data:', error.response.data);
      }
    }
  }

  addResult(test, status, message, details = null) {
    const result = { test, status, message, timestamp: new Date().toISOString() };
    if (details) result.details = details;
    this.testResults.push(result);
    
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    this.log(`${emoji} ${test}: ${message}`);
    if (details) {
      this.log('Details:', details);
    }
  }

  async testHealthEndpoint() {
    try {
      this.log('🔍 Testing health endpoint...');
      const response = await axios.get(`${this.webhookUrl}/health`, {
        timeout: 10000,
        headers: { 'User-Agent': 'FlyioWebhookDebugger/1.0' }
      });

      if (response.status === 200) {
        this.addResult(
          'Health Check', 
          'pass', 
          'Server is responding',
          {
            status: response.status,
            data: response.data,
            headers: {
              'content-type': response.headers['content-type'],
              'server': response.headers['server']
            }
          }
        );
      } else {
        this.addResult('Health Check', 'fail', `Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      this.addResult('Health Check', 'fail', 'Health endpoint unreachable', {
        error: error.message,
        code: error.code,
        status: error.response?.status
      });
    }
  }

  async testWebhookEndpoint() {
    try {
      this.log('🔍 Testing Gmail webhook endpoint...');
      
      // Test GET request first (should return info)
      const getResponse = await axios.get(`${this.webhookUrl}/gmail/webhook`, {
        timeout: 10000,
        headers: { 'User-Agent': 'FlyioWebhookDebugger/1.0' }
      });

      if (getResponse.status === 200) {
        this.addResult(
          'Webhook GET', 
          'pass', 
          'Webhook endpoint accessible',
          { data: getResponse.data }
        );
      } else {
        this.addResult('Webhook GET', 'fail', `Unexpected GET status: ${getResponse.status}`);
      }

      // Test POST request (simulating Gmail notification)
      const mockGmailNotification = {
        message: {
          data: Buffer.from(JSON.stringify({
            emailAddress: 'courtbooker824@gmail.com',
            historyId: '123456'
          })).toString('base64')
        }
      };

      const postResponse = await axios.post(`${this.webhookUrl}/gmail/webhook`, mockGmailNotification, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'APIs-Google; (+https://developers.google.com/webmasters/APIs-Google.html)'
        }
      });

      if (postResponse.status === 200) {
        this.addResult(
          'Webhook POST', 
          'pass', 
          'Mock Gmail notification processed',
          { data: postResponse.data }
        );
      } else {
        this.addResult('Webhook POST', 'fail', `Unexpected POST status: ${postResponse.status}`);
      }

    } catch (error) {
      this.addResult('Webhook Endpoint', 'fail', 'Webhook endpoint test failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  async testGmailAPIConnection() {
    try {
      this.log('🔍 Testing Gmail API connection via webhook...');
      
      const response = await axios.post(`${this.webhookUrl}/gmail/check-bookings`, {}, {
        timeout: 60000,
        headers: { 'User-Agent': 'FlyioWebhookDebugger/1.0' }
      });

      if (response.status === 200) {
        this.addResult(
          'Gmail API', 
          'pass', 
          'Gmail API accessible',
          {
            processed: response.data.processed,
            results: response.data.results
          }
        );
      } else {
        this.addResult('Gmail API', 'fail', `Gmail API test failed: ${response.status}`);
      }

    } catch (error) {
      this.addResult('Gmail API', 'fail', 'Gmail API connection failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  async testAvailabilityCheck() {
    try {
      this.log('🔍 Testing availability check via webhook...');
      
      const response = await axios.post(`${this.webhookUrl}/gmail/check-availability`, {}, {
        timeout: 180000, // 3 minutes for browser automation
        headers: { 'User-Agent': 'FlyioWebhookDebugger/1.0' }
      });

      if (response.status === 200) {
        const data = response.data;
        if (data.totalAvailableSlots !== undefined) {
          this.addResult(
            'Availability Check', 
            'pass', 
            `Found ${data.totalAvailableSlots} available slots`,
            {
              totalAvailableSlots: data.totalAvailableSlots,
              dates: data.dates,
              emailSent: data.emailSent,
              user: data.user,
              dataQualityIssue: data.dataQualityIssue
            }
          );
        } else {
          this.addResult('Availability Check', 'fail', 'Unexpected response format', { data });
        }
      } else {
        this.addResult('Availability Check', 'fail', `Availability check failed: ${response.status}`);
      }

    } catch (error) {
      this.addResult('Availability Check', 'fail', 'Availability check failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  async testSMTPConnection() {
    try {
      this.log('🔍 Testing SMTP connection via webhook...');
      
      const response = await axios.post(`${this.webhookUrl}/gmail/test-smtp`, {
        sendTest: false // Don't send actual test email
      }, {
        timeout: 30000,
        headers: { 'User-Agent': 'FlyioWebhookDebugger/1.0' }
      });

      if (response.status === 200) {
        const data = response.data;
        if (data.smtpInitialized) {
          this.addResult(
            'SMTP Connection', 
            'pass', 
            'SMTP service initialized successfully',
            { status: data.status, message: data.message }
          );
        } else {
          this.addResult(
            'SMTP Connection', 
            'fail', 
            'SMTP initialization failed',
            { error: data.error, details: data.details }
          );
        }
      } else {
        this.addResult('SMTP Connection', 'fail', `SMTP test failed: ${response.status}`);
      }

    } catch (error) {
      this.addResult('SMTP Connection', 'fail', 'SMTP connection test failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  async testEmailProcessing() {
    try {
      this.log('🔍 Testing email processing pipeline...');
      
      // First clear processed emails
      await axios.post(`${this.webhookUrl}/gmail/clear-processed`, {}, {
        timeout: 10000,
        headers: { 'User-Agent': 'FlyioWebhookDebugger/1.0' }
      });

      this.log('📧 Cleared processed emails cache');

      // Now test email processing
      const response = await axios.post(`${this.webhookUrl}/gmail/process-emails`, {}, {
        timeout: 60000,
        headers: { 'User-Agent': 'FlyioWebhookDebugger/1.0' }
      });

      if (response.status === 200) {
        this.addResult(
          'Email Processing', 
          'pass', 
          `Processed ${response.data.processed} emails`,
          {
            processed: response.data.processed,
            results: response.data.results
          }
        );
      } else {
        this.addResult('Email Processing', 'fail', `Email processing failed: ${response.status}`);
      }

    } catch (error) {
      this.addResult('Email Processing', 'fail', 'Email processing pipeline failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  async testGmailPushNotificationSetup() {
    try {
      this.log('🔍 Testing Gmail Push Notification setup...');
      
      // Check if environment variables are set
      const requiredEnvVars = [
        'GMAIL_PROJECT_ID',
        'GMAIL_TOPIC_NAME', 
        'WEBHOOK_URL',
        'GMAIL_CLIENT_ID',
        'GMAIL_CLIENT_SECRET',
        'GMAIL_REFRESH_TOKEN'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        this.addResult(
          'Push Notification Setup',
          'fail',
          'Missing required environment variables',
          { missingVariables: missingVars }
        );
      } else {
        this.addResult(
          'Push Notification Setup',
          'pass',
          'All required environment variables are set',
          { 
            projectId: process.env.GMAIL_PROJECT_ID,
            topicName: process.env.GMAIL_TOPIC_NAME,
            webhookUrl: process.env.WEBHOOK_URL
          }
        );
      }

    } catch (error) {
      this.addResult('Push Notification Setup', 'fail', 'Setup check failed', {
        error: error.message
      });
    }
  }

  async runFullDiagnostics() {
    this.log('🚀 Starting comprehensive Fly.io webhook diagnostics...');
    this.log(`🔗 Webhook URL: ${this.webhookUrl}`);
    this.log('');

    const tests = [
      () => this.testGmailPushNotificationSetup(),
      () => this.testHealthEndpoint(),
      () => this.testWebhookEndpoint(),
      () => this.testSMTPConnection(),
      () => this.testGmailAPIConnection(),
      () => this.testEmailProcessing(),
      () => this.testAvailabilityCheck()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        this.error('Test execution failed', error);
      }
      this.log(''); // Empty line between tests
    }

    this.printSummary();
  }

  printSummary() {
    this.log('📊 DIAGNOSTIC SUMMARY');
    this.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const result of this.testResults) {
      const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      this.log(`${emoji} ${result.test}: ${result.message}`);
      
      if (result.status === 'pass') passed++;
      else if (result.status === 'fail') failed++;
      else warnings++;
    }

    this.log('');
    this.log(`📈 Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
    
    if (failed === 0) {
      this.log('🎉 All critical systems operational!');
      this.log('✅ Your Fly.io webhook monitoring should be working correctly');
    } else {
      this.log('⚠️ Issues detected that may prevent webhook monitoring from working');
      this.log('🔧 Check the failed tests above for troubleshooting guidance');
    }

    this.log('');
    this.log('🔍 TROUBLESHOOTING TIPS:');
    this.log('1. If Gmail API fails: Check your GMAIL_* environment variables');
    this.log('2. If SMTP fails: Verify GMAIL_SMTP_* credentials and app password');
    this.log('3. If availability check fails: Browser automation may have issues on Fly.io');
    this.log('4. If webhook is unreachable: Check Fly.io app deployment and logs');
    this.log('5. For push notifications: Verify Google Cloud Pub/Sub topic and subscription setup');
  }
}

async function main() {
  const webhookDebugger = new FlyioWebhookDebugger();
  
  try {
    await webhookDebugger.runFullDiagnostics();
  } catch (error) {
    console.error('❌ Diagnostic run failed:', error);
    process.exit(1);
  }
}

// Run diagnostics if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = FlyioWebhookDebugger;