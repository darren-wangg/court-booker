const nodemailer = require('nodemailer');
const config = require('../config');

class GmailSmtpService {
  constructor() {
    this.transporter = null;
  }

  async initialize() {
    try {
      // Validate credentials first
      if (!config.gmailSmtpUser || !config.gmailSmtpPassword) {
        throw new Error('Gmail SMTP credentials not configured. Please set GMAIL_SMTP_USER and GMAIL_SMTP_PASSWORD environment variables.');
      }

      // Create transporter using Gmail SMTP with timeout configuration
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.gmailSmtpUser, // Your Gmail address
          pass: config.gmailSmtpPassword, // App-specific password
        },
        // Add timeout and connection configuration
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 5000,    // 5 seconds
        socketTimeout: 10000,     // 10 seconds
        // Retry configuration
        pool: false,
        maxConnections: 1,
        maxMessages: 1,
      });

      // Verify connection with timeout
      console.log('🔌 Attempting to connect to Gmail SMTP...');
      await Promise.race([
        this.transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMTP connection timeout after 15 seconds')), 15000)
        )
      ]);
      console.log('✅ Gmail SMTP connection verified');
    } catch (error) {
      console.error('Failed to initialize Gmail SMTP:', error);
      throw error;
    }
  }

  async sendEmail({ to, subject, html, from = null }) {
    try {
      if (!this.transporter) {
        await this.initialize();
      }

      const mailOptions = {
        from: from || config.gmailSmtpUser,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        html: html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GmailSmtpService;
