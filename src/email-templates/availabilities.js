function generateEmailHTML(results) {
  const { dates, totalAvailableSlots, checkedAt } = results;
  const checkTime = new Date(checkedAt).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let html = `
    <div style="font-family: Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>
        <strong>Checked on:</strong>
        <p>${checkTime} PST</p>
      </p>
      <p><strong>Total Available Slots:</strong> ${totalAvailableSlots}</p>
      
      <div style="margin: 20px 0;">
  `;

  html += `
      </div>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; color: #374151;"><strong>🏀 To book:</strong> Reply with date and time, e.g. "September 7, 2025" and "5 - 6 PM"</p>
      </div>
    </div>
  `;

  dates.forEach((dateResult) => {
    const { date, available, booked } = dateResult;
    const availableCount = available.length;

    html += `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0;">
        <h3 style="margin: 0 0 10px 0; color: #374151;">${date}</h3>
        <p style="margin: 5px 0;"><strong>Available:</strong> ${availableCount} slots</p>
    `;

    if (availableCount > 0) {
      html += `
        <div style="margin-top: 10px;">
          <strong>Times:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
      `;
      available.forEach((slot) => {
        html += `<li style="color: #059669;">✅ ${slot}</li>`;
      });
      html += `</ul></div>`;
    } else {
      html += `<p style="color: #dc2626; margin: 10px 0;">❌ All slots are reserved</p>`;
    }

    html += `</div>`;
  });

  return html;
}

module.exports = { generateEmailHTML };
