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
        // Aggressive timeout configuration for Railway environment
        connectionTimeout: 120000, // 2 minutes for Railway
        greetingTimeout: 60000,    // 1 minute 
        socketTimeout: 120000,     // 2 minutes
        // Railway-specific retry configuration
        pool: false,
        maxConnections: 1,
        maxMessages: 1,
        // Add Railway-specific settings
        disableFileAccess: true,
        disableUrlAccess: true,
        // Gmail SMTP settings - use port 465 with SSL for Railway
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL (secure: true for port 465)
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2'
        }
      });

      // Skip SMTP verification in production environment to prevent hanging
      if (process.env.FLY_APP_NAME || process.env.NODE_ENV === 'production') {
        console.log('✈️ Production environment detected - skipping SMTP verification to prevent hanging');
        console.log(`🔌 SMTP Config: host=smtp.gmail.com, port=465, secure=true, user=${config.gmailSmtpUser}`);
        console.log('⚠️ SMTP will be tested when first email is sent');
      } else {
        // Verify connection with timeout in local development only
        console.log('🔌 Attempting to connect to Gmail SMTP...');
        console.log(`🔌 SMTP Config: host=smtp.gmail.com, port=465, secure=true, user=${config.gmailSmtpUser}`);
        try {
          await Promise.race([
            this.transporter.verify(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('SMTP connection timeout after 30 seconds')), 30000)
            )
          ]);
          console.log('✅ Gmail SMTP connection verified successfully');
        } catch (verifyError) {
          console.error('⚠️ SMTP verification failed:', verifyError.message);
          console.error('⚠️ SMTP error details:', verifyError);
          console.log('⚠️ Common causes: 1) Invalid app password, 2) Account security settings, 3) Network/firewall issues');
          console.log('⚠️ Continuing without SMTP verification - will attempt to send when needed');
          // Don't throw the error - let the service continue and try to send when needed
        }
      }
    } catch (error) {
      console.error('Failed to initialize Gmail SMTP:', error);
      throw error;
    }
  }

  async sendEmail({ to, subject, html, from = null }) {
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.transporter) {
          console.log('🔧 Transporter not initialized, initializing now...');
          await this.initialize();
        }

        const mailOptions = {
          from: from || config.gmailSmtpUser,
          to: Array.isArray(to) ? to.join(', ') : to,
          subject: subject,
          html: html,
        };

        console.log(`📧 Attempting to send email (attempt ${attempt}/${maxRetries}) to: ${mailOptions.to}`);
        console.log(`📧 Subject: ${mailOptions.subject}`);
        
        const result = await this.transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Email attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        // If it's a connection timeout, recreate transporter for next attempt
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
          console.log('🔄 Connection timeout detected, recreating transporter...');
          this.transporter = null;
          
          if (attempt < maxRetries) {
            const waitTime = attempt * 2000; // Progressive delay: 2s, 4s, 6s
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          // For non-timeout errors, don't retry
          break;
        }
      }
    }
    
    console.error('❌ All email attempts failed. Final error:', lastError);
    console.error('❌ Email error details:', lastError);
    console.log('❌ Check: 1) SMTP credentials, 2) App password validity, 3) Account security settings');
    return { success: false, error: lastError.message };
  }
}

module.exports = GmailSmtpService;
