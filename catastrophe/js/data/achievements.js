// @ts-check
// 30 Cat-chievements. Each unlocks when save.counters[counter] >= goal
// (special counters: 'paws' = paw prints earned, 'stars3' = levels with 3 stars).
// The game bumps counters via save.bump()/bumpMax(); Interactive Mode displays them.

/**
 * @typedef {Object} Achievement
 * @property {string} id @property {string} name @property {string} desc @property {string} icon
 * @property {string} counter @property {number} goal
 */

/** @type {Achievement[]} */
export const ACHIEVEMENTS = [
  { id: 'first-nap', name: 'First Nap', desc: 'Seat your first cat on a cushion.', icon: '🛋️', counter: 'catsPlaced', goal: 1 },
  { id: 'full-house', name: 'If I Fits, I Sits', desc: 'Fill every nap spot in a level.', icon: '📦', counter: 'allSpotsFilled', goal: 1 },
  { id: 'first-win', name: 'Snacks Are Safe', desc: 'Win your first level.', icon: '🍙', counter: 'wins', goal: 1 },
  { id: 'nine-lives', name: 'Nine Lives', desc: 'Win a level with exactly 1 snack left.', icon: '😅', counter: 'oneSnackWins', goal: 1 },
  { id: 'flawless', name: 'Not a Crumb', desc: 'Win a level without losing a single snack.', icon: '✨', counter: 'flawlessWins', goal: 1 },
  { id: 'world-1', name: 'Pickled', desc: 'Defeat Count Cucumberto.', icon: '🧛', counter: 'boss:cucumberto', goal: 1 },
  { id: 'world-2', name: 'Unplugged', desc: 'Defeat The Sucktator 9000.', icon: '🔌', counter: 'boss:sucktator', goal: 1 },
  { id: 'world-3', name: 'Drained', desc: 'Defeat Bathzilla.', icon: '🛁', counter: 'boss:bathzilla', goal: 1 },
  { id: 'world-4', name: 'Dinner Is Served', desc: 'Fill The Great Empty Bowl.', icon: '🍚', counter: 'boss:great-bowl', goal: 1 },
  { id: 'all-stars', name: 'Gold Star Napper', desc: 'Earn 3 stars on 6 levels.', icon: '⭐', counter: 'stars3', goal: 6 },
  { id: 'paws-20', name: 'Paw-sitive Progress', desc: 'Earn 20 paw prints.', icon: '🐾', counter: 'paws', goal: 20 },
  { id: 'paws-40', name: 'Paw-some', desc: 'Earn 40 paw prints.', icon: '🐾', counter: 'paws', goal: 40 },
  { id: 'kills-100', name: 'Bonk Enthusiast', desc: 'Defeat 100 household horrors.', icon: '💥', counter: 'kills', goal: 100 },
  { id: 'kills-1000', name: 'Professional Bonker', desc: 'Defeat 1,000 household horrors.', icon: '🏆', counter: 'kills', goal: 1000 },
  { id: 'cucumbers', name: 'Cucumber Cleanse', desc: 'Defeat 100 Cucumber Cadets.', icon: '🥒', counter: 'kill:cucumber-cadet', goal: 100 },
  { id: 'duckies', name: 'Rubber Ducky, You\'re the One', desc: 'Squeak 200 Rubber Duckies.', icon: '🦆', counter: 'kill:rubber-duckie', goal: 200 },
  { id: 'reply-all', name: 'Reply All', desc: 'Defeat 50 Mondays.', icon: '⏰', counter: 'kill:monday', goal: 50 },
  { id: 'inbox-zero', name: 'Inbox Zero', desc: 'Defeat 30 Overdue Bills.', icon: '✉️', counter: 'kill:overdue-bill', goal: 30 },
  { id: 'good-boy', name: 'Good Boy Gets Pets', desc: 'Befriend 20 Good Boys.', icon: '🐕', counter: 'befriended', goal: 20 },
  { id: 'mug', name: 'Knocked It Off', desc: 'Defeat 50 enemies with the falling mug.', icon: '☕', counter: 'mugKills', goal: 50 },
  { id: 'zoomies', name: '3 AM Energy', desc: 'Use Cat Powers 25 times.', icon: '🌙', counter: 'powersUsed', goal: 25 },
  { id: 'upgrades', name: 'Self-Improvement', desc: 'Upgrade cats 50 times.', icon: '📈', counter: 'upgrades', goal: 50 },
  { id: 'tier4', name: 'Absolute Unit', desc: 'Pick 10 tier-4 specializations.', icon: '👑', counter: 'tier4', goal: 10 },
  { id: 'early', name: 'Overachiever', desc: 'Call 25 waves early.', icon: '⏩', counter: 'earlyCalls', goal: 25 },
  { id: 'iron', name: 'Iron Cat', desc: 'Win any Iron Cat challenge.', icon: '🛡️', counter: 'ironWins', goal: 1 },
  { id: 'nap-time', name: 'Nap Time', desc: 'Win any Nap Time challenge.', icon: '💤', counter: 'napWins', goal: 1 },
  { id: 'hero', name: 'Main Character', desc: 'Win 5 levels in Interactive Mode with a hero.', icon: '🦸', counter: 'heroWins', goal: 5 },
  { id: 'endless-20', name: 'Infinite Laundry', desc: 'Survive 20 waves in Endless.', icon: '🧺', counter: 'endlessBest', goal: 20 },
  { id: 'boss-key', name: 'Plausible Deniability', desc: 'Use the Boss Key 10 times.', icon: '👔', counter: 'bossKey', goal: 10 },
  { id: 'fashion', name: 'Fashion Week', desc: 'Buy 3 hats in the Wardrobe.', icon: '🎩', counter: 'hatsBought', goal: 3 },
];

/** @type {Record<string, Achievement>} */
export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
