'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Background jobs.
 *
 * Refreshes and bookings run on the server, not inside the request the browser
 * made, so this hook's job is only to observe them. Polling can stop and restart
 * freely — when the tab is hidden, when it is closed and reopened, when the user
 * switches device — and the outcome is still waiting on the server.
 */

export type JobType = 'refresh' | 'booking'
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface Job {
  id: string
  created_at: string
  updated_at: string
  type: JobType
  status: JobStatus
  user_id: number | null
  payload: any
  result: any
  error: string | null
  started_at: string | null
  finished_at: string | null
}

export interface StartJobResponse {
  success: boolean
  jobId: string
  status: JobStatus
  alreadyRunning?: boolean
  message?: string
  label?: string
  time?: string
  error?: string
  details?: string
}

export function isTerminal(status: JobStatus): boolean {
  return status === 'succeeded' || status === 'failed'
}

export function isActive(job: Job): boolean {
  return !isTerminal(job.status)
}

/** How often to re-check while something is running. */
const ACTIVE_POLL_MS = 2500

async function fetchJobs(userId: number | null): Promise<Job[]> {
  if (userId === null) return []

  const response = await fetch(`/api/jobs?userId=${userId}`, { cache: 'no-store' })
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to load background jobs')
  }
  return result.jobs as Job[]
}

/**
 * Recent jobs for this user, polled while any of them is still running.
 *
 * `refetchOnWindowFocus` is what makes returning to a backgrounded tab feel
 * instant, and `refetchOnMount` is what lets a freshly opened tab discover a
 * booking that finished while the app wasn't running at all.
 */
export function useJobs(userId: number | null) {
  return useQuery({
    queryKey: ['jobs', userId],
    queryFn: () => fetchJobs(userId),
    enabled: userId !== null,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    refetchInterval: (query) => {
      const jobs = (query.state.data as Job[] | undefined) ?? []
      return jobs.some(isActive) ? ACTIVE_POLL_MS : false
    },
  })
}

async function startRefresh(userId: number | null): Promise<StartJobResponse> {
  const response = await fetch('/api/availability/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    // Let the request complete even if the page is being torn down.
    keepalive: true,
  })

  const result: StartJobResponse = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.details || result.error || 'Failed to start refresh')
  }
  return result
}

export interface StartBookingInput {
  date: string
  time: string
  userId: number | null
}

async function startBooking(input: StartBookingInput): Promise<StartJobResponse> {
  const response = await fetch('/api/booking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    keepalive: true,
  })

  const result: StartJobResponse = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.details || result.error || 'Booking failed to start')
  }
  return result
}

/**
 * Kick off a refresh. Resolves as soon as the server has accepted the job — not
 * when the scrape finishes. Watch `useJobs` for that.
 */
export function useStartRefresh() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startRefresh,
    onSettled: (_data, _error, userId) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', userId] })
    },
  })
}

/** Kick off a booking. Same contract as `useStartRefresh`. */
export function useStartBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startBooking,
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', variables.userId] })
    },
  })
}

/** The most recent job of a type, or null. Jobs arrive newest-first. */
export function latestJob(jobs: Job[] | undefined, type: JobType): Job | null {
  if (!jobs) return null
  return jobs.find((job) => job.type === type) ?? null
}

/** Is a job of this type currently running? */
export function hasActiveJob(jobs: Job[] | undefined, type: JobType): boolean {
  return (jobs ?? []).some((job) => job.type === type && isActive(job))
}
