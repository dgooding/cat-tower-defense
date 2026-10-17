// @ts-check
// Lord Chonkington III: an enormous blue-grey shorthair of noble heft. Tiny crown, velvet cushion,
// magnificent jowls. Takes three attempts to jump. When he lands, the earth remembers.
import { ellipsePts, soft } from '../brush.js';
import { star } from './catrig.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */
/** @typedef {import('./catrig.js').CatRig} CatRig */
/** @typedef {import('./catrig.js').Accessory} Accessory */
/** @typedef {import('../brush.js').Pt} Pt */

const GOLD = ['#FFE9A0', '#F2C14E', '#B9862A'];
const VELVET = ['#D0607F', '#9B2F55', '#62183A'];
const ROYAL_BLUE = ['#7E9BE0', '#3E5BA9', '#2A3C78'];
const ERMINE = '#FFFDF6';

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

/** Superellipse (pillow-ish) outline. @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} n @param {number} [count] */
function pillowPts(cx, cy, rx, ry, n, count = 36) {
  /** @type {Pt[]} */
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    pts.push({ x: cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx, y: cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry });
  }
  return pts;
}

/** Ermine spot (little black tail-tip). @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r */
function ermineSpot(ctx, x, y, r) {
  ctx.fillStyle = '#3B3A4A';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.6);
  ctx.quadraticCurveTo(x + r, y, x, y + r);
  ctx.quadraticCurveTo(x - r, y, x, y - r * 1.6);
  ctx.fill();
}

