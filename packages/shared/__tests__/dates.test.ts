/**
 * Date-handling tests. Run with: pnpm test:dates
 *
 * These run under several TZ settings (see the runner) because the whole point
 * of dates.ts is that its answers must not depend on the machine's clock zone.
 */
import assert from 'assert';
import {
  APP_TIMEZONE,
  SITE_TIMEZONE,
  toYmd,
  appToday,
  siteToday,
  addDays,
  compareYmd,
  weekdayOf,
  weekStartOf,
  daysFrom,
  formatLabel,
  formatFriendly,
  parseLabel,
  startOfDayIn,
  isBookable,
  isPastForUser,
  isAppToday,
  isRolledOverBySite,
  unbookableReason,
  siteCutoffFor,
  splitYmd,
  makeYmd,
} from '../utils/dates';

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (err: any) {
    failures.push(`${name}\n    ${err.message}`);
  }
}

// --- instants -> days -----------------------------------------------------
check('toYmd resolves an instant per timezone', () => {
  // 2026-08-19T04:44Z: 9:44 PM Aug 18 Pacific, 12:44 AM Aug 19 Eastern.
  const instant = new Date('2026-08-19T04:44:00Z');
  assert.strictEqual(toYmd(instant, APP_TIMEZONE), '2026-08-18');
  assert.strictEqual(toYmd(instant, SITE_TIMEZONE), '2026-08-19');
  assert.strictEqual(toYmd(instant, 'UTC'), '2026-08-19');
});

check('appToday/siteToday disagree only in the 9pm-midnight PT window', () => {
  const inWindow = new Date('2026-08-19T04:44:00Z'); // 21:44 PT
  assert.strictEqual(appToday(inWindow), '2026-08-18');
  assert.strictEqual(siteToday(inWindow), '2026-08-19');

  const midday = new Date('2026-08-19T18:46:00Z'); // 11:46 PT
  assert.strictEqual(appToday(midday), '2026-08-19');
  assert.strictEqual(siteToday(midday), '2026-08-19');

  const justBefore = new Date('2026-08-19T03:06:00Z'); // 20:06 PT / 23:06 ET
  assert.strictEqual(appToday(justBefore), '2026-08-18');
  assert.strictEqual(siteToday(justBefore), '2026-08-18');
});

