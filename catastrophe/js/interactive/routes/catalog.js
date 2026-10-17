// @ts-check
// Cat-alog: a scrapbook bestiary (Cats, Kittens, Heroes, Enemies, Bosses) with live rigs,
// bios, stats, quips and counter tips, plus a detail page with expression/tier/action buttons.
import { h, canvas as mkCanvas, tape, tilt, chips } from '../dom.js';
import { progress, setSeen } from '../store.js';
import { CAT_IDS, KITTEN_IDS, HERO_IDS, ENEMY_IDS, BOSS_IDS } from '../../art/registry.js';
import { EXPRESSIONS, EXPRESSION_LABELS } from '../../art/cats/catrig.js';
import { CAT_BY_ID } from '../../data/cats.js';
import { ENEMY_BY_ID, BOSS_PHASES } from '../../data/enemies.js';
import { QUIPS } from '../../data/quips.js';
import { conceptOf, makeCat, makeEnemy, catView, enemyView, catArt, enemyArt, HERO_ART, pick } from '../rigs.js';
import { COUNTER_TIPS, STYLE_LABEL } from '../lore.js';
import { clickMeow } from '../ui.js';

const TABS = [
  { id: 'cats', label: '🐱 Cats', ids: CAT_IDS },
  { id: 'kittens', label: '🍼 Kittens', ids: KITTEN_IDS },
  { id: 'heroes', label: '🦸 Heroes', ids: HERO_IDS },
  { id: 'enemies', label: '👾 Enemies', ids: ENEMY_IDS },
  { id: 'bosses', label: '☠ Bosses', ids: BOSS_IDS },
];
let currentTab = 'cats';

/** @param {string} id */
const tabOf = (id) => TABS.find((t) => t.ids.includes(id))?.id ?? 'cats';

/** @param {string[]} params */
export function guard(params) {
  const id = params[0];
  if (!id) return null;
  return TABS.some((t) => t.ids.includes(id)) ? null : '#/catalog';
}

/** Stat chips for any id. @param {string} id */
function stats(id) {
  const def = CAT_BY_ID[id];
  if (def) {
    const t = def.tiers[0];
    /** @type {string[]} */
    const s = [`🐟 ${t.cost}`];
    if (t.dmg != null) s.push(`💥 ${t.dmg}${t.rate ? ` / ${t.rate}s` : ''}`);
    if (t.dpsMin != null) s.push(`🔴 ${t.dpsMin}–${t.dpsMax} dps`);
    if (t.dps != null) s.push(`🌿 ${t.dps} dps`);
    if (t.kittens) s.push(`🍼 ${t.kittens.n} kittens · ❤ ${t.kittens.hp}`);
    if (t.income != null) s.push(`🪙 +${t.income}/wave`);
    if (t.slow) s.push(`🧶 −${Math.round(t.slow * 100)}% speed`);
    if (t.stun) s.push(`💫 ${t.stun}s stun`);
    s.push(`🎯 ${t.range ?? '—'}`);
    s.push(def.dtype === 'sparkle' ? '✨ sparkle' : def.dtype === 'bonk' ? '🔨 bonk' : '🤝 support');
    return s;
  }
  const e = ENEMY_BY_ID[id];
  if (e) {
    /** @type {string[]} */
    const s = [`❤ ${e.hp}`, `👟 ${e.speed.toFixed(2)}×`];
    if (e.armor) s.push(`🛡 ${Math.round(e.armor * 100)}% bonk-proof`);
    if (e.shine) s.push(`🪞 ${Math.round(e.shine * 100)}% sparkle-proof`);
    if (e.flier) s.push('🪽 flier');
    if (e.stealth) s.push('🫥 stealth');
    s.push(`🍙 eats ${e.snacks}`);
    s.push(`🐟 +${e.bounty} bounty`);
    return s;
  }
  const hero = HERO_ART[id]?.hero;
  if (hero) return [STYLE_LABEL[hero.style] ?? hero.style, ...hero.abilities.map((a) => `${a.key}: ${a.name}`), `Passive: ${hero.passive.name}`];
  return [];
}

/** @param {string} id */
function info(id) {
  const c = conceptOf(id);
  const def = CAT_BY_ID[id];
  const e = ENEMY_BY_ID[id];
  const hero = HERO_ART[id]?.hero;
  return {
    c,
    name: hero?.name ?? c.name,
    title: hero?.title ?? c.title ?? def?.title ?? '',
    bio: c.bio || hero?.blurb || '',
    role: c.role || e?.blurb || def?.blurb || '',
    quips: QUIPS[id] ?? (c.quip ? [c.quip] : []),
    tip: COUNTER_TIPS[id] ?? '',
    icon: c.icon,
  };
}

