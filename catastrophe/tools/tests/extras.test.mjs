// Tests for level gimmicks, Endless moods, heroes and challenges. Run: node --test tools/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim } from '../../js/sim/sim.js';
import { HERO_ID } from '../../js/sim/extras.js';
import { HEROES, xpFor } from '../../js/data/heroes.js';
import { MOODS } from '../../js/data/moods.js';
import { LEVEL_BY_ID, endlessLevel } from '../../js/data/levels.js';
import { ENEMY_BY_ID, WORLD_HP } from '../../js/data/enemies.js';
import { CAT_IDS } from '../../js/data/ids.js';
import { parseWave } from '../../js/data/waves.js';

/** Two parallel corridors (y=300 and y=760) plus a cushion row between them. */
const LAYOUT = {
  id: 't',
  name: 'Test',
  paths: [
    [{ x: -50, y: 300 }, { x: 700, y: 300 }, { x: 1300, y: 300 }, { x: 1900, y: 520 }],
    [{ x: -50, y: 760 }, { x: 700, y: 760 }, { x: 1300, y: 760 }, { x: 1900, y: 520 }],
  ],
  spots: [{ x: 600, y: 530 }, { x: 900, y: 530 }, { x: 1200, y: 530 }, { x: 300, y: 530 }, { x: 600, y: 150 }, { x: 900, y: 900 }],
  stash: { x: 1900, y: 520 },
};

function level(o = {}) {
  return { id: 'test', name: 'Test', world: 'house', worldIdx: 0, layout: 0, startTreats: 2000, lives: 20, cats: [...CAT_IDS], waves: [parseWave('C1')], boss: null, intro: [], seed: 42, ...o };
}
const waves = (n, s = 'C2/1') => Array.from({ length: n }, () => parseWave(s));
function spawnAt(s, id, d, track = 0) {
  const e = s.spawnEnemy(id, track, false, d, 1);
  e.off = 0;
  s.placeEnemy(e);
  return e;
}
function inWave(s) {
  s.phase = 'wave';
  s.waveIdx = 1;
  s.spawns = [];
  s.totalWaves = 99; // keep the level running
  return s;
}
/** Run until the next wave has started. */
function nextWave(s) {
  const w = s.waveIdx;
  s.callEarly();
  for (let i = 0; i < 60 * 120 && s.waveIdx === w; i++) s.step();
}

test('data: real levels carry their gimmicks', () => {
  assert.equal(LEVEL_BY_ID['2-1'].gimmick?.kind, 'screens');
  assert.equal(LEVEL_BY_ID['2-2'].gimmick?.kind, 'kotatsu');
  assert.equal(LEVEL_BY_ID['2-3'].gimmick?.kind, 'socks');
  assert.equal(LEVEL_BY_ID['3-1'].gimmick?.kind, 'rain');
  assert.equal(LEVEL_BY_ID['1-1'].gimmick, undefined);
});

test('gimmick 2-1: screens slide every N waves and enemies only use the open route', () => {
  const g = { kind: 'screens', every: 2, note: '' };
  const s = new Sim({ level: level({ waves: waves(6, 'C3/.2'), gimmick: g }), layout: LAYOUT, seed: 3 });
  s.build(0, 'pudding');
  /** @type {any[]} */
  const seen = [];
  for (let w = 1; w <= 5; w++) {
    nextWave(s);
    for (let i = 0; i < 60; i++) s.step();
    const tracks = new Set(s.enemies.filter((e) => e.bornT > s.time - 1.2).map((e) => e.track));
    seen.push({ wave: s.waveIdx, active: s.activePath, tracks: [...tracks] });
    for (const ev of s.events) if (ev.type === 'screens' || ev.type === 'screensWarn') seen.push(ev.type);
    s.events.length = 0;
  }
  const byWave = seen.filter((x) => typeof x === 'object');
  assert.deepEqual(byWave.map((x) => x.active), [0, 0, 1, 1, 0]);
  for (const x of byWave) assert.ok(x.tracks.every((t) => t === x.active), `wave ${x.wave} spawned on ${x.tracks}`);
  assert.ok(seen.includes('screensWarn'), 'telegraph before the switch');
  assert.ok(seen.includes('screens'), 'switch event');
});

test('gimmick 2-2: enemies under the kotatsu are hidden from cats', () => {
  const g = { kind: 'kotatsu', x: 700, y: 300, rx: 150, ry: 80, note: '' };
  const s = inWave(new Sim({ level: level({ gimmick: g }), layout: LAYOUT, seed: 3 }));
  s.build(0, 'pudding');
  const t = s.towers[0];
  const under = spawnAt(s, 'cucumber-cadet', 750); // x≈700: under the quilt
  const out = spawnAt(s, 'cucumber-cadet', 450); // x≈400: in the open
  s.step();
  assert.ok(under.covered && !out.covered);
  assert.ok(!s.canTarget(t, under));
  assert.ok(s.canTarget(t, out));
});

