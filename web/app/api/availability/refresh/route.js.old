/**
 * POST /api/availability/refresh
 * Triggers a new availability check via Worker API
 * 
 * This calls the Worker API on your DigitalOcean droplet which runs
 * ReservationChecker with Puppeteer.
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
    const userId = body.userId || null;

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
    const response = await fetch(`${workerUrl}/api/check-availability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret && { 'Authorization': `Bearer ${workerSecret}` }),
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Worker API returned ${response.status}`);
    }

    const result = await response.json();
    
    return Response.json({
      success: true,
      message: 'Availability check completed',
      data: result.data,
    });
  } catch (error) {
    console.error('Error triggering refresh:', error);
    return Response.json(
      { error: 'Failed to trigger refresh', details: error.message },
      { status: 500 }
    );
  }
}
