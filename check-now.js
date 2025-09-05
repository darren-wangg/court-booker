const ReservationChecker = require('./src/reservationChecker');
const config = require('./src/config');

if (!config.email || !config.password) {
  console.error('❌ Error: credentials not configured!');
  console.error('Please create a .env file with your email and password.');
  process.exit(1);
}

async function checkNow() {
  const checker = new ReservationChecker();
  
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
