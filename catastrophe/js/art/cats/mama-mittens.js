// @ts-check
// Mama Mittens: tuxedo mom in a gingham apron, wooden spoon held high. "BEANS!"
import { ellipsePts, soft } from '../brush.js';
import { star } from './catrig.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */
/** @typedef {import('./catrig.js').CatRig} CatRig */
/** @typedef {import('./catrig.js').Accessory} Accessory */

const FUR = '#4A4754';
const FUR_LIGHT = '#6E6A7C';
const WHITE_FUR = '#FFFCF4';
const GINGHAM = 'rgba(214,84,96,0.42)';
const WOOD = '#C8955A';
const CAPE = '#3E8E9E';
const GOLD = '#F2C14E';

/** Per-rig spoon-wave amount (0..1), keyed by the rig's Pen so each Mama waves on her own. */
const waveOf = new WeakMap();

/** White blaze up the nose. @param {Geo} g */
function blaze(g) {
  const { ctx, hy } = g;
  ctx.fillStyle = WHITE_FUR;
  ctx.beginPath();
  ctx.moveTo(-16, hy + 22);
  ctx.quadraticCurveTo(-5, hy - 6, 0, hy - 42);
  ctx.quadraticCurveTo(5, hy - 6, 16, hy + 22);
  ctx.closePath();
  ctx.fill();
}

/** @param {Geo} g @param {{x:number,y:number}[]} pts */
function clipTo(g, pts) {
  const { ctx } = g;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
}

/** Gingham apron with ruffled hem and a heart pocket. @param {Geo} g */
function apron(g) {
  const { pen, ctx, brx, lw } = g;
  // Waist ties wrap around the body.
  pen.tube([{ x: -brx * 1.0, y: -60 }, { x: 0, y: -56 }, { x: brx * 1.0, y: -60 }], 6, '#D65460');
  /** @type {{x:number,y:number}[]} */
  const pts = [
    { x: -21, y: -96 },
    { x: 21, y: -96 },
    { x: 25, y: -58 },
    { x: 44, y: -14 },
  ];
  for (let k = 0; k <= 8; k++) {
    const x = 44 - (k * 88) / 8;
    pts.push({ x, y: k % 2 ? -2 : -8 });
  }
  pts.push({ x: -44, y: -14 }, { x: -25, y: -58 });
  const w = pen.blob(pts, '#FFF6F2');
  ctx.save();
  clipTo(g, w);
  ctx.fillStyle = GINGHAM;
  for (let x = -48; x < 48; x += 12) ctx.fillRect(x, -100, 6, 100);
  for (let y = -100; y < 0; y += 12) ctx.fillRect(-50, y, 100, 6);
  ctx.restore();
  ctx.beginPath();
  w.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = pen.ink;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
  pen.line([{ x: -25, y: -58 }, { x: 0, y: -55 }, { x: 25, y: -58 }], { color: '#D65460', width: lw * 2.2 });
  // Pocket with a stitched heart.
  pen.blob(
    [
      { x: 6, y: -42 },
      { x: 30, y: -42 },
      { x: 31, y: -22 },
      { x: 18, y: -18 },
      { x: 5, y: -22 },
    ],
    '#FBE3E3',
    { width: lw * 0.9 },
  );
  const hx = 18;
  const hy2 = -31;
  ctx.fillStyle = '#E0606E';
  ctx.beginPath();
  ctx.moveTo(hx, hy2 + 5);
  ctx.bezierCurveTo(hx - 8, hy2, hx - 4, hy2 - 6, hx, hy2 - 2);
  ctx.bezierCurveTo(hx + 4, hy2 - 6, hx + 8, hy2, hx, hy2 + 5);
  ctx.fill();
}

/** Spoon tucked in the apron pocket (when the paw is busy with a lance). @param {Geo} g */
function pocketSpoon(g) {
  const { pen, ctx } = g;
  pen.tube([{ x: 22, y: -30 }, { x: 34, y: -72 }], 5, WOOD);
  pen.blob(ellipsePts(36, -78, 7, 10, 14), soft(ctx, 36, -78, 9, '#E8BF86', WOOD, '#A0764F'));
  pen.blob(
    [
      { x: 6, y: -42 },
      { x: 30, y: -42 },
      { x: 31, y: -22 },
      { x: 18, y: -18 },
      { x: 5, y: -22 },
    ],
    '#FBE3E3',
    { width: g.lw * 0.9 },
  );
}

