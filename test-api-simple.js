/**
 * Simple test of the GetUpcomingReservationsByAmenity API endpoint
 */

const axios = require('axios');

async function testReservationsApi() {
  console.log('🧪 Testing GetUpcomingReservationsByAmenity API...\n');

  const amenityKey = 'dd5c4252-e044-4012-a1e3-ec2e1a8cdddf';
  
  // Test for next 7 days
  const today = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() + i);
    const dateStr = `${testDate.getMonth() + 1}/${testDate.getDate()}/${testDate.getFullYear()}`;
    
    console.log(`\n📅 Testing date: ${dateStr}`);
    
    try {
      const timestamp = Date.now();
      const url = `https://www.avalonaccess.com/Information/Information/GetUpcomingReservationsByAmenity`;
      
      const response = await axios.get(url, {
        params: {
          amenity: amenityKey,
          date: dateStr,
          _: timestamp
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=${amenityKey}`,
        },
        timeout: 10000,
      });

      console.log(`   Status: ${response.status}`);
      
      if (response.data) {
        // Check if it's HTML (login redirect) or JSON
        const isJson = typeof response.data === 'object';
        const isHtml = typeof response.data === 'string' && response.data.includes('<html');
        
        if (isHtml) {
          console.log('   ⚠️  Received HTML (likely login page) - authentication required');
        } else if (isJson) {
          console.log('   ✅ Received JSON data');
          console.log(`   Data keys: ${Object.keys(response.data).join(', ')}`);
          
          // Show sample of data
          const dataStr = JSON.stringify(response.data, null, 2);
          console.log(`   Sample: ${dataStr.substring(0, 300)}...`);
        } else {
          console.log(`   📋 Response type: ${typeof response.data}`);
          console.log(`   Sample: ${String(response.data).substring(0, 200)}`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        
        // Check if redirected to login
        if (error.response.status === 302 || error.response.status === 401) {
          console.log('   ⚠️  Authentication required');
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSION:');
  console.log('='.repeat(60));
  console.log('If you see JSON data above, the API approach works!');
  console.log('If you see "authentication required", we need to login first.');
  console.log('='.repeat(60));
}

testReservationsApi().catch(console.error);