/** The royal velvet cushion he lives on. @param {Geo} g */
function cushion(g) {
  const { pen, ctx, lw, t } = g;
  const rx = g.brx * 1.38;
  const cy = -2;
  pen.blob(pillowPts(0, cy, rx, 24, 3.2), soft(ctx, -rx * 0.3, cy - 10, rx, VELVET[0], VELVET[1], VELVET[2]));
  // Gold piping along the front + button tufts.
  pen.line(
    [
      { x: -rx * 0.95, y: cy + 4 },
      { x: -rx * 0.5, y: cy + 16 },
      { x: 0, y: cy + 19 },
      { x: rx * 0.5, y: cy + 16 },
      { x: rx * 0.95, y: cy + 4 },
    ],
    { color: GOLD[1], width: lw * 1.3 },
  );
  ctx.fillStyle = VELVET[2];
  for (const x of [-0.82, 0.82]) {
    ctx.beginPath();
    ctx.ellipse(x * rx, cy - 4, 3.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tassels.
  for (const s of [-1, 1]) {
    const x = s * rx * 0.97;
    const sw = Math.sin(t * 1.6 + s) * 2;
    pen.blob(ellipsePts(x, cy - 2, 5, 5, 10), GOLD[1], { width: lw * 0.8 });
    pen.blob(
      [
        { x: x - 3, y: cy + 2 },
        { x: x + 3, y: cy + 2 },
        { x: x + 7 + sw, y: cy + 20 },
        { x: x - 7 + sw, y: cy + 20 },
      ],
      soft(ctx, x, cy + 6, 14, GOLD[0], GOLD[1], GOLD[2]),
      { width: lw * 0.8 },
    );
    for (const d of [-3, 0, 3]) pen.line([{ x: x + d * 0.6, y: cy + 8 }, { x: x + d + sw, y: cy + 18 }], { color: GOLD[2], width: lw * 0.5, amp: 0 });
  }
}

const JOWL = { x: 52, y: 42, rx: 41, ry: 28 };

/** Magnificent jowls + a dignified second chin. @param {Geo} g */
function jowls(g) {
  const { pen, ctx, S, hy, hrx } = g;
  const k = hrx / 95;
  pen.blob(ellipsePts(0, hy + 60, 36 * k, 15, 18), soft(ctx, 0, hy + 56, 34, S.light, S.muzzle ?? S.fur, S.shade));
  for (const s of [-1, 1]) {
    const x = s * JOWL.x * k;
    const y = hy + JOWL.y;
    pen.blob(ellipsePts(x, y, JOWL.rx * k, JOWL.ry, 22, (a) => 1 + 0.08 * Math.sin(a)), jowlFill(g));
  }
}

/** Same light as the head so head + jowls blend into one silhouette. @param {Geo} g */
function jowlFill(g) {
  const { ctx, S, hy, hrx } = g;
  return soft(ctx, 0, hy, hrx, S.light, S.fur, S.shade);
}

/**
 * Paints over the head's own outline where it crosses the jowls so head + jowls read as one
 * gloriously droopy silhouette, then adds a couple of soft fold lines.
 * @param {Geo} g
 */
function jowlBlend(g) {
  const { pen, ctx, hy, hrx, lw } = g;
  const k = hrx / 95;
  for (const s of [-1, 1]) {
    const x = s * JOWL.x * k;
    const y = hy + JOWL.y;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, JOWL.rx * k - lw * 1.4, JOWL.ry - lw * 1.4, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = jowlFill(g);
    ctx.lineWidth = 17;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (s > 0 ? 0 : Math.PI * 0.5) + (i / 24) * Math.PI * 0.5;
      const sn = Math.sin(a);
      const cs = Math.cos(a);
      const d = Math.min(Math.abs(a - 0.45), Math.abs(a - (Math.PI - 0.45)));
      const m = 1 + 0.06 * cs * cs + 0.075 * Math.exp((-d * d) / 0.03) + (d < 0.32 ? 0.012 : 0) + (g.S.fluff ?? 0) * 0.01;
      const px = cs * hrx * m;
      const py = hy + sn * 58 * m;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
    pen.line(
      [
        { x: s * 30 * k, y: hy + 55 },
        { x: s * 44 * k, y: hy + 61 },
        { x: s * 60 * k, y: hy + 60 },
      ],
      { width: lw * 0.7, alpha: 0.45 },
    );
  }
}

/** A tiny, tiny crown. @param {Geo} g */
function crown(g) {
  const { pen, ctx, hy, lw, t } = g;
  ctx.save();
  ctx.translate(10, hy - 56);
  ctx.rotate(0.16 + Math.sin(t * 1.3) * 0.02);
  /** @type {Pt[]} */
  const pts = [
    { x: -16, y: 2 },
    { x: -18, y: -16 },
    { x: -9, y: -7 },
    { x: 0, y: -20 },
    { x: 9, y: -7 },
    { x: 18, y: -16 },
    { x: 16, y: 2 },
  ];
  pen.blob(pts, soft(ctx, -6, -10, 20, GOLD[0], GOLD[1], GOLD[2]), { width: lw * 0.9 });
  pen.blob(ellipsePts(0, 0, 17, 4, 14), soft(ctx, -4, -1, 16, GOLD[0], GOLD[1], GOLD[2]), { width: lw * 0.9 });
  for (const [x, y] of [[-18, -17], [0, -21], [18, -17]]) pen.blob(ellipsePts(x, y, 3, 3, 8), GOLD[0], { width: lw * 0.7, amp: 0 });
  pen.blob(ellipsePts(0, -6, 3.2, 4, 8), '#D2483C', { width: lw * 0.6, amp: 0 });
  for (const x of [-10, 10]) pen.blob(ellipsePts(x, 0, 2.4, 2, 8), '#5B8FD8', { width: lw * 0.5, amp: 0 });
  ctx.fillStyle = '#FFFDF6';
  const tw = 0.5 + 0.5 * Math.sin(t * 2.3);
  star(ctx, -12, -12, 4 * tw, 0.3, 0);
  ctx.restore();
}

/** Royal sash with a medal. @param {Geo} g */
function sash(g) {
  const { pen, ctx, brx, bry, lw } = g;
  const a = { x: -brx * 0.62, y: -bry * 1.82 };
  const b = { x: brx * 0.9, y: -bry * 0.42 };
  const m = { x: (a.x + b.x) / 2 + 6, y: (a.y + b.y) / 2 + 8 };
  pen.tube([a, m, b], 17, ROYAL_BLUE[1]);
  pen.line([{ x: a.x + 2, y: a.y - 5 }, { x: m.x + 2, y: m.y - 6 }, { x: b.x + 2, y: b.y - 6 }], { color: GOLD[1], width: lw * 0.9, amp: 0 });
  pen.line([{ x: a.x - 2, y: a.y + 5 }, { x: m.x - 2, y: m.y + 6 }, { x: b.x - 2, y: b.y + 6 }], { color: GOLD[1], width: lw * 0.9, amp: 0 });
  // Medal: ribbon + gold star.
  const mx = brx * 0.42;
  const my = -bry * 0.68;
  pen.blob(
    [
      { x: mx - 6, y: my - 18 },
      { x: mx + 6, y: my - 18 },
      { x: mx + 5, y: my - 4 },
      { x: mx - 5, y: my - 4 },
    ],
    '#D2483C',
    { width: lw * 0.7 },
  );
  pen.blob(ellipsePts(mx, my + 4, 10, 10, 16, (an, i) => (i % 2 ? 0.62 : 1.05)), soft(ctx, mx - 2, my + 2, 10, GOLD[0], GOLD[1], GOLD[2]), { width: lw * 0.8 });
}

/** Red velvet cape lined with ermine, spread behind him. @param {Geo} g */
function cape(g) {
  const { pen, ctx, brx, bry, t } = g;
  const flut = Math.sin(t * 1.4) * 3;
  /** @type {Pt[]} */
  const pts = [
    { x: -brx * 0.5, y: -bry * 2.05 },
    { x: -brx * 1.12, y: -bry * 1.45 },
    { x: -brx * 1.42 - flut, y: -bry * 0.5 },
    { x: -brx * 1.5 - flut, y: -6 },
    { x: 0, y: 0 },
    { x: brx * 1.5 + flut, y: -6 },
    { x: brx * 1.42 + flut, y: -bry * 0.5 },
    { x: brx * 1.12, y: -bry * 1.45 },
    { x: brx * 0.5, y: -bry * 2.05 },
  ];
  const w = pen.blob(pts, soft(ctx, -brx * 0.5, -bry * 1.5, brx * 1.5, '#E2574F', '#B8322E', '#7E1E22'));
  // Ermine border: a white band just inside the cape's edge, dotted with little black tails.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(w[0].x, w[0].y);
  for (const p of w) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.clip();
  ctx.strokeStyle = ERMINE;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 30;
  ctx.stroke();
  ctx.restore();
  pen.blob(w, null, { amp: 0 });
  for (const s of [-1, 1]) {
    const edge = [
      { x: s * brx * 1.02, y: -bry * 1.5 },
      { x: s * (brx * 1.3 + flut), y: -bry * 0.7 },
      { x: s * (brx * 1.38 + flut), y: -bry * 0.15 },
    ];
    for (let i = 0; i < 4; i++) {
      const u = (i + 0.5) / 4;
      const p = u < 0.5 ? lerpPt(edge[0], edge[1], u * 2) : lerpPt(edge[1], edge[2], (u - 0.5) * 2);
      ermineSpot(ctx, p.x, p.y, 2.8);
    }
  }
}

/** @param {Pt} a @param {Pt} b @param {number} u */
const lerpPt = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** Fluffy ermine collar. @param {Geo} g */
function ermineCollar(g) {
  const { pen, ctx, hy, hrx } = g;
  const k = hrx / 95;
  const y = hy + 66;
  pen.blob(
    ellipsePts(0, y, 104 * k, 22, 36, (a, i) => 1 + (i % 2 ? 0.05 : -0.03)),
    soft(ctx, -20, y - 6, 90, '#FFFFFF', ERMINE, '#DCD6CC'),
  );
  for (const [x, dy] of [[-92, 2], [-66, 13], [-30, 18], [30, 18], [66, 13], [92, 2]]) ermineSpot(ctx, x * k, y + dy, 2.8);
}

/** Aviator goggles on the forehead (crown stays on, obviously). @param {Geo} g */
function aviators(g) {
  const { pen, ctx, hy, hrx, lw } = g;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, hy, hrx + 3, 61, 0, 0, Math.PI * 2);
  ctx.clip();
  pen.tube(
    [
      { x: -hrx, y: hy - 22 },
      { x: -50, y: hy - 36 },
      { x: 0, y: hy - 40 },
      { x: 50, y: hy - 36 },
      { x: hrx, y: hy - 22 },
    ],
    10,
    '#7A5236',
  );
  ctx.restore();
  for (const s of [-1, 1]) {
    const x = s * 27;
    const y = hy - 37;
    pen.blob(ellipsePts(x, y, 19, 15, 18, (a) => 1 + 0.06 * Math.cos(2 * a)), soft(ctx, x, y, 18, '#C9A27A', '#8E6644', '#5E4128'));
    pen.blob(ellipsePts(x, y, 13.5, 10.5, 16), soft(ctx, x, y, 13, '#FFE2A8', '#F2A64E', '#B8662A'), { width: lw * 0.8 });
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(x - 5, y - 4, 4.5, 2.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  pen.tube([{ x: -9, y: hy - 38 }, { x: 0, y: hy - 41 }, { x: 9, y: hy - 38 }], 5, '#5E4128');
}

/** Long aviator scarf flapping in an imaginary 300 mph wind. @param {Geo} g */
function scarf(g) {
  const { pen, ctx, hy, hrx, t, lw } = g;
  const k = hrx / 95;
  const y = hy + 58;
  pen.blob(ellipsePts(0, y, 80 * k, 14, 28), soft(ctx, -20, y - 4, 70, '#FFFDF6', '#F3ECDF', '#D7CDBD'));
  /** @type {Pt[]} */
  const tail = [];
  for (let i = 0; i <= 6; i++) {
    const u = i / 6;
    tail.push({ x: -40 * k - u * 92, y: y + 4 - u * 18 + Math.sin(t * 9 - u * 5) * 9 * u });
  }
  pen.tube(tail, 16, '#F3ECDF');
  pen.line(tail.map((p) => ({ x: p.x, y: p.y })), { color: '#D2483C', width: lw * 1.4, amp: 0 });
  // Fringe at the end.
  const e = tail[6];
  for (const d of [-6, -2, 2, 6]) pen.line([{ x: e.x - 2, y: e.y + d }, { x: e.x - 12, y: e.y + d * 1.3 + Math.sin(t * 9 + d) * 2 }], { width: lw * 0.7 });
  // Knot.
  pen.blob(ellipsePts(-40 * k, y + 6, 11, 9, 12), '#F3ECDF');
  ctx.globalAlpha = 1;
}

/** Blazing meteor trail behind him (he is very aerodynamic, spiritually). @param {Geo} g */
function meteorTrail(g) {
  const { pen, ctx, t, hy, lw } = g;
  const cx = 30;
  const cy = hy * 0.55;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.75);
  for (const [len, wid, cols, sp] of /** @type {[number, number, string[], number][]} */ ([
    [168, 80, ['#FFF4CF', '#F29E4C', '#D9573B'], 7],
    [134, 54, ['#FFFDF6', '#FFE58A', '#F2C14E'], 9],
  ])) {
    /** @type {Pt[]} */
    const pts = [];
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push({ x: u * len, y: -wid * 0.5 * (1 - u) + Math.sin(t * sp + i * 1.3) * 5 * u });
    }
    for (let i = n; i >= 0; i--) {
      const u = i / n;
      pts.push({ x: u * len * 0.92, y: wid * 0.5 * (1 - u) + Math.sin(t * sp + i * 1.7 + 2) * 5 * u });
    }
    const gr = ctx.createLinearGradient(0, 0, len, 0);
    gr.addColorStop(0, cols[0]);
    gr.addColorStop(0.45, cols[1]);
    gr.addColorStop(1, cols[2]);
    pen.blob(pts, gr, { width: lw * 0.9 });
  }
  // Embers.
  for (let i = 0; i < 6; i++) {
    const ph = (t * 1.1 + i / 6) % 1;
    ctx.globalAlpha = 1 - ph;
    ctx.fillStyle = i % 2 ? '#F29E4C' : '#FFE58A';
    star(ctx, 96 + ph * 80, (hash2(i, 5) - 0.5) * 60, 5, 0.4, t * 3 + i);
  }
  ctx.restore();
}

/** Perfect loaf: paws and haunches tucked away under a smooth fur bread. @param {Geo} g */
function loaf(g) {
  const { pen, ctx, S, brx, bry } = g;
  /** @type {Pt[]} */
  const pts = ellipsePts(0, -bry * 0.62, brx * 1.06, bry * 0.66, 34, (a) => {
    const s = Math.sin(a);
    return s > 0 ? 1 + 0.18 * s * s : 1;
  });
  pen.blob(pts, soft(ctx, -brx * 0.35, -bry * 0.9, brx * 1.1, S.light, S.fur, S.shade));
  // Gentle "bread crust" crease where the paws used to be.
  pen.line([{ x: -brx * 0.45, y: -bry * 0.25 }, { x: 0, y: -bry * 0.18 }, { x: brx * 0.45, y: -bry * 0.25 }], { width: g.lw * 0.7, alpha: 0.5 });
}

const ORBIT = [
  { kind: 'star', r: 1, ph: 0 },
  { kind: 'sock', r: 1.08, ph: 2.1 },
  { kind: 'star', r: 0.92, ph: 3.4 },
  { kind: 'cuke', r: 1.12, ph: 4.6 },
];

/** Orbiting debris; `front` decides which half of the orbit to draw. @param {Geo} g @param {boolean} front */
function orbiters(g, front) {
  const { pen, ctx, t, lw } = g;
  for (const o of ORBIT) {
    const a = t * 0.9 + o.ph;
    const inFront = Math.sin(a) > 0;
    if (inFront !== front) continue;
    const x = Math.cos(a) * 128 * o.r;
    const y = -72 + Math.sin(a) * 26 * o.r;
    const sc = 0.85 + Math.sin(a) * 0.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.rotate(t * 2 + o.ph);
    if (o.kind === 'star') {
      ctx.fillStyle = '#FFE58A';
      star(ctx, 0, 0, 9, 0.38, 0);
      ctx.strokeStyle = '#B9862A';
      ctx.lineWidth = lw * 0.6;
      ctx.stroke();
    } else if (o.kind === 'sock') {
      pen.blob(
        [
          { x: -4, y: -12 },
          { x: 5, y: -12 },
          { x: 5, y: 3 },
          { x: 12, y: 6 },
          { x: 10, y: 12 },
          { x: -4, y: 9 },
        ],
        '#F4A6B7',
        { width: lw * 0.8 },
      );
      pen.line([{ x: -4, y: -8 }, { x: 5, y: -8 }], { color: '#FFFDF6', width: lw, amp: 0 });
    } else {
      pen.blob(ellipsePts(0, 0, 13, 5.5, 14), soft(ctx, -3, -2, 12, '#B6E08F', '#6FAE4E', '#4A7F34'), { width: lw * 0.8 });
      ctx.fillStyle = '#4A7F34';
      for (const d of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.arc(d, -1, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

/** Swirling cosmic aura behind the loaf. @param {Geo} g */
function cosmicAura(g) {
  const { ctx, t, hy } = g;
  const cy = hy * 0.55;
  ctx.save();
  const gr = ctx.createRadialGradient(0, cy, 10, 0, cy, 150);
  gr.addColorStop(0, 'rgba(217,204,242,0.75)');
  gr.addColorStop(0.55, 'rgba(122,91,199,0.4)');
  gr.addColorStop(1, 'rgba(38,42,92,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(0, cy, 152, 128, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const u = i / 30;
      const a = -t * 0.8 + arm * ((Math.PI * 2) / 3) + u * 3.4;
      const r = 40 + u * 105;
      const x = Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.75;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = arm % 2 ? 'rgba(201,182,242,0.55)' : 'rgba(159,211,234,0.5)';
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = hash2(i, 4) * Math.PI * 2 - t * 0.3;
    const r = 60 + hash2(i, 8) * 88;
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
    ctx.fillStyle = `rgba(255,229,138,${0.5 + tw * 0.5})`;
    star(ctx, Math.cos(a) * r, cy + Math.sin(a) * r * 0.75, 3 + tw * 3, 0.35, 0);
  }
  ctx.restore();
  orbiters(g, false);
}

/** @param {Geo} g */
const orbitFront = (g) => orbiters(g, true);

/** @type {Accessory[]} */
const NECK = [{ layer: 'neck', draw: jowls }];
/** @type {Accessory[]} */
const HEAD = [
  { layer: 'head', draw: jowlBlend },
  { layer: 'head', draw: crown },
];

/** @type {CatSpec} */
export const chonkington = {
  id: 'chonkington',
  fur: '#8C97AB',
  light: '#BCC6D6',
  shade: '#646E87',
  cream: '#A7B1C3',
  belly: '#9BA6BA',
  muzzle: '#B3BCCB',
  paw: '#A3ADBF',
  stripe: '#76809A',
  eye: '#F0922E',
  eyeDark: '#A04E18',
  eyeLight: '#FFD27A',
  innerEar: '#D7A2AE',
  nose: '#7D7590',
  pattern: 'none',
  mouth: 'w',
  bodyW: 1.6,
  bodyH: 1.05,
  headW: 1.25,
  earSize: 0.62,
  tailLen: 0.82,
  tailWidth: 1.5,
  fluff: 0.15,
  tiers: {
    T1: [{ layer: 'side', draw: cushion }, ...NECK, ...HEAD],
    T2: [{ layer: 'side', draw: cushion }, { layer: 'body', draw: sash }, ...NECK, ...HEAD],
    T3: [{ layer: 'side', draw: cape }, { layer: 'side', draw: cushion }, { layer: 'body', draw: sash }, { layer: 'neck', draw: ermineCollar }, ...NECK, ...HEAD],
    '4A': [{ layer: 'side', draw: meteorTrail }, { layer: 'side', draw: cushion }, { layer: 'neck', draw: scarf }, ...NECK, ...HEAD, { layer: 'head', draw: aviators }],
    '4B': [
      { layer: 'side', draw: cosmicAura },
      { layer: 'side', draw: cushion },
      { layer: 'neck', draw: loaf },
      ...NECK,
      ...HEAD,
      { layer: 'head', draw: orbitFront },
    ],
  },
  actions: {
    /** "hup…" "hup…" "hup…?" … *rises* … THOOM. */
    attack: {
      duration: 3.5,
      update(rig, t) {
        const hy = -134;
        const cue = cues(rig, t);
        for (let i = 0; i < 3; i++) {
          const t0 = 0.05 + i * 0.6;
          const u = t - t0;
          if (u >= 0 && u < 0.55) {
            if (u < 0.2) rig.ov.squash = 0.16 * Math.sin((u / 0.2) * Math.PI * 0.5);
            else if (u < 0.34) rig.ov.squash = -0.07;
            else rig.ov.squash = 0.05 * Math.sin(((u - 0.34) / 0.21) * Math.PI);
            rig.ov.mouth = u < 0.2 ? 'flat' : 'o';
            rig.ov.lid = 0.3;
          }
          if (cue(`hup${i}`, t0 + 0.2)) {
            rig.squash.kick(-1.5);
            rig.say(i < 2 ? 'hup…' : 'hup…?', (i - 1) * 60, hy - 96 - i * 8, 18 + i * 2);
          }
        }
        if (cue('sweat', 1.75)) {
          rig.fx.push({
            t: 0,
            life: 0.8,
            draw(/** @type {any} */ f, /** @type {Geo} */ g) {
              const k = f.t / f.life;
              const x = 70;
              const y = hy - 44 + k * 20;
              g.ctx.save();
              g.ctx.globalAlpha *= 1 - k;
              g.ctx.fillStyle = '#9FD3EA';
              g.ctx.strokeStyle = '#5E93B3';
              g.ctx.lineWidth = g.lw * 0.6;
              g.ctx.beginPath();
              g.ctx.moveTo(x, y - 9);
              g.ctx.quadraticCurveTo(x + 6, y, x, y + 5);
              g.ctx.quadraticCurveTo(x - 6, y, x, y - 9);
              g.ctx.fill();
              g.ctx.stroke();
              g.ctx.restore();
            },
          });
        }
        if (t >= 1.85 && t < 2.15) {
          rig.ov.lid = 0.38;
          rig.ov.mouth = 'flat';
          rig.ov.squash = 0.18;
        }
        if (cue('rise', 2.15)) {
          rig.squash.kick(-3);
          rig.say('HNNGH!', 0, hy - 110, 22);
        }
        if (t >= 2.15 && t < 2.4) {
          rig.ov.squash = -0.26 * Math.sin(((t - 2.15) / 0.25) * Math.PI * 0.5);
          rig.ov.eye = 'sparkle';
          rig.ov.mouth = 'open';
        }
        if (cue('thoom', 2.4)) {
          rig.squash.kick(7);
          rig.say('THOOM', 0, hy - 120, 42);
          rig.fx.push({
            t: 0,
            life: 0.9,
            draw(/** @type {any} */ f, /** @type {Geo} */ g) {
              const k = f.t / f.life;
              const { ctx, lw } = g;
              ctx.save();
              ctx.lineCap = 'round';
              for (const [lag, col] of [[0, '#3B3A4A'], [0.12, '#F2C14E']]) {
                const kk = Math.max(0, k - /** @type {number} */ (lag)) / (1 - /** @type {number} */ (lag));
                if (kk <= 0) continue;
                const rx = 70 + kk * 250;
                ctx.globalAlpha = 1 - kk;
                ctx.strokeStyle = /** @type {string} */ (col);
                ctx.lineWidth = lw * (3 - kk * 2);
                ctx.beginPath();
                ctx.ellipse(0, 0, rx, rx * 0.2, 0, 0, Math.PI * 2);
                ctx.stroke();
              }
              // Dust puffs + debris.
              for (let i = 0; i < 8; i++) {
                const s = i % 2 ? 1 : -1;
                const x = s * (90 + k * (60 + hash2(i, 1) * 80));
                const y = -8 - Math.sin(k * Math.PI) * (16 + hash2(i, 2) * 30);
                ctx.globalAlpha = 1 - k;
                ctx.fillStyle = '#E8D2A6';
                ctx.strokeStyle = 'rgba(59,58,74,0.5)';
                ctx.lineWidth = lw * 0.6;
                ctx.beginPath();
                ctx.arc(x, y, 6 + k * 10 + hash2(i, 3) * 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
              }
              ctx.restore();
            },
          });
        }
        if (t >= 2.4 && t < 2.8) {
          rig.ov.squash = 0.3 * (1 - (t - 2.4) / 0.4);
          rig.ov.eye = 'closed';
          rig.ov.mouth = 'o';
        }
        if (t >= 2.8) {
          rig.ov.eye = 'happy';
          rig.ov.mouth = 'smile';
          rig.ov.tilt = 0.06;
        }
        if (cue('nailed', 2.95)) rig.say('as planned.', 70, hy - 80, 16);
      },
    },
  },
};

export const spec = chonkington;
export const tiers = [
  { id: 'T1', label: 'T1 · Lord Chonkington III' },
  { id: 'T2', label: 'T2 · Duke of Heft' },
  { id: 'T3', label: 'T3 · His Royal Absolute Unit' },
  { id: '4A', label: '4A · Meteor Chonk' },
  { id: '4B', label: '4B · Gravity Loaf' },
];
