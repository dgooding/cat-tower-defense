// @ts-check
// Progress access for Interactive Mode. Wraps js/ui/save.js and adds a `?demo=1` mode that
// seeds an in-memory progress object (never written to localStorage) for previews/screenshots.
import { loadProgress, saveProgress, pawPrints, bump, checkAchievements } from '../ui/save.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { LEVELS } from '../data/levels.js';

/** @typedef {import('../ui/save.js').Progress} Progress */

const params = new URLSearchParams(location.search);
/** '1' | 'full' | 'fresh' | null */
export const DEMO = params.get('demo');
export const DEBUG = params.has('debug');

/** @type {Progress|null} */
let demoP = null;
/** @type {Set<() => void>} */
const listeners = new Set();

const DAY = 86400000;

/** @param {string} kind @returns {Progress} */
function seedDemo(kind) {
  /** @type {Progress} */
  const p = {
    stars: {},
    endlessBest: 0,
    endlessRuns: 0,
    muted: false,
    seenTips: true,
    bossKeyUses: 0,
    challenges: {},
    pawSpent: 0,
    hats: { owned: [], equipped: {} },
    achievements: {},
    counters: {},
    seen: {},
    settings: {},
  };
  if (kind === 'fresh') return p;
  const now = Date.now();
  if (kind === 'full') {
    LEVELS.forEach((l, i) => (p.stars[l.id] = i % 4 === 1 ? 2 : 3));
    LEVELS.forEach((l, i) => (p.challenges[l.id] = { iron: i % 2 === 0, nap: i % 3 !== 1 }));
    p.endlessBest = 23;
    p.pawSpent = 3;
    p.hats.owned = ['party-hat'];
    p.hats.equipped = { pudding: 'party-hat' };
    p.counters = { catsPlaced: 900, allSpotsFilled: 4, wins: 30, oneSnackWins: 1, flawlessWins: 6, 'boss:cucumberto': 1, 'boss:sucktator': 1, 'boss:bathzilla': 1, 'boss:great-bowl': 1, kills: 4210, 'kill:cucumber-cadet': 640, 'kill:rubber-duckie': 512, 'kill:monday': 61, 'kill:overdue-bill': 31, befriended: 12, mugKills: 38, powersUsed: 70, upgrades: 140, tier4: 9, earlyCalls: 40, ironWins: 6, napWins: 8, heroWins: 14, endlessBest: 23, bossKey: 4, hatsBought: 1 };
    for (const k of ['story:prologue', 'story:world-countryside', 'story:world-house', 'story:world-bathhouse', 'story:world-sky']) p.seen[k] = true;
  } else {
    Object.assign(p.stars, { '1-1': 3, '1-2': 3, '1-3': 2, '2-1': 3, '2-2': 1 });
    p.challenges = { '1-1': { iron: true, nap: true }, '1-2': { iron: true }, '2-1': { nap: true } };
    p.endlessBest = 9;
    p.pawSpent = 3;
    p.hats.owned = ['party-hat'];
    p.hats.equipped = { pudding: 'party-hat' };
    p.counters = { catsPlaced: 142, wins: 6, oneSnackWins: 1, flawlessWins: 2, 'boss:cucumberto': 1, kills: 612, 'kill:cucumber-cadet': 88, 'kill:rubber-duckie': 140, befriended: 7, mugKills: 21, powersUsed: 18, upgrades: 33, tier4: 3, earlyCalls: 11, ironWins: 2, napWins: 2, heroWins: 3, endlessBest: 9, bossKey: 4, hatsBought: 1 };
    for (const k of ['story:prologue', 'story:world-countryside', 'story:world-house', 'catalog:pudding', 'catalog:cucumber-cadet', 'catalog:rubber-duckie']) p.seen[k] = true;
  }
  // Unlock whatever the seeded counters already earn, with staggered "dates".
  let n = 0;
  for (const a of ACHIEVEMENTS) if (counterValue(p, a.counter) >= a.goal) p.achievements[a.id] = now - (n++ % 9) * DAY * 2 - 3600000;
  return p;
}

/** Current progress (fresh copy from storage, or the in-memory demo object). @returns {Progress} */
export function progress() {
  if (DEMO) return (demoP ??= seedDemo(DEMO));
  return loadProgress();
}

/** Persist a progress object and notify listeners. @param {Progress} p */
export function commit(p) {
  if (DEMO) demoP = p;
  else saveProgress(p);
  emit();
}

/** @param {() => void} fn @returns {() => void} */
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emit() {
  for (const fn of listeners) fn();
}

/** @param {string} key */
export function isSeen(key) {
  return !!progress().seen[key];
}
/** @param {string} key */
export function setSeen(key) {
  const p = progress();
  if (p.seen[key]) return;
  p.seen[key] = true;
  commit(p);
}

/** Achievement progress value (special counters 'paws' and 'stars3'). @param {Progress} p @param {string} counter */
export function counterValue(p, counter) {
  if (counter === 'paws') return pawPrints(p).earned;
  if (counter === 'stars3') return Object.values(p.stars).filter((s) => s >= 3).length;
  return p.counters[counter] ?? 0;
}

/** Bump a lifetime counter (demo mode keeps it in memory). @param {string} counter @param {number} [n] */
export function bumpCounter(counter, n = 1) {
  if (!DEMO) {
    const fresh = bump(counter, n);
    emit();
    return fresh;
  }
  const p = progress();
  p.counters[counter] = (p.counters[counter] ?? 0) + n;
  /** @type {string[]} */
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (p.achievements[a.id]) continue;
    if (counterValue(p, a.counter) >= a.goal) {
      p.achievements[a.id] = Date.now();
      fresh.push(a.id);
    }
  }
  if (fresh.length) window.dispatchEvent(new CustomEvent('cata:achievement', { detail: fresh }));
  emit();
  return fresh;
}

/** Re-check paw-print style achievements after spending/earning (no-op in demo). */
export function recheck() {
  if (!DEMO) checkAchievements(loadProgress());
}

export { pawPrints };

/**
 * Buy a hat with paw prints.
 * @param {string} hatId @param {number} cost
 * @returns {{ok:true} | {ok:false, reason:'owned'|'poor', short:number}}
 */
export function buyHat(hatId, cost) {
  const p = progress();
  if (p.hats.owned.includes(hatId)) return { ok: false, reason: 'owned', short: 0 };
  const have = pawPrints(p).available;
  if (have < cost) return { ok: false, reason: 'poor', short: cost - have };
  p.pawSpent += cost;
  p.hats.owned = [...p.hats.owned, hatId];
  commit(p);
  bumpCounter('hatsBought');
  return { ok: true };
}

/** @param {string} catId @param {string|null} hatId */
export function equipHat(catId, hatId) {
  const p = progress();
  if (hatId && !p.hats.owned.includes(hatId)) return false;
  const eq = { ...p.hats.equipped };
  if (hatId) eq[catId] = hatId;
  else delete eq[catId];
  p.hats.equipped = eq;
  commit(p);
  return true;
}

const mq = matchMedia('(prefers-reduced-motion: reduce)');
/** `?still=1` forces calm motion (deterministic screenshots). */
export const STILL = params.has('still');
/** Reduced motion from the OS, the in-game setting, or `?still=1`. */
export function reducedMotion() {
  return STILL || mq.matches || !!progress().settings.reducedMotion;
}
/** @param {boolean} on */
export function setCalm(on) {
  const p = progress();
  p.settings = { ...p.settings, reducedMotion: on };
  commit(p);
}
mq.addEventListener?.('change', emit);
