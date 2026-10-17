// @ts-check
// Dr. Nip: charcoal-black catnip alchemist. Brass goggles, lab coat, enormous pupils.
// "Purely for science. Mostly."
import { ellipsePts, soft } from '../brush.js';
import { star } from './catrig.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */
/** @typedef {import('./catrig.js').CatRig} CatRig */
/** @typedef {import('../brush.js').Pt} Pt */

const NIP_GREEN = '#8FD86A';
const NIP_DEEP = '#4E9C3E';
const NIP_PALE = '#D4F5B8';
const GLASS = 'rgba(226,244,252,0.72)';
const BRASS = ['#F7DE8C', '#D2A043', '#8E6526'];
const COAT = ['#FFFFFF', '#F3F0EA', '#CFCAD6'];
const TIEDYE = ['#F4A6B7', '#F2C14E', '#9ED78A', '#8FCBEA', '#C9B6F2', '#F29E4C'];

/** One-shot cue helper that survives replays and big first-frame dt. */
const runs = new WeakMap();
/** @param {CatRig} rig @param {number} t */
function cues(rig, t) {
  let s = runs.get(rig);
  if (!s || t < s.t) {
    s = { t, fired: new Set() };
    runs.set(rig, s);
  }
  s.t = t;
  return (/** @type {string} */ key, /** @type {number} */ at) => {
    if (t >= at && !s.fired.has(key)) {
      s.fired.add(key);
      return true;
    }
    return false;
  };
}

/** @param {Pt[]} pts @param {number} s */
const mirror = (pts, s) => pts.map((p) => ({ x: p.x * s, y: p.y }));

/** Rectangle points with small rounded corners (traceClosed rounds every corner). @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 */
function rectPts(x0, y0, x1, y1) {
  const c = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  /** @type {Pt[]} */
  const out = [];
  for (let i = 0; i < 4; i++) {
    const p = c[(i + 3) % 4];
    const a = c[i];
    const n = c[(i + 1) % 4];
    out.push({ x: a.x + (p.x - a.x) * 0.15, y: a.y + (p.y - a.y) * 0.15 }, a, { x: a.x + (n.x - a.x) * 0.15, y: a.y + (n.y - a.y) * 0.15 });
  }
  return out;
}

/** Round flask bulb outline, from the left neck joint around the bottom to the right. */
function bulb() {
  /** @type {Pt[]} */
  const pts = [];
  const a0 = Math.PI * 1.5 - 0.36;
  const a1 = -Math.PI * 0.5 + 0.36;
  for (let i = 0; i <= 12; i++) {
    const a = a0 + ((a1 - a0) * i) / 12;
    pts.push({ x: Math.cos(a) * 16, y: -15 + Math.sin(a) * 15 });
  }
  return pts;
}

/**
 * Round-bottom / conical lab flask with bubbling liquid.
 * @param {Geo} g @param {number} x @param {number} y bottom center @param {number} k scale
 * @param {{liquid?:string, light?:string, cork?:boolean, conical?:boolean, bubbles?:number, fill?:number}} [o]
 */
