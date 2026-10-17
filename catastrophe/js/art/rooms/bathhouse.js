// @ts-check
// World 3 · Rainy Bathhouse Town: lantern-lit stone alleys at night, tiled roofs, steam,
// a lily-pad river with a stone bridge, swaying door curtains and soft rain.
// Static scenery is painted once per layout into an offscreen layer; rain, steam,
// lantern glows, curtains and ripples are drawn live on top.
import { Pen, ellipsePts } from '../brush.js';
import { WORLDS, INK } from '../palette.js';
import { catmullRom, Track } from '../../core/spline.js';
import { hash2, mulberry32 } from '../../core/rng.js';

/** @typedef {import('./common.js').RoomSpec} RoomSpec */
/** @typedef {import('./common.js').Layout} Layout */
/** @typedef {import('./common.js').RoomOpts} RoomOpts */
/** @typedef {{x:number, y:number}} Pt */
/** @typedef {CanvasRenderingContext2D} Ctx */
/**
 * Live (animated) bits collected while painting the static layer.
 * @typedef {Object} Fx
 * @property {{x:number,y:number,r:number,a:number,s:number}[]} glows lantern / window light
 * @property {{x:number,y:number,r:number,a:number,s:number}[]} midGlows lights drawn above the path (bridge lanterns)
 * @property {{x:number,y:number,s:number,k:number}[]} steam steam sources
 * @property {{x:number,y:number,w:number,h:number,c:string,s:number}[]} noren door curtains
 * @property {{x:number,y:number,s:number}[]} ripples rain rings on puddles / water / cobbles
 * @property {{x:number,y:number,s:number}[]} willows trees whose strands sway
 * @property {Pt[]} [lane] water route polyline (3-2)
 */

const W = 1920;
const H = 1080;
const P = WORLDS.bathhouse;
const C = {
  stone: '#2A4951',
  stoneLight: '#3B606A',
  stoneDark: '#1B363E',
  wood: '#4B3631',
  woodLight: '#70503F',
  woodDark: '#2C1F1C',
  roof: '#34505E',
  roofLight: '#6A8D9B',
  roofDark: '#1C2F38',
  paper: '#FFE7B0',
  paperWarm: '#F2B062',
  water: '#163F4D',
  waterLight: '#2F6F80',
  lily: '#4C7D52',
  lilyLight: '#86B572',
  moss: '#3D6A55',
  pine: '#24473F',
  pineLight: '#3F6E5C',
};
const ROOF_TINTS = ['#34505E', '#3B4C66', '#2E5A5A', '#4E3A3C', '#3A5560'];

// ---------------------------------------------------------------- geometry

/** Circular arc points (degrees, screen space: 0 = right, 90 = down). */
function arc(cx, cy, r, a0, a1) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 6));
  /** @type {Pt[]} */
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
}

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
/** @param {Pt[][]} parts */
const route = (parts, step = 70) => resample(parts.flat(), step);
/** @param {Pt[]} ctrl */
const curve = (ctrl, step = 70) => resample(catmullRom(ctrl, 14), step);

// ---------------------------------------------------------------- layouts

/** @type {Layout} */
const L31 = {
  id: '3-1',
  name: 'Lantern Alley in the Rain',
  paths: [route([[{ x: -90, y: 250 }, { x: 1450, y: 250 }], arc(1450, 400, 150, -90, 90), [{ x: 450, y: 550 }], arc(450, 700, 150, 270, 90), [{ x: 1740, y: 850 }]])],
  spots: [
    { x: 240, y: 400 }, { x: 640, y: 400 }, { x: 1040, y: 400 }, { x: 1450, y: 400 },
    { x: 450, y: 700 }, { x: 850, y: 700 }, { x: 1250, y: 700 }, { x: 1630, y: 690 },
    { x: 700, y: 975 }, { x: 1200, y: 975 }, { x: 1760, y: 240 },
  ],
  stash: { x: 1740, y: 850 },
};

/** River centerline for 3-2 (wider than the boat lane, keeps flowing east). */
const RIVER32 = [
  { x: -120, y: 722 }, { x: 250, y: 735 }, { x: 520, y: 705 }, { x: 800, y: 655 }, { x: 1080, y: 640 },
  { x: 1320, y: 612 }, { x: 1520, y: 562 }, { x: 1720, y: 528 }, { x: 2050, y: 540 },
];

/** @type {Layout} */
const L32 = {
  id: '3-2',
  name: 'Steam Bridge Crossing',
  paths: [
    curve([{ x: -90, y: 720 }, { x: 250, y: 735 }, { x: 520, y: 705 }, { x: 800, y: 655 }, { x: 1080, y: 640 }, { x: 1320, y: 610 }, { x: 1500, y: 545 }, { x: 1640, y: 470 }, { x: 1730, y: 430 }]),
    curve([{ x: 420, y: 1170 }, { x: 450, y: 1000 }, { x: 530, y: 850 }, { x: 620, y: 700 }, { x: 700, y: 545 }, { x: 820, y: 420 }, { x: 1020, y: 330 }, { x: 1280, y: 300 }, { x: 1500, y: 325 }, { x: 1650, y: 375 }, { x: 1730, y: 430 }]),
  ],
  spots: [
    { x: 540, y: 570 }, { x: 720, y: 795 }, { x: 900, y: 520 }, { x: 1220, y: 470 },
    { x: 1420, y: 450 }, { x: 1600, y: 230 }, { x: 1160, y: 190 }, { x: 380, y: 855 },
    { x: 920, y: 800 }, { x: 1250, y: 780 }, { x: 1640, y: 690 }, { x: 600, y: 975 },
  ],
  stash: { x: 1730, y: 430 },
};

/** @type {Layout} */
const L33 = {
  id: '3-3',
  name: 'The Grand Bathhouse',
  paths: [route([[{ x: -90, y: 860 }, { x: 1200, y: 860 }], arc(1200, 600, 260, 90, -90), [{ x: 600, y: 340 }], arc(600, 490, 150, 270, 90), [{ x: 1740, y: 640 }]])],
  spots: [
    { x: 600, y: 490 }, { x: 900, y: 490 }, { x: 1250, y: 490 },
    { x: 450, y: 750 }, { x: 750, y: 750 }, { x: 1050, y: 750 },
    { x: 900, y: 195 }, { x: 1640, y: 800 }, { x: 1640, y: 470 },
    { x: 500, y: 975 }, { x: 1000, y: 975 }, { x: 300, y: 490 },
  ],
  stash: { x: 1740, y: 640 },
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

/** @type {{glow:any, steam:any, warm:any, ripple:any, rain:any[]} | null} */
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
  sprites = {
    glow: radial([[0, 'rgba(255,196,120,0.95)'], [0.25, 'rgba(242,158,76,0.45)'], [0.6, 'rgba(242,120,60,0.12)'], [1, 'rgba(242,120,60,0)']]),
    warm: radial([[0, 'rgba(255,226,160,0.8)'], [0.4, 'rgba(255,200,120,0.25)'], [1, 'rgba(255,200,120,0)']]),
    steam: radial([[0, 'rgba(233,241,242,0.85)'], [0.45, 'rgba(233,241,242,0.4)'], [1, 'rgba(233,241,242,0)']]),
    ripple: (() => {
      const c = makeCanvas(68, 30);
      const g = ctxOf(c);
      g.strokeStyle = 'rgba(214,234,240,1)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(34, 15, 32, 13, 0, 0, Math.PI * 2);
      g.stroke();
      return c;
    })(),
    rain: [rainTile(1, 130, 20, 1.2, 0.2), rainTile(2, 70, 34, 1.8, 0.3)],
  };
  return sprites;
}

/** A seamless tile of slanted rain streaks. @param {number} seed @param {number} n @param {number} len @param {number} w @param {number} a */
function rainTile(seed, n, len, w, a) {
  const S = 512;
  const c = makeCanvas(S, S);
  const g = ctxOf(c);
  g.strokeStyle = `rgba(196,222,232,${a})`;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  const count = Math.round((n * S * S) / (W * H)) * 2;
  for (let i = 0; i < count; i++) {
    const x = hash2(i, seed * 11) * S;
    const y = hash2(i, seed * 13) * S;
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        g.moveTo(x + ox, y + oy);
        g.lineTo(x + ox - len * 0.22, y + oy + len);
      }
    }
  }
  g.stroke();
  return c;
}

/** Wobbly-ink straight-edged polygon. @param {Ctx} g @param {Pen} pen @param {Pt[]} pts @param {string|CanvasGradient|null} fill @param {number} [lw] @param {string} [ink] */
function inkPoly(g, pen, pts, fill, lw = 3, ink = INK) {
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
    g.strokeStyle = ink;
    g.stroke();
  }
}

