const ReservationChecker = require('../src/services/reservationChecker');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting availability check...');
    const checker = new ReservationChecker();
    const result = await checker.checkAvailability();
    
    console.log('Check completed successfully');
    res.status(200).json({
      success: true,
      message: 'Availability check completed',
      totalAvailableSlots: result.totalAvailableSlots,
      checkedAt: result.checkedAt
    });
  } catch (error) {
    console.error('Check failed:', error);
    
    // Handle specific Chrome launch errors more gracefully
    if (error.message && (
        error.message.includes('EAGAIN') ||
        error.message.includes('Resource temporarily unavailable') ||
        error.message.includes('spawn') ||
        error.message.includes('Target closed'))) {
      console.log('🚨 System resource constraint detected in API handler');
      res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable due to resource constraints',
        details: 'System cannot launch Chrome browser',
        fallbackMode: true,
        retryAfter: 300 // 5 minutes
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}
