"use strict";
/**
 * Supabase client helper for Court Booker
 * Handles database operations for availability snapshots
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveAvailabilitySnapshot = saveAvailabilitySnapshot;
exports.getLatestSnapshot = getLatestSnapshot;
exports.getRecentSnapshots = getRecentSnapshots;
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
//# sourceMappingURL=supabaseClient.js.map