/** @param {Ctx} g @param {number} x @param {number} y @param {number} rx @param {number} ry @param {string} col */
function shadow(g, x, y, rx, ry, col = 'rgba(8,22,28,0.38)') {
  g.fillStyle = col;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

// ---------------------------------------------------------------- static painters

/** Rain-darkened flagstone ground. @param {Ctx} g @param {() => number} rnd */
function paintGround(g, rnd) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#1D3B44');
  gr.addColorStop(0.5, '#25454E');
  gr.addColorStop(1, '#1F3E47');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const r = 220 + rnd() * 260;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, rnd() < 0.5 ? 'rgba(111,154,174,0.10)' : 'rgba(242,158,76,0.06)');
    rg.addColorStop(1, 'rgba(111,154,174,0)');
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // flagstones
  g.lineWidth = 2;
  for (let y = -10; y < H; ) {
    const rh = 40 + rnd() * 16;
    let x = -rnd() * 80;
    while (x < W) {
      const sw = 64 + rnd() * 80;
      const v = rnd();
      g.fillStyle = v < 0.5 ? `rgba(120,165,180,${0.03 + v * 0.06})` : `rgba(6,20,26,${(v - 0.5) * 0.16})`;
      g.strokeStyle = 'rgba(8,22,28,0.32)';
      g.beginPath();
      g.roundRect(x + 2, y + 2, sw - 4, rh - 4, 9);
      g.fill();
      g.stroke();
      // wet sheen on the top edge
      g.strokeStyle = 'rgba(160,200,214,0.08)';
      g.beginPath();
      g.moveTo(x + 8, y + 5);
      g.lineTo(x + sw - 10, y + 5);
      g.stroke();
      x += sw;
    }
    y += rh;
  }
}

/** Puddle with a lantern-warm reflection. @param {Ctx} g @param {Fx} fx @param {number} x @param {number} y @param {number} rx @param {() => number} rnd */
function paintPuddle(g, fx, x, y, rx, rnd) {
  const ry = rx * (0.32 + rnd() * 0.1);
  const pts = ellipsePts(x, y, rx, ry, 14, (a) => 1 + 0.12 * Math.sin(a * 3 + rx));
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) g.lineTo(p.x, p.y);
  g.closePath();
  const gr = g.createLinearGradient(x, y - ry, x, y + ry);
  gr.addColorStop(0, '#12303A');
  gr.addColorStop(0.55, '#1B4350');
  gr.addColorStop(1, '#2B5D6C');
  g.fillStyle = gr;
  g.fill();
  g.strokeStyle = 'rgba(160,200,214,0.25)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = 'rgba(242,158,76,0.22)';
  g.beginPath();
  g.ellipse(x + rx * 0.2, y, rx * 0.18, ry * 0.7, 0, 0, Math.PI * 2);
  g.fill();
  fx.ripples.push({ x: x - rx * 0.3, y, s: rnd() });
  fx.ripples.push({ x: x + rx * 0.35, y: y + ry * 0.2, s: rnd() });
}

/** Paper lantern (chochin) hanging from a string. @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {number} x @param {number} y @param {number} s @param {string} [col] */
function paintLantern(g, pen, fx, x, y, s, col = P.vermillion) {
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(x, y - 22 * s);
  g.lineTo(x, y - 14 * s);
  g.stroke();
  const gr = g.createRadialGradient(x - 3 * s, y - 3 * s, 1, x, y, 16 * s);
  gr.addColorStop(0, '#FFE2A6');
  gr.addColorStop(0.45, col === P.vermillion ? '#F08A4A' : P.lantern);
  gr.addColorStop(1, col);
  pen.blob(ellipsePts(x, y, 11 * s, 14 * s, 14), gr, { width: 2 });
  g.strokeStyle = 'rgba(90,30,20,0.45)';
  g.lineWidth = 1;
  for (let k = -2; k <= 2; k++) {
    g.beginPath();
    g.ellipse(x, y + k * 4.6 * s, 10.5 * s * Math.sqrt(1 - (k / 3) ** 2), 1.2 * s, 0, 0, Math.PI);
    g.stroke();
  }
  g.fillStyle = INK;
  g.fillRect(x - 6 * s, y - 16 * s, 12 * s, 4 * s);
  g.fillRect(x - 6 * s, y + 12.5 * s, 12 * s, 4 * s);
  fx.glows.push({ x, y, r: 95 * s, a: 0.85, s: x * 0.013 + y * 0.007 });
}

/** Lit shoji window. @param {Ctx} g @param {number} x @param {number} y @param {number} w @param {number} h @param {boolean} lit @param {boolean} cat */
function paintWindow(g, x, y, w, h, lit, cat) {
  g.fillStyle = C.woodDark;
  g.fillRect(x - 3, y - 3, w + 6, h + 6);
  if (lit) {
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, C.paper);
    gr.addColorStop(1, C.paperWarm);
    g.fillStyle = gr;
  } else g.fillStyle = '#3F4E52';
  g.fillRect(x, y, w, h);
  if (cat && lit) {
    // a curious silhouette peeking out
    g.fillStyle = 'rgba(59,58,74,0.75)';
    const cx = x + w * 0.55;
    const cy = y + h;
    g.beginPath();
    g.ellipse(cx, cy - h * 0.18, w * 0.2, h * 0.24, 0, Math.PI, 0);
    g.moveTo(cx - w * 0.18, cy - h * 0.3);
    g.lineTo(cx - w * 0.14, cy - h * 0.55);
    g.lineTo(cx - w * 0.04, cy - h * 0.38);
    g.moveTo(cx + w * 0.18, cy - h * 0.3);
    g.lineTo(cx + w * 0.14, cy - h * 0.55);
    g.lineTo(cx + w * 0.04, cy - h * 0.38);
    g.fill();
    g.fillRect(cx - w * 0.2, cy - h * 0.2, w * 0.4, h * 0.2);
  }
  g.strokeStyle = lit ? 'rgba(122,82,56,0.7)' : 'rgba(20,30,34,0.6)';
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 1; i < 3; i++) {
    g.moveTo(x + (w * i) / 3, y);
    g.lineTo(x + (w * i) / 3, y + h);
  }
  for (let i = 1; i < 3; i++) {
    g.moveTo(x, y + (h * i) / 3);
    g.lineTo(x + w, y + (h * i) / 3);
  }
  g.stroke();
}

/**
 * Tiled hip roof seen from a high 3/4 angle.
 * @param {Ctx} g @param {Pen} pen @param {number} x0 @param {number} x1 @param {number} yTop @param {number} yEave @param {string} tint
 */
function paintRoof(g, pen, x0, x1, yTop, yEave, tint) {
  const w = x1 - x0;
  const ov = 12;
  const inset = Math.min(w * 0.2, 46);
  const ridgeY = yTop + 8;
  const pts = [
    { x: x0 + inset, y: ridgeY },
    { x: x1 - inset, y: ridgeY },
    { x: x1 + ov + 7, y: yEave - 11 },
    { x: x1 + ov - 8, y: yEave },
    { x: x0 - ov + 8, y: yEave },
    { x: x0 - ov - 7, y: yEave - 11 },
  ];
  const gr = g.createLinearGradient(0, ridgeY, 0, yEave);
  gr.addColorStop(0, C.roofLight);
  gr.addColorStop(0.18, tint);
  gr.addColorStop(0.62, tint);
  gr.addColorStop(0.8, '#7C9DAA');
  gr.addColorStop(1, C.roofDark);
  g.save();
  inkPoly(g, pen, pts, gr, 0);
  g.clip();
  // tile channels converging toward the ridge
  const n = Math.max(4, Math.round((w + ov * 2) / 13));
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const xb = x0 - ov + (w + ov * 2) * u;
    const xt = x0 + inset + (w - inset * 2) * u;
    g.strokeStyle = 'rgba(14,26,32,0.38)';
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(xt, ridgeY);
    g.lineTo(xb, yEave);
    g.stroke();
    g.strokeStyle = 'rgba(200,226,236,0.13)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(xt + 3, ridgeY);
    g.lineTo(xb + 4, yEave);
    g.stroke();
  }
  g.strokeStyle = 'rgba(14,26,32,0.16)';
  g.lineWidth = 1;
  for (let y = ridgeY + 12; y < yEave; y += 12) {
    g.beginPath();
    g.moveTo(x0 - ov - 10, y);
    g.lineTo(x1 + ov + 10, y);
    g.stroke();
  }
  g.restore();
  inkPoly(g, pen, pts, null, 3);
  // tile ends along the eave
  for (let x = x0 - ov + 10; x < x1 + ov - 6; x += 13) {
    g.fillStyle = C.roofDark;
    g.beginPath();
    g.arc(x, yEave - 2, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(200,226,236,0.25)';
    g.beginPath();
    g.arc(x - 1, yEave - 3.5, 1.6, 0, Math.PI * 2);
    g.fill();
  }
  // ridge cap + end ornaments
  pen.tube([{ x: x0 + inset - 4, y: ridgeY }, { x: x1 - inset + 4, y: ridgeY }], 8, C.roofDark);
  pen.blob(ellipsePts(x0 + inset - 6, ridgeY - 3, 8, 9, 10), C.roofDark, { width: 2 });
  pen.blob(ellipsePts(x1 - inset + 6, ridgeY - 3, 8, 9, 10), C.roofDark, { width: 2 });
}

/** Door curtain registered for live sway; a dark doorway is painted behind it. */
/** @param {Ctx} g @param {Fx} fx @param {number} x @param {number} y @param {number} w @param {number} h @param {string} col */
function paintDoor(g, fx, x, y, w, h, col) {
  const gr = g.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, '#5A3A2A');
  gr.addColorStop(1, '#F2B062');
  g.fillStyle = C.woodDark;
  g.fillRect(x - 4, y - 4, w + 8, h + 4);
  g.fillStyle = gr;
  g.fillRect(x, y, w, h);
  fx.noren.push({ x, y, w, h: h * 0.6, c: col, s: x * 0.01 });
  fx.glows.push({ x: x + w / 2, y: y + h * 0.75, r: w * 1.1, a: 0.35, s: x * 0.02 });
}

