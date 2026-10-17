// @ts-check
// Hub page: a single live Pudding who blinks, watches the cursor and reacts to clicks.
import { CatRig } from './art/cats/catrig.js';
import { pudding } from './art/cats/pudding.js';
import { registerOffline } from './core/pwa.js';

registerOffline();

const canvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById('hub-cat'));
if (canvas) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const rig = new CatRig(pudding, 11);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ptr = { x: 0, y: 0, t: -99 };
  window.addEventListener('pointermove', (e) => Object.assign(ptr, { x: e.clientX, y: e.clientY, t: performance.now() / 1000 }));
  const reactions = /** @type {const} */ (['happy', 'startled', 'smug', 'celebrate']);
  let ri = 0;
  /** @type {number|undefined} */
  let back;
  canvas.addEventListener('click', () => {
    rig.setExpression(reactions[ri++ % reactions.length]);
    rig.poke();
    clearTimeout(back);
    back = window.setTimeout(() => rig.setExpression('idle'), 1800);
  });

  let last = performance.now() / 1000;
  const loop = () => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last);
    last = now;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(r.width * dpr)) {
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    }
    const scale = (r.height * 0.62) / 250;
    const ox = r.width / 2;
    const oy = r.height * 0.86;
    /** @type {{x:number,y:number}|null} */
    let dir = null;
    if (now - ptr.t < 4) {
      let dx = (ptr.x - (r.left + ox)) / 320;
      let dy = (ptr.y - (r.top + oy - 128 * scale)) / 320;
      const l = Math.hypot(dx, dy);
      if (l > 1) {
        dx /= l;
        dy /= l;
      }
      dir = { x: dx, y: dy };
    }
    rig.update(dt, dir);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createRadialGradient(r.width / 2, r.height * 0.35, 10, r.width / 2, r.height / 2, r.width * 0.7);
    g.addColorStop(0, '#FFF8EC');
    g.addColorStop(1, '#F6DCE2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    rig.draw(ctx, scale, { reducedMotion: reduced.matches });
    ctx.restore();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
