/**
 * GET /api/availability/latest
 * Returns the most recent availability snapshot from Supabase.
 *
 * One wrinkle needs correcting before the data is usable. The booking site stops
 * publishing a day's reservations at midnight Eastern, so any day at or before
 * the site's current day scrapes as "every slot free" — which is the opposite of
 * the truth. For those days we splice in the last snapshot taken while the site
 * was still publishing them.
 *
 * Note this affects up to two days at once: between 9 PM and midnight Pacific the
 * site has already rolled over to tomorrow, so both the user's today and their
 * tomorrow come back empty.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import {
  Ymd,
  APP_TIMEZONE,
  SITE_TIMEZONE,
  appToday,
  siteToday,
  parseLabel,
  formatLabel,
  isBookable,
  isDroppedBySite,
  isPastForUser,
  unbookableReason,
  siteCutoffFor,
} from '@court-booker/shared';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface DateInfo {
  ymd?: Ymd;
  date: string;
  available: string[];
  booked?: string[];
  totalSlots?: number;
  checkedAt?: string;
  isHistorical?: boolean;
  historicalFrom?: string;
  bookable?: boolean;
  unbookable?: 'past' | 'same-day' | 'site-rolled-over' | null;
}

const DEFAULT_TOTAL_SLOTS = 12; // 10 AM - 10 PM

/** The day an entry refers to. Older snapshots only carry the label. */
function dayOf(entry: DateInfo): Ymd | null {
  if (entry.ymd) return entry.ymd;
  return parseLabel(entry.date);
}

/**
 * A day the site has stopped publishing scrapes as fully free. That is
 * indistinguishable from a genuinely empty day, which is fine: substituting a
 * pre-cutoff snapshot for a genuinely empty day is a no-op.
 */
function looksUnpublished(entry: DateInfo): boolean {
  const total = entry.totalSlots || DEFAULT_TOTAL_SLOTS;
  return Array.isArray(entry.available) && entry.available.length >= total;
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
          { success: false, error: 'No availability data found' },
          { status: 404 }
        );
      }
      throw error;
    }

    const now = new Date();
    const today = appToday(now);
    const courtToday = siteToday(now);

    const raw = (data.dates || []) as DateInfo[];

    // Normalize: attach the calendar day, drop days already behind the user, and
    // drop anything whose label we can't read rather than rendering a mystery column.
    const dates: DateInfo[] = [];
    for (const entry of raw) {
      const ymd = dayOf(entry);
      if (!ymd) {
        console.warn(`Skipping snapshot entry with unparseable date: ${JSON.stringify(entry.date)}`);
        continue;
      }
      if (isPastForUser(ymd, now)) continue;
      dates.push({ ...entry, ymd, date: entry.date || formatLabel(ymd) });
    }

    dates.sort((a, b) => (a.ymd! < b.ymd! ? -1 : a.ymd! > b.ymd! ? 1 : 0));

    // Fill in the days the site has stopped publishing.
    for (const entry of dates) {
      const ymd = entry.ymd!;
      if (!isDroppedBySite(ymd, now) || !looksUnpublished(entry)) continue;

      // The last snapshot taken before the site dropped this day still holds its
      // real availability.
      const cutoff = siteCutoffFor(ymd).toISOString();

      let historyQuery = supabase
        .from('availability_snapshots')
        .select('created_at, dates')
        .eq('success', true)
        .lt('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(5);

      if (userId) {
        historyQuery = historyQuery.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data: history, error: historyError } = await historyQuery;
      if (historyError || !history?.length) continue;

      for (const snapshot of history) {
        const match = ((snapshot.dates || []) as DateInfo[]).find((d) => dayOf(d) === ymd);
        if (!match || !Array.isArray(match.available)) continue;

        entry.available = match.available;
        entry.booked = match.booked;
        entry.totalSlots = match.totalSlots ?? entry.totalSlots;
        entry.isHistorical = true;
        entry.historicalFrom = snapshot.created_at;
        break;
      }
    }

    // Decide bookability once, on the server, so every client agrees.
    for (const entry of dates) {
      entry.bookable = isBookable(entry.ymd!, now);
      entry.unbookable = unbookableReason(entry.ymd!, now);
    }

    const totalAvailableSlots = dates.reduce(
      (sum, d) => sum + (d.bookable ? d.available?.length || 0 : 0),
      0
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          ...data,
          dates,
          total_available_slots: totalAvailableSlots,
        },
        meta: {
          timezone: APP_TIMEZONE,
          siteTimezone: SITE_TIMEZONE,
          today,
          // Ahead of `today` between 9 PM and midnight Pacific; days at or before
          // this can no longer be reserved.
          courtToday,
        },
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
      { success: false, error: 'Failed to fetch availability data', details: message },
      { status: 500 }
    );
  }
}
