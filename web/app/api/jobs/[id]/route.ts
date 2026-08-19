/**
 * GET /api/jobs/{id}
 *
 * Status of a single background job. Clients poll this while a refresh or
 * booking runs; because the work lives on the server, polling can stop and
 * resume freely — including from a different tab, or after a reload.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJob, isStale, isTerminal } from '@court-booker/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const job = await getJob(params.id);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Report an abandoned job as failed rather than leaving the client polling
    // a run that no longer exists.
    if (isStale(job)) {
      return NextResponse.json(
        {
          success: true,
          job: {
            ...job,
            status: 'failed',
            error: 'Timed out — the server run ended before it reported a result.',
          },
          done: true,
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    return NextResponse.json(
      { success: true, job, done: isTerminal(job.status) },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('❌ Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job', details: error.message },
      { status: 500 }
    );
  }
}
