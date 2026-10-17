// @ts-check
// Track helpers for the sim: allocation-free sampling and layout → tracks.
import { Track } from '../core/spline.js';

/** @typedef {{x:number, y:number}} Pt */
/** @typedef {{x:number, y:number, dx:number, dy:number}} Sample */

/**
 * Sample a Track at distance d into `out` (heading normalized). No allocations.
 * @param {Track} tr @param {number} d @param {Sample} out @returns {Sample}
 */
export function sampleTrack(tr, d, out) {
  const cum = tr.cum;
  const pts = tr.pts;
  const dd = d < 0 ? 0 : d > tr.length ? tr.length : d;
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < dd) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const u = (dd - cum[lo]) / seg;
  const a = pts[lo];
  const b = pts[hi];
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  dx /= l;
  dy /= l;
  out.x = a.x + (b.x - a.x) * u;
  out.y = a.y + (b.y - a.y) * u;
  out.dx = dx;
  out.dy = dy;
  return out;
}

/**
 * Nearest point on any track to p.
 * @param {Track[]} tracks @param {Pt} p @returns {{x:number, y:number, track:number, d:number, dist:number}}
 */
export function nearestOnTracks(tracks, p) {
  let best = { x: p.x, y: p.y, track: 0, d: 0, dist: Infinity };
  tracks.forEach((tr, ti) => {
    for (let i = 0; i < tr.pts.length; i++) {
      const q = tr.pts[i];
      const dist = Math.hypot(q.x - p.x, q.y - p.y);
      // Ignore off-screen samples so kittens never rally outside the stage.
      if (dist < best.dist && q.x > 20 && q.x < 1900 && q.y > 20 && q.y < 1060) best = { x: q.x, y: q.y, track: ti, d: tr.cum[i], dist };
    }
  });
  return best;
}

/**
 * Build ground + flier tracks from a room layout.
 * @param {import('../art/rooms/common.js').Layout} layout
 */
export function buildTracks(layout) {
  const ground = layout.paths.map((p) => new Track(p, 16));
  /** @type {Track[]} */
  let fly;
  if (layout.flyPaths && layout.flyPaths.length) fly = layout.flyPaths.map((p) => new Track(p, 16));
  else
    fly = layout.paths.map((p) => {
      const a = p[0];
      const b = layout.stash;
      return new Track([a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 60 }, b], 16);
    });
  return { ground, fly };
}

/**
 * How much of the ground path lies within `range` of p (in px of path).
 * @param {Track[]} tracks @param {Pt} p @param {number} range @param {(x:number, y:number) => boolean} [skip] ignore path points where this is true
 */
export function coverage(tracks, p, range, skip) {
  let n = 0;
  const r2 = range * range;
  const s = { x: 0, y: 0, dx: 0, dy: 0 };
  for (const tr of tracks) {
    for (let d = 0; d < tr.length; d += 10) {
      sampleTrack(tr, d, s);
      if (s.x < 0 || s.x > 1920 || s.y < 0 || s.y > 1080) continue;
      if (skip && skip(s.x, s.y)) continue;
      const dx = s.x - p.x;
      const dy = s.y - p.y;
      if (dx * dx + dy * dy <= r2) n += 10;
    }
  }
  return n;
}
