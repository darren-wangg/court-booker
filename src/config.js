require('dotenv').config();

const TIMEOUTS = {
  navigation: 30000,
  waitForSelector: 10000,
  betweenActions: 1000,
}

module.exports = {
  // Credentials
  email: process.env.EMAIL || '',
  password: process.env.PASSWORD || '',
  
  // Amenity URL
  amenityUrl: process.env.AMENITY_URL || 'https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf',
  
  // Schedule pattern (cron format) - 2 hours for maximum data freshness
  schedulePattern: process.env.SCHEDULE_PATTERN || '0 */2 * * *',
  
  // Browser configuration
  headless: process.env.HEADLESS_MODE === 'true',
  
  // Email notifications
  resendApiKey: process.env.RESEND_API_KEY || '',
  notificationEmail: process.env.NOTIFICATION_EMAIL || '',
  
  // Gmail API configuration
  gmailClientId: process.env.GMAIL_CLIENT_ID || '',
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || '',
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
  
  // Timeouts (in milliseconds)
  timeouts: TIMEOUTS,
};