// --- arithmetic -----------------------------------------------------------
check('addDays crosses months and years', () => {
  assert.strictEqual(addDays('2026-08-19', 1), '2026-08-20');
  assert.strictEqual(addDays('2026-08-31', 1), '2026-09-01');
  assert.strictEqual(addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(addDays('2026-01-01', -1), '2025-12-31');
  assert.strictEqual(addDays('2024-02-28', 1), '2024-02-29'); // leap year
  assert.strictEqual(addDays('2026-02-28', 1), '2026-03-01'); // non-leap
});

check('addDays is unaffected by DST transitions', () => {
  // US DST starts 2026-03-08 and ends 2026-11-01.
  assert.strictEqual(addDays('2026-03-07', 1), '2026-03-08');
  assert.strictEqual(addDays('2026-03-08', 1), '2026-03-09');
  assert.strictEqual(addDays('2026-10-31', 1), '2026-11-01');
  assert.strictEqual(addDays('2026-11-01', 1), '2026-11-02');
  // Seven days across the spring-forward boundary is still seven days.
  assert.strictEqual(addDays('2026-03-05', 7), '2026-03-12');
});

check('compareYmd orders correctly', () => {
  assert.strictEqual(compareYmd('2026-08-19', '2026-08-20'), -1);
  assert.strictEqual(compareYmd('2026-08-20', '2026-08-19'), 1);
  assert.strictEqual(compareYmd('2026-08-19', '2026-08-19'), 0);
  assert.strictEqual(compareYmd('2026-09-01', '2026-08-31'), 1);
});

check('weekdayOf matches the real calendar', () => {
  assert.strictEqual(weekdayOf('2026-08-19'), 3); // Wednesday
  assert.strictEqual(weekdayOf('2026-08-21'), 5); // Friday
  assert.strictEqual(weekdayOf('2026-08-23'), 0); // Sunday
});

check('weekStartOf returns Monday and matches stored week_start values', () => {
  // Straight from the bookings table.
  assert.strictEqual(weekStartOf('2026-08-21'), '2026-08-17');
  assert.strictEqual(weekStartOf('2026-08-16'), '2026-08-10'); // Sunday -> prior Monday
  assert.strictEqual(weekStartOf('2026-08-09'), '2026-08-03'); // Sunday
  assert.strictEqual(weekStartOf('2026-08-02'), '2026-07-27'); // Sunday, crosses month
  assert.strictEqual(weekStartOf('2026-07-05'), '2026-06-29'); // Sunday, crosses month
  assert.strictEqual(weekStartOf('2026-07-03'), '2026-06-29'); // Friday
  assert.strictEqual(weekStartOf('2026-06-14'), '2026-06-08'); // Sunday
  assert.strictEqual(weekStartOf('2026-05-31'), '2026-05-25'); // Sunday
  assert.strictEqual(weekStartOf('2026-08-17'), '2026-08-17'); // Monday is its own start
});

check('daysFrom produces a contiguous window', () => {
  assert.deepStrictEqual(daysFrom('2026-08-19', 3), ['2026-08-19', '2026-08-20', '2026-08-21']);
  assert.strictEqual(daysFrom('2026-08-19', 8).length, 8);
});

// --- labels ---------------------------------------------------------------
check('formatLabel reproduces the stored snapshot format exactly', () => {
  // These strings are verbatim from availability_snapshots.dates[].date.
  assert.strictEqual(formatLabel('2026-08-19'), 'Wednesday August 19, 2026');
  assert.strictEqual(formatLabel('2026-08-21'), 'Friday August 21, 2026');
  assert.strictEqual(formatLabel('2026-08-01'), 'Saturday August 1, 2026'); // no zero pad
  assert.strictEqual(formatLabel('2026-07-27'), 'Monday July 27, 2026');
});

check('formatFriendly reads as prose', () => {
  assert.strictEqual(formatFriendly('2026-08-21'), 'Friday, August 21');
  assert.strictEqual(formatFriendly('2026-08-01'), 'Saturday, August 1');
});

check('parseLabel round-trips every label shape the app has produced', () => {
  assert.strictEqual(parseLabel('Friday August 21, 2026'), '2026-08-21');
  assert.strictEqual(parseLabel('Saturday, January 18, 2025'), '2025-01-18');
  assert.strictEqual(parseLabel('January 18, 2025'), '2025-01-18');
  assert.strictEqual(parseLabel('Saturday August 1, 2026'), '2026-08-01');
  assert.strictEqual(parseLabel('2026-08-21'), '2026-08-21');
  assert.strictEqual(parseLabel('  Friday August 21, 2026  '), '2026-08-21');
});

check('parseLabel rejects rather than guessing', () => {
  assert.strictEqual(parseLabel('not a date'), null);
  assert.strictEqual(parseLabel('Smarch 4, 2026'), null);
  assert.strictEqual(parseLabel('February 30, 2026'), null);
  assert.strictEqual(parseLabel(''), null);
  assert.strictEqual(parseLabel(undefined as any), null);
});

check('label round-trip is lossless across a full year', () => {
  let ymd = '2026-01-01';
  for (let i = 0; i < 366; i++) {
    assert.strictEqual(parseLabel(formatLabel(ymd)), ymd, `round-trip failed at ${ymd}`);
    ymd = addDays(ymd, 1);
  }
});

// --- the historical off-by-one that used to bite --------------------------
check('parseLabel does not repeat the new Date("YYYY-MM-DD") UTC bug', () => {
  // new Date('2026-08-21') is UTC midnight, which is Aug 20 in Pacific.
  // parseLabel must stay on Aug 21 regardless of the machine's timezone.
  assert.strictEqual(parseLabel('2026-08-21'), '2026-08-21');
  const naive = new Date('2026-08-21');
  assert.strictEqual(toYmd(naive, 'UTC'), '2026-08-21');
  // Proof the naive path really is off by one out west:
  assert.strictEqual(toYmd(naive, 'America/Los_Angeles'), '2026-08-20');
});

// --- zone boundaries ------------------------------------------------------
check('startOfDayIn finds true local midnight', () => {
  assert.strictEqual(startOfDayIn('2026-08-19', 'UTC').toISOString(), '2026-08-19T00:00:00.000Z');
  // EDT is UTC-4 in August.
  assert.strictEqual(startOfDayIn('2026-08-19', SITE_TIMEZONE).toISOString(), '2026-08-19T04:00:00.000Z');
  // PDT is UTC-7 in August.
  assert.strictEqual(startOfDayIn('2026-08-19', APP_TIMEZONE).toISOString(), '2026-08-19T07:00:00.000Z');
  // EST is UTC-5 in January.
  assert.strictEqual(startOfDayIn('2026-01-15', SITE_TIMEZONE).toISOString(), '2026-01-15T05:00:00.000Z');
});

check('startOfDayIn survives both DST transition days', () => {
  // Spring forward: 2026-03-08, clocks jump 2am -> 3am. Midnight still exists.
  assert.strictEqual(startOfDayIn('2026-03-08', SITE_TIMEZONE).toISOString(), '2026-03-08T05:00:00.000Z');
  assert.strictEqual(startOfDayIn('2026-03-09', SITE_TIMEZONE).toISOString(), '2026-03-09T04:00:00.000Z');
  // Fall back: 2026-11-01, clocks repeat 1am-2am.
  assert.strictEqual(startOfDayIn('2026-11-01', SITE_TIMEZONE).toISOString(), '2026-11-01T04:00:00.000Z');
  assert.strictEqual(startOfDayIn('2026-11-02', SITE_TIMEZONE).toISOString(), '2026-11-02T05:00:00.000Z');
});

check('siteCutoffFor matches the observed nightly rollover', () => {
  // Snapshots showed Aug 19 reservations present at 03:06Z and gone by 04:44Z.
  const cutoff = siteCutoffFor('2026-08-19');
  assert.ok(cutoff > new Date('2026-08-19T03:06:00Z'), 'cutoff must be after the last good snapshot');
  assert.ok(cutoff < new Date('2026-08-19T04:44:00Z'), 'cutoff must be before the first empty snapshot');
  assert.strictEqual(cutoff.toISOString(), '2026-08-19T04:00:00.000Z');
});

// --- bookability ----------------------------------------------------------
check('bookability during normal daytime hours', () => {
  const now = new Date('2026-08-19T18:46:00Z'); // 11:46 AM PT, 2:46 PM ET, same day both
  assert.strictEqual(isBookable('2026-08-19', now), false); // same day
  assert.strictEqual(isBookable('2026-08-20', now), true);
  assert.strictEqual(isBookable('2026-08-26', now), true);
  assert.strictEqual(isPastForUser('2026-08-18', now), true);
  assert.strictEqual(isAppToday('2026-08-19', now), true);
  assert.strictEqual(unbookableReason('2026-08-19', now), 'same-day');
  assert.strictEqual(unbookableReason('2026-08-20', now), null);
  assert.strictEqual(unbookableReason('2026-08-18', now), 'past');
});

check('bookability inside the 9pm-midnight PT window', () => {
  const now = new Date('2026-08-19T04:44:00Z'); // 9:44 PM PT Aug 18, 12:44 AM ET Aug 19
  // The user still calls it Aug 18, but the site has moved to Aug 19.
  assert.strictEqual(appToday(now), '2026-08-18');
  assert.strictEqual(siteToday(now), '2026-08-19');

  assert.strictEqual(isBookable('2026-08-18', now), false);
  assert.strictEqual(isBookable('2026-08-19', now), false); // site already rolled past it
  assert.strictEqual(isBookable('2026-08-20', now), true);

  assert.strictEqual(isPastForUser('2026-08-18', now), false); // still today for the user
  assert.strictEqual(unbookableReason('2026-08-18', now), 'same-day');
  assert.strictEqual(unbookableReason('2026-08-19', now), 'site-rolled-over');
  assert.strictEqual(isRolledOverBySite('2026-08-19', now), true);
  assert.strictEqual(isRolledOverBySite('2026-08-20', now), false);
});

check('a day is never both past-for-user and bookable', () => {
  const probes = [
    '2026-08-19T00:30:00Z', '2026-08-19T04:44:00Z', '2026-08-19T07:30:00Z',
    '2026-08-19T12:00:00Z', '2026-08-19T18:46:00Z', '2026-08-19T23:59:00Z',
    '2026-01-15T05:30:00Z', '2026-03-08T09:00:00Z', '2026-11-01T08:30:00Z',
  ];
  for (const iso of probes) {
    const now = new Date(iso);
    let ymd = addDays(appToday(now), -3);
    for (let i = 0; i < 12; i++) {
      assert.ok(
        !(isPastForUser(ymd, now) && isBookable(ymd, now)),
        `${ymd} at ${iso} was both past and bookable`
      );
      const reason = unbookableReason(ymd, now);
      assert.strictEqual(
        reason === null, isBookable(ymd, now),
        `${ymd} at ${iso}: reason ${reason} disagrees with isBookable`
      );
      ymd = addDays(ymd, 1);
    }
  }
});

check('splitYmd/makeYmd reject malformed input loudly', () => {
  assert.throws(() => splitYmd('2026-8-1'));
  assert.throws(() => splitYmd('Friday August 21, 2026'));
  assert.throws(() => splitYmd(''));
  assert.strictEqual(makeYmd(2026, 8, 1), '2026-08-01');
});

const tz = process.env.TZ || 'system default';
if (failures.length) {
  console.error(`\n  FAIL (TZ=${tz})  ${passed} passed, ${failures.length} failed`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`  ok (TZ=${tz})  ${passed} assertions groups passed`);
