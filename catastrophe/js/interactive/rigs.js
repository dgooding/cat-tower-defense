// @ts-check
// Art helpers: look up rigs, wear hats, and paint live portraits into canvases.
import { CatRig } from '../art/cats/catrig.js';
import { EnemyRig } from '../art/enemies/enemyrig.js';
import { CAT_ART, KITTEN_ART, HERO_ART, ENEMY_ART, BOSS_ART, HATS } from '../art/registry.js';
import { CATS as CAT_CONCEPTS, KITTENS as KITTEN_CONCEPTS, ENEMIES as ENEMY_CONCEPTS, BOSSES as BOSS_CONCEPTS } from '../gallery/concepts.js';
import { makeView, lookFrom, isCalm, paperBg } from './stage.js';
import { progress } from './store.js';

export { CatRig, EnemyRig, CAT_ART, KITTEN_ART, HERO_ART, ENEMY_ART, BOSS_ART, HATS };

/** @typedef {import('../gallery/concepts.js').Concept} Concept */
/** @typedef {import('../art/registry.js').CatArt} CatArt */
/** @typedef {import('../art/registry.js').EnemyArt} EnemyArt */

/** @param {string} id @returns {CatArt|null} */
export const catArt = (id) => CAT_ART[id] ?? KITTEN_ART[id] ?? HERO_ART[id] ?? null;
/** @param {string} id @returns {EnemyArt|null} */
export const enemyArt = (id) => ENEMY_ART[id] ?? BOSS_ART[id] ?? null;
/** @param {string} id */
export const isBoss = (id) => !!BOSS_ART[id];

/** Name/bio info for any character id. @param {string} id @returns {Concept} */
export function conceptOf(id) {
  const c = [...CAT_CONCEPTS, ...KITTEN_CONCEPTS, ...ENEMY_CONCEPTS, ...BOSS_CONCEPTS].find((x) => x.id === id);
  if (c) return c;
  const hero = HERO_ART[id]?.hero;
  if (hero) return { id, name: hero.name, title: hero.title, icon: '🦸', role: `${hero.style} hero`, look: '', bio: hero.blurb, quip: '', round: 'D1' };
  return { id, name: id, icon: '❓', role: '', look: '', bio: '', quip: '', round: 'D1' };
}

/** Accessories for a worn hat. @param {string|null|undefined} hatId */
export function hatExtra(hatId) {
  const hat = hatId ? HATS[hatId] : null;
  return hat ? [{ layer: /** @type {'head'} */ ('head'), draw: hat.draw }] : [];
}

/** A CatRig wearing its equipped Wardrobe hat. @param {string} id @param {number} [seed] */
export function makeCat(id, seed = 1) {
  const art = catArt(id);
  const rig = new CatRig(/** @type {CatArt} */ (art).spec, seed);
  rig.extra = hatExtra(progress().hats.equipped[id]);
  return rig;
}
/** @param {string} id @param {number} [seed] */
export function makeEnemy(id, seed = 1) {
  return new EnemyRig(/** @type {EnemyArt} */ (enemyArt(id)).spec, seed);
}

/** @typedef {'paper'|'meadow'|'night'|'blush'|'none'} Bg */

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h @param {Bg} bg @param {number} t */
export function portraitBg(ctx, w, h, bg, t) {
  if (bg === 'none') return ctx.clearRect(0, 0, w, h);
  if (bg === 'paper') return paperBg(ctx, w, h);
  if (bg === 'blush') return paperBg(ctx, w, h, '#FCEDEF');
  if (bg === 'meadow') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#BFE3F2');
    g.addColorStop(0.64, '#EEF7F2');
    g.addColorStop(0.65, '#9CCB73');
    g.addColorStop(1, '#6FAA55');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,248,236,0.9)';
    const cx = ((t * 10) % (w + 200)) - 100;
    for (const [dx, dy, r] of [[0, 0, 20], [24, -8, 26], [50, 0, 19]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, h * 0.2 + dy, r * (h / 300), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1E2150');
  g.addColorStop(1, '#4A4590');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.35 + 0.6 * Math.abs(Math.sin(t * 1.3 + i));
    ctx.fillStyle = '#FFE58A';
    ctx.fillRect((i * 97.3) % w, (i * 53.7) % (h * 0.7), 2, 2);
  }
  ctx.globalAlpha = 1;
}

/**
 * Live cat portrait (eyes follow the cursor, click to poke).
 * @param {HTMLCanvasElement} canvas @param {CatRig} rig
 * @param {{bg?:Bg, fill?:number, ground?:number, onClick?:()=>void, look?:boolean}} [o] fill = fraction of canvas height the cat occupies
 */
export function catView(canvas, rig, o = {}) {
  const k = rig.spec.scale ?? 1;
  const fill = o.fill ?? 0.66;
  const ground = o.ground ?? 0.88;
  const view = makeView(canvas, (v, dt, t) => {
    const s = (Math.min(v.h * fill, v.w * 0.95) / 270) * Math.max(0.75, k);
    rig.update(dt, o.look === false ? null : lookFrom(canvas, v.w / 2, v.h * ground - 140 * s));
    const { ctx } = v;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    portraitBg(ctx, v.w, v.h, o.bg ?? 'paper', t);
    ctx.save();
    ctx.translate(v.w / 2, v.h * ground);
    ctx.scale(s, s);
    rig.draw(ctx, s, { reducedMotion: isCalm() });
    ctx.restore();
  });
  if (o.onClick !== undefined) canvas.addEventListener('click', o.onClick);
  return view;
}

/**
 * Live enemy/boss portrait. Defeated rigs respawn after a beat.
 * @param {HTMLCanvasElement} canvas @param {EnemyRig} rig
 * @param {{bg?:Bg, fill?:number, ground?:number, mode?:'walk'|'idle'}} [o]
 */
export function enemyView(canvas, rig, o = {}) {
  const H = rig.spec.height ?? 180;
  const W = rig.spec.width ?? H * 0.8;
  let respawn = -1;
  if (o.mode) rig.setMode(o.mode);
  return makeView(canvas, (v, dt, t) => {
    rig.update(dt, lookFrom(canvas, v.w / 2, v.h * 0.5));
    if (rig.isGone) {
      if (respawn < 0) respawn = 0.9;
      respawn -= dt;
      if (respawn <= 0) {
        respawn = -1;
        const phase = rig.st.phase;
        rig.st.deathT = 0;
        rig.setMode(o.mode ?? 'walk');
        rig.st.phase = phase;
      }
    }
    const { ctx } = v;
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    portraitBg(ctx, v.w, v.h, o.bg ?? 'paper', t);
    const s = Math.min((v.h * (o.fill ?? 0.66)) / H, (v.w * 0.72) / W);
    ctx.save();
    ctx.translate(v.w / 2, v.h * (o.ground ?? 0.88));
    ctx.scale(s, s);
    rig.draw(ctx, s, { reducedMotion: isCalm() });
    ctx.restore();
  });
}

/** Random-ish pick. @template T @param {T[]} list @returns {T} */
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
