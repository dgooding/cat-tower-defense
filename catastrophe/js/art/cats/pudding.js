// @ts-check
// Pudding: round orange tabby, perpetual blep, dramatic hairball hurler.
import { ellipsePts, soft } from '../brush.js';
import { hash2 } from '../../core/rng.js';

/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */
/** @typedef {import('./catrig.js').CatRig} CatRig */

const HAIRBALL = '#B4703A';
const HAIRBALL_LIGHT = '#E3A468';

/** Fuzzy hairball. @param {Geo} g @param {number} x @param {number} y @param {number} r @param {number} rot */
export function drawHairball(g, x, y, r, rot) {
  const { pen, ctx, lw } = g;
  pen.blob(
    ellipsePts(x, y, r, r, 22, (a, i) => 1 + (i % 2 ? 0.1 : -0.05)),
    soft(ctx, x, y, r, HAIRBALL_LIGHT, HAIRBALL, '#8A5128'),
  );
  ctx.save();
  ctx.strokeStyle = '#7A4520';
  ctx.lineWidth = lw * 0.7;
  ctx.lineCap = 'round';
  for (let k = 0; k < 4; k++) {
    const a = rot + k * 1.7;
    const rr = r * (0.25 + hash2(k, 9) * 0.4);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * rr * 0.6, y + Math.sin(a) * rr * 0.6, rr * 0.7, a, a + 2.2);
    ctx.stroke();
  }
  ctx.restore();
}

/** @param {Geo} g */
function bowTie(g) {
  const { pen, hy } = g;
  const y = hy + 58;
  for (const s of [-1, 1]) {
    pen.blob(
      [
        { x: 0, y },
        { x: s * 20, y: y - 11 },
        { x: s * 23, y: y + 1 },
        { x: s * 20, y: y + 12 },
      ],
      '#D9573B',
    );
  }
  pen.blob(ellipsePts(0, y, 6, 6.5, 12), '#B8432C');
}

/** @param {Geo} g */
function beret(g) {
  const { pen, ctx, hy, t } = g;
  const cx = 14;
  const cy = hy - 58;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.18);
  const sway = Math.sin(t * 2.1) * 0.12;
  pen.blob(
    [
      { x: -12, y: -14 },
      { x: 6, y: -54 + sway * 20 },
      { x: 18, y: -50 + sway * 20 },
      { x: 4, y: -12 },
    ],
    '#FFF4DC',
    { width: g.lw * 0.8 },
  );
  pen.line([{ x: -4, y: -13 }, { x: 11, y: -50 + sway * 20 }], { width: g.lw * 0.6 });
  pen.blob(ellipsePts(0, 0, 46, 15, 22, (a) => 1 + (Math.sin(a) < 0 ? 0.25 * -Math.sin(a) : 0)), soft(ctx, 0, -4, 46, '#6D7FB8', '#3E4C7A', '#2E3A60'));
  pen.blob(ellipsePts(-2, -21, 5, 4, 10), '#3E4C7A');
  ctx.restore();
}

/** @param {Geo} g */
function headband(g) {
  const { pen, ctx, hy, hrx, t } = g;
  const y = hy - 30;
  ctx.save();
  ctx.lineCap = 'round';
  pen.tube(
    [
      { x: -hrx * 0.98, y: y + 8 },
      { x: 0, y: y - 4 },
      { x: hrx * 0.98, y: y + 6 },
    ],
    11,
    '#D2483C',
  );
  for (const k of [0, 1]) {
    const w = Math.sin(t * 7 + k) * 6;
    pen.tube(
      [
        { x: hrx * 0.9, y: y + 6 },
        { x: hrx * 1.25, y: y + 12 + k * 10 + w * 0.5 },
        { x: hrx * 1.55, y: y + 18 + k * 14 + w },
      ],
      7,
      '#D2483C',
    );
  }
  ctx.restore();
}

/** @param {Geo} g */
function bandolier(g) {
  const { pen, bry, brx } = g;
  const a = { x: -brx * 0.7, y: -bry * 1.75 };
  const b = { x: brx * 0.75, y: -bry * 0.35 };
  pen.tube([a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 4 }, b], 12, '#8A5A3B');
  for (let k = 1; k < 6; k++) {
    const u = k / 6;
    drawHairball(g, a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u + 4 * Math.sin(u * Math.PI), 7, k);
  }
}

