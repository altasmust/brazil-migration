// Danışman (referans) banner setleri: Google Ads / Görüntülü Reklam Ağı standart ölçüleri × hizmet temaları.
// Çıktı: public/partner/banner/<tema>-<g>x<y>.svg (+ PNG ve ZIP için: node scripts/build-banners.mjs --png)
import {writeFileSync, mkdirSync, rmSync, existsSync} from 'node:fs';
import {execSync} from 'node:child_process';
const OUT = new URL('../public/partner/banner/', import.meta.url).pathname;
export const SIZES = [
  [300, 250, 'Orta dikdörtgen'], [336, 280, 'Büyük dikdörtgen'], [250, 250, 'Kare'], [200, 200, 'Küçük kare'],
  [728, 90, 'Leaderboard'], [970, 90, 'Büyük leaderboard'], [970, 250, 'Billboard'], [468, 60, 'Banner'],
  [320, 50, 'Mobil banner'], [320, 100, 'Büyük mobil banner'], [300, 600, 'Yarım sayfa'], [160, 600, 'Geniş skyscraper'], [120, 600, 'Skyscraper'],
  [1200, 628, 'Sosyal medya (yatay)'], [1080, 1080, 'Sosyal medya (kare)'],
];
export const THEMES = {
  genel: {label: 'Genel', bg: ['#153d2c', '#1b5e20'], accent: '#d7eca4', ink: '#183b2c', h: ['Yeni bir ülke.', 'Net bir yol haritası.'], sub: 'Brezilya’da oturum, şirket ve yaşam.', cta: 'Keşfet'},
  oturum: {label: 'Oturum izni', bg: ['#0f3a26', '#1f6b3a'], accent: '#f2c94c', ink: '#2a2205', h: ['Brezilya’da', 'oturum izni'], sub: 'Adım adım, Türkçe danışmanlık.', cta: 'Ücretsiz ön değerlendirme'},
  sirket: {label: 'Şirket kurulumu', bg: ['#0f1f3d', '#1d3f73'], accent: '#7cc4ff', ink: '#0b1d33', h: ['Brezilya’da', 'şirketinizi kurun'], sub: 'CNPJ, vergi ve banka süreçleri.', cta: 'Hemen başlayın'},
  vatandaslik: {label: 'Vatandaşlık', bg: ['#0b3b3a', '#0f766e'], accent: '#ffd479', ink: '#2a1f05', h: ['Brezilya', 'vatandaşlığı'], sub: 'Yol haritanızı birlikte çizelim.', cta: 'Bilgi alın'},
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const wrap = (text, max, size) => { const words = text.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (t.length * size * 0.56 > max && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; };
const shield = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${c}" fill="none" stroke-width="1.6"><path d="M14 0 27 5v12c0 9-13 15-13 15S1 26 1 17V5Z"/><circle cx="14" cy="14" r="8"/><ellipse cx="14" cy="14" rx="3.5" ry="8"/><path d="M6 14h16"/></g>`;

export function banner(key, W, H) {
  const T = THEMES[key], id = `g${key}${W}x${H}`, F = 'Arial, Helvetica, sans-serif';
  const ratio = W / H, short = Math.min(W, H);
  let body = '';
  const bg = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${T.bg[0]}"/><stop offset="1" stop-color="${T.bg[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" rx="${Math.min(10, short / 10)}" fill="url(#${id})"/>`;
  const rings = (cx, cy, r) => `<g stroke="${T.accent}" opacity=".12" fill="none">${[1, .8, .6].map(k => `<circle cx="${cx}" cy="${cy}" r="${(r * k).toFixed(1)}"/>`).join('')}</g>`;
  const btn = (x, y, w, h, fs, anchor = 'start') => { const bx = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x; return `<rect x="${bx.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(h / 2).toFixed(1)}" fill="${T.accent}"/><text x="${(bx + w / 2).toFixed(1)}" y="${(y + h / 2 + fs * .36).toFixed(1)}" text-anchor="middle" fill="${T.ink}" font-weight="700" font-size="${fs.toFixed(1)}">${esc(T.cta)} →</text>`; };
  const ctaW = fs => (T.cta.length + 2) * fs * .6 + fs * 2.2;
  if (ratio >= 3) { // yatay şerit: başlık, butona kalan genişliğe sığacak boyutta
    const pad = H * .18, ls = Math.min(H * .028, 1.6), bh = Math.min(H * .5, 44);
    const bf = Math.max(9, Math.min(H * .2, 15, W * .03)), bw = W >= 300 ? ctaW(bf) : 0, lx = pad + 34 * ls;
    const avail = W - lx - pad - (bw ? bw + pad : 0);
    let head = T.h.join(' '), fs = Math.min(H * .3, 30, avail / (head.length * .56));
    if (fs < 13) { head = T.h[1].replace(/^./, c => c.toUpperCase()); fs = Math.min(H * .3, 30, avail / (head.length * .56)); }
    const tall = H >= 80, label = Math.min(H * .15, 15), cy = H / 2;
    body += rings(W, H, W * .45) + shield(pad, (H - 32 * ls) / 2, ls, T.accent);
    if (tall) { const sub = H >= 200, block = label + fs * 1.15 + (sub ? fs * .75 : 0), top = cy - block / 2;
      body += `<text x="${lx}" y="${top + label}" font-size="${label}" font-weight="700" fill="#fff">Brazil Migration</text><text x="${lx}" y="${top + label + fs * 1.1}" font-size="${fs}" font-weight="700" fill="#fff">${esc(head)}</text>${sub ? `<text x="${lx}" y="${top + label + fs * 1.85}" font-size="${fs * .5}" fill="#cfe0cc">${esc(T.sub)}</text>` : ''}`; }
    else body += `<text x="${lx}" y="${cy + fs * .35}" font-size="${fs}" font-weight="700" fill="#fff">${esc(head)}</text>`;
    if (bw) body += btn(W - pad, (H - bh) / 2, bw, bh, bf, 'end');
  } else if (ratio <= .55) { // dikey
    const pad = W * .12, ls = W / 130, fs = W * .14, bf = Math.max(10, W * .075), bh = Math.max(28, W * .2);
    body += rings(W, H, H * .55) + shield(pad, pad, ls, T.accent) + `<text x="${pad}" y="${pad + 34 * ls + fs * .6}" font-size="${Math.max(10, W * .085)}" font-weight="700" fill="#fff">Brazil Migration</text>`;
    let y = H * .32; for (const line of T.h.flatMap(h => wrap(h, W - pad * 2, fs))) { body += `<text x="${pad}" y="${y}" font-size="${fs}" font-weight="700" fill="#fff">${esc(line)}</text>`; y += fs * 1.18; }
    y += fs * .3; for (const line of wrap(T.sub, W - pad * 2, fs * .45)) { body += `<text x="${pad}" y="${y}" font-size="${fs * .45}" fill="#cfe0cc">${esc(line)}</text>`; y += fs * .62; }
    const lines = wrap(T.cta + ' →', W - pad * 2 - 10, bf); const bh2 = bh + (lines.length - 1) * bf * 1.2, by = H - pad - bh2;
    body += `<rect x="${pad}" y="${by}" width="${W - pad * 2}" height="${bh2}" rx="${bh / 2}" fill="${T.accent}"/>` + lines.map((l, i) => `<text x="${W / 2}" y="${by + bh / 2 + bf * .36 + i * bf * 1.2}" text-anchor="middle" fill="${T.ink}" font-weight="700" font-size="${bf}">${esc(l)}</text>`).join('');
  } else { // kutu / yatay dikdörtgen
    const pad = short * .08, ls = short / 220, fs = Math.min(W * .085, H * .11), bf = Math.max(11, short * .048), bh = Math.max(30, short * .135);
    body += rings(W, H, Math.max(W, H) * .7) + shield(pad, pad * .8, ls, T.accent) + `<text x="${pad + 34 * ls}" y="${pad * .8 + 20 * ls}" font-size="${Math.max(12, short * .062)}" font-weight="700" fill="#fff">Brazil Migration</text>`;
    const top = pad * .8 + 32 * ls + short * .08, bottom = H - pad - bh - short * .06;
    let f = fs, lines; for (;;) { lines = T.h.flatMap(h => wrap(h, W - pad * 2, f)); const need = lines.length * f * 1.2 + Math.max(10, f * .44) * 1.6; if (need <= bottom - top || f < 11) break; f *= .92; }
    const sf = Math.max(9, f * .44), block = lines.length * f * 1.2 + sf * 1.6;
    let y = top + Math.max(0, (bottom - top - block) / 2) + f; for (const line of lines) { body += `<text x="${pad}" y="${y.toFixed(1)}" font-size="${f.toFixed(1)}" font-weight="700" fill="#fff">${esc(line)}</text>`; y += f * 1.2; }
    body += `<text x="${pad}" y="${(y + sf * .3).toFixed(1)}" font-size="${sf.toFixed(1)}" fill="#cfe0cc">${esc(T.sub)}</text>`;
    body += btn(pad, H - pad - bh, Math.min(ctaW(bf), W - pad * 2), bh, bf);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Brazil Migration — ${esc(T.label)}">${bg}<g font-family="${F}">${body}</g></svg>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, {recursive: true});
  const list = [];
  for (const k of Object.keys(THEMES)) for (const [w, h, name] of SIZES) { const f = `${k}-${w}x${h}`; writeFileSync(OUT + f + '.svg', banner(k, w, h)); list.push({file: f, theme: k, w, h, name}); }
  writeFileSync(OUT + 'sets.json', JSON.stringify({themes: Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v.label])), sizes: SIZES.map(([w, h, n]) => ({w, h, name: n})), files: list}));
  console.log('banner:', list.length, 'SVG');
  if (process.argv.includes('--png')) {
    const {chromium} = (await import('node:module')).createRequire(process.cwd() + '/')('playwright');
    const b = await chromium.launch(); const p = await b.newPage();
    for (const f of list) { await p.setViewportSize({width: f.w, height: f.h}); await p.setContent(`<html><body style="margin:0">${banner(f.theme, f.w, f.h)}</body></html>`); await p.screenshot({path: OUT + f.file + '.png', clip: {x: 0, y: 0, width: f.w, height: f.h}}); }
    await b.close();
    // PNG'leri 256 renge indir (≈%85 küçülür); Pillow yoksa atlanır.
    try { execSync(`python3 -c "from PIL import Image;import glob\nfor f in glob.glob('${OUT}*-*x*.png'):\n  Image.open(f).convert('RGB').quantize(256,dither=Image.Dither.FLOYDSTEINBERG).save(f,optimize=True)"`); } catch { console.log('PNG sıkıştırma atlandı (Pillow yok)'); }
    const zip = OUT + 'brazil-migration-banner-seti.zip'; if (existsSync(zip)) rmSync(zip);
    execSync(`cd "${OUT}" && zip -q -X brazil-migration-banner-seti.zip ${list.map(f => f.file + '.png ' + f.file + '.svg').join(' ')}`);
    console.log('PNG + ZIP hazır');
  }
}
