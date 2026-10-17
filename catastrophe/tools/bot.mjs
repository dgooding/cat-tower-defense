// Headless balance bot: plays every level with a greedy builder (and once with zero cats).
// Usage: node tools/bot.mjs [levelId|halloween…] [--hero=<heroId>|--hero=all] [--challenge=iron|nap] [--free] [--strict]
//   e.g. node tools/bot.mjs 1-1 1-2      node tools/bot.mjs --hero=nebula      node tools/bot.mjs --hero=all
//   --free: the bot picks its own best-coverage spots anywhere (free placement, like a sharp human)
//   --strict: fail (exit 1) if any level is not won (used by CI for normal play)
import { LEVELS, LEVEL_BY_ID, halloweenLevel } from '../js/data/levels.js';
import { HEROES } from '../js/data/heroes.js';
import { getLayout } from '../js/data/layout.js';
import { Sim } from '../js/sim/sim.js';
import { AutoBot } from '../js/sim/autobot.js';

/**
 * @param {import('../js/data/levels.js').LevelDef} level
 * @param {{build?: boolean, powers?: boolean, hero?: string|null, challenge?: 'iron'|'nap'|null, free?: boolean}} o
 */
export function runLevel(level, o = {}) {
  const sim = new Sim({ level, layout: getLayout(level), events: false, hero: o.hero ?? null, challenge: o.challenge ?? null });
  const bot = new AutoBot(sim, { build: o.build !== false, powers: o.powers !== false, free: !!o.free });
  const maxTicks = 60 * 60 * 30;
  while (sim.phase !== 'won' && sim.phase !== 'lost' && sim.tick < maxTicks) {
    bot.update();
    sim.step();
  }
  const towers = sim.towers.filter(Boolean).map((t) => `${t.cat}:${['T1', 'T2', 'T3', '4A', '4B'][t.tier]}`);
  return { id: level.id, phase: sim.phase, snacks: sim.lives, max: sim.maxLives, stars: sim.stars, wave: sim.waveIdx, total: sim.totalWaves, minutes: +(sim.time / 60).toFixed(1), kills: sim.stats.kills, leaks: sim.stats.leaks, towers, spots: sim.towers.length, heroLevel: sim.hero?.level ?? 0 };
}

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? null;
const ids = args.filter((a) => !a.startsWith('--'));
const byId = (/** @type {string} */ a) => LEVEL_BY_ID[a] ?? (a === 'halloween' ? halloweenLevel() : undefined);
const levels = ids.length ? ids.map(byId).filter(Boolean) : LEVELS;
const heroArg = flag('hero');
const heroes = heroArg === 'all' ? [null, ...Object.keys(HEROES)] : [heroArg];
const challenge = /** @type {any} */ (flag('challenge'));
const free = args.includes('--free');
const strict = args.includes('--strict');

const zero = runLevel(LEVEL_BY_ID['1-1'], { build: false, powers: false });
console.log(`[zero cats] 1-1 → ${zero.phase.toUpperCase()} (snacks ${zero.snacks}, wave ${zero.wave}/${zero.total})`);

let ok = zero.phase === 'lost';
let losses = 0;
for (const hero of heroes) {
  if (hero || challenge || free) console.log(`── hero: ${hero ?? 'none'}${challenge ? `, challenge: ${challenge}` : ''}${free ? ', free placement' : ''}`);
  for (const l of levels) {
    const r = runLevel(l, { hero, challenge, free });
    const tag = r.phase === 'won' ? 'WIN ' : r.phase === 'lost' ? 'LOSE' : 'TIME';
    if (r.phase !== 'won') losses++;
    console.log(`${tag} ${r.id}  snacks ${String(r.snacks).padStart(2)}/${r.max}  ★${r.stars}  wave ${r.wave}/${r.total}  ${r.minutes}min  kills ${r.kills} leaks ${r.leaks}  spots ${r.spots}${hero ? `  hero Lv${r.heroLevel}` : ''}  [${r.towers.join(' ')}]`);
    if (r.id === '1-1' && r.phase !== 'won' && !challenge) ok = false;
  }
}
if (!ok) {
  console.log('BOT CHECK FAILED: 1-1 must be won by the bot and lost with zero cats.');
  process.exitCode = 1;
} else if (strict && losses > 0) {
  console.log(`BOT CHECK FAILED (--strict): ${losses} level(s) not won.`);
  process.exitCode = 1;
} else console.log(`Bot check OK: 1-1 won by the bot, lost with zero cats. Levels not won: ${losses}.`);