/**
 * Wooden townhouse: tiled roof, plank wall, lit windows, maybe a curtained door,
 * lanterns under the eaves and a steaming chimney.
 * @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd
 * @param {number} x0 @param {number} x1 @param {number} yG ground line @param {number} yT roof top
 * @param {{bath?:boolean, door?:boolean, chimney?:boolean, cat?:boolean}} [opt]
 */
function paintHouse(g, pen, fx, rnd, x0, x1, yG, yT, opt = {}) {
  const w = x1 - x0;
  const h = yG - yT;
  const wallH = Math.max(34, Math.min(118, h * 0.46));
  const yEave = yG - wallH;
  shadow(g, (x0 + x1) / 2, yG + 4, w * 0.56, 12);
  // wall
  const wg = g.createLinearGradient(0, yEave, 0, yG);
  wg.addColorStop(0, C.woodDark);
  wg.addColorStop(0.35, C.wood);
  wg.addColorStop(1, C.woodLight);
  inkPoly(g, pen, [{ x: x0 + 6, y: yEave - 6 }, { x: x1 - 6, y: yEave - 6 }, { x: x1 - 6, y: yG }, { x: x0 + 6, y: yG }], wg, 3);
  g.strokeStyle = 'rgba(20,12,10,0.28)';
  g.lineWidth = 1.2;
  for (let x = x0 + 18; x < x1 - 10; x += 13) {
    g.beginPath();
    g.moveTo(x, yEave);
    g.lineTo(x, yG - 8);
    g.stroke();
  }
  g.fillStyle = '#35505A';
  g.fillRect(x0 + 6, yG - 8, w - 12, 8);
  // openings
  if (wallH > 46) {
    const slots = Math.max(1, Math.floor((w - 24) / 58));
    const doorAt = opt.door !== false && w > 130 ? Math.floor(rnd() * slots) : -1;
    const sw = (w - 24) / slots;
    const winH = Math.min(46, wallH - 34);
    for (let i = 0; i < slots; i++) {
      const sx = x0 + 12 + i * sw;
      if (i === doorAt) {
        const dw = Math.min(54, sw - 10);
        paintDoor(g, fx, sx + (sw - dw) / 2, yG - Math.min(64, wallH - 14), dw, Math.min(64, wallH - 14) - 8, opt.bath ? P.vermillion : rnd() < 0.5 ? '#2F4F7A' : P.vermillion);
      } else {
        const lit = rnd() < 0.78;
        const ww = Math.min(40, sw - 16);
        const wy = yEave + Math.max(12, (wallH - winH) * 0.35);
        paintWindow(g, sx + (sw - ww) / 2, wy, ww, winH, lit, !!opt.cat && i === slots - 1);
        if (lit) fx.glows.push({ x: sx + sw / 2, y: wy + winH / 2, r: 60, a: 0.28, s: sx * 0.03 });
      }
    }
  }
  paintRoof(g, pen, x0, x1, yT, yEave, opt.bath ? '#2C5660' : ROOF_TINTS[Math.floor(rnd() * ROOF_TINTS.length)]);
  if (w > 170 && yEave - yT > 70 && rnd() < 0.4) {
    // small gable dormer facing the street
    const cx = x0 + w * (0.35 + rnd() * 0.3);
    const gy = yT + 8 + (yEave - yT) * 0.55;
    inkPoly(g, pen, [{ x: cx - 34, y: gy }, { x: cx, y: gy - 34 }, { x: cx + 34, y: gy }], '#5A3F35', 2.5);
    inkPoly(g, pen, [{ x: cx - 22, y: gy - 2 }, { x: cx, y: gy - 22 }, { x: cx + 22, y: gy - 2 }], '#E9DCC0', 1.5);
    pen.line([{ x: cx - 40, y: gy + 4 }, { x: cx, y: gy - 38 }, { x: cx + 40, y: gy + 4 }], { color: C.roofDark, width: 5 });
  }
  if (opt.chimney ?? rnd() < 0.3) {
    const cx = x0 + w * (0.3 + rnd() * 0.4);
    const cy = yT + 14 + (yEave - yT) * 0.2;
    inkPoly(g, pen, [{ x: cx - 11, y: cy - 34 }, { x: cx + 11, y: cy - 34 }, { x: cx + 12, y: cy + 8 }, { x: cx - 12, y: cy + 8 }], '#5E5551', 2.5);
    inkPoly(g, pen, [{ x: cx - 15, y: cy - 40 }, { x: cx + 15, y: cy - 40 }, { x: cx + 15, y: cy - 32 }, { x: cx - 15, y: cy - 32 }], C.roofDark, 2.5);
    fx.steam.push({ x: cx, y: cy - 44, s: opt.bath ? 1.3 : 0.9, k: rnd() });
  }
  if (w > 110 && wallH > 40) {
    const ly = yEave + 20;
    if (rnd() < 0.85) {
      lightPool(g, x0 + 22, yG + 16);
      paintLantern(g, pen, fx, x0 + 22, ly, 1.05, rnd() < 0.6 ? P.vermillion : P.lantern);
    }
    if (w > 190 && rnd() < 0.7) {
      lightPool(g, x1 - 22, yG + 16);
      paintLantern(g, pen, fx, x1 - 22, ly, 1.05, rnd() < 0.6 ? P.vermillion : P.lantern);
    }
  }
  // shop dressing: banners, an umbrella left out in the rain, a sign board
  const r1 = rnd();
  if (wallH > 60 && r1 < 0.3) paintBanner(g, pen, x1 - 4, yG, Math.min(120, h * 0.75), rnd() < 0.5 ? P.vermillion : rnd() < 0.5 ? '#2F4F7A' : '#E9DCC0');
  else if (wallH > 60 && r1 < 0.55) paintUmbrella(g, pen, x0 + w * (0.25 + rnd() * 0.5), yG + 2, rnd() < 0.5 ? P.vermillion : '#3E6A8A');
  if (wallH > 60 && rnd() < 0.4) {
    const bx = x0 + w * (0.3 + rnd() * 0.4);
    inkPoly(g, pen, [{ x: bx - 30, y: yEave + 2 }, { x: bx + 30, y: yEave + 2 }, { x: bx + 30, y: yEave + 18 }, { x: bx - 30, y: yEave + 18 }], '#6B4A3C', 2);
    g.fillStyle = '#F6EEDC';
    for (let k = 0; k < 3; k++) g.fillRect(bx - 20 + k * 15, yEave + 7, 9, 6);
  }
}

/** Warm light spilled onto the wet ground under a lantern. @param {Ctx} g @param {number} x @param {number} y */
function lightPool(g, x, y) {
  g.save();
  g.translate(x, y);
  g.scale(1, 0.38);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, 90);
  rg.addColorStop(0, 'rgba(242,158,76,0.32)');
  rg.addColorStop(1, 'rgba(242,158,76,0)');
  g.fillStyle = rg;
  g.fillRect(-90, -90, 180, 180);
  g.restore();
}

/** Tall shop banner on a pole. @param {Ctx} g @param {Pen} pen @param {number} x @param {number} y @param {number} h @param {string} col */
function paintBanner(g, pen, x, y, h, col) {
  pen.line([{ x, y }, { x, y: y - h }], { color: '#2C1F1C', width: 3 });
  pen.line([{ x, y: y - h }, { x: x - 22, y: y - h }], { color: '#2C1F1C', width: 2.5 });
  inkPoly(g, pen, [{ x: x - 22, y: y - h + 2 }, { x: x - 3, y: y - h + 2 }, { x: x - 3, y: y - h * 0.3 }, { x: x - 22, y: y - h * 0.3 + 4 }], col, 2);
  g.fillStyle = col === '#E9DCC0' ? P.vermillion : '#FBF5E9';
  for (let k = 0; k < 3; k++) g.fillRect(x - 16, y - h + 12 + k * h * 0.17, 8, h * 0.09);
}

/** Paper umbrella left open in the rain. @param {Ctx} g @param {Pen} pen @param {number} x @param {number} y @param {string} col */
function paintUmbrella(g, pen, x, y, col) {
  shadow(g, x, y + 2, 30, 7);
  pen.line([{ x: x + 2, y }, { x: x - 6, y: y - 34 }], { color: '#2C1F1C', width: 2.5 });
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    pts.push({ x: x - 6 + Math.cos(a) * 32, y: y - 30 + Math.sin(a) * 20 });
  }
  pts.push({ x: x + 22, y: y - 26 }, { x: x - 34, y: y - 26 });
  inkPoly(g, pen, pts, col, 2.2);
  g.strokeStyle = 'rgba(255,240,220,0.5)';
  g.lineWidth = 1.2;
  for (let i = 1; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    g.beginPath();
    g.moveTo(x - 6, y - 50);
    g.lineTo(x - 6 + Math.cos(a) * 30, y - 30 + Math.sin(a) * 18);
    g.stroke();
  }
}

