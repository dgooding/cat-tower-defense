// @ts-check
// One source of truth for every gameplay id. Art lives in js/art/registry.js under the same ids.

export const CAT_IDS = /** @type {const} */ (['pudding', 'granny-purl', 'mama-mittens', 'sriracha', 'whiskerton', 'maneki-mochi', 'chonkington', 'dr-nip']);
/** @typedef {typeof CAT_IDS[number]} CatId */

export const KITTEN_IDS = /** @type {const} */ (['beans', 'biscuit', 'noodle', 'tofu']);

export const ENEMY_IDS = /** @type {const} */ ([
  'cucumber-cadet',
  'sneaky-pickle',
  'vroomba',
  'empty-bowl',
  'spritz',
  'cone-of-shame',
  'rubber-duckie',
  'tubby-mcsoak',
  'snip-snap',
  'party-pooper',
  'monday',
  'closed-door',
  'fancy-bed',
  'lint-roller',
  'carrier',
  'hose-snek',
  'umbrella-uncles',
  'thunderclap',
  'overdue-bill',
  'good-boy',
]);

export const BOSS_IDS = /** @type {const} */ (['cucumberto', 'sucktator', 'bathzilla', 'great-bowl']);

export const WORLD_IDS = /** @type {const} */ (['countryside', 'house', 'bathhouse', 'sky']);

export const LEVEL_IDS = /** @type {const} */ (['1-1', '1-2', '1-3', '2-1', '2-2', '2-3', '3-1', '3-2', '3-3', '4-1', '4-2', '4-3']);

export const POWER_IDS = /** @type {const} */ (['zoomies', 'mug', 'yowl']);

export const TIER_IDS = /** @type {const} */ (['T1', 'T2', 'T3', '4A', '4B']);

export const TARGET_MODES = /** @type {const} */ (['first', 'last', 'strong', 'close']);
/** @typedef {typeof TARGET_MODES[number]} TargetMode */
