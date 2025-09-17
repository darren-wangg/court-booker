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
        // Add timeout and connection configuration for Railway
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,   // 30 seconds
        socketTimeout: 60000,     // 60 seconds
        // Retry configuration
        pool: false,
        maxConnections: 1,
        maxMessages: 1,
        // Additional Railway-specific settings
        secure: true,
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        // Railway-specific port configuration
        port: 587,
        // Additional connection options for Railway
        ignoreTLS: false,
        requireTLS: true
      });

      // Verify connection with timeout
      console.log('🔌 Attempting to connect to Gmail SMTP...');
      try {
        await Promise.race([
          this.transporter.verify(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SMTP connection timeout after 30 seconds')), 30000)
          )
        ]);
        console.log('✅ Gmail SMTP connection verified');
      } catch (verifyError) {
        console.error('⚠️ SMTP verification failed:', verifyError.message);
        console.log('⚠️ Continuing without SMTP verification - will attempt to send when needed');
        // Don't throw the error - let the service continue and try to send when needed
      }
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
