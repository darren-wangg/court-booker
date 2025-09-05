const ReservationScheduler = require('../scheduler');
const config = require('../config');

// Check if credentials are configured
if (!config.email || !config.password) {
  console.error('❌ Error: credentials not configured!');
  console.error('Please create a .env file with your email and password.');
  console.error('See .env.example for the required format.\n');
  process.exit(1);
}

async function checkNow() {
  const scheduler = new ReservationScheduler();
  
  try {
    console.log('🔍 Running immediate availability check...\n');
    const result = await scheduler.runOnce();
    
    if (result && result.totalAvailableSlots > 0) {
      console.log('\n✅ Check completed successfully!');
      console.log(`Found ${result.totalAvailableSlots} available time slots across ${result.dates.length} dates.`);
    } else if (result) {
      console.log('\n⚠️  No available time slots found across all dates.');
    }
    
  } catch (error) {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

checkNow();