/** Stone lantern (toro) with a lit firebox. @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {number} x @param {number} y @param {number} s */
function paintStoneLantern(g, pen, fx, x, y, s) {
  shadow(g, x, y + 2, 26 * s, 8 * s);
  const st = '#6F8187';
  const dk = '#4C5E64';
  inkPoly(g, pen, [{ x: x - 20 * s, y: y }, { x: x + 20 * s, y: y }, { x: x + 15 * s, y: y - 10 * s }, { x: x - 15 * s, y: y - 10 * s }], dk, 2.5);
  inkPoly(g, pen, [{ x: x - 7 * s, y: y - 10 * s }, { x: x + 7 * s, y: y - 10 * s }, { x: x + 6 * s, y: y - 40 * s }, { x: x - 6 * s, y: y - 40 * s }], st, 2.5);
  inkPoly(g, pen, [{ x: x - 16 * s, y: y - 40 * s }, { x: x + 16 * s, y: y - 40 * s }, { x: x + 13 * s, y: y - 64 * s }, { x: x - 13 * s, y: y - 64 * s }], st, 2.5);
  g.fillStyle = '#FFD58A';
  g.fillRect(x - 7 * s, y - 59 * s, 14 * s, 14 * s);
  inkPoly(g, pen, [{ x: x - 27 * s, y: y - 62 * s }, { x: x + 27 * s, y: y - 62 * s }, { x: x + 6 * s, y: y - 80 * s }, { x: x - 6 * s, y: y - 80 * s }], dk, 2.5);
  pen.blob(ellipsePts(x, y - 84 * s, 5 * s, 6 * s, 8), st, { width: 2 });
  fx.glows.push({ x, y: y - 52 * s, r: 64 * s, a: 0.7, s: x * 0.02 });
}

/** Cloud-pruned pine. @param {Ctx} g @param {Pen} pen @param {number} x @param {number} y @param {number} s */
function paintPine(g, pen, x, y, s) {
  shadow(g, x, y, 70 * s, 16 * s);
  pen.tube([{ x, y }, { x: x - 10 * s, y: y - 60 * s }, { x: x + 12 * s, y: y - 120 * s }, { x: x - 4 * s, y: y - 170 * s }], 14 * s, '#4A3A34');
  const pads = [
    [-50, -90, 52, 24], [44, -132, 48, 22], [-20, -175, 58, 26], [30, -60, 40, 18],
  ];
  for (const [dx, dy, rx, ry] of pads) {
    const cx = x + dx * s;
    const cy = y + dy * s;
    const gr = g.createLinearGradient(cx, cy - ry * s, cx, cy + ry * s);
    gr.addColorStop(0, C.pineLight);
    gr.addColorStop(1, C.pine);
    pen.blob(ellipsePts(cx, cy, rx * s, ry * s, 16, (a) => 1 + 0.12 * Math.sin(a * 5 + dx)), gr, { width: 2.5 });
    g.strokeStyle = 'rgba(160,210,190,0.25)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.ellipse(cx, cy - ry * s * 0.3, rx * s * 0.7, ry * s * 0.4, 0, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  }
}

/** Round wooden deck under a nap spot. @param {Ctx} g @param {Pen} pen @param {number} x @param {number} y */
function paintDeck(g, pen, x, y) {
  shadow(g, x, y + 14, 92, 30, 'rgba(6,18,24,0.45)');
  const gr = g.createLinearGradient(x, y - 26, x, y + 34);
  gr.addColorStop(0, '#8A6A55');
  gr.addColorStop(1, '#5B4338');
  const pts = ellipsePts(x, y + 6, 86, 30, 22);
  pen.blob(pts, gr, { width: 2.5 });
  g.save();
  g.beginPath();
  g.ellipse(x, y + 6, 84, 28, 0, 0, Math.PI * 2);
  g.clip();
  g.strokeStyle = 'rgba(40,24,18,0.4)';
  g.lineWidth = 1.5;
  for (let k = -70; k <= 70; k += 18) {
    g.beginPath();
    g.moveTo(x + k, y - 30);
    g.lineTo(x + k + 6, y + 40);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,220,170,0.12)';
  g.fillRect(x - 90, y - 26, 180, 12);
  g.restore();
}

/** Grates in the stone that leak bathhouse steam. @param {Ctx} g @param {Fx} fx @param {number} x @param {number} y @param {() => number} rnd */
function paintVent(g, fx, x, y, rnd) {
  g.fillStyle = '#16282E';
  g.beginPath();
  g.roundRect(x - 26, y - 10, 52, 20, 5);
  g.fill();
  g.strokeStyle = 'rgba(160,200,214,0.35)';
  g.lineWidth = 2;
  g.stroke();
  g.beginPath();
  for (let k = -18; k <= 18; k += 9) {
    g.moveTo(x + k, y - 7);
    g.lineTo(x + k, y + 7);
  }
  g.stroke();
  fx.steam.push({ x, y: y - 8, s: 0.8, k: rnd() });
}

/** Weeping willow: trunk + canopy are static, strands sway live. @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {number} x @param {number} y @param {number} s */
function paintWillow(g, pen, fx, x, y, s) {
  shadow(g, x, y + 4, 80 * s, 18 * s);
  pen.tube([{ x, y }, { x: x + 6 * s, y: y - 70 * s }, { x: x - 8 * s, y: y - 140 * s }], 16 * s, '#4A3A34');
  const gr = g.createRadialGradient(x - 20 * s, y - 170 * s, 4, x, y - 150 * s, 110 * s);
  gr.addColorStop(0, '#7EA877');
  gr.addColorStop(1, '#335A44');
  pen.blob(ellipsePts(x, y - 152 * s, 96 * s, 46 * s, 18, (a) => 1 + 0.1 * Math.sin(a * 6)), gr, { width: 2.5 });
  fx.willows.push({ x, y: y - 140 * s, s });
}

/** Lily pad, sometimes with a lotus bud. @param {Ctx} g @param {Pen} pen @param {number} x @param {number} y @param {number} r @param {number} rot @param {boolean} flower */
function paintLily(g, pen, x, y, r, rot, flower) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1, 0.55);
  const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
  gr.addColorStop(0, C.lilyLight);
  gr.addColorStop(1, C.lily);
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(0, 0);
  g.arc(0, 0, r, 0.35, Math.PI * 2 - 0.05);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(30,50,34,0.7)';
  g.lineWidth = 2;
  g.stroke();
  g.strokeStyle = 'rgba(200,240,190,0.25)';
  g.lineWidth = 1;
  for (let a = 0.8; a < 6; a += 0.9) {
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
    g.stroke();
  }
  g.restore();
  if (flower) {
    pen.blob(ellipsePts(x + 2, y - 6, 7, 9, 10, (a) => 1 + 0.25 * Math.cos(a * 3)), '#F4B7C2', { width: 1.6 });
    pen.blob(ellipsePts(x + 2, y - 8, 3, 4, 8), '#FFE58A', { width: 1 });
  }
}

/** Offset a dense polyline by a varying half-width. @param {Pt[]} pts @param {(i:number)=>number} off */
function offsetLine(pts, off) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const o = off(i);
    return { x: p.x - (dy / l) * o, y: p.y + (dx / l) * o };
  });
}

