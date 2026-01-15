'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Spinner from './components/Spinner'

export default function Home() {
  const [availability, setAvailability] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

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
      
      const response = await fetch('/api/availability/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Wait a moment then fetch latest
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
        alert(`Booking requested for ${date} at ${timeSlot}`)
      } else {
        alert(`Booking failed: ${result.error}`)
      }
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
  }

  useEffect(() => {
    fetchLatestAvailability()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="xl" />
          <div className="text-xl text-gray-600">Loading availability data...</div>
        </div>
      </div>
    )
  }

  if (error && !availability) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">
          <p className="text-xl font-bold">Error</p>
          <p>{error}</p>
          <button
            onClick={fetchLatestAvailability}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-4xl font-bold">Court Availability</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {refreshing && <Spinner size="sm" className="border-white border-t-gray-300" />}
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {availability && (
          <div className="mb-4 text-sm text-gray-600">
            Last checked: {new Date(availability.checked_at).toLocaleString()}
            {availability.source && ` (${availability.source})`}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
            {error}
          </div>
        )}

        {dates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">No availability data found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {dates.map((dateInfo, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-semibold mb-4">{dateInfo.date}</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-green-600 mb-2">
                      Available ({dateInfo.available?.length || 0} slots)
                    </h3>
                    {dateInfo.available && dateInfo.available.length > 0 ? (
                      <div className="space-y-2">
                        {dateInfo.available.map((slot, slotIdx) => (
                          <div
                            key={slotIdx}
                            className="flex justify-between items-center p-2 bg-green-50 rounded"
                          >
                            <span>{slot}</span>
                            <button
                              onClick={() => handleBook(dateInfo.date, slot)}
                              className="px-4 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                            >
                              Book
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No available slots</p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-medium text-red-600 mb-2">
                      Booked ({dateInfo.booked?.length || 0} slots)
                    </h3>
                    {dateInfo.booked && dateInfo.booked.length > 0 ? (
                      <div className="space-y-2">
                        {dateInfo.booked.map((slot, slotIdx) => (
                          <div
                            key={slotIdx}
                            className="p-2 bg-red-50 rounded text-gray-600"
                          >
                            {slot}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No booked slots</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {availabilityData.totalAvailableSlots !== undefined && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-lg font-semibold">
              Total Available Slots: {availabilityData.totalAvailableSlots}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
