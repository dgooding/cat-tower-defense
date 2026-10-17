// @ts-check
// Storybook script: every sequence, panel, caption and pose. Captions follow the plan (Part 8.1);
// the narrator is deadpan and definitely not asleep.
import * as P from './props.js';

/**
 * @typedef {Object} Actor
 * @property {string} [cat] cat/kitten/hero id @property {string} [enemy] enemy or boss id
 * @property {number} x @property {number} y feet position on the 1600×900 stage
 * @property {number} [s] cat scale (1 ≈ 250px tall) @property {number} [h] enemy height in px
 * @property {string} [expr] starting expression @property {boolean} [flip] face left
 * @property {'walk'|'idle'} [mode] enemy mode @property {number} [phase] boss phase
 * @property {{dx?:number, dy?:number, dur?:number, delay?:number}} [enter] slide in from an offset
 * @property {{dx:number, dy?:number, dur:number, delay?:number}} [move] drift by an offset
 * @property {{dx:number, dur:number, delay?:number, turns:number}} [roll] roll in from the left, spinning
 * @property {[number, string][]} [exprAt] timed expression changes
 * @property {[number, string][]} [doAt] timed actions: 'poke' | 'hit' | 'die' | an action name
 * @property {number} [alpha] @property {number} [z] draw-order nudge
 * @property {boolean} [cushion] sit on a nap cushion
 */
/**
 * @typedef {(ctx:CanvasRenderingContext2D, t:number, calm:boolean) => void} Draw
 * @typedef {{text:string, x:number, y:number, size?:number, at?:number, rot?:number, color?:string}} Sfx
 * @typedef {Object} Panel
 * @property {string} text caption
 * @property {string|null} [room] room id for the painted background (null = plain paper)
 * @property {number} [light] 0 morning … 1 night @property {number} [layout]
 * @property {number} [bgAlpha] background opacity (default 0.62)
 * @property {string} [wash] full-stage tint drawn over the background
 * @property {Actor[]} [actors] @property {Draw} [under] @property {Draw} [over]
 * @property {Sfx[]} [sfx] @property {number} [textAt] seconds before the caption starts typing
 */
/** @typedef {{id:string, title:string, then:string, panels:Panel[]}} Sequence */

const NIGHT = 'rgba(38,42,92,0.22)';

