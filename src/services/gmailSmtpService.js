const nodemailer = require('nodemailer');
const config = require('../config');

class GmailSmtpService {
  constructor() {
    this.transporter = null;
  }

  async initialize() {
    try {
      // Create transporter using Gmail SMTP
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.gmailSmtpUser, // Your Gmail address
          pass: config.gmailSmtpPassword, // App-specific password
        },
      });

      // Verify connection
      await this.transporter.verify();
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
