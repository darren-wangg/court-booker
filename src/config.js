// Only load .env in non-CI environments
if (!process.env.CI && !process.env.GITHUB_ACTIONS) {
  require('dotenv').config();
}

const TIMEOUTS = {
  navigation: 30000,
  waitForSelector: 10000,
  betweenActions: 1000,
}

// Parse multiple users from environment variables
function parseUsers() {
  const users = [];
  
  // Check for multi-user format (USER1_EMAIL, USER2_EMAIL, etc.)
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
  
  // Fallback to legacy single-user format if no multi-user format found
  if (users.length === 0 && process.env.EMAIL && process.env.PASSWORD) {
    users.push({
      id: 1,
      email: process.env.EMAIL,
      password: process.env.PASSWORD,
      notificationEmail: process.env.NOTIFICATION_EMAIL || process.env.EMAIL,
    });
  }
  
  return users;
}

const users = parseUsers();

// Get user by ID
function getUser(userId = null) {
  // If no users configured at all
  if (users.length === 0) {
    console.error('❌ No users configured. Please set EMAIL and PASSWORD environment variables.');
    return null;
  }
  
  // If specific user ID requested
  if (userId) {
    const user = users.find(u => u.id === parseInt(userId));
    if (user) return user;
    console.error(`❌ User with ID ${userId} not found. Available users: ${users.map(u => u.id).join(', ')}`);
    return null;
  }
  
  // Default to first user
  return users[0];
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
  
  // Gmail Push Notifications configuration
  gmailProjectId: process.env.GMAIL_PROJECT_ID || '',
  gmailTopicName: process.env.GMAIL_TOPIC_NAME || 'court-booker-notifications',
  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3000/gmail/webhook',
  
  // Timeouts (in milliseconds)
  timeouts: TIMEOUTS,
};
