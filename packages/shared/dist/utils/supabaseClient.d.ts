/**
 * Supabase client helper for Court Booker
 * Handles database operations for availability snapshots
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { Ymd } from './dates';
export interface AvailabilityData {
    totalAvailableSlots?: number;
    dates?: any[];
    success?: boolean;
    error?: string;
    [key: string]: any;
}
export interface Snapshot {
    id?: string;
    source: string;
    user_id?: number | null;
    total_available_slots: number;
    checked_at: string;
    data: AvailabilityData;
    dates?: any[];
    success: boolean;
}
declare function getSupabaseClient(): SupabaseClient;
/**
 * Save availability snapshot to Supabase
 * @param availabilityData - The result from ReservationChecker.checkAvailability()
 * @param source - Source of the check: 'github-cron' | 'manual-refresh' | 'api'
 * @param userId - Optional user ID who triggered the check
 * @returns The inserted record
 */
export declare function saveAvailabilitySnapshot(availabilityData: AvailabilityData, source?: string, userId?: number | null): Promise<Snapshot>;
/**
 * Get the latest availability snapshot
 * @param userId - Optional user ID to filter by
 * @returns The latest snapshot or null
 */
export declare function getLatestSnapshot(userId?: number | null): Promise<Snapshot | null>;
/**
 * Get all recent snapshots (for history)
 * @param limit - Number of snapshots to return
 * @param userId - Optional user ID to filter by
 * @returns Array of snapshots
 */
export declare function getRecentSnapshots(limit?: number, userId?: number | null): Promise<Snapshot[]>;
export interface Booking {
    id?: string;
    created_at?: string;
    user_id: number;
    user_email: string;
    booking_date: Ymd;
    start_hour: number;
    end_hour: number;
    time_formatted: string;
    week_start: Ymd;
    status: 'confirmed' | 'cancelled';
    metadata?: any;
}
/**
 * Save a booking to Supabase
 */
export declare function saveBooking(userId: number, userEmail: string, bookingDay: Ymd, startHour: number, endHour: number, timeFormatted: string, metadata?: any): Promise<Booking>;
/**
 * Get user's booking for the current week (if any)
 */
export declare function getUserBookingThisWeek(userId: number, referenceDay?: Ymd): Promise<Booking | null>;
/**
 * Get all bookings for a specific date (to show which slots are taken)
 */
export declare function getBookingsForDate(bookingDay: Ymd): Promise<Booking[]>;
/**
 * Get all confirmed bookings in a date range
 */
export declare function getBookingsInRange(startDay: Ymd, endDay: Ymd): Promise<Booking[]>;
/**
 * Update the latest availability snapshot so a freshly booked slot stops showing
 * as available until the next scrape.
 */
export declare function markSlotAsBooked(bookingDay: Ymd, timeSlot: string): Promise<void>;
export { getSupabaseClient };
//# sourceMappingURL=supabaseClient.d.ts.map