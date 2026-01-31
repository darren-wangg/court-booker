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
 * Convert a Date object to local date string (YYYY-MM-DD) without timezone conversion
 */
function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    // Adjust to Monday (day 1), handling Sunday (day 0) as end of previous week
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return toLocalDateString(d);
}
/**
 * Save a booking to Supabase
 */
async function saveBooking(userId, userEmail, bookingDate, startHour, endHour, timeFormatted, metadata) {
    const supabase = getSupabaseClient();
    const booking = {
        user_id: userId,
        user_email: userEmail,
        booking_date: toLocalDateString(bookingDate),
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
    return data;
}
/**
 * Get user's booking for the current week (if any)
 */
async function getUserBookingThisWeek(userId, referenceDate = new Date()) {
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
    return data;
}
/**
 * Get all bookings for a specific date (to show which slots are taken)
 */
async function getBookingsForDate(bookingDate) {
    const supabase = getSupabaseClient();
    const dateStr = toLocalDateString(bookingDate);
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_date', dateStr)
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
async function getBookingsInRange(startDate, endDate) {
    const supabase = getSupabaseClient();
    const startStr = toLocalDateString(startDate);
    const endStr = toLocalDateString(endDate);
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
    return (data || []);
}
/**
 * Update availability snapshot to mark a slot as booked
 * This modifies the latest snapshot's data to remove the booked slot from available list
 */
async function markSlotAsBooked(dateStr, // e.g., "Saturday January 25, 2025"
timeSlot // e.g., "5:00 PM - 6:00 PM"
) {
    const supabase = getSupabaseClient();
    console.log(`🔍 Marking slot as booked: "${dateStr}" at "${timeSlot}"`);
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
    console.log(`🔍 Searching in ${dates.length} dates for match...`);
    for (const dateInfo of dates) {
        console.log(`🔍 Checking date: "${dateInfo.date}" (match: ${dateInfo.date === dateStr})`);
        if (dateInfo.date === dateStr && Array.isArray(dateInfo.available)) {
            console.log(`🔍 Available slots: ${JSON.stringify(dateInfo.available)}`);
            const idx = dateInfo.available.indexOf(timeSlot);
            if (idx > -1) {
                dateInfo.available.splice(idx, 1);
                slotRemoved = true;
                console.log(`✅ Removed slot at index ${idx}, remaining: ${JSON.stringify(dateInfo.available)}`);
                break;
            }
            else {
                console.log(`⚠️ Time slot "${timeSlot}" not found in available slots`);
            }
        }
    }
    if (!slotRemoved) {
        console.log('⚠️ Slot not found in availability data, skipping update');
        console.log('Available dates in snapshot:', dates.map(d => d.date));
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