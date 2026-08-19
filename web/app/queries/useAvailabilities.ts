'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Ymd } from '@/lib/dates'

export type UnbookableReason = 'past' | 'same-day' | 'site-rolled-over' | null

export interface DateInfo {
  /** The calendar day this column is, "YYYY-MM-DD". Authoritative. */
  ymd: Ymd;
  /** Human label, e.g. "Friday August 21, 2026". Display only. */
  date: string;
  available: string[];
  booked?: string[];
  totalSlots?: number;
  checkedAt?: string;
  error?: string;
  /** True when this day's numbers came from an older snapshot — see the API route. */
  isHistorical?: boolean;
  historicalFrom?: string;
  /** Decided server-side so every client agrees on what can still be reserved. */
  bookable?: boolean;
  unbookable?: UnbookableReason;
}

export interface AvailabilityMeta {
  timezone: string;
  siteTimezone: string;
  /** Today in the app's timezone. */
  today: Ymd;
  /** Today on the booking site — a day ahead between 9 PM and midnight Pacific. */
  courtToday: Ymd;
}

export interface AvailabilityData {
  id?: string;
  user_id?: number;
  dates: DateInfo[];
  checked_at: string;
  success?: boolean;
}

interface AvailabilityResponse {
  success: boolean;
  data: AvailabilityData;
  meta: AvailabilityMeta;
  error?: string;
  details?: string;
}

export interface UserBooking {
  id: string;
  user_id: number;
  user_email: string;
  /** Calendar day, "YYYY-MM-DD". Never parse this with `new Date()`. */
  booking_date: Ymd;
  start_hour: number;
  end_hour: number;
  time_formatted: string;
  week_start: Ymd;
  status: string;
}

export interface BookingsResponse {
  success: boolean;
  timezone: string;
  today: Ymd;
  range: { start: Ymd; end: Ymd };
  /** This user's booking per week, keyed by the Monday of that week. */
  bookingsByWeek: Record<string, UserBooking | null>;
  userBookingThisWeek: UserBooking | null;
  hasBookingThisWeek: boolean;
  allBookingsInRange: UserBooking[];
  error?: string;
}

export interface AvailabilityResult {
  data: AvailabilityData;
  meta: AvailabilityMeta;
}

async function fetchAvailability(userId: number | null): Promise<AvailabilityResult> {
  const params = userId ? `?userId=${userId}` : ''
  const response = await fetch(`/api/availability/latest${params}`, { cache: 'no-store' })
  const result: AvailabilityResponse = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.details || result.error || 'Failed to fetch availability')
  }

  return { data: result.data, meta: result.meta }
}

async function fetchBookings(userId: number | null): Promise<BookingsResponse> {
  if (!userId) {
    return {
      success: true,
      timezone: '',
      today: '' as Ymd,
      range: { start: '' as Ymd, end: '' as Ymd },
      bookingsByWeek: {},
      userBookingThisWeek: null,
      hasBookingThisWeek: false,
      allBookingsInRange: [],
    }
  }

  const response = await fetch(`/api/bookings?userId=${userId}`, { cache: 'no-store' })
  const result: BookingsResponse = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to fetch bookings')
  }

  return result
}

export function useAvailability(userId: number | null) {
  return useQuery({
    queryKey: ['availability', userId],
    queryFn: () => fetchAvailability(userId),
    enabled: userId !== null,
    // Bookability depends on the wall clock (the court day rolls over at 9 PM
    // Pacific), so this data goes stale on its own even when nothing changed.
    staleTime: 60 * 1000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  })
}

export function useBookings(userId: number | null) {
  return useQuery({
    queryKey: ['bookings', userId],
    queryFn: () => fetchBookings(userId),
    enabled: userId !== null,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  })
}

/** Pull fresh availability and bookings, e.g. once a background job finishes. */
export function useRefetchAll() {
  const queryClient = useQueryClient()
  return (userId: number | null) => {
    queryClient.invalidateQueries({ queryKey: ['availability', userId] })
    queryClient.invalidateQueries({ queryKey: ['bookings', userId] })
  }
}
