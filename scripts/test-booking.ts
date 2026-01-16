/**
 * Test script to debug booking flow and HTML selectors
 * Run with: npx tsx scripts/test-booking.ts
 */

import { BookingService } from '../packages/shared';

async function testBooking() {
  console.log('🧪 Testing booking flow...\n');

  // Use USER1 credentials from env variables
  const bookingService = new BookingService(1);

  try {
    console.log('📋 Step 1: Initializing browser...');
    await bookingService.initialize();
    console.log('✅ Browser initialized\n');

    console.log('📋 Step 2: Testing login...');
    await bookingService.login();
    console.log('✅ Login successful\n');

    console.log('📋 Step 3: Testing date navigation...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await bookingService.navigateToBookingPage(tomorrow);
    console.log('✅ Date navigation successful\n');

    console.log('📋 Step 4: Testing time slot selection...');
    await bookingService.selectTimeSlot({
      startHour: 17,
      endHour: 18,
      formatted: '5:00 PM - 6:00 PM'
    });
    console.log('✅ Time slot selection successful\n');

    console.log('🎉 All steps completed successfully!');
    console.log('\n⚠️  Note: Booking was NOT submitted (for safety).');
    console.log('   If you want to test the full booking, uncomment completeBooking() below.');

    // Uncomment to test full booking:
    // console.log('\n📋 Step 5: Completing booking...');
    // const result = await bookingService.completeBooking();
    // console.log('✅ Booking result:', result);

  } catch (error: any) {
    console.error('\n❌ Test failed at step:', error.message);
    console.error('\n🔍 Debugging tips:');
    console.error('1. Check if website HTML structure changed');
    console.error('2. Verify selectors in packages/shared/services/bookingService.ts');
    console.error('3. Check browser console for errors');
    console.error('4. Ensure USER1_EMAIL and USER1_PASSWORD are set in .env');
    console.error('\n📝 Full error:', error);
  } finally {
    await bookingService.cleanup();
  }
}

testBooking().catch(console.error);
