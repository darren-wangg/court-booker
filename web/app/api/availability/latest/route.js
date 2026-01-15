/**
 * GET /api/availability/latest
 * Returns the most recent availability snapshot from Supabase
 */

import { createServerClient } from '@/lib/supabase';

export async function GET(request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')) : null;

    let query = supabase
      .from('availability_snapshots')
      .select('*')
      .eq('success', true)
      .order('checked_at', { ascending: false })
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return Response.json(
          { error: 'No availability data found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return Response.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('Error fetching latest availability:', error);
    return Response.json(
      { error: 'Failed to fetch availability data', details: error.message },
      { status: 500 }
    );
  }
}
