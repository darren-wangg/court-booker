/**
 * GET /api/bookings
 *
 * Bookings relevant to the availability grid: everything in the visible window,
 * plus this user's booking for each week the window spans (the one-per-week
 * limit is per calendar week, and an 8-day window always straddles two).
 *
 * Query params:
 * - userId: User ID to check (required)
 * - startDate: First day of the range, YYYY-MM-DD (optional, defaults to today)
 * - days: How many days the range covers (optional, defaults to 8)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserBookingThisWeek,
  getBookingsInRange,
  appToday,
  addDays,
  parseLabel,
  weekStartOf,
  APP_TIMEZONE,
  Booking,
} from '@court-booker/shared';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_WINDOW_DAYS = 8;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const startDateStr = searchParams.get('startDate');
    const daysStr = searchParams.get('days');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { error: 'Invalid userId: must be a number' },
        { status: 400 }
      );
    }

    // "Today" is the user's today, resolved in APP_TIMEZONE. It used to be
    // `new Date()` read through the process timezone — UTC on Vercel — which
    // from 5 PM Pacific onward already reported tomorrow and dropped the current
    // day out of the range.
    const today = appToday();
    let startDay = today;
    if (startDateStr) {
      const parsed = parseLabel(startDateStr);
      if (!parsed) {
        return NextResponse.json(
          { error: 'Invalid startDate: expected YYYY-MM-DD' },
          { status: 400 }
        );
      }
      startDay = parsed;
    }

    const days = daysStr ? parseInt(daysStr) : DEFAULT_WINDOW_DAYS;
    if (isNaN(days) || days < 1 || days > 60) {
      return NextResponse.json(
        { error: 'Invalid days: must be between 1 and 60' },
        { status: 400 }
      );
    }

    const endDay = addDays(startDay, days - 1);

    // All bookings in the window, so the grid can mark taken slots.
    const allBookingsInRange = await getBookingsInRange(startDay, endDay);

    // This user's booking for each week the window touches. Checking only the
    // current week made next week's days look blocked by a booking that has
    // nothing to do with them.
    const weekStarts: string[] = [];
    for (let i = 0; i < days; i++) {
      const weekStart = weekStartOf(addDays(startDay, i));
      if (!weekStarts.includes(weekStart)) weekStarts.push(weekStart);
    }

    const perWeek = await Promise.all(
      weekStarts.map((weekStart) => getUserBookingThisWeek(userIdNum, weekStart))
    );

    const bookingsByWeek: Record<string, Booking | null> = {};
    weekStarts.forEach((weekStart, i) => {
      bookingsByWeek[weekStart] = perWeek[i];
    });

    const userBookingThisWeek = bookingsByWeek[weekStartOf(today)] ?? null;

    return NextResponse.json(
      {
        success: true,
        timezone: APP_TIMEZONE,
        today,
        range: { start: startDay, end: endDay },
        // Keyed by the Monday of each week in range.
        bookingsByWeek,
        // Kept for the banner, which only ever cares about the current week.
        userBookingThisWeek,
        hasBookingThisWeek: !!userBookingThisWeek,
        allBookingsInRange,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('❌ Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
      { status: 500 }
    );
  }
}