/**
 * The raised arm with whatever she's brandishing, rotated around the shoulder.
 * @param {(g:Geo)=>void} held drawn in arm-local space; the paw sits at (0,0), "up" is -y.
 */
function raisedArm(held) {
  return (/** @type {Geo} */ g) => {
    const { pen, ctx, t } = g;
    const wave = waveOf.get(pen) ?? 0;
    const sx = -44;
    const sy = -64;
    const ang = Math.sin(t * 1.6) * 0.05 + wave * Math.sin(t * 17) * 0.38 - wave * 0.15;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    const px = -50;
    const py = -36;
    pen.tube([{ x: 0, y: 0 }, { x: px * 0.5, y: py * 0.5 - 6 }, { x: px, y: py }], 20, FUR_LIGHT);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.25);
    held(g);
    ctx.restore();
    pen.blob(ellipsePts(px, py, 13, 12, 14), WHITE_FUR);
    for (const d of [-4, 4]) pen.line([{ x: px - 9, y: py + d }, { x: px - 3, y: py + d }], { width: g.lw * 0.6, amp: 0 });
    ctx.restore();
  };
}

/** @param {Geo} g */
function spoon(g) {
  const { pen, ctx } = g;
  pen.tube([{ x: 0, y: 18 }, { x: 0, y: -62 }], 7, WOOD);
  pen.blob(ellipsePts(0, -78, 13, 19, 18), soft(ctx, -3, -82, 18, '#F0CB93', WOOD, '#A0764F'));
  ctx.fillStyle = 'rgba(160,118,79,0.5)';
  ctx.beginPath();
  ctx.ellipse(1, -76, 7, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Toothpick lance with a pennant. @param {Geo} g */
function lance(g) {
  const { pen, ctx, t, lw } = g;
  ctx.save();
  ctx.rotate(0.35);
  pen.blob(
    [
      { x: -4, y: 26 },
      { x: 4, y: 26 },
      { x: 3, y: -110 },
      { x: 0, y: -140 },
      { x: -3, y: -110 },
    ],
    '#F0D9A8',
  );
  const f = Math.sin(t * 6) * 4;
  pen.blob(
    [
      { x: 2, y: -104 },
      { x: 34, y: -96 + f },
      { x: 2, y: -86 },
    ],
    '#D2483C',
    { width: lw * 0.9 },
  );
  pen.line([{ x: 10, y: -102 + f * 0.3 }, { x: 22, y: -96 + f * 0.7 }], { color: '#FFFDF6', width: lw * 1.2 });
  // Bottle-cap hand guard.
  pen.blob(ellipsePts(0, -4, 14, 6, 14, (a, i) => 1 + (i % 2 ? 0.12 : 0)), soft(ctx, 0, -6, 14, '#F7E08A', GOLD, '#C99A2E'));
  ctx.restore();
}

/** Super Mom cape (behind her), fluttering. @param {Geo} g */
function cape(g) {
  const { pen, ctx, hy, t, lw } = g;
  const top = hy + 44;
  const fl = Math.sin(t * 4.2);
  /** @type {{x:number,y:number}[]} */
  const pts = [
    { x: -44, y: top },
    { x: 44, y: top },
    { x: 96, y: -84 + fl * 4 },
    { x: 132 + fl * 6, y: -52 + fl * 6 },
  ];
  for (let k = 0; k <= 6; k++) {
    const u = k / 6;
    const x = 118 - u * 222 + Math.sin(t * 5 - u * 6) * 4;
    const y = -4 + Math.sin(t * 5 + u * 7) * 4 - 22 * Math.max(0, 1 - u / 0.2);
    pts.push({ x, y });
  }
  pts.push({ x: -98, y: -60 });
  const w = pen.blob(pts, soft(ctx, 20, -50, 110, '#6FC0CF', CAPE, '#2A6672'));
  ctx.save();
  clipTo(g, w);
  pen.line(
    w.slice(3, 11).map((p) => ({ x: p.x, y: p.y - 4 })),
    { color: GOLD, width: lw * 2, amp: 0 },
  );
  ctx.restore();
}

/** Cape knot at the collar. @param {Geo} g */
function capeClasp(g) {
  const { pen, hy, lw } = g;
  for (const s of [-1, 1]) pen.blob(ellipsePts(s * 30, hy + 60, 10, 7, 12), GOLD, { width: lw * 0.9 });
  pen.blob(ellipsePts(0, hy + 62, 9, 9, 12), '#F7D777');
  star(g.ctx, 0, hy + 62, 6, 0.4, 0);
}

/** PTA sash with a prize rosette. @param {Geo} g */
function sash(g) {
  const { pen, ctx, brx, lw } = g;
  pen.tube([{ x: -brx * 0.82, y: -92 }, { x: 0, y: -50 }, { x: brx * 0.95, y: -14 }], 15, '#7A5BC7');
  pen.line([{ x: -brx * 0.82, y: -92 }, { x: 0, y: -50 }, { x: brx * 0.95, y: -14 }], { color: GOLD, width: lw * 0.8, amp: 0 });
  const rx = -28;
  const ry = -60;
  for (const s of [-1, 1]) {
    pen.blob(
      [
        { x: rx + s * 3, y: ry },
        { x: rx + s * 10, y: ry + 22 },
        { x: rx + s * 5, y: ry + 18 },
        { x: rx + s * 1, y: ry + 24 },
      ],
      '#4E7FC2',
      { width: lw * 0.8 },
    );
  }
  pen.blob(ellipsePts(rx, ry, 11, 11, 16, (a, i) => 1 + (i % 2 ? 0.14 : 0)), '#4E7FC2');
  pen.blob(ellipsePts(rx, ry, 6, 6, 12), GOLD, { width: lw * 0.8 });
  ctx.fillStyle = '#FFFDF6';
  star(ctx, rx, ry, 3.5, 0.4, 0);
}

/** Clipboard with a very thorough checklist. @param {Geo} g */
function clipboard(g) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(44, -44);
  ctx.rotate(0.14);
  pen.blob(
    [
      { x: -18, y: -24 },
      { x: 18, y: -24 },
      { x: 18, y: 24 },
      { x: -18, y: 24 },
    ],
    '#B98A5A',
  );
  pen.blob(
    [
      { x: -14, y: -18 },
      { x: 14, y: -18 },
      { x: 14, y: 20 },
      { x: -14, y: 20 },
    ],
    '#FFFDF6',
    { width: lw * 0.7 },
  );
  for (let k = 0; k < 4; k++) {
    const y = -10 + k * 8;
    pen.line([{ x: -10, y: y }, { x: -7, y: y + 3 }, { x: -3, y: y - 3 }], { color: k === 3 ? '#D2483C' : '#5E9A4E', width: lw * 0.8, amp: 0 });
    pen.line([{ x: 0, y }, { x: 10, y }], { width: lw * 0.5, alpha: 0.5, amp: 0 });
  }
  pen.blob(
    [
      { x: -8, y: -28 },
      { x: 8, y: -28 },
      { x: 9, y: -19 },
      { x: -9, y: -19 },
    ],
    '#AEB4C2',
    { width: lw * 0.9 },
  );
  pen.blob(ellipsePts(-18, 6, 9, 8, 12), WHITE_FUR);
  ctx.restore();
}

/** Ninja headband with a sock emblem. @param {Geo} g */
function ninjaBand(g) {
  const { pen, ctx, hy, hrx, t, lw } = g;
  const y = hy - 32;
  for (const k of [0, 1]) {
    const w = Math.sin(t * 7 + k * 1.3) * 6;
    pen.tube(
      [
        { x: -hrx * 0.9, y: y + 6 },
        { x: -hrx * 1.25, y: y + 10 + k * 12 + w * 0.5 },
        { x: -hrx * 1.6, y: y + 14 + k * 18 + w },
      ],
      7,
      '#2E3550',
    );
  }
  pen.tube(
    [
      { x: -hrx * 0.99, y: y + 8 },
      { x: 0, y: y - 4 },
      { x: hrx * 0.99, y: y + 8 },
    ],
    12,
    '#2E3550',
  );
  pen.blob(
    [
      { x: -15, y: y - 11 },
      { x: 15, y: y - 11 },
      { x: 15, y: y + 6 },
      { x: -15, y: y + 6 },
    ],
    soft(ctx, -4, y - 6, 16, '#E8ECF2', '#B9C0CC', '#8E96A6'),
    { width: lw * 0.9 },
  );
  // Tiny sock emblem.
  pen.line([{ x: -3, y: y - 7 }, { x: -3, y: y + 1 }, { x: 6, y: y + 1 }], { width: lw * 1.3 });
}

/** Striped laundry sock worn as a ninja face mask, toe flopping off one side. @param {Geo} g */
function sockMask(g) {
  const { pen, ctx, hy, hrx, t, lw } = g;
  const top = hy + 14;
  /** @type {{x:number,y:number}[]} */
  const pts = [
    { x: -hrx * 1.0, y: top + 4 },
    { x: -30, y: top - 2 },
    { x: 0, y: top + 2 },
    { x: 30, y: top - 2 },
    { x: hrx * 1.0, y: top + 4 },
    { x: hrx * 0.82, y: top + 30 },
    { x: 0, y: top + 46 },
    { x: -hrx * 0.82, y: top + 30 },
  ];
  const w = pen.blob(pts, '#F4F1EA');
  ctx.save();
  clipTo(g, w);
  ctx.fillStyle = '#7FA9D8';
  for (let y = top - 4; y < top + 50; y += 12) ctx.fillRect(-hrx * 1.1, y, hrx * 2.2, 5);
  ctx.restore();
  ctx.beginPath();
  w.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = pen.ink;
  ctx.lineWidth = lw;
  ctx.stroke();
  // Toe end dangling off the right cheek.
  const f = Math.sin(t * 4) * 3;
  pen.blob(
    [
      { x: hrx * 0.88, y: top + 8 },
      { x: hrx * 1.22, y: top + 20 + f },
      { x: hrx * 1.3, y: top + 36 + f },
      { x: hrx * 1.1, y: top + 40 + f },
      { x: hrx * 0.86, y: top + 26 },
    ],
    '#D2483C',
  );
  // Nose bump.
  pen.line([{ x: -8, y: top + 8 }, { x: 0, y: top + 4 }, { x: 8, y: top + 8 }], { width: lw * 0.8, alpha: 0.6 });
}

/** Sock-shuriken tucked in the apron string. @param {Geo} g */
function shuriken(g) {
  const { pen, ctx, t } = g;
  ctx.save();
  ctx.translate(-34, -58);
  ctx.rotate(t * 0.5);
  /** @type {{x:number,y:number}[]} */
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const r = i % 2 ? 4 : 12;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  pen.blob(pts, '#B9C0CC', { width: g.lw * 0.9 });
  pen.blob(ellipsePts(0, 0, 3, 3, 8), '#7FA9D8', { width: g.lw * 0.6 });
  ctx.restore();
}

/** Bottle-cap helmet with a cotton-ball plume. @param {Geo} g */
function capHelmet(g) {
  const { pen, ctx, hy, t, lw } = g;
  const y = hy - 52;
  ctx.save();
  ctx.translate(6, y);
  ctx.rotate(0.08);
  // Feather plume.
  const sw = Math.sin(t * 2.2) * 0.12;
  ctx.save();
  ctx.translate(-4, -22);
  ctx.rotate(-0.35 + sw);
  pen.blob(
    [
      { x: 0, y: 0 },
      { x: -9, y: -20 },
      { x: -6, y: -42 },
      { x: 6, y: -58 },
      { x: 9, y: -36 },
      { x: 6, y: -14 },
    ],
    soft(ctx, 0, -30, 30, '#FFFDF6', '#F4A6B7', '#D9708A'),
    { width: lw * 0.9 },
  );
  pen.line([{ x: 1, y: -2 }, { x: 0, y: -28 }, { x: 4, y: -52 }], { width: lw * 0.6, alpha: 0.7 });
  ctx.restore();
  // Crimped skirt.
  /** @type {{x:number,y:number}[]} */
  const crimp = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    crimp.push({ x: -50 + u * 100, y: 6 + (i % 2 ? 5 : 0) });
  }
  crimp.push({ x: 46, y: -14 }, { x: -46, y: -14 });
  pen.blob(crimp, soft(ctx, -10, -6, 50, '#F9E59C', '#E3B341', '#B88A26'));
  for (let i = 1; i < 10; i++) pen.line([{ x: -48 + i * 10, y: -12 }, { x: -48 + i * 10, y: 6 }], { color: '#B88A26', width: lw * 0.6, amp: 0 });
  pen.blob(ellipsePts(0, -15, 46, 11, 24), soft(ctx, -10, -18, 46, '#F59B90', '#E0574A', '#B8402F'));
  ctx.fillStyle = '#FFFDF6';
  star(ctx, 0, -15, 8, 0.42, -Math.PI / 2);
  ctx.restore();
}