/** River with stone banks, reflections and lily pads. @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {Pt[]} ctrl @param {Pt[]} lane @param {() => number} rnd */
function paintRiver(g, pen, fx, ctrl, lane, rnd) {
  const mid = catmullRom(ctrl, 16);
  const half = (/** @type {number} */ i) => 104 + 10 * Math.sin(i * 0.11);
  const north = offsetLine(mid, (i) => -half(i));
  const south = offsetLine(mid, (i) => half(i));
  // bank shadow + water
  g.beginPath();
  g.moveTo(north[0].x, north[0].y);
  for (const p of north) g.lineTo(p.x, p.y);
  for (let i = south.length - 1; i >= 0; i--) g.lineTo(south[i].x, south[i].y);
  g.closePath();
  const gr = g.createLinearGradient(0, 400, 0, 900);
  gr.addColorStop(0, '#174A5A');
  gr.addColorStop(0.5, '#22606F');
  gr.addColorStop(1, '#2C7383');
  g.fillStyle = gr;
  g.fill();
  g.save();
  g.clip();
  // moonless sky glow on the water + soft current streaks + warm reflections
  for (let i = 0; i < mid.length; i += 12) {
    const p = mid[i];
    const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 160);
    rg.addColorStop(0, 'rgba(111,154,174,0.22)');
    rg.addColorStop(1, 'rgba(111,154,174,0)');
    g.fillStyle = rg;
    g.fillRect(p.x - 160, p.y - 160, 320, 320);
  }
  g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const p = mid[Math.floor(rnd() * mid.length)];
    const ox = (rnd() - 0.5) * 60;
    const oy = (rnd() - 0.5) * 170;
    g.strokeStyle = rnd() < 0.2 ? 'rgba(242,158,76,0.18)' : 'rgba(150,200,214,0.12)';
    g.lineWidth = 2 + rnd() * 3;
    g.beginPath();
    g.moveTo(p.x + ox - 30, p.y + oy);
    g.lineTo(p.x + ox + 30, p.y + oy - 4);
    g.stroke();
  }
  // a shadow band along the north bank (the bank wall)
  g.strokeStyle = 'rgba(4,16,22,0.45)';
  g.lineWidth = 26;
  g.beginPath();
  g.moveTo(north[0].x, north[0].y + 8);
  for (const p of north) g.lineTo(p.x, p.y + 8);
  g.stroke();
  g.restore();
  // bank stones
  for (const side of [north, south]) {
    g.strokeStyle = '#4F666D';
    g.lineWidth = 16;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(side[0].x, side[0].y);
    for (const p of side) g.lineTo(p.x, p.y);
    g.stroke();
    for (let i = 0; i < side.length; i += 3) {
      const p = side[i];
      const r = 9 + rnd() * 9;
      const shade = 0.55 + rnd() * 0.25;
      pen.blob(ellipsePts(p.x + (rnd() - 0.5) * 8, p.y + (rnd() - 0.5) * 6, r * 1.3, r * 0.8, 9), `rgba(${Math.round(120 * shade)},${Math.round(150 * shade)},${Math.round(156 * shade)},1)`, { width: 2 });
    }
  }
  // lily pads away from the boat lane
  const laneT = new Track(lane, 8);
  let placed = 0;
  for (let tries = 0; tries < 400 && placed < 34; tries++) {
    const i = Math.floor(rnd() * mid.length);
    const p = mid[i];
    const off = (rnd() - 0.5) * 2 * (half(i) - 18);
    const a = mid[Math.max(0, i - 1)];
    const b = mid[Math.min(mid.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const q = { x: p.x - ((b.y - a.y) / l) * off, y: p.y + ((b.x - a.x) / l) * off };
    if (q.x < 20 || q.x > W - 20 || laneT.distanceTo(q) < 62) continue;
    paintLily(g, pen, q.x, q.y, 13 + rnd() * 9, rnd() * 6, rnd() < 0.18);
    placed++;
  }
  for (let i = 0; i < mid.length; i += 5) fx.ripples.push({ x: mid[i].x + (rnd() - 0.5) * 120, y: mid[i].y + (rnd() - 0.5) * 120, s: rnd() });
}

// ---------------------------------------------------------------- mid-layer painters (drawn over the path)

/** Wet cobbles + lantern reflections laid onto a path. @param {Ctx} g @param {Pt[]} control @param {Fx} fx @param {() => number} rnd */
function paintCobbles(g, control, fx, rnd) {
  const tr = new Track(control, 16);
  let row = 0;
  for (let d = 8; d < tr.length; d += 19, row++) {
    const p = tr.at(d);
    if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) continue;
    const l = Math.hypot(p.dx, p.dy) || 1;
    const ux = p.dx / l;
    const uy = p.dy / l;
    for (let k = -2; k <= 2; k++) {
      const lat = k * 17 + (row % 2 ? 8.5 : 0);
      if (Math.abs(lat) > 38) continue;
      const cx = p.x - uy * lat;
      const cy = p.y + ux * lat;
      const v = rnd();
      g.save();
      g.translate(cx, cy);
      g.rotate(Math.atan2(uy, ux));
      g.fillStyle = `rgba(${Math.round(150 + v * 40)},${Math.round(170 + v * 34)},${Math.round(172 + v * 30)},0.32)`;
      g.strokeStyle = 'rgba(52,72,78,0.45)';
      g.lineWidth = 1.3;
      g.beginPath();
      g.roundRect(-8, -7, 16, 14, 5);
      g.fill();
      g.stroke();
      g.fillStyle = 'rgba(233,241,242,0.28)';
      g.fillRect(-5, -5, 7, 2);
      g.restore();
    }
  }
  // warm lantern reflections on the wet stones
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const gl of fx.glows) {
    if (gl.a < 0.5) continue;
    const dd = tr.distanceTo(gl);
    if (dd > 140) continue;
    const rg = g.createRadialGradient(gl.x, gl.y + 50, 0, gl.x, gl.y + 50, 70);
    rg.addColorStop(0, 'rgba(242,158,76,0.22)');
    rg.addColorStop(1, 'rgba(242,158,76,0)');
    g.fillStyle = rg;
    g.save();
    g.translate(gl.x, gl.y + 50);
    g.scale(0.55, 1);
    g.translate(-gl.x, -(gl.y + 50));
    g.fillRect(gl.x - 70, gl.y - 20, 140, 140);
    g.restore();
  }
  g.restore();
  for (let d = 30; d < tr.length; d += 90) {
    const p = tr.at(d);
    fx.ripples.push({ x: p.x + (rnd() - 0.5) * 50, y: p.y + (rnd() - 0.5) * 40, s: rnd() });
  }
}

/** Stretch of a track as a dense polyline. @param {Track} tr @param {number} d0 @param {number} d1 */
function stretch(tr, d0, d1) {
  /** @type {(Pt & {dx:number, dy:number})[]} */
  const out = [];
  for (let d = d0; d <= d1; d += 6) out.push(tr.at(d));
  return out;
}

/**
 * Bridge deck carrying a path over water or another floor.
 * @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {Track} tr @param {number} d0 @param {number} d1 @param {'stone'|'wood'} kind
 */
function paintBridge(g, pen, fx, tr, d0, d1, kind) {
  const pts = stretch(tr, d0, d1);
  const stroke = (/** @type {Pt[]} */ p, /** @type {number} */ w, /** @type {string} */ col) => {
    g.beginPath();
    g.moveTo(p[0].x, p[0].y);
    for (const q of p) g.lineTo(q.x, q.y);
    g.lineWidth = w;
    g.strokeStyle = col;
    g.stroke();
  };
  g.save();
  g.lineCap = 'butt';
  g.lineJoin = 'round';
  stroke(pts.map((p) => ({ x: p.x + 10, y: p.y + 22 })), 128, 'rgba(4,14,20,0.4)');
  if (kind === 'stone' && Math.abs(pts[Math.floor(pts.length / 2)].dx) > Math.abs(pts[Math.floor(pts.length / 2)].dy) * 1.2) {
    // an east-west span shows its arched side face, with a dark opening over the water
    const mp = pts[Math.floor(pts.length / 2)];
    const ml = Math.hypot(mp.dx, mp.dy) || 1;
    const sgn = mp.dx / ml >= 0 ? 1 : -1;
    const face = pts.map((p) => {
      const l = Math.hypot(p.dx, p.dy) || 1;
      return { x: p.x - (p.dy / l) * 54 * sgn, y: p.y + (p.dx / l) * 54 * sgn };
    });
    const drop = 40;
    inkPoly(g, pen, [...face, ...face.slice().reverse().map((q) => ({ x: q.x, y: q.y + drop }))], '#5C7076', 3);
    const i0 = Math.floor(face.length * 0.22);
    const i1 = Math.floor(face.length * 0.78);
    const arch = [];
    for (let i = i0; i <= i1; i++) arch.push({ x: face[i].x, y: face[i].y + drop - 30 * Math.sin((Math.PI * (i - i0)) / (i1 - i0)) });
    for (let i = i1; i >= i0; i--) arch.push({ x: face[i].x, y: face[i].y + drop });
    inkPoly(g, pen, arch, '#0B2730', 2);
  }
  stroke(pts, 120, INK);
  stroke(pts, 114, kind === 'wood' ? '#5E4234' : '#56686E');
  stroke(pts, 96, kind === 'wood' ? '#9A7458' : '#8C9EA2');
  // deck seams across the walkway
  for (let i = 0; i < pts.length; i += kind === 'wood' ? 2 : 3) {
    const p = pts[i];
    const l = Math.hypot(p.dx, p.dy) || 1;
    const nx = -p.dy / l;
    const ny = p.dx / l;
    g.strokeStyle = kind === 'wood' ? 'rgba(60,36,24,0.45)' : 'rgba(40,56,62,0.4)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(p.x + nx * 47, p.y + ny * 47);
    g.lineTo(p.x - nx * 47, p.y - ny * 47);
    g.stroke();
  }
  // the arch: lighter crown in the middle of the span
  const m = pts[Math.floor(pts.length / 2)];
  const rg = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, (d1 - d0) * 0.45);
  rg.addColorStop(0, 'rgba(233,241,242,0.2)');
  rg.addColorStop(1, 'rgba(233,241,242,0)');
  g.fillStyle = rg;
  g.fillRect(m.x - 200, m.y - 200, 400, 400);
  g.restore();
  // railings / parapets
  for (const side of [-1, 1]) {
    const rail = pts.map((p) => {
      const l = Math.hypot(p.dx, p.dy) || 1;
      return { x: p.x - (p.dy / l) * 56 * side, y: p.y + (p.dx / l) * 56 * side };
    });
    if (kind === 'stone') pen.tube(rail, 14, '#9AAAB0');
    else pen.tube(rail, 7, P.vermillion);
    const step = kind === 'stone' ? 9 : 7;
    for (let i = 0; i < rail.length; i += step) {
      const q = rail[i];
      pen.blob(ellipsePts(q.x, q.y - 3, 7, 7, 8), kind === 'stone' ? '#B6C2C6' : '#E0644E', { width: 2 });
    }
    const end = rail[rail.length - 1];
    const start = rail[0];
    for (const q of [start, end]) {
      pen.blob(ellipsePts(q.x, q.y - 6, 9, 10, 10), kind === 'stone' ? '#8C9AA0' : P.vermillion, { width: 2.2 });
      if (kind === 'stone') {
        g.fillStyle = '#FFD58A';
        g.beginPath();
        g.arc(q.x, q.y - 8, 4, 0, Math.PI * 2);
        g.fill();
        fx.midGlows.push({ x: q.x, y: q.y - 8, r: 46, a: 0.7, s: q.x * 0.02 });
      }
    }
  }
}

