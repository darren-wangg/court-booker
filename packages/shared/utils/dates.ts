/**
 * Canonical date handling for Court Booker.
 *
 * THE RULE: a calendar day is a plain "YYYY-MM-DD" string (`Ymd`), never a Date.
 * Date objects are instants, not days — converting between the two is where every
 * off-by-one day bug in this app came from. Only convert at the edges (formatting
 * an instant, or asking "what day is it right now in zone X") and always name the
 * timezone explicitly. Never call `new Date(someDateString)`.
 *
 * There are TWO timezones in play and they are not the same:
 *
 *   APP_TIMEZONE  — the timezone we display in. This is the user's day; what the
 *                   grid columns mean and what "today" says in the UI.
 *
 *   SITE_TIMEZONE — the timezone avalonaccess.com runs on. Verified empirically
 *                   from 24 nights of availability snapshots: reservations for a
 *                   given day disappear from the site's list at midnight Eastern,
 *                   never at midnight Pacific. Once the site's day advances past a
 *                   date, that date can no longer be booked and the site stops
 *                   publishing its reservations (so it scrapes as "fully free").
 *
 * Between 9 PM and midnight Pacific the two disagree, which is exactly the window
 * where dates used to read a day ahead. Bookability is decided by SITE_TIMEZONE;
 * everything shown to the user is decided by APP_TIMEZONE.
 */

/** The timezone the UI speaks in. */
export const APP_TIMEZONE = 'America/Los_Angeles';

/** The timezone the booking site's day rolls over on. */
export const SITE_TIMEZONE = 'America/New_York';

/** A calendar day, "YYYY-MM-DD". */
export type Ymd = string;

