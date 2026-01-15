'use client'

import { useState, useEffect } from 'react'
import Spinner from './components/Spinner'

export default function Home() {
  const [availability, setAvailability] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [basketballAnimation, setBasketballAnimation] = useState(null)

  const fetchLatestAvailability = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/availability/latest')
      const result = await response.json()

      if (result.success) {
        setAvailability(result.data)
      } else {
        setError(result.error || 'Failed to fetch availability')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      setError(null)

      triggerBasketballAnimation('bounce')

      const response = await fetch('/api/availability/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        setTimeout(() => {
          fetchLatestAvailability()
        }, 2000)
      } else {
        setError(result.error || 'Failed to trigger refresh')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  const handleBook = async (date, timeSlot) => {
    triggerBasketballAnimation('shoot')

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: date,
          time: timeSlot,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(`🏀 Booking requested for ${date} at ${timeSlot}`)
      } else {
        alert(`❌ Booking failed: ${result.error}`)
      }
    } catch (err) {
      alert(`❌ Error: ${err.message}`)
    }
  }

  const triggerBasketballAnimation = (type) => {
    setBasketballAnimation(type)
    setTimeout(() => setBasketballAnimation(null), 800)
  }

  useEffect(() => {
    fetchLatestAvailability()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center items-center justify-center align-middle">
          <Spinner size="xl" />
        </div>
      </div>
    )
  }

  if (error && !availability) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchLatestAvailability}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const availabilityData = availability?.data || {}
  const dates = availabilityData.dates || []

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
              <span>Last checked on {new Date(availability.checked_at).toLocaleString()}</span>
            )}
          </div>
          <div className="text-gray-600 text-sm">
            ( っ'-')╮ =͟͟͞͞🏀
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? 'Refreshing...' : '🔄️ Refresh Times 🔄️ '}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4 rounded">
            <p className="text-red-700 text-sm">{error}</p>
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
                    {availableSlots.map((slot, slotIdx) => (
                      <div
                        key={slotIdx}
                        className="flex justify-between items-center bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition"
                      >
                        <span className="text-sm text-gray-700">
                          {slot}
                        </span>
                        <button
                          onClick={() => handleBook(dateInfo.date, slot)}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition"
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
