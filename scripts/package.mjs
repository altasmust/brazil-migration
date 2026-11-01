// Yayın paketi: geliştirme dosyaları çıkarılır, tarayıcıya giden JS/CSS/HTML ve sunucu kodu küçültülür (yorumlar silinir).
// Kullanım: node scripts/package.mjs [çıktı.zip]   (varsayılan: dist/site.zip)
import {execSync} from 'node:child_process';
import {mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync, existsSync, mkdirSync} from 'node:fs';
import {join, resolve, dirname, extname} from 'node:path';
import {tmpdir} from 'node:os';
import {transform} from 'esbuild';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const out = resolve(process.argv[2] || join(root, 'dist/site.zip'));
const tmp = mkdtempSync(join(tmpdir(), 'pkg-'));
execSync(`git -C "${root}" archive --format=tar HEAD | tar -x -C "${tmp}"`);

// Yayına gerekmeyen dosyalar
const DROP = ['AGENTS.md', 'IMPLEMENTATION.md', 'PROJE-NOTLARI.md', 'README.md', 'HOSTINGER-KURULUM.md', 'PAKET-BILGISI.txt', 'build.py', 'content.py', 'enhancements.py', 'quizzes.py', 'docs', 'checks', 'tests', 'drizzle', 'tmp', 'assets', 'scripts', '.env.example'];
for (const f of DROP) rmSync(join(tmp, f), {recursive: true, force: true});
const pkg = JSON.parse(readFileSync(join(tmp, 'package.json'), 'utf8'));
delete pkg.scripts.test; pkg.description = 'Brazil Migration'; writeFileSync(join(tmp, 'package.json'), JSON.stringify(pkg, null, 2));

const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
let n = 0, before = 0, after = 0;
const min = async (file, loader, opts = {}) => {
  const src = readFileSync(file, 'utf8');
  const r = await transform(src, {loader, minify: true, legalComments: 'none', charset: 'utf8', target: 'es2020', ...opts});
  writeFileSync(file, r.code); n++; before += src.length; after += r.code.length;
};
// Tarayıcı dosyaları: değişken adları da kısaltılır (üst seviye/global adlar korunur).
for (const f of walk(join(tmp, 'public'))) {
  const e = extname(f);
  if (e === '.js' && !f.endsWith('.min.js')) await min(f, 'js');
  else if (e === '.css') await min(f, 'css');
  else if (e === '.html') { const s = readFileSync(f, 'utf8'); const t = s.replace(/<!--(?!\[if)[\s\S]*?-->/g, '').replace(/\n\s*\n/g, '\n'); writeFileSync(f, t); before += s.length; after += t.length; }
}
// Sunucu kodu: yorumlar ve boşluklar silinir; adlar korunur (hata ayıklama ve dinamik import güvenliği için).
for (const f of walk(join(tmp, 'server'))) if (f.endsWith('.mjs')) await min(f, 'js', {format: 'esm', minifyIdentifiers: false, target: 'node20'});
// Next.js dosyaları (route config dışa aktarımları bozulmasın diye küçültülmez): yalnız tam satır yorumlar silinir.
for (const f of [join(tmp, 'proxy.ts'), join(tmp, 'next.config.ts'), ...walk(join(tmp, 'app')).filter(f => /\.tsx?$/.test(f))]) {
  const s = readFileSync(f, 'utf8'); writeFileSync(f, s.split('\n').filter(l => !/^\s*\/\/(?!\s*@ts-)/.test(l)).join('\n'));
}
if (!existsSync(dirname(out))) mkdirSync(dirname(out), {recursive: true});
rmSync(out, {force: true});
execSync(`cd "${tmp}" && zip -qr -X "${out}" .`);
rmSync(tmp, {recursive: true, force: true});
console.log(`Paket: ${out}\n${n} dosya küçültüldü · ${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB`);
