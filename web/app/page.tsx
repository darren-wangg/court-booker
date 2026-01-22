'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Spinner from './components/Spinner'
import { useUsers } from './queries/useUsers'
import { useAvailability, useRefreshAvailability, useBookSlot, useBookings, DateInfo, UserBooking } from './queries/useAvailabilities'

// Parse a date string like "Saturday January 18, 2025" or "January 18, 2025"
function parseDateString(dateStr: string): Date | null {
  // Try direct parsing first
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return parsed
  }
  // Try removing day of week prefix
  const withoutDay = dateStr.replace(/^[A-Za-z]+\s+/, '')
  const parsed2 = new Date(withoutDay)
  if (!isNaN(parsed2.getTime())) {
    return parsed2
  }
  return null
}

// Check if a date string is in the past (before today)
function isPastDate(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const parsed = parseDateString(dateStr)
  if (parsed) {
    parsed.setHours(0, 0, 0, 0)
    return parsed < today
  }
  return false
}

// Check if a date string (e.g., "Saturday, January 18") is today
function isToday(dateStr: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const parsed = parseDateString(dateStr)
  if (parsed) {
    parsed.setHours(0, 0, 0, 0)
    return parsed.getTime() === today.getTime()
  }
  // Fallback: check if the date string contains today's month and day
  const todayFormatted = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  return dateStr.includes(today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })) ||
    dateStr === todayFormatted
}

