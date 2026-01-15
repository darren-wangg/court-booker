/**
 * POST /api/book
 * Books a court time slot via Worker API
 * 
 * Request body:
 * {
 *   date: "2025-01-15" (ISO date string or "January 15, 2025"),
 *   time: "5:00 PM - 6:00 PM" or { startHour: 17, endHour: 18 },
 *   userId: 1 (optional)
 * }
 */

export async function POST(request) {
  try {
    // Verify API secret if provided
    const apiSecret = request.headers.get('x-api-secret');
    const expectedSecret = process.env.API_SECRET_KEY;
    
    if (expectedSecret && apiSecret !== expectedSecret) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { date, time, userId } = body;

    // Validate input
    if (!date || !time) {
      return Response.json(
        { error: 'Missing required fields: date and time' },
        { status: 400 }
      );
    }

    // Get worker URL from environment
    const workerUrl = process.env.WORKER_URL;
    const workerSecret = process.env.WORKER_SECRET;

    if (!workerUrl) {
      return Response.json(
        { error: 'Worker URL not configured. Set WORKER_URL environment variable.' },
        { status: 500 }
      );
    }

    // Call worker API
    const response = await fetch(`${workerUrl}/api/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret && { 'Authorization': `Bearer ${workerSecret}` }),
      },
      body: JSON.stringify({ date, time, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Worker API returned ${response.status}`);
    }

    const result = await response.json();
    
    return Response.json({
      success: result.success,
      message: result.success ? 'Booking completed successfully' : 'Booking failed',
      data: result.data,
    });
  } catch (error) {
    console.error('Error processing booking:', error);
    return Response.json(
      { error: 'Failed to process booking', details: error.message },
      { status: 500 }
    );
  }
}
