/**
 * POST /api/availability/refresh
 *
 * Enqueues an availability check and returns immediately with a job id. The
 * scrape drives a headless browser and takes tens of seconds; it runs
 * server-side so backgrounding or closing the tab doesn't abandon it.
 * Poll GET /api/jobs/{id} for the outcome.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ReservationChecker,
  saveAvailabilitySnapshot,
  createJob,
  findActiveJob,
  runJob,
} from '@court-booker/shared';
import { runInBackground } from '@/lib/background';

// Force dynamic to prevent static optimization
export const dynamic = 'force-dynamic';

// Max duration for Vercel serverless function (in seconds)
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Verify API secret if provided
    const apiSecret = request.headers.get('x-api-secret');
    const expectedSecret = process.env.API_SECRET_KEY;

    if (expectedSecret && apiSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // An empty body is fine here — userId is optional.
      body = {};
    }

    const userId = body.userId ?? null;

    // A refresh already running will produce the same snapshot; point the client
    // at it instead of starting a second browser session.
    const inFlight = await findActiveJob('refresh', userId);
    if (inFlight) {
      return NextResponse.json(
        {
          success: true,
          jobId: inFlight.id,
          status: inFlight.status,
          alreadyRunning: true,
          message: 'A refresh is already in progress',
        },
        { status: 202 }
      );
    }

    const job = await createJob('refresh', userId, {});

    runInBackground(
      runJob(job.id, async () => {
        console.log(`🔍 Checking availability for user: ${userId || 'default'}`);

        const checker = new ReservationChecker(userId);
        const result = await checker.checkAvailability();

        try {
          await saveAvailabilitySnapshot(result, 'api', userId);
          console.log('✅ Availability saved to Supabase');
        } catch (supabaseError: any) {
          // The check itself succeeded; surface the save failure without
          // discarding the data we just gathered.
          console.error('⚠️  Failed to save to Supabase:', supabaseError.message);
          return { ...result, persisted: false, warning: supabaseError.message };
        }

        return { ...result, persisted: true };
      })
    );

    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: job.status,
        message: 'Availability check started',
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('❌ Could not start availability check:', error);
    return NextResponse.json(
      { error: 'Failed to start refresh', details: error.message },
      { status: 500 }
    );
  }
}
