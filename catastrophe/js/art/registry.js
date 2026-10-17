// @ts-check
// Single source of truth: id → art module. Every character/room in the game is listed here.
// Cats export { spec, tiers }, enemies/bosses export { spec }, rooms export { room }.
// Modules load independently: if one fails, a fallback is used and the error is logged,
// so a single broken sprite can never blank the gallery or the game.
// Modules with `STUB = true` are placeholders awaiting their design round.
import { fallbackCat, fallbackTiers, fallbackEnemy, fallbackRoom } from './fallbacks.js';

export const CAT_IDS = ['pudding', 'whiskerton', 'granny-purl', 'mama-mittens', 'dr-nip', 'chonkington', 'sriracha', 'maneki-mochi'];
export const KITTEN_IDS = ['beans', 'biscuit', 'noodle', 'tofu'];
export const ENEMY_IDS = [
  'cucumber-cadet', 'sneaky-pickle', 'vroomba', 'empty-bowl', 'spritz', 'cone-of-shame', 'rubber-duckie', 'tubby-mcsoak', 'snip-snap', 'party-pooper',
  'monday', 'closed-door', 'fancy-bed', 'lint-roller', 'carrier', 'hose-snek', 'umbrella-uncles', 'thunderclap', 'overdue-bill', 'good-boy',
    'cucumber-ghost',
  ];
export const BOSS_IDS = ['cucumberto', 'sucktator', 'bathzilla', 'great-bowl'];
export const ROOM_IDS = ['countryside', 'house', 'bathhouse', 'sky'];
export const HERO_IDS = ['ronin-biscuit', 'nebula', 'big-tom'];

/** @typedef {{spec: import('./cats/catrig.js').CatSpec, tiers: {id:string,label:string}[], STUB?: boolean, FAILED?: boolean}} CatArt */
/** @typedef {{spec: import('./enemies/enemyrig.js').EnemySpec, STUB?: boolean, FAILED?: boolean}} EnemyArt */
/** @typedef {{room: import('./rooms/common.js').RoomSpec, STUB?: boolean, FAILED?: boolean}} RoomArt */
/**
 * @typedef {{id:string, name:string, title:string, blurb:string, style:'melee'|'ranged'|'tank',
 *   abilities:{id:string, key:string, name:string, desc:string}[], passive:{name:string, desc:string}}} HeroMeta
 */
/** @typedef {{spec: import('./cats/catrig.js').CatSpec, hero: HeroMeta, tiers: {id:string,label:string}[], STUB?: boolean, FAILED?: boolean}} HeroArt */

/** @type {string[]} ids whose module failed to load */
export const ART_ERRORS = [];

/** @param {string} url @param {string} id */
async function load(url, id) {
  try {
    return await import(url);
  } catch (err) {
    ART_ERRORS.push(id);
    console.error(`[art] ${id} failed to load; using a placeholder.`, err);
    return null;
  }
}

/**
 * @template T
 * @param {string[]} ids @param {(id:string) => string} url @param {(m:any, id:string, i:number) => T} make
 * @returns {Promise<Record<string, T>>}
 */
async function table(ids, url, make) {
  const mods = await Promise.all(ids.map((id) => load(new URL(url(id), import.meta.url).href, id)));
  /** @type {Record<string, T>} */
  const out = {};
  ids.forEach((id, i) => (out[id] = make(mods[i], id, i)));
  return out;
}

/** @param {any} m @param {string} id @returns {CatArt} */
const cat = (m, id) =>
  m?.spec ? { spec: m.spec, tiers: m.tiers ?? fallbackTiers, STUB: !!m.STUB } : { spec: fallbackCat(id), tiers: fallbackTiers, STUB: true, FAILED: true };
/** @param {number} h @returns {(m:any, id:string) => EnemyArt} */
const enemy = (h) => (m, id) => (m?.spec ? { spec: m.spec, STUB: !!m.STUB } : { spec: fallbackEnemy(id, h), STUB: true, FAILED: true });

/** @type {Record<string, CatArt>} */
export const CAT_ART = await table(CAT_IDS, (id) => `./cats/${id}.js`, cat);
/** @type {Record<string, CatArt>} */
export const KITTEN_ART = await table(KITTEN_IDS, (id) => `./cats/${id}.js`, (m, id) => {
  const a = cat(m, id);
  if (a.FAILED) a.spec.scale = 0.55;
  return a;
});
/** @type {Record<string, EnemyArt>} */
export const ENEMY_ART = await table(ENEMY_IDS, (id) => `./enemies/${id}.js`, enemy(160));
/** @type {Record<string, EnemyArt>} */
export const BOSS_ART = await table(BOSS_IDS, (id) => `./bosses/${id}.js`, enemy(380));
/** @type {Record<string, RoomArt>} */
export const ROOM_ART = await table(ROOM_IDS, (id) => `./rooms/${id}.js`, (m, id, i) =>
  m?.room ? { room: m.room, STUB: !!m.STUB } : { room: fallbackRoom(id, i + 1), STUB: true, FAILED: true },
);
/** @type {Record<string, HeroArt>} */
export const HERO_ART = await table(HERO_IDS, (id) => `./heroes/${id}.js`, (m, id) =>
  m?.spec && m?.hero
    ? { spec: m.spec, hero: m.hero, tiers: m.tiers ?? [{ id: 'T1', label: 'Hero' }], STUB: !!m.STUB }
    : {
        spec: fallbackCat(id),
        hero: { id, name: id, title: '', blurb: '', style: 'melee', abilities: [{ id: 'a1', key: 'Z', name: 'Ability 1', desc: '' }, { id: 'a2', key: 'X', name: 'Ability 2', desc: '' }], passive: { name: 'Passive', desc: '' } },
        tiers: [{ id: 'T1', label: 'Hero' }],
        STUB: true,
        FAILED: true,
      },
);
/** Wardrobe hats (see js/art/hats.js). Falls back to no hats if the module fails. */
export const HATS = (await load(new URL('./hats.js', import.meta.url).href, 'hats'))?.HATS ?? {};