/** @param {CatRig} rig @param {number} t */
function attackUpdate(rig, t) {
  const hy = -128;
  const R = /** @type {any} */ (rig);
  if (!R._mm || t < R._mm.last) R._mm = { last: t };
  const st = R._mm;
  st.last = t;
  const once = (/** @type {string} */ key, /** @type {number} */ at) => {
    if (t >= at && !st[key]) {
      st[key] = true;
      return true;
    }
    return false;
  };
  let wave = 0;
  if (t < 0.58) {
    rig.ov.mouth = 'o';
    rig.ov.eye = 'closed';
    rig.ov.squash = -0.05;
    wave = 0.25;
    if (once('whistle', 0.05)) {
      rig.squash.kick(-2);
      rig.say('FWEEET!', -96, hy - 64, 18);
      rig.fx.push({
        t: 0,
        life: 0.55,
        draw(/** @type {any} */ f, /** @type {Geo} */ g) {
          const k = f.t / f.life;
          for (const a of [-0.5, 0, 0.5]) {
            const r0 = 26 + k * 18;
            g.pen.line(
              [
                { x: 12 + Math.cos(a) * r0, y: hy + 30 + Math.sin(a) * r0 },
                { x: 12 + Math.cos(a) * (r0 + 12), y: hy + 30 + Math.sin(a) * (r0 + 12) },
              ],
              { width: g.lw * 1.3, alpha: 1 - k },
            );
          }
        },
      });
    }
  } else if (t < 1.55) {
    rig.ov.mouth = 'open';
    rig.ov.lean = 0.05;
    wave = 1;
    if (once('beans', 0.6)) {
      rig.squash.kick(-4.6);
      rig.say('BEANS!', 10, hy - 104, 36);
    }
    if (once('noodle', 1.15)) {
      rig.squash.kick(-1.5);
      rig.say('…and NOODLE!', 84, hy - 64, 16);
    }
  } else {
    rig.ov.mouth = 'flat';
    rig.ov.lid = 0.38;
    wave = Math.max(0, 1 - (t - 1.55) / 0.15) * 0.4;
  }
  if (rig.pen) waveOf.set(rig.pen, t > 1.9 ? 0 : wave);
}

