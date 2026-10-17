// @ts-check
// World 4 · Moonlit Sky Islands: floating mossy islands with dangling roots, a huge moon,
// blinking constellations, rope bridges, paper lanterns and a gentle cloud whale.
// Static scenery is painted once per layout into an offscreen layer; the whale, stars,
// lanterns, drifting clouds, shooting stars and swaying grass are drawn live on top.
import { Pen, ellipsePts } from '../brush.js';
import { WORLDS, INK } from '../palette.js';
import { catmullRom, Track } from '../../core/spline.js';
import { hash2, mulberry32 } from '../../core/rng.js';

/** @typedef {import('./common.js').RoomSpec} RoomSpec */
/** @typedef {import('./common.js').Layout} Layout */
/** @typedef {{x:number, y:number}} Pt */
/** @typedef {{x:number, y:number, rx:number, ry:number}} Oval */
/** @typedef {CanvasRenderingContext2D} Ctx */
/**
 * Live (animated) bits collected while painting the static layer.
 * @typedef {Object} Fx
 * @property {{x:number,y:number,r:number,a:number,s:number}[]} glows lantern light under the path
 * @property {{x:number,y:number,r:number,a:number,s:number}[]} midGlows bridge lanterns above the path
 * @property {{x:number,y:number,s:number,b:number}[]} stars twinkling stars (sky only)
 * @property {{x:number,y:number,s:number}[]} grass pampas plumes that sway
 * @property {{x:number,y:number,s:number}[]} motes drifting sparkles
 */

const W = 1920;
const H = 1080;
const P = WORLDS.sky;
const C = {
  skyTop: '#151840',
  skyLow: '#5A55A0',
  grass: '#4F8C78',
  grassLight: '#86BFA0',
  grassDark: '#2F5D55',
  earth: '#5B4C7A',
  earthDark: '#2E2752',
  root: '#7A6A8E',
  tile: '#3B3F78',
  tileLight: '#8F95D0',
  tileDark: '#22254E',
  wood: '#6B4E4A',
  woodDark: '#3B2A2E',
  paper: '#FFE7B8',
  plank: '#9B7657',
  rope: '#E2CC9C',
};

// ---------------------------------------------------------------- geometry

/** Evenly spaced control points along a polyline. @param {Pt[]} poly @param {number} step */
function resample(poly, step) {
  const cum = [0];
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y));
  const L = cum[cum.length - 1];
  const n = Math.max(2, Math.round(L / step));
  /** @type {Pt[]} */
  const out = [];
  let j = 1;
  for (let k = 0; k <= n; k++) {
    const d = (L * k) / n;
    while (j < poly.length - 1 && cum[j] < d) j++;
    const s = cum[j] - cum[j - 1] || 1;
    const u = Math.min(1, Math.max(0, (d - cum[j - 1]) / s));
    out.push({ x: Math.round(poly[j - 1].x + (poly[j].x - poly[j - 1].x) * u), y: Math.round(poly[j - 1].y + (poly[j].y - poly[j - 1].y) * u) });
  }
  return out;
}
/** @param {Pt[]} ctrl */
const curve = (ctrl, step = 70) => resample(catmullRom(ctrl, 14), step);

/** Spiral that winds clockwise into the crater (rings stay ≥ 200px apart, curvature stays gentle). */
function spiral() {
  /** @type {Pt[]} */
  const pts = [{ x: 1800, y: -90 }, { x: 1800, y: 300 }];
  const turns = 1.3;
  for (let i = 0; i <= 400; i++) {
    const u = (i / 400) * turns;
    const a = u * Math.PI * 2;
    pts.push({ x: 960 + Math.cos(a) * (840 - 500 * u), y: 560 + Math.sin(a) * (470 - 230 * u) });
  }
  return resample(pts, 70);
}
const SPIRAL = spiral();

/** @param {Pt} p @param {Oval} o */
const inOval = (p, o) => ((p.x - o.x) / o.rx) ** 2 + ((p.y - o.y) / o.ry) ** 2 <= 1;

// ---------------------------------------------------------------- layouts

/** @type {Layout} */
const L41 = {
  id: '4-1',
  name: 'Cloud Whale Crossing',
  paths: [curve([{ x: -90, y: 260 }, { x: 150, y: 265 }, { x: 330, y: 300 }, { x: 470, y: 400 }, { x: 580, y: 510 }, { x: 720, y: 575 }, { x: 900, y: 600 }, { x: 1120, y: 592 }, { x: 1330, y: 555 }, { x: 1500, y: 520 }, { x: 1660, y: 540 }, { x: 1770, y: 640 }, { x: 1765, y: 780 }, { x: 1640, y: 870 }, { x: 1420, y: 890 }])],
  spots: [
    { x: 260, y: 410 }, { x: 520, y: 290 }, { x: 680, y: 430 }, { x: 900, y: 460 },
    { x: 1150, y: 450 }, { x: 1540, y: 670 }, { x: 1340, y: 700 }, { x: 1100, y: 730 },
    { x: 820, y: 740 }, { x: 420, y: 560 }, { x: 1800, y: 380 }, { x: 1640, y: 990 },
  ],
  stash: { x: 1420, y: 890 },
  flyPaths: [
    [{ x: -100, y: 120 }, { x: 500, y: 160 }, { x: 1000, y: 330 }, { x: 1300, y: 700 }, { x: 1420, y: 890 }],
    [{ x: 1100, y: -100 }, { x: 1250, y: 300 }, { x: 1380, y: 650 }, { x: 1420, y: 890 }],
  ],
};

/** @type {Layout} */
const L42 = {
  id: '4-2',
  name: 'Rooftop Moon Garden',
  paths: [curve([{ x: -90, y: 800 }, { x: 250, y: 785 }, { x: 470, y: 730 }, { x: 640, y: 620 }, { x: 740, y: 460 }, { x: 800, y: 320 }, { x: 920, y: 250 }, { x: 1060, y: 260 }, { x: 1160, y: 360 }, { x: 1200, y: 520 }, { x: 1270, y: 680 }, { x: 1420, y: 790 }, { x: 1600, y: 820 }, { x: 1740, y: 740 }])],
  spots: [
    { x: 980, y: 490 }, { x: 1480, y: 670 }, { x: 520, y: 570 }, { x: 1340, y: 530 },
    { x: 340, y: 650 }, { x: 640, y: 390 }, { x: 340, y: 890 }, { x: 720, y: 720 },
    { x: 1140, y: 700 }, { x: 1320, y: 880 }, { x: 1280, y: 330 }, { x: 820, y: 160 },
  ],
  stash: { x: 1740, y: 740 },
  flyPaths: [
    [{ x: -100, y: 140 }, { x: 500, y: 260 }, { x: 1100, y: 560 }, { x: 1740, y: 740 }],
    [{ x: 1250, y: -100 }, { x: 1450, y: 350 }, { x: 1740, y: 740 }],
    [{ x: 2020, y: 260 }, { x: 1860, y: 520 }, { x: 1740, y: 740 }],
  ],
};

/** @type {Layout} */
const L43 = {
  id: '4-3',
  name: 'Eclipse of the Empty Bowl',
  paths: [SPIRAL],
  spots: [
    { x: 1060, y: 510 }, { x: 1120, y: 850 }, { x: 1300, y: 770 }, { x: 500, y: 610 },
    { x: 1480, y: 690 }, { x: 740, y: 810 }, { x: 1660, y: 590 }, { x: 620, y: 450 },
    { x: 820, y: 390 }, { x: 1680, y: 330 }, { x: 1000, y: 150 }, { x: 540, y: 990 },
  ],
  stash: SPIRAL[SPIRAL.length - 1],
  flyPaths: [
    [{ x: -100, y: 420 }, { x: 400, y: 520 }, { x: 900, y: 723 }],
    [{ x: 2020, y: 1000 }, { x: 1400, y: 900 }, { x: 900, y: 723 }],
  ],
};

