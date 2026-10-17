// @ts-check
// Professor Whiskerton: slim Siamese scholar of the Dot. Mortarboard, monocle, laser pointer.
import { ellipsePts, soft, fxText } from '../brush.js';
import { star } from './catrig.js';
import { clamp, hash2 } from '../../core/rng.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */
/** @typedef {import('./catrig.js').CatRig} CatRig */

const SEAL = '#5B4334';
const SEAL_LIGHT = '#7E6150';
const CAP = '#34324A';
const GOLD = '#E8B23C';
const GOLD_DARK = '#B9862A';
const TIE = '#3F7FA6';
const LASER = '#FF3B3B';
const RAINBOW = ['#F25C5C', '#F29E4C', '#F2D14E', '#7FC46A', '#5FA8E8', '#9A7FE0'];

/** Siamese mask: a soft seal-brown smudge around the muzzle and eyes, plus darker ear bases. @param {Geo} g @param {{hrx:number, hry:number}} h */
function siameseMask(g, h) {
  const { ctx, hy } = g;
  const gr = ctx.createRadialGradient(0, hy + 20, 4, 0, hy + 12, h.hrx * 0.82);
  gr.addColorStop(0, 'rgba(91,67,52,0.98)');
  gr.addColorStop(0.5, 'rgba(110,82,64,0.8)');
  gr.addColorStop(1, 'rgba(150,118,96,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(0, hy + 12, h.hrx * 0.84, h.hry * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const s of [-1, 1]) {
    const er = ctx.createRadialGradient(s * h.hrx * 0.7, hy - h.hry * 0.85, 2, s * h.hrx * 0.7, hy - h.hry * 0.85, 34);
    er.addColorStop(0, 'rgba(91,67,52,0.55)');
    er.addColorStop(1, 'rgba(91,67,52,0)');
    ctx.fillStyle = er;
    ctx.fillRect(s * h.hrx * 0.7 - 40, hy - h.hry - 10, 80, 60);
  }
}

/** @param {Geo} g */
function mortarboard(g) {
  const { pen, ctx, hy, t, lw } = g;
  ctx.save();
  ctx.translate(-4, hy - 58);
  ctx.rotate(-0.13);
  pen.blob(
    [
      { x: -23, y: 6 },
      { x: -21, y: -9 },
      { x: 21, y: -9 },
      { x: 23, y: 6 },
      { x: 0, y: 10 },
    ],
    soft(ctx, 0, 0, 24, '#57557A', CAP, '#24232F'),
  );
  pen.blob(
    [
      { x: -44, y: -11 },
      { x: 0, y: -26 },
      { x: 44, y: -11 },
      { x: 0, y: 1 },
    ],
    soft(ctx, -8, -16, 40, '#615F84', CAP, '#26253A'),
  );
  pen.blob(ellipsePts(0, -12, 4.5, 3.2, 10), GOLD, { width: lw * 0.7 });
  const sw = Math.sin(t * 2.4) * 3.5;
  pen.line([{ x: 0, y: -12 }, { x: 22, y: -8 }, { x: 40, y: -11 }], { color: GOLD, width: lw * 1.3 });
  const tx = 41 + sw;
  pen.line([{ x: 40, y: -11 }, { x: 40 + sw * 0.4, y: 2 }, { x: tx, y: 13 }], { color: GOLD, width: lw * 1.4 });
  pen.blob(
    [
      { x: tx - 3.5, y: 11 },
      { x: tx + 3.5, y: 11 },
      { x: tx + 6.5, y: 28 },
      { x: tx, y: 30 },
      { x: tx - 6.5, y: 28 },
    ],
    GOLD,
    { width: lw * 0.8 },
  );
  pen.line([{ x: tx - 3.5, y: 15 }, { x: tx + 3.5, y: 15 }], { color: GOLD_DARK, width: lw * 0.9, amp: 0 });
  ctx.restore();
}

