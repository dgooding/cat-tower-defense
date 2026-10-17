// @ts-check
// Cat-chievements: all 30 badges with progress bars, gold stickers and unlock dates.
import { h, tape, tilt } from '../dom.js';
import { progress, counterValue } from '../store.js';
import { ACHIEVEMENTS } from '../../data/achievements.js';

export function render() {
  const p = progress();
  const done = ACHIEVEMENTS.filter((a) => p.achievements[a.id]).length;
  const fmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  const cards = ACHIEVEMENTS.map((a, n) => {
    const at = p.achievements[a.id];
    const have = Math.min(a.goal, counterValue(p, a.counter));
    const pct = at ? 100 : Math.round((have / a.goal) * 100);
    return h(
      'article',
      {
        class: `badge${at ? ' unlocked' : ''}`,
        style: { '--tilt': `${tilt(a.id, 1.6)}deg`, '--d': `${Math.min(1, n * 0.025)}s` },
        'aria-label': `${a.name}: ${a.desc} ${at ? `Unlocked ${fmt.format(at)}.` : `${have} of ${a.goal}.`}`,
      },
      [
        at ? h('span', { class: 'gold-sticker', 'aria-hidden': 'true', text: '★' }) : null,
        h('span', { class: 'badge-icon', 'aria-hidden': 'true', text: a.icon }),
        h('h3', { text: a.name }),
        h('p', { class: 'badge-desc', text: a.desc }),
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': a.goal, 'aria-valuenow': at ? a.goal : have, 'aria-label': `${a.name} progress` }, [
          h('span', { class: 'fill', style: { width: `${pct}%` } }),
        ]),
        h('p', { class: 'badge-foot' }, [
          at ? h('span', { class: 'date', text: `🗓 ${fmt.format(at)}` }) : h('span', { text: `${have.toLocaleString()} / ${a.goal.toLocaleString()}` }),
          at ? h('span', { class: 'yay', text: 'Unlocked!' }) : h('span', { text: `${pct}%` }),
        ]),
      ],
    );
  });

  const el = h('section', { class: 'page achievements' }, [
    h('header', { class: 'page-head' }, [
      h('h1', { class: 'page-title', text: '🏆 Cat-chievements' }),
      h('p', { class: 'page-sub', text: 'Thirty shiny stickers for doing cat things. Progress counts in both Quick Play and Interactive Mode.' }),
    ]),
    h('article', { class: 'card ach-summary' }, [
      tape('gold'),
      h('p', { class: 'big-count' }, [h('b', { text: done }), ` / ${ACHIEVEMENTS.length} unlocked`]),
      h('div', { class: 'bar wide', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': ACHIEVEMENTS.length, 'aria-valuenow': done, 'aria-label': 'Total Cat-chievements' }, [
        h('span', { class: 'fill', style: { width: `${(done / ACHIEVEMENTS.length) * 100}%` } }),
      ]),
      h('p', { class: 'page-sub', text: done === ACHIEVEMENTS.length ? 'All of them. The cats are… mildly impressed.' : done ? 'The cats have noticed your efforts. They are pretending not to care.' : 'No stickers yet. The fridge door awaits.' }),
    ]),
    h('div', { class: 'badge-grid' }, cards),
  ]);
  return { el, title: 'Cat-chievements' };
}
