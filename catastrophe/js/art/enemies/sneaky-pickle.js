// @ts-check
// Sneaky Pickle: a wrinkly pickle in a tiny trench coat and fedora, peeking over a popped collar.
// Until revealed (st.mem.reveal) it is drawn as a faint, shimmering see-through ghost.
// Idle fidget: hides behind a newspaper with two eye holes.
import { googlyEye, ellipsePts, soft, mouth } from './enemyrig.js';

/** @typedef {import('./enemyrig.js').EnemySpec} EnemySpec */
/** @typedef {import('./enemyrig.js').EnemyState} EnemyState */
/** @typedef {import('./enemyrig.js').EGeo} EGeo */
/** @typedef {{x:number, y:number}} Pt */

const PICKLE = '#8AA542';
const PICKLE_L = '#C7D981';
const PICKLE_D = '#5B782B';
const WRINKLE = '#4F6A26';
const COAT = '#C9A66B';
const COAT_L = '#EBD39E';
const COAT_D = '#977643';
const BELT = '#7D5E36';
const HAT = '#6E6258';
const HAT_L = '#A0917F';
const HAT_D = '#463D37';
const BAND = '#6B3A47';
const PAPER = '#F4EFE0';

const CY = -96;

/** @param {number} e0 @param {number} e1 @param {number} x */
function smooth(e0, e1, x) {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/** @param {EGeo} g @param {EnemyState} st */
function legs(g, st) {
  const { pen, lw } = g;
  const hip = -30;
  for (const s of [-1, 1]) {
    const ph = Math.sin(st.walk + (s > 0 ? Math.PI : 0)) * st.moving;
    const fx = s * 11 + ph * 11;
    const lift = Math.max(0, ph) * 8;
    pen.line(
      [
        { x: s * 8, y: hip },
        { x: (s * 8 + fx) / 2, y: (hip - lift) / 2 - 4 },
        { x: fx, y: -lift - 6 },
      ],
      { width: lw * 2.1 },
    );
    pen.blob(ellipsePts(fx + 5, -lift - 4, 11, 5.5, 12), '#4A3F3A', { width: lw * 0.8 });
  }
}

/** @param {EGeo} g */
function pickleBody(g) {
  const { pen, ctx, lw } = g;
  const pts = ellipsePts(0, CY, 33, 60, 40, (a) => 1 + 0.035 * Math.sin(a * 9) + 0.02 * Math.sin(a * 23));
  pen.blob(pts, soft(ctx, -8, CY - 30, 64, PICKLE_L, PICKLE, PICKLE_D));
  // Wrinkles.
  const wr = [
    [-14, -146, -4, -149, 4, -145],
    [-24, -126, -20, -121, -24, -116],
    [20, -134, 25, -129, 22, -124],
    [-6, -135, 2, -138, 8, -134],
  ];
  for (const w of wr) pen.line([{ x: w[0], y: w[1] }, { x: w[2], y: w[3] }, { x: w[4], y: w[5] }], { width: lw * 0.75, color: WRINKLE });
  for (const [bx, by] of [[-19, -138], [14, -146], [26, -116], [-27, -108]]) {
    ctx.fillStyle = WRINKLE;
    ctx.beginPath();
    ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @param {EGeo} g @param {EnemyState} st */
function coat(g, st) {
  const { pen, ctx, lw } = g;
  const sw = Math.sin(st.walk) * st.moving;
  const hemL = -42 + sw * 4;
  const hemR = 44 + sw * 4;
  const body = [
    { x: -33, y: -104 },
    { x: -38, y: -90 },
    { x: -39, y: -64 },
    { x: hemL, y: -34 },
    { x: hemL + 6, y: -27 },
    { x: -10, y: -28 + sw * 2 },
    { x: 10, y: -28 - sw * 2 },
    { x: hemR - 6, y: -27 },
    { x: hemR, y: -34 },
    { x: 40, y: -64 },
    { x: 39, y: -90 },
    { x: 34, y: -104 },
    { x: 0, y: -108 },
  ];
  pen.blob(body, soft(ctx, -10, -80, 70, COAT_L, COAT, COAT_D));
  // Front opening + double-breasted buttons.
  pen.line([{ x: 6, y: -104 }, { x: 4, y: -70 }, { x: 8, y: -29 }], { width: lw * 0.8, color: COAT_D });
  for (const [bx, by] of [[-6, -88], [16, -88], [-6, -74], [16, -74]]) {
    pen.blob(ellipsePts(bx, by, 3, 3, 8), '#7D5E36', { width: lw * 0.6 });
  }
  // Belt with buckle.
  pen.blob(
    [
      { x: -39, y: -66 },
      { x: 40, y: -66 },
      { x: 40, y: -57 },
      { x: -39, y: -57 },
    ],
    BELT,
    { width: lw * 0.8 },
  );
  pen.blob(
    [
      { x: -2, y: -68 },
      { x: 12, y: -68 },
      { x: 12, y: -55 },
      { x: -2, y: -55 },
    ],
    null,
    { width: lw * 0.9, ink: '#F2C14E' },
  );
  // Pockets with hands jammed in them.
  pen.line([{ x: -32, y: -48 }, { x: -18, y: -46 }], { width: lw * 0.8, color: COAT_D });
  pen.line([{ x: 22, y: -46 }, { x: 36, y: -48 }], { width: lw * 0.8, color: COAT_D });
  // Sleeves.
  pen.line([{ x: -36, y: -96 }, { x: -42, y: -70 }, { x: -26, y: -50 }], { width: lw * 0.9, color: COAT_D });
  pen.line([{ x: 37, y: -96 }, { x: 44, y: -70 }, { x: 29, y: -50 }], { width: lw * 0.9, color: COAT_D });
}

/** Popped collar lapels. @param {EGeo} g */
function collar(g) {
  const { pen, ctx } = g;
  pen.blob(
    [
      { x: -34, y: -102 },
      { x: -40, y: -124 },
      { x: -18, y: -110 },
      { x: 2, y: -104 },
      { x: -12, y: -94 },
    ],
    soft(ctx, -24, -112, 22, COAT_L, COAT, COAT_D),
  );
  pen.blob(
    [
      { x: 36, y: -102 },
      { x: 42, y: -124 },
      { x: 22, y: -110 },
      { x: 2, y: -104 },
      { x: 14, y: -94 },
    ],
    soft(ctx, 24, -112, 22, COAT_L, COAT, COAT_D),
  );
}

/** @param {EGeo} g @param {EnemyState} st @param {number} pop */
function fedora(g, st, pop) {
  const { pen, ctx, lw } = g;
  ctx.save();
  ctx.translate(2, -151 - pop * 20);
  ctx.rotate(0.12 - pop * 0.35);
  pen.blob(ellipsePts(0, 0, 46, 8.5, 22, (a) => 1 + (Math.sin(a) > 0 ? 0 : 0.05)), soft(ctx, -10, -2, 50, HAT_L, HAT, HAT_D));
  pen.blob(
    [
      { x: -28, y: 1 },
      { x: -27, y: -18 },
      { x: -14, y: -27 },
      { x: -2, y: -21 },
      { x: 12, y: -28 },
      { x: 26, y: -18 },
      { x: 28, y: 1 },
    ],
    soft(ctx, -8, -14, 34, HAT_L, HAT, HAT_D),
  );
  pen.blob(
    [
      { x: -28, y: -2 },
      { x: 28, y: -2 },
      { x: 28, y: -9 },
      { x: -27, y: -9 },
    ],
    BAND,
    { width: lw * 0.8 },
  );
  ctx.restore();
}

/** @param {EGeo} g @param {EnemyState} st @param {number} up 0..1 newspaper raise */
function newspaper(g, st, up) {
  const { pen, ctx, lw } = g;
  const y = -48 - up * 50;
  const wob = Math.sin(st.t * 3) * 1.5;
  const p = [
    { x: -40, y: y - 30 + wob },
    { x: 44, y: y - 30 - wob },
    { x: 46, y: y + 24 },
    { x: -42, y: y + 24 },
  ];
  pen.blob(p, PAPER);
  ctx.save();
  ctx.fillStyle = '#9C98A8';
  for (let r = 0; r < 4; r++) {
    for (const [x0, w] of [[-34, 30], [6, 32]]) ctx.fillRect(x0, y + r * 6 + 2, w, 2.2);
  }
  ctx.fillStyle = '#5E5A6E';
  ctx.font = `700 11px Fredoka, "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('DAILY BRINE', 2, y - 6);
  ctx.restore();
  pen.line([{ x: 2, y: y - 30 }, { x: 2, y: y + 24 }], { width: lw * 0.6, color: '#B8B2A4' });
  // Little pickle hands gripping the edges.
  for (const s of [-1, 1]) pen.blob(ellipsePts(s * 44, y + 2, 6.5, 8, 10), PICKLE, { width: lw * 0.8 });
}

/**
 * Draw the whole pickle either directly or (when stealthy) to an offscreen layer that is
 * composited at low alpha, so overlapping parts don't show through each other.
 * @param {EGeo} g @param {EnemyState} st @param {number} alpha @param {(g:EGeo)=>void} fn
 */
function layered(g, st, alpha, fn) {
  const { ctx } = g;
  const canOff = typeof OffscreenCanvas !== 'undefined' && typeof ctx.getTransform === 'function';
  if (alpha >= 0.99 || !canOff) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    fn(g);
    ctx.restore();
    return;
  }
  const m = ctx.getTransform();
  const xs = [];
  const ys = [];
  for (const [x, y] of [[-75, -200], [75, -200], [75, 12], [-75, 12]]) {
    xs.push(m.a * x + m.c * y + m.e);
    ys.push(m.b * x + m.d * y + m.f);
  }
  const x0 = Math.floor(Math.min(...xs)) - 2;
  const y0 = Math.floor(Math.min(...ys)) - 2;
  const w = Math.ceil(Math.max(...xs)) + 2 - x0;
  const h = Math.ceil(Math.max(...ys)) + 2 - y0;
  if (w <= 0 || h <= 0 || w > 4096 || h > 4096) return;
  /** @type {OffscreenCanvas} */
  let cv = st.mem.stealthCv;
  if (!cv || cv.width < w || cv.height < h) {
    cv = new OffscreenCanvas(Math.max(w, cv ? cv.width : 0), Math.max(h, cv ? cv.height : 0));
    st.mem.stealthCv = cv;
  }
  const oc = /** @type {CanvasRenderingContext2D} */ (/** @type {unknown} */ (cv.getContext('2d')));
  oc.setTransform(1, 0, 0, 1, 0, 0);
  oc.clearRect(0, 0, w, h);
  oc.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0);
  const prev = g.pen.ctx;
  g.pen.ctx = oc;
  fn({ ...g, ctx: oc });
  g.pen.ctx = prev;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(cv, 0, 0, w, h, x0, y0, w, h);
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} r */
function twinkle(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rr = i % 2 ? r * 0.25 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** @type {EnemySpec} */
export const spec = {
  id: 'sneaky-pickle',
  height: 150,
  width: 90,
  gait: 'waddle',
  deathText: 'you saw nothing.',
  draw(g, st) {
    const dying = st.mode === 'death';
    const hit = st.hit > 0.3 && !dying;
    const revealed = !!st.mem.reveal || dying;
    const alpha = revealed ? 1 : Math.max(0.32, st.hit * 0.85);
    const c = st.t % 4.2;
    const paper = st.mode === 'idle' && !hit ? smooth(0.3, 0.8, c) * (1 - smooth(3.2, 3.7, c)) : 0;

    layered(g, st, alpha, (gg) => {
      const { pen, lw } = gg;
      legs(gg, st);
      pickleBody(gg);
      coat(gg, st);
      if (paper > 0.01) newspaper(gg, st, paper);
      collar(gg);
      // Eyes peek between brim and collar, darting suspiciously.
      const dart = hit ? 0 : Math.tanh(Math.sin(st.t * 1.4) * 6);
      const ox = st.lookX;
      const oy = st.lookY;
      st.lookX = paper > 0.5 ? Math.sin(st.t * 5) : dart;
      st.lookY = hit ? -0.3 : 0.1;
      const lid = hit ? 0 : 0.52;
      googlyEye(gg, st, 'sp-l', -9, -121, 10.5, { lid, lidTilt: 0.1, lidColor: PICKLE_D, look: 1.9 });
      googlyEye(gg, st, 'sp-r', 13, -121, 10, { lid, lidTilt: -0.1, lidColor: PICKLE_D, look: 1.9 });
      st.lookX = ox;
      st.lookY = oy;
      if (hit) {
        mouth(gg, 2, -110, 6, 'o');
        pen.blob(ellipsePts(32, -126, 3.2, 5, 10, (a) => 1 + (Math.sin(a) < 0 ? 0.5 * -Math.sin(a) : 0)), '#BFE3F2', { width: lw * 0.7 });
      }
      fedora(gg, st, hit ? st.hit : 0);
    });

    if (!revealed) {
      // A few give-away glints so you *almost* notice it.
      const { ctx } = g;
      ctx.save();
      ctx.fillStyle = '#FFFDF6';
      const base = ctx.globalAlpha;
      for (let i = 0; i < 3; i++) {
        const k = (st.t * 0.8 + i / 3) % 1;
        const a = Math.sin(k * Math.PI);
        ctx.globalAlpha = base * 0.85 * a;
        twinkle(ctx, [-40, 46, -12][i], [-130, -70, -40][i] - k * 10, 7 * a + 1);
      }
      ctx.restore();
    }
  },
};
