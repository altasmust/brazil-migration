// Site dilleri (şimdilik İngilizce taslak). /en/<çevrilmiş-adres>/ → Türkçe sayfa sunucuda render edilir, sonra
// sözlükle (server/platform/i18n/en.json) çevrilir. Birim: satır içi öğeler (b, a, span…) dahil cümle/blok; etiketler
// <1>…</1>, <2/> yer tutucularıyla korunur (çevirmen kelime sırasını değiştirebilir). Aynı algoritma tarayıcıda
// public/bm/i18n-site.js içinde JS ile üretilen metinler için çalışır — anahtarlar birebir aynı olmalı.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

export const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'img', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'bm-i', 'svg', 'input', 'select', 'textarea']);
const VOID = new Set(['br', 'img', 'wbr', 'input', 'bm-i', 'svg', 'select', 'textarea']);
const SKIP = new Set(['script', 'style', 'noscript', 'template', 'code', 'pre', 'svg']);
export const ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'data-tip'];
export const norm = s => String(s).replace(/[\s ]+/g, ' ').trim();
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const hasWord = s => /\p{L}{2,}/u.test(s);

let D = null;
const DIR = () => join(/* turbopackIgnore: true */ process.cwd(), 'server', 'platform', 'i18n');
export function dict(lang = 'en') {
  if (D && D.lang === lang) return D;
  let raw = {slugs: {}, t: {}};
  try { raw = JSON.parse(readFileSync(join(DIR(), lang + '.json'), 'utf8')); } catch (e) { console.error('[i18n]', e.message); }
  const t = new Map(); for (const [k, v] of Object.entries(raw.t || {})) if (v) t.set(norm(k), v);
  const toEn = new Map(Object.entries(raw.slugs || {})), toTr = new Map([...toEn].map(([a, b]) => [b, a]));
  D = {lang, t, toEn, toTr, raw};
  return D;
}
export function reloadDict() { D = null; }

// sayı içeren dinamik metinler: "15 dakika" → "{0} dakika" anahtarıyla da aranır
export function lookup(key, d = dict()) {
  if (!key) return null;
  const hit = d.t.get(key); if (hit != null) return hit;
  const nums = []; const pk = key.replace(/\d+(?:[.,]\d+)*/g, m => '{' + (nums.push(m) - 1) + '}');
  if (!nums.length) return null;
  const p = d.t.get(pk); return p == null ? null : p.replace(/\{(\d+)\}/g, (_, i) => nums[+i] ?? '');
}

// ---------- node-html-parser üzerinde ----------
const isEl = n => n.nodeType === 1, isText = n => n.nodeType === 3;
const tag = n => (n.rawTagName || '').toLowerCase();
function inlineOnly(el) {
  for (const c of el.childNodes) {
    if (isText(c)) continue;
    if (!isEl(c)) continue;
    const t = tag(c);
    if (!INLINE.has(t)) return false;
    if (!VOID.has(t) && !inlineOnly(c)) return false;
  }
  return true;
}
const textOf = el => norm(decode(el.childNodes.map(c => isText(c) ? c.rawText : isEl(c) && !VOID.has(tag(c)) ? textOf(c) : ' ').join('')));
// birimin anahtarı + yeniden kurmak için etiket parçaları
export function unitKey(el) {
  const parts = []; let k = '';
  const walk = n => {
    for (const c of n.childNodes) {
      if (isText(c)) k += decode(c.rawText);
      else if (isEl(c)) {
        const t = tag(c), i = parts.length + 1;
        if (VOID.has(t)) { parts.push({v: c.toString()}); k += `<${i}/>`; }
        else { parts.push({o: `<${c.rawTagName}${c.rawAttrs ? ' ' + c.rawAttrs : ''}>`, c: `</${c.rawTagName}>`}); k += `<${i}>`; walk(c); k += `</${i}>`; }
      }
    }
  };
  walk(el);
  return {key: norm(k), parts};
}
export function rebuild(tr, parts) {
  let out = '', i = 0;
  const re = /<(\/?)(\d+)(\/?)>/g; let m;
  while ((m = re.exec(tr))) {
    out += esc(tr.slice(i, m.index)); i = re.lastIndex;
    const p = parts[+m[2] - 1]; if (!p) continue;
    out += m[3] ? (p.v || '') : m[1] ? (p.c || '') : (p.o || '');
  }
  return out + esc(tr.slice(i));
}

