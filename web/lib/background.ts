/**
 * Keep server work alive after the HTTP response has been sent.
 *
 * A serverless invocation is normally frozen the moment it returns a response,
 * so anything still running would be killed. `waitUntil` extends the invocation
 * until the promise settles (bounded by the route's `maxDuration`), which is what
 * lets a booking or an availability scrape finish even though the browser tab
 * that started it has been backgrounded or closed.
 */

import { waitUntil } from '@vercel/functions';

/**
 * Run `promise` to completion server-side, independent of the client.
 *
 * Rejections are swallowed here on purpose: the job row is the record of what
 * happened, and an unhandled rejection in a detached promise would take the
 * whole invocation down with it.
 */
export function runInBackground(promise: Promise<unknown>): void {
  const guarded = promise.catch((err) => {
    console.error('❌ Background task threw:', err?.message || err);
  });

  try {
    waitUntil(guarded);
  } catch {
    // Outside Vercel (e.g. `next dev`) there is no request context to extend.
    // The dev server is long-lived, so simply letting the promise run is enough.
  }
}