/** Per-layout scenery anchors. */
const SCN = {
  '4-1': {
    moon: { x: 1560, y: 190, r: 125 },
    land: [{ x: 230, y: 380, rx: 300, ry: 130 }, { x: 1060, y: 660, rx: 600, ry: 190 }, { x: 1640, y: 880, rx: 280, ry: 100 }],
    whale: { x: 1060, y: 660, rx: 600, ry: 190 },
    cons: [[[760, 90], [830, 140], [910, 120], [980, 170], [1060, 130], [1120, 190]], [[1760, 90], [1820, 150], [1880, 120], [1830, 230]], [[290, 70], [360, 130], [440, 100], [480, 170]]],
  },
  '4-2': {
    moon: { x: 330, y: 270, r: 175 },
    land: [{ x: 250, y: 820, rx: 330, ry: 135 }, { x: 960, y: 420, rx: 330, ry: 200 }, { x: 1580, y: 800, rx: 320, ry: 125 }],
    whale: null,
    cons: [[[1090, 70], [1160, 120], [1240, 90], [1310, 150], [1380, 110]], [[560, 60], [620, 120], [700, 90], [660, 180]], [[1700, 560], [1780, 600], [1860, 570]]],
  },
  '4-3': {
    moon: { x: 190, y: 150, r: 105 },
    land: [{ x: 960, y: 560, rx: 900, ry: 470 }],
    whale: null,
    cons: [[[1400, 60], [1480, 110], [1560, 80], [1640, 140], [1700, 90]], [[60, 900], [130, 960], [210, 930], [270, 1010]], [[1700, 980], [1780, 940], [1860, 1000]]],
  },
};

// ---------------------------------------------------------------- canvas utils

/** @param {number} w @param {number} h @returns {any} */
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
/** @param {any} c @returns {Ctx} */
const ctxOf = (c) => c.getContext('2d');

/** @type {{glow:any, star:any, cloud:any, sparkStar:any, sparkWhite:any} | null} */
let sprites = null;
function getSprites() {
  if (sprites) return sprites;
  /** @param {[number,string][]} stops */
  const radial = (stops) => {
    const c = makeCanvas(128, 128);
    const g = ctxOf(c);
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return c;
  };
  const cloud = makeCanvas(320, 140);
  const cg = ctxOf(cloud);
  for (const [x, y, r] of [[70, 90, 46], [130, 70, 58], [200, 78, 50], [255, 95, 38], [160, 100, 50]]) {
    const gr = cg.createRadialGradient(x, y - r * 0.4, 2, x, y, r);
    gr.addColorStop(0, 'rgba(240,238,255,0.9)');
    gr.addColorStop(0.7, 'rgba(201,211,232,0.55)');
    gr.addColorStop(1, 'rgba(201,211,232,0)');
    cg.fillStyle = gr;
    cg.beginPath();
    cg.arc(x, y, r, 0, Math.PI * 2);
    cg.fill();
  }
  sprites = {
    glow: radial([[0, 'rgba(255,232,170,0.95)'], [0.25, 'rgba(255,214,140,0.45)'], [0.6, 'rgba(242,170,110,0.12)'], [1, 'rgba(242,170,110,0)']]),
    star: radial([[0, 'rgba(255,250,225,1)'], [0.18, 'rgba(255,229,138,0.7)'], [0.5, 'rgba(255,229,138,0.12)'], [1, 'rgba(255,229,138,0)']]),
    cloud,
    sparkStar: sparkSprite(P.star),
    sparkWhite: sparkSprite('#FFFBEA'),
  };
  return sprites;
}

/** @param {string} col */
function sparkSprite(col) {
  const c = makeCanvas(64, 64);
  sparkle(ctxOf(c), 32, 32, 31, col);
  return c;
}

/** Cached four-point star. @param {Ctx} ctx @param {number} x @param {number} y @param {number} r @param {boolean} white */
function spark(ctx, x, y, r, white) {
  const sp = getSprites();
  ctx.drawImage(white ? sp.sparkWhite : sp.sparkStar, x - r, y - r, r * 2, r * 2);
}

/** Wobbly-ink straight-edged polygon. @param {Ctx} g @param {Pen} pen @param {Pt[]} pts @param {string|CanvasGradient|null} fill @param {number} [lw] */
function inkPoly(g, pen, pts, fill, lw = 3) {
  const w = pen.wob(pts, 0.8);
  g.beginPath();
  g.moveTo(w[0].x, w[0].y);
  for (let i = 1; i < w.length; i++) g.lineTo(w[i].x, w[i].y);
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (lw > 0) {
    g.lineJoin = 'round';
    g.lineWidth = lw;
    g.strokeStyle = INK;
    g.stroke();
  }
}

/** Four-point twinkle star. @param {Ctx} g @param {number} x @param {number} y @param {number} r @param {string} col */
function sparkle(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  g.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  g.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  g.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  g.fill();
}

// ---------------------------------------------------------------- static painters

