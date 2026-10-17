// @ts-check
// Tofu: fluffy white kitten with one black ear. Silent. Watchful. Falls over a lot.
/** @typedef {import('./catrig.js').CatSpec} CatSpec */
/** @typedef {import('./catrig.js').Geo} Geo */

/**
 * The rig fills both ears with `earFur`. A hard-stop horizontal gradient makes the
 * left ear black and the right one white. Built once per canvas context.
 * @type {WeakMap<CanvasRenderingContext2D, CanvasGradient>}
 */
const earGrads = new WeakMap();
/** @type {CanvasGradient|undefined} */
let earGrad;

/** Runs before the ears are drawn each frame (body comes first), so it primes the ear gradient. @param {Geo} g */
function primeEars(g) {
  let gr = earGrads.get(g.ctx);
  if (!gr) {
    gr = g.ctx.createLinearGradient(-110, 0, 110, 0);
    gr.addColorStop(0, '#45434F');
    gr.addColorStop(0.5, '#2F2D38');
    gr.addColorStop(0.5, '#FFFFFF');
    gr.addColorStop(1, '#E4E0D8');
    earGrads.set(g.ctx, gr);
  }
  earGrad = gr;
}

/** A tiny bandage from the most recent fall. @param {Geo} g */
function bandage(g) {
  const { pen, ctx, hy } = g;
  ctx.save();
  ctx.translate(34, hy - 36);
  ctx.rotate(-0.5);
  pen.blob(
    [
      { x: -15, y: -5 },
      { x: 15, y: -5 },
      { x: 15, y: 5 },
      { x: -15, y: 5 },
    ],
    '#F2D2A8',
    { width: g.lw * 0.8 },
  );
  ctx.fillStyle = '#E3B98A';
  ctx.fillRect(-5, -4, 10, 8);
  ctx.fillStyle = '#C99A6A';
  for (const [x, y] of [[-2.5, -1.5], [2.5, -1.5], [0, 1.8]]) {
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** @type {CatSpec} */
export const spec = {
  id: 'tofu',
  fur: '#F6F4EE',
  light: '#FFFFFF',
  shade: '#D8D3C9',
  cream: '#FFFFFF',
  belly: null,
  stripe: '#D8D3C9',
  eye: '#7FA7C9',
  eyeDark: '#2E4A66',
  eyeLight: '#CFE6F7',
  innerEar: '#F2B3BE',
  get earFur() {
    return /** @type {any} */ (earGrad);
  },
  pupil: 1.35,
  fluff: 0.95,
  mouth: 'w',
  pattern: 'none',
  bodyPattern: primeEars,
  scale: 0.55,
  bodyW: 0.86,
  bodyH: 0.8,
  headW: 1.1,
  earSize: 0.95,
  tailLen: 0.8,
  tailWidth: 1.2,
  tiers: {
    T1: [{ layer: 'head', draw: bandage }],
  },
};

export const tiers = [{ id: 'T1', label: 'T1 · Kitten' }];
