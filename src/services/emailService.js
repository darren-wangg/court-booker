const GmailSmtpService = require('./gmailSmtpService');
const config = require('../config');

class EmailService {
  constructor() {
    this.gmailSmtp = null;
  }

  async initialize() {
    try {
      console.log('🔌 Creating Gmail SMTP service...');
      this.gmailSmtp = new GmailSmtpService();
      console.log('🔌 Initializing Gmail SMTP service...');
      await this.gmailSmtp.initialize();
      console.log('✅ Gmail SMTP service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      throw error;
    }
  }

  async sendEmail({ to, subject, html, from = null }) {
    try {
      // SMTP bypass mode for testing
      if (process.env.SMTP_BYPASS === 'true') {
        console.log('✈️ SMTP bypass mode enabled - simulating email send');
        console.log(`📧 Would send email to: ${to}`);
        console.log(`📧 Subject: ${subject}`);
        console.log('✅ Email simulation completed');
        return { success: true, messageId: 'bypass-mode-' + Date.now(), bypassed: true };
      }
      
      return await this.gmailSmtp.sendEmail({ to, subject, html, from });
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
