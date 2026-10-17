// @ts-check
// 👔 Boss Key: instantly pause, mute, hide the game and show a very serious spreadsheet.
import { setHidden } from '../audio/sfx.js';

const SHEET_TITLE = 'Q3_Synergy_Report_FINAL_v7.xlsx';
const GRID_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='#1D6F42'/><path d='M8 8h16v16H8z' fill='#fff'/><path d='M8 13h16M8 18h16M13 8v16M19 8v16' stroke='#1D6F42' stroke-width='1.6'/></svg>",
  );

/** @param {string} s */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function buildSheet() {
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  /** @type {string[][]} */
  const rows = [
    ['Q3 Synergy Report', '', '', '', '', '', '', '', '', ''],
    ['Department', 'Q1', 'Q2', 'Q3', 'Treat Budget', 'Variance', 'Owner', 'Status', '', ''],
    ['Napping Operations', '412', '438', '501', '$1,200', '+14%', 'P. Pudding', 'On track', '', ''],
    ['Snack Logistics', '220', '219', '203', '$4,800', '-7%', 'M. Mittens', 'Needs treats', '', ''],
    ['Cucumber Mitigation', '3', '3', '2', '$950', '-33%', 'Sriracha', 'HSSS', '', ''],
    ['Laser R&D', '88', '91', '120', '$2,100', '+32%', 'Whiskerton', 'Field research', '', ''],
    ['Yarn Procurement', '57', '63', '71', '$640', '+12%', 'G. Purl', 'Knitting', '', ''],
    ['Box Acquisitions', '14', '22', '35', '$0', '+59%', 'Ld. Chonkington', 'If fits, sits', '', ''],
    ['Vacuum Relations', '0', '0', '0', '$0', '0%', '—', 'Hostile', '', ''],
    ['Total naps', '=SUM(NAPS)', '', '', '', '', '', '', '', ''],
    ['Synergy Alignment', '110%', '', '', '', '', '', '', '', ''],
    ['Notes', 'Per my last email, the cucumber remains at large.', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['Action items', 'Circle back re: empty bowl', '', '', '', '', '', '', '', ''],
    ['', 'Do not look behind cell G12', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', ''],
  ];
  const el = document.createElement('div');
  el.id = 'bosskey';
  el.hidden = true;
  el.setAttribute('aria-label', 'Spreadsheet');
  let html = `<div class="xl-top"><span class="xl-logo">▦</span> ${SHEET_TITLE} <span class="xl-saved">— Saved</span></div>`;
  html += '<div class="xl-ribbon"><b>File</b><b>Home</b><b>Insert</b><b>Formulas</b><b>Data</b><b>Review</b><b>View</b></div>';
  html += '<div class="xl-formula"><span>fx</span> =SUM(NAPS)</div><div class="xl-grid"><table><thead><tr><th></th>';
  for (const c of cols) html += `<th>${c}</th>`;
  html += '</tr></thead><tbody>';
  rows.forEach((r, i) => {
    html += `<tr><th>${i + 1}</th>`;
    r.forEach((v, j) => {
      const g12 = i === 11 && j === 6;
      html += `<td${i === 0 ? ' class="xl-h1"' : i === 1 ? ' class="xl-h2"' : ''}>${esc(v)}${g12 ? '<span class="xl-ear" title="…"></span>' : ''}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div><div class="xl-tabs"><span class="on">Q3</span><span>Q4 (draft)</span><span>Treats</span></div>';
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

/**
 * @param {{onShow: () => void, onHide: () => void}} hooks
 */
export function installBossKey(hooks) {
  /** @type {HTMLElement|null} */
  let sheet = null;
  let on = false;
  let savedTitle = document.title;
  /** @type {HTMLLinkElement|null} */
  const icon = document.querySelector('link[rel="icon"]');
  const savedIcon = icon?.href ?? '';
  const toggle = () => {
    on = !on;
    sheet = sheet ?? buildSheet();
    if (on) {
      hooks.onShow();
      setHidden(true);
      savedTitle = document.title;
      document.title = 'Q3 Synergy Report – Spreadsheet';
      if (icon) icon.href = GRID_ICON;
      document.body.classList.add('bosskey-on');
      sheet.hidden = false;
    } else {
      sheet.hidden = true;
      document.body.classList.remove('bosskey-on');
      document.title = savedTitle;
      if (icon) icon.href = savedIcon;
      setHidden(document.hidden);
      hooks.onHide();
    }
  };
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key === '`' || e.code === 'Backquote') {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggle();
      }
    },
    true,
  );
  return { toggle, isOn: () => on };
}
