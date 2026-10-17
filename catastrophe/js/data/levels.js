// @ts-check
// 12 levels = 4 worlds × 3. Geometry is NOT copied here: each level points at
// ROOM_ART[world].room.layouts[layout] and the game reads paths/spots/stash at runtime.
import { WAVES } from './waves.js';

/**
 * @typedef {Object} LevelDef
 * @property {string} id @property {string} name @property {string} world room id in ROOM_ART
 * @property {number} worldIdx 0..3 @property {number} layout index into room.layouts
 * @property {number} startTreats @property {number} lives
 * @property {import('./ids.js').CatId[]} cats unlocked cats
 * @property {import('./waves.js').SpawnGroup[][]} waves
 * @property {string|null} boss boss id in the final wave (world level 3)
 * @property {string} [newCat] cat unlocked on this level (for a banner)
 * @property {string[]} intro enemy ids introduced here (for the "New threat" note)
 * @property {number} seed
 * @property {Gimmick} [gimmick] level-specific mechanic (Part 6)
 */
/**
 * @typedef {{kind:'screens', every:number, note:string}
 *   | {kind:'kotatsu', x:number, y:number, rx:number, ry:number, note:string}
 *   | {kind:'socks', note:string}
 *   | {kind:'rain', hp:number, wet:number, every:number, note:string}} Gimmick
 */

/** @type {Record<string, Gimmick>} */
const GIMMICKS = {
  // The shoji screens slide every few waves: only one of the two routes is open at a time.
  '2-1': { kind: 'screens', every: 3, note: 'The shoji screens slide every 3 waves, switching routes. Watch for the arrow!' },
  // Enemies under the kotatsu quilt are hidden from cats (the room redraws the quilt over them).
  '2-2': { kind: 'kotatsu', x: 960, y: 650, rx: 180, ry: 120, note: 'Enemies under the kotatsu are hidden from your cats. Cover both sides!' },
  // A sock falls from the laundry line each wave and covers a cushion for that wave.
  '2-3': { kind: 'socks', note: 'Laundry day: a sock lands on a cushion every wave. Socked cats nap at half speed.' },
  // Rain makes Spritz tougher, squirt more often and soak longer.
  '3-1': { kind: 'rain', hp: 1.25, wet: 1.5, every: 0.7, note: 'Rain! Spritz is tougher, squirts more often and soaks longer.' },
};

/** @type {import('./ids.js').CatId[][]} progressive roster per level index */
const ROSTER = [
  ['pudding', 'granny-purl'],
  ['pudding', 'granny-purl', 'mama-mittens'],
  ['pudding', 'granny-purl', 'mama-mittens', 'sriracha'],
  ['pudding', 'granny-purl', 'mama-mittens', 'sriracha', 'whiskerton'],
  ['pudding', 'granny-purl', 'mama-mittens', 'sriracha', 'whiskerton', 'maneki-mochi'],
  ['pudding', 'granny-purl', 'mama-mittens', 'sriracha', 'whiskerton', 'maneki-mochi', 'chonkington'],
];
const ALL = /** @type {import('./ids.js').CatId[]} */ (['pudding', 'granny-purl', 'mama-mittens', 'sriracha', 'whiskerton', 'maneki-mochi', 'chonkington', 'dr-nip']);

const META = [
  { id: '1-1', name: 'Morning Zoomies Meadow', world: 'countryside', treats: 220, intro: ['cucumber-cadet', 'rubber-duckie'] },
  { id: '1-2', name: "Grandpa's Cucumber Patch", world: 'countryside', treats: 260, intro: ['sneaky-pickle', 'hose-snek', 'good-boy'] },
  { id: '1-3', name: 'Shrine Steps at Sunset', world: 'countryside', treats: 300, intro: ['vroomba', 'cucumberto'] },
  { id: '2-1', name: 'Tatami Tango', world: 'house', treats: 320, intro: ['spritz', 'cone-of-shame'] },
  { id: '2-2', name: 'Kotatsu Kingdom', world: 'house', treats: 390, intro: ['empty-bowl', 'lint-roller'] },
  { id: '2-3', name: 'Laundry Day Mountain', world: 'house', treats: 360, intro: ['snip-snap', 'fancy-bed', 'sucktator'] },
  { id: '3-1', name: 'Lantern Alley in the Rain', world: 'bathhouse', treats: 380, intro: ['umbrella-uncles'] },
  { id: '3-2', name: 'Steam Bridge Crossing', world: 'bathhouse', treats: 470, intro: ['tubby-mcsoak'] },
  { id: '3-3', name: 'The Grand Bathhouse', world: 'bathhouse', treats: 420, intro: ['carrier', 'closed-door', 'bathzilla'] },
  { id: '4-1', name: 'Cloud Whale Crossing', world: 'sky', treats: 540, intro: ['party-pooper', 'thunderclap'] },
  { id: '4-2', name: 'Rooftop Moon Garden', world: 'sky', treats: 560, intro: ['monday', 'overdue-bill'] },
  { id: '4-3', name: 'Eclipse of the Empty Bowl', world: 'sky', treats: 600, intro: ['great-bowl'] },
];
const BOSSES = ['cucumberto', 'sucktator', 'bathzilla', 'great-bowl'];

/** @type {LevelDef[]} */
export const LEVELS = META.map((m, i) => {
  const cats = i < ROSTER.length ? ROSTER[i] : ALL;
  const prev = i === 0 ? [] : i - 1 < ROSTER.length ? ROSTER[i - 1] : ALL;
  const newCat = cats.find((c) => !prev.includes(c));
  return {
    id: m.id,
    name: m.name,
    world: m.world,
    worldIdx: Math.floor(i / 3),
    layout: i % 3,
    startTreats: m.treats,
    lives: 20,
    cats: [...cats],
    waves: WAVES[m.id],
    boss: i % 3 === 2 ? BOSSES[Math.floor(i / 3)] : null,
    newCat: i === 0 ? undefined : newCat,
    intro: m.intro,
    seed: 1000 + i * 77,
    gimmick: GIMMICKS[m.id],
  };
});

/** @type {Record<string, LevelDef>} */
export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

export const WORLD_ORDER = ['countryside', 'house', 'bathhouse', 'sky'];
export const WORLD_NAMES = { countryside: 'Sunbeam Countryside', house: "Grandma's Cozy House", bathhouse: 'Rainy Bathhouse Town', sky: 'Moonlit Sky Islands' };

/**
 * Endless level for a given run number (the world rotates each run).
 * @param {number} run @returns {LevelDef}
 */
export function endlessLevel(run) {
  const w = ((run % 4) + 4) % 4;
  return {
    id: 'endless',
    name: 'The Infinite Laundry Basket',
    world: WORLD_ORDER[w],
    worldIdx: w,
    layout: 2,
    startTreats: 400,
    lives: 20,
    cats: [...ALL],
    waves: [],
    boss: null,
    intro: [],
    seed: 9000 + run * 13,
  };
}
