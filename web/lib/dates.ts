/**
 * Re-export of the shared date utilities for use in the browser.
 *
 * Imported via the package's `./utils/*` subpath rather than its root, because
 * the root barrel pulls in the Playwright-driven services — nothing that belongs
 * in a client bundle. utils/dates has no dependencies at all.
 *
 * Everything in here answers in APP_TIMEZONE regardless of how the viewer's own
 * machine clock is set, so a laptop left on the wrong timezone still sees the
 * right court days.
 */
export * from '@court-booker/shared/utils/dates';