/** @param {Geo} g */
function monocle(g) {
  const { pen, ctx, hy, lw, t } = g;
  const cx = 31;
  const cy = hy + 1;
  const r = 23;
  ctx.save();
  ctx.fillStyle = 'rgba(214,236,255,0.25)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Chain dangles from the rim down to the chest.
  const sw = Math.sin(t * 1.9) * 2;
  const chain = [
    { x: cx + 15, y: cy + 18 },
    { x: cx + 30 + sw, y: cy + 40 },
    { x: cx + 18 + sw, y: cy + 62 },
    { x: 8, y: cy + 66 },
  ];
  pen.line(chain, { color: GOLD_DARK, width: lw * 0.8 });
  ctx.fillStyle = GOLD;
  for (let k = 1; k < 9; k++) {
    const u = k / 9;
    const i = Math.min(2, Math.floor(u * 3));
    const f = u * 3 - i;
    const a = chain[i];
    const b = chain[i + 1];
    ctx.beginPath();
    ctx.arc(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, lw * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  const ring = pen.wob(ellipsePts(cx, cy, r, r, 24), pen.amp * 0.4);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ring.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.strokeStyle = pen.ink;
  ctx.lineWidth = lw * 3.4;
  ctx.stroke();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = lw * 1.6;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = lw * 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r - 5, -2.5, -1.75);
  ctx.stroke();
  ctx.restore();
}

/** @param {Geo} g */
function bowTie(g) {
  const { pen, ctx, hy } = g;
  const y = hy + 67;
  for (const s of [-1, 1]) {
    pen.blob(
      [
        { x: 0, y },
        { x: s * 19, y: y - 10 },
        { x: s * 22, y: y + 1 },
        { x: s * 19, y: y + 11 },
      ],
      TIE,
    );
    ctx.fillStyle = '#FFFDF6';
    for (const [dx, dy] of [[9, -3], [15, 4], [11, 6]]) {
      ctx.beginPath();
      ctx.arc(s * dx, y + dy, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  pen.blob(ellipsePts(0, y, 5.5, 6, 12), '#2F6585');
}

/** Chalky paws and drifting chalk motes. @param {Geo} g */
function chalk(g) {
  const { ctx, t } = g;
  ctx.save();
  for (const s of [-1, 1]) {
    ctx.fillStyle = 'rgba(255,253,246,0.85)';
    for (let k = 0; k < 5; k++) {
      const x = s * 17 + (hash2(k, s + 5) - 0.5) * 22;
      const y = -10 + (hash2(k, s + 9) - 0.5) * 9;
      ctx.beginPath();
      ctx.ellipse(x, y, 2.6 + hash2(k, 2) * 2.4, 1.8 + hash2(k, 4) * 1.4, hash2(k, 6) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let k = 0; k < 6; k++) {
    const ph = (t * 0.35 + hash2(k, 11)) % 1;
    const x = (hash2(k, 13) - 0.5) * 70 + Math.sin(t * 1.3 + k) * 5;
    const y = -12 - ph * 50;
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.75;
    ctx.fillStyle = '#FFFDF6';
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + hash2(k, 17) * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Academic gown panels (open front) on the body. @param {Geo} g */
function gown(g) {
  const { pen, ctx, brx, bry, hy } = g;
  const bcy = -bry;
  for (const s of [-1, 1]) {
    pen.blob(
      [
        { x: s * 10, y: hy + 54 },
        { x: s * brx * 0.8, y: hy + 58 },
        { x: s * brx * 1.12, y: bcy - 6 },
        { x: s * brx * 1.12, y: -14 },
        { x: s * brx * 0.95, y: -2 },
        { x: s * brx * 0.42, y: -2 },
        { x: s * 18, y: bcy + 6 },
      ],
      soft(ctx, s * brx * 0.6, bcy, brx, '#5C5A7C', '#3A384F', '#26253A'),
    );
    pen.line([{ x: s * brx * 0.62, y: bcy - 20 }, { x: s * brx * 0.78, y: -8 }], { color: '#26253A', width: g.lw * 0.9 });
  }
}

/** Velvet hood trim around the neck. @param {Geo} g */
function hood(g) {
  const { pen, hy, lw } = g;
  for (const s of [-1, 1]) {
    pen.tube(
      [
        { x: s * 44, y: hy + 54 },
        { x: s * 30, y: hy + 70 },
        { x: s * 14, y: hy + 92 },
      ],
      9,
      TIE,
    );
    pen.line(
      [
        { x: s * 49, y: hy + 57 },
        { x: s * 36, y: hy + 74 },
        { x: s * 21, y: hy + 95 },
      ],
      { color: GOLD, width: lw * 1.2 },
    );
  }
}

/** Disco prism with a rainbow fan and floor spots. @param {Geo} g */
function discoPrism(g) {
  const { pen, ctx, t, lw } = g;
  const px = -86;
  const py = -86 + Math.sin(t * 2) * 4;
  ctx.save();
  // Rainbow fan sweeping onto the floor.
  for (let i = 0; i < RAINBOW.length; i++) {
    const a0 = 1.95 + i * 0.12 + Math.sin(t * 1.5) * 0.12;
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = RAINBOW[i];
    ctx.beginPath();
    ctx.moveTo(px - 4, py + 8);
    ctx.lineTo(px - 4 + Math.cos(a0) * 96, py + 8 + Math.sin(a0) * 96);
    ctx.lineTo(px - 4 + Math.cos(a0 + 0.1) * 96, py + 8 + Math.sin(a0 + 0.1) * 96);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const k = (Math.floor(t * 3) + i) % RAINBOW.length;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = RAINBOW[k];
    ctx.beginPath();
    ctx.ellipse(-150 + i * 34 + Math.sin(t * 2 + i) * 6, -4, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(Math.sin(t * 1.2) * 0.25);
  pen.blob(
    [
      { x: 0, y: -20 },
      { x: 18, y: 12 },
      { x: -18, y: 12 },
    ],
    'rgba(225,240,255,0.85)',
    { width: lw * 1.1 },
  );
  pen.line([{ x: 0, y: -20 }, { x: 4, y: 12 }], { width: lw * 0.6, alpha: 0.6 });
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(-5, 0, 2.5, 6, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Rainbow sparkles all around him.
  for (let k = 0; k < 9; k++) {
    const ph = (t * 0.7 + hash2(k, 21)) % 1;
    const a = hash2(k, 23) * Math.PI * 2;
    const r = 92 + hash2(k, 25) * 30;
    const x = Math.cos(a) * r;
    const y = -110 + Math.sin(a) * r * 0.85;
    ctx.save();
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.fillStyle = RAINBOW[k % RAINBOW.length];
    star(ctx, x, y, 5 + 5 * Math.sin(ph * Math.PI), 0.3, t + k);
    ctx.restore();
  }
}

/** Satellite-dish headset with a boom mic and a blinking red light. @param {Geo} g */
function dishHeadset(g) {
  const { pen, ctx, hy, hrx, t, lw } = g;
  pen.tube(
    [
      { x: -hrx * 0.98, y: hy - 4 },
      { x: -hrx * 0.72, y: hy - 52 },
      { x: 0, y: hy - 70 },
      { x: hrx * 0.72, y: hy - 52 },
      { x: hrx * 0.98, y: hy - 4 },
    ],
    7,
    '#8E93A6',
  );
  // Boom mic.
  pen.tube(
    [
      { x: hrx * 0.95, y: hy + 10 },
      { x: hrx * 0.82, y: hy + 40 },
      { x: 26, y: hy + 40 },
    ],
    4,
    '#6C7186',
  );
  pen.blob(ellipsePts(22, hy + 40, 7, 6, 12), '#3E4252');
  for (const s of [-1, 1]) pen.blob(ellipsePts(s * hrx * 0.98, hy + 2, 12, 17, 16), soft(ctx, s * hrx, hy, 16, '#B5BACB', '#7D8296', '#5A5E70'));
  // Dish on a little stalk.
  const bx = -hrx * 1.05;
  const by = hy - 8;
  pen.tube([{ x: bx, y: by }, { x: bx - 12, y: by - 26 }], 4, '#8E93A6');
  ctx.save();
  ctx.translate(bx - 18, by - 38);
  ctx.rotate(-0.6 + Math.sin(t * 0.8) * 0.15);
  pen.blob(ellipsePts(0, 0, 25, 11, 20, (a) => (Math.sin(a) > 0 ? 1.15 : 0.7)), soft(ctx, 0, 0, 25, '#FFFFFF', '#D9DEE8', '#A9AFC0'));
  pen.line([{ x: 0, y: 2 }, { x: 0, y: -20 }], { width: lw * 0.9 });
  pen.line([{ x: -14, y: -3 }, { x: 0, y: -20 }, { x: 14, y: -3 }], { width: lw * 0.6, alpha: 0.7 });
  const on = Math.sin(t * 6) > 0;
  pen.blob(ellipsePts(0, -21, 4, 4, 10), on ? LASER : '#8A2A2A', { width: lw * 0.7 });
  if (on) {
    const gl = ctx.createRadialGradient(0, -21, 1, 0, -21, 14);
    gl.addColorStop(0, 'rgba(255,80,80,0.6)');
    gl.addColorStop(1, 'rgba(255,80,80,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(0, -21, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Glowing laser dot. @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r @param {string} col */
function laserDot(ctx, x, y, r, col) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  gr.addColorStop(0, '#FFFFFF');
  gr.addColorStop(0.25, col);
  gr.addColorStop(1, 'rgba(255,60,60,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 2.4, r * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Where the dot is, `u` seconds after the beam switches on.
 * Sweeps out to the right, pauses, then zips around his feet (and he chases it).
 * @param {number} u @returns {{x:number, y:number, on:boolean, chase:number}}
 */
function dotAt(u) {
  if (u < 0) return { x: 90, y: -4, on: false, chase: 0 };
  if (u < 0.8) {
    const k = u / 0.8;
    const e = k * k * (3 - 2 * k);
    return { x: 90 + e * 170, y: -4 - Math.sin(k * 9) * 3, on: true, chase: 0 };
  }
  if (u < 0.95) return { x: 260, y: -4, on: true, chase: 0 };
  if (u < 2.05) {
    const v = u - 0.95;
    const back = Math.min(1, v / 0.2);
    const zig = Math.sin(v * 8.5) * 75 + Math.sin(v * 15) * 18;
    return { x: 260 * (1 - back) + back * (30 + zig), y: -4 - Math.abs(Math.sin(v * 11)) * 6, on: true, chase: 1 };
  }
  return { x: 40, y: -4, on: false, chase: 0 };
}

/** @param {CatRig} rig @param {number} t */
function attackUpdate(rig, t) {
  const hy = -128;
  const R = /** @type {any} */ (rig);
  if (!R._wk || t < R._wk.last) R._wk = { last: t };
  const st = R._wk;
  st.last = t;
  const once = (/** @type {string} */ key, /** @type {number} */ at) => {
    if (t >= at && !st[key]) {
      st[key] = true;
      return true;
    }
    return false;
  };
  const T0 = 0.2;
  if (once('raise', 0)) {
    rig.squash.kick(1.6);
    rig.fx.push({
      t: 0,
      life: 2.75,
      update() {},
      draw(/** @type {any} */ f, /** @type {Geo} */ g) {
        const { pen, ctx, lw } = g;
        const ext = clamp(f.t / T0, 0, 1) * clamp((2.75 - f.t) / 0.3, 0, 1);
        const d = dotAt(f.t - T0);
        const sh = { x: 30, y: -60 };
        const paw = { x: sh.x + ext * 52, y: sh.y - 2 - ext * 10 };
        pen.tube([sh, { x: (sh.x + paw.x) / 2, y: (sh.y + paw.y) / 2 - 3 }, paw], 17, SEAL_LIGHT);
        // Laser pointer aimed at the dot.
        const dx = d.x - paw.x;
        const dy = d.y - paw.y;
        const l = Math.hypot(dx, dy) || 1;
        const ux = dx / l;
        const uy = dy / l;
        const tip = { x: paw.x + ux * 24, y: paw.y + uy * 24 };
        pen.tube([{ x: paw.x - ux * 6, y: paw.y - uy * 6 }, tip], 6, '#C9CEDA');
        pen.blob(ellipsePts(paw.x, paw.y, 11, 10, 14), SEAL);
        for (const dy of [-3.5, 3.5]) pen.line([{ x: paw.x + 4, y: paw.y + dy }, { x: paw.x + 10, y: paw.y + dy }], { width: lw * 0.6, amp: 0 });
        if (d.on && ext > 0.95) {
          const dots = rig.tier === '4A' ? [-36, 0, 36] : [0];
          dots.forEach((off, i) => {
            const col = rig.tier === '4A' ? RAINBOW[(i * 2 + Math.floor(f.t * 6)) % RAINBOW.length] : LASER;
            const ex = d.x + off * (1 - d.chase);
            ctx.save();
            ctx.lineCap = 'round';
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = col;
            ctx.lineWidth = lw * 3;
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y);
            ctx.lineTo(ex, d.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.lineWidth = lw * 0.9;
            ctx.beginPath();
            ctx.moveTo(tip.x, tip.y);
            ctx.lineTo(ex, d.y);
            ctx.stroke();
            ctx.restore();
            laserDot(ctx, ex, d.y, rig.tier === '4B' ? 9 : 6, col);
            if (rig.tier === '4B') {
              const rr = 18 + Math.sin(f.t * 10) * 3;
              pen.line(ellipsePts(ex, d.y, rr, rr * 0.45, 16).concat([{ x: ex + rr, y: d.y }]), { color: LASER, width: lw * 0.8, amp: 0 });
              for (const s of [-1, 1]) pen.line([{ x: ex + s * (rr + 8), y: d.y }, { x: ex + s * (rr - 4), y: d.y }], { color: LASER, width: lw * 0.8, amp: 0 });
            }
          });
        }
      },
    });
  }
  const d = dotAt(t - T0);
  rig.look.y.x = 0.9;
  rig.look.x.x = clamp(d.x / 110, -1, 1);
  if (t < T0) {
    rig.ov.lid = 0.3;
    rig.ov.mouth = 'flat';
    rig.ov.squash = 0.06;
  } else if (t < T0 + 0.95) {
    rig.ov.lid = 0.3;
    rig.ov.mouth = 'smirk';
    if (once('observe', T0)) rig.say('Observe.', 80, hy - 80, 20);
  } else if (d.chase) {
    rig.ov.eye = 'sparkle';
    rig.ov.mouth = 'o';
    rig.ov.lean = clamp((d.x - 20) * 0.0016, -0.14, 0.14);
    rig.ov.tilt = clamp((d.x - 20) * 0.0025, -0.2, 0.2);
    if (once('bang', T0 + 0.97)) {
      rig.squash.kick(-3.5);
      fxSay(rig, '!', 64, hy - 84);
    }
    for (const at of [1.45, 1.8, 2.1]) if (once(`hop${at}`, at)) rig.squash.kick(-3.2);
  } else {
    rig.ov.mouth = 'smirk';
    rig.ov.lid = 0.45;
    rig.look.x.x = -0.4;
    rig.look.y.x = 0;
    if (once('field', T0 + 2.1)) {
      rig.squash.kick(1.8);
      rig.say('Field research.', 0, hy - 112, 20);
    }
  }
}

/** Big red "!" pop. @param {CatRig} rig @param {string} text @param {number} x @param {number} y */
function fxSay(rig, text, x, y) {
  rig.fx.push({
    t: 0,
    life: 0.6,
    draw(/** @type {any} */ f, /** @type {Geo} */ g) {
      const k = f.t / f.life;
      fxText(g.ctx, text, x, y - k * 10, 40 * (k < 0.2 ? 0.5 + k * 2.5 : 1), '#D2483C', k > 0.7 ? (1 - k) / 0.3 : 1);
    },
  });
}

const base = [
  { layer: /** @type {const} */ ('head'), hat: true, draw: mortarboard },
  { layer: /** @type {const} */ ('head'), draw: monocle },
];
const t2 = [{ layer: /** @type {const} */ ('neck'), draw: chalk }, { layer: /** @type {const} */ ('neck'), draw: bowTie }];
const t3 = [{ layer: /** @type {const} */ ('body'), draw: gown }, { layer: /** @type {const} */ ('neck'), draw: hood }, ...t2];

/** @type {CatSpec} */
export const spec = {
  id: 'whiskerton',
  fur: '#F2E7D3',
  light: '#FFF9EC',
  shade: '#D2C0A0',
  cream: '#FFFBF2',
  belly: '#FFFDF6',
  muzzle: '#8A6B55',
  paw: SEAL,
  stripe: SEAL,
  eye: '#4FA8EE',
  eyeDark: '#1F4F8F',
  eyeLight: '#BDE7FF',
  innerEar: '#C98F8C',
  earFur: SEAL,
  tailColor: SEAL,
  lidColor: '#B8977C',
  nose: '#4E3A33',
  brow: 'smug',
  pattern: 'none',
  headPattern: siameseMask,
  bodyW: 0.84,
  bodyH: 1.03,
  headW: 0.94,
  earSize: 1.22,
  tailLen: 1.3,
  tailWidth: 0.72,
  tiers: {
    T1: [...base],
    T2: [...t2, ...base],
    T3: [...t3, ...base],
    '4A': [{ layer: 'neck', draw: discoPrism }, ...t3, ...base],
    '4B': [...t3, { layer: 'head', draw: dishHeadset }, ...base],
  },
  actions: {
    /** Laser sweep, then a brief, dignified chase of his own dot. "Field research." */
    attack: { duration: 2.9, update: attackUpdate },
  },
};

export const tiers = [
  { id: 'T1', label: 'T1 · Teaching Assistant' },
  { id: 'T2', label: 'T2 · Adjunct Professor of Dot' },
  { id: 'T3', label: 'T3 · Tenured Dotologist' },
  { id: '4A', label: '4A · Disco Dot' },
  { id: '4B', label: '4B · Red Dot of Doom' },
];
