// Unit tests for the pure simulation. Run: node --test tools/tests
import test from 'node:test';
import assert from 'node:assert/strict';
import { Sim, DT, SELL_REFUND } from '../../js/sim/sim.js';
import { CAT_BY_ID } from '../../js/data/cats.js';
import { ENEMY_BY_ID } from '../../js/data/enemies.js';
import { LEVELS } from '../../js/data/levels.js';
import { WAVES, parseWave } from '../../js/data/waves.js';
import { QUIPS } from '../../js/data/quips.js';
import { CAT_IDS, ENEMY_IDS, BOSS_IDS } from '../../js/data/ids.js';

/** A straight test corridor: left → right at y=500, spots 150px above/below. */
const LAYOUT = {
  id: 't',
  name: 'Test',
  paths: [[{ x: -50, y: 500 }, { x: 600, y: 500 }, { x: 1300, y: 500 }, { x: 1900, y: 500 }]],
  spots: [{ x: 600, y: 350 }, { x: 900, y: 650 }, { x: 1200, y: 350 }, { x: 300, y: 650 }],
  stash: { x: 1900, y: 500 },
};

function level(o = {}) {
  return { id: 'test', name: 'Test', world: 'countryside', worldIdx: 0, layout: 0, startTreats: 1000, lives: 20, cats: [...CAT_IDS], waves: [parseWave('C1')], boss: null, intro: [], seed: 42, ...o };
}
function sim(o = {}) {
  return new Sim({ level: level(o), layout: LAYOUT, seed: 7 });
}
function spawnAt(s, id, d) {
  const e = s.spawnEnemy(id, 0, false, d, 1);
  e.off = 0;
  s.placeEnemy(e);
  return e;
}
function inWave(s) {
  s.phase = 'wave';
  s.waveIdx = 1;
  s.spawns = [];
  return s;
}

test('data: every id has stats, quips and 5 tiers; all waves parse', () => {
  for (const id of CAT_IDS) {
    assert.ok(CAT_BY_ID[id], id);
    assert.equal(CAT_BY_ID[id].tiers.length, 5);
    assert.ok(QUIPS[id]?.length >= 3, 'quips ' + id);
  }
  for (const id of [...ENEMY_IDS, ...BOSS_IDS]) {
    assert.ok(ENEMY_BY_ID[id], id);
    assert.ok(QUIPS[id]?.length >= 3, 'quips ' + id);
    for (const q of QUIPS[id]) assert.ok(q.length <= 70, q);
  }
  assert.equal(LEVELS.length, 12);
  for (const l of LEVELS) {
    assert.ok(l.waves.length >= 10 && l.waves.length <= 12, l.id);
    for (const w of l.waves) for (const g of w) assert.ok(ENEMY_BY_ID[g.id], `${l.id}: ${g.id}`);
    if (l.boss) assert.ok(l.waves[l.waves.length - 1].some((g) => g.id === l.boss), 'boss in final wave ' + l.id);
  }
  assert.deepEqual(LEVELS[0].cats, ['pudding', 'granny-purl']);
  assert.equal(Object.keys(WAVES).length, 12);
});

test('damage: bonk is reduced by armor, sparkle by shine, chaos ignores both', () => {
  const s = sim();
  const v = spawnAt(s, 'vroomba', 300);
  const armor = ENEMY_BY_ID.vroomba.armor ?? 0;
  const hp = v.hp;
  s.damage(v, 20, 'bonk', null);
  assert.equal(hp - v.hp, Math.round(20 * (1 - armor)));
  s.damage(v, 20, 'sparkle', null);
  assert.equal(hp - v.hp, Math.round(20 * (1 - armor)) + 20);
  const b = spawnAt(s, 'empty-bowl', 300); // shine 0.3
  const bh = b.hp;
  s.damage(b, 10, 'sparkle', null);
  assert.ok(Math.abs(bh - b.hp - 7) < 1e-9);
  s.damage(b, 10, 'chaos', null);
  assert.ok(Math.abs(bh - b.hp - 17) < 1e-9);
  // Sriracha shred stacks lower armor (5% per stack).
  v.shred = 4;
  const h2 = v.hp;
  s.damage(v, 10, 'bonk', null);
  assert.ok(Math.abs(h2 - v.hp - 10 * (1 - Math.max(0, armor - 0.2))) < 1e-9);
});