test('gimmick 2-3: a sock covers a free cushion each wave and blocks building there', () => {
  const s = new Sim({ level: level({ waves: waves(3), gimmick: { kind: 'socks', note: '' } }), layout: LAYOUT, seed: 9 });
  s.build(0, 'pudding');
  nextWave(s);
  assert.ok(s.sockSpot >= 0 && s.sockSpot !== 0, 'prefers an empty cushion');
  assert.ok(!s.spotUsable(s.sockSpot));
  assert.ok(!s.build(s.sockSpot, 'pudding'));
  const before = s.sockSpot;
  nextWave(s);
  assert.ok(s.sockSpot >= 0);
  assert.ok(s.spotUsable(before) || s.sockSpot === before);
});

test('gimmick 3-1: rain makes Spritz tougher and soakier', () => {
  const rain = { kind: 'rain', hp: 1.25, wet: 1.5, every: 0.7, note: '' };
  const dry = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 1 }));
  const wet = inWave(new Sim({ level: level({ gimmick: rain }), layout: LAYOUT, seed: 1 }));
  const a = spawnAt(dry, 'spritz', 500);
  const b = spawnAt(wet, 'spritz', 500);
  assert.ok(Math.abs(b.maxHp - a.maxHp * 1.25) < 1e-9);
  wet.build(0, 'pudding');
  Object.assign(wet.towers[0], { x: b.x, y: b.y + 120 });
  b.sprayT = 0;
  wet.stepEnemyAbilities(b, 1 / 60);
  assert.ok(Math.abs(wet.towers[0].wetT - ENEMY_BY_ID.spritz.spray.wet * 1.5) < 1e-9);
  assert.ok(Math.abs(b.sprayT - ENEMY_BY_ID.spritz.spray.every * 0.7) < 1e-9);
});

test('Endless moods roll every 10 waves and apply their modifiers', () => {
  const lvl = endlessLevel(0);
  const s = new Sim({ level: lvl, layout: LAYOUT, seed: 77, endless: true });
  s.build(0, 'pudding');
  s.build(1, 'sriracha');
  /** @type {any[]} */
  const moods = [];
  for (let w = 0; w < 20; w++) {
    s.startNextWave();
    for (const ev of s.events) if (ev.type === 'mood') moods.push({ wave: s.waveIdx, id: ev.id });
    s.events.length = 0;
  }
  assert.deepEqual(moods.map((m) => m.wave), [10, 20]);
  assert.notEqual(moods[0].id, moods[1].id);
  for (const m of MOODS) {
    s.mood = m.id;
    const t = s.towers[0];
    s.sunbeamTid = t.id;
    const mul = s.dmgMul(t);
    const base = 1 + s.mochiBuffs(t).dmg;
    const want = base * (m.catDmg ?? 1) * (m.sunbeam ? 2 : 1);
    assert.ok(Math.abs(mul - want) < 1e-9, m.id);
  }
  // Bath Day wets everyone at wave start; Mondays adds a Monday.
  s.mood = 'bath';
  s.startNextWave();
  assert.ok(s.towers[0].wetT > 0 && s.towers[1].wetT > 0);
  s.mood = 'mondays';
  s.spawns = [];
  s.startNextWave();
  assert.ok(s.spawns.some((x) => x.id === 'monday'));
});

test('hero: moves in a straight line, clamps to the stage, attacks and levels up', () => {
  for (const id of Object.keys(HEROES)) {
    const s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 5, hero: id }));
    const h = s.hero;
    assert.ok(h && h.alive && h.level === 1);
    assert.ok(s.heroMove(5000, -100));
    assert.ok(h.tx <= 1880 && h.ty >= 100, 'clamped');
    s.heroMove(700, 330);
    for (let i = 0; i < 60 * 12; i++) s.step();
    assert.ok(!h.moving && Math.abs(h.x - 700) < 1 && Math.abs(h.y - 330) < 1, id + ' arrived');
    const e = spawnAt(s, 'tubby-mcsoak', 760);
    const hp = e.hp;
    for (let i = 0; i < 60 * 3; i++) s.step();
    assert.ok(e.hp < hp, id + ' attacked');
    if (HEROES[id].blocks) assert.equal(e.blockedBy, HERO_ID, id + ' holds the enemy');
    const before = h.level;
    for (let k = 0; k < 30; k++) s.damage(spawnAt(s, 'cucumber-cadet', 760), 1e6, 'chaos', null);
    assert.ok(h.level > before && h.xp >= xpFor(h.level), id + ' levelled up');
    assert.ok(h.maxHp > HEROES[id].hp);
  }
});

