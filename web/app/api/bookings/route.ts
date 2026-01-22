/**
 * GET /api/bookings
 * Fetches user's booking for current week and all bookings in date range
 *
 * Query params:
 * - userId: User ID to check (required)
 * - startDate: Start of date range (optional, defaults to today)
 * - endDate: End of date range (optional, defaults to 7 days from start)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserBookingThisWeek, getBookingsInRange } from '@court-booker/shared';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

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

    // Calculate date range (default: today to 7 days from now)
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr ? new Date(endDateStr) : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get user's booking for this week (to check 1-per-week limit)
    const userBookingThisWeek = await getUserBookingThisWeek(userIdNum, startDate);

    // Get all bookings in the date range (to show which slots are taken)
    const allBookingsInRange = await getBookingsInRange(startDate, endDate);

    return NextResponse.json({
      success: true,
      userBookingThisWeek,
      hasBookingThisWeek: !!userBookingThisWeek,
      allBookingsInRange,
    });

  } catch (error: any) {
    console.error('❌ Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error.message },
      { status: 500 }
    );
  }
}
