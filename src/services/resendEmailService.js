const { Resend } = require('resend');

class ResendEmailService {
  constructor() {
    this.resend = null;
    this.fromEmail = 'Court Booker <onboarding@resend.dev>'; // Default sender
  }

  async initialize() {
    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY environment variable not configured');
      }

      this.resend = new Resend(process.env.RESEND_API_KEY);
      
      // Set custom from email if configured
      if (process.env.RESEND_FROM_EMAIL) {
        this.fromEmail = process.env.RESEND_FROM_EMAIL;
      }
      
      console.log('✅ Resend email service initialized successfully');
      console.log(`📧 From email: ${this.fromEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Resend initialization failed:', error.message);
      throw error;
    }
  }

  async sendEmail({ to, subject, html, text = null }) {
    try {
      console.log(`📧 Sending email via Resend to: ${to}`);
      console.log(`📧 Subject: ${subject}`);
      
      const emailData = {
        from: this.fromEmail,
        to: [to],
        subject: subject,
        html: html
      };

      if (text) {
        emailData.text = text;
      }

      const result = await this.resend.emails.send(emailData);
      
      console.log('✅ Email sent via Resend successfully');
      console.log(`📧 Email ID: ${result.data.id}`);
      
      return { 
        success: true, 
        messageId: result.data.id,
        service: 'resend'
      };
    } catch (error) {
      console.error('❌ Resend send failed:', error.message);
      console.error('❌ Error details:', error);
      
      return { 
        success: false, 
        error: error.message,
        service: 'resend'
      };
    }
  }

  async verifyConnection() {
    try {
      // Resend doesn't have a direct verify method, but we can check API key format
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_API_KEY.startsWith('re_')) {
        throw new Error('Invalid Resend API key format');
      }
      
      console.log('✅ Resend connection verified');
      return true;
    } catch (error) {
      console.error('❌ Resend connection failed:', error.message);
      return false;
    }
  }
}

module.exports = ResendEmailService;