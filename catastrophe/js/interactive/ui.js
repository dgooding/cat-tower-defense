// @ts-check
// Shared UI bits: sticky-note toasts, navigation, optional click meows.
import { h } from './dom.js';
import { meow } from '../audio/meow.js';

/**
 * Slap a sticky note toast in the corner.
 * @param {string} text @param {{icon?:string, kind?:'gold'|'pink'|'mint', ms?:number, title?:string}} [o]
 */
export function toast(text, o = {}) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const note = h('div', { class: `toast-note ${o.kind ?? 'mint'}` }, [
    o.icon ? h('span', { class: 'toast-icon', 'aria-hidden': 'true', text: o.icon }) : null,
    h('div', {}, [o.title ? h('b', { text: o.title }) : null, h('span', { text })]),
  ]);
  host.append(note);
  while (host.children.length > 4) host.firstElementChild?.remove();
  setTimeout(() => {
    note.classList.add('out');
    setTimeout(() => note.remove(), 400);
  }, o.ms ?? 3600);
}

/** Navigate to a hash route. @param {string} hash e.g. "#/map" @param {boolean} [replace] */
export function go(hash, replace = false) {
  if (replace) location.replace(`${location.pathname}${location.search}${hash}`);
  else location.hash = hash;
}

const SOUND_KEY = 'cata:ixSound';
export function soundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) === '1';
  } catch {
    return false;
  }
}
/** @param {boolean} on */
export function setSound(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
/** Meow only when the player opted in (office-safe: never autoplays). @param {number} [pitch] */
export function clickMeow(pitch = 1) {
  if (soundOn()) meow(pitch);
}

/** Where to go after the current story sequence. */
let after = '';
/** @param {string} hash */
export const setAfterStory = (hash) => (after = hash);
export const takeAfterStory = () => {
  const a = after;
  after = '';
  return a;
};
