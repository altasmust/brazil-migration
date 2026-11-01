// Panel çeviri dosyasını üretir: scripts/i18n-src/panel.tsv (tr<TAB>en<TAB>fa) + runtime.js → public/bm/i18n.js
import {readFileSync, writeFileSync} from 'node:fs';
const dir = new URL('./i18n-src/', import.meta.url);
const rows = new Map();
for (const line of readFileSync(new URL('panel.tsv', dir), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const [tr, en, fa] = line.split('\t').map(s => (s || '').trim());
  if (tr && (en || fa)) rows.set(tr, [tr, en, fa]);
}
const runtime = readFileSync(new URL('runtime.js', dir), 'utf8').replace('__DICT__', JSON.stringify([...rows.values()]));
writeFileSync(new URL('../public/bm/i18n.js', import.meta.url), runtime);
console.log('i18n:', rows.size, 'ifade');