/** Boat lane on the river (repaints the water route over the cobble stroke). @param {Ctx} g @param {Pt[]} control */
function paintLane(g, control) {
  const pts = catmullRom(control, 20);
  const stroke = (/** @type {number} */ w, /** @type {string|CanvasGradient} */ col, /** @type {number[]} */ dash = []) => {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) g.lineTo(p.x, p.y);
    g.setLineDash(dash);
    g.lineWidth = w;
    g.strokeStyle = col;
    g.stroke();
  };
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  stroke(100, '#86B8C4');
  stroke(92, '#3F8193');
  stroke(60, 'rgba(110,170,186,0.55)');
  stroke(22, 'rgba(160,210,222,0.3)');
  g.restore();
}

// ---------------------------------------------------------------- scenes

/**
 * Fill a horizontal band with townhouses, leaving gaps around nap spots.
 * @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd @param {Layout} L
 * @param {{x0:number, x1:number, yT:number, yG:number}} band @param {{cat?:boolean, bath?:boolean}} [opt]
 */
function houseRow(g, pen, fx, rnd, L, band, opt = {}) {
  /** @type {[number, number][]} */
  let spans = [[band.x0, band.x1]];
  for (const s of L.spots) {
    if (s.y < band.yT - 40 || s.y > band.yG + 70) continue;
    const a = s.x - 108;
    const b = s.x + 108;
    spans = spans.flatMap(([u, v]) => (b <= u || a >= v ? [[u, v]] : /** @type {[number,number][]} */ ([[u, a], [b, v]]).filter(([p, q]) => q - p > 70)));
  }
  let catDone = !opt.cat;
  for (const [u, v] of spans) {
    let x = u;
    while (v - x > 70) {
      let w = 150 + rnd() * 120;
      if (v - x - w < 90) w = v - x;
      const yT = band.yT + rnd() * 16;
      paintHouse(g, pen, fx, rnd, x + 4, x + w - 4, band.yG, yT, { cat: !catDone && w > 170, bath: opt.bath });
      if (w > 170) catDone = true;
      x += w;
    }
  }
}

/** Scatter puddles, vents and moss where nothing else lives. */
/** @param {Ctx} g @param {Fx} fx @param {() => number} rnd @param {Layout} L @param {(p:Pt, r:number)=>boolean} free @param {number} n */
function scatterGround(g, fx, rnd, L, free, n) {
  let placed = 0;
  for (let tries = 0; tries < 500 && placed < n; tries++) {
    const p = { x: 40 + rnd() * (W - 80), y: 110 + rnd() * (H - 140) };
    const r = 26 + rnd() * 34;
    if (!free(p, r)) continue;
    if (rnd() < 0.82) paintPuddle(g, fx, p.x, p.y, r, rnd);
    else paintVent(g, fx, p.x, p.y, rnd);
    placed++;
  }
}

/** @param {Layout} L @param {{x0:number,x1:number,y0:number,y1:number}[]} blocks @param {Track[]} [extra] */
function freeTest(L, blocks, extra = []) {
  const tracks = [...L.paths.map((p) => new Track(p, 10)), ...extra];
  return (/** @type {Pt} */ p, /** @type {number} */ r) =>
    tracks.every((t) => t.distanceTo(p) > 64 + r) &&
    L.spots.every((s) => Math.hypot(s.x - p.x, s.y - p.y) > 100 + r) &&
    Math.hypot(L.stash.x - p.x, L.stash.y - p.y) > 150 + r &&
    blocks.every((b) => p.x + r < b.x0 || p.x - r > b.x1 || p.y + r * 0.4 < b.y0 || p.y - r * 0.4 > b.y1);
}

/** @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd @param {Layout} L */
function scene31(g, pen, fx, rnd, L) {
  const bands = [
    { x0: -20, x1: W + 20, yT: -24, yG: 190 },
    { x0: -20, x1: 1350, yT: 300, yG: 494 },
    { x0: 530, x1: W + 20, yT: 604, yG: 796 },
    { x0: -20, x1: W + 20, yT: 912, yG: 1100 },
  ];
  const blocks = bands.map((b) => ({ x0: b.x0, x1: b.x1, y0: b.yT, y1: b.yG + 10 }));
  scatterGround(g, fx, rnd, L, freeTest(L, blocks), 9);
  paintPine(g, pen, 120, 860, 0.9);
  paintStoneLantern(g, pen, fx, 205, 640, 0.9);
  paintStoneLantern(g, pen, fx, 1835, 520, 0.85);
  for (const b of bands) houseRow(g, pen, fx, rnd, L, b, { cat: b.yT > 250 && b.yT < 400 });
}

/** @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd @param {Layout} L */
function scene32(g, pen, fx, rnd, L) {
  const riverT = new Track(RIVER32, 10);
  paintRiver(g, pen, fx, RIVER32, L.paths[0], rnd);
  fx.lane = catmullRom(L.paths[0], 10);
  // the grand old bathhouse on the north-west bank
  paintHouse(g, pen, fx, rnd, 40, 330, 470, 70, { bath: true, chimney: true, door: true });
  paintHouse(g, pen, fx, rnd, 340, 560, 430, 150, { bath: true, chimney: true, cat: true });
  // town along the top edge
  houseRow(g, pen, fx, rnd, L, { x0: 900, x1: W + 20, yT: -24, yG: 230 });
  houseRow(g, pen, fx, rnd, L, { x0: -20, x1: 560, yT: -40, yG: 60 });
  // south bank houses
  houseRow(g, pen, fx, rnd, L, { x0: 640, x1: W + 20, yT: 905, yG: 1100 });
  houseRow(g, pen, fx, rnd, L, { x0: -20, x1: 330, yT: 940, yG: 1100 });
  // riverside garden in the wedge between the road and the river
  paintWillow(g, pen, fx, 1060, 470, 0.75);
  paintStoneLantern(g, pen, fx, 1335, 560, 0.75);
  paintStoneLantern(g, pen, fx, 300, 590, 0.8);
  paintWillow(g, pen, fx, 1500, 800, 0.8);
  paintWillow(g, pen, fx, 140, 820, 0.7);
  // little wooden pier under the Snack Stash
  inkPoly(g, pen, [{ x: 1610, y: 400 }, { x: 1860, y: 395 }, { x: 1870, y: 500 }, { x: 1620, y: 505 }], '#7A5844', 3);
  g.strokeStyle = 'rgba(40,24,18,0.45)';
  g.lineWidth = 2;
  for (let x = 1640; x < 1860; x += 24) {
    g.beginPath();
    g.moveTo(x, 400);
    g.lineTo(x + 2, 503);
    g.stroke();
  }
  for (const x of [1625, 1745, 1860]) pen.blob(ellipsePts(x, 512, 7, 12, 8), '#4B3631', { width: 2 });
  const blocks = [
    { x0: 0, x1: 570, y0: 0, y1: 480 },
    { x0: 880, x1: W, y0: 0, y1: 240 },
    { x0: 620, x1: W, y0: 900, y1: H },
    { x0: 0, x1: 340, y0: 930, y1: H },
    { x0: 1600, x1: 1880, y0: 380, y1: 520 },
  ];
  scatterGround(g, fx, rnd, L, (p, r) => freeTest(L, blocks)(p, r) && riverT.distanceTo(p) > 130 + r, 7);
}