/** Night sky: indigo wash, nebula clouds, a sea of clouds far below. @param {Ctx} g @param {() => number} rnd */
function paintSky(g, rnd) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, C.skyTop);
  gr.addColorStop(0.45, P.indigo);
  gr.addColorStop(0.8, '#3E3B82');
  gr.addColorStop(1, C.skyLow);
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  // watercolor nebula washes
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W;
    const y = rnd() * H * 0.8;
    const r = 200 + rnd() * 320;
    const col = ['140,132,201', '201,155,214', '110,170,200', '255,229,138'][Math.floor(rnd() * 4)];
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${col},${0.08 + rnd() * 0.08})`);
    rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // static star dust
  for (let i = 0; i < 420; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const a = 0.2 + rnd() * 0.6;
    g.fillStyle = `rgba(255,248,220,${a.toFixed(2)})`;
    g.fillRect(x, y, rnd() < 0.85 ? 1.6 : 2.6, rnd() < 0.85 ? 1.6 : 2.6);
  }
  // distant sea of clouds along the bottom, soft and moonlit on top
  for (let layer = 0; layer < 3; layer++) {
    const base = H - 150 + layer * 55;
    for (let x = -60; x < W + 80; x += 50 + rnd() * 60) {
      const r = 46 + rnd() * 64 - layer * 8;
      const y = base + rnd() * 34;
      const cg = g.createRadialGradient(x - r * 0.25, y - r * 0.55, 2, x, y, r);
      const lit = ['214,220,242', '196,200,236', '226,230,246'][layer];
      const body = ['104,98,170', '122,116,186', '140,132,201'][layer];
      cg.addColorStop(0, `rgba(${lit},0.95)`);
      cg.addColorStop(0.55, `rgba(${body},0.92)`);
      cg.addColorStop(0.92, `rgba(${body},0.85)`);
      cg.addColorStop(1, `rgba(${body},0)`);
      g.fillStyle = cg;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  const mist = g.createLinearGradient(0, H - 240, 0, H - 120);
  mist.addColorStop(0, 'rgba(140,132,201,0)');
  mist.addColorStop(1, 'rgba(140,132,201,0.3)');
  g.fillStyle = mist;
  g.fillRect(0, H - 240, W, 240);
}

/** Huge moon with a soft halo (or an eclipse with a golden ring). @param {Ctx} g @param {number} x @param {number} y @param {number} r @param {boolean} eclipse */
function paintMoon(g, x, y, r, eclipse) {
  const halo = g.createRadialGradient(x, y, r * 0.8, x, y, r * 3.2);
  halo.addColorStop(0, eclipse ? 'rgba(255,214,140,0.45)' : 'rgba(255,244,207,0.4)');
  halo.addColorStop(0.35, eclipse ? 'rgba(242,158,120,0.14)' : 'rgba(201,211,232,0.14)');
  halo.addColorStop(1, 'rgba(201,211,232,0)');
  g.fillStyle = halo;
  g.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
  if (eclipse) {
    g.strokeStyle = 'rgba(255,240,190,0.95)';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(x, y, r + 2, 0, Math.PI * 2);
    g.stroke();
    const disk = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 4, x, y, r);
    disk.addColorStop(0, '#2C2C5C');
    disk.addColorStop(1, '#141433');
    g.fillStyle = disk;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    sparkle(g, x + r * 0.72, y - r * 0.72, 26, 'rgba(255,250,225,0.95)');
    return;
  }
  const disk = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  disk.addColorStop(0, '#FFFCEB');
  disk.addColorStop(0.6, P.moon);
  disk.addColorStop(1, '#E9D9A8');
  g.fillStyle = disk;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.clip();
  for (const [dx, dy, cr] of [[-0.35, -0.1, 0.22], [0.2, 0.3, 0.16], [0.35, -0.35, 0.11], [-0.1, 0.45, 0.09], [0.5, 0.1, 0.07]]) {
    g.fillStyle = 'rgba(214,196,150,0.35)';
    g.beginPath();
    g.ellipse(x + dx * r, y + dy * r, cr * r, cr * r * 0.85, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.strokeStyle = 'rgba(214,190,140,0.6)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
}

/**
 * Floating island: rocky underside with dangling roots, grassy top with a moonlit rim.
 * @param {Ctx} g @param {Pen} pen @param {() => number} rnd @param {Oval} o @param {{depth?:number, top?:boolean}} [opt]
 */
function paintIsland(g, pen, rnd, o, opt = {}) {
  const depth = opt.depth ?? Math.min(o.ry * 1.5, 190);
  // underside
  /** @type {Pt[]} */
  const under = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI;
    under.push({ x: o.x + Math.cos(a) * o.rx, y: o.y + Math.sin(a) * o.ry });
  }
  const tip = [
    { x: o.x - o.rx * 0.78, y: o.y + o.ry * 0.5 + depth * 0.35 },
    { x: o.x - o.rx * 0.4, y: o.y + o.ry * 0.7 + depth * 0.75 },
    { x: o.x + o.rx * 0.05, y: o.y + o.ry + depth },
    { x: o.x + o.rx * 0.45, y: o.y + o.ry * 0.7 + depth * 0.7 },
    { x: o.x + o.rx * 0.8, y: o.y + o.ry * 0.5 + depth * 0.3 },
  ];
  const poly = [...under, ...tip];
  const eg = g.createLinearGradient(0, o.y, 0, o.y + o.ry + depth);
  eg.addColorStop(0, C.earth);
  eg.addColorStop(1, C.earthDark);
  pen.blob(poly, eg, { width: 3 });
  // strata + moon rim light on the left
  g.save();
  g.beginPath();
  g.moveTo(poly[0].x, poly[0].y);
  for (const p of poly) g.lineTo(p.x, p.y);
  g.closePath();
  g.clip();
  g.strokeStyle = 'rgba(20,14,40,0.3)';
  g.lineWidth = 2;
  for (let k = 1; k < 5; k++) {
    g.beginPath();
    const yy = o.y + o.ry * 0.6 + k * depth * 0.18;
    g.moveTo(o.x - o.rx, yy);
    for (let x = o.x - o.rx; x <= o.x + o.rx; x += 30) g.lineTo(x, yy + Math.sin(x * 0.05 + k) * 5);
    g.stroke();
  }
  g.fillStyle = 'rgba(201,211,232,0.12)';
  g.fillRect(o.x - o.rx, o.y, o.rx * 0.5, o.ry + depth);
  g.restore();
  // dangling roots
  g.lineCap = 'round';
  for (let i = 0; i < Math.round(o.rx / 30); i++) {
    const u = rnd();
    const p = { x: o.x + (u - 0.5) * o.rx * 1.3, y: 0 };
    const k = (p.x - o.x) / o.rx;
    p.y = o.y + o.ry * 0.6 + depth * (1 - Math.abs(k) * 1.1) * 0.85;
    const len = 30 + rnd() * 70;
    g.strokeStyle = C.root;
    g.lineWidth = 2 + rnd() * 2;
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.bezierCurveTo(p.x + 8, p.y + len * 0.3, p.x - 10, p.y + len * 0.6, p.x + (rnd() - 0.5) * 16, p.y + len);
    g.stroke();
  }
  if (opt.top === false) return;
  // grassy top
  const tg = g.createRadialGradient(o.x - o.rx * 0.3, o.y - o.ry * 0.4, 4, o.x, o.y, Math.max(o.rx, o.ry));
  tg.addColorStop(0, C.grassLight);
  tg.addColorStop(0.55, C.grass);
  tg.addColorStop(1, C.grassDark);
  pen.blob(ellipsePts(o.x, o.y, o.rx, o.ry, 30, (a) => 1 + 0.03 * Math.sin(a * 7)), tg, { width: 3 });
  // grass fringe along the front rim
  g.strokeStyle = C.grassDark;
  g.lineWidth = 2;
  for (let a = 0.15; a < Math.PI - 0.15; a += 0.09) {
    const x = o.x + Math.cos(a) * o.rx;
    const y = o.y + Math.sin(a) * o.ry;
    g.beginPath();
    g.moveTo(x - 4, y - 3);
    g.lineTo(x, y + 7);
    g.lineTo(x + 4, y - 3);
    g.stroke();
  }
  // tufts and tiny flowers
  for (let i = 0; i < (o.rx * o.ry) / 2600; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 0.88;
    const x = o.x + Math.cos(a) * o.rx * r;
    const y = o.y + Math.sin(a) * o.ry * r;
    if (rnd() < 0.6) {
      g.strokeStyle = 'rgba(40,80,70,0.6)';
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x - 5, y);
      g.lineTo(x - 2, y - 8);
      g.moveTo(x, y);
      g.lineTo(x + 1, y - 10);
      g.moveTo(x + 5, y);
      g.lineTo(x + 3, y - 7);
      g.stroke();
    } else {
      g.fillStyle = ['#FFF4CF', '#C9B8F0', '#F4B7C2', '#FFE58A'][Math.floor(rnd() * 4)];
      g.beginPath();
      g.arc(x, y, 2.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  // moonlit rim
  g.strokeStyle = 'rgba(220,230,250,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(o.x, o.y, o.rx - 6, o.ry - 5, 0, Math.PI * 1.05, Math.PI * 1.7);
  g.stroke();
}

/** Small mossy islet under a nap spot. @param {Ctx} g @param {Pen} pen @param {() => number} rnd @param {number} x @param {number} y */
function paintPad(g, pen, rnd, x, y) {
  paintIsland(g, pen, rnd, { x, y: y + 6, rx: 88, ry: 30 }, { depth: 46 });
}

/** Paper lantern on a post. @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {number} x @param {number} y @param {number} s */
function paintLanternPost(g, pen, fx, x, y, s) {
  pen.line([{ x, y }, { x, y: y - 70 * s }], { color: C.woodDark, width: 4 * s });
  pen.line([{ x, y: y - 68 * s }, { x: x + 20 * s, y: y - 72 * s }], { color: C.woodDark, width: 3 * s });
  paperLantern(g, pen, fx, x + 20 * s, y - 52 * s, s, fx.glows);
}

/** @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {number} x @param {number} y @param {number} s @param {Fx['glows']} list */
function paperLantern(g, pen, fx, x, y, s, list) {
  g.strokeStyle = INK;
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(x, y - 20 * s);
  g.lineTo(x, y - 12 * s);
  g.stroke();
  const gr = g.createRadialGradient(x - 3 * s, y - 3 * s, 1, x, y, 14 * s);
  gr.addColorStop(0, '#FFFBEA');
  gr.addColorStop(0.5, C.paper);
  gr.addColorStop(1, '#F2B880');
  pen.blob(ellipsePts(x, y, 11 * s, 12 * s, 14), gr, { width: 2 });
  g.fillStyle = INK;
  g.fillRect(x - 5 * s, y - 14 * s, 10 * s, 3 * s);
  g.fillRect(x - 5 * s, y + 11 * s, 10 * s, 3 * s);
  g.strokeStyle = 'rgba(200,120,80,0.45)';
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y - 11 * s);
  g.lineTo(x, y + 11 * s);
  g.stroke();
  list.push({ x, y, r: 80 * s, a: 0.85, s: x * 0.013 + y * 0.01 });
}

/** Lanterns strung on a sagging rope. @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {Pt} a @param {Pt} b @param {number} n */
function paintLanternString(g, pen, fx, a, b, n) {
  const sag = Math.hypot(b.x - a.x, b.y - a.y) * 0.12;
  const at = (/** @type {number} */ u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * sag });
  /** @type {Pt[]} */
  const rope = [];
  for (let i = 0; i <= 16; i++) rope.push(at(i / 16));
  pen.line(rope, { color: C.rope, width: 2 });
  for (let i = 1; i <= n; i++) {
    const p = at(i / (n + 1));
    paperLantern(g, pen, fx, p.x, p.y + 16, 0.75, fx.glows);
  }
}

/**
 * Tiled hip roof (indigo tiles, silver moon sheen) with a strip of lit wall beneath.
 * @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {number} x0 @param {number} x1 @param {number} yTop @param {number} yEave @param {number} wallH
 */
function paintRoofHouse(g, pen, fx, x0, x1, yTop, yEave, wallH) {
  const w = x1 - x0;
  // wall with lit windows
  if (wallH > 0) {
    inkPoly(g, pen, [{ x: x0 + 8, y: yEave - 4 }, { x: x1 - 8, y: yEave - 4 }, { x: x1 - 8, y: yEave + wallH }, { x: x0 + 8, y: yEave + wallH }], C.wood, 3);
    for (let x = x0 + 26; x < x1 - 50; x += 64) {
      g.fillStyle = C.woodDark;
      g.fillRect(x - 3, yEave + wallH * 0.25 - 3, 38, wallH * 0.5 + 6);
      g.fillStyle = C.paper;
      g.fillRect(x, yEave + wallH * 0.25, 32, wallH * 0.5);
      g.strokeStyle = 'rgba(122,82,56,0.7)';
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x + 16, yEave + wallH * 0.25);
      g.lineTo(x + 16, yEave + wallH * 0.75);
      g.moveTo(x, yEave + wallH * 0.5);
      g.lineTo(x + 32, yEave + wallH * 0.5);
      g.stroke();
      fx.glows.push({ x: x + 16, y: yEave + wallH * 0.5, r: 50, a: 0.35, s: x * 0.02 });
    }
  }
  const ov = 14;
  const inset = Math.min(w * 0.22, 70);
  const ridgeY = yTop + 8;
  const pts = [
    { x: x0 + inset, y: ridgeY }, { x: x1 - inset, y: ridgeY },
    { x: x1 + ov + 8, y: yEave - 12 }, { x: x1 + ov - 8, y: yEave },
    { x: x0 - ov + 8, y: yEave }, { x: x0 - ov - 8, y: yEave - 12 },
  ];
  const gr = g.createLinearGradient(x0, ridgeY, x1, yEave);
  gr.addColorStop(0, C.tileLight);
  gr.addColorStop(0.3, C.tile);
  gr.addColorStop(1, C.tileDark);
  g.save();
  inkPoly(g, pen, pts, gr, 0);
  g.clip();
  const n = Math.max(4, Math.round((w + ov * 2) / 14));
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const xb = x0 - ov + (w + ov * 2) * u;
    const xt = x0 + inset + (w - inset * 2) * u;
    g.strokeStyle = 'rgba(14,14,40,0.4)';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(xt, ridgeY);
    g.lineTo(xb, yEave);
    g.stroke();
    g.strokeStyle = 'rgba(220,226,255,0.14)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(xt + 3, ridgeY);
    g.lineTo(xb + 4, yEave);
    g.stroke();
  }
  g.restore();
  inkPoly(g, pen, pts, null, 3);
  for (let x = x0 - ov + 10; x < x1 + ov - 6; x += 14) {
    g.fillStyle = C.tileDark;
    g.beginPath();
    g.arc(x, yEave - 2, 4.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(220,226,255,0.35)';
    g.beginPath();
    g.arc(x - 1, yEave - 3.5, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  pen.tube([{ x: x0 + inset - 4, y: ridgeY }, { x: x1 - inset + 4, y: ridgeY }], 9, C.tileDark);
  for (const ex of [x0 + inset - 8, x1 - inset + 8]) pen.blob(ellipsePts(ex, ridgeY - 4, 9, 11, 10), C.tileDark, { width: 2 });
}

/** Moon-viewing offering: a stand of dumplings. @param {Ctx} g @param {Pen} pen @param {number} x @param {number} y */
function paintDango(g, pen, x, y) {
  g.fillStyle = 'rgba(20,16,50,0.35)';
  g.beginPath();
  g.ellipse(x, y + 4, 42, 12, 0, 0, Math.PI * 2);
  g.fill();
  inkPoly(g, pen, [{ x: x - 30, y: y - 18 }, { x: x + 30, y: y - 18 }, { x: x + 24, y: y + 2 }, { x: x - 24, y: y + 2 }], '#C99A6A', 2.5);
  inkPoly(g, pen, [{ x: x - 38, y: y - 26 }, { x: x + 38, y: y - 26 }, { x: x + 34, y: y - 18 }, { x: x - 34, y: y - 18 }], '#E0B884', 2.5);
  g.fillStyle = '#FBF5E9';
  g.fillRect(x - 32, y - 30, 64, 4);
  const rows = [4, 3, 2, 1];
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) {
      const dx = (i - (n - 1) / 2) * 16;
      const dy = -40 - r * 13;
      const gr = g.createRadialGradient(x + dx - 3, y + dy - 3, 1, x + dx, y + dy, 9);
      gr.addColorStop(0, '#FFFFFF');
      gr.addColorStop(1, '#E6E0CF');
      pen.blob(ellipsePts(x + dx, y + dy, 8.5, 8, 10), gr, { width: 1.8 });
    }
  });
}

/** Pampas grass in a vase (plumes are animated). @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {number} x @param {number} y */
function paintSusukiVase(g, pen, fx, x, y) {
  pen.blob(ellipsePts(x, y - 16, 15, 20, 14, (a) => 1 + 0.15 * Math.sin(a)), '#5E7FC0', { width: 2.2 });
  g.strokeStyle = '#FBF5E9';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, y - 16, 13, 4, 0, 0, Math.PI);
  g.stroke();
  fx.grass.push({ x, y: y - 34, s: 1 });
}

/** Giant old ceramic bowl lodged in the island (4-3). @param {Ctx} g @param {Pen} pen @param {() => number} rnd */
function paintBowl(g, pen, rnd) {
  const cx = 960;
  const cy = 560;
  // outer island earth below the rim, poking out at the bottom edge
  paintIsland(g, pen, rnd, { x: cx, y: cy + 40, rx: 930, ry: 480 }, { depth: 160 });
  // the bowl's outer belly peeking out below the front rim, with a paw-print band
  const og = g.createLinearGradient(0, cy + 300, 0, cy + 560);
  og.addColorStop(0, '#F3EAD6');
  og.addColorStop(1, '#B9B0D8');
  pen.blob(ellipsePts(cx, cy + 62, 905, 482, 48), og, { width: 3 });
  g.strokeStyle = '#5E7FC0';
  g.lineWidth = 10;
  g.beginPath();
  g.ellipse(cx, cy + 34, 900, 474, 0, 0.2, Math.PI - 0.2);
  g.stroke();
  for (const px of [-520, -260, 0, 260, 520]) {
    const x = cx + px;
    const y = cy + 474 * Math.sqrt(1 - (px / 900) ** 2) + 36;
    g.fillStyle = '#5E7FC0';
    g.beginPath();
    g.ellipse(x, y, 9, 7, 0, 0, Math.PI * 2);
    for (const [dx, dy] of [[-10, -9], [-3.5, -13], [3.5, -13], [10, -9]]) {
      g.moveTo(x + dx + 3.4, y + dy);
      g.ellipse(x + dx, y + dy, 3.4, 3.8, 0, 0, Math.PI * 2);
    }
    g.fill();
  }
  // glazed interior: deeper and darker toward the middle
  const ig = g.createRadialGradient(cx, cy + 40, 30, cx, cy, 880);
  ig.addColorStop(0, '#2A2B5E');
  ig.addColorStop(0.45, '#3D3E7C');
  ig.addColorStop(0.85, '#5F5FA0');
  ig.addColorStop(1, '#8C84C9');
  pen.blob(ellipsePts(cx, cy, 880, 455, 48), ig, { width: 3 });
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, 878, 453, 0, 0, Math.PI * 2);
  g.clip();
  // far inner wall catches the moonlight; the near rim casts a shadow inside
  const wl = g.createLinearGradient(0, cy - 455, 0, cy + 455);
  wl.addColorStop(0, 'rgba(214,220,242,0.32)');
  wl.addColorStop(0.35, 'rgba(214,220,242,0)');
  wl.addColorStop(0.8, 'rgba(10,10,34,0)');
  wl.addColorStop(1, 'rgba(10,10,34,0.4)');
  g.fillStyle = wl;
  g.fillRect(cx - 900, cy - 460, 1800, 920);
  for (let k = 1; k < 9; k++) {
    g.strokeStyle = `rgba(201,211,232,${0.05 + (k % 2) * 0.05})`;
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(cx, cy + k * 6, 880 - k * 95, 455 - k * 50, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // a golden pool of eclipse light at the bottom of the bowl
  const pool = g.createRadialGradient(cx, cy + 40, 0, cx, cy + 40, 260);
  pool.addColorStop(0, 'rgba(255,229,138,0.28)');
  pool.addColorStop(1, 'rgba(255,229,138,0)');
  g.fillStyle = pool;
  g.fillRect(cx - 300, cy - 260, 600, 600);
  // moss creeping down the glaze
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 0.55 + rnd() * 0.42;
    const x = cx + Math.cos(a) * 880 * r;
    const y = cy + Math.sin(a) * 455 * r;
    g.fillStyle = `rgba(79,140,120,${0.25 + rnd() * 0.3})`;
    g.beginPath();
    g.ellipse(x, y, 30 + rnd() * 40, 10 + rnd() * 12, rnd(), 0, Math.PI * 2);
    g.fill();
  }
  // a few sad leftover crumbs
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const r = rnd() * 0.85;
    const x = cx + Math.cos(a) * 880 * r;
    const y = cy + Math.sin(a) * 455 * r;
    pen.blob(ellipsePts(x, y, 6, 4.5, 6, (q) => 1 + 0.2 * Math.cos(q * 3)), '#B07A4E', { width: 1.5 });
  }
  g.restore();
  // ceramic rim with a blue band and little fish
  g.save();
  g.lineWidth = 34;
  g.strokeStyle = '#F3EAD6';
  g.beginPath();
  g.ellipse(cx, cy, 896, 466, 0, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 12;
  g.strokeStyle = '#5E7FC0';
  g.beginPath();
  g.ellipse(cx, cy, 896, 466, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const x = cx + Math.cos(a) * 896;
    const y = cy + Math.sin(a) * 466;
    g.save();
    g.translate(x, y);
    g.rotate(Math.atan2(Math.cos(a) * 466, -Math.sin(a) * 896));
    g.fillStyle = '#FBF5E9';
    g.beginPath();
    g.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
    g.moveTo(6, 0);
    g.lineTo(11, -3.5);
    g.lineTo(11, 3.5);
    g.fill();
    g.restore();
  }
  g.strokeStyle = INK;
  g.lineWidth = 3;
  for (const r of [-17, 17]) {
    g.beginPath();
    g.ellipse(cx, cy, 896 + r, 466 + r, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // grass overgrowing the rim
  g.strokeStyle = C.grass;
  g.lineWidth = 2.5;
  for (let i = 0; i < 160; i++) {
    const a = rnd() * Math.PI * 2;
    const x = cx + Math.cos(a) * (914 + rnd() * 6);
    const y = cy + Math.sin(a) * (484 + rnd() * 6);
    g.beginPath();
    g.moveTo(x - 4, y);
    g.lineTo(x - 1, y - 9);
    g.moveTo(x + 3, y);
    g.lineTo(x + 5, y - 8);
    g.stroke();
  }
}

// ---------------------------------------------------------------- mid layer (over the path)

/**
 * Moss carpet details on the path, and rope-plank bridges wherever it crosses open sky.
 * @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {Pt[]} control @param {(p:Pt)=>boolean} onLand @param {() => number} rnd
 */
function paintMossAndBridges(g, pen, fx, control, onLand, rnd) {
  const tr = new Track(control, 16);
  // moss tufts and tiny flowers along the edges, center kept clear
  for (let d = 10; d < tr.length; d += 22) {
    const p = tr.at(d);
    const l = Math.hypot(p.dx, p.dy) || 1;
    const nx = -p.dy / l;
    const ny = p.dx / l;
    for (const side of [-1, 1]) {
      const off = side * (30 + rnd() * 10);
      const x = p.x + nx * off;
      const y = p.y + ny * off;
      g.fillStyle = rnd() < 0.5 ? 'rgba(94,138,85,0.55)' : 'rgba(200,226,160,0.5)';
      g.beginPath();
      g.ellipse(x, y, 6 + rnd() * 5, 4 + rnd() * 3, rnd() * 3, 0, Math.PI * 2);
      g.fill();
      if (rnd() < 0.18) {
        g.fillStyle = ['#FFF4CF', '#F4B7C2', '#C9B8F0'][Math.floor(rnd() * 3)];
        g.beginPath();
        g.arc(x + (rnd() - 0.5) * 8, y + (rnd() - 0.5) * 6, 2.4, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // find stretches over open sky
  /** @type {[number, number][]} */
  const spans = [];
  let s0 = -1;
  for (let d = 0; d <= tr.length; d += 8) {
    const p = tr.at(d);
    const sky = !onLand(p) && p.x > -40 && p.x < W + 40 && p.y > -40 && p.y < H + 40;
    if (sky && s0 < 0) s0 = d;
    if ((!sky || d + 8 > tr.length) && s0 >= 0) {
      if (d - s0 > 40) spans.push([Math.max(0, s0 - 26), Math.min(tr.length, d + 26)]);
      s0 = -1;
    }
  }
  for (const [d0, d1] of spans) {
    /** @type {(Pt & {dx:number, dy:number})[]} */
    const pts = [];
    for (let d = d0; d <= d1; d += 4) pts.push(tr.at(d));
    // planks
    let k = 0;
    for (let i = 0; i < pts.length; i += 4, k++) {
      const p = pts[i];
      const l = Math.hypot(p.dx, p.dy) || 1;
      const ux = p.dx / l;
      const uy = p.dy / l;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(Math.atan2(uy, ux));
      g.fillStyle = k % 3 === 0 ? '#A8835F' : C.plank;
      g.strokeStyle = INK;
      g.lineWidth = 1.8;
      g.beginPath();
      g.roundRect(-6, -50 + (hash2(k, 1) - 0.5) * 3, 12, 100, 3);
      g.fill();
      g.stroke();
      g.restore();
    }
    // rope rails, sagging between posts
    const posts = [];
    const every = Math.max(1, Math.round(110 / 4));
    for (let i = 0; i < pts.length; i += every) posts.push(i);
    if (posts[posts.length - 1] !== pts.length - 1) posts.push(pts.length - 1);
    for (const side of [-1, 1]) {
      const rail = pts.map((p, i) => {
        const l = Math.hypot(p.dx, p.dy) || 1;
        let sag = 0;
        for (let j = 0; j < posts.length - 1; j++) {
          if (i >= posts[j] && i <= posts[j + 1]) sag = Math.sin(((i - posts[j]) / (posts[j + 1] - posts[j] || 1)) * Math.PI) * 9;
        }
        return { x: p.x - (p.dy / l) * 54 * side, y: p.y + (p.dx / l) * 54 * side + sag };
      });
      pen.line(rail, { color: C.rope, width: 3.2 });
      for (const i of posts) {
        const q = rail[i];
        pen.blob(ellipsePts(q.x, q.y - 4, 5, 8, 8), C.woodDark, { width: 2 });
      }
      const end = rail[rail.length - 1];
      if (side === 1) {
        paperLantern(g, pen, fx, rail[0].x, rail[0].y - 26, 0.7, fx.midGlows);
        paperLantern(g, pen, fx, end.x, end.y - 26, 0.7, fx.midGlows);
      }
    }
  }
}

// ---------------------------------------------------------------- scenes

/** @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd @param {Layout} L */
function scene41(g, pen, fx, rnd, L) {
  // far islands in the haze
  for (const [x, y, rx] of [[760, 120, 70], [1180, 250, 50], [80, 640, 60], [1900, 560, 50]]) {
    g.save();
    g.globalAlpha = 0.45;
    paintIsland(g, pen, rnd, { x, y, rx, ry: rx * 0.35 }, { depth: rx * 0.9 });
    g.restore();
  }
  paintIsland(g, pen, rnd, { x: 230, y: 380, rx: 300, ry: 130 });
  paintIsland(g, pen, rnd, { x: 1640, y: 880, rx: 280, ry: 100 });
  paintLanternPost(g, pen, fx, 120, 330, 1);
  paintLanternPost(g, pen, fx, 1860, 830, 0.9);
  paintLanternString(g, pen, fx, { x: 300, y: 470 }, { x: 470, y: 440 }, 2);
}

/** @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd @param {Layout} L */
function scene42(g, pen, fx, rnd, L) {
  for (const [x, y, rx] of [[1450, 140, 60], [100, 520, 50], [1880, 330, 46]]) {
    g.save();
    g.globalAlpha = 0.45;
    paintIsland(g, pen, rnd, { x, y, rx, ry: rx * 0.35 }, { depth: rx * 0.9 });
    g.restore();
  }
  // floating house top-right
  paintIsland(g, pen, rnd, { x: 1620, y: 420, rx: 200, ry: 70 }, { depth: 120 });
  paintRoofHouse(g, pen, fx, 1480, 1760, 210, 360, 60);
  paintLanternString(g, pen, fx, { x: 1470, y: 380 }, { x: 1300, y: 430 }, 2);
  // rooftop islands under the path
  paintIsland(g, pen, rnd, { x: 250, y: 830, rx: 330, ry: 125 }, { top: false, depth: 150 });
  paintRoofHouse(g, pen, fx, -40, 560, 700, 930, 0);
  paintIsland(g, pen, rnd, { x: 1580, y: 810, rx: 320, ry: 120 }, { top: false, depth: 150 });
  paintRoofHouse(g, pen, fx, 1290, 1880, 690, 920, 0);
  // the moon garden: a grassy island with an offering stand facing the moon
  paintIsland(g, pen, rnd, { x: 960, y: 420, rx: 330, ry: 200 });
  inkPoly(g, pen, [{ x: 860, y: 330 }, { x: 1080, y: 330 }, { x: 1100, y: 400 }, { x: 840, y: 400 }], '#9B7657', 2.5);
  g.strokeStyle = 'rgba(59,42,46,0.5)';
  g.lineWidth = 1.5;
  for (let x = 870; x < 1090; x += 22) {
    g.beginPath();
    g.moveTo(x, 332);
    g.lineTo(x - 4, 398);
    g.stroke();
  }
  paintDango(g, pen, 930, 380);
  paintSusukiVase(g, pen, fx, 1040, 386);
  paintLanternPost(g, pen, fx, 1180, 560, 0.9);
  paintLanternPost(g, pen, fx, 760, 560, 0.9);
  // small rooftop islet at the bottom
  paintIsland(g, pen, rnd, { x: 950, y: 930, rx: 170, ry: 60 }, { top: false, depth: 90 });
  paintRoofHouse(g, pen, fx, 820, 1080, 870, 975, 0);
}

/** @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd @param {Layout} L */
function scene43(g, pen, fx, rnd, L) {
  paintBowl(g, pen, rnd);
  for (const [x, y] of [[300, 1030], [1640, 1020], [1880, 150]]) paintLanternPost(g, pen, fx, x, y, 0.9);
}

// ---------------------------------------------------------------- cache

/** @type {Map<string, {back:any, mid:any, fx:Fx, lit:any, litKey:number, whale:any, flick:Fx['glows']}>} */
const cache = new Map();

/** @param {Layout} L */
function getScene(L) {
  const key = L.id + ':' + L.paths.length + ':' + L.spots.length;
  const hit = cache.get(key);
  if (hit) return hit;
  const scn = SCN[/** @type {'4-1'} */ (L.id)] ?? { moon: { x: 1600, y: 200, r: 120 }, land: [], whale: null, cons: [] };
  /** @type {Fx} */
  const fx = { glows: [], midGlows: [], stars: [], grass: [], motes: [] };
  const seed = [...L.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 11);
  const rnd = mulberry32(seed);
  const back = makeCanvas(W, H);
  const g = ctxOf(back);
  const pen = new Pen(g);
  pen.begin(0, { boil: true, amp: 1, width: 3 });
  paintSky(g, rnd);
  paintMoon(g, scn.moon.x, scn.moon.y, scn.moon.r, L.id === '4-3');
  ({ '4-1': scene41, '4-2': scene42, '4-3': scene43 }[L.id] ?? (() => {}))(g, pen, fx, rnd, L);
  const whale = scn.whale;
  for (const s of L.spots) if (!(whale && inOval(s, whale))) paintPad(g, pen, rnd, s.x, s.y);

  // live stars only where there is open sky
  /** @type {Oval[]} */
  const solid = [...scn.land.map((o) => ({ x: o.x, y: o.y + o.ry * 0.6, rx: o.rx + 30, ry: o.ry * 1.9 + 40 })), { x: scn.moon.x, y: scn.moon.y, rx: scn.moon.r + 20, ry: scn.moon.r + 20 }];
  const tracks = L.paths.map((p) => new Track(p, 10));
  const isSky = (/** @type {Pt} */ p) => solid.every((o) => !inOval(p, o)) && tracks.every((t) => t.distanceTo(p) > 70) && L.spots.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 110);
  for (let i = 0; i < 400 && fx.stars.length < 55; i++) {
    const p = { x: rnd() * W, y: rnd() * H * 0.85 };
    if (isSky(p)) fx.stars.push({ x: p.x, y: p.y, s: rnd() * 10, b: 0.6 + rnd() * 0.8 });
  }
  for (let i = 0; i < 20; i++) fx.motes.push({ x: rnd() * W, y: rnd() * H, s: rnd() });

  const mid = makeCanvas(W, H);
  const m = ctxOf(mid);
  const mpen = new Pen(m);
  mpen.begin(0, { boil: true, amp: 1, width: 3 });
  const onLand = (/** @type {Pt} */ p) => scn.land.some((o) => inOval(p, o));
  for (const p of L.paths) paintMossAndBridges(m, mpen, fx, p, onLand, rnd);
  const scene = { back, mid, fx, lit: /** @type {any} */ (null), litKey: -1, whale: /** @type {any} */ (null), flick: fx.glows.filter((gl) => gl.a > 0.5).slice(0, 14) };
  cache.set(key, scene);
  if (cache.size > 3) cache.delete(cache.keys().next().value ?? '');
  return scene;
}

/**
 * The static layer with the night's depth and steady lantern light baked in,
 * re-composited only when the (quantized) light level changes.
 * @param {ReturnType<typeof getScene>} sc @param {number} light
 */
function getLit(sc, light) {
  const q = Math.round(Math.max(0, Math.min(1, light)) * 20) / 20;
  if (sc.lit && sc.litKey === q) return sc.lit;
  const c = sc.lit ?? makeCanvas(W, H);
  const g = ctxOf(c);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.drawImage(sc.back, 0, 0);
  g.fillStyle = `rgba(12,12,40,${(0.02 + q * 0.24).toFixed(3)})`;
  g.fillRect(0, 0, W, H);
  // early in the night a rosy afterglow still warms the sea of clouds
  const dusk = g.createLinearGradient(0, H * 0.45, 0, H);
  dusk.addColorStop(0, 'rgba(244,170,200,0)');
  dusk.addColorStop(1, `rgba(244,170,200,${((1 - q) * 0.2).toFixed(3)})`);
  g.fillStyle = dusk;
  g.fillRect(0, H * 0.45, W, H * 0.55);
  drawGlows(g, sc.fx.glows, 0, 0.7 + q * 0.4, 0);
  sc.lit = c;
  sc.litKey = q;
  return c;
}

// ---------------------------------------------------------------- live layers

/** @param {number} v */
const frac = (v) => v - Math.floor(v);

/**
 * Additive lantern light; `flicker` is the flicker depth (0 = steady, used when baking).
 * @param {Ctx} ctx @param {Fx['glows']} glows @param {number} t @param {number} k @param {number} [flicker] @param {number} [rs] radius scale
 */
function drawGlows(ctx, glows, t, k, flicker = 0.24, rs = 1) {
  const sp = getSprites().glow;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const gl of glows) {
    const flick = 1 - flicker * (0.5 - 0.5 * Math.sin(t * 5.1 + gl.s * 9) * Math.sin(t * 2.3 + gl.s * 4));
    ctx.globalAlpha = Math.min(1, gl.a * k * flick);
    const r = gl.r * rs;
    ctx.drawImage(sp, gl.x - r, gl.y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** @param {Ctx} ctx @param {Fx} fx @param {{cons:number[][][]}} scn @param {number} t @param {number} k */
function drawStars(ctx, fx, scn, t, k) {
  const sp = getSprites().star;
  ctx.save();
  for (const s of fx.stars) {
    const tw = 0.5 + 0.5 * Math.sin(t * (1.2 + s.b) + s.s);
    ctx.globalAlpha = (0.25 + tw * 0.75) * k;
    const r = 7 + s.b * 6 * (0.7 + tw * 0.3);
    ctx.drawImage(sp, s.x - r, s.y - r, r * 2, r * 2);
  }
  // constellations: lines breathe, then each star blinks in turn
  scn.cons.forEach((c, ci) => {
    const phase = frac(t * 0.08 + ci * 0.33);
    ctx.globalAlpha = (0.22 + 0.18 * Math.sin(t * 0.7 + ci)) * k;
    ctx.strokeStyle = P.silver;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.setLineDash([]);
    c.forEach(([x, y], i) => {
      const lit = Math.max(0, 1 - Math.abs(phase * (c.length + 2) - i - 1) * 0.9);
      ctx.globalAlpha = Math.min(1, (0.55 + lit * 0.45) * k);
      spark(ctx, x, y, 5 + lit * 6, false);
      ctx.globalAlpha = Math.min(1, (0.3 + lit * 0.5) * k);
      ctx.drawImage(sp, x - 16, y - 16, 32, 32);
    });
  });
  ctx.restore();
}

/** @param {Ctx} ctx @param {number} t */
function drawShootingStar(ctx, t) {
  const period = 9;
  const ph = frac(t / period);
  if (ph > 0.12) return;
  const n = Math.floor(t / period);
  const u = ph / 0.12;
  const x0 = 300 + hash2(n, 1) * 1300;
  const y0 = 40 + hash2(n, 2) * 120;
  const x = x0 - u * 420;
  const y = y0 + u * 170;
  const gr = ctx.createLinearGradient(x, y, x + 160, y - 65);
  gr.addColorStop(0, `rgba(255,248,220,${(1 - u) * 0.95})`);
  gr.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.save();
  ctx.strokeStyle = gr;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 160, y - 65);
  ctx.stroke();
  ctx.globalAlpha = 1 - u;
  spark(ctx, x, y, 7, true);
  ctx.restore();
}

/** @param {Ctx} ctx @param {number} t */
function drawDriftClouds(ctx, t) {
  const sp = getSprites().cloud;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const speed = 9 + i * 5;
    const x = ((hash2(i, 9) * (W + 500) + t * speed) % (W + 500)) - 400;
    const y = 120 + i * 300 + Math.sin(t * 0.1 + i) * 10;
    ctx.globalAlpha = 0.22 + i * 0.05;
    const s = 0.9 + i * 0.25;
    ctx.drawImage(sp, x, y, 320 * s, 140 * s);
  }
  ctx.restore();
}

/** @param {Ctx} ctx @param {Fx} fx @param {number} t */
function drawMotes(ctx, fx, t) {
  ctx.save();
  for (const m of fx.motes) {
    const ph = frac(t * 0.03 + m.s);
    const x = m.x + Math.sin(t * 0.5 + m.s * 10) * 20;
    const y = ((m.y - ph * 400 + H) % H);
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + m.s * 20);
    spark(ctx, x, y, 3.5, false);
  }
  ctx.restore();
}

/** @param {Ctx} ctx @param {Fx} fx @param {number} t */
function drawGrass(ctx, fx, t) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const gr of fx.grass) {
    for (let i = 0; i < 6; i++) {
      const lean = (i - 2.5) * 0.18 + Math.sin(t * 1.3 + i * 0.7) * 0.08;
      const len = 70 + (i % 3) * 18;
      const tx = gr.x + Math.sin(lean) * len;
      const ty = gr.y - Math.cos(lean) * len;
      ctx.strokeStyle = '#D8C79A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(gr.x, gr.y);
      ctx.quadraticCurveTo(gr.x + Math.sin(lean) * len * 0.4, gr.y - len * 0.6, tx, ty);
      ctx.stroke();
      ctx.fillStyle = 'rgba(252,242,214,0.95)';
      ctx.beginPath();
      ctx.ellipse(tx + Math.sin(lean) * 10, ty - 10, 8, 24, lean + 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,235,0.7)';
      ctx.beginPath();
      ctx.ellipse(tx + Math.sin(lean) * 6 - 3, ty - 4, 5, 14, lean + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Paint the whale's still body once (shading, cloud puffs, belly, smile, saddle rugs for the
 * cats napping on its back); fins, eye, flukes and sparkles stay live.
 * @param {Oval} wh @param {Pt[]} spots
 */
function makeWhaleSprite(wh, spots) {
  const pad = 40;
  const ox = Math.floor(wh.x - wh.rx - pad);
  const oy = Math.floor(wh.y - wh.ry - pad - 40);
  const c = makeCanvas(Math.ceil(wh.rx * 2 + pad * 2), Math.ceil(wh.ry * 2 + pad * 2 + 60));
  const g = ctxOf(c);
  g.translate(-ox, -oy);
  const pen = new Pen(g);
  pen.begin(0, { boil: true, amp: 1, width: 3 });
  const cx = wh.x;
  const cy = wh.y;
  // body: blunt rounded head, tapering tail stock
  /** @type {Pt[]} */
  const body = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const pe = ca > 0 ? 2.7 : 2;
    const ux = Math.sign(ca) * Math.abs(ca) ** (2 / pe);
    const uy = Math.sign(sa) * Math.abs(sa) ** (2 / pe);
    const taper = 1 - 0.6 * Math.max(0, -ux) ** 1.7;
    body.push({ x: cx + ux * wh.rx, y: cy + uy * wh.ry * taper * (sa > 0 ? 1.05 : 1) - Math.max(0, -ux) ** 2 * 34 });
  }
  const bg = g.createLinearGradient(0, cy - wh.ry, 0, cy + wh.ry);
  bg.addColorStop(0, '#FBFAFF');
  bg.addColorStop(0.45, '#DCD7F6');
  bg.addColorStop(0.75, '#B4ADE2');
  bg.addColorStop(1, '#8C84C9');
  pen.blob(body, bg, { width: 3.5 });
  g.save();
  g.beginPath();
  g.moveTo(body[0].x, body[0].y);
  for (const p of body) g.lineTo(p.x, p.y);
  g.closePath();
  g.clip();
  // cloud puffs along the back
  for (let i = 0; i < 16; i++) {
    const u = i / 15;
    const x = cx - wh.rx * 0.85 + u * wh.rx * 1.7;
    const k = (x - cx) / wh.rx;
    const top = cy - wh.ry * Math.sqrt(Math.max(0, 1 - k * k)) * (1 - 0.55 * Math.max(0, -k) ** 1.6);
    const r = 34 + hash2(i, 3) * 26;
    const pg = g.createRadialGradient(x - r * 0.3, top - r * 0.2, 2, x, top + 10, r);
    pg.addColorStop(0, 'rgba(255,255,255,0.85)');
    pg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = pg;
    g.beginPath();
    g.arc(x, top + 10, r, 0, Math.PI * 2);
    g.fill();
  }
  // pale belly with soft pleats
  g.fillStyle = 'rgba(255,244,207,0.35)';
  g.beginPath();
  g.ellipse(cx + wh.rx * 0.2, cy + wh.ry * 0.8, wh.rx * 0.75, wh.ry * 0.38, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(120,112,180,0.45)';
  g.lineWidth = 2.5;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.moveTo(cx + wh.rx * 0.88, cy + wh.ry * (0.42 + k * 0.12));
    g.quadraticCurveTo(cx + wh.rx * 0.3, cy + wh.ry * (0.62 + k * 0.12), cx - wh.rx * 0.25, cy + wh.ry * (0.55 + k * 0.1));
    g.stroke();
  }
  g.restore();
  // blush + long smile
  const ex = cx + wh.rx * 0.88;
  const ey = cy + wh.ry * 0.34;
  g.fillStyle = 'rgba(244,166,183,0.5)';
  g.beginPath();
  g.ellipse(ex - 26, ey + 24, 20, 9, 0, 0, Math.PI * 2);
  g.fill();
  pen.line([{ x: cx + wh.rx * 0.985, y: cy + wh.ry * 0.46 }, { x: cx + wh.rx * 0.9, y: cy + wh.ry * 0.58 }, { x: cx + wh.rx * 0.74, y: cy + wh.ry * 0.56 }], { width: 3 });
  // saddle rugs for the cats napping on its back
  for (const s of spots) {
    if (!inOval(s, wh)) continue;
    const rg = g.createLinearGradient(s.x, s.y - 20, s.x, s.y + 30);
    rg.addColorStop(0, '#E7A0B4');
    rg.addColorStop(1, '#B9708C');
    pen.blob(ellipsePts(s.x, s.y + 8, 90, 30, 20, (a) => 1 + 0.06 * Math.cos(a * 4)), rg, { width: 2.5 });
    g.strokeStyle = '#FFE58A';
    g.lineWidth = 2;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.ellipse(s.x, s.y + 8, 78, 22, 0, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
  }
  return { c, ox, oy };
}

/**
 * The cloud whale: a gentle giant the path rides across.
 * @param {Ctx} ctx @param {Pen} pen @param {Oval} wh @param {{c:any, ox:number, oy:number}} sprite @param {number} t
 */
function drawWhale(ctx, pen, wh, sprite, t) {
  const bob = Math.sin(t * 0.6) * 3;
  const cx = wh.x;
  const cy = wh.y + bob;
  ctx.save();
  // cloud wisps trailing off the tail as it swims
  const csp = getSprites().cloud;
  for (let k = 0; k < 3; k++) {
    const ph = frac(t * 0.05 + k / 3);
    ctx.globalAlpha = (1 - ph) * 0.5;
    const s = 0.5 + ph * 0.5;
    ctx.drawImage(csp, cx - wh.rx - 80 - ph * 360 - 160 * s, cy - 60 + k * 30 - 70 * s, 320 * s, 140 * s);
  }
  ctx.globalAlpha = 1;
  // tail flukes (behind the body): one lobe sweeps up, one down
  const flap = Math.sin(t * 0.9) * 0.14;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(cx - wh.rx + 24, cy - 34);
    ctx.rotate(-0.2 + flap + s * 0.5);
    const fl = ctx.createLinearGradient(0, -30, 0, 30);
    fl.addColorStop(0, '#F4F2FF');
    fl.addColorStop(1, '#AFA8DE');
    pen.blob(ellipsePts(-80, 0, 96, 30, 16, (a) => 1 - 0.35 * Math.max(0, -Math.cos(a)) ** 3 + 0.12 * Math.cos(a)), fl, { width: 3 });
    ctx.restore();
  }
  ctx.drawImage(sprite.c, sprite.ox, sprite.oy + bob);
  // starry freckles that twinkle
  for (let i = 0; i < 9; i++) {
    const x = cx - wh.rx * 0.6 + hash2(i, 21) * wh.rx * 1.2;
    const y = cy + wh.ry * (0.05 + hash2(i, 22) * 0.35);
    ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 1.7 + i * 1.9);
    spark(ctx, x, y, 5 + hash2(i, 23) * 4, false);
  }
  ctx.globalAlpha = 1;
  // pectoral fin, paddling slowly
  ctx.save();
  ctx.translate(cx + wh.rx * 0.32, cy + wh.ry * 0.72);
  ctx.rotate(0.5 + Math.sin(t * 0.9 + 1) * 0.18);
  const fg = ctx.createLinearGradient(0, 0, 0, 90);
  fg.addColorStop(0, '#E4E0FA');
  fg.addColorStop(1, '#9B94D2');
  pen.blob(ellipsePts(0, 52, 26, 60, 16, (a) => 1 + 0.2 * Math.sin(a)), fg, { width: 3 });
  ctx.restore();
  // a calm eye that blinks now and then
  const ex = cx + wh.rx * 0.88;
  const ey = cy + wh.ry * 0.34;
  const blink = frac(t / 6) > 0.96 ? 0.15 : 1;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(ex, ey, 11, 13 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  if (blink > 0.5) {
    ctx.fillStyle = '#FFFDF6';
    ctx.beginPath();
    ctx.arc(ex - 3.5, ey - 4.5, 4, 0, Math.PI * 2);
    ctx.arc(ex + 4, ey + 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // blowhole sparkles drifting up
  for (let i = 0; i < 6; i++) {
    const ph = frac(t * 0.25 + i / 6);
    const sx = cx + wh.rx * 0.45 + Math.sin(ph * 6 + i) * 18 * ph;
    const sy = cy - wh.ry * 0.95 - ph * 140;
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
    spark(ctx, sx, sy, 4 + ph * 4, i % 2 === 0);
  }
  ctx.restore();
}


/** Tiny faraway whale drifting along the top of the sky. @param {Ctx} ctx @param {Pen} pen @param {number} t */
function drawFarWhale(ctx, pen, t) {
  const x = ((t * 14) % (W + 400)) - 200;
  const y = 70 + Math.sin(t * 0.3) * 8;
  ctx.save();
  ctx.globalAlpha = 0.5;
  pen.blob(ellipsePts(x, y, 52, 16, 16, (a) => 1 - 0.4 * Math.max(0, -Math.cos(a)) ** 2), '#C9D3E8', { width: 1.5 });
  pen.blob(ellipsePts(x - 58, y - 8, 14, 6, 10), '#C9D3E8', { width: 1.5 });
  ctx.restore();
}

// ---------------------------------------------------------------- room

/** @type {RoomSpec} */
export const room = {
  id: 'sky',
  name: 'Moonlit Sky Islands',
  pathStyle: { fill: '#AFCB8E', edge: '#5D8656', speck: 'rgba(255,248,214,0.35)', width: 92 },
  cushion: { base: '#F2B8CF', dark: '#C987A6' },
  drawBack(ctx, pen, t, o) {
    const L = o.layout ?? L41;
    const sc = getScene(L);
    const scn = SCN[/** @type {'4-1'} */ (L.id)] ?? { cons: [], whale: null };
    const still = !!o.reducedMotion;
    const tt = still ? 0 : t;
    const light = o.light ?? 0.4;
    // the night deepens across the waves (baked into the composited layer)
    ctx.drawImage(getLit(sc, light), 0, 0, W, H);
    drawStars(ctx, sc.fx, scn, tt, 0.7 + light * 0.3);
    if (!still) {
      drawShootingStar(ctx, t);
      if (!scn.whale) drawFarWhale(ctx, pen, t);
    }
    drawDriftClouds(ctx, tt);
    if (scn.whale) {
      sc.whale ??= makeWhaleSprite(scn.whale, L.spots);
      drawWhale(ctx, pen, scn.whale, sc.whale, tt);
    }
    drawGrass(ctx, sc.fx, tt);
    if (!still) drawGlows(ctx, sc.flick, t, 0.3 + light * 0.2, 1, 0.7);
    drawMotes(ctx, sc.fx, tt);
  },
  drawMid(ctx, pen, t, o) {
    const L = o.layout ?? L41;
    const sc = getScene(L);
    const still = !!o.reducedMotion;
    ctx.drawImage(sc.mid, 0, 0, W, H);
    drawGlows(ctx, sc.fx.midGlows, still ? 0 : t, 0.7 + (o.light ?? 0.4) * 0.4, still ? 0 : 0.24);
  },
  drawFront(ctx, pen, t, o) {
    // soft cloud wisps hugging the bottom corners
    const tt = o.reducedMotion ? 0 : t;
    const sp = getSprites().cloud;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(sp, -120 + Math.sin(tt * 0.2) * 14, H - 90, 360, 158);
    ctx.drawImage(sp, W - 250 + Math.sin(tt * 0.17 + 2) * 14, H - 80, 360, 158);
    ctx.restore();
  },
  layouts: [L41, L42, L43],
};
