const ReservationChecker = require('../src/reservationChecker');

export default async function handler(req, res) {
  // Only allow GET requests (for cron)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting scheduled availability check...');
    const checker = new ReservationChecker();
    const result = await checker.checkAvailability();
    
    console.log('Scheduled check completed successfully');
    res.status(200).json({
      success: true,
      message: 'Scheduled availability check completed',
      totalAvailableSlots: result.totalAvailableSlots,
      checkedAt: result.checkedAt
    });
    
  } catch (error) {
    console.error('Scheduled check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
