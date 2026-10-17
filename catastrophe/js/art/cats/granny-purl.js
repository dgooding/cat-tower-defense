// @ts-check
// Granny Purl: very fluffy grey elder. Spectacles, shawl, endless knitting, yarn-web flinger.
import { ellipsePts, soft } from '../brush.js';
import { hash2, clamp } from '../../core/rng.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */
/** @typedef {import('./catrig.js').CatRig} CatRig */
/** @typedef {import('./catrig.js').Accessory} Accessory */

const WIRE = '#B9893A';
const ROSE = '#D98C9A';
const MINT = '#8FCFB5';
const LILAC = '#B9A5E3';
const BUTTER = '#F2D16B';
const XMAS_RED = '#D2483C';
const XMAS_GREEN = '#4F9A58';
const NEEDLE = '#D8C49A';
const KNOB = '#D2483C';

/** @param {string} hex @param {number} k -1..1 darken/lighten */
function tone(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

/** Yarn ball with wrap lines. @param {Geo} g @param {number} x @param {number} y @param {number} r @param {string} col */
function yarnBall(g, x, y, r, col) {
  const { pen, ctx, lw } = g;
  pen.blob(ellipsePts(x, y, r, r, 20), soft(ctx, x, y, r, tone(col, 0.45), col, tone(col, -0.25)));
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.96, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = tone(col, -0.3);
  ctx.lineWidth = lw * 0.6;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.ellipse(x + (k - 1.5) * r * 0.25, y, r * 0.35, r * 1.1, 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 1.0, r * 0.4, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Round, slightly-too-low spectacles on a beaded chain. @param {Geo} g */
function spectacles(g) {
  const { pen, ctx, hy, hrx, lw } = g;
  const y = hy + 5;
  // Beaded chain hanging under the chin.
  const chain = [
    { x: -hrx * 0.86, y: y - 2 },
    { x: -hrx * 0.7, y: y + 46 },
    { x: 0, y: y + 70 },
    { x: hrx * 0.7, y: y + 46 },
    { x: hrx * 0.86, y: y - 2 },
  ];
  pen.line(chain, { color: WIRE, width: lw * 0.6, alpha: 0.9 });
  for (let k = 1; k < 14; k++) {
    const u = (k / 14) * 4;
    const i = Math.min(3, Math.floor(u));
    const f = u - i;
    const a = chain[i];
    const b = chain[i + 1];
    ctx.fillStyle = k % 3 ? '#F4A6B7' : '#9FD3EA';
    ctx.beginPath();
    ctx.arc(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f + Math.sin(f * Math.PI) * 6, lw * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of [-1, 1]) {
    ctx.fillStyle = 'rgba(230,244,255,0.28)';
    ctx.beginPath();
    ctx.arc(s * 31, y, 21, 0, Math.PI * 2);
    ctx.fill();
    pen.line([{ x: s * 52, y: y - 4 }, { x: s * hrx * 0.88, y: y - 6 }], { color: WIRE, width: lw * 1.1 });
    const ring = pen.wob(ellipsePts(s * 31, y, 21, 21, 22), pen.amp * 0.4);
    ctx.beginPath();
    ring.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = pen.ink;
    ctx.lineWidth = lw * 2.8;
    ctx.stroke();
    ctx.strokeStyle = WIRE;
    ctx.lineWidth = lw * 1.2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineCap = 'round';
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    ctx.arc(s * 31, y, 15, -2.6, -1.9);
    ctx.stroke();
  }
  pen.line([{ x: -11, y: y - 3 }, { x: 0, y: y - 9 }, { x: 11, y: y - 3 }], { width: lw * 2.2 });
  pen.line([{ x: -10, y: y - 3 }, { x: 0, y: y - 9 }, { x: 10, y: y - 3 }], { color: WIRE, width: lw * 0.9 });
}

/** Big fluffy white eyebrow tufts. @param {Geo} g */
function browTufts(g) {
  const { pen, hy } = g;
  for (const s of [-1, 1]) {
    const x = s * 32;
    const y = hy - 30;
    pen.blob(
      [
        { x: x - s * 13, y: y - 1 },
        { x: x - s * 4, y: y - 9 },
        { x: x + s * 8, y: y - 9 },
        { x: x + s * 18, y: y - 4 },
        { x: x + s * 26, y: y + 8 },
        { x: x + s * 14, y: y + 2 },
        { x: x + s * 2, y: y + 1 },
      ],
      '#FBFAF7',
      { width: g.lw * 0.8 },
    );
  }
}

/** Plump floor cushion she sits on. @param {Geo} g */
function cushion(g) {
  const { pen, ctx, brx, lw } = g;
  const w = brx * 1.3;
  pen.blob(ellipsePts(0, -6, w, 15, 26, (a) => 1 + 0.05 * Math.cos(4 * a)), soft(ctx, 0, -10, w, '#F6C9A4', '#E8A67C', '#C9845C'));
  for (const s of [-1, 1]) pen.blob(ellipsePts(s * (w + 2), -6, 6, 5, 10), BUTTER, { width: lw * 0.8 });
  pen.line([{ x: -w * 0.6, y: -12 }, { x: 0, y: -8 }, { x: w * 0.6, y: -12 }], { width: lw * 0.6, alpha: 0.5 });
}

/** Knitted shawl over the shoulders with a fringe. @param {Geo} g */
function shawl(g) {
  const { pen, ctx, hy, brx, lw } = g;
  const top = hy + 34;
  const pts = [
    { x: -brx * 1.04, y: top },
    { x: brx * 1.04, y: top },
    { x: brx * 1.1, y: top + 22 },
    { x: brx * 0.98, y: top + 44 },
    { x: 0, y: top + 94 },
    { x: -brx * 0.98, y: top + 44 },
    { x: -brx * 1.1, y: top + 22 },
  ];
  const w = pen.blob(pts, soft(ctx, -20, top + 30, brx, '#F2B5C0', ROSE, '#B86A7A'));
  ctx.save();
  ctx.beginPath();
  w.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = 'rgba(150,80,95,0.45)';
  ctx.lineWidth = lw * 0.6;
  ctx.lineCap = 'round';
  for (let y = top + 6; y < top + 100; y += 9) {
    for (let x = -brx * 1.1; x < brx * 1.1; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x - 3, y - 3);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x + 3, y - 3);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Fringe along both lower edges.
  for (const [a, b] of [[pts[5], pts[4]], [pts[4], pts[3]]]) {
    for (let k = 0; k <= 7; k++) {
      const u = k / 7;
      const x = a.x + (b.x - a.x) * u;
      const y = a.y + (b.y - a.y) * u;
      pen.line([{ x, y }, { x: x + Math.sin(g.t * 2 + k) * 1.5, y: y + 9 }], { color: '#B86A7A', width: lw * 1.1 });
    }
  }
  // Cameo brooch pinning it closed.
  pen.blob(ellipsePts(0, top + 32, 8, 9.5, 14), soft(ctx, 0, top + 32, 9, '#F6E3A0', '#D9B055', '#A98232'));
  pen.blob(ellipsePts(0, top + 32, 4.5, 5.5, 12), '#9FD3EA', { width: lw * 0.6 });
}

/**
 * Two crossed needles and a hanging piece of knitting that grows per tier.
 * @param {number} len @param {string[]} cols stripe colors @param {boolean} [scarf] long scarf pooling on the floor
 */
function knitting(len, cols, scarf = false) {
  return (/** @type {Geo} */ g) => {
    const { pen, ctx, lw, t } = g;
    const click = Math.sin(t * 9) * 0.06;
    const cx = 0;
    const cy = -52;
    // Needles (behind the knitting top).
    for (const s of [-1, 1]) {
      const a = s * (0.75 + click * s);
      const dx = Math.sin(a) * 46;
      const dy = Math.cos(a) * 46;
      pen.tube([{ x: cx + dx, y: cy + dy * 0.55 }, { x: cx - dx, y: cy - dy }], 3.5, NEEDLE);
      pen.blob(ellipsePts(cx + dx, cy + dy * 0.55, 5, 5, 10), KNOB, { width: lw * 0.8 });
    }
    // The knitted piece.
    const w0 = 30;
    const top = cy - 2;
    /** @type {{x:number,y:number}[]} */
    const pts = [];
    const sway = Math.sin(t * 1.4) * 3;
    if (!scarf) {
      pts.push({ x: -w0 / 2, y: top }, { x: w0 / 2, y: top }, { x: w0 / 2 + sway, y: top + len }, { x: -w0 / 2 + sway, y: top + len });
    } else {
      // Long scarf runs down and curls off along the floor to the right.
      pts.push({ x: -w0 / 2, y: top }, { x: w0 / 2, y: top }, { x: w0 / 2 + 6, y: -22 }, { x: 52, y: -16 }, { x: 96, y: -20 }, { x: 98, y: -2 }, { x: 40, y: 0 }, { x: -w0 / 2 + 4, y: -6 });
    }
    const wb = pen.blob(pts, cols[0]);
    ctx.save();
    ctx.beginPath();
    wb.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    for (let i = 1; i < cols.length + 3; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(-60, top + i * 10, 200, 5);
      if (scarf) ctx.fillRect(20 + i * 14, -40, 6, 50);
    }
    ctx.strokeStyle = 'rgba(59,58,74,0.25)';
    ctx.lineWidth = lw * 0.5;
    for (let y = top + 4; y < 0; y += 6) {
      for (let x = -w0 / 2 + 3; x < (scarf ? 100 : w0 / 2); x += 6) {
        ctx.beginPath();
        ctx.moveTo(x - 2, y - 2);
        ctx.lineTo(x, y + 1.5);
        ctx.lineTo(x + 2, y - 2);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (scarf) for (let k = 0; k < 5; k++) pen.line([{ x: 98, y: -18 + k * 4 }, { x: 106, y: -19 + k * 4 + Math.sin(t * 2 + k) }], { color: cols[0], width: lw * 1.2 });
    // Yarn strand trailing off to the ball on her left.
    pen.line(
      [
        { x: cx - 10, y: top + 3 },
        { x: -48, y: top + 30 + Math.sin(t * 1.3) * 4 },
        { x: -70, y: -20 },
        { x: -88, y: -26 },
      ],
      { color: cols[0], width: lw * 1.1 },
    );
  };
}

/** @param {{x:number,y:number,r:number,c:string}[]} balls */
function yarnPile(balls) {
  return (/** @type {Geo} */ g) => {
    for (const b of balls) yarnBall(g, -g.brx + b.x, b.y, b.r, b.c);
  };
}

/** Wicker knitting basket brimming with yarn (T3+). @param {Geo} g */
function basket(g) {
  const { pen, ctx, brx, lw } = g;
  const x = -brx - 34;
  yarnBall(g, x - 12, -46, 15, LILAC);
  yarnBall(g, x + 12, -48, 14, MINT);
  yarnBall(g, x, -40, 15, ROSE);
  pen.line([{ x: x + 8, y: -60 }, { x: x + 26, y: -86 }], { color: NEEDLE, width: lw * 1.6 });
  pen.blob(
    [
      { x: x - 30, y: -40 },
      { x: x + 30, y: -40 },
      { x: x + 24, y: -2 },
      { x: x - 24, y: -2 },
    ],
    soft(ctx, x, -24, 30, '#E8C48A', '#C9995A', '#9E7040'),
  );
  ctx.save();
  ctx.strokeStyle = 'rgba(110,70,35,0.6)';
  ctx.lineWidth = lw * 0.7;
  for (let y = -34; y < -4; y += 7) {
    ctx.beginPath();
    ctx.moveTo(x - 27 + (y + 40) * 0.15, y);
    ctx.lineTo(x + 27 - (y + 40) * 0.15, y);
    ctx.stroke();
  }
  ctx.restore();
  pen.tube([{ x: x - 30, y: -40 }, { x: x + 30, y: -40 }], 4, '#B5844A');
}

/** Gloriously ugly holiday sweater. @param {Geo} g */
function uglySweater(g) {
  const { pen, ctx, brx, bry, hy, lw, t } = g;
  const bcy = -bry;
  const pts = ellipsePts(0, bcy, brx * 1.04, bry * 1.02, 32, (a) => 1 + 0.1 * Math.sin(a));
  const w = pen.blob(pts, soft(ctx, 0, bcy, brx, '#7CC27F', XMAS_GREEN, '#3A7A44'));
  ctx.save();
  ctx.beginPath();
  w.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  // Red bands with white zig-zags.
  for (const y of [bcy - bry * 0.45, -14]) {
    ctx.fillStyle = XMAS_RED;
    ctx.fillRect(-brx * 1.2, y - 7, brx * 2.4, 14);
    ctx.beginPath();
    for (let x = -brx * 1.2; x < brx * 1.2; x += 8) {
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x + 4, y - 3);
    }
    ctx.strokeStyle = '#FFFDF6';
    ctx.lineWidth = lw * 0.9;
    ctx.stroke();
  }
  // Snowflakes.
  ctx.strokeStyle = '#FFFDF6';
  ctx.lineWidth = lw * 0.6;
  for (let k = 0; k < 6; k++) {
    const x = (hash2(k, 31) - 0.5) * brx * 1.9;
    const y = bcy + (hash2(k, 33) - 0.2) * bry * 0.9;
    if (Math.abs(x) < 26) continue;
    for (let a = 0; a < 3; a++) {
      const ang = (a * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(ang) * 5, y - Math.sin(ang) * 5);
      ctx.lineTo(x + Math.cos(ang) * 5, y + Math.sin(ang) * 5);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Reindeer face, front and center, with a pom-pom nose and googly eyes.
  const ry = bcy + 6;
  for (const s of [-1, 1]) {
    pen.line([{ x: s * 8, y: ry - 14 }, { x: s * 14, y: ry - 26 }, { x: s * 22, y: ry - 30 }], { color: '#8A5A3B', width: lw * 1.6 });
    pen.line([{ x: s * 13, y: ry - 23 }, { x: s * 9, y: ry - 31 }], { color: '#8A5A3B', width: lw * 1.4 });
  }
  pen.blob(ellipsePts(0, ry, 17, 19, 18, (a) => 1 + (Math.sin(a) > 0 ? 0.08 : 0)), '#B07A4E', { width: lw * 0.9 });
  for (const s of [-1, 1]) {
    const ex = s * 6.5;
    const ey = ry - 5;
    pen.blob(ellipsePts(ex, ey, 5, 5, 10), '#FFFDF6', { width: lw * 0.7 });
    ctx.fillStyle = '#2B2633';
    ctx.beginPath();
    ctx.arc(ex + Math.sin(t * 3 + s) * 1.6, ey + 1.5 + Math.cos(t * 2.3 + s) * 1.2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const glow = 0.6 + 0.4 * Math.sin(t * 4);
  const ng = ctx.createRadialGradient(0, ry + 9, 1, 0, ry + 9, 14);
  ng.addColorStop(0, `rgba(255,90,80,${0.6 * glow})`);
  ng.addColorStop(1, 'rgba(255,90,80,0)');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.arc(0, ry + 9, 14, 0, Math.PI * 2);
  ctx.fill();
  pen.blob(ellipsePts(0, ry + 9, 6.5, 6, 12, (a, i) => 1 + (i % 2 ? 0.1 : -0.05)), '#F0463A', { width: lw * 0.9 });
  // Ribbed turtleneck.
  pen.blob(ellipsePts(0, hy + 58, 44, 12, 22), soft(ctx, 0, hy + 56, 40, '#E46A5C', XMAS_RED, '#A8352B'));
  for (let x = -36; x <= 36; x += 7) pen.line([{ x, y: hy + 50 }, { x: x * 1.05, y: hy + 66 }], { color: '#A8352B', width: lw * 0.7, amp: 0 });
  // Tinsel jingle bells on the hem.
  for (const x of [-34, 0, 34]) {
    pen.blob(ellipsePts(x, -6, 5.5, 5.5, 10), BUTTER, { width: lw * 0.8 });
    pen.line([{ x: x - 2.5, y: -5 }, { x: x + 2.5, y: -5 }], { width: lw * 0.6, amp: 0 });
  }
}

/** Seeded, slightly writhing yarn loops. @param {Geo} g @param {number} seed @param {number} n @param {number} cx @param {number} cy @param {number} spreadX @param {number} spreadY @param {number} rMin @param {number} rMax */
function loops(g, seed, n, cx, cy, spreadX, spreadY, rMin, rMax) {
  const { pen, lw, t } = g;
  const cols = [ROSE, MINT, LILAC, BUTTER, '#9FD3EA'];
  for (let k = 0; k < n; k++) {
    const x = cx + (hash2(k, seed) - 0.5) * spreadX;
    const y = cy + (hash2(k, seed + 1) - 0.5) * spreadY;
    const rx = rMin + hash2(k, seed + 2) * (rMax - rMin);
    const ry = rx * (0.35 + hash2(k, seed + 3) * 0.5);
    const rot = hash2(k, seed + 4) * Math.PI + Math.sin(t * 0.9 + k) * 0.05;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const pts = ellipsePts(0, 0, rx, ry, 14).map((p) => ({ x: x + p.x * c - p.y * s, y: y + p.x * s + p.y * c }));
    pts.push(pts[0], pts[1]);
    pen.line(pts, { width: lw * 2.6 });
    pen.line(pts, { color: cols[k % cols.length], width: lw * 1.3, amp: 0 });
  }
}

/** Tangle behind her. @param {Geo} g */
function tangleBack(g) {
  loops(g, 41, 10, 0, -105, 215, 150, 26, 50);
}

/** Tangle strands across her front. @param {Geo} g */
function tangleFront(g) {
  loops(g, 61, 5, 0, -48, 150, 60, 30, 52);
}

/** A runaway yarn ball perched on her head like a bun, needle stuck through. @param {Geo} g */
function yarnBun(g) {
  const { pen, hy, lw } = g;
  pen.line([{ x: -30, y: hy - 82 }, { x: 34, y: hy - 58 }], { color: NEEDLE, width: lw * 1.8 });
  yarnBall(g, 4, hy - 68, 18, LILAC);
  pen.line([{ x: 14, y: hy - 64 }, { x: 34, y: hy - 58 }], { color: NEEDLE, width: lw * 1.8 });
  pen.blob(ellipsePts(-30, hy - 82, 4.5, 4.5, 10), KNOB, { width: lw * 0.8 });
  pen.line([{ x: 18, y: hy - 56 }, { x: 40, y: hy - 30 }, { x: 52, y: hy - 6 }], { color: LILAC, width: lw * 1.2 });
}

/** @type {Accessory[]} */
const face = [
  { layer: 'head', draw: browTufts },
  { layer: 'head', draw: spectacles },
];

/** @param {CatRig} rig @param {number} t */
function attackUpdate(rig, t) {
  const hy = -128;
  const R = /** @type {any} */ (rig);
  if (!R._gp || t < R._gp.last) R._gp = { last: t };
  const st = R._gp;
  st.last = t;
  const once = (/** @type {string} */ key, /** @type {number} */ at) => {
    if (t >= at && !st[key]) {
      st[key] = true;
      return true;
    }
    return false;
  };
  if (once('wind', 0)) {
    rig.squash.kick(2);
    rig.say('knit one…', -70, hy - 84, 18);
  }
  if (t < 0.38) {
    rig.ov.lean = -0.1 * Math.min(1, t / 0.2);
    rig.ov.squash = 0.07;
    rig.ov.lid = 0.35;
    rig.ov.mouth = 'flat';
  }
  if (once('fling', 0.38)) {
    rig.squash.kick(-4.2);
    rig.say('purl!', 74, hy - 92, 30);
    const col = rig.tier === '4A' ? XMAS_RED : ROSE;
    rig.fx.push({
      t: 0,
      life: 2.1,
      x: 30,
      y: -70,
      vx: 210,
      vy: -300,
      landed: -1,
      update(/** @type {any} */ f, /** @type {number} */ dt) {
        if (f.landed >= 0) return;
        f.vy += 1000 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y > -10) {
          f.y = -10;
          f.landed = f.t;
        }
      },
      draw(/** @type {any} */ f, /** @type {Geo} */ g) {
        const { ctx, pen, lw } = g;
        const fade = f.t > 1.7 ? (2.1 - f.t) / 0.4 : 1;
        ctx.save();
        ctx.globalAlpha *= fade;
        // Trailing strand back to her knitting.
        const mx = (f.x + 10) / 2;
        pen.line([{ x: 10, y: -56 }, { x: mx, y: Math.min(f.y, -56) - 40 * (f.landed < 0 ? 1 : 0.3) }, { x: f.x, y: f.y }], { color: col, width: lw * 1.1 });
        if (f.landed >= 0) {
          const k = clamp((f.t - f.landed) / 0.25, 0, 1);
          const r = 52 * (1 - (1 - k) * (1 - k));
          const N = 8;
          /** @type {{x:number,y:number}[]} */
          const spokes = [];
          for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 + 0.2;
            spokes.push({ x: f.x + Math.cos(a) * r, y: f.y + 4 + Math.sin(a) * r * 0.38 });
          }
          for (const p of spokes) pen.line([{ x: f.x, y: f.y + 4 }, p], { color: col, width: lw * 1.1 });
          for (const q of [0.4, 0.7, 1]) {
            const ring = spokes.map((p) => ({ x: f.x + (p.x - f.x) * q, y: f.y + 4 + (p.y - f.y - 4) * q }));
            ring.push(ring[0]);
            pen.line(ring, { color: col, width: lw * 0.9 });
          }
        }
        ctx.restore();
        ctx.save();
        ctx.globalAlpha *= fade;
        yarnBall(g, f.x, f.y, 10, col);
        ctx.restore();
      },
    });
  }
  if (t >= 0.38 && t < 0.62) {
    rig.ov.lean = 0.09;
    rig.ov.mouth = 'open';
    rig.ov.eye = 'happy';
  }
  if (t >= 0.62) {
    rig.ov.mouth = 'smile';
    rig.ov.eye = 'happy';
  }
  if (t > 1.35) {
    rig.ov.eye = 'closed';
    rig.ov.mouth = 'w';
  }
  if (once('z', 1.4)) rig.say('z', 60, hy - 70, 16);
}

/** @type {CatSpec} */
export const spec = {
  id: 'granny-purl',
  fur: '#B4B3BF',
  light: '#E6E5EE',
  shade: '#8B8A9A',
  cream: '#F6F3EE',
  muzzle: '#FBFAF7',
  stripe: '#8F8E9E',
  eye: '#E0A93E',
  eyeDark: '#7A4E1A',
  eyeLight: '#FFE39A',
  innerEar: '#EFB2BC',
  pattern: 'none',
  fluff: 1,
  bodyW: 1.12,
  bodyH: 0.98,
  headW: 1.06,
  earSize: 0.74,
  tailLen: 0.85,
  tailWidth: 1.25,
  tiers: {
    T1: [
      { layer: 'side', draw: cushion },
      { layer: 'side', draw: yarnPile([{ x: -28, y: -24, r: 19, c: MINT }]) },
      { layer: 'neck', draw: shawl },
      { layer: 'neck', draw: knitting(16, [MINT]) },
      ...face,
    ],
    T2: [
      { layer: 'side', draw: cushion },
      { layer: 'side', draw: yarnPile([{ x: -44, y: -20, r: 17, c: LILAC }, { x: -24, y: -22, r: 20, c: MINT }]) },
      { layer: 'neck', draw: shawl },
      { layer: 'neck', draw: knitting(34, [MINT, LILAC]) },
      ...face,
    ],
    T3: [
      { layer: 'side', draw: cushion },
      { layer: 'side', draw: basket },
      { layer: 'neck', draw: shawl },
      { layer: 'neck', draw: knitting(0, [MINT, LILAC, BUTTER], true) },
      ...face,
    ],
    '4A': [
      { layer: 'side', draw: cushion },
      { layer: 'side', draw: basket },
      { layer: 'body', draw: uglySweater },
      { layer: 'neck', draw: knitting(0, [XMAS_RED, '#FFFDF6', XMAS_GREEN], true) },
      ...face,
    ],
    '4B': [
      { layer: 'side', draw: tangleBack },
      { layer: 'side', draw: cushion },
      { layer: 'neck', draw: shawl },
      { layer: 'neck', draw: knitting(0, [ROSE, MINT, LILAC], true) },
      { layer: 'neck', draw: tangleFront },
      ...face,
      { layer: 'head', draw: yarnBun },
    ],
  },
  actions: {
    /** "knit one… purl!": flings a yarn ball that blooms into a sticky web. */
    attack: { duration: 1.9, update: attackUpdate },
  },
};

export const tiers = [
  { id: 'T1', label: 'T1 · Knitting Circle' },
  { id: 'T2', label: 'T2 · Purl Two Together' },
  { id: 'T3', label: 'T3 · Grandmaster of Yarn' },
  { id: '4A', label: '4A · Ugly Holiday Sweater' },
  { id: '4B', label: '4B · Tangle of Tuesdays' },
];
