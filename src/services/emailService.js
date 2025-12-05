const ResendEmailService = require('./resendEmailService');
const config = require('../config');

class EmailService {
  constructor() {
    this.emailProvider = null;
  }

  async initialize() {
    try {
      console.log('🔌 Creating Resend email service...');
      this.emailProvider = new ResendEmailService();
      console.log('🔌 Initializing Resend email service...');
      await this.emailProvider.initialize();
      console.log('✅ Resend email service initialized successfully');
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
      
      return await this.emailProvider.sendEmail({ to, subject, html, from });
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