/** @param {string} id @param {number} n @param {(() => void)[]} starters */
function card(id, n, starters) {
  const I = info(id);
  const seen = !!progress().seen[`catalog:${id}`];
  const isCat = !!catArt(id);
  const cv = mkCanvas({ class: 'polaroid-canvas', role: 'img', 'aria-label': `${I.name}, animated` });
  if (isCat) {
    const rig = makeCat(id, 300 + n);
    starters.push(() => catView(cv, rig, { bg: HERO_ART[id] ? 'blush' : 'paper', fill: 0.78, ground: 0.9 }));
  } else if (enemyArt(id)) {
    const rig = makeEnemy(id, 300 + n);
    const boss = tabOf(id) === 'bosses';
    starters.push(() => enemyView(cv, rig, { bg: boss ? 'night' : 'paper', mode: boss ? 'idle' : 'walk', fill: boss ? 0.78 : 0.6 }));
  }
  const tipLabel = isCat ? 'Good vs: ' : 'Counter tip: ';
  return h(
    'a',
    {
      class: `polaroid catalog-card${seen ? '' : ' unseen'}`,
      href: `#/catalog/${id}`,
      'aria-label': `${I.name}${seen ? '' : ' (new)'}: open the Cat-alog page`,
      style: { '--tilt': `${tilt(id)}deg`, '--d': `${Math.min(1.2, n * 0.05)}s` },
    },
    [
      tape(['mint', 'peach', 'lilac', 'gold'][n % 4]),
      seen ? null : h('span', { class: 'new-sticker', text: 'NEW!' }),
      cv,
      h('h3', { text: `${I.icon} ${I.name}` }),
      I.title ? h('p', { class: 'subtitle', text: I.title }) : null,
      h('p', { class: 'bio', text: I.bio }),
      h('p', { class: 'statline' }, stats(id).slice(0, 5).map((s) => h('span', { text: s }))),
      I.quips[0] ? h('p', { class: 'quip', text: `“${I.quips[0]}”` }) : null,
      I.tip ? h('p', { class: 'counter-tip' }, [h('b', { text: tipLabel }), I.tip]) : null,
    ],
  );
}

/** @param {string[]} params */
export function render(params) {
  return params[0] ? detail(params[0]) : grid();
}

function grid() {
  /** @type {(() => void)[]} */
  let starters = [];
  const p = progress();
  const panel = h('div', { class: 'catalog-grid', role: 'tabpanel' });
  const tabBtns = TABS.map((t) => {
    const unseen = t.ids.filter((id) => !p.seen[`catalog:${id}`]).length;
    return h('button', { class: 'tab', role: 'tab', type: 'button', 'data-tab': t.id, 'aria-selected': String(t.id === currentTab) }, [
      t.label,
      h('small', { text: ` ${t.ids.length}` }),
      unseen ? h('span', { class: 'tab-dot', title: `${unseen} new`, 'aria-label': `${unseen} new` }) : null,
    ]);
  });
  let mounted = false;
  const fill = () => {
    const tab = TABS.find((t) => t.id === currentTab) ?? TABS[0];
    starters = [];
    panel.replaceChildren(...tab.ids.map((id, n) => card(id, n, starters)));
    tabBtns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab.id)));
    if (mounted) starters.forEach((f) => f());
  };
  tabBtns.forEach((b) =>
    b.addEventListener('click', () => {
      currentTab = b.dataset.tab ?? 'cats';
      fill();
    }),
  );
  const tablist = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Cat-alog sections' }, tabBtns);
  tablist.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = tabBtns.findIndex((b) => b === document.activeElement);
    if (i < 0) return;
    const nb = tabBtns[(i + (e.key === 'ArrowRight' ? 1 : tabBtns.length - 1)) % tabBtns.length];
    nb.focus();
    nb.click();
  });
  fill();
  const seenCount = TABS.flatMap((t) => t.ids).filter((id) => p.seen[`catalog:${id}`]).length;
  const total = TABS.reduce((a, t) => a + t.ids.length, 0);
  const el = h('section', { class: 'page catalog' }, [
    h('header', { class: 'page-head' }, [
      h('h1', { class: 'page-title', text: '📖 The Cat-alog' }),
      h('p', { class: 'page-sub', text: `A scrapbook of everyone involved. ${seenCount} of ${total} pages read. Click any polaroid for the full file.` }),
    ]),
    tablist,
    panel,
  ]);
  return {
    el,
    title: 'Cat-alog',
    after: () => {
      mounted = true;
      starters.forEach((f) => f());
    },
  };
}

