// Zero-dependency cache busting (no build step). Run before publishing:
//   node tools/stamp.mjs           rewrite the stamps in place
//   node tools/stamp.mjs --check   exit 1 if any page is out of date
// Each page gets an import map that sends every module to `file.js?v=<content hash>`, so a returning
// visitor re-downloads only what changed and never mixes old and new modules. Stylesheets and the
// entry <script src> get the same `?v=<hash>` stamp.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'play.html', 'interactive.html', 'gallery.html', 'dev/sheet.html'];
const START = '<!-- importmap:start (node tools/stamp.mjs) -->';
const END = '<!-- importmap:end -->';

/** Hash text with normalized line endings, so Windows checkouts (CRLF) and the repo/CI (LF) agree. @param {string} file absolute path */
const hashOf = (file) => crypto.createHash('sha1').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'tools' ? [] : walk(p);
    return d.name.endsWith('.js') ? [p] : [];
  });
}

const modules = walk(path.join(root, 'js')).sort();
const check = process.argv.includes('--check');
let stale = 0;

for (const page of PAGES) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) continue;
  const dir = path.dirname(file);
  /** @param {string} abs */
  const rel = (abs) => {
    const r = path.relative(dir, abs).split(path.sep).join('/');
    return r.startsWith('.') ? r : './' + r;
  };
  const imports = Object.fromEntries(modules.map((m) => [rel(m), `${rel(m)}?v=${hashOf(m)}`]));
  const map = `${START}\n    <script type="importmap">\n${JSON.stringify({ imports }, null, 2).replace(/^/gm, '      ')}\n    </script>\n    ${END}`;
  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  if (html.includes(START)) html = html.replace(new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END}`), map);
  else html = html.replace(/<\/title>/, `</title>\n    ${map}`);
  // Stylesheets and module entry points: ?v=<content hash>.
  html = html.replace(/(href|src)="((?:\.\.?\/)+(?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"/g, (_, attr, url) => {
    const abs = path.resolve(dir, url);
    return fs.existsSync(abs) ? `${attr}="${url}?v=${hashOf(abs)}"` : `${attr}="${url}"`;
  });
  if (html !== before) {
    stale++;
    if (check) console.log(`out of date: ${page}`);
    else fs.writeFileSync(file, html);
  }
}

// Service worker precache: every versioned module/stylesheet plus the pages and icons.
{
  const css = fs
    .readdirSync(path.join(root, 'css'))
    .filter((n) => n.endsWith('.css'))
    .sort()
    .map((n) => `./css/${n}?v=${hashOf(path.join(root, 'css', n))}`);
  const js = modules.map((m) => `./${path.relative(root, m).split(path.sep).join('/')}?v=${hashOf(m)}`);
  const statics = ['./', './index.html', './play.html', './interactive.html', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png'];
  const list = [...statics, ...css, ...js];
  const pagesHash = crypto.createHash('sha1');
  for (const p of ['index.html', 'play.html', 'interactive.html', 'manifest.webmanifest']) pagesHash.update(fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n'));
  const version = crypto.createHash('sha1').update(list.join('\n')).update(pagesHash.digest('hex')).digest('hex').slice(0, 10);
  const swFile = path.join(root, 'sw.js');
  const before = fs.readFileSync(swFile, 'utf8');
  const block = `// @generated:start (node tools/stamp.mjs)\nconst VERSION = '${version}';\nconst PRECACHE = ${JSON.stringify(list, null, 2)};\n// @generated:end`;
  const eol = before.includes('\r\n') ? '\r\n' : '\n';
  const after = before.replace(/\/\/ @generated:start[\s\S]*?\/\/ @generated:end/, block.replace(/\n/g, eol));
  if (after !== before) {
    stale++;
    if (check) console.log('out of date: sw.js');
    else fs.writeFileSync(swFile, after);
  }
}

if (check) {
  if (stale) {
    console.log(`${stale} page(s) need stamping: run node tools/stamp.mjs`);
    process.exit(1);
  }
  console.log(`✓ stamps up to date (${modules.length} modules)`);
} else console.log(`stamped ${stale} page(s), ${modules.length} modules`);
