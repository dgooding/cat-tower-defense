// @ts-check
// Credits: a slow scrolling roll over a row of napping cats, then the post-credits cucumber.
import { h, canvas as mkCanvas, tape } from '../dom.js';
import { makeView, isCalm, paperBg } from '../stage.js';
import { CAT_IDS, KITTEN_IDS, HERO_IDS, ENEMY_IDS, BOSS_IDS } from '../../art/registry.js';
import { conceptOf, makeCat, makeEnemy } from '../rigs.js';
import * as P from '../story/props.js';
import { clickMeow } from '../ui.js';

const ROLES = {
  pudding: 'as Himself',
  whiskerton: 'as The Laser Pointer',
  'granny-purl': 'as Granny (knitted her own costume)',
  'mama-mittens': 'as Mom (also craft services)',
  'dr-nip': 'as The Scientist (purely for science)',
  chonkington: 'as The Absolute Unit',
  sriracha: 'as Sriracha (hissed at the script)',
  'maneki-mochi': 'Executive Producer (paid in tips)',
};

/** @param {string} title @param {(string|[string,string])[]} rows */
const block = (title, rows) =>
  h('div', { class: 'credit-block' }, [
    h('h3', { text: title }),
    ...rows.map((r) => (Array.isArray(r) ? h('p', {}, [h('b', { text: r[0] }), h('span', { text: ` ${r[1]}` })]) : h('p', { text: r }))),
  ]);

