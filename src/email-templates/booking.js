/**
 * Generate HTML for booking confirmation email
 */
function generateBookingConfirmationHTML(bookingResult) {
  const { bookingRequest, result } = bookingResult;
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h3 style="color: #2e7d32;">🏀 Court Booking Confirmed! 🏀</h3>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Booking Details:</h3>
        <p><strong>Date:</strong> ${bookingRequest.formatted.date}</p>
        <p><strong>Time:</strong> ${bookingRequest.formatted.time}</p>
        <p><strong>Status:</strong> ${result.success ? '✅ Confirmed' : '❌ Failed'}</p>
        ${result.message ? `<p><strong>Message:</strong> ${result.message}</p>` : ''}
      </div>
      
      <p style="color: #666; font-size: 14px;">
        This booking was automatically processed from your email response.
      </p>
    </div>
  `;
}

/**
 * Generate HTML for booking error email
 */
function generateBookingErrorHTML(bookingRequest, error) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d32f2f;">❌ Court Booking Failed</h2>
      
      <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Booking Request:</h3>
        <p><strong>Date:</strong> ${bookingRequest.formatted.date}</p>
        <p><strong>Time:</strong> ${bookingRequest.formatted.time}</p>
        <p><strong>Error:</strong> ${error}</p>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        The automated booking system encountered an error. You may need to book manually.
      </p>
    </div>
  `;
}

module.exports = {
  generateBookingConfirmationHTML,
  generateBookingErrorHTML
};
