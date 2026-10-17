// @ts-check
// Hand-drawn look helpers: wobbly "boiling" ink lines and soft watercolor fills.
import { INK } from './palette.js';
import { hash2 } from '../core/rng.js';

/** @typedef {{x:number, y:number}} Pt */

/**
 * Sample an ellipse as points. `shape(angle)` optionally scales the radius.
 * @param {number} cx @param {number} cy @param {number} rx @param {number} ry
 * @param {number} [n] @param {(a:number, i:number)=>number} [shape]
 * @returns {Pt[]}
 */
export function ellipsePts(cx, cy, rx, ry, n = 28, shape) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const m = shape ? shape(a, i) : 1;
    pts.push({ x: cx + Math.cos(a) * rx * m, y: cy + Math.sin(a) * ry * m });
  }
  return pts;
}

/** Smooth closed path through point midpoints (corners become soft curves). */
/** @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts */
export function traceClosed(ctx, pts) {
  const n = pts.length;
  const last = pts[n - 1];
  const first = pts[0];
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  ctx.closePath();
}

/** @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts */
export function traceOpen(ctx, pts) {
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const end = i === pts.length - 2 ? b : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    ctx.quadraticCurveTo(a.x, a.y, end.x, end.y);
  }
}

/** Rotate points around a pivot. @param {Pt[]} pts @param {number} px @param {number} py @param {number} ang */
export function rotatePts(pts, px, py, ang) {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return pts.map((p) => ({ x: px + (p.x - px) * c - (p.y - py) * s, y: py + (p.x - px) * s + (p.y - py) * c }));
}

/** Scale points toward a pivot. @param {Pt[]} pts @param {number} px @param {number} py @param {number} k */
export function scalePts(pts, px, py, k) {
  return pts.map((p) => ({ x: px + (p.x - px) * k, y: py + (p.y - py) * k }));
}

/**
 * Pen draws ink shapes whose outlines gently re-jitter a few times per second,
 * like hand-drawn animation "boil". Widths/amplitudes are in local units; the
 * caller sets them from the current draw scale so ink stays ~3px on screen.
 */
export class Pen {
  /** @param {CanvasRenderingContext2D} ctx */
  constructor(ctx) {
    this.ctx = ctx;
    this.frame = 0;
    this.amp = 1;
    this.width = 3;
    this.salt = 0;
    this.ink = INK;
  }

  /** @param {number} time @param {{boil?:boolean, amp?:number, width?:number}} [o] */
  begin(time, o = {}) {
    const boil = o.boil !== false;
    this.frame = boil ? Math.floor(time * 7.5) : 0;
    this.amp = boil ? (o.amp ?? 1) : 0;
    this.width = o.width ?? 3;
    this.salt = 0;
  }

  /** @param {Pt[]} pts @param {number} [amp] */
  wob(pts, amp = this.amp) {
    const s = ++this.salt * 7919 + this.frame * 104729;
    if (!amp) return pts;
    return pts.map((p, i) => ({
      x: p.x + (hash2(s, i * 2) - 0.5) * 2 * amp,
      y: p.y + (hash2(s, i * 2 + 1) - 0.5) * 2 * amp,
    }));
  }

  /**
   * Filled + inked closed shape.
   * @param {Pt[]} pts @param {string|CanvasGradient|null} fill
   * @param {{ink?:string, width?:number, stroke?:boolean, amp?:number}} [o]
   */
  blob(pts, fill, o = {}) {
    const ctx = this.ctx;
    const w = this.wob(pts, o.amp ?? this.amp);
    ctx.beginPath();
    traceClosed(ctx, w);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (o.stroke !== false) {
      ctx.lineWidth = o.width ?? this.width;
      ctx.strokeStyle = o.ink ?? this.ink;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    return w;
  }

  /** @param {Pt[]} pts @param {{color?:string, width?:number, amp?:number, alpha?:number}} [o] */
  line(pts, o = {}) {
    const ctx = this.ctx;
    const w = this.wob(pts, o.amp ?? this.amp * 0.7);
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.beginPath();
    traceOpen(ctx, w);
    ctx.lineWidth = o.width ?? this.width;
    ctx.strokeStyle = o.color ?? this.ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  /** Thick stroke with an ink edge (tails, straps). @param {Pt[]} pts @param {number} width @param {string} color */
  tube(pts, width, color) {
    const ctx = this.ctx;
    const w = this.wob(pts, this.amp * 0.6);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    traceOpen(ctx, w);
    ctx.strokeStyle = this.ink;
    ctx.lineWidth = width + this.width * 2;
    ctx.stroke();
    ctx.beginPath();
    traceOpen(ctx, w);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    return w;
  }
}

/**
 * Watercolor-ish fill: light from the top-left fading to a soft shade.
 * @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r
 * @param {string} light @param {string} base @param {string} shade
 */
export function soft(ctx, x, y, r, light, base, shade) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.08, x, y, r * 1.15);
  g.addColorStop(0, light);
  g.addColorStop(0.5, base);
  g.addColorStop(1, shade);
  return g;
}

/**
 * Canvas text with a soft white outline (speech/FX text).
 * @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} x @param {number} y
 * @param {number} size @param {string} [color] @param {number} [alpha]
 */
export function fxText(ctx, text, x, y, size, color = INK, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `700 ${size}px Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.28;
  ctx.strokeStyle = '#FFFDF6';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
