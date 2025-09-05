# Avalon Court Reservation Checker

An automated tool that checks for available reservation slots on the Avalon Access amenity reservation system.

## Features

- 🔄 Automated login to Avalon Access
- 📅 Checks available dates in the calendar
- ⏰ Identifies available time slots that are not booked
- 🕐 Runs on a configurable schedule (default: every 3 hours)
- 🚀 Can also run on-demand for immediate checking

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure credentials:**
   Create a `.env` file in the project root:

   ```env
   AVALON_EMAIL=your-email@example.com
   AVALON_PASSWORD=your-password
   ```

3. **Optional configuration:**
   You can customize these settings in your `.env` file:

   ```env
   # Schedule pattern (cron format) - default: every 3 hours
   SCHEDULE_PATTERN=0 */3 * * *

   # Run browser in headless mode - default: true
   HEADLESS_MODE=true

   # Amenity URL (if different from default)
   AMENITY_URL=https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf
   ```

## Usage

### Run scheduled checks (every 3 hours by default):

```bash
pnpm start
# or
node index.js
```

### Run a single check immediately:

```bash
pnpm check
# or
node check-now.js
```

## How it works

1. **Login**: The tool automatically logs into Avalon Access using your credentials
2. **Date Selection**: Clicks on the reservation date input to open the calendar
3. **Available Dates**: Finds all selectable dates (not disabled) in the calendar
4. **Time Slots**: For the selected date, identifies all booked time slots
5. **Results**: Reports which time slots are available (not in the booked list)

## Schedule Format

The schedule uses cron format. Here are some examples:

- `0 */3 * * *` - Every 3 hours (default)
- `0 */1 * * *` - Every hour
- `0 9,12,15,18 * * *` - At 9am, 12pm, 3pm, and 6pm
- `*/30 * * * *` - Every 30 minutes

## Troubleshooting

- **Login fails**: Verify your credentials in the `.env` file
- **No dates available**: The calendar might not have any selectable dates
- **Browser issues**: Try setting `HEADLESS_MODE=false` to see what's happening

## Notes

- The tool generates time slots from 8 AM to 10 PM by default
- You may need to adjust the `generateTimeSlots()` function based on actual amenity hours
- Currently logs results to console - you can extend it to send notifications

## Next Steps

To add booking functionality:

1. After finding available slots, select the desired time
2. Fill in any required reservation details
3. Submit the booking form
4. Handle confirmation