/** @param {string} id */
function detail(id) {
  setSeen(`catalog:${id}`);
  currentTab = tabOf(id);
  const I = info(id);
  const cv = mkCanvas({ class: 'detail-canvas', role: 'img', 'aria-label': `${I.name}, large animated portrait. Click to poke.` });
  /** @type {HTMLElement[]} */
  const controls = [];
  /** @type {() => void} */
  let start = () => {};
  const tab = tabOf(id);

  if (catArt(id)) {
    const art = /** @type {import('../rigs.js').CatArt} */ (catArt(id));
    const rig = makeCat(id, 500);
    start = () =>
      catView(cv, rig, {
        bg: tab === 'heroes' ? 'night' : 'meadow',
        fill: 0.62,
        onClick: () => {
          rig.poke();
          rig.say(pick(['mrrp!', 'boop.', 'excuse me.', '!!', 'hm?']), 60, -240, 24);
          clickMeow(1 / Math.max(0.6, art.spec.scale ?? 1));
        },
      });
    controls.push(h('h4', { text: 'Expressions' }), chips('Expressions', EXPRESSIONS.map((e) => ({ id: e, label: EXPRESSION_LABELS[e] })), 'idle', (e) => rig.setExpression(/** @type {any} */ (e))));
    if (art.tiers.length > 1)
      controls.push(
        h('h4', { text: 'Upgrade looks' }),
        chips('Upgrade looks', art.tiers.map((t) => ({ id: t.id, label: t.label })), 'T1', (t) => {
          rig.tier = t;
          rig.poke();
        }),
      );
    const actions = Object.keys(art.spec.actions ?? {});
    if (actions.length)
      controls.push(
        h('h4', { text: 'Moves' }),
        h(
          'div',
          { class: 'chips' },
          actions.map((a) => {
            const hero = HERO_ART[id]?.hero;
            const label = hero?.abilities.find((x) => x.id === a)?.name ?? (a === 'attack' ? '⚔️ Attack!' : a);
            return h('button', { class: 'chip', type: 'button', text: label, onclick: () => rig.play(a) });
          }),
        ),
      );
  } else if (enemyArt(id)) {
    const rig = makeEnemy(id, 500);
    const boss = tab === 'bosses';
    start = () => {
      enemyView(cv, rig, { bg: boss ? 'night' : 'paper', mode: boss ? 'idle' : 'walk', fill: boss ? 0.8 : 0.62 });
      cv.addEventListener('click', () => rig.hit());
    };
    controls.push(
      h('h4', { text: 'Try it (or click to bonk)' }),
      chips(
        'Action',
        [
          { id: 'walk', label: '🚶 Walk' },
          { id: 'idle', label: '🧍 Idle' },
          { id: 'hit', label: '💥 Bonk' },
          { id: 'death', label: '💨 Defeat' },
        ],
        boss ? 'idle' : 'walk',
        (m) => (m === 'hit' ? rig.hit() : m === 'death' ? rig.die() : rig.setMode(/** @type {any} */ (m))),
      ),
    );
    const phases = BOSS_PHASES[id] ?? rig.spec.phases ?? [];
    if (boss && phases.length)
      controls.push(
        h('h4', { text: 'Phases' }),
        chips('Boss phase', phases.map((ph, i) => ({ id: String(i), label: `${i + 1} · ${ph}` })), '0', (ph) => {
          rig.st.phase = Number(ph);
          rig.hit();
        }),
      );
  }

  const hero = HERO_ART[id]?.hero;
  const ids = TABS.find((t) => t.id === tab)?.ids ?? [];
  const at = ids.indexOf(id);
  const prev = ids[(at + ids.length - 1) % ids.length];
  const next = ids[(at + 1) % ids.length];

  const el = h('section', { class: 'page catalog-detail' }, [
    h('nav', { class: 'crumbs', 'aria-label': 'Breadcrumb' }, [h('a', { href: '#/catalog', text: '📖 Cat-alog' }), h('span', { text: ' › ' }), h('span', { text: I.name })]),
    h('div', { class: 'detail-grid' }, [
      h('div', { class: 'detail-photo polaroid big', style: { '--tilt': `${tilt(id, 1.4)}deg` } }, [tape('peach'), cv, h('p', { class: 'polaroid-caption', text: `${I.icon} ${I.name}` })]),
      h('article', { class: 'card detail-info' }, [
        tape('mint'),
        h('h1', { class: 'page-title', text: I.name }),
        I.title ? h('p', { class: 'subtitle', text: I.title }) : null,
        I.role ? h('p', { class: 'role', text: I.role }) : null,
        h('p', { class: 'bio big', text: I.bio }),
        I.c.look ? h('p', { class: 'look' }, [h('b', { text: 'Look: ' }), I.c.look]) : null,
        hero
          ? h(
              'ul',
              { class: 'abilities' },
              [...hero.abilities.map((a) => h('li', {}, [h('kbd', { text: a.key }), h('b', { text: a.name }), h('span', { text: a.desc })])), h('li', {}, [h('span', { class: 'pill', text: 'Passive' }), h('b', { text: hero.passive.name }), h('span', { text: hero.passive.desc })])],
            )
          : null,
        h('p', { class: 'statline' }, stats(id).map((s) => h('span', { text: s }))),
        I.tip ? h('p', { class: 'counter-tip' }, [h('b', { text: catArt(id) ? 'Good vs: ' : 'Counter tip: ' }), I.tip]) : null,
        I.quips.length ? h('h4', { text: 'Overheard' }) : null,
        I.quips.length ? h('ul', { class: 'quips' }, I.quips.map((q) => h('li', { text: `“${q}”` }))) : null,
        ...controls,
      ]),
    ]),
    h('div', { class: 'go-row' }, [
      h('a', { class: 'btn', href: `#/catalog/${prev}`, text: `← ${info(prev).name}` }),
      h('a', { class: 'btn', href: '#/catalog', text: 'All entries' }),
      h('a', { class: 'btn', href: `#/catalog/${next}`, text: `${info(next).name} →` }),
    ]),
  ]);
  return { el, title: `${I.name} · Cat-alog`, after: start };
}
