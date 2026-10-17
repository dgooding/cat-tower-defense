// @ts-check
// Catmull-Rom path sampling + arc-length lookup (used by rooms and gameplay).

/** @typedef {{x:number, y:number}} Pt */

/**
 * Dense polyline through control points (centripetal-ish uniform Catmull-Rom).
 * @param {Pt[]} pts @param {number} [perSeg] samples per segment @returns {Pt[]}
 */
export function catmullRom(pts, perSeg = 16) {
  if (pts.length < 2) return pts.slice();
  /** @type {Pt[]} */
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Polyline with cumulative lengths for constant-speed travel. */
export class Track {
  /** @param {Pt[]} control control points @param {number} [perSeg] */
  constructor(control, perSeg = 16) {
    this.pts = catmullRom(control, perSeg);
    /** @type {number[]} */
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(this.pts[i].x - this.pts[i - 1].x, this.pts[i].y - this.pts[i - 1].y));
    }
    this.length = this.cum[this.cum.length - 1];
  }
  /** Point + heading at distance d along the track. @param {number} d */
  at(d) {
    const L = this.length;
    const dd = Math.max(0, Math.min(L, d));
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] < dd) lo = mid;
      else hi = mid;
    }
    const seg = this.cum[hi] - this.cum[lo] || 1;
    const u = (dd - this.cum[lo]) / seg;
    const a = this.pts[lo];
    const b = this.pts[hi];
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, dx: b.x - a.x, dy: b.y - a.y };
  }
  /** Shortest distance from p to the track. @param {Pt} p */
  distanceTo(p) {
    let best = Infinity;
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1];
      const b = this.pts[i];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const l2 = vx * vx + vy * vy || 1;
      const u = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
      best = Math.min(best, Math.hypot(p.x - (a.x + vx * u), p.y - (a.y + vy * u)));
    }
    return best;
  }
}
