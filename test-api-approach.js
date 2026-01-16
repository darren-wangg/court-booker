/**
 * Test script to verify if we can use API requests instead of Chrome automation
 * This tests the flow you discovered in the network requests
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Configuration
const AMENITY_URL = 'https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf';
const BASE_URL = 'https://www.avalonaccess.com';

async function testApiApproach() {
  console.log('🧪 Testing API-based approach...\n');

  try {
    // Step 1: Initial GET request to establish session and get cookies
    console.log('Step 1: Making initial GET request to establish session...');
    const initialResponse = await axios.get(AMENITY_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 400, // Accept redirects
    });

    console.log(`✅ Status: ${initialResponse.status}`);
    console.log(`✅ Redirected to: ${initialResponse.request.res.responseUrl || AMENITY_URL}`);
    
    // Extract cookies from response
    const cookies = initialResponse.headers['set-cookie'];
    console.log(`✅ Received ${cookies ? cookies.length : 0} cookies`);
    
    // Parse HTML to extract visitor info and other data
    const $ = cheerio.load(initialResponse.data);
    
    // Look for visitor data in script tags
    let visitorData = null;
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent && scriptContent.includes('visitor:')) {
        // Try to extract visitor object
        const visitorMatch = scriptContent.match(/visitor:\s*({[^}]+})/);
        if (visitorMatch) {
          console.log('\n📋 Found visitor data in script tag');
          console.log(visitorMatch[1].substring(0, 200) + '...');
          visitorData = visitorMatch[1];
        }
      }
    });

    // Check if we're on login page or authenticated page
    const isLoginPage = initialResponse.data.includes('LogOn') || 
                        initialResponse.data.includes('UserName') || 
                        initialResponse.data.includes('Password');
    
    if (isLoginPage) {
      console.log('\n⚠️  Redirected to login page - authentication required');
      console.log('   The site requires login before accessing the amenity page');
      console.log('   We would need to:');
      console.log('   1. POST to login endpoint with credentials');
      console.log('   2. Get authenticated session cookies');
      console.log('   3. Then make requests to reservation endpoints');
      return { requiresAuth: true, loginPage: true };
    }

    console.log('\n✅ Successfully loaded amenity page (authenticated)');

    // Step 2: Try to fetch reservation times for a specific date
    console.log('\nStep 2: Testing reservation times API endpoint...');
    
    // Get tomorrow's date in m/d/yy format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}/${tomorrow.getFullYear().toString().slice(-2)}`;
    
    console.log(`   Testing date: ${dateStr}`);
    
    // Extract amenity key from URL or page
    const amenityKey = 'dd5c4252-e044-4012-a1e3-ec2e1a8cdddf';
    
    try {
      const timesResponse = await axios.get(`${BASE_URL}/Information/Information/ReservationTimesByDate`, {
        params: {
          reservationDate: dateStr,
          amenityKey: amenityKey,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': AMENITY_URL,
          'Cookie': cookies ? cookies.join('; ') : '',
        },
      });

      console.log(`\n✅ Reservation times API response:`);
      console.log(JSON.stringify(timesResponse.data, null, 2));
      
      return {
        success: true,
        requiresAuth: false,
        timesData: timesResponse.data,
        approach: 'API-based approach is viable!',
      };

    } catch (apiError) {
      console.log(`\n⚠️  Reservation times API failed: ${apiError.message}`);
      if (apiError.response) {
        console.log(`   Status: ${apiError.response.status}`);
        console.log(`   Response: ${JSON.stringify(apiError.response.data).substring(0, 200)}`);
      }
      
      return {
        success: false,
        requiresAuth: apiError.response?.status === 401 || apiError.response?.status === 403,
        error: apiError.message,
      };
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   URL: ${error.response.config.url}`);
    }
    return { success: false, error: error.message };
  }
}

// Run the test
testApiApproach().then((result) => {
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS:');
  console.log('='.repeat(60));
  console.log(JSON.stringify(result, null, 2));
  console.log('\n💡 Next steps:');
  if (result.success) {
    console.log('   ✅ API approach works! You can replace Chrome automation with API calls');
    console.log('   ✅ This will be much faster and more reliable');
    console.log('   ✅ No need for Browserless.io or local Chrome');
  } else if (result.requiresAuth) {
    console.log('   ⚠️  Need to handle authentication first');
    console.log('   ⚠️  Will need to POST login credentials to get session cookies');
    console.log('   ⚠️  Then use those cookies for subsequent API requests');
  } else {
    console.log('   ❌ API approach may not work - stick with Chrome automation');
  }
  console.log('='.repeat(60));
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
