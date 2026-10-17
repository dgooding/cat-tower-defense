// Diagnostic: which enemies leak on a level (bot play).
import { LEVEL_BY_ID } from '../js/data/levels.js';
import { getLayout } from '../js/data/layout.js';
import { Sim } from '../js/sim/sim.js';
import { AutoBot } from '../js/sim/autobot.js';

for (const id of process.argv.slice(2)) {
  const level = LEVEL_BY_ID[id];
  const sim = new Sim({ level, layout: getLayout(level), events: true });
  const bot = new AutoBot(sim, { build: true, powers: true });
  const leaks = {};
  const waves = {};
  while (sim.phase !== 'won' && sim.phase !== 'lost' && sim.tick < 60 * 60 * 30) {
    bot.update();
    sim.step();
    for (const ev of sim.events) if (ev.type === 'leak') {
      leaks[ev.id] = (leaks[ev.id] ?? 0) + 1;
      waves[sim.waveIdx] = (waves[sim.waveIdx] ?? 0) + ev.snacks;
    }
    sim.events.length = 0;
  }
  console.log(id, sim.phase, 'leaks by enemy:', JSON.stringify(leaks), 'snacks lost by wave:', JSON.stringify(waves));
}
