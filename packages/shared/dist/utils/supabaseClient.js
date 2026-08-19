"use strict";
/**
 * Supabase client helper for Court Booker
 * Handles database operations for availability snapshots
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAvailabilitySnapshot = saveAvailabilitySnapshot;
exports.getLatestSnapshot = getLatestSnapshot;
exports.getRecentSnapshots = getRecentSnapshots;
exports.saveBooking = saveBooking;
exports.getUserBookingThisWeek = getUserBookingThisWeek;
exports.getBookingsForDate = getBookingsForDate;
exports.getBookingsInRange = getBookingsInRange;
exports.markSlotAsBooked = markSlotAsBooked;
exports.getSupabaseClient = getSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
const dates_1 = require("./dates");
// Initialize Supabase client
function getSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
}
/**
 * Save availability snapshot to Supabase
 * @param availabilityData - The result from ReservationChecker.checkAvailability()
 * @param source - Source of the check: 'github-cron' | 'manual-refresh' | 'api'
 * @param userId - Optional user ID who triggered the check
 * @returns The inserted record
 */
async function saveAvailabilitySnapshot(availabilityData, source = 'github-cron', userId = null) {
    const supabase = getSupabaseClient();
    const snapshot = {
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
    return data;
}
/**
 * Get the latest availability snapshot
 * @param userId - Optional user ID to filter by
 * @returns The latest snapshot or null
 */
async function getLatestSnapshot(userId = null) {
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
    return data;
}
/**
 * Get all recent snapshots (for history)
 * @param limit - Number of snapshots to return
 * @param userId - Optional user ID to filter by
 * @returns Array of snapshots
 */
async function getRecentSnapshots(limit = 10, userId = null) {
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
    return (data || []);
}
/**
 * Every function below takes and returns calendar days as "YYYY-MM-DD" strings.
 * They used to take Date objects and read them with getFullYear()/getDate(),
 * which resolves in whatever timezone the process happens to run in — UTC on
 * Vercel, Pacific on a laptop — so the same booking landed on different days
 * depending on where the code ran. See utils/dates.ts.
 */
function requireYmd(value, argName) {
    if (!(0, dates_1.isYmd)(value)) {
        throw new Error(`${argName} must be a calendar day in YYYY-MM-DD form, got ${JSON.stringify(value)}`);
    }
    return value;
}
/**
 * Save a booking to Supabase
 */
async function saveBooking(userId, userEmail, bookingDay, startHour, endHour, timeFormatted, metadata) {
    const supabase = getSupabaseClient();
    requireYmd(bookingDay, 'bookingDay');
    const booking = {
        user_id: userId,
        user_email: userEmail,
        booking_date: bookingDay,
        start_hour: startHour,
        end_hour: endHour,
        time_formatted: timeFormatted,
        week_start: (0, dates_1.weekStartOf)(bookingDay),
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
    return data;
}
/**
 * Get user's booking for the current week (if any)
 */
async function getUserBookingThisWeek(userId, referenceDay = (0, dates_1.appToday)()) {
    const supabase = getSupabaseClient();
    const weekStart = (0, dates_1.weekStartOf)(requireYmd(referenceDay, 'referenceDay'));
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
    return data;
}
/**
 * Get all bookings for a specific date (to show which slots are taken)
 */
async function getBookingsForDate(bookingDay) {
    const supabase = getSupabaseClient();
    requireYmd(bookingDay, 'bookingDay');
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_date', bookingDay)
        .eq('status', 'confirmed');
    if (error) {
        console.error('❌ Error fetching bookings for date:', error);
        throw error;
    }
    return (data || []);
}
/**
 * Get all confirmed bookings in a date range
 */
async function getBookingsInRange(startDay, endDay) {
    const supabase = getSupabaseClient();
    requireYmd(startDay, 'startDay');
    requireYmd(endDay, 'endDay');
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('booking_date', startDay)
        .lte('booking_date', endDay)
        .eq('status', 'confirmed');
    if (error) {
        console.error('❌ Error fetching bookings in range:', error);
        throw error;
    }
    return (data || []);
}
/**
 * Update the latest availability snapshot so a freshly booked slot stops showing
 * as available until the next scrape.
 */
async function markSlotAsBooked(bookingDay, timeSlot // e.g., "5:00 PM - 6:00 PM"
) {
    const supabase = getSupabaseClient();
    requireYmd(bookingDay, 'bookingDay');
    console.log(`🔍 Marking slot as booked: ${bookingDay} at "${timeSlot}"`);
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
    // Match on the parsed calendar day rather than the label string, so a snapshot
    // written with a slightly different label ("Saturday, January 18, 2025" vs
    // "Saturday January 18, 2025") still lines up.
    const dates = snapshot.dates || [];
    let slotRemoved = false;
    for (const dateInfo of dates) {
        if ((0, dates_1.parseLabel)(dateInfo.date) !== bookingDay)
            continue;
        if (!Array.isArray(dateInfo.available))
            continue;
        const idx = dateInfo.available.indexOf(timeSlot);
        if (idx > -1) {
            dateInfo.available.splice(idx, 1);
            dateInfo.booked = Array.isArray(dateInfo.booked)
                ? [...dateInfo.booked, timeSlot]
                : [timeSlot];
            slotRemoved = true;
            console.log(`✅ Removed "${timeSlot}" from ${bookingDay}`);
        }
        else {
            console.log(`⚠️ "${timeSlot}" was not in the available list for ${bookingDay}`);
        }
        break;
    }
    if (!slotRemoved) {
        console.log('⚠️ Slot not found in availability data, skipping snapshot update');
        console.log('Days in snapshot:', dates.map((d) => (0, dates_1.parseLabel)(d.date) ?? d.date));
        return;
    }
    // Recalculate total available slots
    const totalAvailable = dates.reduce((sum, d) => sum + (d.available?.length || 0), 0);
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
//# sourceMappingURL=supabaseClient.js.map