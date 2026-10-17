// @ts-check
// World 2 ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Grandma's Cozy House, seen from above at a gentle angle. Tatami floors, paper
// screens glowing with outside light, a quilted heated table, a steaming teapot, sunbeams full
// of dust motes, a ticking wall clock, a lazy goldfish and a houseplant that has given up on posture.
// Static scenery is painted once per (layout, light bucket) into an offscreen canvas.
import { Pen, ellipsePts, soft } from '../brush.js';
import { INK, WORLDS } from '../palette.js';
import { catmullRom, Track } from '../../core/spline.js';
import { mulberry32, clamp, lerp } from '../../core/rng.js';

/** @typedef {import('./common.js').RoomSpec} RoomSpec */
/** @typedef {import('./common.js').Layout} Layout */
/** @typedef {import('./common.js').RoomOpts} RoomOpts */
/** @typedef {{x:number, y:number}} Pt */

const W = 1920;
const H = 1080;
const P = WORLDS.house;
const WALL = 206; // back wall bottom (floor starts here)
const NB = 5;
const TAU = Math.PI * 2;
const INK_SOFT = 'rgba(59,58,74,0.55)';

// ---------------------------------------------------------------- small utils

/** @param {number} w @param {number} h */
function mkCanvas(w, h) {
  /** @type {any} */
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  return { c: /** @type {CanvasImageSource} */ (c), ctx };
}
/** @param {string} h */
const toRGB = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** @param {number} r @param {number} g @param {number} b */
const toHex = (r, g, b) => '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1);
/** @param {string} a @param {string} b @param {number} t */
function mix(a, b, t) {
  const A = toRGB(a);
  const B = toRGB(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
/** @param {string} h @param {number} a */
function rgba(h, a) {
  const [r, g, b] = toRGB(h);
  return `rgba(${r},${g},${b},${a})`;
}
/** @param {string[]} keys @param {number} l */
function ramp(keys, l) {
  const n = keys.length - 1;
  const f = clamp(l, 0, 1) * n;
  const i = Math.min(n - 1, Math.floor(f));
  return mix(keys[i], keys[i + 1], f - i);
}
/** @param {Pt[]} poly @param {number} x @param {number} y */
function inPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
/** @param {string} s */
function seedOf(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** @template V @param {Map<string, V>} map @param {string} key @param {() => V} make @param {number} max */
function lru(map, key, make, max) {
  let v = map.get(key);
  if (v !== undefined) {
    map.delete(key);
    map.set(key, v);
    return v;
  }
  v = make();
  map.set(key, v);
  while (map.size > max) map.delete(/** @type {string} */ (map.keys().next().value));
  return v;
}
/** @param {CanvasRenderingContext2D} ctx @param {Pt[]} pts */
function polyPath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}
/** @param {number} x @param {number} y @param {number} w @param {number} h @returns {Pt[]} */
const rect = (x, y, w, h) => [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];

// ---------------------------------------------------------------- lighting (morning ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ evening lamp light)

/** @param {number} l */
function tones(l) {
  return {
    tatami: ramp(['#DCCB98', P.tatami, '#C9A974'], l),
    tatamiLight: ramp(['#EAE0B8', '#E8D9A8', '#DDBB86'], l),
    tatamiDark: ramp(['#BFA971', '#BCA36C', '#A6845A'], l),
    heri: ramp(['#3F5149', '#40504A', '#3E3F44'], l),
    wood: ramp([P.wood, '#A07650', '#8E6446'], l),
    woodLight: ramp(['#C29A70', '#C49B6E', '#B98758'], l),
    woodDark: ramp(['#6E4E36', '#6C4C34', '#573A2C'], l),
    plaster: ramp(['#EFE6D2', '#EFE3CB', '#E3C9A6'], l),
    paper: ramp([P.shoji, '#FFF7E4', '#FFD09A'], l),
    paperGlow: ramp(['#FFFFFF', '#FFF8E0', '#FFB66E'], l),
    beam: ramp(['#FFF7DA', '#FFEFC4', '#FFB772'], l),
    shade: ramp(['#5A6A8A', '#6A6070', '#5A4050'], l),
    dim: 0.05 + 0.22 * l * l,
  };
}

// ---------------------------------------------------------------- layouts

/** @type {Layout[]} */
const LAYOUTS = [
  {
    id: '2-1',
    name: 'Tatami Tango',
    paths: [
      [
        { x: -140, y: 330 }, { x: 220, y: 330 }, { x: 560, y: 420 }, { x: 960, y: 640 }, { x: 1300, y: 850 },
        { x: 1560, y: 830 }, { x: 1700, y: 690 }, { x: 1720, y: 580 },
      ],
      [
        { x: -140, y: 880 }, { x: 220, y: 880 }, { x: 560, y: 820 }, { x: 960, y: 640 }, { x: 1300, y: 430 },
        { x: 1560, y: 380 }, { x: 1680, y: 465 }, { x: 1720, y: 580 },
      ],
    ],
    spots: [
      { x: 420, y: 620 }, { x: 720, y: 640 }, { x: 1200, y: 640 }, { x: 1480, y: 620 }, { x: 960, y: 400 },
      { x: 960, y: 880 }, { x: 560, y: 270 }, { x: 560, y: 990 }, { x: 1380, y: 990 }, { x: 1380, y: 280 }, { x: 1830, y: 820 },
    ],
    stash: { x: 1720, y: 580 },
  },
  {
    id: '2-2',
    name: 'Kotatsu Kingdom',
    paths: [
      [
        { x: 430, y: -140 }, { x: 430, y: 140 }, { x: 400, y: 360 }, { x: 480, y: 560 }, { x: 700, y: 640 },
        { x: 960, y: 640 }, { x: 1220, y: 640 }, { x: 1440, y: 720 }, { x: 1580, y: 870 }, { x: 1740, y: 910 },
      ],
    ],
    spots: [
      { x: 250, y: 320 }, { x: 640, y: 330 }, { x: 260, y: 570 }, { x: 960, y: 410 }, { x: 960, y: 880 },
      { x: 640, y: 860 }, { x: 1260, y: 430 }, { x: 1300, y: 880 }, { x: 1560, y: 590 }, { x: 1720, y: 700 }, { x: 1520, y: 1000 },
    ],
    stash: { x: 1740, y: 910 },
  },
  {
    id: '2-3',
    name: 'Laundry Day Mountain',
    paths: [
      [
        { x: -140, y: 965 }, { x: 300, y: 965 }, { x: 700, y: 965 }, { x: 1050, y: 965 }, { x: 1280, y: 965 }, { x: 1390, y: 965 },
        // switchback 1 (rÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â°ÃƒÆ’Ã¢â‚¬Â¹ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 130)
        { x: 1450, y: 965 }, { x: 1500, y: 955 }, { x: 1542, y: 927 }, { x: 1570, y: 885 }, { x: 1580, y: 835 }, { x: 1570, y: 785 },
        { x: 1542, y: 743 }, { x: 1500, y: 715 }, { x: 1450, y: 705 },
        { x: 1390, y: 705 }, { x: 1280, y: 705 }, { x: 1000, y: 705 }, { x: 700, y: 705 }, { x: 570, y: 705 }, { x: 460, y: 705 },
        // switchback 2
        { x: 400, y: 705 }, { x: 350, y: 695 }, { x: 308, y: 667 }, { x: 280, y: 625 }, { x: 270, y: 575 }, { x: 280, y: 525 },
        { x: 308, y: 483 }, { x: 350, y: 455 }, { x: 400, y: 445 },
        { x: 460, y: 445 }, { x: 570, y: 445 }, { x: 800, y: 445 }, { x: 1060, y: 439 }, { x: 1230, y: 405 }, { x: 1370, y: 325 },
      ],
    ],
    spots: [
      { x: 520, y: 835 }, { x: 820, y: 835 }, { x: 1120, y: 835 }, { x: 650, y: 575 }, { x: 950, y: 575 },
      { x: 1250, y: 575 }, { x: 1760, y: 840 }, { x: 130, y: 575 }, { x: 680, y: 300 }, { x: 1000, y: 295 }, { x: 1720, y: 620 },
    ],
    stash: { x: 1370, y: 325 },
  },
];

// ---------------------------------------------------------------- scenery placement per layout

/**
 * @typedef {{
 *   door?: number,
 *   kotatsu?: {x:number, y:number},
 *   tray?: {x:number, y:number},
 *   bowl?: {x:number, y:number},
 *   plant?: {x:number, y:number, s:number},
 *   knit?: {x:number, y:number},
 *   lamp?: {x:number, y:number},
 *   pile?: {cx:number, cy:number, rx:number, ry:number},
 *   hamper?: {x:number, y:number},
 *   line?: boolean,
 *   sideDoors?: number[],
 * }} Scene
 */
/** @type {Record<string, Scene>} */
const SCENES = {
  '2-1': {
    tray: { x: 1150, y: 1000 },
    bowl: { x: 1815, y: 300 },
    plant: { x: 96, y: 650, s: 1.3 },
    knit: { x: 1010, y: 262 },
    lamp: { x: 1840, y: 1010 },
    sideDoors: [330, 880],
  },
  '2-2': {
    door: 430,
    kotatsu: { x: 960, y: 640 },
    bowl: { x: 1810, y: 380 },
    plant: { x: 96, y: 800, s: 1.3 },
    knit: { x: 1110, y: 1010 },
    lamp: { x: 70, y: 1010 },
  },
  '2-3': {
    pile: { cx: 925, cy: 700, rx: 830, ry: 380 },
    hamper: { x: 1660, y: 290 },
    bowl: { x: 1830, y: 1010 },
    plant: { x: 1850, y: 660, s: 1.15 },
    lamp: { x: 80, y: 300 },
    line: true,
  },
};

// shoji sections on the back wall: [x0, x1]; light pours in through these
const WINDOWS = [
  [24, 470],
  [950, 1440],
];

/** @param {number} l floor patch offset for sunlight through the windows */
const beamVec = (l) => ({ x: lerp(230, 720, l), y: lerp(560, 360, l) });

/**
 * @typedef {{
 *   L: Layout, sc: Scene, tracks: Track[], dense: Pt[][],
 *   dPath: (x:number, y:number) => number, dSpot: (x:number, y:number) => number,
 *   motes: {u:number, v:number, w:number, p:number, r:number}[],
 *   socks: {x:number, c:string, p:number, len:number}[],
 * }} Geo
 */
/** @type {Map<string, Geo>} */
const geoCache = new Map();

/** @param {Layout} L @returns {Geo} */
function geo(L) {
  const hit = geoCache.get(L.id);
  if (hit && hit.L === L) return hit;
  const sc = SCENES[L.id] ?? SCENES['2-1'];
  const tracks = L.paths.map((p) => new Track(p, 18));
  const dense = L.paths.map((p) => catmullRom(p, 18));
  /** @param {number} x @param {number} y */
  const dPath = (x, y) => {
    let m = Infinity;
    for (const t of tracks) m = Math.min(m, t.distanceTo({ x, y }));
    return m;
  };
  /** @param {number} x @param {number} y */
  const dSpot = (x, y) => {
    let m = Math.hypot(L.stash.x - x, L.stash.y - y) - 50;
    for (const s of L.spots) m = Math.min(m, Math.hypot(s.x - x, s.y - y));
    return m;
  };
  const rnd = mulberry32(seedOf(L.id));
  const motes = [];
  for (let i = 0; i < 46; i++) motes.push({ u: rnd(), v: rnd(), w: Math.floor(rnd() * WINDOWS.length), p: rnd() * TAU, r: 1.2 + rnd() * 2.2 });
  const sockCols = ['#F4A6B7', '#9FC9E8', '#F2C14E', '#BFE6D3', '#D9CCF2', '#FFFDF6'];
  const socks = [];
  for (let x = 560; x < 900; x += 52 + rnd() * 20) socks.push({ x, c: sockCols[socks.length % sockCols.length], p: rnd() * TAU, len: 40 + rnd() * 16 });
  /** @type {Geo} */
  const g = { L, sc, tracks, dense, dPath, dSpot, motes, socks };
  geoCache.set(L.id, g);
  return g;
}

/** @type {Map<string, CanvasImageSource>} */
const backCache = new Map();
/** @param {Layout} L @param {number} b */
function backLayer(L, b) {
  return lru(backCache, L.id + '|' + b, () => paintBack(geo(L), b / (NB - 1)), 6);
}
/** @type {Set<string>} */
const pending = new Set();
/**
 * Paint the next light bucket when the browser is idle (no hitch as the lighting drifts).
 * @param {Layout} L @param {number} b @returns {CanvasImageSource|null}
 */
function backLayerSoon(L, b) {
  const key = L.id + '|' + b;
  const ready = backCache.get(key);
  if (ready) return ready;
  if (!pending.has(key)) {
    pending.add(key);
    const run = () => {
      pending.delete(key);
      backLayer(L, b);
    };
    const g = /** @type {any} */ (globalThis);
    if (g.requestIdleCallback) g.requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 30);
  }
  return null;
}

// ---------------------------------------------------------------- the static room layer

/** @param {Geo} g @param {number} l */
function paintBack(g, l) {
  const { c, ctx } = mkCanvas(W, H);
  const k = tones(l);
  const pen = new Pen(ctx);
  pen.begin(0, { boil: false, width: 3 });
  const rnd = mulberry32(seedOf(g.L.id) ^ 0xbeef);
  const sc = g.sc;
  const canBlur = 'filter' in ctx;

  paintFloor(ctx, k, rnd);
  paintSunPatches(ctx, k, l, canBlur);
  // gentle wear along the routes (rug shadow and slightly flattened mats)
  ctx.save();
  if (canBlur) ctx.filter = 'blur(16px)';
  ctx.strokeStyle = rgba(k.tatamiLight, 0.4);
  ctx.lineWidth = 190;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const d of g.dense) {
    ctx.beginPath();
    ctx.moveTo(d[0].x, d[0].y);
    for (const p of d) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.restore();

  if (sc.pile) paintPile(ctx, pen, sc.pile, g, k, rnd);
  paintWall(ctx, pen, g, k, l, rnd);

  /** @type {{y:number, f:() => void}[]} */
  const props = [];
  if (sc.hamper) {
    const h = sc.hamper;
    props.push({ y: h.y, f: () => paintHamper(ctx, pen, h.x, h.y, k, rnd) });
  }
  if (sc.tray) {
    const tr = sc.tray;
    props.push({ y: tr.y, f: () => paintTray(ctx, pen, tr.x, tr.y, k) });
  }
  if (sc.bowl) {
    const b = sc.bowl;
    props.push({ y: b.y, f: () => paintBowlBack(ctx, pen, b.x, b.y, k) });
  }
  if (sc.knit) {
    const kn = sc.knit;
    props.push({ y: kn.y, f: () => paintKnitting(ctx, pen, kn.x, kn.y, k) });
  }
  if (sc.lamp) {
    const lp = sc.lamp;
    props.push({ y: lp.y, f: () => paintLamp(ctx, pen, lp.x, lp.y, k, l) });
  }
  if (sc.plant) {
    const pl = sc.plant;
    props.push({ y: pl.y, f: () => paintPot(ctx, pen, pl.x, pl.y, pl.s, k) });
  }
  props.sort((a, b) => a.y - b.y).forEach((p) => p.f());
  paintShafts(ctx, k, l);

  // evening: the room dims, lamps take over
  ctx.save();
  ctx.fillStyle = rgba('#3A2A3A', k.dim);
  ctx.fillRect(0, 0, W, H);
  if (sc.lamp && l > 0.35) {
    ctx.globalCompositeOperation = 'lighter';
    const a = (l - 0.35) / 0.65;
    const gl = ctx.createRadialGradient(sc.lamp.x, sc.lamp.y - 70, 10, sc.lamp.x, sc.lamp.y - 70, 520);
    gl.addColorStop(0, `rgba(255,170,90,${0.38 * a})`);
    gl.addColorStop(1, 'rgba(255,170,90,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  const vg = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.4, W / 2, H * 0.55, H * 1.05);
  vg.addColorStop(0, 'rgba(70,46,40,0)');
  vg.addColorStop(1, `rgba(70,46,40,${0.24 + 0.1 * l})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  return c;
}

/** Brick-laid tatami with woven texture and dark cloth borders. @param {CanvasRenderingContext2D} ctx @param {ReturnType<typeof tones>} k @param {() => number} rnd */
function paintFloor(ctx, k, rnd) {
  const mw = 384;
  const mh = 192;
  ctx.fillStyle = k.tatamiDark;
  ctx.fillRect(0, WALL, W, H - WALL);
  for (let row = 0, y = WALL; y < H; row++, y += mh) {
    const off = row % 2 ? -mw / 2 : -mw / 4;
    for (let x = off; x < W; x += mw) {
      const fade = rnd();
      const g = ctx.createLinearGradient(x, y, x + mw * 0.6, y + mh);
      g.addColorStop(0, mix(k.tatamiLight, k.tatami, 0.3 + fade * 0.3));
      g.addColorStop(1, mix(k.tatami, k.tatamiDark, 0.15 + fade * 0.25));
      ctx.fillStyle = g;
      ctx.fillRect(x + 1.5, y + 1.5, mw - 3, mh - 3);
      // woven rush texture along the long side
      ctx.strokeStyle = rgba(k.tatamiDark, 0.32);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let yy = y + 16; yy < y + mh - 14; yy += 5) {
        ctx.moveTo(x + 4, yy + (rnd() - 0.5));
        ctx.lineTo(x + mw - 4, yy + (rnd() - 0.5));
      }
      ctx.stroke();
      ctx.strokeStyle = rgba(k.tatamiLight, 0.35);
      ctx.beginPath();
      for (let xx = x + 30; xx < x + mw - 10; xx += 46) {
        ctx.moveTo(xx, y + 14);
        ctx.lineTo(xx, y + mh - 14);
      }
      ctx.stroke();
      // heri: cloth borders on the long edges
      for (const by of [y + 1, y + mh - 12]) {
        ctx.fillStyle = k.heri;
        ctx.fillRect(x + 1, by, mw - 2, 11);
        ctx.strokeStyle = rgba('#C9C7B0', 0.35);
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(x + 3, by + 5.5);
        ctx.lineTo(x + mw - 3, by + 5.5);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = rgba('#5A4A30', 0.35);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, mw - 2, mh - 2);
    }
  }
  // floor shadow under the back wall
  const sh = ctx.createLinearGradient(0, WALL, 0, WALL + 60);
  sh.addColorStop(0, 'rgba(60,40,30,0.35)');
  sh.addColorStop(1, 'rgba(60,40,30,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, WALL, W, 60);
}

/** Window light on the floor with the lattice shadow of the paper screens. @param {CanvasRenderingContext2D} ctx @param {ReturnType<typeof tones>} k @param {number} l @param {boolean} canBlur */
function paintSunPatches(ctx, k, l, canBlur) {
  const v = beamVec(l);
  for (const [x0, x1] of WINDOWS) {
    const poly = [{ x: x0, y: WALL }, { x: x1, y: WALL }, { x: x1 + v.x, y: WALL + v.y }, { x: x0 + v.x, y: WALL + v.y }];
    ctx.save();
    if (canBlur) ctx.filter = 'blur(10px)';
    ctx.globalCompositeOperation = 'lighter';
    polyPath(ctx, poly);
    const g = ctx.createLinearGradient(0, WALL, 0, WALL + v.y);
    g.addColorStop(0, rgba(k.beam, 0.34 - 0.08 * l));
    g.addColorStop(1, rgba(k.beam, 0.12));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // lattice shadows: projected verticals + horizontals
    ctx.save();
    polyPath(ctx, poly);
    ctx.clip();
    if (canBlur) ctx.filter = 'blur(2px)';
    ctx.strokeStyle = rgba(k.shade, 0.16);
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += (x1 - x0) / 12) {
      ctx.moveTo(x, WALL);
      ctx.lineTo(x + v.x, WALL + v.y);
    }
    for (let j = 1; j < 6; j++) {
      const u = j / 6;
      ctx.moveTo(x0 + v.x * u, WALL + v.y * u);
      ctx.lineTo(x1 + v.x * u, WALL + v.y * u);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** @param {Scene} sc */
const clockX = (sc) => (sc.line ? 1690 : 725);

/**
 * Back wall: transom, lintel, posts, glowing shoji, a plaster bay with the clock, and an alcove.
 * @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {Geo} g @param {ReturnType<typeof tones>} k @param {number} l @param {() => number} rnd
 */
function paintWall(ctx, pen, g, k, l, rnd) {
  const sc = g.sc;
  ctx.fillStyle = k.plaster;
  ctx.fillRect(0, 0, W, WALL);
  // plaster texture
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = rgba(rnd() < 0.5 ? '#FFFFFF' : '#C9B89A', 0.08);
    ctx.beginPath();
    ctx.arc(rnd() * W, 40 + rnd() * 150, 6 + rnd() * 20, 0, TAU);
    ctx.fill();
  }
  // tokonoma alcove (recessed, a touch darker)
  const ax = 1490;
  ctx.fillStyle = mix(k.plaster, '#BFA888', 0.28);
  ctx.fillRect(ax, 38, W - ax, WALL - 38);
  ctx.fillStyle = 'rgba(70,50,40,0.18)';
  ctx.fillRect(ax, 38, 26, WALL - 38);
  // shoji windows
  for (const [x0, x1] of WINDOWS) paintShoji(ctx, x0, x1, k, l, rnd, x0 > 600);
  // clock or scroll in the alcove
  if (!sc.line) paintScroll(ctx, pen, 1700, k);
  else {
    ctx.strokeStyle = rgba('#8A7A62', 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(530, 108);
    ctx.quadraticCurveTo(725, 140, 920, 108);
    ctx.stroke();
    for (const x of [530, 920]) {
      ctx.fillStyle = k.woodDark;
      ctx.beginPath();
      ctx.arc(x, 108, 4, 0, TAU);
      ctx.fill();
    }
  }
  paintClockCase(ctx, pen, clockX(sc), k);
  // vase with a flowering branch on the alcove platform
  const vx = sc.line ? 1560 : 1850;
  pen.blob(ellipsePts(vx, 172, 16, 20, 14), soft(ctx, vx, 172, 18, '#B9D3E0', '#6E94B0', '#3F5E78'), { width: 2 });
  pen.line([{ x: vx, y: 154 }, { x: vx - 14, y: 112 }, { x: vx - 36, y: 84 }], { color: '#6B4E3A', width: 3 });
  pen.line([{ x: vx - 14, y: 112 }, { x: vx + 14, y: 86 }], { color: '#6B4E3A', width: 2.5 });
  for (const [fx, fy] of [[-36, 84], [14, 86], [-22, 100], [-4, 96]]) {
    ctx.fillStyle = '#F4A6B7';
    ctx.beginPath();
    ctx.arc(vx + fx, fy, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#FFF1C1';
    ctx.beginPath();
    ctx.arc(vx + fx, fy, 2, 0, TAU);
    ctx.fill();
  }
  // alcove platform
  ctx.fillStyle = k.woodDark;
  ctx.fillRect(ax, 190, W - ax, 16);
  ctx.fillStyle = rgba('#FFFFFF', 0.12);
  ctx.fillRect(ax, 190, W - ax, 3);
  // transom with carved cloud cut-outs + lintel
  ctx.fillStyle = k.woodDark;
  ctx.fillRect(0, 0, W, 24);
  ctx.fillStyle = rgba(k.paperGlow, 0.45);
  for (let x = 60; x < W; x += 240) {
    for (const [ox, r] of [[0, 7], [12, 9], [26, 6]]) {
      ctx.beginPath();
      ctx.ellipse(x + ox, 12, r * 1.6, r * 0.7, 0, 0, TAU);
      ctx.fill();
    }
  }
  const lg = ctx.createLinearGradient(0, 22, 0, 40);
  lg.addColorStop(0, k.woodLight);
  lg.addColorStop(1, k.wood);
  ctx.fillStyle = lg;
  ctx.fillRect(0, 22, W, 18);
  // posts
  for (const x of [0, 470, 930, 1440]) {
    const w = x === 0 ? 24 : 50;
    const pg = ctx.createLinearGradient(x, 0, x + w, 0);
    pg.addColorStop(0, k.woodLight);
    pg.addColorStop(0.6, k.wood);
    pg.addColorStop(1, k.woodDark);
    ctx.fillStyle = pg;
    ctx.fillRect(x, 22, w, WALL - 22);
    ctx.strokeStyle = rgba(k.woodDark, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let j = 1; j < 3; j++) {
      ctx.moveTo(x + (w * j) / 3, 40);
      ctx.bezierCurveTo(x + (w * j) / 3 + 3, 90, x + (w * j) / 3 - 3, 140, x + (w * j) / 3, WALL);
    }
    ctx.stroke();
  }
  // sill
  ctx.fillStyle = k.woodLight;
  ctx.fillRect(0, WALL - 10, W, 10);
  ctx.fillStyle = rgba(k.woodDark, 0.5);
  ctx.fillRect(0, WALL - 2, W, 2);
  // open door to the veranda (2-2): sky, garden, boards
  if (sc.door != null) {
    const d0 = sc.door - 92;
    const d1 = sc.door + 92;
    const og = ctx.createLinearGradient(0, 40, 0, WALL);
    og.addColorStop(0, ramp(['#A8D6EE', '#BCDDEA', '#F2B48C'], l));
    og.addColorStop(0.55, ramp(['#DDEFF0', '#F2F0DC', '#FFD39C'], l));
    og.addColorStop(1, ramp(['#DDEFF0', '#F2F0DC', '#FFD39C'], l));
    ctx.fillStyle = og;
    ctx.fillRect(d0, 40, d1 - d0, WALL - 50);
    for (let i = 0; i < 9; i++) {
      const x = d0 + rnd() * (d1 - d0);
      const r = 22 + rnd() * 20;
      ctx.fillStyle = mix(ramp(['#6FA75B', '#73A657', '#6E8A52'], l), '#3E6C4C', rnd() * 0.5);
      ctx.beginPath();
      ctx.ellipse(x, 120 + rnd() * 20, r, r * 0.8, 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = k.woodLight;
    ctx.fillRect(d0, 150, d1 - d0, WALL - 160);
    ctx.strokeStyle = rgba(k.woodDark, 0.5);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let y = 160; y < WALL - 10; y += 12) {
      ctx.moveTo(d0, y);
      ctx.lineTo(d1, y);
    }
    ctx.stroke();
    // slid-open panels stacked beside the opening
    paintShoji(ctx, d0 - 120, d0, k, l, rnd, false);
    ctx.fillStyle = k.wood;
    ctx.fillRect(d0 - 8, 38, 10, WALL - 48);
    ctx.fillRect(d1 - 2, 38, 10, WALL - 48);
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x0 @param {number} x1 @param {ReturnType<typeof tones>} k @param {number} l @param {() => number} rnd @param {boolean} leaves */
function paintShoji(ctx, x0, x1, k, l, rnd, leaves) {
  const top = 40;
  const bot = WALL - 10;
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, k.paperGlow);
  g.addColorStop(1, k.paper);
  ctx.fillStyle = g;
  ctx.fillRect(x0, top, x1 - x0, bot - top);
  // soft shadow of a garden branch on the paper
  if (leaves) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, top, x1 - x0, bot - top);
    ctx.clip();
    if ('filter' in ctx) ctx.filter = 'blur(4px)';
    ctx.fillStyle = rgba(k.shade, 0.16);
    ctx.strokeStyle = rgba(k.shade, 0.16);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1 + 20, top + 10);
    ctx.quadraticCurveTo(x1 - 160, top + 40, x1 - 300, top + 110);
    ctx.stroke();
    for (let i = 0; i < 22; i++) {
      const u = i / 22;
      const x = x1 + 20 - u * 320 + (rnd() - 0.5) * 40;
      const y = top + 10 + u * 100 + (rnd() - 0.5) * 50;
      ctx.beginPath();
      ctx.ellipse(x, y, 16, 7, rnd() * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // lattice + kick panel
  const panels = Math.max(1, Math.round((x1 - x0) / 115));
  const pw = (x1 - x0) / panels;
  ctx.strokeStyle = k.woodLight;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let p = 0; p < panels; p++) {
    const px = x0 + p * pw;
    for (let j = 1; j < 3; j++) {
      ctx.moveTo(px + (pw * j) / 3, top);
      ctx.lineTo(px + (pw * j) / 3, bot - 34);
    }
  }
  for (let y = top + 24; y < bot - 34; y += 24) {
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
  }
  ctx.stroke();
  ctx.fillStyle = k.wood;
  ctx.fillRect(x0, bot - 34, x1 - x0, 34);
  ctx.strokeStyle = k.woodDark;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let p = 0; p <= panels; p++) {
    ctx.moveTo(x0 + p * pw, top);
    ctx.lineTo(x0 + p * pw, bot);
  }
  ctx.stroke();
  ctx.fillStyle = rgba(k.woodDark, 0.35);
  for (let p = 0; p < panels; p++) ctx.fillRect(x0 + p * pw + 10, bot - 26, pw - 20, 3);
  // little round finger pulls
  ctx.fillStyle = rgba(k.woodDark, 0.6);
  for (let p = 0; p < panels; p++) {
    ctx.beginPath();
    ctx.arc(x0 + p * pw + (p % 2 ? 12 : pw - 12), 112, 4, 0, TAU);
    ctx.fill();
  }
}

/** Hanging scroll with an original ink painting: a cat curled under a round moon. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {ReturnType<typeof tones>} k */
function paintScroll(ctx, pen, x, k) {
  const w = 118;
  ctx.fillStyle = 'rgba(60,40,30,0.18)';
  ctx.fillRect(x - w / 2 + 6, 50, w, 132);
  ctx.fillStyle = mix('#7E8C6C', k.plaster, 0.1);
  ctx.fillRect(x - w / 2, 44, w, 134);
  ctx.fillStyle = mix('#F3EBD6', k.plaster, 0.2);
  ctx.fillRect(x - w / 2 + 12, 56, w - 24, 106);
  ctx.fillStyle = rgba('#F2D88A', 0.7);
  ctx.beginPath();
  ctx.arc(x + 14, 84, 16, 0, TAU);
  ctx.fill();
  pen.line([{ x: x - 30, y: 146 }, { x: x - 20, y: 128 }, { x: x + 4, y: 124 }, { x: x + 24, y: 134 }, { x: x + 22, y: 148 }, { x: x - 8, y: 150 }, { x: x - 22, y: 144 }], { width: 2.5, color: '#3B3A4A' });
  pen.line([{ x: x - 22, y: 132 }, { x: x - 26, y: 122 }, { x: x - 17, y: 127 }], { width: 2, color: '#3B3A4A' });
  pen.line([{ x: x - 40, y: 160 }, { x: x + 34, y: 160 }], { width: 1.5, color: rgba('#3B3A4A', 0.5) });
  ctx.fillStyle = '#C8473A';
  ctx.fillRect(x + 26, 146, 8, 10);
  ctx.fillStyle = k.woodDark;
  ctx.fillRect(x - w / 2 - 6, 40, w + 12, 6);
  ctx.fillRect(x - w / 2 - 8, 176, w + 16, 8);
  ctx.strokeStyle = rgba('#3B3A4A', 0.7);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 20, 40);
  ctx.lineTo(x, 26);
  ctx.lineTo(x + 20, 40);
  ctx.stroke();
}

/** Wooden regulator clock (hands and pendulum are drawn live). @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {ReturnType<typeof tones>} k */
function paintClockCase(ctx, pen, x, k) {
  ctx.fillStyle = 'rgba(60,40,30,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + 8, 120, 48, 80, 0, 0, TAU);
  ctx.fill();
  const wood = soft(ctx, x, 100, 70, k.woodLight, k.wood, k.woodDark);
  pen.blob([{ x: x - 30, y: 104 }, { x: x + 30, y: 104 }, { x: x + 30, y: 188 }, { x: x, y: 196 }, { x: x - 30, y: 188 }], wood, { width: 2.5 });
  pen.blob(ellipsePts(x, 70, 44, 44, 24), wood, { width: 2.5 });
  pen.blob(ellipsePts(x, 70, 34, 34, 24), soft(ctx, x, 70, 34, '#FFFDF6', '#F6EEDC', '#E2D4B4'), { width: 2 });
  ctx.fillStyle = INK;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 27, 70 + Math.sin(a) * 27, i % 3 ? 1.6 : 3, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = rgba('#2E2620', 0.75);
  ctx.fillRect(x - 18, 116, 36, 64);
  ctx.strokeStyle = rgba('#FFFFFF', 0.25);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 12, 172);
  ctx.lineTo(x + 6, 122);
  ctx.stroke();
}

/**
 * The laundry mountain: a pastel avalanche of towels, shirts, socks and sweaters peaking at the stash.
 * @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {NonNullable<Scene['pile']>} pl @param {Geo} g @param {ReturnType<typeof tones>} k @param {() => number} rnd
 */
function paintPile(ctx, pen, pl, g, k, rnd) {
  const peak = { x: g.L.stash.x, y: g.L.stash.y - 60 };
  /** @param {number} x */
  const topY = (x) =>
    peak.y + (x < peak.x ? ((peak.x - x) / (peak.x - 40)) ** 2.2 * 270 : ((x - peak.x) / (1840 - peak.x)) ** 1.8 * 420) + Math.sin(x * 0.03) * 10;
  /** @type {Pt[]} */
  const poly = [];
  for (let x = 40; x <= 1840; x += 20) poly.push({ x, y: topY(x) });
  poly.push({ x: 1800, y: 900 }, { x: 1740, y: H + 30 }, { x: 0, y: H + 30 }, { x: 10, y: 800 });
  // contact shadow + base mass
  ctx.save();
  if ('filter' in ctx) ctx.filter = 'blur(18px)';
  polyPath(ctx, poly.map((p) => ({ x: p.x + 24, y: p.y + 30 })));
  ctx.fillStyle = 'rgba(70,50,40,0.35)';
  ctx.fill();
  ctx.restore();
  polyPath(ctx, poly);
  const bg = ctx.createLinearGradient(0, peak.y, 0, H);
  bg.addColorStop(0, '#F3EBDD');
  bg.addColorStop(1, '#CFC2B6');
  ctx.fillStyle = bg;
  ctx.fill();
  const cols = ['#F6EEDC', '#9FCDE6', '#F4AFA6', '#B5DDB0', '#D4C2F0', '#F8D47E', '#FFFDF6', '#8FB3DE', '#EE9FB3', '#F2C14E'];
  /** @type {{x:number, y:number, s:number, kind:number, c:string, a:number}[]} */
  const items = [];
  for (let i = 0; i < 2200 && items.length < 170; i++) {
    const x = 40 + rnd() * 1800;
    const y = peak.y + 20 + rnd() * (H - peak.y);
    if (!inPoly(poly, x, y) || y < topY(x) + 14) continue;
    const s = 0.75 + ((y - peak.y) / (H - peak.y)) * 0.65 + rnd() * 0.2;
    items.push({ x, y, s, kind: Math.floor(rnd() * 5), c: cols[Math.floor(rnd() * cols.length)], a: (rnd() - 0.5) * 1.2 });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) {
    const near = g.dPath(it.x, it.y) < 90;
    const depth = clamp((it.y - peak.y) / (H - peak.y), 0, 1);
    const base = mix(near ? mix(it.c, '#F6EEDC', 0.3) : it.c, '#A89890', depth * 0.12);
    // soft drop shadow so each layer of laundry sits on the one below
    shadow(ctx, it.x + 8, it.y + 22 * it.s, 70 * it.s, 26 * it.s, 0.2);
    paintGarment(ctx, pen, it.x, it.y, it.s, it.kind, base, it.a, rnd);
  }
  // soft light from the windows on the upper slopes
  ctx.save();
  polyPath(ctx, poly);
  ctx.clip();
  const lt = ctx.createLinearGradient(0, peak.y, 0, H);
  lt.addColorStop(0, rgba(k.beam, 0.22));
  lt.addColorStop(0.6, rgba(k.beam, 0));
  lt.addColorStop(1, 'rgba(80,60,60,0.06)');
  ctx.fillStyle = lt;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s @param {number} kind @param {string} col @param {number} a @param {() => number} rnd */
function paintGarment(ctx, pen, x, y, s, kind, col, a, rnd) {
  const ink = { ink: 'rgba(59,58,74,0.42)', width: 2 };
  const fill = soft(ctx, x, y, 60 * s, mix(col, '#FFFFFF', 0.45), col, mix(col, '#8A7A80', 0.35));
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(s, s);
  const stripe = mix(col, '#5A6E9A', 0.45);
  if (kind === 0) {
    // folded towel with end stripes
    pen.blob([{ x: -62, y: -26 }, { x: 62, y: -30 }, { x: 66, y: 24 }, { x: -60, y: 28 }], fill, ink);
    ctx.fillStyle = rgba(stripe, 0.55);
    ctx.fillRect(-50, -26, 7, 52);
    ctx.fillRect(44, -28, 7, 52);
  } else if (kind === 1) {
    // T-shirt
    pen.blob([
      { x: -26, y: -34 }, { x: -10, y: -38 }, { x: 0, y: -30 }, { x: 10, y: -38 }, { x: 26, y: -34 }, { x: 52, y: -16 }, { x: 40, y: -2 },
      { x: 26, y: -10 }, { x: 28, y: 36 }, { x: -28, y: 36 }, { x: -26, y: -10 }, { x: -40, y: -2 }, { x: -52, y: -16 },
    ], fill, ink);
    pen.line([{ x: -10, y: -36 }, { x: 0, y: -26 }, { x: 10, y: -36 }], { color: 'rgba(59,58,74,0.35)', width: 1.5 });
  } else if (kind === 2) {
    // sock (with a contrasting heel and toe)
    pen.tube([{ x: -10, y: -34 }, { x: -6, y: 4 }, { x: 22, y: 16 }], 22, col);
    ctx.fillStyle = rgba(stripe, 0.5);
    ctx.beginPath();
    ctx.arc(22, 16, 10, 0, TAU);
    ctx.arc(-6, 6, 9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba('#FFFFFF', 0.6);
    ctx.fillRect(-20, -34, 20, 6);
  } else if (kind === 3) {
    // chunky sweater lump with ribbing
    pen.blob(ellipsePts(0, 0, 66, 36, 20, (q) => 1 + 0.1 * Math.cos(5 * q + x)), fill, ink);
    ctx.strokeStyle = 'rgba(59,58,74,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -4; i <= 4; i++) {
      ctx.moveTo(i * 12, -24 + Math.abs(i) * 2);
      ctx.lineTo(i * 12 + 4, 24 - Math.abs(i) * 2);
    }
    ctx.stroke();
  } else {
    // polka-dot pillowcase
    pen.blob([{ x: -46, y: -30 }, { x: 46, y: -26 }, { x: 50, y: 28 }, { x: -48, y: 30 }], fill, ink);
    ctx.fillStyle = rgba(stripe, 0.35);
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(-34 + (i % 4) * 22 + (i > 3 ? 11 : 0), -12 + (i > 3 ? 22 : 0), 4, 0, TAU);
      ctx.fill();
    }
  }
  // a soft fold
  pen.line([{ x: -20 + rnd() * 10, y: -6 }, { x: 0, y: 4 }, { x: 18, y: -2 }], { color: 'rgba(59,58,74,0.2)', width: 1.5 });
  ctx.restore();
}

/** Tipped-over wicker laundry hamper, still spilling. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {ReturnType<typeof tones>} k @param {() => number} rnd */
function paintHamper(ctx, pen, x, y, k, rnd) {
  ctx.fillStyle = 'rgba(70,50,40,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 20, y + 54, 140, 30, 0, 0, TAU);
  ctx.fill();
  const wick = soft(ctx, x, y, 140, '#E6CB92', '#C9A468', '#8E6E42');
  pen.blob([{ x: x - 40, y: y - 70 }, { x: x + 120, y: y - 60 }, { x: x + 130, y: y + 40 }, { x: x - 30, y: y + 56 }], wick, { width: 3 });
  ctx.strokeStyle = rgba('#7A5A36', 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    ctx.moveTo(x - 38 + u * 160, y - 68 + u * 10);
    ctx.lineTo(x - 30 + u * 160, y + 54 - u * 16);
  }
  for (let j = 1; j < 6; j++) {
    const v = j / 6;
    ctx.moveTo(x - 40 + v * 10, y - 70 + v * 126);
    ctx.lineTo(x + 120 + v * 10, y - 60 + v * 100);
  }
  ctx.stroke();
  // the dark mouth facing the pile
  pen.blob(ellipsePts(x - 40, y - 6, 34, 64, 20), soft(ctx, x - 40, y - 6, 64, '#8E6E42', '#5E452C', '#3E2C1E'), { width: 3 });
  for (let i = 0; i < 4; i++) {
    const cols = ['#BFE0EE', '#F7C9C1', '#FBE3A6', '#E3D7F2'];
    paintGarment(ctx, pen, x - 60 - i * 26 + rnd() * 10, y + 10 + i * 18, 0.7, i % 2 ? 2 : 0, cols[i], -0.4 + rnd() * 0.6, rnd);
  }
}

// ---------------------------------------------------------------- props

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} rx @param {number} ry @param {number} [a] */
function shadow(ctx, x, y, rx, ry, a = 0.26) {
  const g = ctx.createRadialGradient(x + rx * 0.15, y, 0, x + rx * 0.15, y, rx);
  g.addColorStop(0, `rgba(70,46,40,${a})`);
  g.addColorStop(1, 'rgba(70,46,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.15, y, rx, ry, 0.08, 0, TAU);
  ctx.fill();
}

/** Celadon teapot. Returns where its steam comes out. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s */
function paintTeapot(ctx, pen, x, y, s) {
  const glaze = soft(ctx, x, y - 26 * s, 34 * s, '#DDEBCF', P.tea, '#64805A');
  pen.tube([{ x: x + 24 * s, y: y - 22 * s }, { x: x + 40 * s, y: y - 30 * s }, { x: x + 48 * s, y: y - 44 * s }], 9 * s, P.tea);
  pen.blob(ellipsePts(x, y - 24 * s, 34 * s, 28 * s, 22), glaze, { width: 2.5 });
  pen.blob(ellipsePts(x, y - 50 * s, 18 * s, 6 * s, 14), mix(P.tea, '#4F6A48', 0.3), { width: 2 });
  pen.blob(ellipsePts(x, y - 56 * s, 6 * s, 5 * s, 10), '#6E8A62', { width: 2 });
  // bamboo handle arching over
  pen.line([{ x: x - 26 * s, y: y - 44 * s }, { x: x - 10 * s, y: y - 78 * s }, { x: x + 14 * s, y: y - 78 * s }, { x: x + 26 * s, y: y - 44 * s }], { color: '#8C6A44', width: 5 * s });
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(x - 14 * s, y - 34 * s, 8 * s, 5 * s, -0.5, 0, TAU);
  ctx.fill();
  return { x: x + 4 * s, y: y - 64 * s };
}

/** @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s */
function paintCup(ctx, pen, x, y, s) {
  pen.blob([{ x: x - 13 * s, y: y - 22 * s }, { x: x + 13 * s, y: y - 22 * s }, { x: x + 10 * s, y }, { x: x - 10 * s, y }], soft(ctx, x, y - 10 * s, 18 * s, '#FFFDF6', '#EDE4D0', '#C8BBA0'), { width: 2 });
  pen.blob(ellipsePts(x, y - 22 * s, 13 * s, 4.5 * s, 12), '#A7BE8E', { width: 1.5 });
  ctx.strokeStyle = rgba('#6E94B0', 0.8);
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 11 * s, y - 12 * s);
  ctx.quadraticCurveTo(x, y - 8 * s, x + 11 * s, y - 12 * s);
  ctx.stroke();
}

/** Round lacquer tray with tea and rice crackers (2-1). @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {ReturnType<typeof tones>} k */
function paintTray(ctx, pen, x, y, k) {
  shadow(ctx, x + 10, y + 8, 120, 34);
  pen.blob(ellipsePts(x, y, 100, 40, 28), soft(ctx, x, y, 100, '#C0574A', '#8E2F28', '#5E1E1A'), { width: 3 });
  pen.blob(ellipsePts(x, y - 3, 86, 32, 28), soft(ctx, x, y, 86, '#A8473C', '#7A2622', '#541A18'), { stroke: false });
  paintTeapot(ctx, pen, x - 26, y + 6, 0.85);
  paintCup(ctx, pen, x + 42, y - 8, 0.9);
  paintCup(ctx, pen, x + 60, y + 16, 0.9);
  for (const [cx, cy] of [[-70, -4], [-60, 12]]) pen.blob(ellipsePts(x + cx, y + cy, 12, 7, 12), soft(ctx, x + cx, y + cy, 12, '#F6D49A', '#D9A35A', '#A87434'), { width: 1.5 });
  void k;
}

/** Goldfish bowl on a low stool; the fish themselves swim in the live layer. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {ReturnType<typeof tones>} k */
function paintBowlBack(ctx, pen, x, y, k) {
  shadow(ctx, x + 14, y + 6, 90, 22);
  pen.blob([{ x: x - 60, y: y - 26 }, { x: x + 60, y: y - 26 }, { x: x + 64, y: y - 12 }, { x: x - 64, y: y - 12 }], soft(ctx, x, y - 20, 64, k.woodLight, k.wood, k.woodDark), { width: 2.5 });
  for (const d of [-1, 1]) pen.tube([{ x: x + d * 48, y: y - 12 }, { x: x + d * 52, y }], 8, k.woodDark);
  const cy = y - 82;
  const water = ctx.createLinearGradient(0, cy - 40, 0, cy + 56);
  water.addColorStop(0, 'rgba(190,228,240,0.75)');
  water.addColorStop(1, 'rgba(110,170,200,0.85)');
  pen.blob(ellipsePts(x, cy, 62, 58, 30), 'rgba(220,240,246,0.55)', { width: 2.5 });
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, cy, 58, 54, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = water;
  ctx.fillRect(x - 64, cy - 30, 128, 90);
  ctx.fillStyle = '#C9B89A';
  ctx.fillRect(x - 64, cy + 36, 128, 30);
  ctx.fillStyle = '#A8D08A';
  for (const [px, py] of [[-20, 30], [24, 28]]) {
    ctx.beginPath();
    ctx.ellipse(x + px, cy + py - 16, 6, 22, px > 0 ? 0.3 : -0.2, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  pen.blob(ellipsePts(x, cy - 32, 40, 9, 20), 'rgba(220,244,250,0.6)', { width: 2 });
}

/** Grandma's knitting basket with yarn and needles. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {ReturnType<typeof tones>} k */
function paintKnitting(ctx, pen, x, y, k) {
  shadow(ctx, x + 12, y + 6, 76, 20);
  ctx.strokeStyle = '#F4A6B7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 30, y - 10);
  ctx.bezierCurveTo(x + 90, y + 20, x + 60, y + 50, x + 130, y + 40);
  ctx.stroke();
  pen.blob(ellipsePts(x, y - 10, 58, 26, 24), soft(ctx, x, y - 10, 58, '#E6CB92', '#C9A468', '#8E6E42'), { width: 2.5 });
  const yarns = [['#F4A6B7', -22, -26], ['#BFE6D3', 10, -30], ['#D9CCF2', 30, -18], ['#F2C14E', -2, -14]];
  for (const [c, dx, dy] of yarns) {
    const yx = x + /** @type {number} */ (dx);
    const yy = y + /** @type {number} */ (dy);
    pen.blob(ellipsePts(yx, yy, 17, 15, 14), soft(ctx, yx, yy, 17, mix(/** @type {string} */ (c), '#FFFFFF', 0.4), /** @type {string} */ (c), mix(/** @type {string} */ (c), '#5A4A60', 0.35)), { width: 2 });
    ctx.strokeStyle = rgba('#FFFFFF', 0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(yx, yy, 9, -2.4, -0.4);
    ctx.stroke();
  }
  pen.line([{ x: x - 30, y: y - 60 }, { x: x - 6, y: y - 20 }], { color: k.woodDark, width: 3 });
  pen.line([{ x: x - 10, y: y - 64 }, { x: x + 2, y: y - 22 }], { color: k.woodDark, width: 3 });
  pen.line([{ x: x - 58, y: y - 4 }, { x: x + 58, y: y - 4 }], { color: rgba('#8E6E42', 0.6), width: 1.5 });
}

/** Paper floor lantern; it glows in the evening. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {ReturnType<typeof tones>} k @param {number} l */
function paintLamp(ctx, pen, x, y, k, l) {
  shadow(ctx, x + 18, y + 4, 60, 16);
  const on = clamp((l - 0.35) / 0.5, 0, 1);
  const paper = mix('#EDE6D6', '#FFD08A', on);
  const glowTop = mix('#FFFFFF', '#FFF0C8', on);
  for (const d of [-1, 1]) pen.tube([{ x: x + d * 30, y }, { x: x + d * 28, y: y - 20 }], 6, k.woodDark);
  const pg = ctx.createLinearGradient(0, y - 140, 0, y - 20);
  pg.addColorStop(0, glowTop);
  pg.addColorStop(1, paper);
  ctx.fillStyle = pg;
  ctx.fillRect(x - 34, y - 140, 68, 120);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 34, y - 140, 68, 120);
  ctx.strokeStyle = k.woodDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 140);
  ctx.lineTo(x, y - 20);
  ctx.moveTo(x - 34, y - 80);
  ctx.lineTo(x + 34, y - 80);
  ctx.stroke();
  ctx.fillStyle = k.woodDark;
  ctx.fillRect(x - 40, y - 148, 80, 10);
  ctx.fillRect(x - 38, y - 24, 76, 6);
}

/** Glazed pot (the lazy leaves are drawn live). @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s @param {ReturnType<typeof tones>} k */
function paintPot(ctx, pen, x, y, s, k) {
  shadow(ctx, x + 14 * s, y + 4, 70 * s, 18 * s);
  pen.blob([{ x: x - 44 * s, y: y - 70 * s }, { x: x + 44 * s, y: y - 70 * s }, { x: x + 34 * s, y }, { x: x - 34 * s, y }], soft(ctx, x, y - 40 * s, 60 * s, '#9CC9C4', '#4E8683', '#2E5654'), { width: 3 });
  pen.blob(ellipsePts(x, y - 70 * s, 44 * s, 12 * s, 20), '#5A4030', { width: 2.5 });
  ctx.strokeStyle = rgba('#FFFDF6', 0.55);
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 38 * s, y - 50 * s);
  ctx.quadraticCurveTo(x, y - 42 * s, x + 38 * s, y - 50 * s);
  ctx.stroke();
  void k;
}

/** @type {Map<string, {img: CanvasImageSource, steam: Pt}>} */
const kotatsuCache = new Map();
const KOT_W = 600;
const KOT_H = 460;
/**
 * The kotatsu: patchwork quilt draped over a low table, mikan and tea on top. Sprite centered on its floor point.
 * @param {number} b light bucket
 */
function kotatsuSprite(b) {
  return lru(kotatsuCache, 'k' + b, () => {
    const l = b / (NB - 1);
    const k = tones(l);
    const { c, ctx } = mkCanvas(KOT_W, KOT_H);
    const pen = new Pen(ctx);
    pen.begin(0, { boil: false, width: 3 });
    const cx = KOT_W / 2;
    const cy = KOT_H / 2 + 20;
    shadow(ctx, cx + 20, cy + 40, 290, 170, 0.32);
    // the quilt: wavy draped square with folds pooling on the floor
    const quilt = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      const sq = 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      const r = Math.min(sq, 1.22) * (1 + 0.035 * Math.sin(i * 2.3));
      quilt.push({ x: cx + Math.cos(a) * 250 * r, y: cy + 18 + Math.sin(a) * 178 * r });
    }
    const qg = soft(ctx, cx, cy, 260, '#F08A6A', '#D2573E', '#9C3A2C');
    pen.blob(quilt, qg, { width: 3.5 });
    ctx.save();
    polyPath(ctx, quilt);
    ctx.clip();
    // patchwork squares + polka dots
    const patches = ['#E7A04E', '#F2C14E', '#C8473A', '#8E5A9A', '#5F86A8', '#F4A6B7'];
    const rr = mulberry32(77);
    for (let gx = -6; gx <= 6; gx++) {
      for (let gy = -5; gy <= 5; gy++) {
        if (rr() < 0.72) continue;
        const px = cx + gx * 46;
        const py = cy + gy * 40;
        if (!inPoly(quilt, px, py) || !inPoly(quilt, px + 40, py + 34)) continue;
        ctx.fillStyle = rgba(patches[Math.floor(rr() * patches.length)], 0.55);
        ctx.fillRect(px + 2, py + 2, 42, 36);
      }
    }
    ctx.fillStyle = 'rgba(255,248,236,0.5)';
    for (let gx = -6; gx <= 6; gx++) {
      for (let gy = -5; gy <= 5; gy++) {
        const px = cx + gx * 46 + 23;
        const py = cy + gy * 40 + 20;
        if (!inPoly(quilt, px, py)) continue;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, TAU);
        ctx.fill();
      }
    }
    // sashiko-ish quilting stitches
    ctx.strokeStyle = 'rgba(255,248,236,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    for (let gx = -6; gx <= 6; gx++) {
      ctx.moveTo(cx + gx * 46, cy - 240);
      ctx.lineTo(cx + gx * 46, cy + 240);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // folds at the corners
    ctx.strokeStyle = 'rgba(90,30,24,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.moveTo(cx + sx * 160, cy + sy * 110);
      ctx.quadraticCurveTo(cx + sx * 210, cy + sy * 150, cx + sx * 250, cy + sy * 200);
      ctx.moveTo(cx + sx * 190, cy + sy * 100);
      ctx.quadraticCurveTo(cx + sx * 240, cy + sy * 140, cx + sx * 270, cy + sy * 160);
    }
    ctx.stroke();
    ctx.restore();
    // table top with a visible front edge
    const tx = cx;
    const ty = cy - 30;
    const slab = (/** @type {number} */ y0, /** @type {number} */ h, /** @type {string|CanvasGradient} */ fill) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(tx - 172, y0, 344, h, 14);
      else ctx.rect(tx - 172, y0, 344, h);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    slab(ty - 98, 196, k.woodDark);
    slab(ty - 112, 196, soft(ctx, tx, ty - 20, 200, k.woodLight, k.wood, k.woodDark));
    ctx.strokeStyle = rgba(k.woodDark, 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let j = 0; j < 7; j++) {
      const yy = ty - 96 + j * 26;
      ctx.moveTo(tx - 160, yy);
      ctx.bezierCurveTo(tx - 60, yy + 6, tx + 60, yy - 6, tx + 160, yy + 2);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(k.beam, 0.25);
    ctx.fillRect(tx - 160, ty - 104, 120, 40);
    // mikan basket
    pen.blob(ellipsePts(tx - 80, ty - 6, 54, 30, 20), soft(ctx, tx - 80, ty - 6, 54, '#E6CB92', '#C9A468', '#8E6E42'), { width: 2.5 });
    for (const [ox, oy] of [[-104, -14], [-74, -22], [-56, -4], [-90, 4], [-70, 8]]) {
      pen.blob(ellipsePts(tx + ox, ty + oy, 17, 15, 14), soft(ctx, tx + ox, ty + oy, 17, '#FFD08A', '#F29E4C', '#C4692A'), { width: 2 });
      ctx.fillStyle = '#5E8A47';
      ctx.beginPath();
      ctx.ellipse(tx + ox + 3, ty + oy - 12, 5, 2.5, 0.4, 0, TAU);
      ctx.fill();
    }
    const steam = paintTeapot(ctx, pen, tx + 60, ty + 20, 1);
    paintCup(ctx, pen, tx + 130, ty - 10, 1);
    paintCup(ctx, pen, tx + 10, ty + 48, 1);
    // a peel left behind
    pen.blob([{ x: tx - 10, y: ty - 70 }, { x: tx + 14, y: ty - 78 }, { x: tx + 24, y: ty - 62 }, { x: tx + 4, y: ty - 56 }], '#F29E4C', { width: 1.5 });
    return { img: c, steam: { x: steam.x - cx, y: steam.y - cy } };
  }, 2);
}

/** Volumetric light shafts from the paper windows down onto the floor. @param {CanvasRenderingContext2D} ctx @param {ReturnType<typeof tones>} k @param {number} l */
function paintShafts(ctx, k, l) {
  const v = beamVec(l);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [x0, x1] of WINDOWS) {
    polyPath(ctx, [{ x: x0, y: 60 }, { x: x1, y: 60 }, { x: x1 + v.x, y: WALL + v.y }, { x: x0 + v.x, y: WALL + v.y }]);
    const g = ctx.createLinearGradient(x0, 60, x0 + v.x, WALL + v.y);
    g.addColorStop(0, rgba(k.beam, 0.1 + 0.04 * l));
    g.addColorStop(1, rgba(k.beam, 0));
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- live layers

const livePen = new Pen(/** @type {any} */ (null));

/** @param {CanvasRenderingContext2D} ctx @param {Geo} g @param {number} t @param {number} light @param {boolean} rm */
function drawLiveBack(ctx, g, t, light, rm) {
  const m = rm ? 0.2 : 1;
  const sc = g.sc;
  const pen = livePen;
  pen.ctx = ctx;
  pen.begin(0, { boil: false, width: 3 });
  // dust motes drifting in the sunbeams
  const v = beamVec(light);
  ctx.save();
  ctx.fillStyle = 'rgba(255,250,228,0.9)';
  for (const mo of g.motes) {
    const [x0, x1] = WINDOWS[mo.w];
    const vv = (((mo.v + t * 0.012 * m) % 1) + 1) % 1;
    const u = mo.u + 0.03 * Math.sin(t * 0.4 * m + mo.p);
    const tx = x0 + (x1 - x0) * u;
    const x = tx + v.x * vv + Math.sin(t * 0.7 * m + mo.p) * 8;
    const y = 60 + (WALL + v.y - 60) * vv + Math.cos(t * 0.5 * m + mo.p) * 6;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + mo.p * 2));
    ctx.globalAlpha = tw * (1 - vv * 0.7) * (1 - light * 0.3);
    ctx.beginPath();
    ctx.arc(x, y, mo.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // the clock keeps grandma's time (morning ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ evening across the waves)
  const cx = clockX(sc);
  const hours = 7 + light * 11 + (rm ? 0 : (t % 60) / 3600);
  const ha = ((hours % 12) / 12) * TAU - Math.PI / 2;
  const ma = ((hours % 1) * TAU) - Math.PI / 2;
  const sa = (Math.floor(t) % 60) / 60 * TAU - Math.PI / 2;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, 70);
  ctx.lineTo(cx + Math.cos(ha) * 15, 70 + Math.sin(ha) * 15);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, 70);
  ctx.lineTo(cx + Math.cos(ma) * 24, 70 + Math.sin(ma) * 24);
  ctx.stroke();
  ctx.strokeStyle = '#C8473A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, 70);
  ctx.lineTo(cx + Math.cos(sa) * 26, 70 + Math.sin(sa) * 26);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, 70, 3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cx - 18, 116, 36, 64);
  ctx.clip();
  const pa = Math.sin(t * Math.PI) * 0.28 * m;
  const bx = cx + Math.sin(pa) * 46;
  const by = 118 + Math.cos(pa) * 46;
  ctx.strokeStyle = '#C9A468';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, 116);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.fillStyle = soft(ctx, bx, by, 9, '#FFE7A0', '#F2C14E', '#B88A2A');
  ctx.beginPath();
  ctx.arc(bx, by, 9, 0, TAU);
  ctx.fill();
  ctx.restore();
  // wind chime by the window, its paper strip catching the breeze
  const fx = sc.door != null ? sc.door + 64 : 300;
  const sw = Math.sin(t * 1.6 * m) * 0.18 * m + Math.sin(t * 3.7 * m) * 0.05 * m;
  ctx.save();
  ctx.translate(fx, 40);
  ctx.rotate(sw * 0.4);
  ctx.strokeStyle = 'rgba(59,58,74,0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 14);
  ctx.stroke();
  pen.blob([{ x: -12, y: 30 }, { x: -9, y: 16 }, { x: 0, y: 12 }, { x: 9, y: 16 }, { x: 12, y: 30 }], 'rgba(210,236,244,0.85)', { width: 2 });
  ctx.fillStyle = 'rgba(210,72,60,0.8)';
  ctx.fillRect(-9, 20, 18, 3);
  ctx.rotate(sw);
  ctx.beginPath();
  ctx.moveTo(0, 28);
  ctx.lineTo(0, 44);
  ctx.stroke();
  pen.blob([{ x: -5, y: 44 }, { x: 5, y: 44 }, { x: 5, y: 72 }, { x: -5, y: 72 }], '#FFFDF6', { width: 1.5 });
  ctx.fillStyle = '#9FC9E8';
  ctx.fillRect(-3, 52, 6, 3);
  ctx.restore();
  // socks drying on the line (2-3)
  if (sc.line) {
    for (const s of g.socks) {
      const u = (s.x - 530) / 390;
      const ly = 108 + 4 * 32 * u * (1 - u);
      const a = Math.sin(t * 1.4 * m + s.p) * 0.12 * m;
      ctx.save();
      ctx.translate(s.x, ly);
      ctx.rotate(a);
      pen.tube([{ x: 0, y: 2 }, { x: 0, y: s.len }, { x: 14, y: s.len + 8 }], 15, s.c);
      ctx.fillStyle = 'rgba(59,58,74,0.18)';
      ctx.fillRect(-7, 6, 14, 4);
      ctx.fillStyle = '#C9A468';
      ctx.fillRect(-3, -6, 6, 12);
      ctx.restore();
    }
  }
  // goldfish
  if (sc.bowl) {
    const b = sc.bowl;
    const cy = b.y - 82;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(b.x, cy, 56, 50, 0, 0, TAU);
    ctx.clip();
    for (let i = 0; i < 2; i++) {
      const ph = t * (0.5 + i * 0.17) * m + i * 2.4;
      const x = b.x + Math.cos(ph) * 30;
      const y = cy + 6 + Math.sin(ph * 2) * 10 + i * 12;
      const dir = -Math.sin(ph) >= 0 ? 1 : -1;
      const wig = Math.sin(t * 9 * m + i) * 0.4;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.fillStyle = i ? '#FFFDF6' : '#F29E4C';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-22, -8 + wig * 6);
      ctx.lineTo(-20, 8 + wig * 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = i ? '#F6E2D4' : '#E5672F';
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 7.5, 0, 0, TAU);
      ctx.fill();
      if (i) {
        ctx.fillStyle = '#E5672F';
        ctx.beginPath();
        ctx.ellipse(3, -2, 5, 3.5, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(7, -2, 1.6, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    for (let j = 0; j < 3; j++) {
      const u = ((t * 0.3 * m + j / 3) % 1 + 1) % 1;
      ctx.beginPath();
      ctx.arc(b.x + 18 + Math.sin(u * 9 + j) * 3, cy + 40 - u * 80, 2 + j * 0.6, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(b.x, cy, 46, -2.7, -2.0);
    ctx.stroke();
  }
  // lazy houseplant: drooping vines with heart leaves
  if (sc.plant) drawPlant(ctx, pen, sc.plant.x, sc.plant.y, sc.plant.s, t, m);
  // steam from the tea tray
  if (sc.tray) drawSteam(ctx, sc.tray.x - 22, sc.tray.y - 50, t, m);
}

/** @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s @param {number} t @param {number} m */
function drawPlant(ctx, pen, x, y, s, t, m) {
  const top = y - 72 * s;
  const vines = [
    { dx: -1, len: 120, bend: 0.9 },
    { dx: 1, len: 100, bend: 1.0 },
    { dx: -0.4, len: 60, bend: -0.6 },
    { dx: 0.5, len: 70, bend: -0.5 },
    { dx: 0.1, len: 84, bend: -0.9 },
  ];
  vines.forEach((vn, i) => {
    const sway = Math.sin(t * 0.9 * m + i * 1.7) * 0.08 * m;
    const pts = [];
    for (let j = 0; j <= 4; j++) {
      const u = j / 4;
      const ang = -Math.PI / 2 + vn.dx * 0.9 + vn.bend * u * 1.6 * Math.sign(vn.dx || 1) + sway * u;
      const prev = pts[j - 1] ?? { x: x + vn.dx * 20 * s, y: top };
      pts.push(j ? { x: prev.x + Math.cos(ang) * (vn.len / 4) * s, y: prev.y + Math.sin(ang) * (vn.len / 4) * s } : prev);
    }
    pen.line(pts, { color: '#4F7A44', width: 3 * s });
    for (let j = 1; j < pts.length; j++) {
      const p = pts[j];
      const a = Math.atan2(p.y - pts[j - 1].y, p.x - pts[j - 1].x) + (j % 2 ? 0.9 : -0.9);
      const r = (13 - j) * s;
      const lx = p.x + Math.cos(a) * r * 0.8;
      const ly = p.y + Math.sin(a) * r * 0.8;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a + Math.PI / 2);
      pen.blob([{ x: 0, y: r }, { x: -r, y: -r * 0.2 }, { x: -r * 0.5, y: -r }, { x: 0, y: -r * 0.6 }, { x: r * 0.5, y: -r }, { x: r, y: -r * 0.2 }], soft(ctx, 0, 0, r, '#B7DB8C', '#6DA857', '#3F6E40'), { width: 1.6 });
      ctx.restore();
    }
  });
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} t @param {number} m */
function drawSteam(ctx, x, y, t, m) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const u = ((t * 0.35 * m + i / 3) % 1 + 1) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * Math.sin(u * Math.PI)})`;
    ctx.lineWidth = 5 - u * 2;
    const yy = y - u * 70;
    const wob = Math.sin(t * 2 * m + i * 2) * 8;
    ctx.beginPath();
    ctx.moveTo(x + wob * 0.3 + (i - 1) * 8, yy + 16);
    ctx.bezierCurveTo(x + wob + 10, yy + 6, x - wob - 10, yy - 6, x + wob * 0.5 + (i - 1) * 6, yy - 18);
    ctx.stroke();
  }
  ctx.restore();
}

/** Sashiko running stitches along the indigo runner rugs (+ the kotatsu over the route in 2-2). @param {CanvasRenderingContext2D} ctx @param {Geo} g @param {number} t @param {number} light */
function drawLiveMid(ctx, g, t, light) {
  if (g.sc.kotatsu) drawKotatsu(ctx, g.sc.kotatsu, t, light, false);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([12, 12]);
  ctx.strokeStyle = `rgba(246,238,220,${0.6 - light * 0.15})`;
  ctx.lineWidth = 2.5;
  for (const d of g.dense) {
    for (const off of [-32, 32]) {
      ctx.beginPath();
      for (let i = 0; i < d.length; i++) {
        const a = d[Math.max(0, i - 1)];
        const b = d[Math.min(d.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const x = d[i].x + (-(b.y - a.y) / len) * off;
        const y = d[i].y + ((b.x - a.x) / len) * off;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
  void t;
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {{x:number, y:number}} at @param {number} t @param {number} light @param {boolean} rm
 */
function drawKotatsu(ctx, at, t, light, rm) {
  const m = rm ? 0.2 : 1;
  const kt = kotatsuSprite(Math.round(light * (NB - 1)));
  // the quilt breathes a little, as if something is hiding under it
  const puff = 1 + Math.sin(t * 1.3 * m) * 0.006 * m;
  ctx.drawImage(kt.img, at.x - (KOT_W / 2) * puff, at.y - (KOT_H / 2 + 20) * puff, KOT_W * puff, KOT_H * puff);
  drawSteam(ctx, at.x + kt.steam.x, at.y + kt.steam.y, t, m);
}

/**
 * Front layer. In 2-2 the kotatsu is drawn again over the walkers so they really vanish under the quilt;
 * in 2-1 the sliding door frames line the room edge.
 * @param {CanvasRenderingContext2D} ctx @param {Geo} g @param {number} t @param {number} light @param {boolean} rm
 */
function drawLiveFront(ctx, g, t, light, rm) {
  const sc = g.sc;
  if (sc.kotatsu) drawKotatsu(ctx, sc.kotatsu, t, light, rm);
  if (sc.sideDoors) {
    const k = tones(Math.round(light * 4) / 4);
    const gaps = sc.sideDoors;
    ctx.save();
    let y0 = WALL;
    const segs = [];
    for (const gy of gaps) {
      segs.push([y0, gy - 92]);
      y0 = gy + 92;
    }
    segs.push([y0, H]);
    for (const [a, b] of segs) {
      if (b - a < 10) continue;
      const pg = ctx.createLinearGradient(0, 0, 40, 0);
      pg.addColorStop(0, k.woodDark);
      pg.addColorStop(1, k.wood);
      ctx.fillStyle = pg;
      ctx.fillRect(0, a, 30, b - a);
      ctx.fillStyle = k.paper;
      ctx.fillRect(30, a + 6, 12, b - a - 12);
      ctx.fillStyle = k.woodLight;
      ctx.fillRect(42, a, 6, b - a);
    }
    for (const gy of gaps) {
      ctx.fillStyle = 'rgba(40,30,30,0.25)';
      ctx.fillRect(0, gy - 92, 50, 6);
      ctx.fillRect(0, gy + 86, 50, 6);
    }
    ctx.restore();
  }
}

/** @param {RoomOpts} o */
const layoutOf = (o) => o.layout ?? LAYOUTS[0];

/** @type {RoomSpec} */
export const room = {
  id: 'house',
  name: "Grandma's Cozy House",
  // a faded indigo runner rug with white sashiko dots
  pathStyle: { fill: '#7A8FB6', edge: '#4F6390', speck: 'rgba(246,238,220,0.55)', width: 92 },
  cushion: { base: '#F4B7C2', dark: '#DE8FA1' },
  drawBack(ctx, pen, t, o) {
    const L = layoutOf(o);
    const light = clamp(o.light ?? 0.2, 0, 1);
    const f = light * (NB - 1);
    const b0 = Math.floor(f);
    const b1 = Math.min(NB - 1, b0 + 1);
    const fr = f - b0;
    ctx.drawImage(backLayer(L, b0), 0, 0, W, H);
    const next = b1 !== b0 ? backLayerSoon(L, b1) : null;
    if (next && fr > 0.02) {
      ctx.save();
      ctx.globalAlpha *= fr;
      ctx.drawImage(next, 0, 0, W, H);
      ctx.restore();
    }
    drawLiveBack(ctx, geo(L), t, light, !!o.reducedMotion);
  },
  drawMid(ctx, pen, t, o) {
    drawLiveMid(ctx, geo(layoutOf(o)), t, clamp(o.light ?? 0.2, 0, 1));
  },
  drawFront(ctx, pen, t, o) {
    drawLiveFront(ctx, geo(layoutOf(o)), t, clamp(o.light ?? 0.2, 0, 1), !!o.reducedMotion);
  },
  layouts: LAYOUTS,
};