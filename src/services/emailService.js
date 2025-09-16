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
      return await this.gmailSmtp.sendEmail({ to, subject, html, from });
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