/** @type {Accessory[]} */
const base = [
  { layer: 'body', draw: apron },
  { layer: 'neck', draw: raisedArm(spoon) },
];

/** @type {CatSpec} */
export const spec = {
  id: 'mama-mittens',
  fur: FUR,
  light: FUR_LIGHT,
  shade: '#302E39',
  cream: WHITE_FUR,
  muzzle: WHITE_FUR,
  paw: WHITE_FUR,
  stripe: '#3A3844',
  eye: '#F2B33D',
  eyeDark: '#8C5410',
  eyeLight: '#FFE7A0',
  innerEar: '#E99AAA',
  whisker: '#F4F0E6',
  tailTip: WHITE_FUR,
  nose: '#F29AAB',
  outline: '#26252F',
  pattern: 'none',
  headPattern: blaze,
  bodyW: 1.06,
  headW: 1.0,
  earSize: 0.95,
  tiers: {
    T1: [...base],
    T2: [{ layer: 'side', draw: cape }, ...base, { layer: 'neck', draw: capeClasp }],
    T3: [{ layer: 'side', draw: cape }, ...base, { layer: 'body', draw: sash }, { layer: 'neck', draw: capeClasp }, { layer: 'neck', draw: clipboard }],
    '4A': [...base, { layer: 'body', draw: shuriken }, { layer: 'head', draw: sockMask }, { layer: 'head', draw: ninjaBand }],
    '4B': [
      { layer: 'side', draw: cape },
      { layer: 'body', draw: apron },
      { layer: 'body', draw: pocketSpoon },
      { layer: 'neck', draw: raisedArm(lance) },
      { layer: 'neck', draw: capeClasp },
      { layer: 'head', hat: true, draw: capHelmet },
    ],
  },
  actions: {
    /** Whistle, then the full-volume roll call, spoon waving. */
    attack: { duration: 2.0, update: attackUpdate },
  },
};

export const tiers = [
  { id: 'T1', label: 'T1 · Mama Mittens' },
  { id: 'T2', label: 'T2 · Super Mom' },
  { id: 'T3', label: 'T3 · PTA President' },
  { id: '4A', label: '4A · Ninja Kittens of the Laundry Clan' },
  { id: '4B', label: '4B · Fluffball Knights of the Round Bed' },
];
