/**
 * GET /api/availability/latest
 * Returns the most recent availability snapshot from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam) : null;

    let query = supabase
      .from('availability_snapshots')
      .select('*')
      .eq('success', true)
      .gt('total_available_slots', -1) // Exclude fallback mode (which has 0 slots but we want to include legitimate 0s)
      .order('created_at', { ascending: false });

    if (userId) {
      // Include rows with matching user_id OR null (CLI saves with null)
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    
    query = query.limit(1);

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return NextResponse.json(
          { error: 'No availability data found' },
          { status: 404 }
        );
      }
      throw error;
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
