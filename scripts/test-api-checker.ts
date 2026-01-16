/**
 * Test script for API-based reservation checker
 * Run with: ts-node scripts/test-api-checker.ts
 */

import ApiReservationChecker from '../packages/shared/services/apiReservationChecker';
import { getUser } from '../packages/shared/config';

async function testApiChecker() {
  console.log('🧪 Testing API-based Reservation Checker\n');

  const user = getUser(null);
  if (!user) {
    console.error('❌ No user configuration found!');
    process.exit(1);
  }

  const checker = new ApiReservationChecker(null);

  try {
    const result = await checker.checkAvailability();
    
    console.log('\n✅ API-based check completed successfully!');
    console.log(`Total available slots: ${result.totalAvailableSlots}`);
    
    // Show detailed results
    result.dates.forEach((dateInfo: any) => {
      console.log(`\n${dateInfo.date}:`);
      console.log(`  Booked: ${dateInfo.booked.length}`);
      console.log(`  Available: ${dateInfo.available.length}`);
      if (dateInfo.available.length > 0) {
        console.log(`  Available times: ${dateInfo.available.slice(0, 3).join(', ')}${dateInfo.available.length > 3 ? '...' : ''}`);
      }
    });

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testApiChecker();
