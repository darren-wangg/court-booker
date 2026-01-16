/**
 * GET /api/availability/latest
 * Returns the most recent availability snapshot from Supabase
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

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
      .order('checked_at', { ascending: false })
      .limit(1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

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

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching latest availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch availability data', details: message },
      { status: 500 }
    );
  }
}
