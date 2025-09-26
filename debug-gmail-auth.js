const { google } = require('googleapis');
const config = require('./src/config');

async function testGmailAPI() {
  console.log('🔐 Testing Gmail API Authentication');
  console.log('==================================');
  
  // Check configuration
  console.log('\n📋 Gmail API Configuration Check:');
  console.log(`GMAIL_CLIENT_ID: ${config.gmailClientId ? '✅ Set' : '❌ Missing'}`);
  console.log(`GMAIL_CLIENT_SECRET: ${config.gmailClientSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`GMAIL_REFRESH_TOKEN: ${config.gmailRefreshToken ? '✅ Set' : '❌ Missing'}`);
  console.log(`GMAIL_REDIRECT_URI: ${config.gmailRedirectUri || '❌ Missing'}`);
  
  if (!config.gmailClientId || !config.gmailClientSecret || !config.gmailRefreshToken) {
    console.log('\n❌ Missing required Gmail API credentials. Please check your .env file.');
    return;
  }
  
  try {
    // Initialize OAuth2 client
    console.log('\n🔧 Initializing OAuth2 client...');
    const oauth2Client = new google.auth.OAuth2(
      config.gmailClientId,
      config.gmailClientSecret,
      config.gmailRedirectUri
    );
    
    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: config.gmailRefreshToken
    });
    
    // Initialize Gmail API
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    console.log('✅ Gmail API client initialized');
    
    // Test authentication by getting user profile
    console.log('\n📧 Testing Gmail API access...');
    const profile = await gmail.users.getProfile({ userId: 'me' });
    console.log(`✅ Gmail API access successful!`);
    console.log(`📬 Email: ${profile.data.emailAddress}`);
    console.log(`📊 Total messages: ${profile.data.messagesTotal}`);
    
    // Test listing recent messages
    console.log('\n📬 Testing message listing...');
    const messages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
      q: 'from:' + profile.data.emailAddress + ' OR to:' + profile.data.emailAddress
    });
    
    console.log(`✅ Found ${messages.data.messages ? messages.data.messages.length : 0} recent messages`);
    
    // Test specific search for "Check" emails
    console.log('\n🔍 Searching for "Check" emails...');
    const checkMessages = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 10,
      q: 'subject:Check OR body:Check'
    });
    
    if (checkMessages.data.messages && checkMessages.data.messages.length > 0) {
      console.log(`✅ Found ${checkMessages.data.messages.length} messages containing "Check"`);
      
      // Get details of the first message
      const firstMessage = checkMessages.data.messages[0];
      const messageDetails = await gmail.users.messages.get({
        userId: 'me',
        id: firstMessage.id
      });
      
      console.log('\n📨 Latest "Check" message details:');
      console.log(`  ID: ${firstMessage.id}`);
      console.log(`  Thread ID: ${messageDetails.data.threadId}`);
      
      // Find subject header
      const headers = messageDetails.data.payload.headers;
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
      const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
      const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');
      
      console.log(`  Subject: ${subjectHeader ? subjectHeader.value : 'No subject'}`);
      console.log(`  From: ${fromHeader ? fromHeader.value : 'No sender'}`);
      console.log(`  Date: ${dateHeader ? dateHeader.value : 'No date'}`);
    } else {
      console.log('❌ No messages containing "Check" found');
    }
    
  } catch (error) {
    console.error('❌ Gmail API test failed:', error.message);
    
    // Check for specific error types
    if (error.message.includes('invalid_grant')) {
      console.error('🔑 REFRESH TOKEN ERROR: The refresh token may be expired or invalid');
      console.error('💡 Solution: Re-run the Gmail auth setup script');
    } else if (error.message.includes('unauthorized')) {
      console.error('🔐 AUTHORIZATION ERROR: Client ID/Secret may be incorrect');
      console.error('💡 Solution: Double-check your Google Cloud Console credentials');
    } else if (error.message.includes('forbidden')) {
      console.error('🚫 PERMISSION ERROR: Gmail API may not be enabled');
      console.error('💡 Solution: Enable Gmail API in Google Cloud Console');
    }
    
    console.error('\nFull error:', error);
  }
}

async function testEmailChecking() {
  console.log('\n\n🔍 Testing Email Checking Script');
  console.log('=================================');
  
  try {
    const EmailBookingHandler = require('./src/emailBookingHandler');
    const handler = new EmailBookingHandler();
    
    console.log('🔧 Initializing email booking handler...');
    await handler.initialize();
    console.log('✅ Email booking handler initialized');
    
    console.log('📧 Checking for new booking requests...');
    const results = await handler.checkAndProcessBookings();
    console.log(`✅ Email check completed - processed ${results.length} requests`);
    
  } catch (error) {
    console.error('❌ Email checking failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testGmailAPI();
    await testEmailChecking();
    console.log('\n✅ All Gmail tests completed!');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { testGmailAPI, testEmailChecking };