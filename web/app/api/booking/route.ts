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
import { BookingService } from '@court-booker/shared';

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

    // Parse date
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
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

    // Create booking request
    const bookingRequest: BookingRequest = {
      date: bookingDate,
      time: timeSlot,
      formatted: {
        date: bookingDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        time: timeSlot.formatted,
      },
    };

    console.log(`🏀 Processing booking: ${bookingRequest.formatted.date} at ${bookingRequest.formatted.time}`);

    // Run booking directly via BookingService (uses env variables for credentials)
    const bookingService = new BookingService(userId || null);
    const result = await bookingService.bookTimeSlot(bookingRequest);

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
