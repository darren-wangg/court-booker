/**
 * Durable background jobs.
 *
 * Refreshing availability and placing a booking both drive a headless browser and
 * take tens of seconds. They used to run inside the HTTP request the browser made,
 * so backgrounding the tab or closing the screen tore down the client's view of
 * the work — and on a phone, often the request itself.
 *
 * Now the request only *enqueues*: it writes a row here, kicks the real work off
 * on the server, and returns immediately. The work runs to completion regardless
 * of what the tab does, and the client (this tab, a later tab, another device)
 * catches up by polling the row.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

export type JobType = 'refresh' | 'booking';
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface Job {
  id: string;
  created_at: string;
  updated_at: string;
  type: JobType;
  status: JobStatus;
  user_id: number | null;
  payload: any;
  result: any;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
}

/** Statuses that mean the job is done and will never change again. */
export const TERMINAL_STATUSES: JobStatus[] = ['succeeded', 'failed'];

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL_STATUSES.indexOf(status) !== -1;
}

/**
 * A job stuck in queued/running for longer than this is assumed dead — the
 * serverless invocation that owned it was killed before it could record an
 * outcome. Comfortably longer than the 300s function ceiling.
 */
export const STALE_JOB_MS = 8 * 60 * 1000;

export function isStale(job: Pick<Job, 'status' | 'created_at'>, now: Date = new Date()): boolean {
  if (isTerminal(job.status)) return false;
  return now.getTime() - new Date(job.created_at).getTime() > STALE_JOB_MS;
}

function client(): SupabaseClient {
  return getSupabaseClient();
}

export async function createJob(
  type: JobType,
  userId: number | null,
  payload: any = {}
): Promise<Job> {
  const { data, error } = await client()
    .from('jobs')
    .insert({ type, user_id: userId, payload, status: 'queued' })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating job:', error);
    throw error;
  }
  return data as Job;
}

export async function getJob(id: string): Promise<Job | null> {
  const { data, error } = await client().from('jobs').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('❌ Error fetching job:', error);
    throw error;
  }
  return data as Job;
}

async function updateJob(id: string, patch: Partial<Job>): Promise<void> {
  const { error } = await client()
    .from('jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('❌ Error updating job:', error);
    throw error;
  }
}

export async function markRunning(id: string): Promise<void> {
  await updateJob(id, { status: 'running', started_at: new Date().toISOString() });
}

export async function markSucceeded(id: string, result: any): Promise<void> {
  await updateJob(id, {
    status: 'succeeded',
    result,
    error: null,
    finished_at: new Date().toISOString(),
  });
}

export async function markFailed(id: string, message: string, result: any = null): Promise<void> {
  await updateJob(id, {
    status: 'failed',
    error: message,
    result,
    finished_at: new Date().toISOString(),
  });
}

/**
 * Jobs a returning client needs to know about: anything still in flight, plus
 * recent finished ones so a booking that completed while the tab was closed
 * still gets reported when the user comes back.
 */
export async function listRecentJobs(
  userId: number | null,
  options: { type?: JobType; sinceMs?: number; limit?: number } = {}
): Promise<Job[]> {
  const sinceMs = options.sinceMs ?? 6 * 60 * 60 * 1000;
  const since = new Date(Date.now() - sinceMs).toISOString();

  let query = client()
    .from('jobs')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 20);

  if (options.type) query = query.eq('type', options.type);
  // Refresh jobs are global (they update the shared snapshot), so a null user_id
  // job is relevant to everyone.
  if (userId !== null && userId !== undefined) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('❌ Error listing jobs:', error);
    throw error;
  }
  return (data || []) as Job[];
}

/**
 * An unfinished, not-yet-stale job of this type for this user, if one exists.
 * Used to keep a double-tap (or a reload followed by another tap) from starting
 * a second booking run for the same person.
 */
export async function findActiveJob(type: JobType, userId: number | null): Promise<Job | null> {
  let query = client()
    .from('jobs')
    .select('*')
    .eq('type', type)
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(5);

  if (userId === null || userId === undefined) {
    query = query.is('user_id', null);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('❌ Error checking for active job:', error);
    throw error;
  }

  const live = (data || []).filter((job: Job) => !isStale(job));
  return live.length > 0 ? (live[0] as Job) : null;
}

/**
 * Flip abandoned jobs to failed so the UI stops showing a spinner forever for
 * work whose serverless invocation died without recording an outcome.
 */
export async function reapStaleJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_JOB_MS).toISOString();

  const { data, error } = await client()
    .from('jobs')
    .update({
      status: 'failed',
      error: 'Timed out — the server run ended before it reported a result.',
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('status', ['queued', 'running'])
    .lt('created_at', cutoff)
    .select('id');

  if (error) {
    console.error('⚠️ Error reaping stale jobs:', error);
    return 0;
  }
  return (data || []).length;
}

/**
 * Run `work` to completion server-side, recording the outcome on the job row.
 * Never rejects: a job's failure is data, not an exception for the caller.
 */
export async function runJob<T>(jobId: string, work: () => Promise<T>): Promise<void> {
  try {
    await markRunning(jobId);
    const result = await work();
    await markSucceeded(jobId, result);
  } catch (err: any) {
    const message = err?.message || String(err);
    console.error(`❌ Job ${jobId} failed:`, message);
    try {
      await markFailed(jobId, message);
    } catch (recordErr: any) {
      console.error(`❌ Could not record failure for job ${jobId}:`, recordErr?.message);
    }
  }
}
