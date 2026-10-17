// @ts-check
// Endless "Cat Moods": a random modifier rolls every 10 waves.

/**
 * @typedef {Object} Mood
 * @property {string} id @property {string} name @property {string} icon @property {string} desc
 * @property {number} [catDmg] cat damage multiplier @property {number} [catRate] cat attack-speed multiplier
 * @property {number} [enemySpeed] enemy speed multiplier
 * @property {boolean} [sunbeam] one random cat deals ×2 each wave
 * @property {number} [bathWet] all cats Wet for this many seconds at each wave start
 * @property {string} [extra] an extra enemy each wave
 */

/** @type {Mood[]} */
export const MOODS = [
  { id: 'hangry', name: 'Everyone Is Hangry', icon: '😾', desc: 'Cats hit 25% harder but attack 20% slower.', catDmg: 1.25, catRate: 0.8 },
  { id: '3am', name: 'Mysterious 3 AM Energy', icon: '🌙', desc: 'EVERYONE is 50% faster. Cats and enemies.', catRate: 1.5, enemySpeed: 1.5 },
  { id: 'sunbeam', name: 'Sunbeam', icon: '☀️', desc: 'One lucky cat basks in a sunbeam each wave: ×2 damage.', sunbeam: true },
  { id: 'bath', name: 'Bath Day', icon: '🛁', desc: 'All cats are Wet for 5s at the start of every wave.', bathWet: 5 },
  { id: 'mondays', name: 'Mondays', icon: '⏰', desc: 'An extra Monday shows up every wave.', extra: 'monday' },
];

/** @type {Record<string, Mood>} */
export const MOOD_BY_ID = Object.fromEntries(MOODS.map((m) => [m.id, m]));
