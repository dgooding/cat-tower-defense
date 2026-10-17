// @ts-check
// World 1 ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· Sunbeam Countryside. Rice paddies that mirror the sky, one enormous old tree,
// towering cumulus clouds, a little stone shrine with a vermilion gate, dragonflies by day
// and fireflies at golden hour. Static scenery is painted once per (layout, light bucket)
// into an offscreen canvas; only the living bits (clouds, water, bugs, grass) draw per frame.
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
const P = WORLDS.countryside;
const SKY_H = 330;
const NB = 5; // light buckets (0, .25, .5, .75, 1), cross-faded
const INK_SOFT = 'rgba(59,58,74,0.55)';
const TAU = Math.PI * 2;

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
/** Piecewise color ramp over light 0..1. @param {string[]} keys @param {number} l */
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

// ---------------------------------------------------------------- lighting (morning ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ golden hour)

/** @param {number} l */
function tones(l) {
  return {
    skyTop: ramp(['#86C4E8', '#9CCDEA', '#8F98CC'], l),
    skyMid: ramp([P.sky, '#CDE8EF', '#F1B495'], l),
    skyLow: ramp(['#EEF7EE', '#FFF5DE', '#FFD497'], l),
    sun: ramp(['#FFFCEE', '#FFF4D0', '#FFD27A'], l),
    hillFar: ramp(['#A9C8DC', '#B1C8D4', '#B49CC0'], l),
    hillNear: ramp(['#8CB6A8', '#94B79E', '#A18BA2'], l),
    haze: ramp(['#E8F3F2', '#FFF4E0', '#FFD3A2'], l),
    woods: ramp(['#5E8F62', '#62905E', '#6A6B62'], l),
    grassLight: ramp(['#B8D98C', '#BEDA88', '#D9D088'], l),
    grass: ramp([P.grass, '#94C068', '#8FAF5C'], l),
    grassDark: ramp([P.grassDark, '#619749', '#557A4C'], l),
    water1: ramp(['#D6ECEF', '#E4EDDC', '#FFD3A0'], l),
    water2: ramp(['#94C8DE', '#A5CFDA', '#C99AA6'], l),
    cloudLit: ramp(['#FFFEF8', P.cloud, '#FFE3BC'], l),
    cloudShade: ramp(['#CCD8E8', '#D7DAE4', '#D39CA6'], l),
    leafLit: ramp(['#BCDB80', '#C4DA7C', '#F2C46C'], l),
    leaf: ramp(['#6FA75B', '#73A657', '#6E9652'], l),
    leafDark: ramp(['#3E6C4C', '#41694A', '#3F5249'], l),
    tint: ramp(['#FFFFFF', '#FFF6E8', '#FFCB9A'], l),
  };
}
/** Sun position and shadow vector for a light level. @param {number} l */
function sunOf(l) {
  return { x: lerp(560, 250, l), y: lerp(40, 222, l), sx: 26 + 170 * l, sy: 16 + 22 * l };
}

// ---------------------------------------------------------------- geometry per layout (light-independent)

/** Horizon lines. @param {number} x */
const ridgeFar = (x) => 196 + 26 * Math.sin(x * 0.0042 + 1.3) + 15 * Math.sin(x * 0.011 + 0.4) + 6 * Math.sin(x * 0.029);
/** @param {number} x */
const ridgeNear = (x) => 246 + 18 * Math.sin(x * 0.0057 + 2.1) + 9 * Math.sin(x * 0.017 + 1);
/** @param {number} x */
const fieldTop = (x) => 284 + 7 * Math.sin(x * 0.009 + 0.5);

/**
 * @typedef {{pts:Pt[], cx:number, cy:number}} Cell
 * @typedef {{
 *   L: Layout, sc: Scene, tracks: Track[], dense: Pt[][],
 *   dPath: (x:number, y:number) => number, dSpot: (x:number, y:number) => number,
 *   cells: Cell[], water: Path2D|null, mirror: Path2D|null, glints: {x:number, y:number, p:number}[],
 *   bridge: null | {d0:number, d1:number},
 *   river: null | {poly:Pt[], center:Pt[], cum:number[], len:number, path: Path2D|null},
 *   sway: {x:number, y:number, h:number, n:number, p:number}[],
 *   front: {x:number, h:number, lean:number, p:number, kind:number}[],
 *   flies: {x:number, y:number, p:number}[],
 * }} Geo
 */
/** @type {Map<string, Geo>} */
const geoCache = new Map();

/** @param {Layout} L @returns {Geo} */
function geo(L) {
  const hit = geoCache.get(L.id);
  if (hit && hit.L === L) return hit;
  const sc = SCENES[L.id] ?? SCENES['1-1'];
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

  // river (1-3)
  /** @type {Geo['river']} */
  let river = null;
  if (sc.river) {
    const center = catmullRom(sc.river.pts, 14);
    const left = [];
    const right = [];
    const cum = [0];
    for (let i = 0; i < center.length; i++) {
      const a = center[Math.max(0, i - 1)];
      const b = center[Math.min(center.length - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const hw = (sc.river.w / 2) * (0.75 + 0.25 * Math.min(1, i / 10)) + Math.sin(i * 0.9) * 6;
      left.push({ x: center[i].x + nx * hw, y: center[i].y + ny * hw });
      right.push({ x: center[i].x - nx * hw, y: center[i].y - ny * hw });
      if (i) cum.push(cum[i - 1] + Math.hypot(center[i].x - center[i - 1].x, center[i].y - center[i - 1].y));
    }
    const poly = left.concat(right.reverse());
    river = { poly, center, cum, len: cum[cum.length - 1], path: null };
  }
  const gd = sc.garden;
  /** @param {number} x @param {number} y */
  const blocked = (x, y) =>
    (river && inPoly(river.poly, x, y)) ||
    (gd && ((x - gd.cx) / (gd.rx + 40)) ** 2 + ((y - gd.cy) / (gd.ry + 40)) ** 2 < 1) ||
    (sc.forest && x > sc.forest.x0 - 40 && x < sc.forest.x1 + 40 && y < sc.forest.y + 50) ||
    (sc.shrine && Math.abs(x - sc.shrine.x + 40 * sc.shrine.s) < 210 * sc.shrine.s && y < sc.shrine.y + 50 && y > sc.shrine.y - 160 * sc.shrine.s) ||
    (sc.tree && Math.abs(x - sc.tree.x) < 150 * sc.tree.s && y < sc.tree.y + 60 && y > sc.tree.y - 140);

  // paddies
  /** @type {Cell[]} */
  const cells = [];
  for (const gr of sc.paddies) {
    /** @type {Pt[][]} */
    const grid = [];
    for (let r = 0; r <= gr.rows; r++) {
      const row = [];
      for (let c = 0; c <= gr.cols; c++) {
        row.push({ x: gr.x0 + c * gr.cw + r * gr.skew + (rnd() - 0.5) * 18, y: gr.y0 + r * gr.ch + (rnd() - 0.5) * 10 + c * 4 });
      }
      grid.push(row);
    }
    for (let r = 0; r < gr.rows; r++) {
      for (let c = 0; c < gr.cols; c++) {
        const g = 9;
        const q = [grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]];
        const pts = [
          { x: q[0].x + g, y: q[0].y + g }, { x: q[1].x - g, y: q[1].y + g },
          { x: q[2].x - g, y: q[2].y - g }, { x: q[3].x + g, y: q[3].y - g },
        ];
        const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4;
        const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
        let ok = cy > fieldTop(cx) + 30;
        for (let i = 0; ok && i < 4; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % 4];
          for (const u of [0, 0.5]) {
            const x = a.x + (b.x - a.x) * u;
            const y = a.y + (b.y - a.y) * u;
            if (dPath(x, y) < 74 || dSpot(x, y) < 84 || blocked(x, y)) ok = false;
          }
        }
        if (ok && (dPath(cx, cy) < 74 || dSpot(cx, cy) < 84)) ok = false;
        if (ok) cells.push({ pts, cx, cy });
      }
    }
  }
  const glints = [];
  for (const cell of cells) {
    for (let k = 0; k < 2; k++) {
      const u = 0.15 + rnd() * 0.7;
      const v = 0.15 + rnd() * 0.7;
      const [a, b, c, d] = cell.pts;
      const top = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      const bot = { x: d.x + (c.x - d.x) * u, y: d.y + (c.y - d.y) * u };
      glints.push({ x: top.x + (bot.x - top.x) * v, y: top.y + (bot.y - top.y) * v, p: rnd() * TAU });
    }
  }
  /** @param {number} x @param {number} y */
  const wet = (x, y) => cells.some((c) => inPoly(c.pts, x, y));

  // living grass tufts that sway (kept away from paths and spots)
  const sway = [];
  for (let i = 0; i < 900 && sway.length < 70; i++) {
    const x = rnd() * W;
    const y = 300 + rnd() * (H - 300);
    const edge = Math.min(x, W - x, H - y) < 260 || rnd() < 0.35;
    if (!edge || dPath(x, y) < 96 || dSpot(x, y) < 76 || blocked(x, y) || wet(x, y)) continue;
    sway.push({ x, y, h: 16 + rnd() * 18, n: 3 + Math.floor(rnd() * 3), p: rnd() * TAU });
  }
  // foreground grass along the bottom edge (skip where a path runs near the edge)
  const front = [];
  for (let x = -10; x < W + 10; x += 9 + rnd() * 8) {
    if (dPath(x, H - 20) < 150) continue;
    const corner = Math.max(0, 1 - Math.min(x, W - x) / 420);
    front.push({ x, h: 26 + rnd() * 40 + corner * (60 + rnd() * 60), lean: (rnd() - 0.5) * 0.5 + (x < W / 2 ? 0.15 : -0.15), p: rnd() * TAU, kind: corner > 0.4 && rnd() < 0.12 ? 1 : 0 });
  }
  const flies = [];
  for (let i = 0; i < 400 && flies.length < 30; i++) {
    const x = rnd() * W;
    const y = 300 + rnd() * (H - 320);
    if (dPath(x, y) < 70) continue;
    flies.push({ x, y, p: rnd() * TAU });
  }

  /** @type {Geo} */
  /** bridge span along its path, where the route crosses the river */
  let bridge = null;
  if (sc.bridge && river) {
    const tr = tracks[sc.bridge.path];
    let d0 = -1;
    let d1 = -1;
    for (let d = 0; d < tr.length; d += 8) {
      const p = tr.at(d);
      if (inPoly(river.poly, p.x, p.y)) {
        if (d0 < 0) d0 = d;
        d1 = d;
      }
    }
    if (d0 >= 0) bridge = { d0: d0 - 34, d1: d1 + 34 };
  }
  /** @type {Geo} */
  const g = { L, sc, tracks, dense, dPath, dSpot, cells, water: null, mirror: null, glints, river, bridge, sway, front, flies };
  if (typeof Path2D !== 'undefined') {
    const water = new Path2D();
    for (const c of cells) {
      water.moveTo(c.pts[0].x, c.pts[0].y);
      for (let i = 1; i < 4; i++) water.lineTo(c.pts[i].x, c.pts[i].y);
      water.closePath();
    }
    g.water = water;
    const mirror = new Path2D(water);
    if (river) {
      const rp = new Path2D();
      rp.moveTo(river.poly[0].x, river.poly[0].y);
      for (const p of river.poly) rp.lineTo(p.x, p.y);
      rp.closePath();
      river.path = rp;
      mirror.addPath(rp);
    }
    g.mirror = mirror;
  }
  geoCache.set(L.id, g);
  return g;
}

// ---------------------------------------------------------------- caches