test('targeting: first / last / strong / close (+ taunt)', () => {
  const s = sim();
  s.build(0, 'pudding'); // spot (600,350)
  const t = s.towers[0];
  const a = spawnAt(s, 'cucumber-cadet', 520);
  const b = spawnAt(s, 'cucumber-cadet', 760); // furthest along
  const c = spawnAt(s, 'tubby-mcsoak', 645); // strongest + closest
  const range = s.rangeOf(t);
  t.mode = 'first';
  assert.equal(s.acquire(t, range).id, b.id);
  t.mode = 'last';
  assert.equal(s.acquire(t, range).id, a.id);
  t.mode = 'strong';
  assert.equal(s.acquire(t, range).id, c.id);
  t.mode = 'close';
  assert.equal(s.acquire(t, range).id, c.id);
  const door = spawnAt(s, 'closed-door', 600);
  t.mode = 'first';
  assert.equal(s.acquire(t, range).id, door.id, 'taunt overrides the mode');
});

test('status: slow reduces travel, stun stops it, vibing walks backward', () => {
  const s = inWave(sim());
  const free = spawnAt(s, 'cucumber-cadet', 200);
  const slowed = spawnAt(s, 'cucumber-cadet', 200);
  const stunned = spawnAt(s, 'cucumber-cadet', 200);
  const vibing = spawnAt(s, 'cucumber-cadet', 200);
  s.slow(slowed, 0.5, 10);
  s.stun(stunned, 10);
  s.vibe(vibing, 10);
  for (let i = 0; i < 60; i++) s.step();
  assert.ok(Math.abs(free.d - 260) < 1, 'free moved 60px in 1s: ' + free.d);
  assert.ok(Math.abs(slowed.d - 230) < 1, 'slowed moved 30px: ' + slowed.d);
  assert.equal(stunned.d, 200);
  assert.ok(vibing.d < 200, 'vibing moved backward');
});

test('wet cats do not attack; despair makes cats sad', () => {
  const s = sim();
  s.build(0, 'pudding');
  const t = s.towers[0];
  t.wetT = 5;
  inWave(s);
  spawnAt(s, 'tubby-mcsoak', 650);
  for (let i = 0; i < 120; i++) s.step();
  assert.equal(t.dmgDone, 0);
  t.wetT = 0;
  spawnAt(s, 'empty-bowl', 650);
  s.stepAuras();
  assert.ok(t.sad, 'despair aura');
});

test('economy: build cost, kill bounty, sell refund 70%, early call bonus, Mochi income', () => {
  const s = sim();
  assert.ok(s.build(0, 'pudding'));
  assert.equal(s.treats, 1000 - 70);
  assert.ok(!s.build(0, 'pudding'), 'spot taken');
  assert.ok(s.upgrade(0));
  assert.equal(s.treats, 1000 - 70 - 95);
  const before = s.treats;
  assert.equal(s.sell(0), Math.floor((70 + 95) * SELL_REFUND));
  assert.equal(s.treats, before + Math.floor(165 * 0.7));
  const e = spawnAt(s, 'cucumber-cadet', 300);
  const t0 = s.treats;
  s.damage(e, 999, 'chaos', null);
  assert.equal(s.treats, t0 + 4);
  const s2 = new Sim({ level: level({ waves: [parseWave('C1'), parseWave('C1')] }), layout: LAYOUT, seed: 1 });
  s2.build(1, 'maneki-mochi');
  s2.callEarly();
  for (let i = 0; i < 30; i++) s2.step();
  assert.ok(s2.canCallEarly);
  const t1 = s2.treats;
  const bonus = s2.callEarly();
  assert.ok(bonus > 0);
  assert.equal(s2.treats, t1 + bonus + 15, 'early bonus + Mochi income');
  const poor = new Sim({ level: level({ startTreats: 10 }), layout: LAYOUT });
  assert.ok(!poor.build(0, 'pudding'));
});

