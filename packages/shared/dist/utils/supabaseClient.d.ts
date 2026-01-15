/**
 * Supabase client helper for Court Booker
 * Handles database operations for availability snapshots
 */
import { SupabaseClient } from '@supabase/supabase-js';
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
export { getSupabaseClient };
//# sourceMappingURL=supabaseClient.d.ts.map