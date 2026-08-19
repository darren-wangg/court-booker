/**
 * GET /api/jobs?userId=1&type=booking
 *
 * Recent and in-flight jobs for a user. This is how a client that was closed
 * mid-run catches up: on load it asks what happened while it was away, rather
 * than depending on a fetch it can no longer see the end of.
 *
 * Query params:
 * - userId: filter to this user (jobs with no user, e.g. cron refreshes, are always included)
 * - type:   'refresh' | 'booking' (optional)
 * - sinceMinutes: how far back to look (default 360)
 */

import { NextRequest, NextResponse } from 'next/server';
import { listRecentJobs, reapStaleJobs, JobType } from '@court-booker/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_TYPES: JobType[] = ['refresh', 'booking'];

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const userIdParam = params.get('userId');
    const typeParam = params.get('type');
    const sinceParam = params.get('sinceMinutes');

    let userId: number | null = null;
    if (userIdParam) {
      userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return NextResponse.json(
          { error: 'Invalid userId: must be a number' },
          { status: 400 }
        );
      }
    }

    if (typeParam && !VALID_TYPES.includes(typeParam as JobType)) {
      return NextResponse.json(
        { error: `Invalid type: expected one of ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const sinceMinutes = sinceParam ? parseInt(sinceParam) : 360;
    if (isNaN(sinceMinutes) || sinceMinutes <= 0) {
      return NextResponse.json(
        { error: 'Invalid sinceMinutes: must be a positive number' },
        { status: 400 }
      );
    }

    // Close out anything whose serverless run died without reporting, so the UI
    // doesn't spin forever on work that will never finish.
    await reapStaleJobs();

    const jobs = await listRecentJobs(userId, {
      type: (typeParam as JobType) || undefined,
      sinceMs: sinceMinutes * 60 * 1000,
    });

    return NextResponse.json(
      { success: true, jobs },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('❌ Error listing jobs:', error);
    return NextResponse.json(
      { error: 'Failed to list jobs', details: error.message },
      { status: 500 }
    );
  }
}
