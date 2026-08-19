/**
 * POST /api/booking
 *
 * Enqueues a booking and returns immediately with a job id. The actual work —
 * driving a headless browser through login, date selection and confirmation —
 * runs server-side and keeps going regardless of what the browser tab does, so
 * switching tabs or closing the screen no longer kills a booking in progress.
 * Poll GET /api/jobs/{id} for the outcome.
 *
 * Request body:
 * {
 *   date: "Friday August 21, 2026" | "2026-08-21",
 *   time: "4:00 PM - 5:00 PM" | { startHour: 16, endHour: 17 },
 *   userId: 1 (optional)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  BookingService,
  getUser,
  saveBooking,
  getUserBookingThisWeek,
  markSlotAsBooked,
  createJob,
  findActiveJob,
  runJob,
  parseLabel,
  formatLabel,
  formatFriendly,
  isBookable,
  unbookableReason,
  weekStartOf,
  siteToday,
  appToday,
} from '@court-booker/shared';
import { runInBackground } from '@/lib/background';

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

/** Parse "5:00 PM - 6:00 PM" or { startHour, endHour } into a TimeSlot. */
function parseTimeSlot(time: any): TimeSlot | null {
  if (typeof time === 'string') {
    const match = time.match(/(\d{1,2})(?::\d{2})?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)?/i);
    if (!match) return null;

    let startHour = parseInt(match[1]);
    let endHour = parseInt(match[3]);
    const startPeriod = match[2]?.toUpperCase() || 'PM';
    const endPeriod = match[4]?.toUpperCase() || 'PM';

    if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
    if (startPeriod === 'AM' && startHour === 12) startHour = 0;
    if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
    if (endPeriod === 'AM' && endHour === 12) endHour = 0;

    return { startHour, endHour, formatted: time };
  }

  if (time && time.startHour !== undefined && time.endHour !== undefined) {
    return {
      startHour: time.startHour,
      endHour: time.endHour,
      formatted: time.formatted || `${time.startHour}:00 - ${time.endHour}:00`,
    };
  }

  return null;
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', details: 'Request body must be valid JSON' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { date, time, userId } = body;

    if (!date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: date and time' },
        { status: 400, headers: corsHeaders }
      );
    }

    // A calendar day, not a Date. parseLabel accepts both the grid's label
    // ("Friday August 21, 2026") and a bare "2026-08-21", and never falls back
    // to new Date(string) — that parses ISO days as UTC midnight, which lands on
    // the previous day for anyone west of Greenwich.
    const day = parseLabel(String(date));
    if (!day) {
      return NextResponse.json(
        {
          error: 'Invalid date format',
          details: 'Expected "Month Day, Year", "DayOfWeek Month Day, Year", or "YYYY-MM-DD"',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const timeSlot = parseTimeSlot(time);
    if (!timeSlot) {
      return NextResponse.json(
        { error: 'Invalid time format. Expected "5:00 PM - 6:00 PM" or {startHour, endHour}' },
        { status: 400, headers: corsHeaders }
      );
    }

    // The booking site drops a day from its calendar at midnight Eastern and
    // refuses same-day reservations, so reject days it will no longer accept
    // before spending 60s of browser time discovering that.
    if (!isBookable(day)) {
      const reason = unbookableReason(day);
      const details =
        reason === 'past'
          ? `${formatFriendly(day)} has already passed.`
          : reason === 'site-rolled-over'
          ? `The booking site has already moved on to ${formatFriendly(siteToday())}, so ${formatFriendly(day)} can no longer be reserved.`
          : `The booking site does not allow same-day reservations.`;

      return NextResponse.json(
        { error: 'That day can no longer be booked', reason, details, day },
        { status: 400, headers: corsHeaders }
      );
    }

    const user = getUser(userId || null);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', details: 'Invalid or missing user ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    // One booking per week, evaluated against the week the requested day falls
    // in — not the week it happens to be right now.
    const existing = await getUserBookingThisWeek(user.id, day);
    if (existing) {
      return NextResponse.json(
        {
          error: 'You already have a booking that week',
          details: `${existing.time_formatted} on ${formatFriendly(existing.booking_date)}`,
          existingBooking: existing,
        },
        { status: 409, headers: corsHeaders }
      );
    }

    // Don't start a second browser run for someone who already has one going —
    // a double tap, or a reload followed by another tap, would otherwise book twice.
    const inFlight = await findActiveJob('booking', user.id);
    if (inFlight) {
      return NextResponse.json(
        {
          success: true,
          jobId: inFlight.id,
          status: inFlight.status,
          alreadyRunning: true,
          message: 'A booking is already in progress',
        },
        { status: 202, headers: corsHeaders }
      );
    }

    const job = await createJob('booking', user.id, {
      day,
      label: formatLabel(day),
      weekStart: weekStartOf(day),
      time: timeSlot,
      userEmail: user.email,
    });

    // Hand the work to the background and answer the client now. Everything
    // below this point outlives the HTTP response.
    runInBackground(
      runJob(job.id, async () => {
        console.log(`🏀 Booking ${formatLabel(day)} at ${timeSlot.formatted} for ${user.email}`);

        const bookingService = new BookingService(user.id);
        const result = await bookingService.bookTimeSlot({
          day,
          time: timeSlot,
          formatted: { date: formatLabel(day), time: timeSlot.formatted },
        });

        if (!result.success) {
          throw new Error(result.error || result.details || 'Booking failed on the amenity site');
        }

        // Record it. A failure here must not be reported as a failed booking —
        // the reservation exists on the site either way.
        try {
          await saveBooking(
            user.id,
            user.email,
            day,
            timeSlot.startHour,
            timeSlot.endHour,
            timeSlot.formatted,
            { bookingResult: result }
          );
          await markSlotAsBooked(day, timeSlot.formatted);
          console.log('✅ Booking saved and availability updated');
        } catch (saveError: any) {
          console.error('⚠️ Booked on the site but failed to record it:', saveError.message);
          return {
            ...result,
            day,
            label: formatLabel(day),
            time: timeSlot.formatted,
            persisted: false,
            warning: `Booked on the amenity site, but saving it here failed: ${saveError.message}`,
          };
        }

        return {
          ...result,
          day,
          label: formatLabel(day),
          time: timeSlot.formatted,
          persisted: true,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: job.status,
        day,
        label: formatLabel(day),
        time: timeSlot.formatted,
        message: 'Booking started',
      },
      { status: 202, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Could not start booking:', error);
    return NextResponse.json(
      { error: 'Failed to start booking', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