/** @type {Map<string, CanvasImageSource>} */
const skyCache = new Map();
/** @type {Map<string, {img:CanvasImageSource, w:number, h:number}[]>} */
const cloudCache = new Map();
/** @type {Map<string, CanvasImageSource>} */
const landCache = new Map();

/**
 * Draw bucket b0, then cross-fade bucket b1 on top.
 * @param {CanvasRenderingContext2D} ctx @param {CanvasImageSource} a @param {CanvasImageSource|null} b @param {number} fr @param {number} h
 */
function blit(ctx, a, b, fr, h) {
  ctx.drawImage(a, 0, 0, W, h);
  if (b && fr > 0.02 && a !== b) {
    ctx.save();
    ctx.globalAlpha *= fr;
    ctx.drawImage(b, 0, 0, W, h);
    ctx.restore();
  }
}

/** @param {number} b */
function skyLayer(b) {
  return lru(skyCache, 'sky' + b, () => paintSky(b / (NB - 1)), NB);
}
/** @param {Layout} L @param {number} b */
function landLayer(L, b) {
  return lru(landCache, L.id + '|' + b, () => paintLand(geo(L), b / (NB - 1)), 6);
}
/** @type {Set<string>} */
const pending = new Set();
/**
 * The next light bucket is painted when the browser is idle, so wave-to-wave lighting drift never hitches.
 * Returns the layer if it is ready, otherwise null (the caller just skips the cross-fade until then).
 * @param {Layout} L @param {number} b
 */
function landLayerSoon(L, b) {
  const key = L.id + '|' + b;
  const ready = landCache.get(key);
  if (ready) return ready;
  if (!pending.has(key)) {
    pending.add(key);
    const run = () => {
      pending.delete(key);
      landLayer(L, b);
    };
    const g = /** @type {any} */ (globalThis);
    if (g.requestIdleCallback) g.requestIdleCallback(run, { timeout: 1500 });
    else setTimeout(run, 30);
  }
  return null;
}

// ---------------------------------------------------------------- sky + clouds

/** @param {number} l */
function paintSky(l) {
  const { c, ctx } = mkCanvas(W, SKY_H);
  const k = tones(l);
  const sun = sunOf(l);
  const g = ctx.createLinearGradient(0, 0, 0, SKY_H);
  g.addColorStop(0, k.skyTop);
  g.addColorStop(0.55, k.skyMid);
  g.addColorStop(1, k.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, SKY_H);
  // wide warm bloom around the sun
  const bloom = ctx.createRadialGradient(sun.x, sun.y, 10, sun.x, sun.y, 520 + 300 * l);
  bloom.addColorStop(0, rgba(k.sun, 0.75));
  bloom.addColorStop(0.3, rgba(k.sun, 0.28 + 0.2 * l));
  bloom.addColorStop(1, rgba(k.sun, 0));
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, SKY_H);
  const disc = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, 34 + 10 * l);
  disc.addColorStop(0, '#FFFFFF');
  disc.addColorStop(0.75, rgba(k.sun, 0.95));
  disc.addColorStop(1, rgba(k.sun, 0));
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 34 + 10 * l, 0, TAU);
  ctx.fill();
  // faint high wisps
  const r = mulberry32(99);
  ctx.strokeStyle = rgba('#FFFFFF', 0.22);
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x = r() * W;
    const y = 40 + r() * 110;
    ctx.lineWidth = 3 + r() * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 90, y - 10 - r() * 12, x + 200 + r() * 160, y + 4);
    ctx.stroke();
  }
  return c;
}

const CLOUDS = [
  { seed: 11, w: 860, h: 470, y: -168, x0: 260, v: 5 },
  { seed: 23, w: 640, h: 360, y: -82, x0: 1260, v: 7 },
  { seed: 37, w: 420, h: 220, y: 22, x0: 1950, v: 10 },
  { seed: 51, w: 300, h: 150, y: 6, x0: 760, v: 13 },
];