/** @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd @param {Layout} L */
function scene33(g, pen, fx, rnd, L) {
  // the grand bathhouse: floors are walls between the walkways
  /** @param {Pt[]} poly @param {number} y0 @param {number} y1 */
  const wall = (poly, y0, y1) => {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, C.woodDark);
    gr.addColorStop(0.2, C.wood);
    gr.addColorStop(1, C.woodLight);
    inkPoly(g, pen, poly, gr, 3);
    g.save();
    g.beginPath();
    g.moveTo(poly[0].x, poly[0].y);
    for (const p of poly) g.lineTo(p.x, p.y);
    g.closePath();
    g.clip();
    g.strokeStyle = 'rgba(20,12,10,0.25)';
    g.lineWidth = 1.2;
    for (let x = 0; x < W; x += 13) {
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x, y1);
      g.stroke();
    }
    // vermillion pillars + a beam
    g.fillStyle = P.vermillion;
    for (let x = 380; x < 1460; x += 150) g.fillRect(x, y0, 12, y1 - y0);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = 380; x < 1460; x += 150) g.fillRect(x + 8, y0, 4, y1 - y0);
    g.fillStyle = '#7A2E26';
    g.fillRect(0, y0, W, 10);
    g.restore();
  };
  wall([{ x: 470, y: 392 }, { x: 1330, y: 392 }, { x: 1376, y: 588 }, { x: 610, y: 588 }], 392, 588);
  wall([{ x: 330, y: 694 }, { x: 1370, y: 694 }, { x: 1250, y: 804 }, { x: 330, y: 804 }], 694, 804);
  // windows and doors along the floors (skipping the balconies under the spots)
  /** @param {number} y @param {number} h @param {number} x0 @param {number} x1 @param {boolean} doors */
  const openings = (y, h, x0, x1, doors) => {
    for (let x = x0; x < x1; x += 75) {
      if (L.spots.some((s) => Math.abs(s.x - (x + 20)) < 110 && Math.abs(s.y - (y + h / 2)) < 120)) continue;
      if (doors && hash2(x, 3) < 0.4) paintDoor(g, fx, x, y + h - 62, 44, 58, hash2(x, 5) < 0.5 ? P.vermillion : '#2F4F7A');
      else {
        paintWindow(g, x, y + 8, 40, h - 24, hash2(x, 7) < 0.85, hash2(x, 9) < 0.08);
        fx.glows.push({ x: x + 20, y: y + h / 2, r: 60, a: 0.3, s: x * 0.03 });
      }
    }
  };
  openings(430, 120, 640, 1300, false);
  openings(718, 80, 360, 1230, true);
  for (let x = 680; x < 1320; x += 150) paintLantern(g, pen, fx, x, 412, 0.9, P.vermillion);
  for (let x = 410; x < 1250; x += 150) paintLantern(g, pen, fx, x, 712, 0.9, P.lantern);
  // the great roof over the top floor
  paintRoof(g, pen, 360, 1460, 40, 286, '#2C5660');
  paintRoof(g, pen, 620, 1200, -40, 120, '#3B4C66');
  // vermillion gable sign
  inkPoly(g, pen, [{ x: 860, y: 100 }, { x: 960, y: 60 }, { x: 1060, y: 100 }, { x: 1040, y: 112 }, { x: 880, y: 112 }], P.vermillion, 3);
  g.fillStyle = '#FFE7B0';
  for (let k = 0; k < 3; k++) {
    g.beginPath();
    g.ellipse(930 + k * 30, 96, 8, 5, 0, 0, Math.PI * 2);
    g.fill();
  }
  for (const [x, y] of [[520, 120], [1330, 140], [760, 10], [1110, 10]]) {
    inkPoly(g, pen, [{ x: x - 13, y: y - 40 }, { x: x + 13, y: y - 40 }, { x: x + 14, y }, { x: x - 14, y }], '#5E5551', 2.5);
    fx.steam.push({ x, y: y - 44, s: 1.4, k: hash2(x, y) });
  }
  // open-air hot spring in the north-east corner
  const pool = ellipsePts(1700, 230, 190, 95, 22, (a) => 1 + 0.08 * Math.sin(a * 4));
  for (const p of pool) pen.blob(ellipsePts(p.x, p.y + 6, 22, 15, 9), '#6A7C82', { width: 2 });
  const pg = g.createRadialGradient(1690, 220, 10, 1700, 230, 190);
  pg.addColorStop(0, '#6FB6BD');
  pg.addColorStop(1, '#2E6E7C');
  pen.blob(ellipsePts(1700, 230, 175, 82, 22, (a) => 1 + 0.08 * Math.sin(a * 4)), pg, { width: 2.5 });
  for (let k = 0; k < 5; k++) fx.steam.push({ x: 1580 + k * 60, y: 230 + Math.sin(k) * 30, s: 1.5, k: k / 5 });
  for (let k = 0; k < 6; k++) fx.ripples.push({ x: 1620 + k * 30, y: 210 + (k % 3) * 22, s: k / 6 });
  // bamboo fence at the bottom edge + garden bits
  for (let x = -10; x < W; x += 16) {
    if (L.spots.some((s) => Math.abs(s.x - x) < 100 && s.y > 900)) continue;
    pen.blob([{ x, y: 1040 }, { x: x + 12, y: 1040 }, { x: x + 12, y: 1090 }, { x, y: 1090 }], hash2(x, 1) < 0.5 ? '#8DA36A' : '#7C9460', { width: 1.6 });
  }
  paintPine(g, pen, 140, 700, 0.85);
  paintPine(g, pen, 1820, 1000, 0.75);
  paintStoneLantern(g, pen, fx, 230, 330, 0.85);
  paintStoneLantern(g, pen, fx, 1500, 960, 0.8);
  const blocks = [
    { x0: 330, x1: 1470, y0: 0, y1: 300 },
    { x0: 450, x1: 1380, y0: 380, y1: 600 },
    { x0: 320, x1: 1380, y0: 680, y1: 810 },
    { x0: 1490, x1: W, y0: 110, y1: 350 },
  ];
  scatterGround(g, fx, rnd, L, freeTest(L, blocks), 8);
}

/** @param {Ctx} g @param {Pen} pen @param {Fx} fx @param {() => number} rnd @param {Layout} L */
function sceneGeneric(g, pen, fx, rnd, L) {
  scatterGround(g, fx, rnd, L, freeTest(L, []), 14);
}

// ---------------------------------------------------------------- cache

/** @type {Map<string, {back:any, mid:any, fx:Fx, lit:any, litKey:number, norenSpr:any[], willowSpr:any[], flick:Fx['glows']}>} */
const cache = new Map();

/** @param {Layout} L */
function getScene(L) {
  const key = L.id + ':' + L.paths.length + ':' + L.spots.length;
  const hit = cache.get(key);
  if (hit) return hit;
  /** @type {Fx} */
  const fx = { glows: [], midGlows: [], steam: [], noren: [], ripples: [], willows: [] };
  const seed = [...L.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
  const rnd = mulberry32(seed);
  const back = makeCanvas(W, H);
  const g = ctxOf(back);
  const pen = new Pen(g);
  pen.begin(0, { boil: true, amp: 1, width: 3 });
  paintGround(g, rnd);
  ({ '3-1': scene31, '3-2': scene32, '3-3': scene33 }[L.id] ?? sceneGeneric)(g, pen, fx, rnd, L);
  for (const s of L.spots) paintDeck(g, pen, s.x, s.y);
  // under-the-stash stone slab
  shadow(g, L.stash.x, L.stash.y + 10, 140, 50, 'rgba(6,18,24,0.35)');

  const mid = makeCanvas(W, H);
  const m = ctxOf(mid);
  const mpen = new Pen(m);
  mpen.begin(0, { boil: true, amp: 1, width: 3 });
  if (L.id === '3-2') {
    paintLane(m, L.paths[0]);
    paintCobbles(m, L.paths[1], fx, rnd);
    const land = new Track(L.paths[1], 16);
    let dc = 0;
    let best = Infinity;
    const riverT = new Track(RIVER32, 10);
    for (let d = 0; d < land.length; d += 5) {
      const dd = riverT.distanceTo(land.at(d));
      if (dd < best) {
        best = dd;
        dc = d;
      }
    }
    paintBridge(m, mpen, fx, land, dc - 150, dc + 150, 'stone');
  } else {
    for (const p of L.paths) paintCobbles(m, p, fx, rnd);
    if (L.id === '3-3') {
      const tr = new Track(L.paths[0], 16);
      // upper walkway crossing over the lower loop
      let dc = 0;
      for (let d = tr.length * 0.7; d < tr.length; d += 4) {
        const p = tr.at(d);
        if (p.x > 1457) {
          dc = d;
          break;
        }
      }
      paintBridge(m, mpen, fx, tr, dc - 130, dc + 120, 'wood');
    }
  }
  const scene = { back, mid, fx, lit: /** @type {any} */ (null), litKey: -1, norenSpr: /** @type {any[]} */ ([]), willowSpr: /** @type {any[]} */ ([]), flick: fx.glows.filter((gl) => gl.a > 0.5).filter((_, i) => i % 2 === 0).slice(0, 18) };
  cache.set(key, scene);
  if (cache.size > 3) cache.delete(cache.keys().next().value ?? '');
  return scene;
}

/**
 * The static layer with the night's darkness, vignette and steady lantern light baked in.
 * Re-composited only when the (quantized) light level changes.
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
  g.fillStyle = `rgba(8,18,34,${(0.04 + q * 0.3).toFixed(3)})`;
  g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(10,24,34,0)');
  vg.addColorStop(1, `rgba(10,24,34,${(0.25 + q * 0.2).toFixed(3)})`);
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  // early in the evening a little rosy dusk still hangs over the rooftops
  const dusk = g.createLinearGradient(0, 0, 0, H * 0.6);
  dusk.addColorStop(0, `rgba(236,170,150,${((1 - q) * 0.16).toFixed(3)})`);
  dusk.addColorStop(1, 'rgba(236,170,150,0)');
  g.fillStyle = dusk;
  g.fillRect(0, 0, W, H * 0.6);
  drawGlows(g, sc.fx.glows, 0, 0.65 + q * 0.45, 0);
  const dark = 0.04 + q * 0.3;
  sc.norenSpr = sc.fx.noren.map((n) => makeNorenSprite(n, dark));
  sc.willowSpr = sc.fx.willows.map((wl) => makeWillowSprite(wl, dark));
  sc.lit = c;
  sc.litKey = q;
  return c;
}

// ---------------------------------------------------------------- live layers

/** @param {number} v */
const frac = (v) => v - Math.floor(v);

/** A door curtain at rest (3 panels + the hot-spring mark), pre-darkened for the night. @param {Fx['noren'][number]} n @param {number} dark */
function makeNorenSprite(n, dark) {
  const c = makeCanvas(Math.ceil(n.w + 6), Math.ceil(n.h + 6));
  const g = ctxOf(c);
  g.translate(3, 2);
  const pw = n.w / 3;
  for (let i = 0; i < 3; i++) {
    const x = i * pw;
    g.beginPath();
    g.moveTo(x + 1, 0);
    g.lineTo(x + pw - 1, 0);
    g.lineTo(x + pw - 1, n.h - 2);
    g.quadraticCurveTo(x + pw / 2, n.h + 2, x + 1, n.h - 2);
    g.closePath();
    g.fillStyle = n.c;
    g.fill();
    g.fillStyle = `rgba(8,18,34,${dark.toFixed(3)})`;
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = INK;
    g.stroke();
  }
  const cx = n.w / 2;
  const cy = n.h * 0.62;
  g.strokeStyle = '#FBF5E9';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy - 2, 6, 0.15, Math.PI - 0.15);
  for (let k = -1; k <= 1; k++) {
    g.moveTo(cx + k * 4, cy - 6);
    g.quadraticCurveTo(cx + k * 4 + 3, cy - 10, cx + k * 4, cy - 14);
  }
  g.stroke();
  return c;
}

