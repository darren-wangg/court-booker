# Court Reservation Checker

An automated tool that checks for available reservation slots on the amenity reservation system. Now powered by GitHub Actions for reliable, free scheduling!

## Features

- 🔄 Automated login to amenity website
- 📅 Checks available dates in the calendar
- ⏰ Identifies available time slots that are not booked
- 🕐 Runs on a configurable schedule (default: every 3 hours) via GitHub Actions
- 🚀 Can also run on-demand for immediate checking
- 📧 Email notifications when slots are available

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Configure credentials:**
   Create a `.env` file in the project root:

   ```env
   EMAIL=your-email@example.com
   PASSWORD=your-password
   RESEND_API_KEY=your-resend-api-key
   NOTIFICATION_EMAIL=your-notification-email@example.com
   ```

3. **Set up GitHub Actions:**

   - Push this repository to GitHub
   - Go to your repository Settings → Secrets and variables → Actions
   - Add these repository secrets:
     - `EMAIL` - Your email
     - `PASSWORD` - Your password
     - `RESEND_API_KEY` - Your Resend API key
     - `NOTIFICATION_EMAIL` - Email to receive notifications

4. **Optional configuration:**
   You can customize these settings in your `.env` file:

   ```env
   # Run browser in headless mode - default: true
   HEADLESS_MODE=true

   # Amenity URL (if different from default)
   AMENITY_URL=https://www.avalonaccess.com/Information/Information/AmenityReservation?amenityKey=dd5c4252-e044-4012-a1e3-ec2e1a8cdddf
   ```

## Usage

### Automated Scheduling (GitHub Actions)

The tool automatically runs every 3 hours via GitHub Actions. You can also trigger it manually:

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Select "Court Availability Checker" workflow
4. Click "Run workflow" button

### Run a single check locally:

```bash
pnpm check
# or
node check-now.js
```

## How it works

1. **Login**: The tool automatically logs into amenity website using your credentials
2. **Date Selection**: Clicks on the reservation date input to open the calendar
3. **Available Dates**: Finds all selectable dates (not disabled) in the calendar
4. **Time Slots**: For the selected date, identifies all booked time slots
5. **Results**: Reports which time slots are available (not in the booked list)

## Schedule Configuration

The GitHub Actions workflow runs every 3 hours by default. To change the schedule, edit `.github/workflows/court-checker.yml`:

```yaml
schedule:
  - cron: "0 */3 * * *" # Every 3 hours (current)
  - cron: "0 */1 * * *" # Every hour
  - cron: "0 12,15,18,21 * * *" # At 12pm, 3pm, 6pm, and 9pm
  - cron: "*/30 * * * *" # Every 30 minutes
```

**Note**: GitHub Actions has a minimum interval of 5 minutes for scheduled workflows.

## Troubleshooting

- **Login fails**: Verify your credentials in GitHub repository secrets
- **No dates available**: The calendar might not have any selectable dates
- **GitHub Actions failing**: Check the Actions tab for error logs
- **Email not sending**: Verify your Resend API key and notification email in repository secrets

## Notes

- The tool generates time slots from 10 AM to 10 PM by default
- You may need to adjust the `generateTimeSlots()` function based on actual amenity hours
- Email notifications are sent when available slots are found
- GitHub Actions provides 2,000 free minutes per month for public repositories

## Next Steps

To add booking functionality:

1. After finding available slots, select the desired time
2. Fill in any required reservation details
3. Submit the booking form
4. Handle confirmation