export function mapHref(href, d = dict()) {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return href;
  const m = href.match(/^([^?#]*)([?#].*)?$/); let p = m[1] || '/'; const rest = m[2] || '';
  if (!p.endsWith('/') && !p.split('/').pop().includes('.')) p += '/';
  const en = d.toEn.get(p); return en ? en + rest : href;
}

// Tüm belgeyi çevir. collect: eksik anahtarları toplar (yönetici raporu ve çıkarma betiği için).
export function translateRoot(root, {lang = 'en', path = '/', trPath = '/', missing = null} = {}) {
  const d = dict(lang);
  const miss = (k, kind = 'text') => { if (missing && k && hasWord(k)) missing.set(k, kind); };
  const visit = el => {
    for (const c of [...el.childNodes]) {
      if (isText(c)) {
        const k = norm(decode(c.rawText)); if (!k || !hasWord(k)) continue;
        const v = lookup(k, d); if (v != null) { const lead = /^\s/.test(c.rawText) ? ' ' : '', trail = /\s$/.test(c.rawText) ? ' ' : ''; c.rawText = lead + esc(v) + trail; } else miss(k);
        continue;
      }
      if (!isEl(c)) continue;
      const t = tag(c);
      if (SKIP.has(t) || c.getAttribute?.('translate') === 'no' && t !== 'html' || /\bnotranslate\b/.test(c.getAttribute?.('class') || '')) continue;
      for (const a of ATTRS) { const v = c.getAttribute(a); if (v && hasWord(v)) { const k = norm(decode(v)); const tv = lookup(k, d); if (tv != null) c.setAttribute(a, tv); else miss(k, 'attr'); } }
      if (t === 'input' && /^(submit|button)$/i.test(c.getAttribute('type') || '')) { const v = c.getAttribute('value'); if (v) { const tv = lookup(norm(v), d); if (tv != null) c.setAttribute('value', tv); else miss(norm(v), 'attr'); } }
      if (VOID.has(t)) continue;
      if (t !== 'html' && t !== 'body' && t !== 'head' && inlineOnly(c) && hasWord(textOf(c))) {
        const {key, parts} = unitKey(c);
        const v = lookup(key, d);
        if (v != null) c.set_content(rebuild(v, parts));
        else miss(key);
        continue;
      }
      visit(c);
    }
  };
  const head = root.querySelector('head'), body = root.querySelector('body');
  if (head) {
    const ti = head.querySelector('title'); if (ti) { const k = norm(ti.text); const v = lookup(k, d); if (v != null) ti.set_content(esc(v)); else miss(k, 'title'); }
    head.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]').forEach(m => { const k = norm(decode(m.getAttribute('content') || '')); if (!k) return; const v = lookup(k, d); if (v != null) m.setAttribute('content', v); else miss(k, 'meta'); });
    head.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const tr = x => typeof x === 'string' ? (/^\//.test(x) ? mapHref(x, d) : /^https?:\/\//.test(x) ? x.replace(/^(https?:\/\/[^/]+)(\/[^\s]*)$/, (_, h, p) => h + mapHref(p, d)) : (lookup(norm(x), d) ?? (hasWord(x) && miss(norm(x), 'ld'), x))) : Array.isArray(x) ? x.map(tr) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === '@type' || k === '@context' ? v : tr(v)])) : x;
        s.set_content(JSON.stringify(tr(JSON.parse(s.text))).replace(/</g, '\\u003c'));
      } catch {}
    });
  }
  if (body) visit(body);
  // bağlantılar ve dil meta verisi
  root.querySelectorAll('a[href]').forEach(a => a.setAttribute('href', mapHref(a.getAttribute('href'), d)));
  const html = root.querySelector('html'); if (html) html.setAttribute('lang', lang);
  root.querySelector('meta[property="og:locale"]')?.setAttribute('content', 'en_US');
  root.querySelectorAll('link[rel="canonical"],meta[property="og:url"]').forEach(l => { const at = l.getAttribute('href') ? 'href' : 'content'; const u = l.getAttribute(at) || ''; l.setAttribute(at, u.replace(/^(https?:\/\/[^/]+)?(\/.*)$/, (_, h, p) => (h || '') + mapHref(p, d))); });
  return root;
}
