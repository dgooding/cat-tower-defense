// @ts-check
// Cat tower stats. Tier 0..2 = T1..T3 (linear), tier 3 = 4A, tier 4 = 4B.
// Every tier lists its FULL stats (merged over `base`), its upgrade cost and an optional `skill` flag.
// Ranges / radii are in stage pixels (1920×1080). `rate` = seconds between attacks.

/**
 * @typedef {Object} KittenStats
 * @property {number} n @property {number} hp @property {number} dmg @property {number} rate
 * @property {number} respawn @property {number} [dodge] @property {boolean} [ranged]
 */
/**
 * @typedef {Object} TierStats
 * @property {string} id T1|T2|T3|4A|4B @property {string} name @property {number} cost treats to build/upgrade into this tier
 * @property {number} range @property {number} [dmg] @property {number} [rate]
 * @property {number} [slow] 0..1 speed reduction @property {number} [slowT] seconds
 * @property {number} [stun] seconds @property {number} [radius] AoE radius
 * @property {number} [dps] cloud dps @property {number} [dur] cloud duration
 * @property {number} [vibe] chance/sec to make enemies moonwalk backward
 * @property {number} [dpsMin] @property {number} [dpsMax] @property {number} [ramp] beam ramp seconds
 * @property {number} [beams] beam target count
 * @property {KittenStats} [kittens]
 * @property {number} [income] treats per wave @property {number} [aura] +damage % for cats in range
 * @property {number} [auraRange] +range % for cats in range @property {number} [interest] per-wave interest on banked treats
 * @property {number} [interestCap] @property {number} [killBonus] extra treats per kill in range @property {boolean} [wetImmune] aura grants Wet immunity
 * @property {number} [shred] armor % removed per hit (stacks up to 10)
 * @property {number} [crit] crit chance @property {number} [critMul]
 * @property {number} [burst] instant AoE damage on cloud drop
 * @property {number} [knock] knockback px @property {number} [rollLen] rolling hairball length px
 * @property {number} [mark] +damage taken % @property {number} [markT]
 * @property {number} [every] seconds between skill uses @property {number} [skillDmg] @property {number} [skillRadius]
 * @property {number} [pull] px/sec pushback along the path
 * @property {string} [skill] tier-4 behaviour flag
 */
/**
 * @typedef {Object} CatDef
 * @property {import('./ids.js').CatId} id @property {string} name @property {string} title @property {string} icon
 * @property {'bonk'|'sparkle'|'none'} dtype
 * @property {'lob'|'beam'|'yarn'|'barracks'|'cloud'|'flop'|'hiss'|'support'} kind
 * @property {'hairball'|'laser'|'yarn'|'catnip'|'shockwave'|'hiss'|'coin'|'none'} fx projectile flavor for the renderer
 * @property {boolean} [canHitBed] the only tower allowed to hit the Fancy Bed
 * @property {boolean} [groundOnly] cannot hit fliers
 * @property {boolean} [lob] projectile is lobbed (umbrellas block, lint rollers absorb)
 * @property {number} [projSpeed] px/sec
 * @property {string} blurb
 * @property {TierStats[]} tiers
 */

/** @param {Partial<TierStats>} base @param {Partial<TierStats>[]} list @returns {TierStats[]} */
function tiers(base, list) {
  /** @type {TierStats[]} */
  const out = [];
  let prev = base;
  list.forEach((t, i) => {
    // T2/T3 inherit from the previous tier; 4A/4B both inherit from T3.
    const from = i <= 3 ? prev : out[2];
    const merged = /** @type {TierStats} */ ({ ...from, skill: undefined, ...t });
    out.push(merged);
    if (i < 3) prev = merged;
  });
  return out;
}

