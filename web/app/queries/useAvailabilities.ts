'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface DateInfo {
  date: string;
  available: string[];
  booked?: string[];
  totalSlots?: number;
  checkedAt?: string;
  error?: string;
}

export interface AvailabilityData {
  id?: string;
  user_id?: number;
  data: {
    dates: DateInfo[];
    totalAvailableSlots?: number;
    checkedAt?: string;
    success?: boolean;
  };
  dates: DateInfo[]; // Also at root level from Supabase
  checked_at: string;
  success?: boolean;
}

interface AvailabilityResponse {
  success: boolean;
  data: AvailabilityData;
  error?: string;
}

interface RefreshResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface BookingRequest {
  date: string;
  time: string;
  userId: number | null;
}

interface BookingResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface UserBooking {
  id: string;
  user_id: number;
  user_email: string;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  time_formatted: string;
  week_start: string;
  status: string;
}

interface BookingsResponse {
  success: boolean;
  userBookingThisWeek: UserBooking | null;
  hasBookingThisWeek: boolean;
  allBookingsInRange: UserBooking[];
  error?: string;
}

async function fetchAvailability(userId: number | null): Promise<AvailabilityData> {
  const params = userId ? `?userId=${userId}` : ''
  const response = await fetch(`/api/availability/latest${params}`)
  const result: AvailabilityResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch availability')
  }

  return result.data
}

async function refreshAvailability(userId: number | null): Promise<RefreshResponse> {
  const response = await fetch('/api/availability/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })

  const result: RefreshResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to trigger refresh')
  }

  return result
}

async function fetchBookings(userId: number | null): Promise<BookingsResponse> {
  if (!userId) {
    return {
      success: true,
      userBookingThisWeek: null,
      hasBookingThisWeek: false,
      allBookingsInRange: [],
    }
  }

  const response = await fetch(`/api/bookings?userId=${userId}`)
  const result: BookingsResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch bookings')
  }

  return result
}

async function bookSlot(request: BookingRequest): Promise<BookingResponse> {
  const response = await fetch('/api/booking', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      date: request.date,
      time: request.time,
      userId: request.userId,
    }),
  })

  const result: BookingResponse = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Booking failed')
  }

  return result
}

export function useAvailability(userId: number | null) {
  return useQuery({
    queryKey: ['availability', userId],
    queryFn: () => fetchAvailability(userId),
    enabled: userId !== null,
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useRefreshAvailability() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: refreshAvailability,
    onSuccess: (_, userId) => {
      // Invalidate and refetch availability after a delay (to allow the refresh to complete)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['availability', userId] })
      }, 2000)
    },
  })
}

export function useBookings(userId: number | null) {
  return useQuery({
    queryKey: ['bookings', userId],
    queryFn: () => fetchBookings(userId),
    enabled: userId !== null,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useBookSlot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bookSlot,
    onSuccess: (_, variables) => {
      // Invalidate availability and bookings after booking
      queryClient.invalidateQueries({ queryKey: ['availability', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['bookings', variables.userId] })
    },
  })
}