/** @param {Geo} g */
function sunglasses(g) {
  const { pen, hy } = g;
  const y = hy - 44;
  for (const s of [-1, 1]) pen.blob(ellipsePts(s * 24, y, 17, 11, 16, (a) => 1 + 0.08 * Math.cos(2 * a)), '#2E2B3A');
  pen.line([{ x: -8, y: y - 2 }, { x: 0, y: y - 6 }, { x: 8, y: y - 2 }], { width: g.lw * 1.2 });
  const { ctx } = g;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 24 - 6, y - 4, 4, 2.4, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @param {Geo} g */
function bigOne(g) {
  const roll = g.t * 0.6;
  drawHairball(g, -g.brx - 58, -48, 46, roll);
}

/** @type {CatSpec} */
export const pudding = {
  id: 'pudding',
  fur: '#F2A65A',
  light: '#FFD6A3',
  shade: '#D9843E',
  cream: '#FFF1DA',
  stripe: '#C9692E',
  eye: '#97C455',
  eyeDark: '#3F6B24',
  eyeLight: '#D5EC8E',
  innerEar: '#F6B3B8',
  pattern: 'tabby',
  mouth: 'blep',
  bodyW: 1.18,
  bodyH: 1.0,
  headW: 1.05,
  earSize: 0.88,
  tailLen: 0.95,
  tiers: {
    T1: [],
    T2: [{ layer: 'neck', draw: bowTie }],
    T3: [
      { layer: 'neck', draw: bowTie },
      { layer: 'head', hat: true, draw: beret },
    ],
    '4A': [
      { layer: 'body', draw: bandolier },
      { layer: 'head', draw: headband },
    ],
    '4B': [
      { layer: 'side', draw: bigOne },
      { layer: 'head', draw: sunglasses },
    ],
  },
  actions: {
    /** "hrk… hrk… PTOO!" */
    attack: {
      duration: 2.2,
      update(rig, t) {
        const hy = -128;
        const once = (/** @type {string} */ key, /** @type {number} */ at) => {
          const k = `_${key}`;
          if (t >= at && !(/** @type {any} */ (rig)[k])) {
            /** @type {any} */ (rig)[k] = true;
            return true;
          }
          return false;
        };
        if (t < 0.02) {
          for (const k of ['_h1', '_h2', '_wind', '_spit']) /** @type {any} */ (rig)[k] = false;
        }
        if (once('h1', 0.0)) {
          rig.squash.kick(2.4);
          rig.say('hrk…', -70, hy - 70, 20);
        }
        if (once('h2', 0.42)) {
          rig.squash.kick(2.6);
          rig.say('hrk…', -84, hy - 92, 22);
        }
        if (t < 0.85) {
          rig.ov.mouth = 'o';
          rig.ov.lid = 0.25;
        }
        if (t > 0.78 && t < 1.05) {
          rig.ov.eye = 'xx';
          rig.ov.squash = 0.12;
          rig.ov.lean = -0.08;
        }
        if (once('spit', 1.05)) {
          rig.squash.kick(-4.5);
          rig.say('PTOO!', 70, hy - 85, 30);
          rig.fx.push({
            t: 0,
            life: 2.4,
            x: 18,
            y: hy + 28,
            vx: 420,
            vy: -260,
            rot: 0,
            bounced: false,
            update(/** @type {any} */ f, /** @type {number} */ dt) {
              f.vy += 900 * dt;
              f.x += f.vx * dt;
              f.y += f.vy * dt;
              f.rot += f.vx * dt * 0.02;
              if (f.y > -12) {
                f.y = -12;
                f.vy *= -0.45;
                f.vx *= 0.75;
                if (!f.bounced) {
                  f.bounced = true;
                  rig.say('bonk.', f.x, -60, 18);
                }
              }
            },
            draw(/** @type {any} */ f, /** @type {Geo} */ g) {
              const a = f.t > 2 ? (2.4 - f.t) / 0.4 : 1;
              g.ctx.save();
              g.ctx.globalAlpha *= a;
              drawHairball(g, f.x, f.y, 12, f.rot);
              g.ctx.restore();
            },
          });
        }
        if (t > 1.05 && t < 1.25) rig.ov.mouth = 'open';
        if (t > 1.3) {
          rig.ov.mouth = 'smirk';
          rig.ov.lid = 0.45;
        }
      },
    },
  },
};

export const PUDDING_TIERS = [
  { id: 'T1', label: 'T1 · Pudding' },
  { id: 'T2', label: 'T2 · Pudding, Esq.' },
  { id: 'T3', label: 'T3 · Sir Pudding the Phlegmatic' },
  { id: '4A', label: '4A · Hack-47 Hairball Gatling' },
  { id: '4B', label: '4B · The Big One' },
];

export const spec = pudding;
export const tiers = PUDDING_TIERS;
