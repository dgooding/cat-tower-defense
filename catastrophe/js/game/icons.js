// @ts-check
// Bakes small portraits of cats/enemies from the live art (via the registry) for the HUD.
import { CAT_ART, ENEMY_ART, BOSS_ART, HERO_ART } from '../art/registry.js';
import { CatRig } from '../art/cats/catrig.js';
import { EnemyRig } from '../art/enemies/enemyrig.js';

/** @type {Map<string, string>} */
const cache = new Map();

/** @param {number} size */
function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** Cat portrait (head + shoulders) as a data URL, or '' if the art fails. @param {string} id @param {number} [size] */
export function catPortrait(id, size = 112) {
  return portrait('cat', id, CAT_ART[id], size);
}

/** Hero portrait from HERO_ART. @param {string} id @param {number} [size] */
export function heroPortrait(id, size = 112) {
  return portrait('hero', id, HERO_ART[id], size);
}

/** @param {string} kind @param {string} id @param {{spec: any}|undefined} art @param {number} size */
function portrait(kind, id, art, size) {
  const key = kind + ':' + id + ':' + size;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let url = '';
  try {
    if (!art) throw new Error('no art');
    const c = canvas(size);
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    const rig = new CatRig(art.spec, 3);
    rig.setExpression('happy');
    rig.update(1 / 60, null);
    const s = (size * 1.25) / 250;
    ctx.translate(size / 2, size * 1.18);
    ctx.scale(s, s);
    rig.draw(ctx, s, { reducedMotion: true });
    url = c.toDataURL();
  } catch (err) {
    console.warn('[icons] cat portrait failed:', id, err);
  }
  cache.set(key, url);
  return url;
}

/** Enemy/boss icon as a data URL, or '' if the art fails. @param {string} id @param {number} [size] */
export function enemyIcon(id, size = 72) {
  const key = 'en:' + id + ':' + size;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let url = '';
  try {
    const art = ENEMY_ART[id] ?? BOSS_ART[id];
    const c = canvas(size);
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    const rig = new EnemyRig(art.spec, 5);
    rig.setMode('idle');
    rig.update(1 / 60, null);
    const h = art.spec.height ?? 180;
    const w = art.spec.width ?? h * 0.8;
    const s = Math.min((size * 0.86) / h, (size * 0.92) / w);
    ctx.translate(size / 2, size * 0.94);
    ctx.scale(s, s);
    rig.draw(ctx, s, { reducedMotion: true });
    url = c.toDataURL();
  } catch (err) {
    console.warn('[icons] enemy icon failed:', id, err);
  }
  cache.set(key, url);
  return url;
}
