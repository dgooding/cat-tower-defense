// Node check: every relative import in js/interactive/** (static and dynamic string imports) resolves to a file,
// and every named import exists as an export of the target module (static analysis, no browser needed).
// Usage: node js/interactive/tools/check-imports.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : /\.(m?js)$/.test(d.name) ? [p] : [];
  });
}

/** @param {string} src */
function exportsOf(src) {
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of m[1].split(',')) {
      const seg = part.trim().split(/\s+as\s+/);
      if (seg[0]) names.add((seg[1] ?? seg[0]).trim());
    }
  if (/export\s+\*\s+from/.test(src)) names.add('*');
  return names;
}

let bad = 0;
let checked = 0;
for (const file of walk(root)) {
  if (file === fileURLToPath(import.meta.url)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const specs = [
    ...[...src.matchAll(/import\s+([\w$\s{},*]*?)\s+from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => ({ what: m[1], spec: m[2] })),
    ...[...src.matchAll(/export\s+(\{[^}]*\}|\*)\s+from\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => ({ what: m[1], spec: m[2] })),
    ...[...src.matchAll(/import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)].map((m) => ({ what: '', spec: m[1] })),
  ];
  for (const { what, spec } of specs) {
    checked++;
    const target = path.resolve(path.dirname(file), spec.split('?')[0]);
    const rel = path.relative(root, file);
    if (!fs.existsSync(target)) {
      console.error(`✗ ${rel}: cannot resolve ${spec}`);
      bad++;
      continue;
    }
    const named = what.match(/\{([^}]*)\}/);
    if (!named) continue;
    const ex = exportsOf(fs.readFileSync(target, 'utf8'));
    if (ex.has('*')) continue;
    for (const part of named[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0].trim();
      if (name && !ex.has(name)) {
        console.error(`✗ ${rel}: '${name}' is not exported by ${spec}`);
        bad++;
      }
    }
  }
}
console.log(bad ? `${bad} problem(s) in ${checked} imports` : `✓ all ${checked} relative imports in js/interactive resolve`);
process.exit(bad ? 1 : 0);