test('free placement: anywhere off the path, away from the stash and other cats; moves between waves', () => {
  const s = sim();
  // The corridor runs along y=500; the stash sits at (1900, 500).
  assert.equal(s.canPlace(700, 500), 'path');
  assert.equal(s.canPlace(700, 430), 'path', 'cushion would poke onto the path');
  assert.equal(s.canPlace(700, 380), '');
  assert.equal(s.canPlace(1800, 400), 'stash');
  assert.equal(s.canPlace(20, 300), 'bounds');
  const a = s.place('pudding', 700, 380);
  assert.equal(a, 0);
  assert.deepEqual([s.towers[a].x, s.towers[a].y], [700, 380]);
  assert.equal(s.canPlace(760, 390), 'cat', 'footprints may not overlap');
  assert.equal(s.canPlace(700, 300), '', 'a row behind is fine');
  assert.equal(s.place('pudding', 760, 390), -1);
  const b = s.place('granny-purl', 850, 650);
  assert.equal(b, 1);
  assert.ok(s.events.some((ev) => ev.type === 'place' && ev.x === 850 && ev.y === 650));
  // Sold slots are reused.
  s.sell(a);
  assert.equal(s.place('sriracha', 400, 300), 0);
  // Moving: free between waves, not mid-wave, never onto the path.
  assert.equal(s.move(1, 1000, 650), '');
  assert.deepEqual([s.towers[1].x, s.towers[1].y], [1000, 650]);
  assert.equal(s.move(1, 1000, 520), 'path');
  inWave(s);
  s.boundary = false;
  assert.equal(s.move(1, 1100, 650), 'wave');
  s.boundary = true;
  assert.equal(s.move(1, 1100, 650), '');
  // Barracks rally points follow the cat.
  const m = s.place('mama-mittens', 300, 650);
  const r0 = { ...s.towers[m].rally };
  assert.equal(s.move(m, 1300, 650), '');
  assert.ok(Math.abs(s.towers[m].rally.x - r0.x) > 500, 'kittens rally near the new spot');
  assert.ok(s.kittens.filter((k) => k.towerId === s.towers[m].id).length > 0);
  // Positions survive a save.
  const r = Sim.restore(JSON.parse(JSON.stringify(s.serialize())), { level: level(), layout: LAYOUT });
  assert.deepEqual(r.towers.map((t) => t && [t.cat, t.x, t.y]), s.towers.map((t) => t && [t.cat, t.x, t.y]));
  // Cat limit = the layout's suggested-spot count (4 here); moving a seated cat is still fine at the limit.
  const c = sim();
  assert.equal(c.catCap, LAYOUT.spots.length);
  for (const [x, y] of [[300, 300], [600, 300], [900, 300], [1200, 300]]) assert.ok(c.place('pudding', x, y) >= 0);
  assert.equal(c.canPlace(300, 700), 'limit');
  assert.equal(c.move(0, 300, 700), '');
  c.sell(1);
  assert.ok(c.place('pudding', 600, 700) >= 0, 'selling frees a seat');
});

test('split: Tubby McSoak → 6 duckies; Carrier → 3 cadets', () => {
  const s = sim();
  const tub = spawnAt(s, 'tubby-mcsoak', 500);
  s.damage(tub, 1e6, 'chaos', null);
  s.cleanup();
  assert.equal(s.enemies.filter((e) => e.type === 'rubber-duckie').length, 6);
  const car = spawnAt(s, 'carrier', 500);
  s.damage(car, 1e6, 'chaos', null);
  s.cleanup();
  assert.equal(s.enemies.filter((e) => e.type === 'cucumber-cadet').length, 3);
});

test('specials: Good Boy befriends, Overdue Bill steals 10%, Fancy Bed immunity, stealth', () => {
  const s = sim();
  const dog = spawnAt(s, 'good-boy', 400);
  const t0 = s.treats;
  s.damage(dog, 1e6, 'chaos', null);
  assert.ok(dog.friendly && dog.alive, 'flops instead of dying');
  assert.equal(s.treats, t0 + 50);
  inWave(s);
  const bill = spawnAt(s, 'overdue-bill', s.tracks[0].length - 1);
  const treats = s.treats;
  for (let i = 0; i < 5; i++) s.step();
  assert.ok(!bill.alive);
  assert.equal(s.lives, 20);
  assert.equal(s.treats, treats - Math.floor(treats * 0.1));
  s.build(0, 'pudding');
  s.build(2, 'chonkington');
  const bed = spawnAt(s, 'fancy-bed', 650);
  assert.ok(!s.canTarget(s.towers[0], bed));
  assert.ok(s.canTarget(s.towers[2], bed));
  const s2 = sim();
  const p = spawnAt(s2, 'sneaky-pickle', 100);
  s2.build(0, 'pudding');
  s2.stepStealth();
  assert.ok(p.hidden);
  assert.ok(!s2.canTarget(s2.towers[0], p));
  p.d = 640;
  s2.placeEnemy(p);
  s2.stepStealth();
  assert.ok(!p.hidden);
  assert.ok(s2.towers[0].stunT > 0, 'startled');
  const s3 = sim();
  const p3 = spawnAt(s3, 'sneaky-pickle', 640);
  s3.build(0, 'maneki-mochi');
  s3.stepStealth();
  assert.ok(!p3.hidden);
  assert.equal(s3.towers[0].stunT, 0, 'Mochi reveals calmly');
});

