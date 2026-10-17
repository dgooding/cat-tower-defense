// @ts-check
// Per-card review state (👍 / ✏️ + notes), stored locally, exported as one markdown list.

const KEY = 'cata:gallery:feedback:v1';

/** @typedef {{status: 'approve'|'change'|null, notes: string}} Entry */

/** @returns {Record<string, Entry>} */
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/** @type {Record<string, Entry>} */
let state = load();
/** @type {Set<() => void>} */
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage may be blocked (private mode); feedback still works for this visit.
  }
  listeners.forEach((fn) => fn());
}

/** @param {string} id @returns {Entry} */
export function get(id) {
  return state[id] ?? { status: null, notes: '' };
}

/** @param {string} id @param {Partial<Entry>} patch */
export function set(id, patch) {
  state[id] = { ...get(id), ...patch };
  save();
}

/** @param {() => void} fn */
export function onChange(fn) {
  listeners.add(fn);
}

export function counts() {
  let approve = 0;
  let change = 0;
  for (const e of Object.values(state)) {
    if (e.status === 'approve') approve++;
    else if (e.status === 'change') change++;
  }
  return { approve, change };
}

export function clearAll() {
  state = {};
  save();
}

/**
 * @param {{heading:string, items:{id:string, name:string}[]}[]} groups
 * @param {string} round
 */
export function toMarkdown(groups, round) {
  const lines = [`## Catastrophe! design feedback (Round ${round})`, ''];
  for (const grp of groups) {
    const rows = grp.items
      .map((it) => ({ it, e: get(it.id) }))
      .filter(({ e }) => e.status || e.notes.trim());
    if (!rows.length) continue;
    lines.push(`### ${grp.heading}`);
    for (const { it, e } of rows) {
      const mark = e.status === 'approve' ? '👍' : e.status === 'change' ? '✏️' : '💬';
      const note = e.notes.trim().replace(/\s+/g, ' ');
      lines.push(`- ${it.name}: ${mark}${note ? ` ${note}` : ''}`);
    }
    lines.push('');
  }
  if (lines.length === 2) lines.push('_No feedback yet._');
  return lines.join('\n');
}
