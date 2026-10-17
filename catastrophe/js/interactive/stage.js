// @ts-check
// One rAF loop for every live canvas in Interactive Mode. Canvases only tick while visible
// (IntersectionObserver), DPR is capped at 2, and the loop stops while the tab is hidden.
import { reducedMotion, onChange } from './store.js';

/**
 * @typedef {Object} View
 * @property {HTMLCanvasElement} canvas @property {CanvasRenderingContext2D} ctx
 * @property {number} w css px @property {number} h css px @property {number} dpr
 * @property {boolean} visible @property {boolean} persistent survives route changes
 * @property {(v:View, dt:number, t:number) => void} tick
 * @property {() => void} dispose
 */

/** @type {Set<View>} */
const views = new Set();
let calm = reducedMotion();
onChange(() => (calm = reducedMotion()));
/** True when animation should be minimal (OS setting or in-game Calm toggle). */
export const isCalm = () => calm;

/**
 * Register a canvas with a draw callback.
 * @param {HTMLCanvasElement} canvas @param {(v:View, dt:number, t:number) => void} tick
 * @param {{persistent?:boolean}} [o]
 */
export function makeView(canvas, tick, o = {}) {
  /** @type {View} */
  const v = {
    canvas,
    ctx: /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d')),
    w: 1,
    h: 1,
    dpr: 1,
    visible: true,
    persistent: !!o.persistent,
    tick,
    dispose: () => {},
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    v.dpr = Math.min(2, window.devicePixelRatio || 1);
    v.w = Math.max(1, r.width);
    v.h = Math.max(1, r.height);
    const W = Math.round(v.w * v.dpr);
    const H = Math.round(v.h * v.dpr);
    if (canvas.width === W && canvas.height === H) return;
    canvas.width = W;
    canvas.height = H;
    // Resizing clears the bitmap: repaint right away so there's never a blank flash.
    if (ticked)
      try {
        v.tick(v, 0, time);
      } catch {
        /* the loop will report it */
      }
  };
  let ticked = false;
  const userTick = v.tick;
  v.tick = (vv, dt, t) => {
    ticked = true;
    userTick(vv, dt, t);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver((e) => (v.visible = e[e.length - 1].isIntersecting), { rootMargin: '80px' });
  io.observe(canvas);
  v.dispose = () => {
    ro.disconnect();
    io.disconnect();
    views.delete(v);
  };
  resize();
  views.add(v);
  ensureLoop();
  // Paint the first frame now so a fresh canvas never shows up blank.
  if (canvas.isConnected)
    try {
      v.tick(v, 0, time);
    } catch (err) {
      console.error('[interactive] first paint failed', err);
    }
  return v;
}

/** Drop every non-persistent view (called on route change). */
export function clearViews() {
  for (const v of [...views]) if (!v.persistent) v.dispose();
}

// ---------- pointer (eyes follow the cursor) ----------
export const pointer = { x: 0, y: 0, last: -99 };
window.addEventListener(
  'pointermove',
  (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.last = performance.now() / 1000;
  },
  { passive: true },
);
/** Look direction from a point inside a canvas toward the pointer, or null when idle. @param {HTMLCanvasElement} c @param {number} ox @param {number} oy */
export function lookFrom(c, ox, oy) {
  if (performance.now() / 1000 - pointer.last > 4) return null;
  const r = c.getBoundingClientRect();
  let dx = (pointer.x - (r.left + ox)) / 320;
  let dy = (pointer.y - (r.top + oy)) / 320;
  const l = Math.hypot(dx, dy);
  if (l > 1) {
    dx /= l;
    dy /= l;
  }
  return { x: dx, y: dy };
}

// ---------- loop ----------
let raf = 0;
let last = 0;
let time = 0;

function frame() {
  raf = 0;
  if (document.hidden) return;
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - last);
  last = now;
  time += dt;
  for (const v of views) {
    if (!v.visible || !v.canvas.isConnected) continue;
    try {
      v.tick(v, dt, time);
    } catch (err) {
      console.error('[interactive] canvas tick failed', err);
      v.dispose();
      window.dispatchEvent(new CustomEvent('cata:ix-error', { detail: err }));
    }
  }
  if (views.size) raf = requestAnimationFrame(frame);
  if (DEBUG_STATS) {
    ++frames;
    document.documentElement.dataset.ixStats = `f${frames} t${time.toFixed(2)} ` + [...views].map((v) => `${v.canvas.className}:${Math.round(v.w)}x${Math.round(v.h)}:${v.visible ? 'V' : 'h'}${v.canvas.isConnected ? 'C' : 'd'}:${v.canvas.dataset.dbg ?? ''}`).join(' ');
  }
}
const DEBUG_STATS = new URLSearchParams(location.search).has('debug');
let frames = 0;

function ensureLoop() {
  if (raf || document.hidden) return;
  last = performance.now() / 1000;
  raf = requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  } else ensureLoop();
});

/** Standard paper backdrop with a faint dot grid. @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h @param {string} [tint] */
export function paperBg(ctx, w, h, tint = '#FBF5E9') {
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(59,58,74,0.06)';
  for (let y = 12; y < h; y += 22) for (let x = (y / 22) % 2 ? 12 : 23; x < w; x += 22) ctx.fillRect(x, y, 2, 2);
}
