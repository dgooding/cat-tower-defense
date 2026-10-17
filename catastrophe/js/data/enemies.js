// @ts-check
// Enemy + boss stats. `speed` 1.0 = 60 px/s. armor/shine are 0..1 damage reductions (bonk/sparkle).
// HP (not bosses) scales per world: ×1.0 / 1.6 / 2.0 / 2.35 (see WORLD_HP; plan started at 2.4 / 3.4).

/**
 * @typedef {Object} EnemyDef
 * @property {string} id @property {string} name @property {string} icon
 * @property {number} hp @property {number} speed @property {number} [armor] @property {number} [shine]
 * @property {number} bounty treats on defeat @property {number} snacks snacks eaten on leak
 * @property {number} [atk] melee dps vs kittens (default 3)
 * @property {boolean} [stealth] @property {boolean} [flier] @property {boolean} [shieldFront]
 * @property {boolean} [taunt] @property {boolean} [immuneToTowers] @property {boolean} [boss]
 * @property {'despair'|'haste'} [aura] @property {number} [auraR]
 * @property {{id:string, n:number}} [splitInto] @property {{id:string, n:number}} [spawnOnDeath]
 * @property {number} [stealsTreats] fraction of banked treats stolen on leak
 * @property {boolean} [friendly] becomes friendly instead of dying (Good Boy)
 * @property {boolean} [twin] Snip & Snap: when one dies the other enrages
 * @property {boolean} [blockLob] umbrellas block lobbed shots
 * @property {boolean} [absorbLob] lint roller absorbs hairballs into ally shields
 * @property {{every:number, range:number, wet:number, count:number}} [spray] makes cats Wet
 * @property {{every:number, range:number, hide:number}} [boom] makes cats hide (stun)
 * @property {boolean} [hideCats] cats near it when it breaks hide for 1s
 * @property {boolean} [surprise] Closed Door: treats or a surprise on defeat
 * @property {boolean} [dropsBox] Fancy Bed: Cardboard Box buff for nearby cats on defeat
 * @property {number} [size] collision/AoE radius px (default 22)
 * @property {string} blurb
 */

