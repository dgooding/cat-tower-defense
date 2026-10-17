// @ts-check
// Wardrobe: pick a cat or hero, try on every hat live, buy hats with paw prints, equip per cat.
import { h, canvas as mkCanvas, tape } from '../dom.js';
import { progress, pawPrints, buyHat, equipHat, onChange } from '../store.js';
import { CAT_IDS, HERO_IDS } from '../../art/registry.js';
import { HATS, makeCat, catView, conceptOf, hatExtra, pick } from '../rigs.js';
import { POOR_LINES } from '../lore.js';
import { toast, clickMeow } from '../ui.js';

/** @typedef {import('../stage.js').View} View */

const WEARERS = [...CAT_IDS, ...HERO_IDS];
let lastWearer = 'pudding';

/** @param {string[]} params */
export function guard(params) {
  return params[0] && !WEARERS.includes(params[0]) ? '#/wardrobe' : null;
}

/** @param {string} name */
const shortName = (name) => name.replace('Professor ', 'Prof. ').replace('Lord ', '').replace(' III', '');

/** @param {string[]} params */
export function render(params) {
  let who = params[0] ?? lastWearer;
  lastWearer = who;
  const hatIds = Object.keys(HATS);
  /** @type {string|null} */
  let trying = progress().hats.equipped[who] ?? null;
  let mounted = false;

  const big = mkCanvas({ class: 'wardrobe-canvas', role: 'img', 'aria-label': 'Wardrobe mirror: your cat, live. Click to admire.' });
  let rig = makeCat(who, 700);
  /** @type {View|null} */
  let bigView = null;
  /** @type {View[]} */
  let thumbViews = [];
  /** @type {(() => void)[]} */
  let pendingThumbs = [];

  const nameEl = h('h2', { class: 'mirror-name' });
  const wearing = h('p', { class: 'mirror-sub' });
  const paws = h('span', { class: 'sticker pink big-paws' });

  const mountBig = () => {
    bigView?.dispose();
    bigView = catView(big, rig, { bg: 'blush', fill: 0.58, ground: 0.9 });
  };
  big.addEventListener('click', () => {
    rig.poke();
    rig.say(pick(['très chic.', 'mrrp!', 'is it me?', 'fabulous.', 'I know.']), 60, -280, 24);
    clickMeow(1);
  });

  const whoChips = h(
    'div',
    { class: 'wearers chips', role: 'radiogroup', 'aria-label': 'Who is trying on hats?' },
    WEARERS.map((id) => h('button', { class: 'chip wearer', type: 'button', role: 'radio', 'data-id': id, 'aria-checked': String(id === who) })),
  );

  const hatGrid = h('div', { class: 'hat-grid' });

  const syncMirror = () => {
    const p = progress();
    const eq = p.hats.equipped[who] ?? null;
    nameEl.textContent = conceptOf(who).name;
    wearing.textContent = trying ? `${trying === eq ? 'Wearing' : 'Trying on'}: ${HATS[trying]?.name ?? trying}` : 'Hatless. Distinguished, even.';
    rig.extra = hatExtra(trying);
    paws.textContent = `🐾 ${pawPrints(p).available} paw prints to spend`;
  };

  function syncChips() {
    const eq = progress().hats.equipped;
    whoChips.querySelectorAll('.wearer').forEach((b) => {
      const id = /** @type {HTMLElement} */ (b).dataset.id ?? '';
      const c = conceptOf(id);
      b.textContent = `${c.icon} ${shortName(c.name)}${eq[id] ? ' 🎩' : ''}`;
    });
  }

  const renderHats = () => {
    const p = progress();
    const have = pawPrints(p).available;
    const eq = p.hats.equipped[who] ?? null;
    thumbViews.forEach((v) => v.dispose());
    thumbViews = [];
    pendingThumbs = [];
    hatGrid.replaceChildren(
      ...hatIds.map((hid, n) => {
        const hat = HATS[hid];
        const owned = p.hats.owned.includes(hid);
        const on = eq === hid;
        const cv = mkCanvas({ class: 'hat-canvas', role: 'img', 'aria-label': `${conceptOf(who).name} wearing the ${hat.name}. Click to try on.` });
        const trig = makeCat(who, 720 + n);
        trig.extra = hatExtra(hid);
        pendingThumbs.push(() => thumbViews.push(catView(cv, trig, { bg: 'paper', fill: 0.6, ground: 0.92 })));
        /** @type {HTMLElement[]} */
        const actions = [];
        if (!owned)
          actions.push(
            h('button', {
              class: `btn primary small${have < hat.cost ? ' poor' : ''}`,
              type: 'button',
              text: `Buy · 🐾 ${hat.cost}`,
              onclick: (/** @type {MouseEvent} */ e) => buy(hid, /** @type {HTMLElement} */ (e.currentTarget)),
            }),
          );
        else if (on) actions.push(h('button', { class: 'btn small', type: 'button', text: 'Take off', onclick: () => equip(null) }));
        else actions.push(h('button', { class: 'btn primary small', type: 'button', text: 'Wear it', onclick: () => equip(hid) }));
        actions.push(
          h('button', {
            class: 'btn small ghost',
            type: 'button',
            'aria-pressed': String(trying === hid),
            text: trying === hid ? '👀 Trying on' : '🪞 Try on',
            onclick: () => tryOn(trying === hid ? eq : hid),
          }),
        );
        cv.addEventListener('click', () => {
          trig.poke();
          tryOn(hid);
        });
        return h('article', { class: `hat-card${owned ? ' owned' : ''}${on ? ' on' : ''}${trying === hid ? ' trying' : ''}`, style: { '--d': `${n * 0.05}s` } }, [
          on ? h('span', { class: 'stamp good', text: 'WEARING' }) : owned ? h('span', { class: 'stamp owned', text: 'OWNED' }) : h('span', { class: 'stamp price', text: `🐾 ${hat.cost}` }),
          cv,
          h('h3', { text: hat.name }),
          h('p', { class: 'bio', text: hat.blurb }),
          h('div', { class: 'row' }, actions),
        ]);
      }),
    );
    if (!hatIds.length) hatGrid.append(h('p', { class: 'page-sub', text: 'The hat delivery is running late. Check back after the next art pass.' }));
    if (mounted) pendingThumbs.splice(0).forEach((f) => f());
  };

  /** @param {string|null} hid */
  function tryOn(hid) {
    trying = hid;
    rig.poke();
    renderHats();
    syncMirror();
  }

  /** @param {string} hid @param {HTMLElement} btn */
  function buy(hid, btn) {
    const hat = HATS[hid];
    const r = buyHat(hid, hat.cost);
    if (!r.ok) {
      if (r.reason === 'poor') {
        btn.classList.remove('wiggle');
        void btn.offsetWidth;
        btn.classList.add('wiggle');
        rig.setExpression('sad');
        setTimeout(() => rig.setExpression('idle'), 1600);
        toast(pick(POOR_LINES).replace('%n', String(r.short)), { icon: '🐾', kind: 'pink', title: 'Not enough paw prints' });
      }
      return;
    }
    equipHat(who, hid);
    trying = hid;
    rig.setExpression('celebrate');
    setTimeout(() => rig.setExpression('idle'), 1800);
    clickMeow(1.1);
    toast(`${conceptOf(who).name} is now wearing the ${hat.name}. Fabulous.`, { icon: '🎩', kind: 'gold', title: 'Purchased!' });
    renderHats();
    syncMirror();
    syncChips();
  }

  /** @param {string|null} hid */
  function equip(hid) {
    equipHat(who, hid);
    trying = hid;
    rig.poke();
    rig.setExpression(hid ? 'smug' : 'idle');
    renderHats();
    syncMirror();
    syncChips();
  }

  whoChips.querySelectorAll('.wearer').forEach((b) =>
    b.addEventListener('click', () => {
      who = /** @type {HTMLElement} */ (b).dataset.id ?? 'pudding';
      lastWearer = who;
      whoChips.querySelectorAll('.wearer').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      trying = progress().hats.equipped[who] ?? null;
      rig = makeCat(who, 700);
      history.replaceState(null, '', `${location.pathname}${location.search}#/wardrobe/${who}`);
      renderHats();
      syncMirror();
      if (mounted) mountBig();
    }),
  );

  syncChips();
  renderHats();
  syncMirror();
  const off = onChange(syncMirror);

  const el = h('section', { class: 'page wardrobe' }, [
    h('header', { class: 'page-head' }, [
      h('h1', { class: 'page-title', text: '🎩 The Wardrobe' }),
      h('p', { class: 'page-sub', text: 'Spend paw prints on hats. Hats are purely cosmetic. The cats strongly disagree.' }),
    ]),
    whoChips,
    h('div', { class: 'wardrobe-grid' }, [h('div', { class: 'mirror card' }, [tape('lilac'), big, nameEl, wearing, paws]), hatGrid]),
  ]);

  return {
    el,
    title: 'Wardrobe',
    cleanup: off,
    after: () => {
      mounted = true;
      mountBig();
      pendingThumbs.splice(0).forEach((f) => f());
    },
  };
}