/** @type {CatDef[]} */
export const CATS = [
  {
    id: 'pudding',
    name: 'Pudding',
    title: 'Hairball Hurler',
    icon: '🍮',
    dtype: 'bonk',
    kind: 'lob',
    fx: 'hairball',
    lob: true,
    projSpeed: 620,
    blurb: 'Reliable single-target bonks. Dramatic wind-up.',
    tiers: tiers({ range: 270 }, [
      { id: 'T1', name: 'Pudding', cost: 70, dmg: 11, rate: 1.0 },
      { id: 'T2', name: 'Pudding, Esq.', cost: 95, dmg: 19, rate: 0.95, range: 285 },
      { id: 'T3', name: 'Sir Pudding the Phlegmatic', cost: 135, dmg: 31, rate: 0.9, range: 300 },
      { id: '4A', name: 'Hack-47 Hairball Gatling', cost: 230, dmg: 12, rate: 0.17, skill: 'gatling' },
      { id: '4B', name: 'The Big One', cost: 230, dmg: 95, rate: 2.6, knock: 55, rollLen: 340, skill: 'bigOne' },
    ]),
  },
  {
    id: 'granny-purl',
    name: 'Granny Purl',
    title: 'Yarn Slow',
    icon: '🧶',
    dtype: 'bonk',
    kind: 'yarn',
    fx: 'yarn',
    projSpeed: 520,
    blurb: 'Slows enemies with yarn. Dozes off between waves.',
    tiers: tiers({ range: 255 }, [
      { id: 'T1', name: 'Knitting Circle', cost: 90, dmg: 4, rate: 1.0, slow: 0.4, slowT: 2 },
      { id: 'T2', name: 'Purl Two Together', cost: 120, dmg: 7, rate: 0.95, slow: 0.5, slowT: 2.2, range: 270 },
      { id: 'T3', name: 'Grandmaster of Yarn', cost: 165, dmg: 11, rate: 0.9, slow: 0.55, slowT: 2.5, range: 285, radius: 60 },
      { id: '4A', name: 'Ugly Holiday Sweater', cost: 270, dmg: 14, every: 5, stun: 2, mark: 0.25, markT: 4, skill: 'sweater' },
      { id: '4B', name: 'Tangle of Tuesdays', cost: 270, dmg: 12, slow: 0.6, skillRadius: 140, skill: 'tangle' },
    ]),
  },
  {
    id: 'mama-mittens',
    name: 'Mama Mittens',
    title: 'Kitten Barracks',
    icon: '🥄',
    dtype: 'bonk',
    kind: 'barracks',
    fx: 'none',
    canHitBed: true,
    groundOnly: true,
    blurb: 'Sends kittens to block the path. Yells their names.',
    tiers: tiers({ range: 300 }, [
      { id: 'T1', name: 'Mama Mittens', cost: 80, kittens: { n: 3, hp: 55, dmg: 3, rate: 1.0, respawn: 8 } },
      { id: 'T2', name: 'Super Mom', cost: 110, kittens: { n: 3, hp: 90, dmg: 5, rate: 1.0, respawn: 7 } },
      { id: 'T3', name: 'PTA President', cost: 150, kittens: { n: 4, hp: 120, dmg: 7, rate: 0.9, respawn: 7 } },
      { id: '4A', name: 'Ninja Kittens of the Laundry Clan', cost: 250, kittens: { n: 4, hp: 120, dmg: 12, rate: 0.7, respawn: 6, dodge: 0.3, ranged: true }, skill: 'ninja' },
      { id: '4B', name: 'Fluffball Knights of the Round Bed', cost: 250, kittens: { n: 4, hp: 260, dmg: 10, rate: 0.9, respawn: 7 }, skill: 'knights' },
    ]),
  },
  {
    id: 'sriracha',
    name: 'Sriracha',
    title: 'Hiss',
    icon: '🌶️',
    dtype: 'bonk',
    kind: 'hiss',
    fx: 'hiss',
    blurb: 'Rapid hisses that shred armor. Very small. Very angry.',
    tiers: tiers({ range: 225 }, [
      { id: 'T1', name: 'Sriracha', cost: 85, dmg: 4, rate: 0.25, shred: 0.05 },
      { id: 'T2', name: 'Extra Spicy', cost: 120, dmg: 6, rate: 0.25, range: 235 },
      { id: 'T3', name: 'Ghost Pepper', cost: 165, dmg: 9, rate: 0.23, range: 245 },
      { id: '4A', name: 'Banshee Yowl', cost: 270, dmg: 10, every: 4, skillDmg: 30, skill: 'banshee' },
      { id: '4B', name: 'Spitfire', cost: 270, dmg: 11, rate: 0.2, crit: 0.25, critMul: 3, skill: 'spitfire' },
    ]),
  },
  {
    id: 'whiskerton',
    name: 'Prof. Whiskerton',
    title: 'Laser Pointer',
    icon: '🔴',
    dtype: 'sparkle',
    kind: 'beam',
    fx: 'laser',
    blurb: 'A beam that ramps up on one target. Pierces shields.',
    tiers: tiers({ range: 290, ramp: 2, beams: 1 }, [
      { id: 'T1', name: 'Teaching Assistant', cost: 100, dpsMin: 5, dpsMax: 30 },
      { id: 'T2', name: 'Adjunct Professor of Dot', cost: 140, dpsMin: 8, dpsMax: 46, range: 305 },
      { id: 'T3', name: 'Tenured Dotologist', cost: 195, dpsMin: 12, dpsMax: 70, range: 320 },
      { id: '4A', name: 'Disco Dot', cost: 320, dpsMin: 12, dpsMax: 56, beams: 3, every: 2, stun: 0.35, skill: 'disco' },
      { id: '4B', name: 'Red Dot of Doom', cost: 320, dpsMin: 14, dpsMax: 80, every: 8, skillDmg: 240, skillRadius: 95, mark: 0.2, markT: 4, skill: 'redDot' },
    ]),
  },
  {
    id: 'maneki-mochi',
    name: 'Maneki Mochi',
    title: 'Lucky Cat',
    icon: '🪙',
    dtype: 'sparkle',
    kind: 'support',
    fx: 'coin',
    projSpeed: 560,
    blurb: 'Earns treats each wave, buffs neighbors, reveals sneaky enemies.',
    tiers: tiers({ range: 260, dmg: 4, rate: 1.5 }, [
      { id: 'T1', name: 'Lucky Mochi', cost: 110, income: 15, aura: 0.1 },
      { id: 'T2', name: 'Fortune Mochi', cost: 150, income: 25, aura: 0.12, dmg: 6 },
      { id: 'T3', name: 'Golden Mochi', cost: 210, income: 40, aura: 0.15, dmg: 8, range: 275 },
      { id: '4A', name: 'Golden Paw', cost: 330, income: 55, killBonus: 2, interest: 0.05, interestCap: 60, skill: 'goldenPaw' },
      { id: '4B', name: 'Shrine Spirit', cost: 330, income: 40, aura: 0.15, auraRange: 0.1, range: 340, wetImmune: true, skill: 'shrine' },
    ]),
  },
  {
    id: 'chonkington',
    name: 'Lord Chonkington III',
    title: 'Belly Flop',
    icon: '👑',
    dtype: 'bonk',
    kind: 'flop',
    fx: 'shockwave',
    canHitBed: true,
    groundOnly: true,
    blurb: 'Huge belly-flop AoE stun. The only cat who will touch the Fancy Bed.',
    tiers: tiers({ range: 235, radius: 105 }, [
      { id: 'T1', name: 'Lord Chonkington III', cost: 150, dmg: 50, rate: 3, stun: 1 },
      { id: 'T2', name: 'Duke of Heft', cost: 210, dmg: 82, rate: 2.9, stun: 1.1 },
      { id: 'T3', name: 'His Royal Absolute Unit', cost: 290, dmg: 125, rate: 2.8, stun: 1.25, radius: 112 },
      { id: '4A', name: 'Meteor Chonk', cost: 460, dmg: 230, range: 360, radius: 150, stun: 1.3, skill: 'meteor' },
      { id: '4B', name: 'Gravity Loaf', cost: 460, dmg: 150, pull: 28, skill: 'loaf' },
    ]),
  },
  {
    id: 'dr-nip',
    name: 'Dr. Nip',
    title: 'Catnip Alchemist',
    icon: '⚗️',
    dtype: 'sparkle',
    kind: 'cloud',
    fx: 'catnip',
    projSpeed: 480,
    blurb: 'Catnip clouds that hurt and make enemies vibe backward.',
    tiers: tiers({ range: 260, rate: 2.5, dur: 3 }, [
      { id: 'T1', name: 'Dr. Nip, PhD', cost: 120, dps: 7, radius: 90, vibe: 0.15 },
      { id: 'T2', name: 'Mad Scientist', cost: 165, dps: 11, radius: 100, vibe: 0.15 },
      { id: 'T3', name: 'Chief of Catnip Research', cost: 230, dps: 16, radius: 110, vibe: 0.2, range: 275 },
      { id: '4A', name: 'Nip Bomb', cost: 370, dps: 16, burst: 110, skill: 'nipBomb' },
      { id: '4B', name: 'Groovy Haze', cost: 370, dps: 19, radius: 165, dur: 5, vibe: 0.35, skill: 'haze' },
    ]),
  },
];

/** @type {Record<string, CatDef>} */
export const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));

/** Tier index helpers. */
export const TIER_LABELS = ['T1', 'T2', 'T3', '4A', '4B'];
/** @param {number} tier @returns {number[]} next tier indices you can buy */
export function nextTiers(tier) {
  if (tier < 2) return [tier + 1];
  if (tier === 2) return [3, 4];
  return [];
}