export function render() {
  const calm = isCalm();
  const roll = h('div', { class: `roll${calm ? ' still' : ''}` }, [
    h('p', { class: 'roll-logo' }, ['Catastrophe', h('span', { class: 'bang', text: '!' })]),
    h('p', { class: 'roll-sub', text: 'The Great Snack Defense' }),
    block('Directed by', ['The Narrator (definitely not asleep)']),
    block('Starring', CAT_IDS.map((id) => /** @type {[string,string]} */ ([conceptOf(id).name, ROLES[id] ?? '']))),
    block('The Kittens', KITTEN_IDS.map((id) => conceptOf(id).name).concat(['(Tofu fell over during filming. Twice.)'])),
    block('Heroes', HERO_IDS.map((id) => conceptOf(id).name)),
    block('Household Horrors', ENEMY_IDS.map((id) => conceptOf(id).name)),
    block('Special Guest Villains', BOSS_IDS.map((id) => (id === 'great-bowl' ? `${conceptOf(id).name} (now full)` : conceptOf(id).name))),
    block('Production', [
      ['Synergy Consultant', 'Monday (left early)'],
      ['Accounts Payable', 'Overdue Bill'],
      ['Morale Officer', 'Good Boy'],
      ['Facilities', 'The Sucktator 9000 (on probation)'],
      ['Catering', 'Kibble, fish crackers, one perfect rice ball'],
      ['Wardrobe', 'Whoever keeps buying the hats'],
    ]),
    block('Legal', ['No cats were harmed in the making of this game.', 'Nobody was harmed, except a cucumber’s pride.']),
    block('Special Thanks', ['You, for playing during that meeting.', 'The Snack Stash, for being delicious.']),
    h('p', { class: 'roll-end', text: 'The cats will now nap for 14 hours. Please keep it down.' }),
  ]);

  const nappers = mkCanvas({ class: 'nap-canvas', role: 'img', 'aria-label': 'The whole cast napping on cushions. Click to fluff a pillow.' });
  const post = mkCanvas({ class: 'post-canvas', role: 'img', 'aria-label': 'Post-credits scene: a single cucumber slowly rolls in. The narrator says: no.' });
  const postWrap = h('div', { class: `post-credits${calm ? ' show' : ''}` }, [
    h('p', { class: 'eyebrow', text: 'post-credits scene' }),
    post,
    h('div', { class: 'row' }, [h('a', { class: 'btn', href: '#/story/postcredits', text: '📖 As a storybook panel' }), h('a', { class: 'btn primary', href: '#/map', text: '🗺️ Back to the map' })]),
  ]);
  const skip = h('button', { class: 'btn small ghost', type: 'button', text: '⏩ Skip to the end' });
  const win = h('div', { class: 'credits-window', tabindex: '0', 'aria-label': 'Credits (scrolling)' }, [roll]);

  let postT = -1;
  const reveal = () => {
    roll.classList.add('done');
    postWrap.classList.add('show');
    postT = 0;
    setTimeout(() => postWrap.scrollIntoView({ behavior: isCalm() ? 'auto' : 'smooth', block: 'center' }), 60);
  };
  roll.addEventListener('animationend', reveal);
  skip.addEventListener('click', reveal);

  const el = h('section', { class: 'page credits' }, [
    h('header', { class: 'page-head' }, [h('h1', { class: 'page-title', text: '🎬 Credits' }), h('p', { class: 'page-sub', text: 'Hover to pause the roll. Nobody is checking if you read them all.' })]),
    h('div', { class: 'credits-stage card' }, [tape('gold'), win, nappers, h('div', { class: 'row center' }, [skip])]),
    postWrap,
  ]);

  return {
    el,
    title: 'Credits',
    after: () => {
      // napping cast
      const cast = ['granny-purl', 'pudding', 'chonkington', 'mama-mittens', 'beans', 'whiskerton', 'dr-nip', 'sriracha', 'maneki-mochi'];
      const rigs = cast.map((id, i) => {
        const r = makeCat(id, 900 + i);
        r.setExpression('sleepy');
        return r;
      });
      nappers.addEventListener('click', (e) => {
        const r = nappers.getBoundingClientRect();
        const i = Math.max(0, Math.min(rigs.length - 1, Math.floor(((e.clientX - r.left) / r.width) * rigs.length)));
        rigs[i].poke();
        rigs[i].say('zzz?', 40, -220, 26);
        clickMeow(0.9);
      });
      makeView(nappers, (v, dt, t) => {
        const { ctx } = v;
        ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, v.h);
        g.addColorStop(0, '#262A5C');
        g.addColorStop(1, '#4A4590');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, v.w, v.h);
        ctx.fillStyle = '#FFE58A';
        for (let i = 0; i < 30; i++) {
          ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t + i * 1.7));
          ctx.fillRect((i * 97.3) % v.w, (i * 31.7) % (v.h * 0.45), 2, 2);
        }
        ctx.globalAlpha = 1;
        const slot = v.w / rigs.length;
        const s = Math.min(slot / 260, (v.h * 0.6) / 250);
        rigs.forEach((r, i) => {
          r.update(dt, null);
          const x = slot * (i + 0.5);
          const y = v.h * 0.9;
          const k = r.spec.scale ?? 1;
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(s, s);
          P.cushion(ctx, 0, 0, 0.9, t, isCalm(), i % 2 ? '#D9CCF2' : undefined, i % 2 ? '#A898D0' : undefined);
          ctx.translate(0, -18);
          ctx.scale(k, k);
          r.draw(ctx, s * k, { reducedMotion: isCalm() });
          ctx.restore();
          if (!isCalm() && i % 2 === 0) {
            ctx.save();
            ctx.translate(x + 10 * s, y - 180 * s * k);
            ctx.scale(s * 1.6, s * 1.6);
            P.zzz(ctx, 0, 0, t + i * 0.4, 22);
            ctx.restore();
          }
        });
      });

      // post-credits cucumber
      const cuke = makeEnemy('cucumber-cadet', 4242);
      cuke.setMode('idle');
      if (calm) postT = 7.6;
      makeView(post, (v, dt) => {
        const { ctx } = v;
        ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
        paperBg(ctx, v.w, v.h, '#F4EAD6');
        if (postT < 0) return;
        if (!isCalm()) postT += dt;
        cuke.update(dt, null);
        const H = cuke.spec.height ?? 180;
        const s = (v.h * 0.5) / H;
        const e = Math.min(1, postT / 6);
        const k = 1 - Math.pow(1 - e, 3);
        const x = -v.w * 0.2 + (v.w * 0.7) * k;
        const rot = -(1 - k) * Math.PI * 5;
        ctx.fillStyle = 'rgba(59,58,74,0.12)';
        ctx.fillRect(0, v.h * 0.84, v.w, 2);
        ctx.save();
        ctx.translate(x, v.h * 0.84 - (H * s) / 2);
        ctx.rotate(rot);
        ctx.translate(0, (H * s) / 2);
        ctx.scale(s, s);
        cuke.draw(ctx, s, { reducedMotion: isCalm() });
        ctx.restore();
        if (postT > 6.6) {
          const a = Math.min(1, (postT - 6.6) / 0.8);
          ctx.save();
          ctx.globalAlpha = a;
          ctx.fillStyle = '#3B3A4A';
          ctx.font = `700 ${Math.round(v.h * 0.14)}px Fredoka, "Arial Rounded MT Bold", sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('…no.', v.w * 0.72, v.h * 0.32);
          ctx.restore();
        }
        if (postT > 9) {
          ctx.fillStyle = `rgba(59,58,74,${Math.min(0.85, (postT - 9) / 2)})`;
          ctx.fillRect(0, 0, v.w, v.h);
        }
      });
    },
  };
}
