/**
 * API-based Reservation Checker
 * Uses direct API calls instead of Chrome automation for better performance and reliability
 */

import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import { getUser, User, amenityUrl } from '../config';

const BASE_URL = 'https://www.avalonaccess.com';
const AMENITY_KEY = 'dd5c4252-e044-4012-a1e3-ec2e1a8cdddf';

export default class ApiReservationChecker {
  private user: User | null;
  private axiosInstance: AxiosInstance;
  private isAuthenticated: boolean = false;

  constructor(userId: number | null = null) {
    this.user = getUser(userId);
    
    // Create cookie jar to maintain session
    const jar = new CookieJar();
    
    // Create axios instance with cookie jar support
    const client = wrapper(axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      jar,
      withCredentials: true,
      maxRedirects: 5,
    }));
    
    this.axiosInstance = client;
  }

  /**
   * Authenticate with the amenity site
   */
  async authenticate(): Promise<boolean> {
    try {
      console.log('🔐 Authenticating via API...');
      
      // Step 1: Get the login page to establish session
      const loginPageResponse = await this.axiosInstance.get('/Account/LogOn', {
        params: {
          ReturnUrl: `/Information/Information/AmenityReservation?amenityKey=${AMENITY_KEY}`
        }
      });

      // Extract any CSRF tokens or form data from the login page
      const $ = cheerio.load(loginPageResponse.data);
      const requestVerificationToken = $('input[name="__RequestVerificationToken"]').val();

      // Step 2: POST login credentials
      const loginData = new URLSearchParams();
      loginData.append('UserName', this.user!.email);
      loginData.append('Password', this.user!.password);
      if (requestVerificationToken) {
        loginData.append('__RequestVerificationToken', requestVerificationToken as string);
      }

      const loginResponse = await this.axiosInstance.post('/Account/LogOn', loginData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${BASE_URL}/Account/LogOn`,
        },
        params: {
          ReturnUrl: `/Information/Information/AmenityReservation?amenityKey=${AMENITY_KEY}`
        },
        maxRedirects: 0, // Don't follow redirects automatically
        validateStatus: (status) => status < 400, // Accept 3xx redirects
      });

      console.log(`   Login response status: ${loginResponse.status}`);
      console.log(`   Login response URL: ${loginResponse.request?.res?.responseUrl || 'N/A'}`);
      console.log(`   Set-Cookie headers: ${loginResponse.headers['set-cookie']?.length || 0}`);
      
      // Check if login was successful
      const isLoginPage = loginResponse.data.includes('LogOn') || 
                          loginResponse.data.includes('UserName') ||
                          loginResponse.data.includes('Password');

      if (isLoginPage) {
        console.log('❌ Login failed - still on login page');
        console.log(`   Response preview: ${loginResponse.data.substring(0, 200)}`);
        return false;
      }

      console.log('✅ Authentication successful');
      this.isAuthenticated = true;
      return true;

    } catch (error: any) {
      console.error('❌ Authentication failed:', error.message);
      return false;
    }
  }

  /**
   * Fetch all reservations with pagination (like clicking "Show More" repeatedly)
   * The API returns reservations in pages, potentially with overlapping dates
   */
  async getAllReservations(startDate: Date): Promise<Map<string, Set<string>>> {
    const dateStr = `${startDate.getMonth() + 1}/${startDate.getDate()}/${startDate.getFullYear()}`;
    const allReservations = new Map<string, Set<string>>();
    
    let pageCount = 1;
    let hasMorePages = true;
    let consecutiveEmptyPages = 0;
    const maxPages = 30; // Safety limit

    console.log(`   Fetching reservations starting from ${dateStr}...`);

    while (hasMorePages && pageCount <= maxPages) {
      try {
        const timestamp = Date.now();
        const response = await this.axiosInstance.get('/Information/Information/GetUpcomingReservationsByAmenity', {
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

        // Debug: Log response info
        console.log(`   Response type: ${typeof response.data}`);
        console.log(`   Response length: ${typeof response.data === 'string' ? response.data.length : 'N/A'} chars`);
        
        // Parse reservations from this page
        const pageReservations = this.parseReservationsToMap(response.data);
        
        if (pageReservations.size === 0) {
          console.log(`   ⚠️  Page ${pageCount} returned 0 dates`);
          
          // Debug: Show first 300 chars of response
          if (typeof response.data === 'string') {
            console.log(`   First 300 chars: ${response.data.substring(0, 300).replace(/\n/g, ' ')}`);
          }
          
          consecutiveEmptyPages++;
          if (consecutiveEmptyPages >= 2) {
            console.log(`   No more data after page ${pageCount}`);
            hasMorePages = false;
          }
        } else {
          consecutiveEmptyPages = 0;
          
          // Merge with existing reservations (deduplicate)
          let newReservationsAdded = 0;
          for (const [date, times] of pageReservations.entries()) {
            if (!allReservations.has(date)) {
              allReservations.set(date, new Set());
            }
            const existingSize = allReservations.get(date)!.size;
            times.forEach(time => allReservations.get(date)!.add(time));
            newReservationsAdded += allReservations.get(date)!.size - existingSize;
          }
          
          console.log(`   Page ${pageCount}: Found ${pageReservations.size} dates, ${newReservationsAdded} new time slots`);
        }

        pageCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`   Error fetching page ${pageCount}:`, error.message);
        hasMorePages = false;
      }
    }

    console.log(`   Total: ${allReservations.size} unique dates with reservations`);
    return allReservations;
  }

  /**
   * Parse API response to extract booked time slots organized by date
   * Returns a Map of date -> Set of time slots
   */
  parseReservationsToMap(apiResponse: any): Map<string, Set<string>> {
    const reservationsByDate = new Map<string, Set<string>>();

    try {
      // The API response should contain HTML with reservation data
      if (typeof apiResponse === 'string') {
        const $ = cheerio.load(apiResponse);
        
        // Debug: Check what tables exist
        const tables = $('table');
        console.log(`   [Parser] Found ${tables.length} tables in HTML`);
        
        if (tables.length === 0) {
          console.log(`   [Parser] No tables found. HTML preview: ${apiResponse.substring(0, 200)}`);
          return reservationsByDate;
        }
        
        let currentDate: string | null = null;
        let rowsProcessed = 0;
        
        // Parse the reservation table - similar to Chrome automation logic
        $('table tr').each((i, row) => {
          const $row = $(row);
          rowsProcessed++;
          
          // Check for date header
          const dateCell = $row.find('td.resv-date span');
          if (dateCell.length > 0 && dateCell.text().trim()) {
            currentDate = dateCell.text().trim();
            console.log(`   [Parser] Found date: "${currentDate}"`);
            if (!reservationsByDate.has(currentDate)) {
              reservationsByDate.set(currentDate, new Set());
            }
          }
          
          // Check for time slot
          const timeCell = $row.find('td.resv-time span');
          if (timeCell.length > 0 && timeCell.text().trim() && currentDate) {
            const timeText = timeCell.text().trim();
            console.log(`   [Parser] Found time: "${timeText}" for ${currentDate}`);
            reservationsByDate.get(currentDate)!.add(timeText);
          }
        });
        
        console.log(`   [Parser] Processed ${rowsProcessed} rows, found ${reservationsByDate.size} dates`);
      }
    } catch (error: any) {
      console.error('Error parsing reservations:', error.message);
    }

    return reservationsByDate;
  }

  /**
   * Generate all possible time slots (10 AM - 10 PM)
   */
  generateTimeSlots(): string[] {
    const slots: string[] = [];
    const startHour = 10;
    const endHour = 22;

    for (let hour = startHour; hour < endHour; hour++) {
      const startTime = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
      const endHourVal = hour + 1;
      const endTime = `${endHourVal > 12 ? endHourVal - 12 : endHourVal}:00 ${endHourVal >= 12 ? 'PM' : 'AM'}`;
      slots.push(`${startTime} - ${endTime}`);
    }

    return slots;
  }

  /**
   * Get next 7 days
   */
  /**
   * Find booked slots for a specific date from the reservation map
   */
  findBookedSlotsForDate(dateInfo: any, allReservations: Map<string, Set<string>>): string[] {
    const bookedSlots: string[] = [];
    
    // Extract target month and day from our date format
    // dateInfo.fullDate is like "Friday January 16, 2026"
    const parts = dateInfo.fullDate.split(' ');
    const targetMonth = parts[1]; // "January"
    const targetDay = parseInt(parts[2].replace(',', ''), 10); // 16
    
    // Look for matching date in reservations
    // Reservation dates are like "Saturday, January 06" or "Friday, January 16"
    for (const [resDate, timeSlots] of allReservations.entries()) {
      const resParts = resDate.split(', ');
      if (resParts.length >= 2) {
        const monthDayPart = resParts[1]; // "January 06"
        const monthDayParts = monthDayPart.split(' ');
        
        if (monthDayParts.length >= 2) {
          const resMonth = monthDayParts[0];
          const resDay = parseInt(monthDayParts[1], 10);
          
          if (resMonth === targetMonth && resDay === targetDay) {
            console.log(`   ✅ Match found: "${resDate}" has ${timeSlots.size} booked slots`);
            bookedSlots.push(...Array.from(timeSlots));
            break;
          }
        }
      }
    }
    
    if (bookedSlots.length === 0) {
      console.log(`   ℹ️  No reservations found for ${targetMonth} ${targetDay}`);
    }
    
    return bookedSlots;
  }

  getNext7Days(): Array<{ date: Date; fullDate: string }> {
    const days = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const now = new Date();
    const easternTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

    for (let i = 1; i <= 7; i++) {
      const date = new Date(easternTime);
      date.setDate(date.getDate() + i);

      const monthName = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

      days.push({
        date: date,
        fullDate: `${dayOfWeek} ${monthName} ${day}, ${year}`,
      });
    }

    return days;
  }

  /**
   * Main method to check availability using API
   */
  async checkAvailability() {
    try {
      console.log('🚀 Starting API-based availability check...');
      console.log(`👤 User: ${this.user?.email}`);

      // Authenticate first
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Authentication failed');
      }

      // Get next 7 days
      const next7Days = this.getNext7Days();
      
      // Fetch ALL reservations with pagination (starting from tomorrow)
      console.log('\n� Fetching all reservations with pagination...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const allReservations = await this.getAllReservations(tomorrow);
      
      // Now match each of our target dates with the fetched reservations
      const allResults = [];
      const allSlots = this.generateTimeSlots();

      for (const dateInfo of next7Days) {
        console.log(`\n📅 Processing: ${dateInfo.fullDate}`);

        // Find matching reservations for this date
        const bookedSlots = this.findBookedSlotsForDate(dateInfo, allReservations);
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

        console.log(`   Booked: ${bookedSlots.length}, Available: ${availableSlots.length}`);

        allResults.push({
          date: dateInfo.fullDate,
          booked: bookedSlots,
          available: availableSlots,
          totalSlots: allSlots.length,
          checkedAt: new Date().toISOString(),
        });
      }

      // Calculate total available slots
      const totalAvailableSlots = allResults.reduce((sum, day) => sum + day.available.length, 0);

      console.log('\n' + '='.repeat(60));
      console.log('API-BASED AVAILABILITY REPORT');
      console.log('='.repeat(60));
      console.log(`Total available slots: ${totalAvailableSlots}`);

      return {
        success: true,
        dates: allResults,
        totalAvailableSlots,
        checkedAt: new Date().toISOString(),
        method: 'api',
      };

    } catch (error: any) {
      console.error('❌ API-based check failed:', error.message);
      throw error;
    }
  }
}
