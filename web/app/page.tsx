'use client'

import { useState, useEffect } from 'react'
import Spinner from './components/Spinner'
import { useUsers } from './queries/useUsers'
import { useAvailability, useRefreshAvailability, useBookSlot, DateInfo } from './queries/useAvailabilities'

export default function Home() {
  const [basketballAnimation, setBasketballAnimation] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

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
    refreshMutation.mutate(selectedUserId)
  }

  const handleBook = (date: string, timeSlot: string) => {
    triggerBasketballAnimation('shoot')
    bookMutation.mutate(
      { date, time: timeSlot, userId: selectedUserId },
      {
        onSuccess: () => {
          alert(`Booking requested for ${date} at ${timeSlot}`)
        },
        onError: (error) => {
          alert(`Booking failed: ${error.message}`)
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

  // API returns { success: true, data: <snapshot_row> }
  // The snapshot row has a 'data' JSONB column with the actual availability data
  const snapshotRow = availability?.data || {}
  const availabilityData = (snapshotRow as any).data || {}
  const dates = (availabilityData as { dates?: DateInfo[] }).dates || []

  return (
    <main className="h-screen p-4 overflow-hidden bg-gray-100">
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
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="text-gray-600 text-sm">
            {availability && (
              <span>Last checked on: {new Date(availability.checked_at).toLocaleString()}</span>
            )}
          </div>
          <div className="text-gray-600 text-sm">
            ( っ&apos;-&apos;)╮ =͟͟͞͞🏀
          </div>
          <div className="flex items-center gap-4">
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

        {/* Availability Grid */}
        {dates.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">No availability data found</p>
          </div>
        ) : (
          <div className="flex-1 grid gap-4 p-6 overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${dates.filter(d => (d.available || []).length > 0).length}, 1fr)`
            }}>
            {dates.map((dateInfo, idx) => {
              const availableSlots = dateInfo.available || []

              if (availableSlots.length === 0) {
                return null
              }

              return (
                <div key={idx} className="flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gray-50 border-b px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-900">{dateInfo.date}</span>
                  </div>

                  <div className="flex-1 overflow-auto p-3 space-y-2">
                    {availableSlots.map((slot: string, slotIdx: number) => (
                      <div
                        key={slotIdx}
                        className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition"
                      >
                        <span className="text-sm text-gray-700">
                          {slot}
                        </span>
                        <button
                          onClick={() => handleBook(dateInfo.date, slot)}
                          disabled={bookMutation.isPending}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
                        >
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