/** One cumulus sprite: piled puffs, lit from the sun side, flat shaded base. @param {number} seed @param {number} w @param {number} h @param {number} l */
function makeCloud(seed, w, h, l) {
  const { c, ctx } = mkCanvas(w, h);
  const r = mulberry32(seed);
  const k = tones(l);
  const base = h * 0.86;
  const puffs = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const rad = w * (0.075 + 0.04 * r()) * (1.15 - Math.abs(u - 0.5) * 0.9);
    puffs.push({ x: w * (0.07 + 0.86 * u), y: base - rad * 0.55, r: rad });
  }
  for (let i = 0; i < 11; i++) {
    const u = 0.22 + 0.56 * r();
    const tall = 1 - Math.abs(u - 0.5) * 1.7;
    const rad = w * (0.07 + 0.06 * r());
    const y = Math.max(rad + 4, base - rad - h * 0.66 * tall * (0.35 + 0.65 * r()));
    puffs.push({ x: w * u, y, r: rad });
  }
  ctx.fillStyle = k.cloudShade;
  for (const p of puffs) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
  }
  puffs.sort((a, b) => b.y - a.y);
  for (const p of puffs) {
    const gr = ctx.createRadialGradient(p.x - p.r * 0.4, p.y - p.r * 0.5, p.r * 0.1, p.x, p.y, p.r);
    gr.addColorStop(0, k.cloudLit);
    gr.addColorStop(0.55, rgba(k.cloudLit, 0.85));
    gr.addColorStop(1, rgba(k.cloudShade, 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.06, p.y - p.r * 0.08, p.r * 0.96, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-atop';
  const bottom = ctx.createLinearGradient(0, base - h * 0.35, 0, base);
  bottom.addColorStop(0, rgba(k.cloudShade, 0));
  bottom.addColorStop(1, rgba(k.cloudShade, 0.85));
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, w, h);
  const rim = ctx.createLinearGradient(0, 0, w, 0);
  rim.addColorStop(0, rgba(k.sun, 0.35 + 0.3 * l));
  rim.addColorStop(0.5, rgba(k.sun, 0));
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-out';
  const cut = ctx.createLinearGradient(0, base - 6, 0, base + 10);
  cut.addColorStop(0, 'rgba(0,0,0,0)');
  cut.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = cut;
  ctx.fillRect(0, base - 6, w, h);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

/** @param {number} b */
function cloudSprites(b) {
  return lru(cloudCache, 'c' + b, () => CLOUDS.map((cl) => ({ img: makeCloud(cl.seed, cl.w, cl.h, b / (NB - 1)), w: cl.w, h: cl.h })), 2);
}
/** @param {number} t @param {boolean} [rm] @param {number} i */
function cloudX(t, rm, i) {
  const cl = CLOUDS[i];
  const span = W + cl.w + 300;
  const x = cl.x0 + (rm ? 0 : t * cl.v);
  return (((x % span) + span) % span) - cl.w - 150;
}
/** @param {CanvasRenderingContext2D} ctx @param {number} t @param {number} b @param {boolean} [rm] */
function drawClouds(ctx, t, b, rm) {
  const sp = cloudSprites(b);
  sp.forEach((s, i) => ctx.drawImage(s.img, cloudX(t, rm, i), CLOUDS[i].y, s.w, s.h));
}

// ---------------------------------------------------------------- the land layer (static, cached)

/** @param {Geo} g @param {number} l */
function paintLand(g, l) {
  const { c, ctx } = mkCanvas(W, H);
  const k = tones(l);
  const sun = sunOf(l);
  const pen = new Pen(ctx);
  pen.begin(0, { boil: false, width: 3 });
  const rnd = mulberry32(seedOf(g.L.id) ^ 0x5eed);
  const sc = g.sc;
  const canBlur = 'filter' in ctx;

  paintHills(ctx, k, rnd);
  paintField(ctx, k, rnd, g);
  if (sc.farm) paintFarm(ctx, pen, sc.farm.x, sc.farm.y, k);
  if (sc.poles?.length) paintPoles(ctx, sc.poles, k);

  // trampled, sun-bleached grass along the routes keeps the path calm and readable
  const halo = (/** @type {number} */ w, /** @type {string} */ col, /** @type {number} */ blur) => {
    ctx.save();
    if (canBlur) ctx.filter = `blur(${blur}px)`;
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const d of g.dense) {
      ctx.beginPath();
      ctx.moveTo(d[0].x, d[0].y);
      for (const p of d) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    ctx.restore();
  };
  halo(230, rgba(k.grassLight, 0.55), 26);
  halo(140, rgba(mix(k.grassLight, '#E9DDA8', 0.5), 0.45), 12);
  // sunny little clearings where cats will nap
  for (const s of g.L.spots) {
    const gr = ctx.createRadialGradient(s.x, s.y + 6, 8, s.x, s.y + 6, 110);
    gr.addColorStop(0, rgba('#F4EBB8', 0.45));
    gr.addColorStop(1, rgba('#F4EBB8', 0));
    ctx.fillStyle = gr;
    ctx.fillRect(s.x - 120, s.y - 110, 240, 230);
  }

  if (g.river) paintRiver(ctx, g.river, k, rnd);
  paintPaddies(ctx, g, k, rnd);
  if (sc.garden) paintGarden(ctx, pen, sc.garden, g, k, rnd);
  if (sc.forest) paintForest(ctx, pen, sc.forest, k, rnd);
  if (sc.stairs) paintStairLanterns(ctx, pen, g, k, l);
  paintScatter(ctx, g, k, rnd);

  /** @type {{y:number, f:() => void}[]} */
  const props = [];
  if (sc.tree) {
    const tr = sc.tree;
    props.push({ y: tr.y, f: () => paintTree(ctx, pen, tr.x, tr.y, tr.s, k, sun, l) });
  }
  if (sc.shrine) {
    const sh = sc.shrine;
    props.push({ y: sh.y, f: () => paintShrine(ctx, pen, sh.x, sh.y, sh.s, sh.torii ?? -190, k, sun, l) });
  }
  if (sc.scarecrow) {
    const s = sc.scarecrow;
    props.push({ y: s.y, f: () => paintScarecrow(ctx, pen, s.x, s.y, s.s, k, sun) });
  }
  for (const b of sc.bushes) props.push({ y: b.y, f: () => paintBush(ctx, pen, b.x, b.y, b.s, k, rnd, sun) });
  props.sort((a, b) => a.y - b.y).forEach((p) => p.f());

  // golden-hour grade, applied only where land was painted (sky stays transparent)
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = rgba('#FF9F5A', 0.12 * l * l);
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(sun.x, sun.y, 20, sun.x, sun.y, 900 + 500 * l);
  glow.addColorStop(0, rgba(k.sun, 0.14 + 0.12 * l));
  glow.addColorStop(1, rgba(k.sun, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // soft painted vignette: richer at the edges, calm in the middle
  const vg = ctx.createRadialGradient(W / 2, H * 0.58, H * 0.42, W / 2, H * 0.58, H * 1.05);
  vg.addColorStop(0, 'rgba(40,52,40,0)');
  vg.addColorStop(1, `rgba(40,52,40,${0.2 + 0.08 * l})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, SKY_H - 80, W, H);
  ctx.restore();
  return c;
}

/** @param {CanvasRenderingContext2D} ctx @param {ReturnType<typeof tones>} k @param {() => number} rnd */
function paintHills(ctx, k, rnd) {
  const layer = (/** @type {(x:number)=>number} */ f, /** @type {string} */ col, /** @type {number} */ bump) => {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, f(x) - bump * Math.abs(Math.sin(x * 0.07)));
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 170, 0, 320);
    g.addColorStop(0, col);
    g.addColorStop(1, mix(col, k.haze, 0.55));
    ctx.fillStyle = g;
    ctx.fill();
  };
  layer(ridgeFar, k.hillFar, 3);
  // tiny far forest texture on the near ridge
  layer(ridgeNear, k.hillNear, 6);
  ctx.fillStyle = rgba(mix(k.hillNear, k.leafDark, 0.25), 0.55);
  for (let x = 0; x < W; x += 9) {
    if (rnd() < 0.45) continue;
    ctx.beginPath();
    ctx.ellipse(x, ridgeNear(x) + 6 + rnd() * 8, 6 + rnd() * 5, 5 + rnd() * 3, 0, 0, TAU);
    ctx.fill();
  }
  // haze band that sits on the horizon
  const hz = ctx.createLinearGradient(0, 230, 0, 300);
  hz.addColorStop(0, rgba(k.haze, 0));
  hz.addColorStop(1, rgba(k.haze, 0.6));
  ctx.fillStyle = hz;
  ctx.fillRect(0, 230, W, 70);
}

/** @param {CanvasRenderingContext2D} ctx @param {ReturnType<typeof tones>} k @param {() => number} rnd @param {Geo} g */
function paintField(ctx, k, rnd, g) {
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, fieldTop(x));
  ctx.lineTo(W, H);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0, 280, 0, H);
  fg.addColorStop(0, mix(k.grassLight, k.haze, 0.3));
  fg.addColorStop(0.3, k.grassLight);
  fg.addColorStop(0.65, k.grass);
  fg.addColorStop(1, mix(k.grass, k.grassDark, 0.55));
  ctx.fillStyle = fg;
  ctx.fill();
  // watercolor mottling: light pools in the middle, deeper greens toward the edges
  for (let i = 0; i < 260; i++) {
    const x = rnd() * W;
    const y = 300 + rnd() * (H - 300);
    const edge = 1 - Math.min(x, W - x, H - y) / 520;
    const r = 50 + rnd() * 130;
    const dark = rnd() < 0.35 + 0.5 * Math.max(0, edge);
    const col = dark ? k.grassDark : rnd() < 0.5 ? k.grassLight : '#E9E4A0';
    const a = (dark ? 0.1 + 0.12 * Math.max(0, edge) : 0.12) * (g.dPath(x, y) < 140 && dark ? 0.3 : 1);
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, a));
    gr.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // distant tree line + hedges along the horizon
  for (let x = -20; x < W + 20; x += 14 + rnd() * 16) {
    const y = fieldTop(x) + 2;
    if (g.sc.forest && x > g.sc.forest.x0 && x < g.sc.forest.x1) continue;
    const r = 10 + rnd() * 16;
    const gr = ctx.createLinearGradient(0, y - r, 0, y + r);
    gr.addColorStop(0, mix(k.woods, k.haze, 0.2));
    gr.addColorStop(1, mix(k.woods, k.leafDark, 0.5));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.3, r * 1.2, r, 0, 0, TAU);
    ctx.fill();
  }
}

/** Little farmhouse with a thatched roof on the horizon. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {ReturnType<typeof tones>} k */
function paintFarm(ctx, pen, x, y, k) {
  const ink = { ink: rgba('#3B3A4A', 0.35), width: 1.5 };
  pen.blob([{ x: x - 46, y: y - 22 }, { x: x + 46, y: y - 22 }, { x: x + 46, y }, { x: x - 46, y }], mix('#F3EAD6', k.haze, 0.3), ink);
  ctx.fillStyle = rgba('#7A5A44', 0.6);
  ctx.fillRect(x - 30, y - 16, 12, 10);
  ctx.fillRect(x + 12, y - 16, 16, 16);
  pen.blob([{ x: x - 60, y: y - 18 }, { x: x - 22, y: y - 52 }, { x: x + 22, y: y - 52 }, { x: x + 60, y: y - 18 }], mix('#B98F55', k.haze, 0.2), ink);
  pen.line([{ x: x - 22, y: y - 50 }, { x: x + 22, y: y - 50 }], { color: rgba('#6E5236', 0.6), width: 3 });
  ctx.fillStyle = rgba('#6E5236', 0.5);
  ctx.fillRect(x + 26, y - 62, 7, 14);
}

/** Leaning wooden utility poles with drooping wires. @param {CanvasRenderingContext2D} ctx @param {number[]} xs @param {ReturnType<typeof tones>} k */
function paintPoles(ctx, xs, k) {
  const tops = xs.map((x, i) => ({ x: x + 3, y: fieldTop(x) - 96 + i * 6, base: fieldTop(x) + 8 }));
  ctx.strokeStyle = rgba(mix('#4E4A52', k.haze, 0.3), 0.75);
  ctx.lineWidth = 1.4;
  for (let w = 0; w < 3; w++) {
    ctx.beginPath();
    for (let i = 0; i < tops.length - 1; i++) {
      const a = tops[i];
      const b = tops[i + 1];
      ctx.moveTo(a.x - 12 + w * 12, a.y + 6 + w * 2);
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 26, b.x - 12 + w * 12, b.y + 6 + w * 2);
    }
    if (tops.length) {
      const z = tops[tops.length - 1];
      ctx.moveTo(z.x - 12 + w * 12, z.y + 6 + w * 2);
      ctx.quadraticCurveTo(z.x + 80, z.y + 30, W + 20, z.y + 20 + w * 3);
    }
    ctx.stroke();
  }
  for (const p of tops) {
    ctx.strokeStyle = mix('#6B5546', k.haze, 0.25);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x - 3, p.base);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - 16, p.y + 8);
    ctx.lineTo(p.x + 16, p.y + 8);
    ctx.stroke();
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {NonNullable<Geo['river']>} rv @param {ReturnType<typeof tones>} k @param {() => number} rnd */
function paintRiver(ctx, rv, k, rnd) {
  // muddy grass bank, then water reflecting the sky
  ctx.save();
  polyPath(ctx, rv.poly);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = mix(k.grassDark, '#8C7A5A', 0.4);
  ctx.lineWidth = 26;
  ctx.stroke();
  ctx.strokeStyle = mix(k.grassLight, '#D8CDA0', 0.5);
  ctx.lineWidth = 12;
  ctx.stroke();
  const g = ctx.createLinearGradient(0, 260, 0, H);
  g.addColorStop(0, k.water1);
  g.addColorStop(0.5, k.water2);
  g.addColorStop(1, mix(k.water2, '#4F8FA6', 0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = rgba(k.water1, 0.35);
  ctx.lineWidth = 50;
  ctx.lineCap = 'round';
  ctx.beginPath();
  rv.center.forEach((p, i) => (i ? ctx.lineTo(p.x + 14, p.y) : ctx.moveTo(p.x + 14, p.y)));
  ctx.stroke();
  // lily pads hugging the slow edges
  for (let i = 0; i < 16; i++) {
    const j = Math.floor(rnd() * rv.center.length);
    const side = rnd() < 0.5 ? -1 : 1;
    const p = rv.center[j];
    const x = p.x + side * (36 + rnd() * 22);
    const y = p.y + (rnd() - 0.5) * 20;
    const r = 9 + rnd() * 9;
    const a0 = rnd() * TAU;
    ctx.fillStyle = mix('#6FA35A', k.water2, 0.15);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.ellipse(x, y, r, r * 0.62, 0, a0 + 0.35, a0 + TAU - 0.1);
    ctx.closePath();
    ctx.fill();
    if (rnd() < 0.25) {
      ctx.fillStyle = '#F7C6D4';
      ctx.beginPath();
      ctx.arc(x + r * 0.2, y - 2, 4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  // stones and reeds on the banks
  for (let i = 0; i < rv.poly.length; i += 2) {
    const p = rv.poly[i];
    if (p.y < 280 || p.y > H) continue;
    if (rnd() < 0.5) {
      ctx.fillStyle = mix('#B8B2A2', k.haze, 0.1);
      ctx.beginPath();
      ctx.ellipse(p.x + (rnd() - 0.5) * 10, p.y, 8 + rnd() * 9, 5 + rnd() * 4, 0, 0, TAU);
      ctx.fill();
    }
    if (rnd() < 0.45) {
      ctx.strokeStyle = mix(k.grassDark, '#3F5E3A', 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let b = 0; b < 4; b++) {
        ctx.moveTo(p.x + b * 4 - 6, p.y + 4);
        ctx.quadraticCurveTo(p.x + b * 4 - 6, p.y - 18, p.x + b * 6 - 10 + rnd() * 6, p.y - 30 - rnd() * 14);
      }
      ctx.stroke();
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {Geo} g @param {ReturnType<typeof tones>} k @param {() => number} rnd */
function paintPaddies(ctx, g, k, rnd) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (const cell of g.cells) {
    const pts = cell.pts;
    // raised grassy dike with a soft shadow on the water side
    polyPath(ctx, pts);
    ctx.strokeStyle = mix(k.grass, k.grassLight, 0.4);
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.strokeStyle = rgba(k.grassDark, 0.5);
    ctx.lineWidth = 3;
    ctx.stroke();
    const top = Math.min(...pts.map((p) => p.y));
    const bot = Math.max(...pts.map((p) => p.y));
    const wg = ctx.createLinearGradient(0, top, 0, bot);
    wg.addColorStop(0, k.water1);
    wg.addColorStop(1, k.water2);
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // dike shadow on the water
    ctx.strokeStyle = rgba('#3B5A4A', 0.16);
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(pts[3].x, pts[3].y);
    ctx.lineTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    // rows of young rice
    const [a, b, , d] = pts;
    const rows = Math.max(3, Math.round((d.y - a.y) / 17));
    const cols = Math.max(4, Math.round((b.x - a.x) / 19));
    ctx.strokeStyle = mix('#6DAA57', k.grass, 0.3);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
      const v = (r + 0.6) / rows;
      for (let cI = 0; cI < cols; cI++) {
        const u = (cI + 0.5 + (r % 2) * 0.3) / cols;
        const x = a.x + (b.x - a.x) * u + (d.x - a.x) * v;
        const y = a.y + (b.y - a.y) * u + (d.y - a.y) * v;
        const hh = 7 + rnd() * 4;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y - hh);
        ctx.moveTo(x, y);
        ctx.lineTo(x + 0.5, y - hh - 2);
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3.5, y - hh + 1);
      }
    }
    ctx.stroke();
    // sky sheen
    ctx.strokeStyle = rgba('#FFFFFF', 0.22);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(cell.cx - 60, cell.cy + 30);
    ctx.lineTo(cell.cx + 40, cell.cy - 40);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Grandpa's vegetable garden inside the fork: soil beds, cucumber trellises, a straw walkway for nappers.
 * @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {NonNullable<Scene['garden']>} gd @param {Geo} g
 * @param {ReturnType<typeof tones>} k @param {() => number} rnd
 */
function paintGarden(ctx, pen, gd, g, k, rnd) {
  const { cx, cy, rx, ry } = gd;
  const soil = '#9C7656';
  pen.blob(ellipsePts(cx, cy, rx, ry, 40, (a) => 1 + 0.03 * Math.sin(a * 5)), soft(ctx, cx, cy, rx, '#B48E6A', soil, '#7E5C44'), { ink: rgba('#5E4535', 0.6), width: 3 });
  // straw walkway down the middle
  ctx.fillStyle = rgba('#EAD69C', 0.9);
  ctx.beginPath();
  ctx.ellipse(cx, cy + 4, rx * 0.86, 44, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba('#C9AE6A', 0.6);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 140; i++) {
    const x = cx + (rnd() - 0.5) * rx * 1.6;
    const y = cy + 4 + (rnd() - 0.5) * 70;
    if (((x - cx) / (rx * 0.86)) ** 2 + ((y - cy - 4) / 44) ** 2 > 1) continue;
    const a = rnd() * Math.PI;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 4);
  }
  ctx.stroke();
  // ridged beds above and below the walkway
  const beds = [cy - 92, cy + 98];
  for (const by of beds) {
    const half = rx * Math.sqrt(Math.max(0, 1 - ((by - cy) / ry) ** 2)) - 28;
    pen.blob(ellipsePts(cx, by, half, 26, 30), mix(soil, '#6E4E38', 0.35), { stroke: false });
    ctx.strokeStyle = rgba('#5C4030', 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = cx - half + 20; x < cx + half - 20; x += 22) {
      ctx.moveTo(x, by - 12);
      ctx.lineTo(x + 10, by + 12);
    }
    ctx.stroke();
  }
  // upper bed: bamboo A-frame trellis heavy with cucumbers
  const top = beds[0];
  const half0 = rx * Math.sqrt(1 - ((top - cy) / ry) ** 2) - 50;
  for (let x = cx - half0; x <= cx + half0; x += 46) {
    if (g.dSpot(x, top) < 70) continue;
    const hgt = 66;
    pen.line([{ x: x - 14, y: top + 8 }, { x: x + 4, y: top - hgt }], { color: '#C8B07A', width: 4 });
    pen.line([{ x: x + 14, y: top + 8 }, { x: x - 4, y: top - hgt }], { color: '#B79E68', width: 4 });
    for (let j = 0; j < 4; j++) {
      const ly = top - 10 - j * 15;
      const lx = x + (rnd() - 0.5) * 22;
      pen.blob(ellipsePts(lx, ly, 13, 10, 10, (a) => 1 + 0.18 * Math.cos(5 * a)), soft(ctx, lx, ly, 13, k.leafLit, k.leaf, k.leafDark), { ink: rgba('#2F4A3A', 0.5), width: 1.5 });
    }
    if (rnd() < 0.8) {
      const cx2 = x + (rnd() - 0.5) * 16;
      const cy2 = top - 18 - rnd() * 20;
      pen.blob(ellipsePts(cx2, cy2 + 12, 5, 15, 12), soft(ctx, cx2, cy2 + 12, 14, '#8CC07A', '#4E8A47', '#2F5E35'), { ink: rgba('#24402C', 0.7), width: 1.5 });
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath();
      ctx.arc(cx2, cy2 - 4, 3, 0, TAU);
      ctx.fill();
    }
  }
  pen.line([{ x: cx - half0 - 10, y: top - 60 }, { x: cx + half0 + 10, y: top - 60 }], { color: '#C8B07A', width: 3, alpha: 0.9 });
  // lower bed: cabbages, eggplants, tomatoes
  const bot = beds[1];
  const half1 = rx * Math.sqrt(1 - ((bot - cy) / ry) ** 2) - 48;
  let i = 0;
  for (let x = cx - half1; x <= cx + half1; x += 52, i++) {
    if (g.dSpot(x, bot) < 70) continue;
    const kind = i % 3;
    if (kind === 0) {
      pen.blob(ellipsePts(x, bot - 6, 24, 18, 14, (a) => 1 + 0.1 * Math.cos(6 * a)), soft(ctx, x, bot - 6, 24, '#DDF0B8', '#A9D47E', '#6EA155'), { ink: rgba('#2F4A3A', 0.55), width: 2 });
      pen.line([{ x: x - 10, y: bot - 8 }, { x: x, y: bot - 2 }, { x: x + 10, y: bot - 9 }], { color: rgba('#5E8F4A', 0.7), width: 1.5 });
    } else if (kind === 1) {
      for (const s of [-1, 1]) pen.blob(ellipsePts(x + s * 12, bot - 14, 14, 9, 10, (a) => 1 + 0.2 * Math.cos(3 * a)), soft(ctx, x, bot - 14, 14, k.leafLit, k.leaf, k.leafDark), { ink: rgba('#2F4A3A', 0.45), width: 1.5 });
      pen.blob(ellipsePts(x + 2, bot, 7, 13, 12), soft(ctx, x + 2, bot, 13, '#9A7AC2', '#5E3F86', '#3A2558'), { ink: rgba('#2A1F3A', 0.6), width: 1.5 });
    } else {
      pen.line([{ x, y: bot + 6 }, { x, y: bot - 50 }], { color: '#C8B07A', width: 3 });
      for (let j = 0; j < 3; j++) {
        const lx = x + (j - 1) * 10;
        pen.blob(ellipsePts(lx, bot - 16 - j * 12, 12, 9, 10, (a) => 1 + 0.18 * Math.cos(5 * a)), soft(ctx, lx, bot - 20, 12, k.leafLit, k.leaf, k.leafDark), { ink: rgba('#2F4A3A', 0.45), width: 1.5 });
      }
      for (const [tx, ty] of [[-8, -12], [7, -24], [-4, -34]]) {
        pen.blob(ellipsePts(x + tx, bot + ty, 6, 6, 10), soft(ctx, x + tx, bot + ty, 6, '#FF9A86', '#E2493A', '#A82E2A'), { ink: rgba('#5A2020', 0.5), width: 1.2 });
      }
    }
  }
  // little bamboo stake fence around the beds
  ctx.strokeStyle = rgba('#B49B66', 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let a = 0; a < TAU; a += TAU / 46) {
    const x = cx + Math.cos(a) * (rx + 6);
    const y = cy + Math.sin(a) * (ry + 6);
    if (g.dPath(x, y) < 58) continue;
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 14);
  }
  ctx.stroke();
  ctx.strokeStyle = rgba('#8E7A52', 0.55);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10, rx + 6, ry + 6, 0, 0, TAU);
  ctx.stroke();
}

/**
 * Wooded hillside at the top of the screen (1-3) that the forest stairs come down through.
 * @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {NonNullable<Scene['forest']>} fo
 * @param {ReturnType<typeof tones>} k @param {() => number} rnd
 */
function paintForest(ctx, pen, fo, k, rnd) {
  const { x0, x1, y } = fo;
  const span = x1 - x0;
  /** Rounded wooded dome: deepest in the middle, tapering into the sky at both ends. @param {number} x */
  const edge = (x) => {
    const v = ((x - x0) / span - 0.5) / 0.68;
    const q = 1 - v * v * v * v;
    return q <= 0 ? -30 : -30 + (y + 30) * Math.sqrt(q) + Math.sin(x * 0.05) * 8;
  };
  const xa = x0 - span * 0.18;
  const xb = x1 + span * 0.18;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xa, -30);
  for (let x = xa; x <= xb; x += 16) ctx.lineTo(x, edge(x));
  ctx.lineTo(xb, -30);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0, 0, 0, y + 20);
  fg.addColorStop(0, mix(k.leafDark, '#26402F', 0.45));
  fg.addColorStop(1, k.leafDark);
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.restore();
  // rows of crowns, back to front; cedar spires in the back rows
  for (let row = 0; row < 7; row++) {
    const ry = -30 + row * ((y + 10) / 6);
    for (let x = xa + 20 + (row % 2) * 40; x < xb - 20; x += 66 + rnd() * 30) {
      const lim = edge(x);
      if (ry > lim - 26) continue;
      const r = 44 + rnd() * 26;
      const shade = mix(k.leafDark, k.leaf, row / 8 + rnd() * 0.15);
      if (row < 3 && rnd() < 0.6) {
        pen.blob([{ x, y: ry - r * 1.6 }, { x: x + r * 0.7, y: ry + r * 0.4 }, { x: x - r * 0.7, y: ry + r * 0.4 }], soft(ctx, x, ry - r * 0.3, r, mix(k.leafLit, shade, 0.5), shade, mix(shade, '#1F3326', 0.5)), { ink: rgba('#1F3326', 0.5), width: 2 });
      } else {
        pen.blob(ellipsePts(x, ry, r, r * 0.8, 18, (a) => 1 + 0.08 * Math.cos(6 * a + x)), soft(ctx, x, ry, r, mix(k.leafLit, shade, 0.45), shade, mix(shade, '#1F3326', 0.5)), { ink: rgba('#1F3326', 0.45), width: 2 });
      }
    }
  }
  // trunks peeking out under the front edge, plus a soft shadow on the grass
  const sh = ctx.createLinearGradient(0, y - 10, 0, y + 50);
  sh.addColorStop(0, 'rgba(30,50,40,0.22)');
  sh.addColorStop(1, 'rgba(30,50,40,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.moveTo(xa, edge(xa));
  for (let x = xa; x <= xb; x += 16) ctx.lineTo(x, edge(x) - 4);
  for (let x = xb; x >= xa; x -= 16) ctx.lineTo(x, edge(x) + 40);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba('#5A4434', 0.75);
  ctx.lineWidth = 9;
  ctx.beginPath();
  for (let x = x0 + 30; x < x1 - 30; x += 90 + rnd() * 50) {
    const lim = edge(x);
    ctx.moveTo(x, lim - 30);
    ctx.lineTo(x + 2, lim + 6);
  }
  ctx.stroke();
}

/** Stone lanterns flanking the forest stairs; they glow as evening comes. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {Geo} g @param {ReturnType<typeof tones>} k @param {number} l */
function paintStairLanterns(ctx, pen, g, k, l) {
  const st = g.sc.stairs;
  if (!st) return;
  const tr = g.tracks[st.path];
  for (let d = 150; d < tr.length; d += 150) {
    const p = tr.at(d);
    if (p.y > st.toY + 20) break;
    if (p.y < 90) continue;
    const len = Math.hypot(p.dx, p.dy) || 1;
    for (const s of [-1, 1]) {
      const x = p.x + (-p.dy / len) * 82 * s;
      const y = p.y + (p.dx / len) * 82 * s;
      paintLantern(ctx, pen, x, y, 0.7, k, l);
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s @param {ReturnType<typeof tones>} k @param {number} l */
function paintLantern(ctx, pen, x, y, s, k, l) {
  const stone = mix('#C9C2B2', k.tint, 0.2);
  const ink = { ink: INK_SOFT, width: 2 };
  ctx.fillStyle = 'rgba(40,40,50,0.18)';
  ctx.beginPath();
  ctx.ellipse(x + 10 * s, y + 3, 22 * s, 7 * s, 0, 0, TAU);
  ctx.fill();
  pen.blob([{ x: x - 16 * s, y: y - 8 * s }, { x: x + 16 * s, y: y - 8 * s }, { x: x + 18 * s, y }, { x: x - 18 * s, y }], stone, ink);
  pen.blob([{ x: x - 6 * s, y: y - 40 * s }, { x: x + 6 * s, y: y - 40 * s }, { x: x + 6 * s, y: y - 8 * s }, { x: x - 6 * s, y: y - 8 * s }], stone, ink);
  const lit = l > 0.45 ? '#FFD27A' : '#8C857A';
  pen.blob([{ x: x - 13 * s, y: y - 62 * s }, { x: x + 13 * s, y: y - 62 * s }, { x: x + 13 * s, y: y - 40 * s }, { x: x - 13 * s, y: y - 40 * s }], stone, ink);
  ctx.fillStyle = lit;
  ctx.fillRect(x - 6 * s, y - 58 * s, 12 * s, 13 * s);
  pen.blob([{ x: x - 24 * s, y: y - 62 * s }, { x, y: y - 80 * s }, { x: x + 24 * s, y: y - 62 * s }], mix(stone, '#8C857A', 0.3), ink);
  if (l > 0.45) {
    const gl = ctx.createRadialGradient(x, y - 52 * s, 2, x, y - 52 * s, 60 * s);
    gl.addColorStop(0, `rgba(255,210,122,${0.55 * (l - 0.45) * 1.8})`);
    gl.addColorStop(1, 'rgba(255,210,122,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - 60 * s, y - 112 * s, 120 * s, 120 * s);
  }
}

/** Wildflowers, tufts and pebbles, denser toward the frame edges. @param {CanvasRenderingContext2D} ctx @param {Geo} g @param {ReturnType<typeof tones>} k @param {() => number} rnd */
function paintScatter(ctx, g, k, rnd) {
  const flowers = ['#FFFDF6', P.gold, '#F4A6B7', '#C9B8EA', '#FFFDF6'];
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * W;
    const y = 296 + rnd() * (H - 296);
    const edge = Math.max(0, 1 - Math.min(x, W - x, H - y) / 360);
    if (rnd() > 0.25 + edge * 0.75) continue;
    const dp = g.dPath(x, y);
    if (dp < 84 || g.dSpot(x, y) < 70) continue;
    if (g.river && inPoly(g.river.poly, x, y)) continue;
    if (g.cells.some((c) => Math.abs(c.cx - x) < 130 && inPoly(c.pts, x, y))) continue;
    const gd = g.sc.garden;
    if (gd && ((x - gd.cx) / (gd.rx + 20)) ** 2 + ((y - gd.cy) / (gd.ry + 20)) ** 2 < 1) continue;
    if (g.sc.forest && x > g.sc.forest.x0 - 60 && x < g.sc.forest.x1 + 60 && y < g.sc.forest.y + 10) continue;
    const near = dp < 150 ? 0.45 : 1;
    const roll = rnd();
    if (roll < 0.5) {
      ctx.strokeStyle = rgba(mix(k.grassDark, '#3F6A3C', 0.3), 0.55 * near + 0.2 * edge);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const hh = 8 + rnd() * 10 + edge * 8;
      for (let b = -2; b <= 2; b++) {
        ctx.moveTo(x + b * 2, y);
        ctx.quadraticCurveTo(x + b * 3, y - hh * 0.6, x + b * 5 + (rnd() - 0.5) * 4, y - hh);
      }
      ctx.stroke();
    } else if (roll < 0.86) {
      const col = flowers[Math.floor(rnd() * flowers.length)];
      ctx.fillStyle = rgba(col, near);
      const n = 3 + Math.floor(rnd() * 4);
      for (let j = 0; j < n; j++) {
        const fx = x + (rnd() - 0.5) * 22;
        const fy = y + (rnd() - 0.5) * 10;
        ctx.beginPath();
        ctx.arc(fx, fy, 2.4 + rnd() * 1.6 + edge, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = rgba(mix('#BDB5A2', k.tint, 0.2), 0.8 * near);
      ctx.beginPath();
      ctx.ellipse(x, y, 4 + rnd() * 5, 3 + rnd() * 2, 0, 0, TAU);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- props

/** Long soft shadow that stretches as the sun sinks. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} rx @param {number} ry @param {{sx:number, sy:number}} sun @param {number} [k] */
function castShadow(ctx, x, y, rx, ry, sun, k = 1) {
  const len = Math.hypot(sun.sx, sun.sy) * k;
  const ang = Math.atan2(sun.sy, sun.sx);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const g = ctx.createRadialGradient(len * 0.35, 0, 0, len * 0.35, 0, rx + len * 0.6);
  g.addColorStop(0, 'rgba(46,58,60,0.30)');
  g.addColorStop(0.7, 'rgba(46,58,60,0.16)');
  g.addColorStop(1, 'rgba(46,58,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(len * 0.35, 0, rx + len * 0.55, ry, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/**
 * The giant old tree: buttress roots, a sacred straw rope, and a huge cloud of leaves.
 * @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s
 * @param {ReturnType<typeof tones>} k @param {ReturnType<typeof sunOf>} sun @param {number} l
 */
function paintTree(ctx, pen, x, y, s, k, sun, l) {
  const r = mulberry32(Math.round(x * 7 + y));
  castShadow(ctx, x + 10 * s, y + 4, 230 * s, 60 * s, sun, 1.6);
  // trunk with flaring roots
  const trunk = [
    { x: x - 120 * s, y: y + 6 }, { x: x - 70 * s, y: y - 16 * s }, { x: x - 50 * s, y: y - 90 * s },
    { x: x - 46 * s, y: y - 190 * s }, { x: x - 110 * s, y: y - 300 * s }, { x: x - 20 * s, y: y - 250 * s },
    { x: x + 10 * s, y: y - 320 * s }, { x: x + 40 * s, y: y - 240 * s }, { x: x + 130 * s, y: y - 290 * s },
    { x: x + 52 * s, y: y - 180 * s }, { x: x + 52 * s, y: y - 80 * s }, { x: x + 80 * s, y: y - 14 * s },
    { x: x + 140 * s, y: y + 8 }, { x: x + 40 * s, y: y + 4 }, { x, y: y + 12 }, { x: x - 50 * s, y: y + 6 },
  ];
  const tg = ctx.createLinearGradient(x - 60 * s, 0, x + 60 * s, 0);
  tg.addColorStop(0, mix('#A9876A', k.tint, 0.3));
  tg.addColorStop(0.45, '#7C5C46');
  tg.addColorStop(1, '#4F3A30');
  pen.blob(trunk, tg, { width: 3.5 });
  ctx.strokeStyle = rgba('#3B2E28', 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const bx = x + (i - 3) * 13 * s;
    ctx.moveTo(bx, y - 4);
    ctx.bezierCurveTo(bx + 6 * s, y - 60 * s, bx - 6 * s, y - 120 * s, bx + 3 * s, y - 190 * s);
  }
  ctx.stroke();
  // moss
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = rgba('#7FA35A', 0.35);
    ctx.beginPath();
    ctx.ellipse(x - 40 * s + r() * 30 * s, y - 20 * s - r() * 120 * s, 10 * s, 6 * s, 0, 0, TAU);
    ctx.fill();
  }
  // shimenawa rope + paper streamers
  const ry0 = y - 120 * s;
  const rope = [{ x: x - 56 * s, y: ry0 - 4 * s }, { x: x, y: ry0 + 12 * s }, { x: x + 56 * s, y: ry0 - 4 * s }];
  pen.tube(rope, 13 * s, '#E9D59A');
  ctx.strokeStyle = rgba('#B89A58', 0.8);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = -5; i <= 5; i++) {
    const px = x + i * 10 * s;
    const py = ry0 + 12 * s - Math.abs(i) * Math.abs(i) * 0.55 * s;
    ctx.moveTo(px - 4 * s, py - 6 * s);
    ctx.lineTo(px + 4 * s, py + 6 * s);
  }
  ctx.stroke();
  for (const u of [-0.55, 0, 0.55]) {
    const px = x + u * 56 * s;
    const py = ry0 + 12 * s - u * u * 18 * s;
    pen.blob([
      { x: px - 5 * s, y: py }, { x: px + 5 * s, y: py }, { x: px + 5 * s, y: py + 9 * s }, { x: px - 1 * s, y: py + 12 * s },
      { x: px + 5 * s, y: py + 20 * s }, { x: px - 1 * s, y: py + 30 * s }, { x: px - 5 * s, y: py + 26 * s }, { x: px, y: py + 18 * s }, { x: px - 5 * s, y: py + 10 * s },
    ], '#FFFDF6', { width: 1.5, ink: INK_SOFT });
  }
  // canopy: ink silhouette pass first, then fills, so only the outer edge reads as a line
  const ccx = x;
  const ccy = y - 345 * s;
  const clumps = [];
  for (let i = 0; i < 34; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r());
    clumps.push({ x: ccx + Math.cos(a) * d * 320 * s, y: ccy + Math.sin(a) * d * 170 * s + 30 * s, r: (70 + r() * 60) * s });
  }
  for (let i = 0; i < 6; i++) clumps.push({ x: ccx + (i - 2.5) * 110 * s, y: ccy + 150 * s, r: (62 + r() * 20) * s });
  clumps.sort((a, b) => a.y - b.y);
  const shape = (/** @type {{x:number,y:number,r:number}} */ c, /** @type {number} */ grow) =>
    ellipsePts(c.x, c.y, c.r + grow, (c.r + grow) * 0.82, 22, (a) => 1 + 0.07 * Math.cos(7 * a + c.x * 0.1));
  for (const cl of clumps) pen.blob(shape(cl, 3), INK, { stroke: false, amp: 0 });
  for (const cl of clumps) {
    const h = clamp(((ccy + 200 * s - cl.y) / (360 * s)) * 0.8 + ((ccx - cl.x) / (700 * s)) * 0.4, 0, 1);
    const base = mix(k.leafDark, k.leaf, 0.3 + h * 0.7);
    pen.blob(shape(cl, 0), soft(ctx, cl.x, cl.y, cl.r, mix(k.leafLit, base, 0.35 - h * 0.25), base, mix(base, k.leafDark, 0.7)), { stroke: false, amp: 0 });
  }
  // leaf texture dabs
  for (let i = 0; i < 260; i++) {
    const cl = clumps[Math.floor(r() * clumps.length)];
    const a = r() * TAU;
    const d = r() * cl.r * 0.8;
    const px = cl.x + Math.cos(a) * d;
    const py = cl.y + Math.sin(a) * d * 0.8;
    const lit = Math.sin(a) < -0.2 && r() < 0.7;
    ctx.fillStyle = lit ? rgba(k.leafLit, 0.55) : rgba(k.leafDark, 0.35);
    ctx.beginPath();
    ctx.ellipse(px, py, (5 + r() * 6) * s, (3 + r() * 3) * s, r() * 3, 0, TAU);
    ctx.fill();
  }
  // golden-hour rim light on the sun side
  if (l > 0.3) {
    for (const cl of clumps) {
      if (cl.x > ccx + 60 * s) continue;
      const rim = ctx.createRadialGradient(cl.x - cl.r * 0.7, cl.y - cl.r * 0.3, 0, cl.x - cl.r * 0.7, cl.y - cl.r * 0.3, cl.r);
      rim.addColorStop(0, rgba('#FFC77A', 0.4 * l));
      rim.addColorStop(1, rgba('#FFC77A', 0));
      pen.blob(shape(cl, 0), rim, { stroke: false, amp: 0 });
    }
  }
}

/**
 * A tiny stone shrine with fox guardians, stone lanterns and a vermilion gate.
 * @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s @param {number} gateDx gate offset from the shrine (unscaled px)
 * @param {ReturnType<typeof tones>} k @param {ReturnType<typeof sunOf>} sun @param {number} l
 */
function paintShrine(ctx, pen, x, y, s, gateDx, k, sun, l) {
  const stone = mix('#C4BDAE', k.tint, 0.15);
  const ink = { width: 2.5 };
  castShadow(ctx, x, y - 4, 110 * s, 26 * s, sun, 0.9 * s);
  // platform
  pen.blob([{ x: x - 80 * s, y: y - 30 * s }, { x: x + 80 * s, y: y - 30 * s }, { x: x + 90 * s, y }, { x: x - 90 * s, y }], soft(ctx, x, y - 15 * s, 90 * s, '#E0DACB', stone, '#9E978A'), ink);
  pen.line([{ x: x - 84 * s, y: y - 14 * s }, { x: x + 84 * s, y: y - 14 * s }], { color: rgba('#7E776B', 0.5), width: 1.5 });
  // hokora body: dark wood frame with two pale lattice doors
  pen.blob([{ x: x - 38 * s, y: y - 110 * s }, { x: x + 38 * s, y: y - 110 * s }, { x: x + 38 * s, y: y - 28 * s }, { x: x - 38 * s, y: y - 28 * s }], soft(ctx, x, y - 70 * s, 50 * s, '#9C7456', '#7A563E', '#563C2C'), ink);
  for (const d of [-1, 1]) {
    ctx.fillStyle = mix('#F4ECD6', k.tint, 0.2);
    ctx.fillRect(x + (d < 0 ? -31 : 2) * s, y - 100 * s, 29 * s, 64 * s);
  }
  ctx.strokeStyle = rgba('#6B4A36', 0.75);
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  for (const ox of [-21, -11, 12, 22]) {
    ctx.moveTo(x + ox * s, y - 100 * s);
    ctx.lineTo(x + ox * s, y - 36 * s);
  }
  for (let j = 0; j < 4; j++) {
    ctx.moveTo(x - 31 * s, y - (86 - j * 15) * s);
    ctx.lineTo(x + 31 * s, y - (86 - j * 15) * s);
  }
  ctx.stroke();
  pen.blob([{ x: x - 30 * s, y: y - 34 * s }, { x: x + 30 * s, y: y - 34 * s }, { x: x + 34 * s, y: y - 26 * s }, { x: x - 34 * s, y: y - 26 * s }], '#A79F90', { width: 1.5 });
  ctx.fillStyle = P.shrine;
  ctx.fillRect(x - 40 * s, y - 116 * s, 80 * s, 8 * s);
  // swept roof
  pen.blob([
    { x: x - 70 * s, y: y - 104 * s }, { x: x - 50 * s, y: y - 120 * s }, { x: x, y: y - 168 * s },
    { x: x + 50 * s, y: y - 120 * s }, { x: x + 70 * s, y: y - 104 * s }, { x: x, y: y - 128 * s },
  ], soft(ctx, x - 20 * s, y - 140 * s, 60 * s, '#8B95A2', '#5F6873', '#40474F'), ink);
  pen.line([{ x: x - 6 * s, y: y - 170 * s }, { x: x + 6 * s, y: y - 170 * s }], { width: 4 });
  // rope + paper zigzags across the front
  pen.line([{ x: x - 36 * s, y: y - 104 * s }, { x, y: y - 96 * s }, { x: x + 36 * s, y: y - 104 * s }], { color: '#E2CB86', width: 4 * s });
  for (const u of [-18, 18]) pen.blob([{ x: x + (u - 4) * s, y: y - 99 * s }, { x: x + (u + 4) * s, y: y - 99 * s }, { x: x + (u + 1) * s, y: y - 84 * s }], '#FFFDF6', { width: 1.2, ink: INK_SOFT });
  // fox guardians with red bibs
  for (const d of [-1, 1]) {
    const fx = x + d * 62 * s;
    const fy = y - 30 * s;
    pen.blob([{ x: fx - 10 * s, y: fy }, { x: fx + 10 * s, y: fy }, { x: fx + 9 * s, y: fy - 26 * s }, { x: fx - 9 * s, y: fy - 26 * s }], stone, { width: 2 });
    pen.blob([{ x: fx - 9 * s, y: fy - 24 * s }, { x: fx - 8 * s, y: fy - 44 * s }, { x: fx - 3 * s, y: fy - 36 * s }, { x: fx + 3 * s, y: fy - 36 * s }, { x: fx + 8 * s, y: fy - 44 * s }, { x: fx + 9 * s, y: fy - 24 * s }, { x: fx + 2 * s * d, y: fy - 18 * s }], stone, { width: 2 });
    pen.blob([{ x: fx - 8 * s, y: fy - 22 * s }, { x: fx + 8 * s, y: fy - 22 * s }, { x: fx, y: fy - 12 * s }], P.shrine, { width: 1.5 });
    pen.tube([{ x: fx + d * 9 * s, y: fy - 4 * s }, { x: fx + d * 20 * s, y: fy - 16 * s }, { x: fx + d * 16 * s, y: fy - 32 * s }], 6 * s, stone);
  }
  for (const d of [-1, 1]) paintLantern(ctx, pen, x + d * 112 * s, y + 4 * s, 0.8 * s, k, l);
  // vermilion gate in front, to one side
  paintGate(ctx, pen, x + gateDx * s, y + 30 * s, s, k, sun);
}

/** @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s @param {ReturnType<typeof tones>} k @param {ReturnType<typeof sunOf>} sun */
function paintScarecrow(ctx, pen, x, y, s, k, sun) {
  castShadow(ctx, x, y, 40 * s, 10 * s, sun, 1.2);
  pen.tube([{ x, y }, { x, y: y - 150 * s }], 7 * s, '#9C7A55');
  pen.tube([{ x: x - 62 * s, y: y - 104 * s }, { x: x + 62 * s, y: y - 104 * s }], 6 * s, '#9C7A55');
  // patched indigo shirt
  pen.blob([
    { x: x - 58 * s, y: y - 114 * s }, { x: x + 58 * s, y: y - 114 * s }, { x: x + 56 * s, y: y - 94 * s }, { x: x + 26 * s, y: y - 96 * s },
    { x: x + 30 * s, y: y - 44 * s }, { x: x - 30 * s, y: y - 44 * s }, { x: x - 26 * s, y: y - 96 * s }, { x: x - 56 * s, y: y - 94 * s },
  ], soft(ctx, x, y - 90 * s, 60 * s, '#7E96C4', '#4F6A9E', '#33476E'), { width: 2.5 });
  pen.blob([{ x: x + 6 * s, y: y - 80 * s }, { x: x + 22 * s, y: y - 80 * s }, { x: x + 22 * s, y: y - 64 * s }, { x: x + 6 * s, y: y - 64 * s }], '#E7B85C', { width: 1.5 });
  pen.line([{ x: x - 24 * s, y: y - 58 * s }, { x: x - 12 * s, y: y - 54 * s }], { color: '#FFFDF6', width: 1.5 });
  for (const d of [-1, 1]) {
    ctx.strokeStyle = '#E2C27A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(x + d * 58 * s, y - 104 * s);
      ctx.lineTo(x + d * 72 * s, y - 104 * s + i * 5 * s);
    }
    ctx.stroke();
  }
  // a cucumber trophy dangling from one hand
  pen.blob(ellipsePts(x + 72 * s, y - 84 * s, 5 * s, 14 * s, 12), '#4E8A47', { width: 1.5 });
  // sack head with a sleepy painted face
  pen.blob(ellipsePts(x, y - 140 * s, 20 * s, 18 * s, 16), soft(ctx, x, y - 140 * s, 20 * s, '#FBF1D8', '#EBDDB8', '#C9B58A'), { width: 2.5 });
  pen.line([{ x: x - 10 * s, y: y - 142 * s }, { x: x - 4 * s, y: y - 140 * s }], { width: 2 });
  pen.line([{ x: x + 4 * s, y: y - 140 * s }, { x: x + 10 * s, y: y - 142 * s }], { width: 2 });
  pen.line([{ x: x - 5 * s, y: y - 132 * s }, { x, y: y - 129 * s }, { x: x + 5 * s, y: y - 132 * s }], { width: 1.8 });
  ctx.fillStyle = 'rgba(233,138,154,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - 12 * s, y - 135 * s, 4 * s, 2.5 * s, 0, 0, TAU);
  ctx.ellipse(x + 12 * s, y - 135 * s, 4 * s, 2.5 * s, 0, 0, TAU);
  ctx.fill();
  // straw hat
  pen.blob(ellipsePts(x, y - 154 * s, 40 * s, 10 * s, 20), soft(ctx, x, y - 156 * s, 40 * s, '#F6DE9C', '#E2C27A', '#B8964E'), { width: 2.5 });
  pen.blob([{ x: x - 16 * s, y: y - 158 * s }, { x: x - 10 * s, y: y - 176 * s }, { x: x + 10 * s, y: y - 176 * s }, { x: x + 16 * s, y: y - 158 * s }], '#E8CB86', { width: 2.5 });
  pen.line([{ x: x - 16 * s, y: y - 160 * s }, { x: x + 16 * s, y: y - 160 * s }], { color: P.shrine, width: 3 });
  // a sparrow taking a break on the hat
  pen.blob(ellipsePts(x + 14 * s, y - 182 * s, 9 * s, 7 * s, 12), '#A8835E', { width: 1.5 });
  pen.blob(ellipsePts(x + 21 * s, y - 188 * s, 5 * s, 5 * s, 10), '#8A6A4C', { width: 1.5 });
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + 23 * s, y - 189 * s, 1.2 * s, 0, TAU);
  ctx.fill();
}

/** Round summer bush with clusters of blue hydrangea. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} x @param {number} y @param {number} s @param {ReturnType<typeof tones>} k @param {() => number} rnd @param {ReturnType<typeof sunOf>} sun */
function paintBush(ctx, pen, x, y, s, k, rnd, sun) {
  castShadow(ctx, x, y, 120 * s, 26 * s, sun, 0.7);
  const parts = [];
  for (let i = 0; i < 9; i++) parts.push({ x: x + (rnd() - 0.5) * 200 * s, y: y - 30 * s - rnd() * 90 * s, r: (46 + rnd() * 30) * s });
  parts.sort((a, b) => a.y - b.y);
  for (const p of parts) pen.blob(ellipsePts(p.x, p.y, p.r + 3, p.r * 0.8 + 3, 18), INK, { stroke: false, amp: 0 });
  for (const p of parts) pen.blob(ellipsePts(p.x, p.y, p.r, p.r * 0.8, 18, (a) => 1 + 0.08 * Math.cos(6 * a)), soft(ctx, p.x, p.y, p.r, k.leafLit, k.leaf, k.leafDark), { stroke: false, amp: 0 });
  const blooms = ['#9DB8E8', '#B9A6E0', '#8FA8DE', '#D2B8EC'];
  for (let i = 0; i < 9; i++) {
    const p = parts[Math.floor(rnd() * parts.length)];
    const bx = p.x + (rnd() - 0.5) * p.r;
    const by = p.y - rnd() * p.r * 0.5;
    const col = blooms[i % blooms.length];
    ctx.fillStyle = mix(col, k.tint, 0.15);
    for (let j = 0; j < 9; j++) {
      ctx.beginPath();
      ctx.arc(bx + (rnd() - 0.5) * 26 * s, by + (rnd() - 0.5) * 18 * s, 5 * s, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = rgba('#FFFFFF', 0.45);
    ctx.beginPath();
    ctx.arc(bx - 5 * s, by - 5 * s, 4 * s, 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- live layers (per frame, cheap)

/** @type {CanvasImageSource|null} */
let glowSprite = null;
function fireflyGlow() {
  if (glowSprite) return glowSprite;
  const { c, ctx } = mkCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,220,1)');
  g.addColorStop(0.18, 'rgba(240,255,150,0.9)');
  g.addColorStop(0.5, 'rgba(200,240,110,0.25)');
  g.addColorStop(1, 'rgba(200,240,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glowSprite = c;
  return c;
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {Geo} g @param {number} t @param {number} light @param {number} b @param {boolean} rm
 */
function drawLiveBack(ctx, g, t, light, b, rm) {
  const m = rm ? 0.2 : 1;
  const sprites = cloudSprites(b);
  // drifting cloud reflections in the paddies and river
  if (g.mirror) {
    const clip = g.mirror;
    ctx.save();
    ctx.clip(/** @type {Path2D} */ (clip));
    ctx.globalAlpha *= 0.28;
    sprites.forEach((s, i) => {
      const x = cloudX(t, rm, i);
      const ry = 330 + i * 210;
      ctx.save();
      ctx.translate(x, ry);
      ctx.scale(1, -0.75);
      ctx.drawImage(s.img, 0, -s.h, s.w, s.h);
      ctx.restore();
    });
    ctx.restore();
  }
  // twinkling sun glints on water
  ctx.save();
  ctx.strokeStyle = 'rgba(255,253,240,0.95)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const gl of g.glints) {
    const a = Math.sin(t * 1.7 + gl.p);
    if (a < 0.8) continue;
    const r = (a - 0.8) * 30;
    ctx.moveTo(gl.x - r, gl.y);
    ctx.lineTo(gl.x + r, gl.y);
    ctx.moveTo(gl.x, gl.y - r * 0.6);
    ctx.lineTo(gl.x, gl.y + r * 0.6);
  }
  ctx.stroke();
  // river current
  const rv = g.river;
  if (rv && rv.path) {
    ctx.clip(rv.path);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const s = (((i * 97.3 + t * 38 * m) % rv.len) + rv.len) % rv.len;
      let j = 1;
      while (j < rv.cum.length - 1 && rv.cum[j] < s) j++;
      const p = rv.center[j];
      const q = rv.center[j - 1];
      const off = ((i * 37) % 9) * 12 - 48;
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const x = p.x + nx * off;
      const y = p.y + ny * off;
      ctx.moveTo(x - (dx / len) * 12, y - (dy / len) * 12);
      ctx.quadraticCurveTo(x + nx * 3, y + ny * 3, x + (dx / len) * 12, y + (dy / len) * 12);
    }
    ctx.stroke();
  }
  ctx.restore();

  const sc = g.sc;
  // chimney smoke from the farmhouse
  if (sc.farm) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.12 * m + i / 6) % 1 + 1) % 1;
      ctx.fillStyle = `rgba(250,248,240,${0.4 * (1 - u)})`;
      ctx.beginPath();
      ctx.arc(sc.farm.x + 30 + u * 40 + Math.sin(u * 6 + t * m) * 6, sc.farm.y - 66 - u * 90, 6 + u * 16, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  // swaying grass tufts
  const k = 0.5 + 0.5 * light;
  ctx.save();
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? `rgba(130,170,90,${0.7})` : `rgba(62,104,60,${0.6 + 0.1 * k})`;
    ctx.lineWidth = pass ? 1.6 : 2.2;
    ctx.beginPath();
    for (let i = pass; i < g.sway.length; i += 2) {
      const s = g.sway[i];
      const w = Math.sin(t * 1.4 * m + s.p + s.x * 0.003) * s.h * 0.22 * m;
      for (let b2 = 0; b2 < s.n; b2++) {
        const o = (b2 - (s.n - 1) / 2) * 4;
        ctx.moveTo(s.x + o, s.y);
        ctx.quadraticCurveTo(s.x + o * 1.4, s.y - s.h * 0.6, s.x + o * 2.2 + w, s.y - s.h - (b2 % 2) * 4);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
  // leaves drifting down from the big tree
  if (sc.tree && !rm) {
    const tr = sc.tree;
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.07 + i * 0.25) % 1;
      const x = tr.x + (i - 1.5) * 120 * tr.s + Math.sin(t * 1.3 + i * 2) * 26 + u * 90;
      const y = tr.y - 220 * tr.s + u * 300;
      ctx.save();
      ctx.globalAlpha *= Math.min(1, (1 - u) * 3) * 0.85;
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 2 + i) * 1.2);
      ctx.fillStyle = i % 2 ? '#9CC46A' : '#E3B45A';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 3.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  // dragonflies patrolling over the water (red ones come out toward evening)
  for (let i = 0; i < sc.flies.length; i++) {
    const c = sc.flies[i];
    const pos = (/** @type {number} */ tt) => ({
      x: c.x + 150 * Math.sin(tt * 0.31 + i * 2.1) + 46 * Math.sin(tt * 1.13 + i),
      y: c.y + 54 * Math.sin(tt * 0.47 + i * 1.7) + 16 * Math.sin(tt * 1.7 + i * 3),
    });
    const tt = t * m;
    const p = pos(tt);
    const q = pos(tt + 0.05);
    const ang = Math.atan2(q.y - p.y, q.x - p.x);
    drawDragonfly(ctx, p.x, p.y, ang, t, light > 0.5 && i % 2 === 0 ? '#C8503A' : '#3E8C9A', rm);
  }
  // fireflies at golden hour
  if (light > 0.6) {
    const a = (light - 0.6) / 0.4;
    const spr = fireflyGlow();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of g.flies) {
      const blink = Math.max(0, Math.sin(t * 1.9 + f.p * 3)) ** 2;
      if (blink < 0.05) continue;
      const x = f.x + 22 * Math.sin(t * 0.5 * m + f.p);
      const y = f.y + 14 * Math.sin(t * 0.7 * m + f.p * 1.3) - 8;
      ctx.globalAlpha = a * blink;
      ctx.drawImage(spr, x - 16, y - 16, 32, 32);
    }
    ctx.restore();
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} ang @param {number} t @param {string} body @param {boolean} rm */
function drawDragonfly(ctx, x, y, ang, t, body, rm) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,60,50,0.12)';
  ctx.beginPath();
  ctx.ellipse(x + 10, y + 42, 12, 4, 0, 0, TAU);
  ctx.fill();
  ctx.translate(x, y);
  ctx.rotate(ang);
  const flap = rm ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(t * 38));
  ctx.fillStyle = 'rgba(240,250,255,0.55)';
  ctx.strokeStyle = 'rgba(59,58,74,0.35)';
  ctx.lineWidth = 0.8;
  for (const [ox, sa] of [[3, 1], [3, -1], [-2, 1], [-2, -1]]) {
    ctx.beginPath();
    ctx.ellipse(ox, sa * 7 * flap, 4, 11 * flap, sa * 0.25, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = body;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(6, 0);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(8, 0, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

const midPen = new Pen(/** @type {any} */ (null));

/** Stone stairs, the gate at their foot, and the arched bridge over the river. @param {CanvasRenderingContext2D} ctx @param {Pen} _pen @param {Geo} g @param {number} t @param {number} light */
function drawLiveMid(ctx, _pen, g, t, light) {
  const sc = g.sc;
  if (!sc.stairs && !sc.bridge) return;
  const pen = midPen;
  pen.ctx = ctx;
  pen.begin(0, { boil: false, width: 3 });
  const k = tones(Math.round(light * 4) / 4);
  if (sc.stairs) {
    const tr = g.tracks[sc.stairs.path];
    const half = 46;
    ctx.save();
    ctx.lineCap = 'round';
    let foot = null;
    for (let d = 0, i = 0; d < tr.length; d += 30, i++) {
      const a = tr.at(d);
      const b = tr.at(d + 30);
      if (a.y > sc.stairs.toY) {
        foot = a;
        break;
      }
      if (b.y < -40) continue;
      const la = Math.hypot(a.dx, a.dy) || 1;
      const lb = Math.hypot(b.dx, b.dy) || 1;
      const na = { x: -a.dy / la, y: a.dx / la };
      const nb = { x: -b.dy / lb, y: b.dx / lb };
      const q = [
        { x: a.x + na.x * half, y: a.y + na.y * half }, { x: b.x + nb.x * half, y: b.y + nb.y * half },
        { x: b.x - nb.x * half, y: b.y - nb.y * half }, { x: a.x - na.x * half, y: a.y - na.y * half },
      ];
      polyPath(ctx, q);
      ctx.fillStyle = mix(i % 2 ? '#D9D1C0' : '#CEC5B3', k.tint, 0.25);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,82,74,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(q[1].x, q[1].y);
      ctx.lineTo(q[2].x, q[2].y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(q[0].x, q[0].y + 2);
      ctx.lineTo(q[3].x, q[3].y + 2);
      ctx.stroke();
    }
    ctx.restore();
    if (foot) paintGate(ctx, pen, foot.x, foot.y + 26, 1.12, k, sunOf(light));
  }
  if (sc.bridge && g.bridge) {
    const tr = g.tracks[sc.bridge.path];
    const { d0, d1 } = g.bridge;
    {
      const half = 50;
      ctx.save();
      for (let d = d0, i = 0; d < d1; d += 13, i++) {
        const a = tr.at(d);
        const b = tr.at(Math.min(d1, d + 13));
        const l = Math.hypot(a.dx, a.dy) || 1;
        const n = { x: -a.dy / l, y: a.dx / l };
        polyPath(ctx, [
          { x: a.x + n.x * half, y: a.y + n.y * half }, { x: b.x + n.x * half, y: b.y + n.y * half },
          { x: b.x - n.x * half, y: b.y - n.y * half }, { x: a.x - n.x * half, y: a.y - n.y * half },
        ]);
        ctx.fillStyle = mix(i % 2 ? '#C9996A' : '#BB8B5C', k.tint, 0.2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80,56,40,0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // arched vermilion rails with posts
      for (const s of [-1, 1]) {
        const rail = [];
        const posts = [];
        for (let j = 0; j <= 10; j++) {
          const u = j / 10;
          const p = tr.at(d0 + (d1 - d0) * u);
          const l = Math.hypot(p.dx, p.dy) || 1;
          const bx = p.x + (-p.dy / l) * (half + 4) * s;
          const by = p.y + (p.dx / l) * (half + 4) * s;
          const lift = 22 + Math.sin(u * Math.PI) * 12;
          rail.push({ x: bx, y: by - lift });
          if (j % 2 === 0) posts.push([{ x: bx, y: by }, { x: bx, y: by - lift }]);
        }
        for (const pp of posts) pen.tube(pp, 6, P.shrine);
        pen.tube(rail, 8, P.shrine);
        pen.line(rail.map((p) => ({ x: p.x, y: p.y - 2 })), { color: 'rgba(255,200,170,0.6)', width: 2 });
      }
      ctx.restore();
    }
  }
}

/** A standalone vermilion gate. @param {CanvasRenderingContext2D} ctx @param {Pen} pen @param {number} gx @param {number} gy @param {number} s @param {ReturnType<typeof tones>} k @param {ReturnType<typeof sunOf>} sun */
function paintGate(ctx, pen, gx, gy, s, k, sun) {
  const ink = { width: 2.5 };
  castShadow(ctx, gx, gy, 90 * s, 12 * s, sun, 0.6 * s);
  const red = soft(ctx, gx - 30 * s, gy - 120 * s, 120 * s, '#F08A6A', P.shrine, '#A93A2A');
  for (const d of [-1, 1]) {
    pen.blob([{ x: gx + d * 56 * s - 6 * s, y: gy - 150 * s }, { x: gx + d * 56 * s + 6 * s, y: gy - 150 * s }, { x: gx + d * 57 * s + 8 * s, y: gy }, { x: gx + d * 57 * s - 8 * s, y: gy }], red, ink);
    pen.blob([{ x: gx + d * 57 * s - 10 * s, y: gy - 12 * s }, { x: gx + d * 57 * s + 10 * s, y: gy - 12 * s }, { x: gx + d * 57 * s + 10 * s, y: gy + 2 * s }, { x: gx + d * 57 * s - 10 * s, y: gy + 2 * s }], '#3B3A4A', { width: 1.5 });
  }
  pen.blob([{ x: gx - 72 * s, y: gy - 124 * s }, { x: gx + 72 * s, y: gy - 124 * s }, { x: gx + 72 * s, y: gy - 113 * s }, { x: gx - 72 * s, y: gy - 113 * s }], red, ink);
  pen.blob([{ x: gx - 86 * s, y: gy - 158 * s }, { x: gx, y: gy - 151 * s }, { x: gx + 86 * s, y: gy - 158 * s }, { x: gx + 80 * s, y: gy - 145 * s }, { x: gx - 80 * s, y: gy - 145 * s }], red, ink);
  pen.blob([{ x: gx - 94 * s, y: gy - 171 * s }, { x: gx, y: gy - 161 * s }, { x: gx + 94 * s, y: gy - 171 * s }, { x: gx + 88 * s, y: gy - 158 * s }, { x: gx - 88 * s, y: gy - 158 * s }], mix('#3B3A4A', k.tint, 0.1), { width: 2 });
  pen.blob([{ x: gx - 6 * s, y: gy - 146 * s }, { x: gx + 6 * s, y: gy - 146 * s }, { x: gx + 6 * s, y: gy - 124 * s }, { x: gx - 6 * s, y: gy - 124 * s }], red, { width: 1.5 });
}

/** Foreground grass and a few pampas plumes along the bottom edge. @param {CanvasRenderingContext2D} ctx @param {Geo} g @param {number} t @param {number} light @param {boolean} rm */
function drawLiveFront(ctx, g, t, light, rm) {
  const m = rm ? 0.15 : 1;
  const k = tones(Math.round(light * 4) / 4);
  ctx.save();
  ctx.lineCap = 'round';
  const cols = [mix(k.grassDark, '#2F5434', 0.35), mix(k.grass, k.grassDark, 0.3), mix(k.grassLight, k.grass, 0.4)];
  /** @type {Pt[]} */
  const plumes = [];
  for (let c = 0; c < 3; c++) {
    ctx.strokeStyle = cols[c];
    ctx.lineWidth = 4 - c;
    ctx.beginPath();
    for (let i = c; i < g.front.length; i += 3) {
      const f = g.front[i];
      const sway = Math.sin(t * 1.2 * m + f.p + f.x * 0.004) * f.h * 0.1 * m + Math.sin(t * 2.9 * m + f.p) * 2 * m;
      const tipX = f.x + f.lean * f.h + sway;
      const tipY = H - f.h;
      ctx.moveTo(f.x, H + 6);
      ctx.quadraticCurveTo(f.x + f.lean * f.h * 0.25, H - f.h * 0.55, tipX, tipY);
      if (f.kind === 1) plumes.push({ x: tipX, y: tipY });
    }
    ctx.stroke();
  }
  for (const p of plumes) {
    const gr = ctx.createLinearGradient(p.x, p.y - 30, p.x, p.y + 10);
    gr.addColorStop(0, rgba(mix('#F6E8C8', k.tint, 0.3), 0.95));
    gr.addColorStop(1, rgba('#D9C29A', 0.6));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.ellipse(p.x + 4, p.y - 14, 7, 22, 0.25, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- layouts

/** @type {Layout[]} */
const LAYOUTS = [
  {
    id: '1-1',
    name: 'Morning Zoomies Meadow',
    paths: [
      [
        { x: -140, y: 540 }, { x: 160, y: 540 }, { x: 420, y: 470 }, { x: 700, y: 480 }, { x: 930, y: 640 },
        { x: 1140, y: 800 }, { x: 1400, y: 810 }, { x: 1580, y: 690 }, { x: 1720, y: 620 },
      ],
    ],
    spots: [
      { x: 250, y: 720 }, { x: 560, y: 650 }, { x: 600, y: 330 }, { x: 1050, y: 590 },
      { x: 1270, y: 650 }, { x: 1250, y: 970 }, { x: 1520, y: 510 }, { x: 860, y: 830 },
    ],
    stash: { x: 1720, y: 620 },
  },
  {
    id: '1-2',
    name: "Grandpa's Cucumber Patch",
    paths: [
      [
        { x: -140, y: 590 }, { x: 160, y: 590 }, { x: 380, y: 545 }, { x: 600, y: 410 }, { x: 960, y: 340 },
        { x: 1320, y: 410 }, { x: 1530, y: 525 }, { x: 1670, y: 588 }, { x: 1750, y: 590 },
      ],
      [
        { x: -140, y: 590 }, { x: 160, y: 590 }, { x: 380, y: 635 }, { x: 600, y: 770 }, { x: 960, y: 840 },
        { x: 1320, y: 770 }, { x: 1530, y: 655 }, { x: 1670, y: 592 }, { x: 1750, y: 590 },
      ],
    ],
    spots: [
      { x: 740, y: 590 }, { x: 960, y: 600 }, { x: 1180, y: 590 }, { x: 300, y: 420 }, { x: 300, y: 740 },
      { x: 960, y: 990 }, { x: 1640, y: 410 }, { x: 1735, y: 800 }, { x: 1470, y: 300 }, { x: 1440, y: 890 },
    ],
    stash: { x: 1750, y: 590 },
  },
  {
    id: '1-3',
    name: 'Shrine Steps at Sunset',
    paths: [
      [
        { x: -140, y: 720 }, { x: 140, y: 720 }, { x: 400, y: 690 }, { x: 660, y: 760 }, { x: 900, y: 780 },
        { x: 1120, y: 690 }, { x: 1350, y: 620 }, { x: 1520, y: 660 }, { x: 1640, y: 700 },
      ],
      [
        { x: 1060, y: -140 }, { x: 1050, y: 100 }, { x: 990, y: 300 }, { x: 1000, y: 460 },
        { x: 1080, y: 590 }, { x: 1200, y: 640 }, { x: 1350, y: 620 }, { x: 1520, y: 660 }, { x: 1640, y: 700 },
      ],
    ],
    spots: [
      { x: 560, y: 560 }, { x: 560, y: 900 }, { x: 860, y: 620 }, { x: 780, y: 420 }, { x: 1180, y: 440 },
      { x: 850, y: 250 }, { x: 1220, y: 270 }, { x: 1290, y: 810 }, { x: 1370, y: 450 }, { x: 1500, y: 860 },
      { x: 1040, y: 920 }, { x: 200, y: 560 },
    ],
    stash: { x: 1640, y: 700 },
  },
];

/**
 * Per-layout scenery placement. Paddy grids are culled automatically wherever a cell
 * would touch a path, a nap spot or the stash, so fields always frame the routes.
 * @typedef {{x0:number, y0:number, cols:number, rows:number, cw:number, ch:number, skew:number}} Grid
 * @typedef {{
 *   tree?: {x:number, y:number, s:number},
 *   shrine?: {x:number, y:number, s:number, torii?: number}, // torii = gate x offset
 *   scarecrow?: {x:number, y:number, s:number},
 *   garden?: {cx:number, cy:number, rx:number, ry:number},
 *   river?: {pts:Pt[], w:number},
 *   forest?: {x0:number, x1:number, y:number},
 *   stairs?: {path:number, toY:number},
 *   bridge?: {path:number},
 *   farm?: {x:number, y:number},
 *   poles?: number[],
 *   bushes: {x:number, y:number, s:number}[],
 *   paddies: Grid[],
 *   flies: Pt[],
 * }} Scene
 */
/** @type {Record<string, Scene>} */
const SCENES = {
  '1-1': {
    tree: { x: 175, y: 345, s: 1 },
    shrine: { x: 1600, y: 380, s: 0.8, torii: -190 },
    farm: { x: 1150, y: 282 },
    poles: [1700, 1790, 1880],
    bushes: [{ x: 60, y: 1040, s: 1.1 }, { x: 1870, y: 1050, s: 1 }, { x: 1880, y: 820, s: 0.8 }],
    paddies: [
      { x0: 20, y0: 790, cols: 4, rows: 3, cw: 210, ch: 100, skew: 14 },
      { x0: 760, y0: 318, cols: 5, rows: 2, cw: 200, ch: 96, skew: -10 },
      { x0: 1330, y0: 900, cols: 3, rows: 2, cw: 200, ch: 96, skew: 10 },
    ],
    flies: [{ x: 420, y: 880 }, { x: 1100, y: 380 }, { x: 1550, y: 980 }, { x: 330, y: 620 }],
  },
  '1-2': {
    tree: { x: 120, y: 330, s: 0.95 },
    shrine: { x: 1820, y: 330, s: 0.55, torii: -190 },
    scarecrow: { x: 1585, y: 868, s: 0.9 },
    garden: { cx: 960, cy: 592, rx: 340, ry: 158 },
    farm: { x: 640, y: 280 },
    poles: [1180, 1300, 1420],
    bushes: [{ x: 40, y: 1030, s: 1.15 }, { x: 1880, y: 1040, s: 1.05 }],
    paddies: [
      { x0: 20, y0: 820, cols: 3, rows: 3, cw: 200, ch: 96, skew: 12 },
      { x0: 1180, y0: 860, cols: 4, rows: 3, cw: 190, ch: 92, skew: -12 },
      { x0: 1560, y0: 312, cols: 2, rows: 1, cw: 170, ch: 80, skew: 0 },
    ],
    flies: [{ x: 280, y: 960 }, { x: 1500, y: 980 }, { x: 960, y: 590 }, { x: 760, y: 980 }],
  },
  '1-3': {
    tree: { x: 1835, y: 400, s: 1.05 },
    shrine: { x: 1740, y: 585, s: 1, torii: -170 },
    river: { pts: [{ x: 600, y: 262 }, { x: 520, y: 430 }, { x: 410, y: 620 }, { x: 320, y: 830 }, { x: 270, y: 1140 }], w: 150 },
    forest: { x0: 650, x1: 1480, y: 230 },
    stairs: { path: 1, toY: 300 },
    bridge: { path: 0 },
    poles: [],
    bushes: [{ x: 1890, y: 1040, s: 1.1 }, { x: 50, y: 1050, s: 0.9 }],
    paddies: [
      { x0: 470, y0: 860, cols: 6, rows: 2, cw: 200, ch: 100, skew: 10 },
      { x0: -10, y0: 840, cols: 1, rows: 3, cw: 230, ch: 96, skew: 0 },
      { x0: 1500, y0: 790, cols: 2, rows: 3, cw: 200, ch: 96, skew: -8 },
    ],
    flies: [{ x: 420, y: 520 }, { x: 900, y: 980 }, { x: 1300, y: 950 }, { x: 150, y: 900 }],
  },
};

// ---------------------------------------------------------------- the room

/** @param {RoomOpts} o */
const layoutOf = (o) => o.layout ?? LAYOUTS[0];

/** @type {RoomSpec} */
export const room = {
  id: 'countryside',
  name: 'Sunbeam Countryside',
  pathStyle: { fill: P.path, edge: '#C9AE7E', speck: 'rgba(140,104,62,0.2)', width: 92 },
  cushion: { base: '#F4B7C2', dark: '#DE8FA1' },
  drawBack(ctx, pen, t, o) {
    const L = layoutOf(o);
    const light = clamp(o.light ?? 0.2, 0, 1);
    const f = light * (NB - 1);
    const b0 = Math.floor(f);
    const b1 = Math.min(NB - 1, b0 + 1);
    const fr = f - b0;
    const g = geo(L);
    blit(ctx, skyLayer(b0), skyLayer(b1), fr, SKY_H);
    drawClouds(ctx, t, Math.round(f), o.reducedMotion);
    blit(ctx, landLayer(L, b0), fr > 0.02 ? landLayerSoon(L, b1) : null, fr, H);
    if (b1 !== b0) landLayerSoon(L, b1);
    drawLiveBack(ctx, g, t, light, Math.round(f), !!o.reducedMotion);
  },
  drawMid(ctx, pen, t, o) {
    drawLiveMid(ctx, pen, geo(layoutOf(o)), t, clamp(o.light ?? 0.2, 0, 1));
  },
  drawFront(ctx, pen, t, o) {
    drawLiveFront(ctx, geo(layoutOf(o)), t, clamp(o.light ?? 0.2, 0, 1), !!o.reducedMotion);
  },
  layouts: LAYOUTS,
};