const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Split a Ymd into its numeric parts. Throws on anything malformed. */
export function splitYmd(ymd: Ymd): { year: number; month: number; day: number } {
  const match = YMD_PATTERN.exec(ymd);
  if (!match) {
    throw new Error(`Invalid calendar day (expected YYYY-MM-DD): ${JSON.stringify(ymd)}`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function isYmd(value: unknown): value is Ymd {
  return typeof value === 'string' && YMD_PATTERN.test(value);
}

export function makeYmd(year: number, month: number, day: number): Ymd {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Anchor a calendar day at 12:00 UTC. Noon keeps the day stable under every
 * real-world UTC offset (-12..+14), so day arithmetic can never slip across DST.
 */
function ymdToNoonUtc(ymd: Ymd): Date {
  const { year, month, day } = splitYmd(ymd);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function noonUtcToYmd(d: Date): Ymd {
  return makeYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

// =============================================
// Instants -> calendar days
// =============================================

/** Which calendar day `instant` falls on, in `timeZone`. */
export function toYmd(instant: Date, timeZone: string): Ymd {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const get = (type: string) => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Intl did not return a ${type} part for ${timeZone}`);
    return Number(part.value);
  };

  return makeYmd(get('year'), get('month'), get('day'));
}

export function todayIn(timeZone: string, now: Date = new Date()): Ymd {
  return toYmd(now, timeZone);
}

/** Today as the user sees it. */
export function appToday(now: Date = new Date()): Ymd {
  return todayIn(APP_TIMEZONE, now);
}

/** Today as the booking site sees it. May be one day ahead of `appToday`. */
export function siteToday(now: Date = new Date()): Ymd {
  return todayIn(SITE_TIMEZONE, now);
}

/** UTC offset of `timeZone` at `instant`, in milliseconds. */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const get = (type: string) => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Intl did not return a ${type} part for ${timeZone}`);
    return Number(part.value);
  };

  // Intl reports midnight as hour 24 in some ICU versions.
  const hour = get('hour') % 24;
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asIfUtc - instant.getTime() + (instant.getTime() % 1000);
}

/**
 * The instant at which `ymd` begins in `timeZone` (i.e. local midnight).
 * Two passes so the offset is sampled on the correct side of a DST transition.
 */
export function startOfDayIn(ymd: Ymd, timeZone: string): Date {
  const { year, month, day } = splitYmd(ymd);
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0);
  let ts = naive - timeZoneOffsetMs(new Date(naive), timeZone);
  ts = naive - timeZoneOffsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

// =============================================
// Calendar day arithmetic (pure, no timezone involved)
// =============================================

export function addDays(ymd: Ymd, days: number): Ymd {
  const d = ymdToNoonUtc(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return noonUtcToYmd(d);
}

/** -1 / 0 / 1. Lexicographic ordering is correct for zero-padded YYYY-MM-DD. */
export function compareYmd(a: Ymd, b: Ymd): number {
  splitYmd(a);
  splitYmd(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Day of week, 0 = Sunday. */
export function weekdayOf(ymd: Ymd): number {
  return ymdToNoonUtc(ymd).getUTCDay();
}

/** The Monday of the week containing `ymd`. Matches the DB's `week_start`. */
export function weekStartOf(ymd: Ymd): Ymd {
  const weekday = weekdayOf(ymd);
  // Sunday (0) belongs to the week that started six days earlier.
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(ymd, offset);
}

/** `count` consecutive days starting at `start`, inclusive. */
export function daysFrom(start: Ymd, count: number): Ymd[] {
  const out: Ymd[] = [];
  for (let i = 0; i < count; i++) out.push(addDays(start, i));
  return out;
}

// =============================================
// Human-readable labels
// =============================================

/**
 * The canonical grid label, e.g. "Friday August 21, 2026".
 * This exact shape is what lives in `availability_snapshots.dates[].date`,
 * so changing it would orphan every existing snapshot.
 */
export function formatLabel(ymd: Ymd): string {
  const { year, month, day } = splitYmd(ymd);
  return `${WEEKDAY_NAMES[weekdayOf(ymd)]} ${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/** "Friday, August 21" — for prose in the UI. */
export function formatFriendly(ymd: Ymd): string {
  const { month, day } = splitYmd(ymd);
  return `${WEEKDAY_NAMES[weekdayOf(ymd)]}, ${MONTH_NAMES[month - 1]} ${day}`;
}

/** "Aug 21" — for tight spaces. */
export function formatShort(ymd: Ymd): string {
  const { month, day } = splitYmd(ymd);
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${day}`;
}

/**
 * Read a calendar day out of any label this app has ever produced:
 * "Friday August 21, 2026", "Saturday, January 18, 2025", "January 18, 2025",
 * or a bare "2026-08-21". Returns null rather than guessing.
 *
 * Deliberately does not use `new Date(string)`: that parses "2026-08-21" as UTC
 * midnight, which renders as the previous day anywhere west of Greenwich.
 */
export function parseLabel(label: string): Ymd | null {
  if (typeof label !== 'string') return null;
  const trimmed = label.trim();
  if (!trimmed) return null;

  if (YMD_PATTERN.test(trimmed)) return trimmed;

  const match = /^(?:([A-Za-z]+),?\s+)?([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})$/.exec(trimmed);
  if (!match) return null;

  const monthIndex = MONTH_NAMES.findIndex(
    (name) => name.toLowerCase() === match[2].toLowerCase()
  );
  if (monthIndex === -1) return null;

  const day = Number(match[3]);
  const year = Number(match[4]);
  if (day < 1 || day > 31) return null;

  const ymd = makeYmd(year, monthIndex + 1, day);
  // Reject impossible days like February 30 by round-tripping through the calendar.
  const roundTrip = ymdToNoonUtc(ymd);
  if (roundTrip.getUTCMonth() !== monthIndex || roundTrip.getUTCDate() !== day) return null;

  return ymd;
}

/** Format an instant (e.g. `checked_at`) in the app's timezone. */
export function formatInstant(
  iso: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }
): string {
  const instant = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(instant.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, ...options }).format(instant);
}

// =============================================
// Bookability
// =============================================

/**
 * Can this day still be booked?
 *
 * The site removes a day from its reservation list at midnight SITE_TIMEZONE and
 * refuses same-day bookings, so only days strictly after the site's current day
 * are bookable. Note this is stricter than "not in the user's past": from 9 PM
 * Pacific onward the site has already moved on to tomorrow.
 */
export function isBookable(ymd: Ymd, now: Date = new Date()): boolean {
  return compareYmd(ymd, siteToday(now)) > 0;
}

/** Already gone by the user's calendar — safe to hide entirely. */
export function isPastForUser(ymd: Ymd, now: Date = new Date()): boolean {
  return compareYmd(ymd, appToday(now)) < 0;
}

export function isAppToday(ymd: Ymd, now: Date = new Date()): boolean {
  return ymd === appToday(now);
}

/**
 * True when the site's day has advanced past `ymd` but the user's has not —
 * a day still on the user's calendar that the site will no longer accept.
 * Only possible between 9 PM and midnight Pacific.
 */
export function isRolledOverBySite(ymd: Ymd, now: Date = new Date()): boolean {
  return !isBookable(ymd, now) && !isPastForUser(ymd, now);
}

/**
 * Why a day can't be booked, or null if it can be. Drives the UI's badge text.
 */
export function unbookableReason(
  ymd: Ymd,
  now: Date = new Date()
): 'past' | 'same-day' | 'site-rolled-over' | null {
  if (isPastForUser(ymd, now)) return 'past';
  if (isBookable(ymd, now)) return null;
  return isAppToday(ymd, now) ? 'same-day' : 'site-rolled-over';
}

/**
 * The instant the site stopped publishing reservations for `ymd` — midnight
 * SITE_TIMEZONE on that day. A snapshot taken before this still holds real
 * availability for the day; anything after it scrapes as fully free.
 */
export function siteCutoffFor(ymd: Ymd): Date {
  return startOfDayIn(ymd, SITE_TIMEZONE);
}

/** Has the site already dropped this day from its listings? */
export function isDroppedBySite(ymd: Ymd, now: Date = new Date()): boolean {
  return compareYmd(ymd, siteToday(now)) <= 0;
}
