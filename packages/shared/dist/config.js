"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeouts = exports.headless = exports.schedulePattern = exports.amenityUrl = exports.TIMEOUTS = exports.users = void 0;
exports.getUser = getUser;
// Only load .env in non-CI and non-Next.js environments
// Next.js/Vercel handle environment variables natively
if (!process.env.CI && !process.env.GITHUB_ACTIONS && !process.env.NEXT_RUNTIME) {
    try {
        require('dotenv').config();
    }
    catch (error) {
        // dotenv not available (e.g., in Next.js build), skip silently
        // Environment variables will be provided by the platform (Vercel, etc.)
    }
}
const TIMEOUTS = {
    navigation: 30000,
    waitForSelector: 10000,
    betweenActions: 1000,
};
exports.TIMEOUTS = TIMEOUTS;
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
        });
        userIndex++;
    }
    // Fallback to legacy single-user format if no multi-user format found
    if (users.length === 0 && process.env.EMAIL && process.env.PASSWORD) {
        users.push({
            id: 1,
            email: process.env.EMAIL,
            password: process.env.PASSWORD,
        });
    }
    return users;
}
const users = parseUsers();
exports.users = users;
// Get user by ID
function getUser(userId = null) {
    // If no users configured at all
    if (users.length === 0) {
        console.error('❌ No users configured. Please set EMAIL and PASSWORD environment variables.');
        return null;
    }
    // If specific user ID requested
    if (userId) {
        const user = users.find(u => u.id === parseInt(userId.toString()));
        if (user)
            return user;
        console.error(`❌ User with ID ${userId} not found. Available users: ${users.map(u => u.id).join(', ')}`);
        return null;
    }
    // Default to first user
    return users[0];
}
exports.amenityUrl = process.env.AMENITY_URL || 'https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf';
exports.schedulePattern = process.env.SCHEDULE_PATTERN || '0 */2 * * *';
exports.headless = process.env.HEADLESS_MODE === 'true';
exports.timeouts = TIMEOUTS;
//# sourceMappingURL=config.js.map