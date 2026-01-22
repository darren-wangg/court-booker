/**
 * Supabase client helper for Court Booker
 * Handles database operations for availability snapshots
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface AvailabilityData {
  totalAvailableSlots?: number;
  dates?: any[];
  success?: boolean;
  error?: string;
  [key: string]: any;
}

interface Snapshot {
  id?: string;
  source: string;
  user_id?: number | null;
  total_available_slots: number;
  checked_at: string;
  data: AvailabilityData;
  dates?: any[];
  success: boolean;
}

// Initialize Supabase client
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Save availability snapshot to Supabase
 * @param availabilityData - The result from ReservationChecker.checkAvailability()
 * @param source - Source of the check: 'github-cron' | 'manual-refresh' | 'api'
 * @param userId - Optional user ID who triggered the check
 * @returns The inserted record
 */
export async function saveAvailabilitySnapshot(
  availabilityData: AvailabilityData,
  source: string = 'github-cron',
  userId: number | null = null
): Promise<Snapshot> {
  const supabase = getSupabaseClient();

  const snapshot: Omit<Snapshot, 'id'> = {
    source,
    user_id: userId,
    total_available_slots: availabilityData.totalAvailableSlots || 0,
    checked_at: new Date().toISOString(),
    data: availabilityData, // Store full result as JSONB
    dates: availabilityData.dates || [],
    success: availabilityData.success !== false, // Default to true if not specified
  };

  const { data, error } = await supabase
    .from('availability_snapshots')
    .insert(snapshot)
    .select()
    .single();

  if (error) {
    console.error('❌ Error saving availability snapshot:', error);
    throw error;
  }

  console.log('✅ Availability snapshot saved to Supabase:', data.id);
  return data as Snapshot;
}

/**
 * Get the latest availability snapshot
 * @param userId - Optional user ID to filter by
 * @returns The latest snapshot or null
 */
export async function getLatestSnapshot(userId: number | null = null): Promise<Snapshot | null> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('availability_snapshots')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('❌ Error fetching latest snapshot:', error);
    throw error;
  }

  return data as Snapshot;
}

/**
 * Get all recent snapshots (for history)
 * @param limit - Number of snapshots to return
 * @param userId - Optional user ID to filter by
 * @returns Array of snapshots
 */
export async function getRecentSnapshots(limit: number = 10, userId: number | null = null): Promise<Snapshot[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('availability_snapshots')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching recent snapshots:', error);
    throw error;
  }

  return (data || []) as Snapshot[];
}

// =============================================
// BOOKING FUNCTIONS
// =============================================

interface Booking {
  id?: string;
  created_at?: string;
  user_id: number;
  user_email: string;
  booking_date: string; // ISO date string (YYYY-MM-DD)
  start_hour: number;
  end_hour: number;
  time_formatted: string;
  week_start: string; // ISO date string (YYYY-MM-DD)
  status: 'confirmed' | 'cancelled';
  metadata?: any;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust to Monday (day 1), handling Sunday (day 0) as end of previous week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Save a booking to Supabase
 */
export async function saveBooking(
  userId: number,
  userEmail: string,
  bookingDate: Date,
  startHour: number,
  endHour: number,
  timeFormatted: string,
  metadata?: any
): Promise<Booking> {
  const supabase = getSupabaseClient();

  const booking: Omit<Booking, 'id' | 'created_at'> = {
    user_id: userId,
    user_email: userEmail,
    booking_date: bookingDate.toISOString().split('T')[0],
    start_hour: startHour,
    end_hour: endHour,
    time_formatted: timeFormatted,
    week_start: getWeekStart(bookingDate),
    status: 'confirmed',
    metadata,
  };

  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();

  if (error) {
    console.error('❌ Error saving booking:', error);
    throw error;
  }

  console.log('✅ Booking saved to Supabase:', data.id);
  return data as Booking;
}

/**
 * Get user's booking for the current week (if any)
 */
export async function getUserBookingThisWeek(
  userId: number,
  referenceDate: Date = new Date()
): Promise<Booking | null> {
  const supabase = getSupabaseClient();
  const weekStart = getWeekStart(referenceDate);

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('status', 'confirmed')
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    console.error('❌ Error fetching user booking:', error);
    throw error;
  }

  return data as Booking;
}

/**
 * Get all bookings for a specific date (to show which slots are taken)
 */
export async function getBookingsForDate(bookingDate: Date): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  const dateStr = bookingDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('booking_date', dateStr)
    .eq('status', 'confirmed');

  if (error) {
    console.error('❌ Error fetching bookings for date:', error);
    throw error;
  }

  return (data || []) as Booking[];
}

/**
 * Get all confirmed bookings in a date range
 */
export async function getBookingsInRange(
  startDate: Date,
  endDate: Date
): Promise<Booking[]> {
  const supabase = getSupabaseClient();
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .gte('booking_date', startStr)
    .lte('booking_date', endStr)
    .eq('status', 'confirmed');

  if (error) {
    console.error('❌ Error fetching bookings in range:', error);
    throw error;
  }

  return (data || []) as Booking[];
}

/**
 * Update availability snapshot to mark a slot as booked
 * This modifies the latest snapshot's data to remove the booked slot from available list
 */
export async function markSlotAsBooked(
  dateStr: string, // e.g., "Saturday January 25, 2025"
  timeSlot: string // e.g., "5:00 PM - 6:00 PM"
): Promise<void> {
  const supabase = getSupabaseClient();

  // Get latest snapshot
  const { data: snapshot, error: fetchError } = await supabase
    .from('availability_snapshots')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchError || !snapshot) {
    console.error('❌ Could not find snapshot to update:', fetchError);
    return;
  }

  // Update the dates array to remove the booked slot
  const dates = snapshot.dates || [];
  let slotRemoved = false;

  for (const dateInfo of dates) {
    if (dateInfo.date === dateStr && Array.isArray(dateInfo.available)) {
      const idx = dateInfo.available.indexOf(timeSlot);
      if (idx > -1) {
        dateInfo.available.splice(idx, 1);
        slotRemoved = true;
        break;
      }
    }
  }

  if (!slotRemoved) {
    console.log('⚠️ Slot not found in availability data, skipping update');
    return;
  }

  // Recalculate total available slots
  const totalAvailable = dates.reduce(
    (sum: number, d: any) => sum + (d.available?.length || 0),
    0
  );

  // Update the snapshot
  const { error: updateError } = await supabase
    .from('availability_snapshots')
    .update({
      dates,
      total_available_slots: totalAvailable,
      checked_at: new Date().toISOString(),
      data: { ...snapshot.data, dates, totalAvailableSlots: totalAvailable },
    })
    .eq('id', snapshot.id);

  if (updateError) {
    console.error('❌ Error updating snapshot:', updateError);
    throw updateError;
  }

  console.log('✅ Availability snapshot updated - slot marked as booked');
}

export { getSupabaseClient };
