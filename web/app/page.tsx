'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import Spinner from './components/Spinner'
import { useUsers } from './queries/useUsers'
import {
  useAvailability,
  useBookings,
  useRefetchAll,
  DateInfo,
  UserBooking,
} from './queries/useAvailabilities'
import {
  useJobs,
  useStartRefresh,
  useStartBooking,
  hasActiveJob,
  isTerminal,
  Job,
} from './queries/useJobs'
import { formatFriendly, formatInstant, weekStartOf, Ymd } from '@/lib/dates'

/**
 * Days, bookings and columns are all keyed by a "YYYY-MM-DD" string that the
 * server produced. Nothing here parses a date out of a display string or builds
 * a Date to compare days with — that is what used to make bookings render a day
 * off from what was actually reserved.
 */

/** Jobs whose outcome the user has already been told about. */
const ANNOUNCED_JOBS_KEY = 'court-booker:announced-jobs'

function loadAnnouncedJobs(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = JSON.parse(window.localStorage.getItem(ANNOUNCED_JOBS_KEY) || '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

function saveAnnouncedJobs(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    // Keep the list bounded; only recent jobs are ever re-reported.
    window.localStorage.setItem(ANNOUNCED_JOBS_KEY, JSON.stringify(Array.from(ids).slice(-50)))
  } catch {
    // Private browsing or a full quota — worst case a result is announced twice.
  }
}

function unbookableLabel(dateInfo: DateInfo): string | null {
  switch (dateInfo.unbookable) {
    case 'same-day':
      return 'Same-day booking unavailable'
    case 'site-rolled-over':
      return 'Court day has rolled over'
    case 'past':
      return 'Already passed'
    default:
      return null
  }
}

function describeJob(job: Job): string {
  if (job.type === 'refresh') return 'Checking availability'
  const label = job.payload?.label ? formatFriendly(job.payload.day) : 'a court'
  const time = job.payload?.time?.formatted ? ` at ${job.payload.time.formatted}` : ''
  return `Booking ${label}${time}`
}

export default function Home() {
  const [basketballAnimation, setBasketballAnimation] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [mobileCarouselIndex, setMobileCarouselIndex] = useState(0)

  // React Query hooks
  const { data: users, isLoading: isUsersLoading } = useUsers()
  const {
    data: availability,
    isLoading: isAvailabilityLoading,
    error: availabilityError,
  } = useAvailability(selectedUserId)
  const { data: bookingsData } = useBookings(selectedUserId)
  const { data: jobs } = useJobs(selectedUserId)
  const refetchAll = useRefetchAll()

  const startRefresh = useStartRefresh()
  const startBooking = useStartBooking()

  const announcedRef = useRef<Set<string> | null>(null)
  if (announcedRef.current === null) announcedRef.current = loadAnnouncedJobs()

  // Booking state
  const hasBookingThisWeek = bookingsData?.hasBookingThisWeek || false
  const userBookingThisWeek = bookingsData?.userBookingThisWeek || null
  const allBookingsInRange = bookingsData?.allBookingsInRange || []
  const bookingsByWeek = bookingsData?.bookingsByWeek || {}

  const refreshRunning = hasActiveJob(jobs, 'refresh')
  const bookingRunning = hasActiveJob(jobs, 'booking')
  const activeJobs = (jobs ?? []).filter((job) => !isTerminal(job.status))

  /**
   * Report jobs that finished, including ones that finished while this tab was
   * closed. The server is the record of what happened, so a completed booking
   * still gets announced the next time the app is opened — exactly once.
   */
  useEffect(() => {
    if (!jobs?.length) return

    const announced = announcedRef.current!
    let sawNew = false

    for (const job of jobs) {
      if (!isTerminal(job.status) || announced.has(job.id)) continue

      announced.add(job.id)
      sawNew = true

      if (job.type === 'booking') {
        if (job.status === 'succeeded') {
          const day = job.payload?.day as Ymd | undefined
          const time = job.payload?.time?.formatted
          toast.success(
            day ? `Court booked for ${formatFriendly(day)} at ${time}! 🏀` : 'Court booked! 🏀',
            { id: `job-${job.id}` }
          )
          if (job.result?.persisted === false && job.result?.warning) {
            toast.warning(job.result.warning, { id: `job-warn-${job.id}`, duration: 10000 })
          }
        } else {
          toast.error(`Booking failed: ${job.error || 'unknown error'}`, {
            id: `job-${job.id}`,
            duration: 10000,
          })
        }
      } else if (job.type === 'refresh') {
        if (job.status === 'succeeded') {
          toast.success('Availability updated!', { id: `job-${job.id}` })
        } else {
          toast.error(`Refresh failed: ${job.error || 'unknown error'}`, {
            id: `job-${job.id}`,
            duration: 10000,
          })
        }
      }
    }

    if (sawNew) {
      saveAnnouncedJobs(announced)
      refetchAll(selectedUserId)
    }
  }, [jobs, selectedUserId, refetchAll])

  // Set initial user when users are loaded
  useEffect(() => {
    if (users && users.length > 0 && selectedUserId === null) {
      setSelectedUserId(users[0].id)
    }
  }, [users, selectedUserId])

  const dates: DateInfo[] = availability?.data?.dates ?? []
  const meta = availability?.meta

  // Between 9 PM and midnight Pacific the booking site has already moved to the
  // next day, so days the user still thinks of as bookable are not.
  const courtDayAhead = !!meta && meta.courtToday !== meta.today

  // Keep the carousel in range when the window shrinks (e.g. a day rolls off).
  const datesPerPage = 2
  const totalPages = Math.max(1, Math.ceil(dates.length / datesPerPage))
  useEffect(() => {
    if (mobileCarouselIndex > totalPages - 1) setMobileCarouselIndex(totalPages - 1)
  }, [totalPages, mobileCarouselIndex])

  /** Who has this slot, if anyone. Compared as calendar days, never as Dates. */
  const slotBookedBy = (ymd: Ymd, timeSlot: string): UserBooking | null =>
    allBookingsInRange.find((b) => b.booking_date === ymd && b.time_formatted === timeSlot) ?? null

  const isMyBooking = (ymd: Ymd, timeSlot: string): boolean => {
    const booking = slotBookedBy(ymd, timeSlot)
    return !!booking && booking.user_id === selectedUserId
  }

  /**
   * The one-per-week limit applies to the week the day falls in, not to whatever
   * week it happens to be right now — an 8-day grid always spans two weeks.
   */
  const bookingForWeekOf = (ymd: Ymd): UserBooking | null => {
    try {
      return bookingsByWeek[weekStartOf(ymd)] ?? null
    } catch {
      return null
    }
  }

  const triggerBasketballAnimation = (type: string) => {
    setBasketballAnimation(type)
    setTimeout(() => setBasketballAnimation(null), 800)
  }

  const handleRefresh = () => {
    if (refreshRunning) {
      toast.info('A refresh is already running — it will finish on its own.')
      return
    }
    triggerBasketballAnimation('bounce')

    startRefresh.mutate(selectedUserId, {
      onSuccess: (result) => {
        toast.success(
          result.alreadyRunning
            ? 'A refresh was already running.'
            : "Checking availability — this keeps running if you leave.",
          { id: 'refresh-start' }
        )
      },
      onError: (error) => {
        toast.error(`Could not start refresh: ${error.message}`, { id: 'refresh-start' })
      },
    })
  }

  const handleBook = (dateInfo: DateInfo, timeSlot: string) => {
    if (bookingRunning) {
      toast.info('A booking is already in progress.')
      return
    }
    triggerBasketballAnimation('shoot')

    startBooking.mutate(
      { date: dateInfo.ymd, time: timeSlot, userId: selectedUserId },
      {
        onSuccess: (result) => {
          toast.success(
            result.alreadyRunning
              ? 'A booking was already in progress.'
              : `Booking ${formatFriendly(dateInfo.ymd)} at ${timeSlot} — you can close this tab.`,
            { id: 'booking-start' }
          )
        },
        onError: (error) => {
          toast.error(`Booking failed: ${error.message}`, { id: 'booking-start', duration: 10000 })
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

  const canGoPrev = mobileCarouselIndex > 0
  const canGoNext = mobileCarouselIndex < totalPages - 1

  const handlePrevDates = () => {
    if (canGoPrev) setMobileCarouselIndex((prev) => prev - 1)
  }

  const handleNextDates = () => {
    if (canGoNext) setMobileCarouselIndex((prev) => prev + 1)
  }

  const visibleDates = dates.slice(
    mobileCarouselIndex * datesPerPage,
    (mobileCarouselIndex + 1) * datesPerPage
  )

  /** One day column, shared by the mobile and desktop grids. */
  const renderDateCard = (dateInfo: DateInfo, variant: 'mobile' | 'desktop') => {
    const compact = variant === 'mobile'
    const availableSlots = dateInfo.available || []
    const isFullyBooked = availableSlots.length === 0
    const bookable = dateInfo.bookable !== false
    const badge = unbookableLabel(dateInfo)
    const weekBooking = bookingForWeekOf(dateInfo.ymd)

    return (
      <div
        className={`flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${
          bookable ? '' : 'opacity-75'
        }`}
      >
        <div
          className={`border-b text-center ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${
            bookable ? 'bg-gray-50' : 'bg-amber-50'
          }`}
        >
          <span className={`font-semibold text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
            {dateInfo.date}
          </span>
          {badge && (
            <span className={`block text-amber-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {badge}
            </span>
          )}
          {dateInfo.isHistorical && (
            <span className={`block text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>
              Last known times
            </span>
          )}
        </div>

        {isFullyBooked ? (
          <div className={`flex-1 flex flex-col items-center justify-center text-center ${compact ? 'p-4' : 'p-6'}`}>
            <div className={compact ? 'text-4xl mb-2' : 'text-5xl mb-3'}>✕</div>
            <p className="text-sm text-gray-500 font-medium">No availabilities</p>
          </div>
        ) : (
          <div className={`flex-1 overflow-auto space-y-2 ${compact ? 'p-2' : 'p-3'}`}>
            {availableSlots.map((slot: string, slotIdx: number) => {
              const bookedBy = slotBookedBy(dateInfo.ymd, slot)
              const mine = isMyBooking(dateInfo.ymd, slot)
              const canBook = bookable && !bookedBy && !weekBooking && !bookingRunning

              return (
                <div
                  key={slotIdx}
                  className={`rounded-lg ${
                    compact ? 'flex flex-col gap-2 p-2' : 'flex justify-between items-center p-3'
                  } ${
                    mine
                      ? 'bg-green-100 border border-green-300'
                      : bookedBy
                      ? 'bg-gray-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`${compact ? 'text-xs' : 'text-sm flex-1'} ${
                      mine ? 'text-green-800 font-medium' : bookedBy ? 'text-gray-500' : 'text-gray-700'
                    }`}
                  >
                    {slot}
                    {mine && (
                      <span className={`text-green-600 ${compact ? 'ml-1' : 'ml-2 text-xs'}`}>
                        (Your booking)
                      </span>
                    )}
                    {bookedBy && !mine && (
                      <span className={`text-gray-400 ${compact ? 'ml-1' : 'ml-2 text-xs'}`}>
                        (Booked)
                      </span>
                    )}
                  </span>
                  {canBook && (
                    <button
                      onClick={() => handleBook(dateInfo, slot)}
                      disabled={startBooking.isPending || bookingRunning}
                      className={`rounded-lg transition disabled:opacity-50 bg-blue-500 hover:bg-blue-600 cursor-pointer flex items-center justify-center shrink-0 border-solid border-gray-100 ${
                        compact ? 'w-7 h-7' : 'w-8 h-8 ml-2'
                      }`}
                      title={`Book ${formatFriendly(dateInfo.ymd)} at ${slot}`}
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
  }

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
                <>
                  <span className="hidden md:inline">
                    Last checked on: {formatInstant(availability.data.checked_at)}
                  </span>
                  <span className="md:hidden">
                    Last: {formatInstant(availability.data.checked_at, { timeStyle: 'short' })}
                  </span>
                </>
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
              disabled={startRefresh.isPending || refreshRunning}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshRunning || startRefresh.isPending ? 'Refreshing...' : 'Refresh Times'}
            </button>
          </div>
        </div>

        {/* Work running on the server. Survives this tab closing. */}
        {activeJobs.length > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 md:p-4 mx-4 md:mx-6 mt-3 md:mt-4 rounded">
            {activeJobs.map((job) => (
              <p key={job.id} className="text-blue-800 text-sm font-medium flex items-center gap-2">
                <Spinner size="sm" />
                {describeJob(job)}… running on the server — safe to switch tabs or close this.
              </p>
            ))}
          </div>
        )}

        {/* User's booking banner */}
        {hasBookingThisWeek && userBookingThisWeek && (
          <div className="bg-green-50 border-l-4 border-green-500 p-3 md:p-4 mx-4 md:mx-6 mt-3 md:mt-4 rounded">
            <p className="text-green-800 text-sm font-medium">
              ✅ You have a booking this week: {userBookingThisWeek.time_formatted} on{' '}
              {formatFriendly(userBookingThisWeek.booking_date)}
            </p>
          </div>
        )}

        {/* The court's day is ahead of the user's — only true late at night. */}
        {courtDayAhead && meta && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 md:p-4 mx-4 md:mx-6 mt-3 md:mt-4 rounded">
            <p className="text-amber-800 text-sm">
              Heads up: the booking site has already rolled over to{' '}
              {formatFriendly(meta.courtToday)}, so {formatFriendly(meta.today)} can no longer be
              reserved.
            </p>
          </div>
        )}

        {/* Error banner */}
        {startRefresh.error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4 rounded">
            <p className="text-red-700 text-sm">{startRefresh.error.message}</p>
          </div>
        )}

        {/* Mobile Navigation Arrows */}
        <div className="md:hidden flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <button
            onClick={handlePrevDates}
            disabled={!canGoPrev}
            className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
            aria-label="Previous days"
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
            aria-label="Next days"
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
              {visibleDates.map((dateInfo) => (
                <div key={dateInfo.ymd} className="contents">
                  {renderDateCard(dateInfo, 'mobile')}
                </div>
              ))}
            </div>

            {/* Desktop: horizontal grid, one column per day */}
            <div
              className="hidden md:grid md:gap-4 p-6 overflow-auto flex-1"
              style={{
                gridTemplateColumns: dates.length > 0 ? `repeat(${dates.length}, 1fr)` : '1fr',
              }}
            >
              {dates.map((dateInfo) => (
                <div key={dateInfo.ymd} className="contents">
                  {renderDateCard(dateInfo, 'desktop')}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