test('hero abilities: Box Fort, Paw Slap, Starfall, Gravity Nap, Shop\'s Closed, Day-Old Sushi', () => {
  // Ronin: Box Fort blocks the path; Thousand Paw Slap hits hard.
  let s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 5, hero: 'ronin-biscuit' }));
  s.hero.x = 700;
  s.hero.y = 340;
  const cadet = spawnAt(s, 'cucumber-cadet', 400);
  assert.ok(s.heroAbility('a1'));
  assert.equal(s.blockers.length, 1);
  assert.ok(!s.heroAbility('a1'), 'cooldown');
  const boxD = s.blockers[0].d;
  for (let i = 0; i < 60 * 4; i++) s.step();
  assert.ok(cadet.d <= boxD - 20, 'held behind the box');
  const tub = spawnAt(s, 'tubby-mcsoak', boxD - 60);
  s.hero.target = tub.id;
  const hp = tub.hp;
  assert.ok(s.heroAbility('a2'));
  assert.ok(hp - tub.hp >= HEROES['ronin-biscuit'].dmg * 10 * (1 - (ENEMY_BY_ID['tubby-mcsoak'].armor ?? 0)) - 1e-6);
  // Nebula: Starfall damages an area; Gravity Nap pauses enemies.
  s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 5, hero: 'nebula' }));
  s.hero.x = 700;
  s.hero.y = 400;
  const t1 = spawnAt(s, 'tubby-mcsoak', 760);
  const h1 = t1.hp;
  assert.ok(s.heroAbility('a1'));
  for (let i = 0; i < 100; i++) s.step();
  assert.ok(t1.hp < h1, 'meteors hit');
  s.damage(t1, 1e9, 'chaos', null);
  const c2 = spawnAt(s, 'cucumber-cadet', 700);
  assert.ok(s.heroAbility('a2'));
  const d0 = c2.d;
  for (let i = 0; i < 60; i++) s.step();
  assert.ok(Math.abs(c2.d - d0) < 3, 'napping in the bubble');
  // Big Tom: taunt holds enemies; sushi dries cats and heals kittens.
  s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 5, hero: 'big-tom' }));
  s.hero.x = 700;
  s.hero.y = 330;
  const c3 = spawnAt(s, 'cucumber-cadet', 640);
  assert.ok(s.heroAbility('a1'));
  assert.ok(c3.tauntT > 0);
  s.build(0, 'mama-mittens');
  s.towers[0].wetT = 5;
  for (const k of s.kittens) k.hp = 1;
  assert.ok(s.heroAbility('a2'));
  assert.equal(s.towers[0].wetT, 0);
  assert.ok(s.kittens.every((k) => k.hp === k.maxHp));
});

test('hero passives + downed/respawn + serialize/restore', () => {
  // Stargazer: Nebula gives nearby cats +10% range.
  let s = new Sim({ level: level(), layout: LAYOUT, seed: 5, hero: 'nebula' });
  s.build(0, 'pudding');
  s.hero.x = s.towers[0].x;
  s.hero.y = s.towers[0].y + 40;
  assert.ok(Math.abs(s.rangeOf(s.towers[0]) - s.towers[0].s.range * 1.1) < 1e-9);
  // Regular Customer: +5 treats per kill near Big Tom.
  s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 5, hero: 'big-tom' }));
  const e = spawnAt(s, 'cucumber-cadet', 300);
  s.hero.x = e.x;
  s.hero.y = e.y + 30;
  const t0 = s.treats;
  s.damage(e, 1e6, 'chaos', null);
  assert.equal(s.treats, t0 + e.bounty + 5);
  // Downed → naps 15s → respawns at the stash side.
  s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 5, hero: 'big-tom' }));
  const tub = spawnAt(s, 'tubby-mcsoak', 900);
  s.hero.x = tub.x - 20;
  s.hero.y = tub.y;
  s.hero.postX = s.hero.x;
  s.hero.postY = s.hero.y;
  s.hero.hp = 0.5;
  s.hero.invulnT = 0;
  for (let i = 0; i < 120 && s.hero.alive; i++) s.step();
  assert.ok(!s.hero.alive, 'downed');
  assert.ok(s.events.some((ev) => ev.type === 'heroDown'));
  const snap = JSON.parse(JSON.stringify(s.serialize()));
  const r = Sim.restore(snap, { level: level(), layout: LAYOUT });
  assert.equal(r.hero.id, 'big-tom');
  assert.equal(r.hero.alive, false);
  for (const x of [s, r]) for (let i = 0; i < 60 * 16; i++) x.step();
  assert.ok(s.hero.alive && r.hero.alive, 'napped back to life');
  assert.equal(r.hero.hp, s.hero.hp);
  assert.deepEqual([r.hero.x, r.hero.y], [s.hero.x, s.hero.y]);
});