/** Willow strands at rest, pre-darkened for the night. @param {Fx['willows'][number]} wl @param {number} dark */
function makeWillowSprite(wl, dark) {
  const k = 1 - dark;
  const w = Math.ceil(200 * wl.s + 40);
  const h = Math.ceil(170 * wl.s + 30);
  const c = makeCanvas(w, h);
  const g = ctxOf(c);
  g.translate(w / 2, 10);
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const u = i / 21;
    const x = (u - 0.5) * 170 * wl.s;
    const y = Math.abs(u - 0.5) * 40 * wl.s;
    const len = (80 + hash2(i, 3) * 70) * wl.s;
    const bend = (hash2(i, 5) - 0.5) * 8 * wl.s;
    g.strokeStyle = i % 3 ? `rgba(${(110 * k) | 0},${(160 * k) | 0},${(110 * k) | 0},0.85)` : `rgba(${(160 * k) | 0},${(200 * k) | 0},${(140 * k) | 0},0.8)`;
    g.lineWidth = 3 * wl.s + 1;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + bend * 0.3, y + len * 0.5, x + bend, y + len);
    g.stroke();
  }
  return c;
}

/** Curtains sway by shearing their cached sprite from the top rail. @param {Ctx} ctx @param {Fx} fx @param {any[]} sprites @param {number} t */
function drawNoren(ctx, fx, sprites, t) {
  fx.noren.forEach((n, i) => {
    const sway = Math.sin(t * 1.7 + n.s) * 3.5 + Math.sin(t * 0.6 + n.s * 2) * 1.5;
    ctx.save();
    ctx.translate(n.x - 3, n.y - 2);
    ctx.transform(1, 0, sway / n.h, 1, 0, 0);
    ctx.drawImage(sprites[i], 0, 0);
    ctx.restore();
  });
}

/** @param {Ctx} ctx @param {Fx} fx @param {any[]} sprites @param {number} t */
function drawWillows(ctx, fx, sprites, t) {
  fx.willows.forEach((wl, i) => {
    const spr = sprites[i];
    const sway = Math.sin(t * 1.1 + wl.x) * 9 * wl.s;
    ctx.save();
    ctx.translate(wl.x - spr.width / 2, wl.y - 20 * wl.s - 10);
    ctx.transform(1, 0, sway / (150 * wl.s), 1, 0, 0);
    ctx.drawImage(spr, 0, 0);
    ctx.restore();
  });
}
/** @param {Ctx} ctx @param {Fx} fx @param {number} t */
function drawSteam(ctx, fx, t) {
  const sp = getSprites().steam;
  ctx.save();
  for (const s of fx.steam) {
    for (let k = 0; k < 4; k++) {
      const ph = frac(t * 0.16 + k / 4 + s.k);
      const rise = ph * 120 * s.s;
      const x = s.x + Math.sin(ph * 4 + s.k * 6 + t * 0.4) * 16 * s.s * ph;
      const y = s.y - rise;
      const sc = (0.35 + ph * 0.9) * s.s;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.36;
      ctx.drawImage(sp, x - 64 * sc, y - 64 * sc, 128 * sc, 128 * sc);
    }
  }
  ctx.restore();
}

/**
 * Additive lantern light. `flicker` is the flicker depth (0 = steady, used when baking).
 * @param {Ctx} ctx @param {Fx['glows']} glows @param {number} t @param {number} k @param {number} [flicker] @param {number} [rs] radius scale
 */
function drawGlows(ctx, glows, t, k, flicker = 0.25, rs = 1) {
  const sp = getSprites();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const gl of glows) {
    const flick = 1 - flicker * (0.5 - 0.5 * Math.sin(t * 6.3 + gl.s * 9) * Math.sin(t * 2.9 + gl.s * 4));
    ctx.globalAlpha = Math.min(1, gl.a * k * flick);
    const r = gl.r * (gl.a > 0.5 ? 1 : 0.9) * rs;
    ctx.drawImage(gl.a > 0.5 ? sp.glow : sp.warm, gl.x - r, gl.y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Rain rings on puddles, water and cobbles (one cached ring sprite, scaled). @param {Ctx} ctx @param {Fx} fx @param {number} t */
function drawRipples(ctx, fx, t) {
  const sp = getSprites().ripple;
  ctx.save();
  for (const r of fx.ripples) {
    const ph = frac(t * 0.7 + r.s * 7.3);
    const rad = 3 + ph * 15;
    ctx.globalAlpha = (1 - ph) * 0.5;
    ctx.drawImage(sp, r.x - rad, r.y - rad * 0.42, rad * 2, rad * 0.84);
  }
  ctx.restore();
}

/** @type {WeakMap<object, CanvasPattern[]>} */
const rainPatterns = new WeakMap();
/** @param {Ctx} ctx @param {any[]} tiles @param {number} i */
function rainPattern(ctx, tiles, i) {
  let list = rainPatterns.get(ctx);
  if (!list) {
    list = tiles.map((tile) => /** @type {CanvasPattern} */ (ctx.createPattern(tile, 'repeat')));
    rainPatterns.set(ctx, list);
  }
  return list[i];
}

/** Two layers of slanted rain, scrolled as repeating tiles. @param {Ctx} ctx @param {number} t */
function drawRain(ctx, t) {
  const tiles = getSprites().rain;
  ctx.save();
  [900, 1300].forEach((v, i) => {
    const S = 512;
    const p = (t * v) % S;
    const ox = -p * 0.22 + i * 137;
    const oy = p + i * 211;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = rainPattern(ctx, tiles, i);
    ctx.fillRect(-ox, -oy, W, H);
    ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- room

/** @type {RoomSpec} */
export const room = {
  id: 'bathhouse',
  name: 'Rainy Bathhouse Town',
  pathStyle: { fill: '#8A9DA1', edge: '#4E6369', speck: 'rgba(233,241,242,0.22)', width: 92 },
  cushion: { base: '#E9A0A8', dark: '#B8687A' },
  seat: 'deck',
  drawBack(ctx, pen, t, o) {
    const L = o.layout ?? L31;
    const sc = getScene(L);
    const still = !!o.reducedMotion;
    const tt = still ? 0 : t;
    const light = o.light ?? 0.4;
    // the night deepens across the waves (baked into the composited layer)
    ctx.drawImage(getLit(sc, light), 0, 0, W, H);
    drawWillows(ctx, sc.fx, sc.willowSpr, tt);
    drawNoren(ctx, sc.fx, sc.norenSpr, tt);
    drawSteam(ctx, sc.fx, tt);
    if (!still) drawGlows(ctx, sc.flick, t, 0.3 + light * 0.2, 1, 0.7);
  },
  drawMid(ctx, pen, t, o) {
    const L = o.layout ?? L31;
    const sc = getScene(L);
    const still = !!o.reducedMotion;
    const tt = still ? 0 : t;
    ctx.drawImage(sc.mid, 0, 0, W, H);
    if (sc.fx.lane && !still) {
      // the river current slides along the boat lane
      ctx.save();
      ctx.beginPath();
      const pts = sc.fx.lane;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.setLineDash([26, 46]);
      ctx.lineDashOffset = -t * 60;
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(214,236,242,0.35)';
      ctx.stroke();
      ctx.restore();
    }
    drawGlows(ctx, sc.fx.midGlows, tt, 0.6 + (o.light ?? 0.4) * 0.4, still ? 0 : 0.25);
    drawRipples(ctx, sc.fx, tt);
    drawRain(ctx, tt);
  },
  drawFront(ctx, pen, t, o) {
    // drips from unseen eaves along the very top edge
    const tt = o.reducedMotion ? 0 : t;
    ctx.save();
    ctx.fillStyle = 'rgba(214,236,242,0.55)';
    for (let i = 0; i < 14; i++) {
      const x = 60 + i * 138 + hash2(i, 4) * 40;
      const ph = frac(tt * 0.5 + hash2(i, 5));
      const y = -10 + ph * ph * 120;
      ctx.globalAlpha = (1 - ph) * 0.8;
      ctx.beginPath();
      ctx.ellipse(x, y, 2, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },
  layouts: [L31, L32, L33],
};
