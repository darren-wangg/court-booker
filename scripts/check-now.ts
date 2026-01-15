import { ReservationChecker, getUser, saveAvailabilitySnapshot } from '@court-booker/shared';

// Get user ID from command line argument or use first user
const userId = process.argv[2] ? parseInt(process.argv[2]) : null;
const user = getUser(userId);

if (!user) {
  console.error('❌ Error: No user configuration found!');
  console.error('Please set EMAIL and PASSWORD environment variables.');
  console.error('For multiple users, use USER1_EMAIL, USER2_EMAIL, etc.');
  process.exit(1);
}

if (!user.email || !user.password) {
  console.error('❌ Error: credentials not configured!');
  console.error('Please create a .env file with your email and password.');
  console.error('For multiple users, use USER1_EMAIL, USER2_EMAIL, etc.');
  process.exit(1);
}

async function checkNow() {
  console.log(`🔍 Running availability check for user: ${user.email}`);
  const checker = new ReservationChecker(userId);

  // Determine source based on environment
  const source = process.env.GITHUB_ACTIONS ? 'github-cron' : 'manual-refresh';

  try {
    const result = await checker.checkAvailability();

    // Save to Supabase
    try {
      await saveAvailabilitySnapshot(result, source, userId);
      console.log('✅ Availability data saved to Supabase');
    } catch (supabaseError: any) {
      console.error('⚠️  Failed to save to Supabase:', supabaseError.message);
      // Don't fail the entire check if Supabase save fails
      // The check itself succeeded, just logging failed
    }

    if (result && result.totalAvailableSlots > 0) {
      console.log(`\n✅ Check completed successfully! Found ${result.totalAvailableSlots} available slots.`);
    } else {
      console.log('\n⚠️  No available time slots found.');
    }

  } catch (error: any) {
    console.error('\n❌ Check failed:', error.message);

    // Try to save error state to Supabase
    try {
      await saveAvailabilitySnapshot(
        {
          success: false,
          error: error.message,
          totalAvailableSlots: 0,
          dates: [],
        },
        source,
        userId
      );
    } catch (supabaseError) {
      // Ignore Supabase errors on failure
    }

    process.exit(1);
  }

  process.exit(0);
}

checkNow();
