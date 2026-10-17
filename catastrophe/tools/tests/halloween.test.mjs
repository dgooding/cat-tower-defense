// Halloween season: season switch, The Haunted Hayride level data, and the bot can win it. Run: node --test tools/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { season, isHalloween } from '../../js/core/season.js';
import { halloweenLevel, LEVELS, LEVEL_BY_ID } from '../../js/data/levels.js';
import { WAVES } from '../../js/data/waves.js';
import { ENEMY_BY_ID } from '../../js/data/enemies.js';
import { QUIPS } from '../../js/data/quips.js';
import { getLayout } from '../../js/data/layout.js';
import { Sim } from '../../js/sim/sim.js';
import { AutoBot } from '../../js/sim/autobot.js';
import { COSTUMES, costumeFor } from '../../js/art/costumes.js';

test('season: Halloween is all of October (local time) and nothing else', () => {
  assert.equal(season(new Date(2026, 9, 1)), 'halloween');
  assert.equal(season(new Date(2026, 9, 31, 23, 59)), 'halloween');
  assert.equal(season(new Date(2026, 8, 30, 23, 59)), null);
  assert.equal(season(new Date(2026, 10, 1, 0, 0)), null);
  assert.equal(season(new Date(2027, 0, 15)), null);
  assert.equal(isHalloween(new Date(2026, 9, 17)), true);
  assert.equal(isHalloween(new Date(2026, 6, 4)), false);
});

test('halloween level: waves parse, ghosts + Count Cucumberto, kept out of the 12 levels', () => {
  const l = halloweenLevel();
  assert.equal(l.id, 'halloween');
  assert.equal(l.world, 'countryside');
  assert.equal(l.layout, 2);
  assert.equal(l.song, 'spooky');
  assert.equal(l.cats.length, 8);
  assert.ok(l.waves.length >= 10 && l.waves.length <= 12);
  const ids = new Set(l.waves.flat().map((g) => g.id));
  for (const id of ids) assert.ok(ENEMY_BY_ID[id], id);
  assert.ok(ids.has('cucumber-ghost'));
  assert.ok(l.waves[l.waves.length - 1].some((g) => g.id === 'cucumberto'), 'boss in the final wave');
  assert.equal(l.boss, 'cucumberto');
  assert.ok(getLayout(l).paths.length > 0);
  // Not part of progression, and the ghost never shows up in the normal levels.
  assert.equal(LEVELS.length, 12);
  assert.ok(!LEVEL_BY_ID.halloween);
  assert.ok(!('halloween' in WAVES));
  for (const lv of LEVELS) for (const w of lv.waves) for (const g of w) assert.notEqual(g.id, 'cucumber-ghost', lv.id);
  assert.ok(ENEMY_BY_ID['cucumber-ghost'].stealth);
  assert.ok(QUIPS['cucumber-ghost'].length >= 3);
});

test('costumes: every cat, kitten and hero has one', () => {
  assert.ok(Object.keys(COSTUMES).length >= 4);
  for (const id of ['pudding', 'whiskerton', 'granny-purl', 'mama-mittens', 'dr-nip', 'chonkington', 'sriracha', 'maneki-mochi', 'beans', 'biscuit', 'noodle', 'tofu', 'ronin-biscuit', 'nebula', 'big-tom']) {
    const acc = costumeFor(id);
    assert.equal(acc.length, 1, id);
    assert.equal(acc[0].layer, 'head');
    assert.equal(acc[0].hat, true);
    assert.equal(typeof acc[0].draw, 'function');
  }
});

test('halloween level: the AutoBot wins The Haunted Hayride', () => {
  const level = halloweenLevel();
  const sim = new Sim({ level, layout: getLayout(level), events: false });
  const bot = new AutoBot(sim);
  while (sim.phase !== 'won' && sim.phase !== 'lost' && sim.tick < 60 * 60 * 30) {
    bot.update();
    sim.step();
  }
  assert.equal(sim.phase, 'won', `lost with ${sim.lives} snacks at wave ${sim.waveIdx}`);
  assert.ok(sim.lives >= 15, 'wins comfortably: ' + sim.lives);
});
