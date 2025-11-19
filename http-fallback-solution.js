/**
 * HTTP-based fallback for availability checking
 * When browser fails, attempt to scrape via direct HTTP requests
 */

const axios = require('axios');
const cheerio = require('cheerio');

class HttpAvailabilityChecker {
  constructor(user) {
    this.user = user;
    this.session = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
  }

  async checkAvailabilityViaHttp() {
    try {
      console.log('🌐 Attempting HTTP-based availability check...');
      
      // Step 1: Get login page to establish session
      const loginPage = await this.session.get('https://www.avalonaccess.com/Account/LogOn');
      const $ = cheerio.load(loginPage.data);
      
      // Extract anti-forgery token
      const token = $('input[name="__RequestVerificationToken"]').val();
      if (!token) {
        throw new Error('Could not extract verification token');
      }

      // Step 2: Login with credentials
      const loginData = {
        'UserName': this.user.email,
        'Password': this.user.password,
        '__RequestVerificationToken': token,
        'RememberMe': 'false'
      };

      const loginResponse = await this.session.post('https://www.avalonaccess.com/Account/LogOn', loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.avalonaccess.com/Account/LogOn'
        },
        maxRedirects: 5
      });

      // Step 3: Navigate to reservation page
      const reservationResponse = await this.session.get(
        'https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf'
      );

      // Step 4: Parse reservation data
      const $reservation = cheerio.load(reservationResponse.data);
      const tableRows = $reservation('table tr');
      
      if (tableRows.length === 0) {
        console.log('⚠️ No table data found in HTTP response');
        return { success: false, method: 'http', error: 'No table data found' };
      }

      // Step 5: Process reservation data (simplified)
      const availableSlots = [];
      tableRows.each((index, row) => {
        const $row = $reservation(row);
        const cells = $row.find('td');
        
        if (cells.length >= 3) {
          const timeText = $reservation(cells[0]).text().trim();
          const statusText = $reservation(cells[2]).text().trim();
          
          if (statusText.toLowerCase().includes('available')) {
            availableSlots.push({
              time: timeText,
              status: 'available'
            });
          }
        }
      });

      console.log(`✅ HTTP method found ${availableSlots.length} available slots`);
      
      return {
        success: true,
        method: 'http',
        totalAvailableSlots: availableSlots.length,
        slots: availableSlots,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log(`❌ HTTP fallback failed: ${error.message}`);
      return { success: false, method: 'http', error: error.message };
    }
  }
}

module.exports = HttpAvailabilityChecker;