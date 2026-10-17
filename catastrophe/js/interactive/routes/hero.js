// @ts-check
// Hero select: three hero cards with live previews, a challenge picker and "Let's go!".
import { h, canvas as mkCanvas, tape, starRow } from '../dom.js';
import { progress } from '../store.js';
import { isUnlocked, endlessUnlocked } from '../../ui/save.js';
import { LEVELS, LEVEL_BY_ID } from '../../data/levels.js';
import { HERO_ART, makeCat, catView, pick } from '../rigs.js';
import { HERO_IDS } from '../../art/registry.js';
import { STYLE_LABEL, COUNTER_TIPS } from '../lore.js';
import { clickMeow, toast } from '../ui.js';

const LAST_HERO = 'cata:lastHero';

/** @param {string[]} params */
export function guard(params) {
  const id = params[0];
  const p = progress();
  if (id === 'endless') return endlessUnlocked(p) ? null : '#/map';
  const i = LEVELS.findIndex((l) => l.id === id);
  if (i < 0 || !isUnlocked(i, p)) return '#/map';
  return null;
}

/** @param {string[]} params */
export function render(params) {
  const levelId = params[0];
  const endless = levelId === 'endless';
  const lvl = endless ? null : LEVEL_BY_ID[levelId];
  const p = progress();
  const stars = lvl ? (p.stars[lvl.id] ?? 0) : 0;
  const ch = lvl ? (p.challenges[lvl.id] ?? {}) : {};
  const challengesOpen = stars > 0;

  let stored = null;
  try {
    stored = localStorage.getItem(LAST_HERO);
  } catch {
    /* ignore */
  }
  let hero = stored && HERO_ART[stored] ? stored : HERO_IDS[0];
  /** @type {''|'iron'|'nap'} */
  let challenge = '';

  /** @type {(() => void)[]} */
  const starters = [];
  /** @type {HTMLElement[]} */
  const heroCards = [];
  const go = /** @type {HTMLAnchorElement} */ (h('a', { class: 'btn primary big go-btn' }));

  const sync = () => {
    for (const c of heroCards) {
      const on = c.dataset.id === hero;
      c.classList.toggle('picked', on);
      c.querySelector('.pick')?.setAttribute('aria-checked', String(on));
    }
    const q = new URLSearchParams({ mode: 'interactive', hero });
    if (challenge) q.set('challenge', challenge);
    go.href = `./play.html?${q.toString()}#/play/${levelId}`;
    go.textContent = `Let's go${challenge === 'iron' ? ', Iron Cat' : challenge === 'nap' ? ', Nap Time' : ''}! ▶`;
  };

  HERO_IDS.forEach((id, n) => {
    const art = HERO_ART[id];
    if (!art) return;
    const meta = art.hero;
    const rig = makeCat(id, 200 + n);
    const cv = mkCanvas({ class: 'hero-canvas', role: 'img', 'aria-label': `${meta.name}, animated. Hover or click for a move.` });
    let k = 0;
    const demo = () => {
      const ab = meta.abilities[k % meta.abilities.length];
      k++;
      if (ab && art.spec.actions?.[ab.id]) rig.play(ab.id);
      else {
        rig.poke();
        rig.setExpression(pick(['focused', 'smug', 'happy']));
      }
      if (ab) rig.say(ab.name, 0, -270, 22);
    };
    starters.push(() =>
      catView(cv, rig, {
        bg: n === 1 ? 'night' : n === 2 ? 'blush' : 'meadow',
        fill: 0.74,
        onClick: () => {
          demo();
          clickMeow(id === 'big-tom' ? 0.75 : 1);
        },
      }),
    );
    cv.addEventListener('pointerenter', demo);
    const pickBtn = h('button', { class: 'btn pick', type: 'button', role: 'radio', 'aria-checked': 'false', text: `Pick ${meta.name}` });
    const card = h('article', { class: 'hero-card', 'data-id': id, style: { '--d': `${0.1 + n * 0.1}s` } }, [
      tape(n === 0 ? 'peach' : n === 1 ? 'lilac' : 'mint'),
      cv,
      h('h3', { text: meta.name }),
      h('p', { class: 'subtitle', text: meta.title }),
      h('p', { class: 'style-tag', text: STYLE_LABEL[meta.style] ?? meta.style }),
      h('p', { class: 'bio', text: meta.blurb }),
      h(
        'ul',
        { class: 'abilities' },
        meta.abilities.map((a) => h('li', {}, [h('kbd', { text: a.key }), h('b', { text: a.name }), h('span', { text: a.desc })])),
      ),
      h('p', { class: 'passive' }, [h('span', { class: 'pill', text: 'Passive' }), h('b', { text: meta.passive.name }), h('span', { text: ` ${meta.passive.desc}` })]),
      COUNTER_TIPS[id] ? h('p', { class: 'counter-tip', text: COUNTER_TIPS[id] }) : null,
      pickBtn,
    ]);
    const choose = () => {
      hero = id;
      try {
        localStorage.setItem(LAST_HERO, id);
      } catch {
        /* ignore */
      }
      rig.setExpression('celebrate');
      setTimeout(() => rig.setExpression('idle'), 1400);
      sync();
    };
    pickBtn.addEventListener('click', choose);
    card.addEventListener('click', (e) => {
      if (e.target === card) choose();
    });
    heroCards.push(card);
  });

  // challenge picker
  /** @param {''|'iron'|'nap'} id @param {string} label @param {string} desc @param {boolean} [done] */
  const opt = (id, label, desc, done) => {
    const locked = id !== '' && !challengesOpen;
    const b = h(
      'button',
      {
        class: `challenge${locked ? ' locked' : ''}`,
        type: 'button',
        role: 'radio',
        'aria-checked': String(challenge === id),
        'aria-disabled': locked ? 'true' : null,
      },
      [h('b', { text: label }), h('span', { text: locked ? 'Unlocks after you earn ⭐ on this level.' : desc }), done ? h('span', { class: 'done', text: '✓ cleared' }) : null],
    );
    b.addEventListener('click', () => {
      if (locked) {
        toast('Beat this level first. Then the cats will consider being difficult on purpose.', { icon: '🔒', kind: 'pink' });
        return;
      }
      challenge = id;
      picker.querySelectorAll('.challenge').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      sync();
    });
    return b;
  };
  const picker = endless
    ? h('p', { class: 'page-sub', text: `Endless mode: the basket never empties. Best so far: ${p.endlessBest} waves.` })
    : h('div', { class: 'challenges', role: 'radiogroup', 'aria-label': 'Challenge' }, [
        opt('', '🙂 Normal', 'The usual. Snacks, cats, chaos.'),
        opt('iron', '🛡 Iron Cat', 'One life. No Cat Powers. No excuses.', ch.iron),
        opt('nap', '💤 Nap Time', 'Only 4 cats. Seat them wisely.', ch.nap),
      ]);

  const title = endless ? '∞ The Infinite Laundry Basket' : `${lvl?.id} · ${lvl?.name}`;
  const el = h('section', { class: 'page hero-page' }, [
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, [
      h('a', { href: '#/map', text: '🗺️ Map' }),
      h('span', { text: ' › ' }),
      endless ? null : h('a', { href: `#/briefing/${levelId}`, text: `Briefing ${levelId}` }),
      endless ? null : h('span', { text: ' › ' }),
      h('span', { text: 'Pick a hero' }),
    ]),
    h('header', {}, [
      h('p', { class: 'eyebrow', text: title }),
      h('h1', { class: 'page-title', text: 'Choose your hero' }),
      lvl ? h('p', { class: 'brief-meta' }, [starRow(stars), h('span', { text: ' One hero joins the cats for this level. Click a hero to see a move.' })]) : null,
    ]),
    h('div', { class: 'hero-grid', role: 'radiogroup', 'aria-label': 'Hero' }, heroCards),
    h('article', { class: 'card challenge-card' }, [tape('gold'), h('h2', { text: endless ? 'Endless' : 'Challenge' }), picker]),
    h('div', { class: 'go-row' }, [h('a', { class: 'btn', href: endless ? '#/map' : `#/briefing/${levelId}`, text: '← Back' }), go]),
  ]);
  sync();

  go.addEventListener('click', () => {
    try {
      localStorage.setItem(LAST_HERO, hero);
    } catch {
      /* ignore */
    }
  });

  return { el, title: `Hero select ${levelId}`, after: () => starters.forEach((f) => f()) };
}
