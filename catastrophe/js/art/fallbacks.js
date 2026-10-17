// @ts-check
// Fallback art used when a module fails to load, so one broken sprite never blanks the game.
import { googlyEye, ellipsePts, soft } from './enemies/enemyrig.js';

/** @param {string} id @returns {import('./cats/catrig.js').CatSpec} */
export const fallbackCat = (id) => ({
  id,
  fur: '#C9C3B8',
  light: '#ECE7DE',
  shade: '#A49D90',
  cream: '#FBF7EE',
  stripe: '#8E877B',
  eye: '#8FB8D9',
  eyeDark: '#3E5E7A',
  innerEar: '#F2B8BE',
  pattern: 'none',
  tiers: { T1: [], T2: [], T3: [], '4A': [], '4B': [] },
});

export const fallbackTiers = ['T1', 'T2', 'T3', '4A', '4B'].map((id) => ({ id, label: id }));

/** @param {string} id @param {number} [height] @returns {import('./enemies/enemyrig.js').EnemySpec} */
export const fallbackEnemy = (id, height = 160) => ({
  id,
  height,
  deathText: 'poof.',
  phases: ['Phase 1', 'Phase 2', 'Phase 3'],
  draw(g, st) {
    const H = height;
    g.pen.blob(ellipsePts(0, -H * 0.45, H * 0.38, H * 0.45, 24), soft(g.ctx, 0, -H * 0.45, H * 0.4, '#EEE8DC', '#CFC7B8', '#A9A090'));
    googlyEye(g, st, 'l', -H * 0.12, -H * 0.6, H * 0.1);
    googlyEye(g, st, 'r', H * 0.12, -H * 0.6, H * 0.1);
  },
});

/** @param {string} id @param {number} world @returns {import('./rooms/common.js').RoomSpec} */
export const fallbackRoom = (id, world) => ({
  id,
  name: id,
  pathStyle: { fill: '#E8D2A6', edge: '#C9AE7E' },
  drawBack(ctx) {
    ctx.fillStyle = '#E9E4D8';
    ctx.fillRect(0, 0, 1920, 1080);
  },
  layouts: [1, 2, 3].map((n) => ({
    id: `${world}-${n}`,
    name: `Level ${n}`,
    paths: [[{ x: -80, y: 540 }, { x: 600, y: 400 }, { x: 1200, y: 680 }, { x: 1700, y: 540 }]],
    spots: [{ x: 600, y: 560 }, { x: 900, y: 420 }, { x: 1200, y: 520 }, { x: 1400, y: 820 }],
    stash: { x: 1720, y: 540 },
  })),
});
