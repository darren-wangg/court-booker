/**
 * POST /api/booking
 * Books a court time slot directly using BookingService
 * Now runs serverless with Browserless.io (no DigitalOcean needed!)
 *
 * Request body:
 * {
 *   date: "2025-01-15" (ISO date string or "January 15, 2025"),
 *   time: "5:00 PM - 6:00 PM" or { startHour: 17, endHour: 18 },
 *   userId: 1 (optional)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { BookingService, getUser, saveBooking, getUserBookingThisWeek, markSlotAsBooked } from '@court-booker/shared';

// Force this route to be dynamic (not statically optimized)
export const dynamic = 'force-dynamic';

// Max duration for Vercel serverless function (in seconds)
export const maxDuration = 300;

// CORS headers for API route
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface TimeSlot {
  startHour: number;
  endHour: number;
  formatted: string;
}

interface BookingRequest {
  date: Date;
  time: TimeSlot;
  formatted: {
    date: string;
    time: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify API secret if provided
    const apiSecret = request.headers.get('x-api-secret');
    const expectedSecret = process.env.API_SECRET_KEY;

    if (expectedSecret && apiSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Safely parse JSON body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON body', details: 'Request body must be valid JSON' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { date, time, userId } = body;

    // Validate input
    if (!date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: date and time' },
        { status: 400 }
      );
    }

    // Parse date - extract the date components to avoid timezone shifts
    // Input format: "Friday January 30, 2025" or "January 30, 2025"
    const dateStr = date.toString();
    // Match optional day of week, then month name, day, and year
    const dateMatch = dateStr.match(/(?:\w+\s+)?(\w+)\s+(\d+),\s+(\d+)/);
    if (!dateMatch) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected "Month Day, Year" or "DayOfWeek Month Day, Year"' },
        { status: 400 }
      );
    }

    // Extract month name, day, and year
    const monthStr = dateMatch[1];
    const day = parseInt(dateMatch[2]);
    const year = parseInt(dateMatch[3]);

    // Parse month name to month number (0-indexed)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames.findIndex(m => m === monthStr);

    if (month === -1) {
      return NextResponse.json(
        { error: 'Invalid month name' },
        { status: 400 }
      );
    }

    // Create date in local timezone (not UTC) to preserve the user's intended date
    const bookingDate = new Date(year, month, day);
    if (isNaN(bookingDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date' },
        { status: 400 }
      );
    }

    // Parse time - handle both string and object formats
    let timeSlot: TimeSlot | null = null;
    if (typeof time === 'string') {
      // Parse "5:00 PM - 6:00 PM" or "5 - 6 PM" format
      const timeMatch = time.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)?/i);
      if (timeMatch) {
        let startHour = parseInt(timeMatch[1]);
        let endHour = parseInt(timeMatch[3]);
        const startPeriod = timeMatch[2]?.toUpperCase() || 'PM';
        const endPeriod = timeMatch[4]?.toUpperCase() || 'PM';

        // Convert to 24-hour format
        if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
        if (startPeriod === 'AM' && startHour === 12) startHour = 0;
        if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
        if (endPeriod === 'AM' && endHour === 12) endHour = 0;

        timeSlot = {
          startHour,
          endHour,
          formatted: time,
        };
      }
    } else if (time.startHour && time.endHour) {
      timeSlot = {
        startHour: time.startHour,
        endHour: time.endHour,
        formatted: time.formatted || `${time.startHour}:00 - ${time.endHour}:00`,
      };
    }

    if (!timeSlot) {
      return NextResponse.json(
        { error: 'Invalid time format. Expected "5:00 PM - 6:00 PM" or {startHour, endHour}' },
        { status: 400 }
      );
    }

    // Create booking request - preserve original date string format for availability matching
    const bookingRequest: BookingRequest = {
      date: bookingDate,
      time: timeSlot,
      formatted: {
        date: dateStr, // Use original date string (e.g., "Friday January 30, 2025")
        time: timeSlot.formatted,
      },
    };

    console.log(`🏀 Processing booking: ${bookingRequest.formatted.date} at ${bookingRequest.formatted.time}`);

    // Get user info for booking record
    const user = getUser(userId || null);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', details: 'Invalid or missing user ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if user already has a booking this week
    try {
      const existingBooking = await getUserBookingThisWeek(user.id, bookingDate);
      if (existingBooking) {
        return NextResponse.json({
          success: false,
          error: 'Booking limit reached',
          message: `You already have a booking this week: ${existingBooking.booking_date} at ${existingBooking.time_formatted}`,
          existingBooking,
        }, { status: 409, headers: corsHeaders });
      }
    } catch (checkError: any) {
      // Log but don't block - the check is a nice-to-have safety
      console.warn('⚠️ Could not check existing bookings:', checkError.message);
    }

    // Run booking directly via BookingService (uses env variables for credentials)
    const bookingService = new BookingService(userId || null);
    const result = await bookingService.bookTimeSlot(bookingRequest);

    // If booking succeeded, save to Supabase and update availability
    if (result.success) {
      try {
        // Save booking record
        await saveBooking(
          user.id,
          user.email,
          bookingDate,
          timeSlot.startHour,
          timeSlot.endHour,
          timeSlot.formatted,
          { bookingResult: result }
        );

        // Update availability snapshot to remove the booked slot
        await markSlotAsBooked(bookingRequest.formatted.date, timeSlot.formatted);

        console.log('✅ Booking saved to database and availability updated');
      } catch (saveError: any) {
        // Log but don't fail - the booking was successful on the amenity site
        console.error('⚠️ Failed to save booking to database:', saveError.message);
      }
    }

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Booking completed successfully' : 'Booking failed',
      data: result,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Booking failed:', error);
    return NextResponse.json(
      { error: 'Failed to process booking', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
