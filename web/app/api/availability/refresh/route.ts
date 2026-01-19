/**
 * POST /api/availability/refresh
 * Triggers a new availability check directly using ReservationChecker
 * Now runs serverless with Browserless.io (no DigitalOcean needed!)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ReservationChecker, saveAvailabilitySnapshot } from '@court-booker/shared';

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify API secret if provided
    const apiSecret = request.headers.get('x-api-secret');
    const expectedSecret = process.env.API_SECRET_KEY;

    if (expectedSecret && apiSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userId = body.userId || null;

    console.log(`🔍 Triggering availability check for user: ${userId || 'default'}`);

    // Run availability check directly via ReservationChecker
    const checker = new ReservationChecker(userId);
    const result = await checker.checkAvailability();

    // Save to Supabase
    try {
      await saveAvailabilitySnapshot(result, 'api', userId);
      console.log('✅ Availability saved to Supabase');
    } catch (supabaseError: any) {
      console.error('⚠️  Failed to save to Supabase:', supabaseError.message);
      // Continue anyway - the check succeeded
    }

    return NextResponse.json({
      success: true,
      message: 'Availability check completed',
      data: result,
    });

  } catch (error: any) {
    console.error('❌ Availability check failed:', error);
    return NextResponse.json(
      { error: 'Failed to trigger refresh', details: error.message },
      { status: 500 }
    );
  }
}
