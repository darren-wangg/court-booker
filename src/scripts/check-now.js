const ReservationChecker = require('../services/reservationChecker');
const config = require('../config');

// Get user ID from command line argument or use first user
const userId = process.argv[2] ? parseInt(process.argv[2]) : null;
const user = config.getUser(userId);

if (!user.email || !user.password) {
  console.error('❌ Error: credentials not configured!');
  console.error('Please create a .env file with your email and password.');
  console.error('For multiple users, use USER1_EMAIL, USER2_EMAIL, etc.');
  process.exit(1);
}

async function checkNow() {
  console.log(`🔍 Running availability check for user: ${user.email}`);
  const checker = new ReservationChecker(userId);
  
  try {
    console.log('🔍 Running availability check...\n');
    const result = await checker.checkAvailability();
    
    if (result && result.totalAvailableSlots > 0) {
      console.log('\n✅ Check completed successfully!');
    } else {
      console.log('\n⚠️  No available time slots found.');
    }

  } catch (error) {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

checkNow();