/** @type {EnemyDef[]} */
export const ENEMIES = [
  { id: 'cucumber-cadet', name: 'Cucumber Cadet', icon: '🥒', hp: 40, speed: 1.0, bounty: 4, snacks: 1, blurb: 'Grunt. Salutes on defeat.' },
  { id: 'sneaky-pickle', name: 'Sneaky Pickle', icon: '🫙', hp: 60, speed: 1.1, bounty: 7, snacks: 1, stealth: true, blurb: 'Invisible until close. Startles cats when revealed.' },
  { id: 'vroomba', name: 'Vroomba', icon: '🤖', hp: 85, speed: 1.75, armor: 0.45, bounty: 10, snacks: 1, atk: 4, blurb: 'Fast and armored. Recalculating…' },
  { id: 'empty-bowl', name: 'The Empty Bowl', icon: '🥣', hp: 150, speed: 0.7, shine: 0.3, bounty: 12, snacks: 2, aura: 'despair', auraR: 190, blurb: 'Despair aura: nearby cats attack slower.' },
  { id: 'spritz', name: 'Spritz', icon: '💦', hp: 80, speed: 0.9, bounty: 10, snacks: 1, spray: { every: 4, range: 230, wet: 2, count: 1 }, blurb: 'Squirts a cat Wet. Wet cats refuse to work.' },
  { id: 'cone-of-shame', name: 'Cone of Shame', icon: '📯', hp: 120, speed: 0.8, bounty: 10, snacks: 1, shieldFront: true, blurb: 'Blocks shots from the front. Lasers pierce it.' },
  { id: 'rubber-duckie', name: 'Rubber Duckie', icon: '🦆', hp: 12, speed: 1.3, bounty: 1, snacks: 1, atk: 1, size: 14, blurb: 'Swarm. Squeaks.' },
  { id: 'tubby-mcsoak', name: 'Tubby McSoak', icon: '🛁', hp: 600, speed: 0.5, armor: 0.3, bounty: 30, snacks: 3, atk: 8, size: 34, splitInto: { id: 'rubber-duckie', n: 6 }, blurb: 'Tank. Splits into six duckies.' },
  { id: 'snip-snap', name: 'Snip & Snap', icon: '✂️', hp: 64, speed: 1.4, armor: 0.2, bounty: 8, snacks: 1, atk: 5, twin: true, blurb: 'Twin clippers. When one falls, the other enrages.' },
  { id: 'party-pooper', name: 'Party Pooper', icon: '🎈', hp: 48, speed: 0.85, bounty: 9, snacks: 1, flier: true, blurb: 'Flier. Kittens cannot block it.' },
  { id: 'monday', name: 'Monday', icon: '⏰', hp: 200, speed: 0.8, armor: 0.2, shine: 0.2, bounty: 15, snacks: 2, aura: 'haste', auraR: 170, blurb: 'Speeds up nearby enemies by 30%.' },
  { id: 'closed-door', name: 'The Closed Door', icon: '🚪', hp: 400, speed: 0.6, armor: 0.4, bounty: 25, snacks: 2, atk: 6, size: 30, taunt: true, surprise: true, blurb: 'Taunt: cats MUST attack it.' },
  { id: 'fancy-bed', name: 'Fancy Cat Bed', icon: '🛏️', hp: 300, speed: 0.8, bounty: 20, snacks: 2, size: 30, immuneToTowers: true, dropsBox: true, blurb: 'Only Chonkington, kittens and powers will touch it.' },
  { id: 'lint-roller', name: 'Lint Roller', icon: '🧻', hp: 180, speed: 0.9, bounty: 14, snacks: 1, absorbLob: true, blurb: 'Absorbs hairballs into shields for its friends.' },
  { id: 'carrier', name: 'The Carrier', icon: '🧳', hp: 500, speed: 0.6, armor: 0.6, bounty: 30, snacks: 3, atk: 6, size: 32, spawnOnDeath: { id: 'cucumber-cadet', n: 3 }, hideCats: true, blurb: 'Armored. Releases three cadets when broken.' },
  { id: 'hose-snek', name: 'Garden Hose Snek', icon: '🐍', hp: 350, speed: 0.9, bounty: 20, snacks: 2, atk: 5, size: 30, spray: { every: 6, range: 240, wet: 2, count: 99 }, blurb: 'Sprays every nearby cat Wet.' },
  { id: 'umbrella-uncles', name: 'Umbrella Uncles', icon: '☂️', hp: 140, speed: 0.8, shine: 0.4, bounty: 12, snacks: 1, blockLob: true, blurb: 'Umbrellas block lobbed hairballs.' },
  { id: 'thunderclap', name: 'Thunderclap', icon: '⛈️', hp: 150, speed: 0.85, shine: 0.2, bounty: 18, snacks: 1, flier: true, boom: { every: 8, range: 200, hide: 0.7 }, blurb: 'Flier. BOOM makes cats hide.' },
  { id: 'overdue-bill', name: 'Overdue Bill', icon: '✉️', hp: 100, speed: 1.2, bounty: 15, snacks: 0, stealsTreats: 0.1, blurb: 'Steals 10% of your treats if it gets through.' },
  { id: 'good-boy', name: 'Good Boy', icon: '🐕', hp: 800, speed: 0.7, bounty: 50, snacks: 1, atk: 0, size: 30, friendly: true, blurb: 'Pet him enough and he flops over and pays you.' },
    // Seasonal (The Haunted Hayride only; never in the 12 normal levels).
    { id: 'cucumber-ghost', name: 'Cucumber in a Sheet', icon: '👻', hp: 60, speed: 1.0, bounty: 8, snacks: 1, stealth: true, blurb: 'Stealth. A cucumber in a bedsheet. Boo? Startles cats when revealed.' },
  ];

/** @type {EnemyDef[]} */
export const BOSSES = [
  { id: 'cucumberto', name: 'Count Cucumberto', icon: '🧛', hp: 2800, speed: 0.42, armor: 0.2, bounty: 150, snacks: 10, atk: 30, size: 50, boss: true, blurb: 'Summons pickles, hides in a jar, then sprints.' },
  { id: 'sucktator', name: 'The Sucktator 9000', icon: '🌪️', hp: 7000, speed: 0.38, armor: 0.35, shine: 0.2, bounty: 250, snacks: 10, atk: 40, size: 55, boss: true, blurb: 'Inhales shots and kittens. Overheats.' },
  { id: 'bathzilla', name: 'Bathzilla', icon: '🦖', hp: 12000, speed: 0.34, armor: 0.3, shine: 0.3, bounty: 350, snacks: 10, atk: 50, size: 60, boss: true, blurb: 'Showers cats, launches duckies, gets stuck in the drain.' },
  { id: 'great-bowl', name: 'The Great Empty Bowl', icon: '🌑', hp: 19000, speed: 0.3, armor: 0.3, shine: 0.3, bounty: 500, snacks: 20, atk: 60, size: 60, boss: true, blurb: 'Dinner is late. Heals with sad kibble. 4 AM.' },
];

/** HP multiplier per world index (0..3). */
export const WORLD_HP = [1.0, 1.6, 2.0, 2.35];

/** @type {Record<string, EnemyDef>} */
export const ENEMY_BY_ID = Object.fromEntries([...ENEMIES, ...BOSSES].map((e) => [e.id, e]));

/** Boss phase names (index = phase). */
export const BOSS_PHASES = {
  cucumberto: ['Pickle Squad', 'Jar of Brine', 'Bat-Cape Sprint'],
  sucktator: ['Dust Cough', 'SUCK MODE', 'Overheating'],
  bathzilla: ['Shower Spray', 'Duckie Armada', 'The Drain'],
  'great-bowl': ['Dinner Is Late', 'Diet Food', "It's 4 AM"],
};
