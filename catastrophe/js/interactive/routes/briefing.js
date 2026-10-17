// @ts-check
// Level briefing: "⚠ NEW THREAT!" polaroids for the level's new enemies/bosses plus the new recruit.
import { h, canvas as mkCanvas, tape, tilt, starRow } from '../dom.js';
import { progress } from '../store.js';
import { isUnlocked } from '../../ui/save.js';
import { LEVELS, LEVEL_BY_ID, WORLD_NAMES } from '../../data/levels.js';
import { ENEMY_BY_ID, WORLD_HP } from '../../data/enemies.js';
import { CAT_BY_ID } from '../../data/cats.js';
import { quip } from '../../data/quips.js';
import { conceptOf, makeCat, makeEnemy, catView, enemyView, isBoss, catArt, enemyArt, pick } from '../rigs.js';
import { BRIEFING_NOTES, COUNTER_TIPS, WORLD_INFO } from '../lore.js';
import { clickMeow } from '../ui.js';

/** @param {string[]} params */
export function guard(params) {
  const i = LEVELS.findIndex((l) => l.id === params[0]);
  if (i < 0) return '#/map';
  return null;
}

/** @param {string[]} params */
export function render(params) {
  const lvl = LEVEL_BY_ID[params[0]];
  const i = LEVELS.indexOf(lvl);
  const p = progress();
  const open = isUnlocked(i, p);
  const stars = p.stars[lvl.id] ?? 0;

  /** @type {(() => void)[]} */
  const starters = [];
  const cards = [];
  let n = 0;
  for (const id of lvl.intro) {
    if (!enemyArt(id)) continue;
    const c = conceptOf(id);
    const stats = ENEMY_BY_ID[id];
    const boss = isBoss(id);
    const cv = mkCanvas({ class: 'polaroid-canvas', role: 'img', 'aria-label': `${c.name}, animated. Click to bonk.` });
    const rig = makeEnemy(id, 30 + n);
    starters.push(() => {
      enemyView(cv, rig, { bg: boss ? 'night' : 'paper', mode: boss ? 'idle' : 'walk', fill: boss ? 0.78 : 0.62 });
      cv.addEventListener('click', () => rig.hit());
    });
    const hp = stats ? Math.round(stats.hp * (boss ? 1 : WORLD_HP[lvl.worldIdx] ?? 1)) : 0;
    cards.push(
      h('article', { class: `polaroid threat${boss ? ' boss' : ''}`, style: { '--tilt': `${tilt(id)}deg`, '--d': `${0.15 + n * 0.12}s` } }, [
        tape(boss ? 'pink' : 'gold'),
        h('span', { class: 'stamp', text: boss ? '☠ BOSS!' : '⚠ NEW THREAT!' }),
        cv,
        h('h3', { text: `${c.icon} ${c.name}` }),
        c.title ? h('p', { class: 'subtitle', text: c.title }) : null,
        h('p', { class: 'bio', text: c.bio }),
        stats
          ? h('p', { class: 'statline' }, [
              h('span', { text: `❤ ${hp}` }),
              h('span', { text: `👟 ${stats.speed.toFixed(2)}×` }),
              stats.armor ? h('span', { text: `🛡 ${Math.round(stats.armor * 100)}%` }) : null,
              stats.flier ? h('span', { text: '🪽 flier' }) : null,
              stats.stealth ? h('span', { text: '🫥 sneaky' }) : null,
            ])
          : null,
        h('p', { class: 'quip', text: `“${quip(id, n + i) || c.quip}”` }),
        COUNTER_TIPS[id] ? h('p', { class: 'counter-tip' }, [h('b', { text: 'Counter tip: ' }), COUNTER_TIPS[id]]) : null,
      ]),
    );
    n++;
  }

  if (lvl.newCat && catArt(lvl.newCat)) {
    const id = lvl.newCat;
    const c = conceptOf(id);
    const def = CAT_BY_ID[id];
    const cv = mkCanvas({ class: 'polaroid-canvas', role: 'img', 'aria-label': `${c.name}, animated. Click to say hi.` });
    const rig = makeCat(id, 90);
    rig.setExpression('happy');
    starters.push(() =>
      catView(cv, rig, {
        bg: 'meadow',
        onClick: () => {
          rig.poke();
          rig.say(pick(['mrrp!', 'hired!', 'reporting!', 'hi.']), 50, -240, 24);
          clickMeow(1);
        },
      }),
    );
    cards.push(
      h('article', { class: 'polaroid recruit', style: { '--tilt': `${tilt(id) * -1}deg`, '--d': `${0.15 + n * 0.12}s` } }, [
        tape('mint'),
        h('span', { class: 'stamp good', text: '🐾 NEW RECRUIT!' }),
        cv,
        h('h3', { text: `${c.icon} ${c.name}` }),
        c.title ? h('p', { class: 'subtitle', text: c.title }) : null,
        h('p', { class: 'bio', text: c.bio }),
        def ? h('p', { class: 'statline' }, [h('span', { text: `🐟 ${def.tiers[0].cost}` }), h('span', { text: `🎯 ${def.tiers[0].range ?? '—'}` })]) : null,
        h('p', { class: 'quip', text: `“${c.quip}”` }),
        COUNTER_TIPS[id] ? h('p', { class: 'counter-tip' }, [h('b', { text: 'Good vs: ' }), COUNTER_TIPS[id]]) : null,
      ]),
    );
  }

  const info = WORLD_INFO[lvl.world];
  const el = h('section', { class: 'page briefing' }, [
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, [h('a', { href: '#/map', text: '🗺️ Map' }), h('span', { text: ' › ' }), h('span', { text: `Briefing ${lvl.id}` })]),
    h('header', { class: `brief-head w-${lvl.world}` }, [
      h('p', { class: 'eyebrow', text: `${info.icon} World ${lvl.worldIdx + 1} · ${WORLD_NAMES[lvl.world]}` }),
      h('h1', { class: 'page-title', text: `${lvl.id} · ${lvl.name}` }),
      h('p', { class: 'brief-meta' }, [
        starRow(stars),
        h('span', { text: ` · ${lvl.waves?.length ?? '?'} waves · ${lvl.startTreats} 🐟 to start · ${lvl.cats.length} cats on duty` }),
      ]),
    ]),
    open
      ? null
      : h('article', { class: 'card locked-note' }, [
          h('h2', { text: '🔒 Not yet!' }),
          h('p', { text: `Beat ${LEVELS[i - 1]?.id} first. The cats insist on doing things in order. Mostly so they can nap in between.` }),
        ]),
    cards.length
      ? h('div', { class: 'polaroids' }, cards)
      : h('p', { class: 'page-sub', text: 'No new threats here. Just the usual suspects. Suspiciously usual.' }),
    h('div', { class: 'brief-foot' }, [
      h('article', { class: 'sticky-note' }, [tape('lilac'), h('p', { text: pick(BRIEFING_NOTES) })]),
      h('div', { class: 'row' }, [
        h('a', { class: 'btn', href: '#/map', text: '← Map' }),
        open ? h('a', { class: 'btn primary big', href: `#/hero/${lvl.id}`, text: 'Continue → Pick a hero' }) : null,
      ]),
    ]),
  ]);

  return { el, title: `Briefing ${lvl.id}`, after: () => starters.forEach((f) => f()) };
}
