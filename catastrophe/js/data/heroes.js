// @ts-check
// Hero gameplay stats (Interactive Mode). Names/visuals come from HERO_ART in js/art/registry.js;
// this file only holds numbers so the pure sim never imports art.

/**
 * @typedef {Object} HeroDef
 * @property {string} id @property {'melee'|'ranged'|'tank'} style
 * @property {number} hp @property {number} dmg @property {number} rate seconds between attacks
 * @property {number} range attack reach px @property {number} speed px/s @property {'bonk'|'sparkle'} dtype
 * @property {number} blocks how many enemies it can hold at once (0 = never blocks)
 * @property {{a1: number, a2: number}} cd ability cooldowns (s)
 * @property {'nineLives'|'stargazer'|'regular'} passive
 */

/** @type {Record<string, HeroDef>} */
export const HEROES = {
  'ronin-biscuit': { id: 'ronin-biscuit', style: 'melee', hp: 260, dmg: 16, rate: 0.6, range: 64, speed: 170, dtype: 'bonk', blocks: 1, cd: { a1: 18, a2: 12 }, passive: 'nineLives' },
  nebula: { id: 'nebula', style: 'ranged', hp: 150, dmg: 13, rate: 0.9, range: 240, speed: 150, dtype: 'sparkle', blocks: 0, cd: { a1: 16, a2: 22 }, passive: 'stargazer' },
  'big-tom': { id: 'big-tom', style: 'tank', hp: 460, dmg: 10, rate: 0.9, range: 64, speed: 125, dtype: 'bonk', blocks: 2, cd: { a1: 20, a2: 15 }, passive: 'regular' },
};

export const HERO_MAX_LEVEL = 10;
export const HERO_RESPAWN = 15;
/** Cumulative XP needed to reach `level` (level 1 = 0). @param {number} level */
export const xpFor = (level) => Math.round(30 * Math.pow(Math.max(0, level - 1), 1.35));
/** Stat multiplier at a level (+8% per level). @param {number} level */
export const heroMul = (level) => 1 + 0.08 * (level - 1);