function flask(g, x, y, k, o = {}) {
  const { pen, ctx, lw, t } = g;
  const liquid = o.liquid ?? NIP_GREEN;
  const light = o.light ?? NIP_PALE;
  const fillK = o.fill ?? 0.55;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  /** @type {Pt[]} */
  const body = o.conical
    ? [
        { x: -5, y: -44 },
        { x: -5, y: -30 },
        { x: -22, y: -4 },
        { x: -20, y: 0 },
        { x: 20, y: 0 },
        { x: 22, y: -4 },
        { x: 5, y: -30 },
        { x: 5, y: -44 },
      ]
    : [
        { x: -5, y: -44 },
        { x: -5, y: -29 },
        ...bulb(),
        { x: 5, y: -29 },
        { x: 5, y: -44 },
      ];
  const w = pen.blob(body, GLASS, { width: lw / k });
  // Liquid, clipped to the glass.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w[0].x, w[0].y);
  for (const p of w) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  const top = -30 * fillK - 2 + Math.sin(t * 5) * 1.2;
  const gr = ctx.createLinearGradient(0, top, 0, 0);
  gr.addColorStop(0, light);
  gr.addColorStop(0.35, liquid);
  gr.addColorStop(1, liquid);
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(-30, top);
  for (let i = 0; i <= 12; i++) ctx.lineTo(-30 + i * 5, top + Math.sin(t * 6 + i) * 1.4);
  ctx.lineTo(30, 4);
  ctx.lineTo(-30, 4);
  ctx.closePath();
  ctx.fill();
  // Bubbles inside.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < (o.bubbles ?? 4); i++) {
    const ph = (t * (0.7 + hash2(i, 3) * 0.6) + hash2(i, 5)) % 1;
    const bx = (hash2(i, 7) - 0.5) * 18 + Math.sin(t * 4 + i) * 2;
    const by = -3 - ph * (Math.abs(top) - 3);
    ctx.beginPath();
    ctx.arc(bx, by, 1.6 + hash2(i, 9) * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Glass glint.
  pen.line([{ x: -11, y: -20 }, { x: -12, y: -12 }, { x: -8, y: -6 }], { color: 'rgba(255,255,255,0.9)', width: (lw * 1.1) / k, amp: 0 });
  // Lip + cork.
  pen.blob(ellipsePts(0, -44, 7.5, 2.6, 12), GLASS, { width: (lw * 0.8) / k, amp: 0 });
  if (o.cork) pen.blob([{ x: -5, y: -44 }, { x: -6, y: -53 }, { x: 6, y: -53 }, { x: 5, y: -44 }], '#C79A66', { width: (lw * 0.8) / k });
  ctx.restore();
}

/** Puffy cloud cluster. @param {Geo} g @param {number} x @param {number} y @param {number} r @param {number} a alpha @param {string} [c] @param {number} [seed] */
function puff(g, x, y, r, a, c = NIP_GREEN, seed = 0) {
  const { ctx, lw } = g;
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= a;
  const lobes = [
    [0, 0, 1],
    [-0.62, 0.18, 0.7],
    [0.6, 0.2, 0.72],
    [-0.2, -0.45, 0.66],
    [0.3, -0.38, 0.58],
  ];
  ctx.beginPath();
  for (const [dx, dy, rr] of lobes) {
    const j = 1 + (hash2(seed, dx * 10 + dy * 7) - 0.5) * 0.15;
    ctx.moveTo(x + dx * r + rr * r * j, y + dy * r);
    ctx.arc(x + dx * r, y + dy * r, rr * r * j, 0, Math.PI * 2);
  }
  ctx.fillStyle = soft(ctx, x, y, r * 1.3, NIP_PALE, c, NIP_DEEP);
  ctx.fill();
  ctx.strokeStyle = 'rgba(59,58,74,0.45)';
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  ctx.restore();
}

/** Lab coat (open front) drawn over the body. @param {Geo} g @param {boolean} [tieDye] */
function coat(g, tieDye = false) {
  const { pen, ctx, brx, bry, lw } = g;
  const sx = brx / 60;
  const sy = bry / 54;
  /** @type {Pt[]} */
  const half = [
    { x: 9, y: -100 },
    { x: 40, y: -98 },
    { x: 62, y: -78 },
    { x: 68, y: -46 },
    { x: 69, y: -14 },
    { x: 62, y: 3 },
    { x: 36, y: 5 },
    { x: 13, y: 3 },
    { x: 11, y: -24 },
    { x: 9, y: -50 },
    { x: 19, y: -66 },
    { x: 13, y: -82 },
  ].map((p) => ({ x: p.x * sx, y: p.y * sy }));
  for (const s of [-1, 1]) {
    const pts = mirror(half, s);
    const w = pen.blob(pts, soft(ctx, -30, -80 * sy, 110, COAT[0], COAT[1], COAT[2]));
    if (tieDye) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w[0].x, w[0].y);
      for (const p of w) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.clip();
      const cx = s * 34 * sx;
      const cy = -46 * sy;
      ctx.lineWidth = 8;
      for (let k = 0; k < 9; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          const r = 4 + k * 8.5 + Math.sin(a * 5 + k * 0.9 + g.t * 0.6) * 3;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = TIEDYE[(k + (s > 0 ? 2 : 0)) % TIEDYE.length];
        ctx.globalAlpha = 0.85;
        ctx.stroke();
      }
      ctx.restore();
      pen.blob(w, null, { amp: 0 });
    }
    // Lapel fold.
    pen.line(
      [
        { x: s * 19 * sx, y: -66 * sy },
        { x: s * 30 * sx, y: -74 * sy },
        { x: s * 24 * sx, y: -92 * sy },
      ],
      { width: lw * 0.8 },
    );
  }
  // Pocket with a pen (left), buttons (right).
  pen.blob(rectPts(-50 * sx, -44 * sy, -28 * sx, -27 * sy), tieDye ? null : '#EEEAE3', { width: lw * 0.8 });
  pen.tube([{ x: -42 * sx, y: -45 * sy }, { x: -40 * sx, y: -57 * sy }], 3.4, '#5B7FC7');
  pen.tube([{ x: -35 * sx, y: -45 * sy }, { x: -34 * sx, y: -53 * sy }], 3, '#D2483C');
  ctx.fillStyle = '#B9B3C4';
  for (const y of [-40, -22]) {
    ctx.beginPath();
    ctx.arc(15 * sx, y * sy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @param {Geo} g */
function labCoat(g) {
  coat(g, false);
}

/** @param {Geo} g */
function tieDyeCoat(g) {
  coat(g, true);
}

/** Little flask necklace. @param {Geo} g */
function necklace(g) {
  const { pen, hy, lw } = g;
  pen.line(
    [
      { x: -24, y: hy + 48 },
      { x: -8, y: hy + 70 },
      { x: 0, y: hy + 73 },
      { x: 8, y: hy + 70 },
      { x: 24, y: hy + 48 },
    ],
    { color: '#D2A043', width: lw * 0.9 },
  );
  flask(g, 0, hy + 102, 0.62, { cork: true, bubbles: 2 });
}

/** Brass goggles pushed up on the forehead. @param {Geo} g @param {string[]} [lens] */
function gogglesWith(g, lens = ['#C8F1E8', '#6FB7AE', '#3F7F7A']) {
  const { pen, ctx, hy, hrx, lw } = g;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, hy, hrx + 3, 61, 0, 0, Math.PI * 2);
  ctx.clip();
  pen.tube(
    [
      { x: -hrx, y: hy - 30 },
      { x: -40, y: hy - 42 },
      { x: 0, y: hy - 45 },
      { x: 40, y: hy - 42 },
      { x: hrx, y: hy - 30 },
    ],
    8,
    '#6B4A34',
  );
  ctx.restore();
  pen.tube([{ x: -8, y: hy - 45 }, { x: 0, y: hy - 48 }, { x: 8, y: hy - 45 }], 4, BRASS[1]);
  for (const s of [-1, 1]) {
    const x = s * 22;
    const y = hy - 44;
    pen.blob(ellipsePts(x, y, 15.5, 14.5, 18), soft(ctx, x, y, 15, BRASS[0], BRASS[1], BRASS[2]));
    pen.blob(ellipsePts(x, y, 10, 9.4, 16), soft(ctx, x, y, 10, lens[0], lens[1], lens[2]), { width: lw * 0.8 });
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.ellipse(x - 3.5, y - 3.5, 3.4, 2, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BRASS[2];
    for (const a of [0.5, 2.2, 3.8, 5.5]) {
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 12.8, y + Math.sin(a) * 12, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** @param {Geo} g */
function goggles(g) {
  gogglesWith(g);
}

/** @param {Geo} g */
function groovyGoggles(g) {
  gogglesWith(g, ['#FFD3E6', '#F48CB8', '#B0477E']);
}

/** Frizzy mad-scientist hair: curly wisps sproinging out of the head. @param {Geo} g */
function tuft(g) {
  const { pen, hy, t, S } = g;
  const wisps = [
    [-20, -2.0, 38, 1],
    [-8, -1.75, 46, -1],
    [6, -1.45, 42, 1],
    [18, -1.15, 34, -1],
    [-1, -1.6, 28, 1],
  ];
  wisps.forEach(([x0, ang, len, curl], i) => {
    const wob = Math.sin(t * 3 + i * 1.7) * 0.12;
    /** @type {Pt[]} */
    const pts = [];
    let x = x0;
    let y = hy - 50 + Math.abs(x0) * 0.12;
    let a = ang + wob;
    pts.push({ x, y });
    for (let k = 0; k < 5; k++) {
      const step = len / 3.6 - k * 1.5;
      x += Math.cos(a) * step;
      y += Math.sin(a) * step;
      a += curl * (0.08 + k * 0.13);
      pts.push({ x, y });
    }
    pen.tube(pts, 8.5 - (i === 4 ? 2 : 0), S.fur);
  });
}

/** Big bubbling Erlenmeyer flask beside him. @param {Geo} g */
function bigFlask(g) {
  const { t, ctx } = g;
  const x = -g.brx - 44;
  flask(g, x, -2, 1.25, { conical: true, bubbles: 6, fill: 0.7 });
  // Bubbles escaping the top + a happy little fume.
  for (let i = 0; i < 4; i++) {
    const ph = (t * 0.8 + i / 4) % 1;
    const bx = x + Math.sin(ph * 9 + i) * 8;
    const by = -60 - ph * 46;
    ctx.save();
    ctx.globalAlpha = 1 - ph;
    ctx.fillStyle = 'rgba(226,250,214,0.85)';
    ctx.strokeStyle = NIP_DEEP;
    ctx.lineWidth = g.lw * 0.6;
    ctx.beginPath();
    ctx.arc(bx, by, 3 + ph * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  puff(g, x + 6 + Math.sin(t) * 3, -112 - Math.sin(t * 1.3) * 3, 9, 0.75, NIP_GREEN, 3);
}

/** Wooden rack of potions. @param {Geo} g */
function potionRack(g) {
  const { pen, ctx, lw, t } = g;
  const x0 = -g.brx - 98;
  const cols = [
    ['#8FD86A', '#D4F5B8'],
    ['#F48CB8', '#FFD3E6'],
    ['#A98BE0', '#E2D6FA'],
    ['#F2B04E', '#FFE7A8'],
  ];
  // Back plank + legs.
  pen.blob([{ x: x0 - 4, y: -4 }, { x: x0 - 4, y: -50 }, { x: x0 + 2, y: -50 }, { x: x0 + 2, y: -4 }], '#A0764F');
  pen.blob([{ x: x0 + 74, y: -4 }, { x: x0 + 74, y: -50 }, { x: x0 + 80, y: -50 }, { x: x0 + 80, y: -4 }], '#A0764F');
  cols.forEach(([c, l], i) => {
    const x = x0 + 12 + i * 18;
    const lvl = [0.7, 0.45, 0.85, 0.6][i];
    const tube = [
      { x: x - 6, y: -72 },
      { x: x - 6, y: -16 },
      { x: x - 3, y: -9 },
      { x: x + 3, y: -9 },
      { x: x + 6, y: -16 },
      { x: x + 6, y: -72 },
    ];
    const w = pen.blob(tube, GLASS, { width: lw * 0.9 });
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w[0].x, w[0].y);
    for (const p of w) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.clip();
    const top = -10 - 58 * lvl + Math.sin(t * 4 + i) * 1;
    const gr = ctx.createLinearGradient(0, top, 0, -9);
    gr.addColorStop(0, l);
    gr.addColorStop(0.4, c);
    gr.addColorStop(1, c);
    ctx.fillStyle = gr;
    ctx.fillRect(x - 8, top, 16, 70);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    const ph = (t * 0.9 + i * 0.3) % 1;
    ctx.beginPath();
    ctx.arc(x + Math.sin(t * 5 + i) * 1.5, -12 - ph * (Math.abs(top) - 12), 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (i !== 1) pen.blob([{ x: x - 5, y: -72 }, { x: x - 6, y: -80 }, { x: x + 6, y: -80 }, { x: x + 5, y: -72 }], '#C79A66', { width: lw * 0.8 });
  });
  // The uncorked pink one is bubbling over.
  puff(g, x0 + 30 + Math.sin(t * 1.4) * 2, -92 - Math.sin(t * 2) * 2, 7, 0.8, '#F48CB8', 2);
  // Front planks.
  pen.blob([{ x: x0 - 8, y: -46 }, { x: x0 + 84, y: -46 }, { x: x0 + 84, y: -38 }, { x: x0 - 8, y: -38 }], soft(ctx, x0 + 30, -46, 60, '#D3A877', '#B98B5C', '#8A6440'));
  pen.blob([{ x: x0 - 10, y: -10 }, { x: x0 + 86, y: -10 }, { x: x0 + 86, y: 0 }, { x: x0 - 10, y: 0 }], soft(ctx, x0 + 30, -10, 60, '#D3A877', '#B98B5C', '#8A6440'));
}

/** "CHIEF" badge on the coat. @param {Geo} g */
function badge(g) {
  const { pen, ctx, brx, bry } = g;
  const x = 38 * (brx / 60);
  const y = -66 * (bry / 54);
  pen.blob([{ x: x - 11, y: y - 6 }, { x: x + 11, y: y - 6 }, { x: x + 11, y: y + 7 }, { x: x - 11, y: y + 7 }], '#9FD3EA', { width: g.lw * 0.8 });
  ctx.fillStyle = '#3B3A4A';
  ctx.font = '700 7px Fredoka, "Arial Rounded MT Bold", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHIEF', x, y + 1);
}

/** Cartoon bomb-shaped catnip pouch with a sparkling fuse. @param {Geo} g */
function nipBomb(g) {
  const { pen, ctx, lw, t } = g;
  const x = -g.brx - 52;
  const y = -36;
  const r = 33;
  // Fuse.
  const fuse = [
    { x: x + 4, y: y - r - 6 },
    { x: x + 10, y: y - r - 18 },
    { x: x + 24, y: y - r - 20 },
    { x: x + 28, y: y - r - 32 },
  ];
  pen.line(fuse, { color: '#8A6440', width: lw * 1.6 });
  // Pouch.
  pen.blob(ellipsePts(x, y, r, r * 0.96, 26, (a) => 1 + 0.04 * Math.sin(a * 6)), soft(ctx, x, y, r, '#9CCB6E', '#5E8A3A', '#3F6328'));
  // Gathered neck + tie.
  pen.blob(
    [
      { x: x - 13, y: y - r + 4 },
      { x: x - 9, y: y - r - 8 },
      { x: x + 9, y: y - r - 8 },
      { x: x + 13, y: y - r + 4 },
    ],
    '#6E9E44',
  );
  pen.tube([{ x: x - 10, y: y - r + 1 }, { x: x + 10, y: y - r + 1 }], 4, '#D2483C');
  // Catnip leaf emblem.
  ctx.save();
  ctx.translate(x - 2, y + 4);
  ctx.rotate(-0.4);
  pen.blob([{ x: 0, y: -14 }, { x: 9, y: -2 }, { x: 0, y: 14 }, { x: -9, y: -2 }], '#D4F5B8', { width: lw * 0.8 });
  pen.line([{ x: 0, y: -10 }, { x: 0, y: 12 }], { color: NIP_DEEP, width: lw * 0.7 });
  ctx.restore();
  // Shine.
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(x - 14, y - 13, 7, 4, -0.7, 0, Math.PI * 2);
  ctx.fill();
  // Fuse sparkle.
  const tip = fuse[3];
  const fl = 0.75 + 0.25 * Math.sin(t * 31) * Math.sin(t * 17);
  ctx.fillStyle = '#F29E4C';
  star(ctx, tip.x, tip.y, 16 * fl, 0.32, t * 6);
  ctx.fillStyle = '#FFE58A';
  star(ctx, tip.x, tip.y, 10 * fl, 0.35, -t * 5);
  for (let i = 0; i < 5; i++) {
    const ph = (t * 2.2 + i / 5) % 1;
    const a = hash2(i, Math.floor(t * 2.2 + i / 5)) * Math.PI * 2;
    ctx.globalAlpha = 1 - ph;
    ctx.fillStyle = i % 2 ? '#FFE58A' : '#F29E4C';
    ctx.beginPath();
    ctx.arc(tip.x + Math.cos(a) * ph * 18, tip.y + Math.sin(a) * ph * 18 - ph * 6, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Singed hair still smoking from an "entirely intentional" explosion. @param {Geo} g */
function smoke(g) {
  const { ctx, hy, t, lw } = g;
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.5 + i / 3) % 1;
    const x = -4 + Math.sin(ph * 7 + i) * 8 + i * 6;
    const y = hy - 96 - ph * 40;
    ctx.save();
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
    ctx.fillStyle = '#B8B3C2';
    ctx.strokeStyle = 'rgba(59,58,74,0.6)';
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, 4 + ph * 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

/** Swirling haze clouds behind him. @param {Geo} g */
function haze(g) {
  const { t, hy } = g;
  for (let i = 0; i < 6; i++) {
    const a = t * 0.45 + (i * Math.PI * 2) / 6;
    const rx = 128 + (i % 2) * 14;
    const x = Math.cos(a) * rx;
    const y = hy * 0.55 + Math.sin(a) * 40 - (i % 3) * 10;
    puff(g, x, y, 15 + (i % 3) * 5, 0.55, i % 2 ? NIP_GREEN : '#B6E88F', i);
  }
}

/** Little daisy tucked by the ear + drifting haze in front. @param {Geo} g */
function flowerPower(g) {
  const { pen, ctx, hy, lw, t } = g;
  const x = -54;
  const y = hy - 52;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    pen.blob(ellipsePts(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5, 5, 8), '#FFFDF6', { width: lw * 0.7 });
  }
  pen.blob(ellipsePts(x, y, 4.5, 4.5, 10), '#F2C14E', { width: lw * 0.7 });
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.25 + i * 0.5) % 1;
    puff(g, -80 + ph * 160, hy + 80 - Math.sin(ph * Math.PI) * 30, 10, Math.sin(ph * Math.PI) * 0.45, NIP_GREEN, i + 9);
  }
  ctx.globalAlpha = 1;
}

/** Faint warm rim light so the black fur keeps its form. @param {Geo} g @param {number} cx @param {number} cy @param {number} rx @param {number} ry */
function rim(g, cx, cy, rx, ry) {
  const { ctx } = g;
  ctx.save();
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(196,188,236,0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, -1.0, 0.8);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(196,188,236,0.12)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI + 0.4, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();
}

const BASE = [
  { layer: /** @type {const} */ ('body'), draw: labCoat },
  { layer: /** @type {const} */ ('neck'), draw: necklace },
  { layer: /** @type {const} */ ('head'), draw: goggles },
];

/** @type {CatSpec} */
export const drNip = {
  id: 'dr-nip',
  fur: '#3A3644',
  light: '#6E6884',
  shade: '#25222D',
  cream: '#4A4558',
  belly: null,
  muzzle: '#575169',
  paw: '#4E495D',
  stripe: '#2A2732',
  eye: '#B9D84E',
  eyeDark: '#4F7A22',
  eyeLight: '#EEF7A6',
  innerEar: '#B98494',
  nose: '#8C6C82',
  whisker: '#EDE8F6',
  outline: '#211E29',
  lidColor: '#3A3644',
  pupil: 1.5,
  pattern: 'none',
  mouth: 'w',
  bodyW: 0.98,
  headW: 1.0,
  earSize: 1.02,
  tailLen: 1.05,
  headPattern: (g, h) => rim(g, 0, g.hy, h.hrx, h.hry),
  bodyPattern: (g, b) => rim(g, 0, b.bcy, b.brx, b.bry),
  tiers: {
    T1: [...BASE],
    T2: [{ layer: 'side', draw: bigFlask }, { layer: 'head', draw: tuft }, ...BASE],
    T3: [{ layer: 'side', draw: potionRack }, { layer: 'head', draw: tuft }, ...BASE, { layer: 'body', draw: badge }],
    '4A': [{ layer: 'side', draw: nipBomb }, { layer: 'head', draw: tuft }, ...BASE, { layer: 'head', draw: smoke }],
    '4B': [
      { layer: 'side', draw: haze },
      { layer: 'body', draw: tieDyeCoat },
      { layer: 'neck', draw: necklace },
      { layer: 'head', draw: groovyGoggles },
      { layer: 'head', draw: flowerPower },
    ],
  },
  actions: {
    /** Uncorks a flask: *pop!* … a green cloud … "for science!" … then the fumes win. */
    attack: {
      duration: 2.6,
      update(rig, t) {
        const hy = -128;
        const cue = cues(rig, t);
        if (cue('lift', 0)) {
          rig.squash.kick(-2.6);
          const k = rig;
          rig.fx.push({
            t: 0,
            life: 1.7,
            draw(/** @type {any} */ f, /** @type {Geo} */ g) {
              const up = Math.min(1, f.t / 0.25);
              const out = f.t > 1.4 ? (f.t - 1.4) / 0.3 : 0;
              const x = 84;
              const y = -24 + (hy + 46 - -24) * (1 - (1 - up) * (1 - up)) + out * 40;
              g.ctx.save();
              g.ctx.globalAlpha *= 1 - out;
              g.ctx.translate(x, y);
              g.ctx.rotate(0.2 + Math.sin(f.t * 18) * (f.t < 0.55 ? 0.06 : 0.02));
              flask(g, 0, 0, 1.1, { cork: f.t < 0.55, bubbles: 5, fill: 0.6 });
              g.pen.blob(ellipsePts(-3, -40, 12, 9, 12), k.spec.paw ?? k.spec.fur);
              g.ctx.restore();
            },
          });
        }
        if (cue('pop', 0.55)) {
          rig.squash.kick(2.2);
          rig.say('pop!', 122, hy - 30, 20);
          rig.fx.push({
            t: 0,
            life: 0.9,
            x: 94,
            y: hy - 4,
            vx: 70,
            vy: -330,
            rot: 0,
            update(/** @type {any} */ f, /** @type {number} */ dt) {
              f.vy += 900 * dt;
              f.x += f.vx * dt;
              f.y += f.vy * dt;
              f.rot += dt * 14;
            },
            draw(/** @type {any} */ f, /** @type {Geo} */ g) {
              g.ctx.save();
              g.ctx.translate(f.x, f.y);
              g.ctx.rotate(f.rot);
              g.pen.blob([{ x: -5, y: -5 }, { x: 5, y: -5 }, { x: 6, y: 5 }, { x: -6, y: 5 }], '#C79A66', { width: g.lw * 0.8 });
              g.ctx.restore();
            },
          });
        }
        for (let i = 0; i < 7; i++) {
          if (cue(`cloud${i}`, 0.6 + i * 0.07)) {
            rig.fx.push({
              t: 0,
              life: 1.6,
              x: 94 + i * 2,
              y: hy - 6,
              vx: 55 + hash2(i, 1) * 90,
              vy: -70 - hash2(i, 2) * 70,
              seed: i,
              update(/** @type {any} */ f, /** @type {number} */ dt) {
                f.x += f.vx * dt;
                f.y += f.vy * dt;
                f.vx *= 1 - dt * 1.4;
                f.vy *= 1 - dt * 1.6;
              },
              draw(/** @type {any} */ f, /** @type {Geo} */ g) {
                const k = f.t / f.life;
                const r = 8 + 26 * Math.sqrt(k);
                puff(g, f.x + Math.sin(f.t * 4 + f.seed) * 4, f.y, r, k < 0.1 ? k * 10 : 1 - Math.max(0, (k - 0.5) / 0.5), f.seed % 2 ? NIP_GREEN : '#B6E88F', f.seed);
              },
            });
          }
        }
        if (cue('science', 0.7)) rig.say('for science!', 30, hy - 112, 24);
        if (cue('mostly', 1.9)) rig.say('…mostly.', -70, hy - 96, 16);
        if (t < 0.55) {
          rig.ov.eye = 'sparkle';
          rig.ov.mouth = 'smile';
          rig.ov.tilt = 0.08;
        } else if (t < 0.75) {
          rig.ov.mouth = 'o';
        } else if (t < 1.35) {
          rig.ov.mouth = 'open';
          rig.ov.tilt = 0.05;
        } else {
          rig.ov.eye = 'spiral';
          rig.ov.mouth = 'smile';
          rig.ov.lean = Math.sin(t * 5) * 0.05;
          rig.ov.tilt = Math.sin(t * 5 + 1) * 0.08;
        }
      },
    },
  },
};

export const spec = drNip;
export const tiers = [
  { id: 'T1', label: 'T1 · Dr. Nip, PhD' },
  { id: 'T2', label: 'T2 · Mad Scientist' },
  { id: 'T3', label: 'T3 · Chief of Catnip Research' },
  { id: '4A', label: '4A · Nip Bomb' },
  { id: '4B', label: '4B · Groovy Haze' },
];
