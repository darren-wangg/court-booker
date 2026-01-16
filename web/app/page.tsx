'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Spinner from './components/Spinner'
import { useUsers } from './queries/useUsers'
import { useAvailability, useRefreshAvailability, useBookSlot, DateInfo } from './queries/useAvailabilities'

export default function Home() {
  const [basketballAnimation, setBasketballAnimation] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [mobileCarouselIndex, setMobileCarouselIndex] = useState(0)

  // React Query hooks
  const { data: users, isLoading: isUsersLoading } = useUsers()
  const { data: availability, isLoading: isAvailabilityLoading, error: availabilityError } = useAvailability(selectedUserId)
  const refreshMutation = useRefreshAvailability()
  const bookMutation = useBookSlot()

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
  const dates = (availability?.dates as DateInfo[]) || []
  
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

                return (
                  <div key={mobileCarouselIndex * datesPerPage + idx} className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-50 border-b px-3 py-2 text-center">
                      <span className="text-xs font-semibold text-gray-900">{dateInfo.date}</span>
                    </div>

                    {isFullyBooked ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                        <div className="text-4xl mb-2">✕</div>
                        <p className="text-sm text-gray-500 font-medium">No availabilities</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto p-2 space-y-2">
                        {availableSlots.map((slot: string, slotIdx: number) => (
                          <div
                            key={slotIdx}
                            className="flex flex-col gap-2 bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition"
                          >
                            <span className="text-xs text-gray-700">
                              {slot}
                            </span>
                            <button
                              onClick={() => handleBook(dateInfo.date, slot)}
                              disabled={bookMutation.isPending}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium transition disabled:opacity-50 w-full"
                            >
                              Book
                            </button>
                          </div>
                        ))}
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

                return (
                  <div key={idx} className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-50 border-b px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-900">{dateInfo.date}</span>
                    </div>

                    {isFullyBooked ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-5xl mb-3">✕</div>
                        <p className="text-sm text-gray-500 font-medium">No availabilities</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto p-3 space-y-2">
                        {availableSlots.map((slot: string, slotIdx: number) => (
                          <div
                            key={slotIdx}
                            className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition"
                          >
                            <span className="text-sm text-gray-700 flex-1">
                              {slot}
                            </span>
                            <button
                              onClick={() => handleBook(dateInfo.date, slot)}
                              disabled={bookMutation.isPending}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 ml-2 whitespace-nowrap"
                            >
                              Book
                            </button>
                          </div>
                        ))}
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
