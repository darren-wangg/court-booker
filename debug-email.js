const GmailSmtpService = require('./src/services/gmailSmtpService');
const config = require('./src/config');

async function testGmailSMTP() {
  console.log('🧪 Starting Gmail SMTP Debug Test');
  console.log('================================');
  
  // Check environment variables
  console.log('\n📋 Environment Variables Check:');
  console.log(`GMAIL_SMTP_USER: ${config.gmailSmtpUser ? '✅ Set' : '❌ Missing'}`);
  console.log(`GMAIL_SMTP_PASSWORD: ${config.gmailSmtpPassword ? '✅ Set' : '❌ Missing'}`);
  console.log(`NOTIFICATION_EMAIL: ${config.notificationEmail ? '✅ Set' : '❌ Missing'}`);
  
  if (!config.gmailSmtpUser || !config.gmailSmtpPassword) {
    console.log('\n❌ Missing required SMTP credentials. Please check your .env file.');
    return;
  }
  
  // Test SMTP service initialization
  console.log('\n🔧 Testing Gmail SMTP Service...');
  const gmailService = new GmailSmtpService();
  
  try {
    await gmailService.initialize();
    console.log('✅ Gmail SMTP service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Gmail SMTP service:', error.message);
    return;
  }
  
  // Test email sending
  console.log('\n📧 Testing email sending...');
  const testEmail = {
    to: config.notificationEmail || config.gmailSmtpUser,
    subject: '🧪 Court Booker Email Test - ' + new Date().toLocaleString(),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">📧 Email Test Successful!</h2>
        <p>This is a test email from your Court Booker application.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Environment:</strong> ${process.env.RAILWAY_ENVIRONMENT || 'Local'}</p>
        <hr style="margin: 20px 0;">
        <p style="color: #7f8c8d; font-size: 12px;">
          If you received this email, your Gmail SMTP configuration is working correctly.
        </p>
      </div>
    `
  };
  
  try {
    const result = await gmailService.sendEmail(testEmail);
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log(`📨 Message ID: ${result.messageId}`);
      console.log(`📬 Sent to: ${testEmail.to}`);
    } else {
      console.error('❌ Failed to send test email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
    console.error('Full error:', error);
  }
}

// Test the actual availability email function
async function testAvailabilityEmail() {
  console.log('\n\n🏀 Testing Availability Email Function');
  console.log('=====================================');
  
  try {
    const EmailService = require('./src/services/emailService');
    const { generateEmailHTML } = require('./src/email-templates/availabilities');
    const emailService = new EmailService();
    
    // Create mock availability data matching the expected structure
    const mockResults = {
      dates: [
        { 
          date: new Date().toDateString(),
          available: [
            { time: '10:00 AM - 11:00 AM' },
            { time: '2:00 PM - 3:00 PM' },
            { time: '6:00 PM - 7:00 PM' }
          ],
          booked: [
            { time: '12:00 PM - 1:00 PM' },
            { time: '4:00 PM - 5:00 PM' }
          ]
        }
      ],
      totalAvailableSlots: 3,
      checkedAt: new Date().toISOString()
    };
    
    console.log('📊 Sending test availability email with mock data...');
    await emailService.initialize();
    
    const result = await emailService.sendEmail({
      to: config.notificationEmail,
      subject: '🧪 Test - Avalon Court Availability 🏀',
      html: generateEmailHTML(mockResults)
    });
    
    if (result && result.success) {
      console.log('✅ Availability email sent successfully!');
      console.log(`📨 Message ID: ${result.messageId}`);
    } else {
      console.error('❌ Failed to send availability email:', result ? result.error : 'Unknown error');
    }
  } catch (error) {
    console.error('❌ Error testing availability email:', error.message);
    console.error('Full error:', error);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testGmailSMTP();
    await testAvailabilityEmail();
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { testGmailSMTP, testAvailabilityEmail };