test('kittens block enemies; boss phases trigger at 66% / 33%', () => {
  const s = sim();
  s.build(0, 'mama-mittens');
  inWave(s);
  const e = spawnAt(s, 'tubby-mcsoak', 560);
  for (let i = 0; i < 120; i++) s.step();
  assert.ok(e.blockedBy > 0, 'a kitten blocks the tub');
  const d = e.d;
  for (let i = 0; i < 30; i++) s.step();
  assert.ok(Math.abs(e.d - d) < 0.01, 'blocked enemy holds position');
  const boss = spawnAt(s, 'cucumberto', 100);
  s.damage(boss, boss.maxHp * 0.4, 'chaos', null);
  assert.equal(boss.phase, 1);
  assert.ok(boss.jar, 'phase 2 hides in a jar');
  s.damage(boss, boss.maxHp * 0.3, 'chaos', null);
  assert.equal(boss.phase, 2);
});

test('powers: yowl, mug, zoomies + cooldowns', () => {
  const s = inWave(sim());
  const a = spawnAt(s, 'tubby-mcsoak', 700);
  assert.ok(s.usePower('yowl'));
  assert.ok(a.stunT > 0);
  assert.ok(!s.usePower('yowl'), 'cooldown');
  const hp = a.hp;
  assert.ok(s.usePower('mug', a.x, a.y));
  for (let i = 0; i < 40; i++) s.step();
  assert.ok(a.hp < hp, 'mug hit');
  const hp2 = a.hp;
  assert.ok(s.usePower('zoomies'));
  for (let i = 0; i < 120; i++) s.step();
  assert.ok(a.hp < hp2, 'zoomies hit');
});

test('serialize/restore (mid-wave) continues identically', () => {
  const lvl = level({ waves: ['C6/1 D6/.5@2', 'C8/.8 V2/2@3', 'P4/1 C6/1@1 T1@3'].map(parseWave) });
  const a = new Sim({ level: lvl, layout: LAYOUT, seed: 99 });
  a.build(0, 'pudding');
  a.build(1, 'granny-purl');
  a.build(2, 'mama-mittens');
  a.build(3, 'dr-nip');
  a.upgrade(0);
  a.setTargeting(1, 'strong');
  a.callEarly();
  for (let i = 0; i < 60 * 9; i++) a.step();
  assert.ok(a.enemies.length > 0 && a.projectiles.length + a.zones.length > 0, 'snapshot taken mid-fight');
  const snap = JSON.parse(JSON.stringify(a.serialize()));
  const b = Sim.restore(snap, { level: lvl, layout: LAYOUT });
  assert.equal(b.treats, a.treats);
  assert.equal(b.towers[0].tier, 1);
  assert.equal(b.towers[1].mode, 'strong');
  assert.equal(b.kittens.length, 3);
  assert.equal(b.enemies.length, a.enemies.length);
  for (const s of [a, b]) for (let i = 0; i < 60 * 45; i++) s.step();
  assert.equal(b.treats, a.treats);
  assert.equal(b.lives, a.lives);
  assert.equal(b.phase, a.phase);
  assert.equal(b.waveIdx, a.waveIdx);
  assert.equal(b.stats.kills, a.stats.kills);
  assert.deepEqual(b.enemies.map((e) => [e.type, +e.d.toFixed(4), +e.hp.toFixed(4)]), a.enemies.map((e) => [e.type, +e.d.toFixed(4), +e.hp.toFixed(4)]));
  assert.equal(DT, 1 / 60);
});

test('determinism: same seed + same commands → same outcome', () => {
  const run = () => {
    const s = new Sim({ level: level({ waves: ['C10/.5 P4/1@2', 'X3/1 D10/.3@1'].map(parseWave) }), layout: LAYOUT, seed: 5 });
    s.build(0, 'sriracha');
    s.build(1, 'dr-nip');
    s.callEarly();
    for (let i = 0; i < 60 * 60; i++) s.step();
    return [s.treats, s.lives, s.stats.kills, s.phase];
  };
  assert.deepEqual(run(), run());
});

test('win, lose and stars', () => {
  const lose = new Sim({ level: level({ waves: [parseWave('C25/.3')] }), layout: LAYOUT });
  lose.callEarly();
  for (let i = 0; i < 60 * 120 && lose.phase !== 'lost'; i++) lose.step();
  assert.equal(lose.phase, 'lost');
  assert.equal(lose.stars, 0);
  const win = new Sim({ level: level({ waves: [parseWave('C2/1')] }), layout: LAYOUT });
  win.build(0, 'pudding');
  win.build(2, 'pudding');
  win.callEarly();
  for (let i = 0; i < 60 * 120 && win.phase === 'wave'; i++) win.step();
  assert.equal(win.phase, 'won');
  assert.equal(win.stars, 3);
});
