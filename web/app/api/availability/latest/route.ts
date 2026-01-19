/**
 * GET /api/availability/latest
 * Returns the most recent availability snapshot from Supabase
 *
 * For same-day availability: Since the booking site hides same-day slots,
 * we fetch historical data from a previous snapshot (taken when today was still visible)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DateInfo {
  date: string;
  available: string[];
  booked?: string[];
  totalSlots?: number;
  checkedAt?: string;
  isHistorical?: boolean;
}

// Get today's date string in the format used by the scraper (e.g., "Saturday January 18, 2025")
function getTodayDateString(): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dayOfWeek = eastern.toLocaleDateString('en-US', { weekday: 'long' });
  const month = eastern.toLocaleDateString('en-US', { month: 'long' });
  const day = eastern.getDate();
  const year = eastern.getFullYear();
  return `${dayOfWeek} ${month} ${day}, ${year}`;
}

// Check if a date string matches today
function isToday(dateStr: string): boolean {
  const todayStr = getTodayDateString();
  // Also check without the year for flexibility
  const todayNoYear = todayStr.replace(/, \d{4}$/, '');
  const dateNoYear = dateStr.replace(/, \d{4}$/, '');
  return dateStr === todayStr || dateNoYear === todayNoYear;
}

// Get start of today in Eastern time for querying historical snapshots
function getStartOfTodayEastern(): string {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  eastern.setHours(0, 0, 0, 0);
  return eastern.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam) : null;

    // Fetch the latest snapshot
    let query = supabase
      .from('availability_snapshots')
      .select('*')
      .eq('success', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    query = query.limit(1);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'No availability data found' },
          { status: 404 }
        );
      }
      throw error;
    }

    // Check if we need to fix same-day availability data
    const dates = (data.dates || []) as DateInfo[];
    const todayIndex = dates.findIndex(d => isToday(d.date));

    if (todayIndex !== -1) {
      const todayData = dates[todayIndex];
      const totalSlots = todayData.totalSlots || 12; // Default 12 slots (10 AM - 10 PM)

      // If today shows 100% availability, it's likely incorrect (scraped today, but site hides same-day)
      // Fetch historical data from a snapshot taken BEFORE today
      if (todayData.available && todayData.available.length === totalSlots) {
        console.log('Same-day shows 100% available - fetching historical data...');

        const startOfToday = getStartOfTodayEastern();

        // Query for a snapshot taken before today that has data for today's date
        let historicalQuery = supabase
          .from('availability_snapshots')
          .select('*')
          .eq('success', true)
          .lt('created_at', startOfToday)
          .order('created_at', { ascending: false });

        if (userId) {
          historicalQuery = historicalQuery.or(`user_id.eq.${userId},user_id.is.null`);
        }

        historicalQuery = historicalQuery.limit(5); // Get a few recent ones to search

        const { data: historicalData, error: histError } = await historicalQuery;

        if (!histError && historicalData && historicalData.length > 0) {
          // Find historical data for today's date
          for (const snapshot of historicalData) {
            const histDates = (snapshot.dates || []) as DateInfo[];
            const histTodayData = histDates.find(d => isToday(d.date));

            if (histTodayData && histTodayData.available) {
              // Found historical data for today - use it
              console.log(`Using historical data from ${snapshot.created_at} for same-day availability`);
              dates[todayIndex] = {
                ...histTodayData,
                isHistorical: true, // Mark as historical data
              };
              data.dates = dates;
              break;
            }
          }
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: data,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching latest availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability data', details: message },
      { status: 500 }
    );
  }
}
