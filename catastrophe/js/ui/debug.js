// @ts-check
// ?debug=1 helpers: FPS readout + registry/data self-check. Errors go to the red overlay
// installed by the inline script in play.html (window.__cataReport).
import { CAT_ART, KITTEN_ART, ENEMY_ART, BOSS_ART, ROOM_ART, ART_ERRORS } from '../art/registry.js';
import { CAT_IDS, KITTEN_IDS, ENEMY_IDS, BOSS_IDS, WORLD_IDS } from '../data/ids.js';
import { CAT_BY_ID } from '../data/cats.js';
import { ENEMY_BY_ID } from '../data/enemies.js';
import { QUIPS } from '../data/quips.js';
import { LEVELS } from '../data/levels.js';
import { getLayout } from '../data/layout.js';

/** @param {import('../game/game.js').Game} game */
export function installDebug(game) {
  /** @type {(msg:string)=>void} */
  const report = /** @type {any} */ (window).__cataReport ?? ((m) => console.error(m));
  const missing = [];
  for (const id of CAT_IDS) {
    if (!CAT_ART[id]) missing.push('art:cat:' + id);
    if (!CAT_BY_ID[id]) missing.push('data:cat:' + id);
    if (!QUIPS[id]) missing.push('quips:' + id);
  }
  for (const id of KITTEN_IDS) if (!KITTEN_ART[id]) missing.push('art:kitten:' + id);
  for (const id of ENEMY_IDS) {
    if (!ENEMY_ART[id]) missing.push('art:enemy:' + id);
    if (!ENEMY_BY_ID[id]) missing.push('data:enemy:' + id);
    if (!QUIPS[id]) missing.push('quips:' + id);
  }
  for (const id of BOSS_IDS) if (!BOSS_ART[id]) missing.push('art:boss:' + id);
  for (const id of WORLD_IDS) if (!ROOM_ART[id]?.room?.layouts?.length) missing.push('art:room:' + id);
  for (const l of LEVELS) {
    try {
      const L = getLayout(l);
      if (!L.paths.length || !L.spots.length) missing.push('layout:' + l.id);
    } catch {
      missing.push('layout:' + l.id);
    }
  }
  for (const id of ART_ERRORS) report('Art module failed to load (placeholder used): ' + id);
  if (missing.length) report('Self-check: missing ' + missing.join(', '));
  const fps = document.createElement('div');
  fps.id = 'debug-fps';
  fps.textContent = missing.length ? '' : '✅ self-check';
  document.body.appendChild(fps);
  setInterval(() => {
    const sim = game.sim;
    fps.textContent = `${Math.round(game.fps)} fps · draw ${game.renderer.drawMs.toFixed(1)}ms · ${sim ? sim.enemies.length : 0} enemies · ${game.renderer.cacheMode ? 'cached room' : 'live room'}${missing.length ? '' : ' · ✅ self-check'}`;
  }, 500);
}
