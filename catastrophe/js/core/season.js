// @ts-check
// Seasonal switch. Halloween runs through October (local time) and turns itself off on November 1.
// Test any time with ?season=halloween (or ?season=none to force it off).

/** @typedef {'halloween'|null} Season */

/** @param {Date} [now] @returns {Season} */
export function season(now = new Date()) {
  const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('season') : null;
  if (forced === 'halloween') return 'halloween';
  if (forced === 'none') return null;
  return now.getMonth() === 9 ? 'halloween' : null;
}

/** @param {Date} [now] */
export const isHalloween = (now) => season(now) === 'halloween';
