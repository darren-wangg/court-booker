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

export { getSupabaseClient };
