// Only load .env in non-CI environments
if (!process.env.CI && !process.env.GITHUB_ACTIONS) {
  require('dotenv').config();
}

interface User {
  id: number;
  email: string;
  password: string;
  notificationEmail: string;
}

interface Timeouts {
  navigation: number;
  waitForSelector: number;
  betweenActions: number;
}

const TIMEOUTS: Timeouts = {
  navigation: 30000,
  waitForSelector: 10000,
  betweenActions: 1000,
};

// Parse multiple users from environment variables
function parseUsers(): User[] {
  const users: User[] = [];
  
  // Check for multi-user format (USER1_EMAIL, USER2_EMAIL, etc.)
  let userIndex = 1;
  while (process.env[`USER${userIndex}_EMAIL`]) {    
    users.push({
      id: userIndex,
      email: process.env[`USER${userIndex}_EMAIL`]!,
      password: process.env[`USER${userIndex}_PASSWORD`]!,
      notificationEmail: process.env[`USER${userIndex}_NOTIFICATION_EMAIL`] || process.env[`USER${userIndex}_EMAIL`]!,
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
function getUser(userId: number | null = null): User | null {
  // If no users configured at all
  if (users.length === 0) {
    console.error('❌ No users configured. Please set EMAIL and PASSWORD environment variables.');
    return null;
  }
  
  // If specific user ID requested
  if (userId) {
    const user = users.find(u => u.id === parseInt(userId.toString()));
    if (user) return user;
    console.error(`❌ User with ID ${userId} not found. Available users: ${users.map(u => u.id).join(', ')}`);
    return null;
  }
  
  // Default to first user
  return users[0];
}

export {
  users,
  getUser,
  TIMEOUTS,
};

export const amenityUrl = process.env.AMENITY_URL || 'https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf';
export const schedulePattern = process.env.SCHEDULE_PATTERN || '0 */2 * * *';
export const headless = process.env.HEADLESS_MODE === 'true';
export const timeouts = TIMEOUTS;

export type { User, Timeouts };
