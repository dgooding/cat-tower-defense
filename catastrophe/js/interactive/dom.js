// @ts-check
// Tiny DOM helpers for Interactive Mode.

/**
 * Create an element. `on*` attrs become listeners, `text` sets textContent (no innerHTML, on purpose).
 * @param {string} tag @param {Record<string, any>} [attrs] @param {(Node|string|number|null|false|undefined)[]} [kids]
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, kids = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c != null && c !== false) el.append(typeof c === 'number' ? String(c) : c);
  return el;
}

/** @param {Record<string, any>} [attrs] @returns {HTMLCanvasElement} */
export const canvas = (attrs = {}) => /** @type {HTMLCanvasElement} */ (h('canvas', attrs));

/** Washi tape strip. @param {'mint'|'peach'|'lilac'|'pink'|'gold'} [color] @param {string} [extra] */
export const tape = (color = 'mint', extra = '') => h('span', { class: `tape tape-${color} ${extra}`.trim(), 'aria-hidden': 'true' });

/** @param {number} n 0..3 @param {number} [max] */
export function starRow(n, max = 3) {
  const row = h('span', { class: 'stars', role: 'img', 'aria-label': `${n} of ${max} stars` });
  for (let i = 0; i < max; i++) row.append(h('span', { class: i < n ? 'star on' : 'star', 'aria-hidden': 'true', text: '★' }));
  return row;
}

/**
 * A group of toggle chips (aria-pressed). Returns the row.
 * @param {string} label @param {{id:string,label:string,disabled?:boolean,title?:string}[]} items @param {string} current @param {(id:string)=>void} onPick
 */
export function chips(label, items, current, onPick) {
  const row = h('div', { class: 'chips', role: 'group', 'aria-label': label });
  for (const it of items) {
    const b = h('button', { class: 'chip', type: 'button', 'data-id': it.id, 'aria-pressed': String(it.id === current), disabled: !!it.disabled, title: it.title, text: it.label });
    b.addEventListener('click', () => {
      row.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      onPick(it.id);
    });
    row.append(b);
  }
  return row;
}

/** Deterministic small "hand placed" tilt for a string id. @param {string} id @param {number} [amp] */
export function tilt(id, amp = 2.2) {
  let x = 0;
  for (let i = 0; i < id.length; i++) x = (x * 31 + id.charCodeAt(i)) | 0;
  return (((x >>> 0) % 1000) / 1000 - 0.5) * 2 * amp;
}
