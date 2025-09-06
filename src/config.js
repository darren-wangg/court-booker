require('dotenv').config();

const TIMEOUTS = {
  navigation: 30000,
  waitForSelector: 10000,
  betweenActions: 1000,
}

// Parse multiple users from environment variables
function parseUsers() {
  const users = [];
  let userIndex = 1;
  
  while (process.env[`USER${userIndex}_EMAIL`]) {
    users.push({
      id: userIndex,
      email: process.env[`USER${userIndex}_EMAIL`],
      password: process.env[`USER${userIndex}_PASSWORD`],
      notificationEmail: process.env[`USER${userIndex}_NOTIFICATION_EMAIL`] || process.env[`USER${userIndex}_EMAIL`],
    });
    userIndex++;
  }
  
  return users;
}

const users = parseUsers();

// Get user by ID or return first user for backward compatibility
function getUser(userId = null) {
  if (userId && users.length > 0) {
    const user = users.find(u => u.id === parseInt(userId));
    if (user) return user;
  }
  
  // Fallback to first user
  if (users.length > 0) {
    return users[0];
  }
}

module.exports = {
  // Multi-user support
  users,
  getUser,
  
  // Amenity URL
  amenityUrl: process.env.AMENITY_URL || 'https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf',
  
  // Schedule pattern (cron format) - 2 hours for maximum data freshness
  schedulePattern: process.env.SCHEDULE_PATTERN || '0 */2 * * *',
  
  // Browser configuration
  headless: process.env.HEADLESS_MODE === 'true',
  
  // Email notifications
  notificationEmail: process.env.NOTIFICATION_EMAIL || '',
  // Enable email sending for local testing, respect SEND_EMAIL env var if set
  sendEmail: process.env.SEND_EMAIL !== undefined ? process.env.SEND_EMAIL === 'true' : true,
  
  // Gmail SMTP configuration
  gmailSmtpUser: process.env.GMAIL_SMTP_USER || '',
  gmailSmtpPassword: process.env.GMAIL_SMTP_PASSWORD || '',
  
  // Gmail API configuration (for receiving booking requests)
  gmailClientId: process.env.GMAIL_CLIENT_ID || '',
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || '',
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
  gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
  
  // Timeouts (in milliseconds)
  timeouts: TIMEOUTS,
};