/** @type {Record<string, Sequence>} */
export const SEQUENCES = {
  prologue: {
    id: 'prologue',
    title: 'Prologue',
    then: '#/map',
    panels: [
      {
        text: 'In a sleepy village, the cats had perfected life. Nap. Snack. Nap. Judge. Nap.',
        room: 'countryside',
        light: 0.15,
        actors: [
          { cat: 'granny-purl', x: 290, y: 770, s: 0.9, expr: 'sleepy', cushion: true },
          { cat: 'pudding', x: 610, y: 800, s: 1.0, expr: 'sleepy', cushion: true },
          { cat: 'chonkington', x: 960, y: 790, s: 1.1, expr: 'smug', cushion: true },
          { cat: 'mama-mittens', x: 1270, y: 790, s: 0.95, expr: 'idle' },
          { cat: 'beans', x: 1450, y: 810, s: 1.25, expr: 'happy', doAt: [[1.5, 'poke'], [3.2, 'poke']] },
        ],
        over: (c, t) => {
          P.zzz(c, 340, 540, t);
          P.zzz(c, 660, 560, t + 0.5);
        },
      },
      {
        text: 'Then one morning… the bowl was empty.',
        room: 'house',
        light: 0.3,
        actors: [
          { cat: 'granny-purl', x: 250, y: 780, s: 0.85, exprAt: [[1.25, 'startled']] },
          { cat: 'pudding', x: 480, y: 800, s: 1.0, exprAt: [[1.0, 'startled']] },
          { cat: 'sriracha', x: 1120, y: 810, s: 0.9, exprAt: [[1.1, 'startled']] },
          { cat: 'chonkington', x: 1370, y: 790, s: 1.05, exprAt: [[1.5, 'sad']] },
        ],
        under: (c, t, calm) => P.bowl(c, 800, 800, 1.35, 0, t, calm),
        sfx: [
          { text: '!', x: 500, y: 470, size: 80, at: 1.0, color: '#D2483C' },
          { text: '!!', x: 1130, y: 540, size: 70, at: 1.1, color: '#D2483C' },
          { text: '…', x: 800, y: 560, size: 60, at: 2.0 },
        ],
      },
      {
        text: 'In the sky rose The Great Empty Bowl, and with it, an army of household horrors.',
        room: 'sky',
        light: 0.95,
        wash: NIGHT,
        actors: [
          { enemy: 'great-bowl', x: 1080, y: 640, h: 540, mode: 'idle', enter: { dy: 360, dur: 3.4 } },
          { enemy: 'vroomba', x: 200, y: 870, h: 110, mode: 'walk', move: { dx: 180, dur: 8 } },
          { enemy: 'rubber-duckie', x: 360, y: 875, h: 80, mode: 'walk', move: { dx: 180, dur: 8 } },
          { enemy: 'cucumber-cadet', x: 500, y: 865, h: 170, mode: 'walk', move: { dx: 180, dur: 8 } },
          { enemy: 'spritz', x: 660, y: 870, h: 150, mode: 'walk', move: { dx: 180, dur: 8 } },
        ],
      },
      {
        text: 'A cucumber appeared behind Pudding.',
        room: 'countryside',
        light: 0.45,
        actors: [
          { enemy: 'cucumber-cadet', x: 620, y: 800, h: 230, mode: 'idle', enter: { dx: -320, dur: 1.4, delay: 0.1 } },
          { cat: 'pudding', x: 980, y: 810, s: 1.35, exprAt: [[1.9, 'startled']], doAt: [[1.9, 'poke']] },
        ],
        sfx: [{ text: 'SKREEE!', x: 1120, y: 330, size: 110, at: 1.9, rot: -0.12, color: '#D2483C' }],
      },
      {
        text: 'The cats held an emergency meeting. It lasted four minutes. Three of those were a nap.',
        room: 'house',
        light: 0.55,
        under: (c, t, calm) => P.whiteboard(c, 110, 180, ['AGENDA', '1. Snacks', '2. Defend snacks', '3. Nap', '4. See item 3'], t, calm),
        actors: [
          { cat: 'whiskerton', x: 560, y: 760, s: 0.85, expr: 'focused' },
          { cat: 'pudding', x: 760, y: 720, s: 0.82, expr: 'sleepy' },
          { cat: 'granny-purl', x: 930, y: 720, s: 0.78, expr: 'sleepy' },
          { cat: 'chonkington', x: 1110, y: 725, s: 0.9, expr: 'sleepy' },
          { cat: 'dr-nip', x: 1310, y: 720, s: 0.8, expr: 'vibing' },
        ],
        over: (c, t, calm) => {
          P.kotatsu(c, 1030, 880, 640, t, calm);
          P.zzz(c, 800, 500, t);
          P.zzz(c, 1150, 490, t + 0.7);
          if (t > 1.8) P.bubble(c, 640, 400, 'Any questions?', 590, 470, 30);
        },
      },
      {
        text: 'They would defend The Snack Stash. Right after five more minutes.',
        room: 'countryside',
        light: 0.85,
        under: (c, t, calm) => P.stash(c, 800, 720, 1.5, t, calm),
        actors: [
          { cat: 'sriracha', x: 220, y: 800, s: 0.88, expr: 'focused' },
          { cat: 'mama-mittens', x: 400, y: 790, s: 0.98, expr: 'focused' },
          { cat: 'whiskerton', x: 1120, y: 790, s: 0.95, expr: 'smug' },
          { cat: 'maneki-mochi', x: 1290, y: 800, s: 0.95, expr: 'happy' },
          { cat: 'chonkington', x: 1465, y: 810, s: 1.05, expr: 'focused' },
          { cat: 'pudding', x: 580, y: 895, s: 0.8, expr: 'sleepy', cushion: true, z: 100 },
        ],
        over: (c, t) => {
          P.zzz(c, 620, 690, t);
          P.fxText(c, '(five more minutes)', 790, 862, 28, '#6B6A7C', Math.min(1, Math.max(0.35, t - 1.2)));
        },
      },
    ],
  },

  'world-countryside': {
    id: 'world-countryside',
    title: 'World 1 · Sunbeam Countryside',
    then: '#/map',
    panels: [
      {
        text: 'Sunbeam Countryside. Population: several cats, one shrine, zero cucumbers. As of this morning.',
        room: 'countryside',
        light: 0.2,
        actors: [
          { cat: 'granny-purl', x: 270, y: 790, s: 0.9, expr: 'sleepy', cushion: true },
          { cat: 'pudding', x: 560, y: 810, s: 1.05, expr: 'happy', exprAt: [[2.4, 'startled']] },
          { enemy: 'cucumber-cadet', x: 1260, y: 810, h: 170, mode: 'walk', flip: true, move: { dx: -260, dur: 6 } },
          { enemy: 'rubber-duckie', x: 1420, y: 820, h: 80, mode: 'walk', flip: true, move: { dx: -260, dur: 6 } },
          { enemy: 'rubber-duckie', x: 1520, y: 830, h: 75, mode: 'walk', flip: true, move: { dx: -260, dur: 6 } },
        ],
        over: (c, t) => P.zzz(c, 320, 560, t),
        sfx: [{ text: 'squeak.', x: 1480, y: 650, size: 40, at: 1.4 }],
      },
      {
        text: 'Grandpa’s cucumber patch had been quiet for years. Now it had a pickle in a trench coat, a hose with opinions, and a very excited dog.',
        room: 'countryside',
        light: 0.45,
        actors: [
          { enemy: 'sneaky-pickle', x: 380, y: 800, h: 200, mode: 'idle', alpha: 0.55 },
          { enemy: 'hose-snek', x: 820, y: 820, h: 170, mode: 'walk', move: { dx: 60, dur: 6 } },
          { enemy: 'good-boy', x: 1260, y: 830, h: 220, mode: 'idle' },
        ],
        sfx: [
          { text: 'you saw nothing.', x: 380, y: 540, size: 32, at: 1.2, color: '#6B6A7C' },
          { text: 'FRIEND!!', x: 1280, y: 520, size: 56, at: 2.2, rot: 0.08, color: '#D9843E' },
        ],
      },
      {
        text: 'Up at the shrine, a cape fluttered. Nobody in this village owns a cape.',
        room: 'countryside',
        light: 1,
        wash: NIGHT,
        actors: [
          { cat: 'pudding', x: 380, y: 820, s: 1.1, expr: 'focused' },
          { cat: 'sriracha', x: 600, y: 830, s: 0.85, expr: 'focused' },
          { enemy: 'cucumberto', x: 1130, y: 820, h: 440, mode: 'idle', flip: true, enter: { dx: 260, dur: 2 } },
        ],
        sfx: [{ text: 'bleh.', x: 1180, y: 330, size: 54, at: 2.4, rot: -0.06, color: '#5E9A4E' }],
      },
    ],
  },

  'world-house': {
    id: 'world-house',
    title: "World 2 · Grandma's Cozy House",
    then: '#/map',
    panels: [
      {
        text: 'Grandma’s Cozy House. Warm tatami. Hot tea. A kotatsu so cozy it has its own gravity.',
        room: 'house',
        light: 0.3,
        actors: [
          { cat: 'mama-mittens', x: 330, y: 810, s: 1.0, expr: 'happy' },
          { cat: 'chonkington', x: 820, y: 740, s: 1.05, expr: 'sleepy' },
          { cat: 'noodle', x: 1300, y: 820, s: 1.3, expr: 'vibing' },
        ],
        over: (c, t, calm) => {
          P.kotatsu(c, 820, 900, 620, t, calm);
          P.zzz(c, 880, 500, t);
        },
      },
      {
        text: 'Then came Spritz. Nobody was on the counter. Allegedly.',
        room: 'house',
        light: 0.5,
        actors: [
          { cat: 'pudding', x: 560, y: 810, s: 1.1, exprAt: [[1.3, 'wet']], doAt: [[1.3, 'poke']] },
          { enemy: 'spritz', x: 1060, y: 810, h: 230, mode: 'idle', flip: true, doAt: [[1.2, 'hit']] },
          { enemy: 'cone-of-shame', x: 1400, y: 820, h: 170, mode: 'walk', flip: true, move: { dx: -120, dur: 6 } },
        ],
        sfx: [{ text: 'pssht!', x: 830, y: 520, size: 64, at: 1.2, rot: -0.1, color: '#3B6EA8' }],
      },
      {
        text: 'From the hall closet came a hum. Then a monobrow. The Sucktator 9000 demanded TIDINESS.',
        room: 'house',
        light: 0.75,
        actors: [
          { cat: 'granny-purl', x: 330, y: 810, s: 0.95, exprAt: [[0.9, 'startled']] },
          { cat: 'dr-nip', x: 560, y: 815, s: 0.9, exprAt: [[1.1, 'startled']] },
          { enemy: 'sucktator', x: 1110, y: 830, h: 470, mode: 'idle', flip: true, enter: { dx: 200, dur: 2.2 } },
        ],
        sfx: [{ text: 'VRRRMMM…', x: 1100, y: 300, size: 64, at: 0.7, rot: 0.05, color: '#6B6A7C' }],
      },
    ],
  },

  'world-bathhouse': {
    id: 'world-bathhouse',
    title: 'World 3 · Rainy Bathhouse Town',
    then: '#/map',
    panels: [
      {
        text: 'Rainy Bathhouse Town. The lanterns glow, the rain falls, and the cats stay exactly where it is dry.',
        room: 'bathhouse',
        light: 0.6,
        actors: [
          { cat: 'maneki-mochi', x: 640, y: 800, s: 1.0, expr: 'smug' },
          { cat: 'whiskerton', x: 880, y: 800, s: 0.95, expr: 'idle' },
          { cat: 'sriracha', x: 1250, y: 820, s: 0.85, expr: 'wet' },
        ],
        over: (c, t, calm) => {
          P.lanterns(c, [{ x: 220, y: 200 }, { x: 520, y: 170 }, { x: 1080, y: 180 }, { x: 1400, y: 210 }], t, calm);
          if (!calm) P.rain(c, t);
        },
      },
      {
        text: 'Umbrella Uncles tipped their brollies. Tubby McSoak offered bubbles. Everyone declined. Firmly.',
        room: 'bathhouse',
        light: 0.7,
        actors: [
          { enemy: 'umbrella-uncles', x: 460, y: 810, h: 230, mode: 'idle' },
          { enemy: 'tubby-mcsoak', x: 960, y: 830, h: 240, mode: 'idle' },
          { cat: 'chonkington', x: 1380, y: 820, s: 1.0, expr: 'wet', flip: true },
        ],
        over: (c, t, calm) => {
          if (!calm) P.rain(c, t, 0.35);
          if (t > 1.6) P.bubble(c, 1380, 470, 'No.', 1360, 540, 34);
        },
      },
      {
        text: 'And from the deep end, something enormous wanted to schedule a bath.',
        room: 'bathhouse',
        light: 1,
        wash: NIGHT,
        actors: [
          { cat: 'mama-mittens', x: 300, y: 830, s: 0.95, exprAt: [[1.4, 'startled']] },
          { cat: 'beans', x: 450, y: 850, s: 1.2, exprAt: [[1.5, 'startled']] },
          { enemy: 'bathzilla', x: 1020, y: 880, h: 580, mode: 'idle', enter: { dy: 320, dur: 3 } },
        ],
        over: (c, t, calm) => {
          if (!calm) P.rain(c, t);
        },
        sfx: [{ text: 'BATH. TIME.', x: 1040, y: 220, size: 72, at: 3, color: '#24505E' }],
      },
    ],
  },

  'world-sky': {
    id: 'world-sky',
    title: 'World 4 · Moonlit Sky Islands',
    then: '#/map',
    panels: [
      {
        text: 'Above the clouds, the Sky Islands float on nothing but good vibes and one very large whale.',
        room: 'sky',
        light: 0.5,
        actors: [
          { cat: 'pudding', x: 320, y: 610, s: 0.75, expr: 'happy' },
          { cat: 'granny-purl', x: 1290, y: 660, s: 0.68, expr: 'sleepy' },
        ],
        under: (c, t, calm) => {
          P.island(c, 320, 610, 300, t, calm);
          P.island(c, 1290, 660, 260, t, calm);
        },
      },
      {
        text: 'Monday arrived. Then an Overdue Bill. The cats had not even had their coffee. Cats do not drink coffee. Still.',
        room: 'sky',
        light: 0.7,
        actors: [
          { enemy: 'thunderclap', x: 280, y: 360, h: 150, mode: 'idle' },
          { enemy: 'monday', x: 560, y: 820, h: 210, mode: 'walk', move: { dx: 80, dur: 6 } },
          { enemy: 'overdue-bill', x: 920, y: 820, h: 170, mode: 'walk', move: { dx: 80, dur: 6 } },
          { enemy: 'party-pooper', x: 1180, y: 520, h: 180, mode: 'idle' },
          { cat: 'whiskerton', x: 1420, y: 830, s: 0.9, expr: 'sad', flip: true },
        ],
        sfx: [
          { text: 'Per my last email…', x: 560, y: 520, size: 34, at: 1.2, color: '#6B6A7C' },
          { text: 'FINAL NOTICE', x: 930, y: 560, size: 40, at: 2.2, rot: -0.08, color: '#D2483C' },
        ],
      },
      {
        text: 'The moon flickered. It was not the moon. It was a bowl. And it was very, very hungry.',
        room: 'sky',
        light: 1,
        wash: NIGHT,
        actors: [
          { enemy: 'great-bowl', x: 800, y: 640, h: 520, mode: 'idle', enter: { dy: 140, dur: 2.6 } },
          { cat: 'pudding', x: 300, y: 900, s: 1.0, exprAt: [[2.2, 'startled']] },
          { cat: 'chonkington', x: 1320, y: 900, s: 1.1, exprAt: [[2.4, 'startled']], flip: true },
        ],
      },
    ],
  },

  ending: {
    id: 'ending',
    title: 'Ending',
    then: '#/credits',
    panels: [
      {
        text: 'The Great Empty Bowl wobbled. It creaked. It let out one long, sad “dinner…”',
        room: 'sky',
        light: 1,
        wash: NIGHT,
        actors: [
          { enemy: 'great-bowl', x: 960, y: 640, h: 520, mode: 'idle', phase: 2, doAt: [[1.0, 'hit'], [2.2, 'hit']] },
          { cat: 'pudding', x: 260, y: 880, s: 0.95, expr: 'focused' },
          { cat: 'sriracha', x: 440, y: 890, s: 0.82, expr: 'focused' },
          { cat: 'whiskerton', x: 600, y: 880, s: 0.88, expr: 'focused' },
        ],
        sfx: [{ text: 'dinner…', x: 980, y: 200, size: 56, at: 2.6, color: '#C9D3E8' }],
      },
      {
        text: 'Then Maneki Mochi had an idea. A business idea.',
        room: 'sky',
        light: 0.8,
        actors: [
          { cat: 'pudding', x: 420, y: 820, s: 0.9, expr: 'idle' },
          { cat: 'maneki-mochi', x: 800, y: 810, s: 1.3, expr: 'smug' },
          { cat: 'granny-purl', x: 1180, y: 820, s: 0.88, expr: 'idle' },
        ],
        over: (c, t) => {
          P.sparkles(c, 800, 420, 140, t);
          if (t > 1.2) P.bubble(c, 1000, 330, 'Hear me out.', 900, 400, 34);
        },
      },
      {
        text: 'Every cat chipped in one treat. Except Chonkington, who chipped in four. Then ate three.',
        room: 'countryside',
        light: 0.85,
        actors: [
          { cat: 'mama-mittens', x: 230, y: 810, s: 0.9, expr: 'happy' },
          { cat: 'pudding', x: 450, y: 820, s: 1.0, expr: 'happy' },
          { cat: 'chonkington', x: 1260, y: 810, s: 1.15, expr: 'smug', flip: true },
        ],
        under: (c, t, calm) => P.bowl(c, 820, 820, 1.3, Math.min(0.45, t * 0.08), t, calm),
        over: (c, t) => {
          for (let i = 0; i < 6; i++) {
            const k = ((t * 0.5 + i / 6) % 1);
            const fromX = i % 2 ? 450 : 1260;
            const x = fromX + (820 - fromX) * k;
            const y = 600 - Math.sin(k * Math.PI) * 220 + k * 120;
            P.treat(c, x, y, 1.1, t * 3 + i);
          }
          P.fxText(c, 'nom.', 1300, 520, 40, '#6B6A7C', Math.max(0, Math.min(1, t - 2)));
        },
      },
      {
        text: 'The bowl was… full.',
        room: 'sky',
        light: 0.85,
        actors: [
          { cat: 'pudding', x: 300, y: 830, s: 1.0, expr: 'celebrate' },
          { cat: 'sriracha', x: 1300, y: 840, s: 0.85, expr: 'celebrate' },
          { cat: 'maneki-mochi', x: 1470, y: 830, s: 0.9, expr: 'celebrate', flip: true },
        ],
        under: (c, t, calm) => P.bowl(c, 800, 800, 2.0, 1, t, calm),
        over: (c, t, calm) => {
          P.sparkles(c, 800, 560, 260, t, '#FFE58A', 12);
          if (!calm) P.confetti(c, t, 50);
        },
        textAt: 0.8,
      },
      {
        text: 'Even the cucumbers stayed for dinner. They sat very, very far away.',
        room: 'countryside',
        light: 0.7,
        under: (c, t, calm) => P.stash(c, 560, 760, 1.2, t, calm),
        actors: [
          { cat: 'pudding', x: 300, y: 840, s: 0.95, expr: 'happy' },
          { cat: 'granny-purl', x: 780, y: 840, s: 0.88, expr: 'happy' },
          { enemy: 'cucumber-cadet', x: 1330, y: 700, h: 95, mode: 'idle', flip: true },
          { enemy: 'cucumber-cadet', x: 1430, y: 705, h: 92, mode: 'idle', flip: true },
          { enemy: 'cucumber-cadet', x: 1520, y: 698, h: 88, mode: 'idle', flip: true },
        ],
        over: (c, t) => {
          if (t > 1.6) P.bubble(c, 1360, 530, '…pass the salt?', 1340, 590, 26);
        },
      },
      {
        text: 'The Good Boy brought the ball. Nobody threw it. He was happy anyway.',
        room: 'house',
        light: 0.4,
        actors: [
          { cat: 'whiskerton', x: 420, y: 820, s: 0.95, expr: 'smug' },
          { cat: 'sriracha', x: 640, y: 830, s: 0.85, expr: 'focused' },
          { enemy: 'good-boy', x: 1100, y: 830, h: 260, mode: 'idle', flip: true },
        ],
        under: (c) => {
          c.fillStyle = '#D9E86A';
          c.strokeStyle = '#3B3A4A';
          c.lineWidth = 4;
          c.beginPath();
          c.arc(860, 812, 26, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          c.strokeStyle = '#FFFDF6';
          c.beginPath();
          c.arc(846, 812, 22, -1.1, 1.1);
          c.stroke();
        },
        sfx: [{ text: '♥', x: 1150, y: 500, size: 64, at: 1.2, color: '#E07D95' }],
      },
      {
        text: 'The Snack Stash was safe. Synergy was achieved. Nobody knows what that means.',
        room: 'countryside',
        light: 0.6,
        under: (c, t, calm) => P.stash(c, 800, 660, 1.3, t, calm),
        actors: [
          { cat: 'sriracha', x: 160, y: 860, s: 0.72, expr: 'celebrate' },
          { cat: 'whiskerton', x: 340, y: 860, s: 0.72, expr: 'happy' },
          { cat: 'granny-purl', x: 520, y: 860, s: 0.72, expr: 'happy' },
          { cat: 'pudding', x: 700, y: 870, s: 0.76, expr: 'celebrate' },
          { cat: 'mama-mittens', x: 890, y: 870, s: 0.74, expr: 'happy' },
          { cat: 'dr-nip', x: 1070, y: 860, s: 0.72, expr: 'vibing' },
          { cat: 'maneki-mochi', x: 1250, y: 860, s: 0.72, expr: 'celebrate' },
          { cat: 'chonkington', x: 1440, y: 865, s: 0.8, expr: 'smug' },
        ],
        over: (c, t, calm) => {
          if (!calm) P.confetti(c, t, 40);
        },
      },
      {
        text: 'And then, at last, everyone took a nap. A long one. This one counts.',
        room: 'sky',
        light: 1,
        wash: 'rgba(38,42,92,0.3)',
        under: (c, t) => P.starfield(c, t, 40, 420),
        actors: [
          { cat: 'granny-purl', x: 180, y: 820, s: 0.72, expr: 'sleepy', cushion: true },
          { cat: 'pudding', x: 400, y: 830, s: 0.76, expr: 'sleepy', cushion: true },
          { cat: 'chonkington', x: 640, y: 830, s: 0.82, expr: 'sleepy', cushion: true },
          { cat: 'mama-mittens', x: 880, y: 830, s: 0.74, expr: 'sleepy', cushion: true },
          { cat: 'tofu', x: 990, y: 860, s: 1.0, expr: 'sleepy' },
          { cat: 'whiskerton', x: 1150, y: 830, s: 0.72, expr: 'sleepy', cushion: true },
          { cat: 'sriracha', x: 1360, y: 830, s: 0.66, expr: 'sleepy', cushion: true },
        ],
        over: (c, t) => {
          P.zzz(c, 440, 600, t);
          P.zzz(c, 690, 590, t + 0.4);
          P.zzz(c, 1190, 610, t + 0.8);
        },
      },
    ],
  },

  postcredits: {
    id: 'postcredits',
    title: 'Post-credits',
    then: '#/map',
    panels: [
      {
        text: '…no.',
        room: null,
        wash: 'rgba(59,58,74,0.06)',
        textAt: 6.4,
        actors: [{ enemy: 'cucumber-cadet', x: 800, y: 790, h: 190, mode: 'idle', roll: { dx: -1000, dur: 6, turns: 2.5 } }],
      },
    ],
  },
};

/** World id → intro sequence id. */
export const WORLD_INTRO = { countryside: 'world-countryside', house: 'world-house', bathhouse: 'world-bathhouse', sky: 'world-sky' };
