/**
 * Debug script to see what the API actually returns
 */

import axios from 'axios';
import * as fs from 'fs';

const BASE_URL = 'https://www.avalonaccess.com';
const AMENITY_KEY = 'dd5c4252-e044-4012-a1e3-ec2e1a8cdddf';

async function debugApiResponse() {
  console.log('🔍 Debugging API response format...\n');

  // Create axios instance
  const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
    },
    withCredentials: true,
    maxRedirects: 5,
  });

  try {
    // Step 1: Login
    console.log('Step 1: Logging in...');
    const loginData = new URLSearchParams();
    loginData.append('UserName', process.env.USER1_EMAIL || process.env.EMAIL || '');
    loginData.append('Password', process.env.USER1_PASSWORD || process.env.PASSWORD || '');

    await axiosInstance.post('/Account/LogOn', loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      params: {
        ReturnUrl: `/Information/Information/AmenityReservation?amenityKey=${AMENITY_KEY}`
      }
    });

    console.log('✅ Login successful\n');

    // Step 2: Fetch first page of reservations
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}/${tomorrow.getFullYear()}`;
    
    console.log(`Step 2: Fetching reservations for ${dateStr}...\n`);

    for (let pageCount = 1; pageCount <= 3; pageCount++) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`PAGE ${pageCount}`);
      console.log('='.repeat(60));

      const timestamp = Date.now();
      const response = await axiosInstance.get('/Information/Information/GetUpcomingReservationsByAmenity', {
        params: {
          amenity: AMENITY_KEY,
          pageCount: pageCount,
          date: dateStr,
          _: timestamp
        },
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `${BASE_URL}/Information/Information/AmenityReservation?amenityKey=${AMENITY_KEY}`,
        }
      });

      console.log(`Status: ${response.status}`);
      console.log(`Content-Type: ${response.headers['content-type']}`);
      console.log(`Response length: ${typeof response.data === 'string' ? response.data.length : JSON.stringify(response.data).length} characters`);
      console.log(`\nFirst 500 characters of response:`);
      console.log('-'.repeat(60));
      const preview = typeof response.data === 'string' 
        ? response.data.substring(0, 500)
        : JSON.stringify(response.data, null, 2).substring(0, 500);
      console.log(preview);
      console.log('-'.repeat(60));

      // Save full response to file
      const filename = `api-response-page${pageCount}.html`;
      const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
      fs.writeFileSync(filename, content);
      console.log(`\n💾 Full response saved to: ${filename}`);

      // Check if response is empty or has no data
      if (typeof response.data === 'string' && response.data.length < 100) {
        console.log('⚠️  Response is very short - might be empty');
        break;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Debug complete! Check the saved HTML files.');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
  }
}

debugApiResponse();