test('Nine Lives saves Ronin once per wave', () => {
  const s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 5, hero: 'ronin-biscuit' }));
  const tub = spawnAt(s, 'tubby-mcsoak', 900);
  Object.assign(s.hero, { x: tub.x - 20, y: tub.y, postX: tub.x - 20, postY: tub.y, hp: 0.5, invulnT: 0 });
  for (let i = 0; i < 30; i++) s.step();
  assert.ok(s.hero.alive && s.hero.nineUsed);
  assert.ok(s.events.some((ev) => ev.type === 'nineLives'));
});

test('challenges: Iron Cat = 1 snack and no powers; Nap Time = only the first 4 cushions', () => {
  const iron = new Sim({ level: level(), layout: LAYOUT, seed: 1, challenge: 'iron' });
  assert.equal(iron.lives, 1);
  assert.equal(iron.maxLives, 1);
  assert.ok(!iron.usePower('yowl'));
  const nap = new Sim({ level: level(), layout: LAYOUT, seed: 1, challenge: 'nap' });
  assert.ok(nap.build(3, 'pudding'));
  assert.ok(!nap.build(4, 'pudding'));
  assert.ok(!nap.build(5, 'pudding'));
  assert.deepEqual(nap.spotLocked, [false, false, false, false, true, true]);
  const snap = JSON.parse(JSON.stringify(nap.serialize()));
  const r = Sim.restore(snap, { level: level(), layout: LAYOUT });
  assert.equal(r.challenge, 'nap');
  assert.ok(!r.build(4, 'pudding'));
});

test('tier-4 skills: Sticky Situation puddle, Lost Needle trips, Ninja smoke', () => {
  let s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 2 }));
  s.build(0, 'pudding');
  s.upgrade(0);
  s.upgrade(0);
  s.upgrade(0, 4); // The Big One
  spawnAt(s, 'tubby-mcsoak', 700);
  for (let i = 0; i < 60 * 3; i++) s.step();
  assert.ok(s.zones.some((z) => z.kind === 'sticky'), 'sticky puddle');
  s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 2 }));
  s.build(0, 'granny-purl');
  s.upgrade(0);
  s.upgrade(0);
  s.upgrade(0, 4); // Tangle of Tuesdays
  for (let k = 0; k < 4; k++) spawnAt(s, 'tubby-mcsoak', 600 + k * 40);
  for (let i = 0; i < 60 * 4; i++) s.step();
  assert.ok(s.events.some((ev) => ev.type === 'trip'), 'Lost Needle');
  s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 2 }));
  s.build(0, 'mama-mittens');
  s.upgrade(0);
  s.upgrade(0);
  s.upgrade(0, 3); // Ninja Kittens
  const k = s.kittens[0];
  k.hp = k.maxHp * 0.2;
  s.step();
  assert.ok(k.smoked && k.hp >= k.maxHp * 0.6 - 1e-9);
  assert.ok(s.events.some((ev) => ev.type === 'smoke'));
});

test('bosses: the Sucktator can be unplugged by the mug; Bathzilla gets stuck in the drain', () => {
  const s = inWave(new Sim({ level: level(), layout: LAYOUT, seed: 2 }));
  const b = spawnAt(s, 'sucktator', 800);
  s.damage(b, b.maxHp * 0.4, 'chaos', null);
  assert.equal(b.phase, 1);
  s.step();
  assert.ok(s.usePower('mug', b.plugX, b.plugY));
  for (let i = 0; i < 40; i++) s.step();
  assert.ok(b.unplugT > 0, 'unplugged');
  assert.ok(s.events.some((ev) => ev.type === 'unplug'));
  const z = spawnAt(s, 'bathzilla', 300);
  s.damage(z, z.maxHp * 0.7, 'chaos', null);
  assert.equal(z.phase, 2);
  let stuck = false;
  for (let i = 0; i < 60 * 12 && !stuck; i++) {
    s.step();
    stuck = z.stuckT > 0;
  }
  assert.ok(stuck, 'stuck in the drain');
  const hp = z.hp;
  s.damage(z, 100, 'chaos', null);
  assert.ok(Math.abs(hp - z.hp - 175) < 1e-6, 'takes bonus damage while stuck');
  void WORLD_HP;
});
