// @ts-check
// Progress (stars, unlocks, settings) + in-progress run autosave, all in localStorage.
import { LEVELS } from '../data/levels.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

const KEY = 'cata:save:v1';
const RUN_KEY = 'cata:run:v1';
const CONTENT_VERSION = 1;

/**
 * @typedef {Object} Progress
 * @property {Record<string, number>} stars best stars per level id
 * @property {number} endlessBest @property {number} endlessRuns
 * @property {boolean} muted @property {boolean} seenTips @property {number} bossKeyUses
 * @property {Record<string, {iron?: boolean, nap?: boolean}>} challenges challenge stars per level id (Interactive Mode)
 * @property {number} pawSpent paw prints spent in the Wardrobe
 * @property {{owned: string[], equipped: Record<string, string>}} hats owned hat ids; equipped: catId|heroId → hatId
 * @property {Record<string, number>} achievements achievement id → unlock timestamp (ms)
 * @property {Record<string, number>} counters lifetime counters that drive achievements (see js/data/achievements.js)
 * @property {Record<string, boolean>} seen story/catalog flags, e.g. "story:prologue", "catalog:vroomba"
 * @property {{reducedMotion?: boolean, shake?: boolean, colorblind?: boolean, volume?: number}} settings
 */

/** @returns {Progress} */
export function loadProgress() {
  /** @type {Progress} */
  const def = {
    stars: {},
    endlessBest: 0,
    endlessRuns: 0,
    muted: false,
    seenTips: false,
    bossKeyUses: 0,
    challenges: {},
    pawSpent: 0,
    hats: { owned: [], equipped: {} },
    achievements: {},
    counters: {},
    seen: {},
    settings: {},
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return def;
    const p = { ...def, ...JSON.parse(raw) };
    p.hats = { owned: [], equipped: {}, ...p.hats };
    return p;
  } catch {
    return def;
  }
}

/** @param {Progress} p */
export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode etc. */
  }
}

/** @param {string} id @param {number} stars */
export function recordStars(id, stars) {
  const p = loadProgress();
  p.stars[id] = Math.max(p.stars[id] ?? 0, stars);
  saveProgress(p);
  return p;
}

/** Level i is unlocked when it's 1-1 or the previous level has at least one star. @param {number} i @param {Progress} p */
export function isUnlocked(i, p) {
  if (i <= 0) return true;
  return (p.stars[LEVELS[i - 1].id] ?? 0) > 0;
}

/** Paw prints = all stars + 1 per challenge star, minus what was spent. @param {Progress} p */
export function pawPrints(p) {
  let earned = 0;
  for (const v of Object.values(p.stars)) earned += v;
  for (const c of Object.values(p.challenges)) earned += (c.iron ? 1 : 0) + (c.nap ? 1 : 0);
  return { earned, spent: p.pawSpent, available: Math.max(0, earned - p.pawSpent) };
}

/** @param {string} levelId @param {'iron'|'nap'} kind */
export function recordChallenge(levelId, kind) {
  const p = loadProgress();
  p.challenges[levelId] = { ...p.challenges[levelId], [kind]: true };
  saveProgress(p);
  checkAchievements(p);
  return p;
}

/**
 * Add to a lifetime counter and unlock any achievements it completes.
 * Returns ids of achievements newly unlocked (so callers can toast them).
 * @param {string} counter @param {number} [n] @returns {string[]}
 */
export function bump(counter, n = 1) {
  const p = loadProgress();
  p.counters[counter] = (p.counters[counter] ?? 0) + n;
  saveProgress(p);
  return checkAchievements(p);
}

/** Set a counter to max(current, value) (for "best" style goals). @param {string} counter @param {number} value */
export function bumpMax(counter, value) {
  const p = loadProgress();
  p.counters[counter] = Math.max(p.counters[counter] ?? 0, value);
  saveProgress(p);
  return checkAchievements(p);
}

/** @param {Progress} p @returns {string[]} newly unlocked ids */
export function checkAchievements(p) {
  /** @type {string[]} */
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (p.achievements[a.id]) continue;
    const have = a.counter === 'paws' ? pawPrints(p).earned : a.counter === 'stars3' ? Object.values(p.stars).filter((s) => s >= 3).length : (p.counters[a.counter] ?? 0);
    if (have >= a.goal) {
      p.achievements[a.id] = Date.now();
      fresh.push(a.id);
    }
  }
  if (fresh.length) {
    saveProgress(p);
    try {
      window.dispatchEvent(new CustomEvent('cata:achievement', { detail: fresh }));
    } catch {
      /* not in a browser */
    }
  }
  return fresh;
}

/** @param {string} key @param {boolean} [value] */
export function markSeen(key, value = true) {
  const p = loadProgress();
  p.seen[key] = value;
  saveProgress(p);
}

/** Endless opens once 1-1 is cleared. @param {Progress} p */
export function endlessUnlocked(p) {
  return (p.stars['1-1'] ?? 0) > 0;
}

/** @param {string} levelId @param {any} snap */
export function saveRun(levelId, snap) {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify({ cv: CONTENT_VERSION, levelId, snap, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

/** @param {string} levelId @returns {any|null} */
export function loadRun(levelId) {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    if (r.cv !== CONTENT_VERSION || r.levelId !== levelId || !r.snap || r.snap.v !== 2) return null;
    return r.snap;
  } catch {
    return null;
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    /* ignore */
  }
}