export default function Home() {
  const [basketballAnimation, setBasketballAnimation] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [mobileCarouselIndex, setMobileCarouselIndex] = useState(0)

  // React Query hooks
  const { data: users, isLoading: isUsersLoading } = useUsers()
  const { data: availability, isLoading: isAvailabilityLoading, error: availabilityError } = useAvailability(selectedUserId)
  const { data: bookingsData } = useBookings(selectedUserId)
  const refreshMutation = useRefreshAvailability()
  const bookMutation = useBookSlot()

  // Booking state
  const hasBookingThisWeek = bookingsData?.hasBookingThisWeek || false
  const userBookingThisWeek = bookingsData?.userBookingThisWeek || null
  const allBookingsInRange = bookingsData?.allBookingsInRange || []

  // Helper to check if a slot is booked by someone
  const isSlotBooked = (dateStr: string, timeSlot: string): UserBooking | null => {
    const booking = allBookingsInRange.find(b => {
      // Parse the date from the availability format (e.g., "Saturday January 25, 2025")
      const bookingDateObj = new Date(b.booking_date)
      const parsedDate = parseDateString(dateStr)
      if (!parsedDate) return false

      return (
        bookingDateObj.toDateString() === parsedDate.toDateString() &&
        b.time_formatted === timeSlot
      )
    })
    return booking || null
  }

  // Check if a slot is the user's own booking
  const isMyBooking = (dateStr: string, timeSlot: string): boolean => {
    if (!userBookingThisWeek) return false
    const bookingDateObj = new Date(userBookingThisWeek.booking_date)
    const parsedDate = parseDateString(dateStr)
    if (!parsedDate) return false
    return (
      bookingDateObj.toDateString() === parsedDate.toDateString() &&
      userBookingThisWeek.time_formatted === timeSlot
    )
  }

  // Set initial user when users are loaded
  useEffect(() => {
    if (users && users.length > 0 && selectedUserId === null) {
      setSelectedUserId(users[0].id)
    }
  }, [users, selectedUserId])

  const triggerBasketballAnimation = (type: string) => {
    setBasketballAnimation(type)
    setTimeout(() => setBasketballAnimation(null), 800)
  }

  const handleRefresh = () => {
    triggerBasketballAnimation('bounce')
    const toastId = toast.loading('Fetching latest availability...')

    refreshMutation.mutate(selectedUserId, {
      onSuccess: () => {
        toast.success('Availability updated!', { id: toastId })
      },
      onError: (error) => {
        toast.error(`Failed to refresh: ${error.message}`, { id: toastId })
      },
    })
  }

  const handleBook = (date: string, timeSlot: string) => {
    // Check booking limit before attempting
    if (hasBookingThisWeek) {
      toast.error(`You already have a booking this week: ${userBookingThisWeek?.time_formatted} on ${new Date(userBookingThisWeek?.booking_date || '').toLocaleDateString()}`)
      return
    }

    triggerBasketballAnimation('shoot')
    const toastId = toast.loading('Booking court...')

    bookMutation.mutate(
      { date, time: timeSlot, userId: selectedUserId },
      {
        onSuccess: () => {
          toast.success(`Court booked for ${date} at ${timeSlot}! 🏀`, { id: toastId })
        },
        onError: (error) => {
          toast.error(`Booking failed: ${error.message}`, { id: toastId })
        },
      }
    )
  }

  // Loading state
  if (isUsersLoading || (selectedUserId !== null && isAvailabilityLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center items-center justify-center align-middle">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  // Error state
  if (availabilityError && !availability) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{availabilityError.message}</p>
          <button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // The availability object has dates at the root level
  // Filter out past dates (before today) to avoid showing stale data
  const dates = ((availability?.dates as DateInfo[]) || []).filter(d => !isPastDate(d.date))

  // Mobile carousel navigation
  const datesPerPage = 2
  const totalPages = Math.ceil(dates.length / datesPerPage)
  const canGoPrev = mobileCarouselIndex > 0
  const canGoNext = mobileCarouselIndex < totalPages - 1

  const handlePrevDates = () => {
    if (canGoPrev) {
      setMobileCarouselIndex(prev => prev - 1)
    }
  }

  const handleNextDates = () => {
    if (canGoNext) {
      setMobileCarouselIndex(prev => prev + 1)
    }
  }

  const visibleDates = dates.slice(
    mobileCarouselIndex * datesPerPage,
    (mobileCarouselIndex + 1) * datesPerPage
  )

  return (
    <main className="min-h-screen h-screen p-2 md:p-4 overflow-hidden bg-gray-100">
      {/* Basketball animation */}
      {basketballAnimation && (
        <div
          className={`basketball-${basketballAnimation}`}
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            fontSize: '48px',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          🏀
        </div>
      )}

      <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-4 md:px-6 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div className="flex justify-between items-center md:block">
            <div className="text-gray-600 text-xs md:text-sm">
              {availability && (
                <span className="hidden md:inline">Last checked on: {new Date(availability.checked_at).toLocaleString()}</span>
              )}
              {availability && (
                <span className="md:hidden">Last: {new Date(availability.checked_at).toLocaleTimeString()}</span>
              )}
            </div>
            <div className="text-gray-600 text-sm md:hidden">
              <span className="basketball-header">( っ&apos;-&apos;)╮ =͟͟͞͞🏀</span>
            </div>
          </div>
          <div className="hidden md:block text-gray-600 text-sm">
            <span className="basketball-header">( っ&apos;-&apos;)╮ =͟͟͞͞🏀</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            {users && users.length > 0 && (
              <select
                value={selectedUserId ?? ''}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshMutation.isPending}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshMutation.isPending ? 'Refreshing...' : 'Refresh Times'}
            </button>
          </div>
        </div>

        {/* User's booking banner */}
        {hasBookingThisWeek && userBookingThisWeek && (
          <div className="bg-green-50 border-l-4 border-green-500 p-3 md:p-4 mx-4 md:mx-6 mt-3 md:mt-4 rounded">
            <p className="text-green-800 text-sm font-medium">
              ✅ You have a booking this week: {userBookingThisWeek.time_formatted} on {new Date(userBookingThisWeek.booking_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-green-600 text-xs mt-1">Limit: 1 booking per week</p>
          </div>
        )}

        {/* Error banner */}
        {refreshMutation.error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4 rounded">
            <p className="text-red-700 text-sm">{refreshMutation.error.message}</p>
          </div>
        )}

        {/* Mobile Navigation Arrows */}
        <div className="md:hidden flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <button
            onClick={handlePrevDates}
            disabled={!canGoPrev}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 font-medium">
            {mobileCarouselIndex + 1} / {totalPages}
          </span>
          <button
            onClick={handleNextDates}
            disabled={!canGoNext}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Availability Grid */}
        {dates.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">No availability data found</p>
          </div>
        ) : (
          <>
            {/* Mobile: 2-column grid with carousel */}
            <div className="md:hidden flex-1 grid grid-cols-2 gap-3 p-4 overflow-auto">
              {visibleDates.map((dateInfo, idx) => {
                const availableSlots = dateInfo.available || []
                const isFullyBooked = availableSlots.length === 0
                const isSameDay = isToday(dateInfo.date)

                return (
                  <div key={mobileCarouselIndex * datesPerPage + idx} className={`flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${isSameDay ? 'opacity-75' : ''}`}>
                    <div className={`border-b px-3 py-2 text-center ${isSameDay ? 'bg-amber-50' : 'bg-gray-50'}`}>
                      <span className="text-xs font-semibold text-gray-900">{dateInfo.date}</span>
                      {isSameDay && <span className="block text-[10px] text-amber-600">Same-day booking unavailable</span>}
                    </div>

                    {isFullyBooked ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                        <div className="text-4xl mb-2">✕</div>
                        <p className="text-sm text-gray-500 font-medium">No availabilities</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto p-2 space-y-2">
                        {availableSlots.map((slot: string, slotIdx: number) => {
                          const myBooking = isMyBooking(dateInfo.date, slot)
                          const bookedBy = isSlotBooked(dateInfo.date, slot)
                          const canBook = !isSameDay && !hasBookingThisWeek && !bookedBy

                          return (
                            <div
                              key={slotIdx}
                              className={`flex flex-col gap-2 p-2 rounded-lg ${myBooking ? 'bg-green-100 border border-green-300' : bookedBy ? 'bg-gray-200' : 'bg-gray-50'}`}
                            >
                              <span className={`text-xs ${myBooking ? 'text-green-800 font-medium' : bookedBy ? 'text-gray-500' : 'text-gray-700'}`}>
                                {slot}
                                {myBooking && <span className="ml-1 text-green-600">(Your booking)</span>}
                                {bookedBy && !myBooking && <span className="ml-1 text-gray-400">(Booked)</span>}
                              </span>
                              {canBook && (
                                <button
                                  onClick={() => handleBook(dateInfo.date, slot)}
                                  disabled={bookMutation.isPending}
                                  className="w-7 h-7 rounded-lg transition disabled:opacity-50 bg-blue-500 hover:bg-blue-600 cursor-pointer flex items-center justify-center shrink-0 border-solid border-gray-100"
                                  title="Book this slot"
                                >
                                  🏀
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop: Original horizontal grid */}
            <div className="hidden md:grid md:gap-4 p-6 overflow-auto flex-1"
              style={{
                gridTemplateColumns: dates.length > 0
                  ? `repeat(${dates.length}, 1fr)`
                  : '1fr'
              }}>
              {dates.map((dateInfo, idx) => {
                const availableSlots = dateInfo.available || []
                const isFullyBooked = availableSlots.length === 0
                const isSameDay = isToday(dateInfo.date)

                return (
                  <div key={idx} className={`flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${isSameDay ? 'opacity-75' : ''}`}>
                    <div className={`border-b px-4 py-3 text-center ${isSameDay ? 'bg-amber-50' : 'bg-gray-50'}`}>
                      <span className="text-sm font-semibold text-gray-900">{dateInfo.date}</span>
                      {isSameDay && <span className="block text-xs text-amber-600">Same-day booking unavailable</span>}
                    </div>

                    {isFullyBooked ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-5xl mb-3">✕</div>
                        <p className="text-sm text-gray-500 font-medium">No availabilities</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto p-3 space-y-2">
                        {availableSlots.map((slot: string, slotIdx: number) => {
                          const myBooking = isMyBooking(dateInfo.date, slot)
                          const bookedBy = isSlotBooked(dateInfo.date, slot)
                          const canBook = !isSameDay && !hasBookingThisWeek && !bookedBy

                          return (
                            <div
                              key={slotIdx}
                              className={`flex justify-between items-center p-3 rounded-lg ${myBooking ? 'bg-green-100 border border-green-300' : bookedBy ? 'bg-gray-200' : 'bg-gray-50'}`}
                            >
                              <span className={`text-sm flex-1 ${myBooking ? 'text-green-800 font-medium' : bookedBy ? 'text-gray-500' : 'text-gray-700'}`}>
                                {slot}
                                {myBooking && <span className="ml-2 text-green-600 text-xs">(Your booking)</span>}
                                {bookedBy && !myBooking && <span className="ml-2 text-gray-400 text-xs">(Booked)</span>}
                              </span>
                              {canBook && (
                                <button
                                  onClick={() => handleBook(dateInfo.date, slot)}
                                  disabled={bookMutation.isPending}
                                  className="w-8 h-8 rounded-lg transition ml-2 bg-blue-500 hover:bg-blue-600 cursor-pointer flex items-center justify-center shrink-0 border-solid border-gray-100"
                                  title="Book this slot"
                                >
                                  🏀
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
