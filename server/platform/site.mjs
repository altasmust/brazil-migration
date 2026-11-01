// Site content management. Public pages are the static HTML files in /public; changes made in the admin
// (menu, texts/images/links, hidden elements, SEO, new pages) are stored in the items table and applied here
// when a page is served. If anything fails, the untouched static file is served.
import {readFile, readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'node-html-parser';
import {iconizeHTML} from './icons.mjs';
import {BLOG_POST, blogIndexHTML, blogPostHTML, blogJsonLd} from './blog.mjs';

const PUBLIC = () => join(/* turbopackIgnore: true */ process.cwd(), 'public');
export const PANEL = /^\/(admin|panel|partner|avukat|kyc)(\/|$)/;
const OLD_HOSTS = /https?:\/\/brasil-yeni-baslangic\.fatih-altas\.chatgpt\.site/g;
const siteUrl = () => (process.env.SITE_URL || '').replace(/\/$/, '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const parseJSON = s => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
export const hash = s => createHash('sha1').update(String(s)).digest('hex').slice(0, 12);
const parseHTML = h => parse(h, {comment: true, blockTextElements: {script: true, noscript: true, style: true, pre: true}});

// ---------- static files ----------
const fileCache = new Map();
export async function readStatic(path) {
  if (!/^\/[a-z0-9/_-]*$/i.test(path) || path.includes('..')) return null;
  if (fileCache.has(path)) return fileCache.get(path);
  let html = null;
  try { html = await readFile(join(PUBLIC(), path, 'index.html'), 'utf8'); } catch {}
  fileCache.set(path, html);
  return html;
}
let pageList = null;
export async function staticPages() {
  if (pageList) return pageList;
  const out = [];
  const walk = async (dir, rel) => {
    let entries = []; try { entries = await readdir(dir, {withFileTypes: true}); } catch { return; }
    if (entries.some(e => e.isFile() && e.name === 'index.html') && !PANEL.test(rel)) {
      const html = await readStatic(rel);
      const t = (html?.match(/<title>([^<]*)<\/title>/) || [])[1] || rel;
      out.push({path: rel, title: t.replace(/\s*\|\s*Brazil Migration\s*$/, '').replace(/&amp;/g, '&').trim()});
    }
    for (const e of entries) if (e.isDirectory() && !['bm', 'images', 'illustrations'].includes(e.name)) await walk(join(dir, e.name), rel + e.name + '/');
  };
  await walk(PUBLIC(), '/');
  pageList = out.sort((a, b) => a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path));
  return pageList;
}

// ---------- saved site state (short in-memory cache, shared by all requests) ----------
let state = null, stateAt = 0;
export function invalidateSite() { stateAt = 0; renderCache.clear(); }
export async function siteState(db) {
  if (state && Date.now() - stateAt < 15000) return state;
  const rows = (await db.prepare("SELECT id, kind, data, updated FROM items WHERE kind IN ('site_menu','site_page','site_custom','blog_post') OR id IN ('config-company','config-payments','config-didit')").all()).results || [];
  const s = {menu: null, pages: {}, custom: {}, blog: {}, company: null, stamp: ''};
  let stamp = rows.length;
  for (const r of rows) {
    const d = parseJSON(r.data); stamp += ':' + r.updated;
    if (r.kind === 'site_menu') s.menu = d;
    if (r.kind === 'site_page' && d.path) s.pages[d.path] = d;
    if (r.kind === 'site_custom' && d.path) s.custom[d.path] = {...d, id: r.id};
    if (r.kind === 'blog_post' && d.slug) s.blog[d.slug] = {...d, id: r.id};
    if (r.id === 'config-company') s.company = d;
    if (r.id === 'config-payments') s.payments = d;
    if (r.id === 'config-didit') s.didit = d;
  }
  s.stamp = hash(stamp);
  if (state?.stamp !== s.stamp) renderCache.clear();
  state = s; stateAt = Date.now();
  return s;
}

// ---------- editable elements ----------
const SKIP = new Set(['script', 'style', 'noscript', 'svg', 'template', 'select', 'option', 'textarea', 'input', 'dialog', 'canvas', 'iframe', 'video', 'audio', 'picture', 'source']);
const TEXT = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'a', 'button', 'span', 'small', 'strong', 'em', 'b', 'label', 'figcaption', 'td', 'th', 'dt', 'dd', 'blockquote', 'summary', 'div', 'i']);
const INLINE = new Set(['strong', 'b', 'em', 'i', 'u', 'br', 'small', 'span', 'sup', 'sub', 'mark']);
const isEl = n => n.nodeType === 1;
const kids = n => n.childNodes.filter(isEl);
function skipSubtree(el) {
  const tag = el.rawTagName?.toLowerCase();
  if (SKIP.has(tag)) return true;
  if (tag === 'header' && /new-header/.test(el.getAttribute('class') || '')) return true;
  if (tag === 'footer') return true;
  const id = el.getAttribute?.('id');
  if (id === 'full-menu' || id === 'booking') return true;
  if (el.getAttribute?.('aria-hidden') === 'true' && tag !== 'img') return true;
  return false;
}
function textOnly(el) { // only text + inline formatting, with some visible text
  const ok = n => n.nodeType === 3 || (isEl(n) && INLINE.has(n.rawTagName.toLowerCase()) && n.childNodes.every(ok));
  return el.childNodes.every(ok) && el.text.trim().length > 0;
}
// Walks <body> and returns [{key, el, kind}] — kind: t (text), l (link), i (image); keys are element-index paths.
export function editables(root) {
  const body = root.querySelector('body'); if (!body) return [];
  const out = [];
  const visit = (el, key, underText) => {
    const tag = el.rawTagName.toLowerCase();
    if (skipSubtree(el)) return;
    if (tag === 'img') { out.push({key, el, kind: 'i'}); return; }
    let kind = '';
    if (!underText && TEXT.has(tag) && textOnly(el)) kind += 't';
    if (tag === 'a') kind += 'l';
    if (kind) out.push({key, el, kind});
    if (kind.includes('t')) return;
    kids(el).forEach((c, i) => visit(c, key + '.' + i, underText));
  };
  kids(body).forEach((c, i) => visit(c, String(i), false));
  return out;
}
const fingerprint = el => hash(el.innerHTML + '|' + (el.getAttribute('href') || '') + '|' + (el.getAttribute('src') || ''));
export function sanitizeInline(html) {
  const root = parse('<div>' + String(html || '').slice(0, 20000) + '</div>');
  const clean = n => n.childNodes.map(c => {
    if (c.nodeType === 3) return esc(c.text);
    if (!isEl(c)) return '';
    const t = c.rawTagName.toLowerCase();
    if (t === 'br') return '<br>';
    if (['strong', 'b', 'em', 'i', 'u', 'small', 'sup', 'sub', 'mark'].includes(t)) return `<${t}>${clean(c)}</${t}>`;
    return clean(c);
  }).join('');
  return clean(root.firstChild).replace(/&amp;(#?\w+;)/g, '&$1');
}
const safeUrl = u => { u = String(u || '').trim().slice(0, 1000); return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(u) && !/^javascript:/i.test(u) ? u : ''; };

// Builds the stored override set for a page from the editor's changes (fingerprints come from the static source).
export function buildOverrides(staticHtml, changes) {
  const map = new Map(editables(parseHTML(staticHtml)).map(e => [e.key, e]));
  const out = {};
  for (const [key, c] of Object.entries(changes || {})) {
    const e = map.get(key); if (!e || !c) continue;
    const o = {};
    if (c.html !== undefined && e.kind.includes('t')) o.html = sanitizeInline(c.html);
    if (c.href !== undefined && e.kind.includes('l')) { const u = safeUrl(c.href); if (u) o.href = u; }
    if (e.kind === 'i') { if (c.src !== undefined) { const u = safeUrl(c.src); if (u) o.src = u; } if (c.alt !== undefined) o.alt = String(c.alt).slice(0, 300); }
    if (c.hide) o.hide = true;
    if (Object.keys(o).length) { o.f = fingerprint(e.el); o.k = e.kind; out[key] = o; }
  }
  return out;
}
function applyOverrides(root, overrides, editorMode) {
  if (!overrides || !Object.keys(overrides).length) return 0;
  const map = new Map(editables(root).map(e => [e.key, e]));
  const prints = new Map(); for (const k of Object.keys(overrides)) { const e = map.get(k); if (e) prints.set(k, fingerprint(e.el)); } // before any change
  let n = 0; const hide = [];
  for (const [key, o] of Object.entries(overrides)) {
    const e = map.get(key); if (!e) continue;
    if (o.f && prints.get(key) !== o.f) continue; // static source changed since the edit → skip stale change
    if (o.html !== undefined) e.el.set_content(o.html);
    if (o.href !== undefined) e.el.setAttribute('href', o.href);
    if (o.src !== undefined) { e.el.setAttribute('src', o.src); e.el.removeAttribute('srcset'); }
    if (o.alt !== undefined) e.el.setAttribute('alt', o.alt);
    if (o.hide) hide.push(e.el);
    n++;
  }
  for (const el of hide) { if (editorMode) el.setAttribute('data-bm-hidden', '1'); else el.remove(); }
  return n;
}

// ---------- menu ----------
const nl2br = s => esc(s).replace(/\n/g, '<br>');
export function extractMenu(html) {
  const root = parseHTML(html);
  const groups = (root.querySelector('nav.mega-nav')?.childNodes || []).filter(isEl).filter(d => d.classList.contains('nav-group') || d.classList.contains('nav-direct')).map(d => {
    if (d.classList.contains('nav-direct')) return {title: d.childNodes.filter(n => n.nodeType === 3).map(n => n.text).join('').trim().replace(/&amp;/g, '&'), href: d.getAttribute('href') || '', intro: {kicker: '', heading: '', text: '', cta: {label: '', href: ''}}, links: []};
    const intro = d.querySelector('.mega-intro');
    return {
      title: d.querySelector('summary').childNodes.filter(n => n.nodeType === 3).map(n => n.text).join('').trim(),
      intro: {kicker: intro?.querySelector('.kicker')?.text.trim() || '', heading: intro?.querySelector('h2')?.text.trim() || '', text: (intro?.querySelector('p')?.innerHTML || '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim(), cta: {label: intro?.querySelector('a')?.text.trim() || '', href: intro?.querySelector('a')?.getAttribute('href') || ''}},
      links: d.querySelectorAll('.mega-links a').map(a => ({title: a.querySelector('strong').childNodes.filter(n => n.nodeType === 3).map(n => n.text).join('').trim().replace(/&amp;/g, '&'), desc: a.querySelector('small')?.text.trim() || '', href: a.getAttribute('href') || ''})),
    };
  });
  const f = root.querySelector('footer.site-footer');
  const cols = f ? f.querySelectorAll('.footer-grid > div').filter(d => !/footer-brand|footer-contact/.test(d.getAttribute('class') || '')) : [];
  const contact = f?.querySelector('.footer-contact');
  const bottom = f?.querySelector('.footer-bottom');
  const dec = s => String(s || '').replace(/&amp;/g, '&');
  return {groups, footer: {
    brandText: dec(f?.querySelector('.footer-brand p')?.text.trim()), location: dec(f?.querySelector('.footer-location')?.text.trim()),
    cols: cols.map(c => ({title: dec(c.querySelector('h2')?.text.trim()), links: c.querySelectorAll('a').map(a => ({label: dec(a.text.trim()), href: a.getAttribute('href') || ''}))})),
    contact: {title: dec(contact?.querySelector('h2')?.text.trim()), text: dec(contact?.querySelector('p')?.text.trim()), button: {label: dec(contact?.querySelector('a')?.text.trim()), href: contact?.querySelector('a')?.getAttribute('href') || ''}},
    bottom: {copy: dec(bottom?.querySelector('span')?.text.trim()), links: (bottom?.querySelectorAll('a') || []).map(a => ({label: dec(a.text.trim()), href: a.getAttribute('href') || ''}))},
    legal: dec(f?.querySelector('p.legal')?.text.trim()),
  }};
}
const href = h => esc(safeUrl(h) || '#');
function applyMenu(root, m) {
  if (!m) return;
  const nav = root.querySelector('nav.mega-nav');
  const direct = g => !(g.links || []).length && g.href;
  if (nav && Array.isArray(m.groups)) nav.set_content(m.groups.map(g => direct(g) ? `<a class="nav-direct" href="${href(g.href)}">${esc(g.title)}</a>` : `<details class="nav-group"><summary>${esc(g.title)} <span>⌄</span></summary><div class="mega-panel"><div class="mega-intro"><span class="kicker">${esc(g.intro?.kicker)}</span><h2>${esc(g.intro?.heading || g.title)}</h2><p>${nl2br(g.intro?.text)}</p>${g.intro?.cta?.label ? `<a href="${href(g.intro.cta.href)}">${esc(g.intro.cta.label)}</a>` : ''}</div><div class="mega-links">${(g.links || []).map(l => `<a href="${href(l.href)}"><strong>${esc(l.title)} <span>↗</span></strong><small>${esc(l.desc)}</small></a>`).join('')}</div></div></details>`).join(''));
  const grid = root.querySelector('#full-menu .full-menu-grid');
  if (grid && Array.isArray(m.groups)) grid.set_content(m.groups.map(g => direct(g) ? `<section class="fm-solo"><h2><a href="${href(g.href)}">${esc(g.title)} <span>↗</span></a></h2></section>` : `<section><h2>${esc(g.title)}</h2>${(g.links || []).map(l => `<a href="${href(l.href)}">${esc(l.title)} <span>↗</span></a>`).join('')}</section>`).join(''));
  const f = root.querySelector('footer.site-footer'), F = m.footer;
  if (f && F) {
    const fg = f.querySelector('.footer-grid'), brand = fg?.querySelector('.footer-brand');
    if (fg && brand) {
      const logo = brand.querySelector('a')?.toString() || '';
      fg.set_content(`<div class="footer-brand">${logo}<p>${esc(F.brandText)}</p><span class="footer-location">${esc(F.location)}</span></div>${(F.cols || []).map(c => `<div><h2>${esc(c.title)}</h2>${(c.links || []).map(l => `<a href="${href(l.href)}">${esc(l.label)}</a>`).join('')}</div>`).join('')}<div class="footer-contact"><h2>${esc(F.contact?.title)}</h2><p>${esc(F.contact?.text)}</p>${F.contact?.button?.label ? `<a class="btn" href="${href(F.contact.button.href)}">${esc(F.contact.button.label)}</a>` : ''}</div>`);
    }
    const fb = f.querySelector('.footer-bottom');
    if (fb && F.bottom) fb.set_content(`<span>${esc(F.bottom.copy)}</span>${(F.bottom.links || []).map(l => `<a href="${href(l.href)}">${esc(l.label)}</a>`).join('')}`);
    const legal = f.querySelector('p.legal'); if (legal && F.legal !== undefined) legal.set_content(esc(F.legal));
  }
}

// ---------- company details (admin → Genel Ayarlar → Firma Bilgileri) ----------
const SOC = {instagram: 'Instagram', linkedin: 'LinkedIn', facebook: 'Facebook', youtube: 'YouTube', x: 'X'};
const telHref = p => 'tel:' + String(p).replace(/[^\d+]/g, '');
const waHref = (w, text = '') => 'https://wa.me/' + String(w).replace(/\D/g, '') + (text ? '?text=' + encodeURIComponent(text) : '');
function applyCompany(root, co) {
  if (!co) return;
  const brand = co.brand || 'Brazil Migration';
  root.querySelectorAll('[data-co="controller"]').forEach(el => { if (co.legalName || co.address) el.set_content(esc([co.legalName || brand, co.address].filter(Boolean).join(', ')) + (co.taxId ? ' (' + esc(co.taxId) + ')' : '')); });
  const rows = [co.address && ['map-pin', esc(co.address)], co.phone && ['phone', `<a href="${esc(telHref(co.phone))}">${esc(co.phone)}</a>`], co.whatsapp && ['chat', `<a href="${esc(waHref(co.whatsapp))}" target="_blank" rel="noopener">WhatsApp: ${esc(co.whatsapp)}</a>`], co.email && ['mail', `<a href="mailto:${esc(co.email)}">${esc(co.email)}</a>`], co.hours && ['clock', esc(co.hours)]].filter(Boolean);
  const ic = n => `<bm-i class="ic ic-${n}" aria-hidden="true"></bm-i>`;
  root.querySelectorAll('[data-co-list]').forEach(el => el.set_content(rows.map(([i, h]) => `<span class="co-row">${ic(i)}<span>${h}</span></span>`).join('')));
  const fc = root.querySelector('footer.site-footer .footer-contact');
  if (fc && rows.length) { const btn = fc.querySelector('a.btn'); const html = `<div class="footer-co">${rows.filter(r => r[0] !== 'map-pin').map(([i, h]) => `<span class="co-row">${ic(i)}<span>${h}</span></span>`).join('')}</div>`; if (btn) btn.insertAdjacentHTML('beforebegin', html); else fc.insertAdjacentHTML('beforeend', html); }
  const socials = Object.entries(co.socials || {}).filter(([, v]) => v);
  const fb = root.querySelector('footer.site-footer .footer-brand');
  if (fb && socials.length) fb.insertAdjacentHTML('beforeend', `<div class="footer-social">${socials.map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener" aria-label="${SOC[k]}">${SOC[k]}</a>`).join('')}</div>`);
  if (co.whatsapp && co.showWhatsapp) root.querySelector('body')?.insertAdjacentHTML('beforeend', `<a class="bm-wa" href="${esc(waHref(co.whatsapp, 'Merhaba, Brezilya süreci hakkında bilgi almak istiyorum.'))}" target="_blank" rel="noopener" aria-label="WhatsApp ile yazın">${ic('chat')}<span>WhatsApp</span></a>`);
  const head = root.querySelector('head');
  if (head && root.querySelector('body')?.getAttribute('data-page') !== 'blog') head.insertAdjacentHTML('beforeend', `<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@type': 'ProfessionalService', name: brand, legalName: co.legalName || undefined, url: siteUrl() || undefined, logo: (siteUrl() || '') + '/brazil-migration-logo.png', email: co.email || undefined, telephone: co.phone || undefined, address: co.address ? {'@type': 'PostalAddress', streetAddress: co.address} : undefined, areaServed: ['BR', 'TR'], sameAs: socials.map(([, v]) => v)}).replace(/</g, '\\u003c')}</script>`);
}

// ---------- footer güven şeridi (her sayfada, footer alt satırının üstünde) ----------
const LAW = {firm: 'ACG Advogada', lawyer: 'Dra. Ana Carolina', oab: 'OAB/SP 386.588', verify: 'https://cna.oab.org.br/'};
// Güvence rozetleri (ödül/sertifika görünümünde, içerik gerçek bilgilerden oluşur).
const YEAR = () => new Date().getFullYear();
const scallop = (n, ro, ri, c = 70) => { const p = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, t = Math.PI * i / n; p.push((c + r * Math.sin(t)).toFixed(2) + ',' + (c - r * Math.cos(t)).toFixed(2)); } return 'M' + p.join('L') + 'Z'; };
const SCALLOP = scallop(30, 69, 64);
const SCALE_ICON = (x, y, c) => `<g transform="translate(${x} ${y})" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M0 -15V15M-9 15H9M-14 -9H14M0 -15l0 0"/><circle cx="0" cy="-16" r="1.8" fill="${c}"/><path d="M-14 -9l-6 12h12zM14 -9l-6 12h12z"/><path d="M-20 3a6 3 0 0 0 12 0M8 3a6 3 0 0 0 12 0" fill="${c}" fill-opacity=".25"/></g>`;
function ribbon({id, bg1, bg2, gold, crest, lines, year, href, label}) {
  let y = 92; const t = lines.map(([txt, size, weight, color, gap]) => { y += gap ?? size + 4; return `<text x="60" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${color || '#fff'}" letter-spacing="${size < 8 ? 1.2 : .6}">${txt}</text>`; }).join('');
  const svg = `<svg viewBox="0 0 120 236" role="img" aria-label="${label}"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e3a1"/><stop offset=".5" stop-color="${gold}"/><stop offset="1" stop-color="#9a7120"/></linearGradient></defs>
    <path d="M0 0H120V236L60 206L0 236Z" fill="url(#${id}g)"/><path d="M5 5H115V225L60 197L5 225Z" fill="none" stroke="url(#${id}a)" stroke-width="1"/><path d="M9 9H111V218L60 192L9 218Z" fill="none" stroke="url(#${id}a)" stroke-opacity=".35" stroke-width=".6"/>
    ${crest(`url(#${id}a)`)}${t}
    <path d="M30 ${y + 10}H90" stroke="url(#${id}a)" stroke-width=".8"/><text x="60" y="${y + 28}" text-anchor="middle" font-size="13" font-weight="800" fill="url(#${id}a)" letter-spacing="2">${year}</text></svg>`;
  return href ? `<a class="aw aw-rib" href="${href}" target="_blank" rel="noopener" title="${label}">${svg}</a>` : `<span class="aw aw-rib" title="${label}">${svg}</span>`;
}
function rosette({id, c1, c2, ring, center, band, label}) {
  const svg = `<svg viewBox="0 0 140 140" role="img" aria-label="${label}"><defs><radialGradient id="${id}r" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></radialGradient><path id="${id}p" d="M70,70 m-57,0 a57,57 0 1,1 114,0 a57,57 0 1,1 -114,0"/></defs>
    <path d="${SCALLOP}" fill="url(#${id}r)"/><circle cx="70" cy="70" r="62" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>
    <text font-size="8.6" font-weight="700" fill="#fff" letter-spacing="1.6"><textPath href="#${id}p" startOffset="0" textLength="350" lengthAdjust="spacing">${ring}</textPath></text>
    <circle cx="70" cy="70" r="49" fill="#fff"/><circle cx="70" cy="70" r="45.5" fill="none" stroke="${c1}" stroke-width="1.2"/><circle cx="70" cy="70" r="43" fill="none" stroke="${c1}" stroke-opacity=".35" stroke-width=".6" stroke-dasharray="1.5 2"/>
    ${center(c1)}
    <path d="M24 88H116L111 97L116 106H24L29 97Z" fill="${c1}"/><path d="M24 88L31 83V88M116 88L109 83V88" fill="${c1}" opacity=".55"/><text x="70" y="100.5" text-anchor="middle" font-size="9.5" font-weight="800" fill="#fff" letter-spacing="1.8">${band}</text></svg>`;
  return `<span class="aw aw-ros" title="${label}">${svg}</span>`;
}
const cText = (lines, c) => lines.map(([t, y, sz, w]) => `<text x="70" y="${y}" text-anchor="middle" font-size="${sz}" font-weight="${w || 800}" fill="${c}">${t}</text>`).join('');
function applyTrust(root, st) {
  const f = root.querySelector('footer.site-footer'), fb = f?.querySelector('.footer-bottom'); if (!f || !fb || f.querySelector('.footer-trust')) return;
  const ic = n => `<bm-i class="ic ic-${n}" aria-hidden="true"></bm-i>`;
  const iyzico = !!st?.payments?.iyzico?.enabled;
  const dd = st?.didit || {}, didit = (dd.enabled ?? process.env.DIDIT_ENABLED === 'true') && !!(dd.apiKey || process.env.DIDIT_API_KEY);
  const Y = YEAR();
  const oab = ribbon({id: 'aw1', bg1: '#1d1d1f', bg2: '#050505', gold: '#d4af37', year: Y, href: LAW.verify, label: `${LAW.firm} · ${LAW.lawyer} · ${LAW.oab} — OAB kaydını doğrula`,
    crest: g => `<circle cx="60" cy="42" r="23" fill="none" stroke="${g}" stroke-width="1.2"/><circle cx="60" cy="42" r="19.5" fill="none" stroke="${g}" stroke-width=".5"/>${SCALE_ICON(60, 44, g)}`,
    lines: [['ADVOGADA', 12.5, 800, null, 0], ['REGISTRADA', 12.5, 800], ['OAB/SP 386.588', 9, 700, '#e9c46a', 15], ['ACG ADVOGADA', 6.6, 700, '#fff', 16], ['DRA. ANA CAROLINA', 6.2, 600, '#cfcfcf', 11], ['SÃO PAULO · BRASIL', 5.6, 600, '#9a9a9a', 13]]});
  const ius = ribbon({id: 'aw2', bg1: '#14305e', bg2: '#08162e', gold: '#d4af37', year: Y, label: 'IusJud Verified',
    crest: g => `<path d="M60 20l20 7v13c0 13-9 21-20 25-11-4-20-12-20-25V27z" fill="none" stroke="${g}" stroke-width="1.3"/><text x="60" y="50" text-anchor="middle" font-size="17" font-weight="800" fill="${g}" font-family="Georgia,serif">IJ</text>`,
    lines: [['IUSJUD', 15, 800, null, 0], ['VERIFIED', 11, 700, '#e9c46a', 14], ['LEGAL PROCESS', 6.4, 700, '#fff', 19], ['ASSURANCE', 6.4, 700, '#fff', 10], ['TRUSTED PARTNER', 5.6, 600, '#a9b8d6', 14]]});
  const seals = [
    didit && rosette({id: 'aw3', c1: '#4b2fc0', c2: '#8a74ff', label: 'Didit ile biyometrik kimlik doğrulama', ring: '• DIDIT • BIOMETRIC IDENTITY VERIFICATION ', band: 'VERIFIED',
      center: c => cText([['Identity', 52, 12, 800], ['KYC', 75, 22, 900]], c)}),
    iyzico && rosette({id: 'aw4', c1: '#c8102e', c2: '#ff5a6e', label: 'iyzico ile 3D Secure ödeme', ring: '• SECURE PAYMENT • IYZICO • 3D SECURE ', band: 'PROTECTED',
      center: c => cText([['Payment', 52, 12, 800], ['3D Secure', 74, 17, 900]], c)}),
    rosette({id: 'aw5', c1: '#16632a', c2: '#4caf50', label: 'SSL şifreli bağlantı', ring: '• SECURE CONNECTION • 256-BIT ENCRYPTION ', band: 'SECURED',
      center: c => cText([['256-bit', 52, 12, 800], ['SSL', 77, 25, 900]], c)}),
    rosette({id: 'aw6', c1: '#0b5d57', c2: '#2bb3a3', label: 'KVKK ve LGPD uyumlu veri koruma', ring: '• DATA PROTECTION • PRIVACY • KVKK • LGPD ', band: 'COMPLIANT',
      center: c => cText([['KVKK', 56, 16, 900], ['& LGPD', 76, 15, 900]], c)}),
  ].filter(Boolean);
  fb.insertAdjacentHTML('beforebegin', `<div class="footer-trust"><div class="ft-head"><span class="ft-line"></span><span class="kicker">Güvenceler &amp; Sertifikalar</span><span class="ft-line"></span></div><div class="ft-awards">${oab}${seals.slice(0, Math.ceil(seals.length / 2)).join('')}${ius}${seals.slice(Math.ceil(seals.length / 2)).join('')}</div><p class="ft-legal">${ic('scale')}<span>Başvurularınız Polícia Federal ve Ministério da Justiça nezdinde, resmî kanallardan yürütülür. Hukuki işlemler <b>${LAW.firm} · ${LAW.lawyer} (${LAW.oab})</b> tarafından yürütülür. <a href="${LAW.verify}" target="_blank" rel="noopener">OAB kaydını doğrula</a></span></p></div>`);
}

// ---------- SEO ----------
function setMeta(head, attr, key, value) {
  let m = head.querySelector(`meta[${attr}="${key}"]`);
  if (!m) { head.insertAdjacentHTML('beforeend', `<meta ${attr}="${key}" content="">`); m = head.querySelector(`meta[${attr}="${key}"]`); }
  m.setAttribute('content', value);
}
function applySeo(root, path, seo = {}) {
  const head = root.querySelector('head'); if (!head) return;
  const base = siteUrl();
  if (seo.title) { const t = head.querySelector('title'); if (t) t.set_content(esc(seo.title)); setMeta(head, 'property', 'og:title', seo.title); }
  if (seo.description) { setMeta(head, 'name', 'description', seo.description); setMeta(head, 'property', 'og:description', seo.description); }
  if (seo.image) setMeta(head, 'property', 'og:image', /^https?:/.test(seo.image) ? seo.image : base + seo.image);
  if (seo.noindex) setMeta(head, 'name', 'robots', 'noindex,follow');
  if (base) {
    const c = head.querySelector('link[rel="canonical"]'); if (c) c.setAttribute('href', base + path);
    const ou = head.querySelector('meta[property="og:url"]'); if (ou) ou.setAttribute('content', base + path);
  }
}

// ---------- custom pages (blocks) ----------
const paras = s => String(s || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => `<p>${nl2br(p)}</p>`).join('');
const cta = (label, link, cls = 'btn') => !label ? '' : link === '#gorusme' ? `<button class="${cls}" type="button" onclick="book()">${esc(label)} <span>↗</span></button>` : `<a class="${cls}" href="${href(link)}">${esc(label)} <span>↗</span></a>`;
export function blocksHTML(blocks = []) {
  return blocks.map(b => {
    if (b.type === 'hero') return `<section class="service-hero wrap"><div>${b.kicker ? `<div class="kicker">${esc(b.kicker)}</div>` : ''}<h1>${esc(b.title)}</h1>${paras(b.text)}<div class="actions">${cta(b.button, b.link)}</div></div>${b.image ? `<figure><img class="service-vector page-art" src="${href(b.image)}" alt="${esc(b.alt || b.title)}" decoding="async"></figure>` : ''}</section>`;
    if (b.type === 'text') return `<section class="oi-sec bp-text">${b.kicker ? `<p class="oi-kicker">${esc(b.kicker)}</p>` : ''}${b.title ? `<h2 class="oi-h2">${esc(b.title)}</h2>` : ''}<div class="bp-body">${paras(b.text)}</div></section>`;
    if (b.type === 'cards') return `<section class="oi-sec">${b.kicker ? `<p class="oi-kicker">${esc(b.kicker)}</p>` : ''}${b.title ? `<h2 class="oi-h2">${esc(b.title)}</h2>` : ''}<div class="bp-cards">${(b.items || []).map((it, i) => `<article><span class="oi-num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(it.title)}</h3>${paras(it.text)}</article>`).join('')}</div></section>`;
    if (b.type === 'faq') return `<section class="oi-sec">${b.title ? `<h2 class="oi-h2">${esc(b.title)}</h2>` : ''}<div class="bp-faq">${(b.items || []).map(it => `<details><summary>${esc(it.title)}</summary>${paras(it.text)}</details>`).join('')}</div></section>`;
    if (b.type === 'image') return b.image ? `<section class="oi-sec"><figure class="bp-img"><img src="${href(b.image)}" alt="${esc(b.alt)}" loading="lazy">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure></section>` : '';
    if (b.type === 'cta') return `<section class="oi-sec"><div class="bp-cta"><div><h2>${esc(b.title)}</h2>${paras(b.text)}</div>${cta(b.button, b.link)}</div></section>`;
    return '';
  }).join('\n');
}
async function shell() { return await readStatic('/kaynaklar/'); }
async function renderCustom(page, path) {
  const sh = await shell(); if (!sh) return null;
  const root = parseHTML(sh);
  const main = root.querySelector('main#main'); main.set_content(`<div class="bp-page">${blocksHTML(page.blocks)}</div>`);
  root.querySelector('body')?.setAttribute('data-page', 'custom');
  const head = root.querySelector('head');
  head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="/bm/oturum.css?v=4"><link rel="stylesheet" href="/bm/sayfa.css?v=1">');
  root.querySelectorAll('head link[rel="stylesheet"]').filter(l => /kaynak/.test(l.getAttribute('href') || '')).forEach(l => l.remove());
  root.querySelectorAll('body script').filter(s => /\/bm\/(?!session)/.test(s.getAttribute('src') || '')).forEach(s => s.remove());
  applySeo(root, path, {title: (page.seo?.title || page.title + ' | Brazil Migration'), description: page.seo?.description || page.description || '', image: page.seo?.image, noindex: page.seo?.noindex});
  return root;
}

// ---------- blog ----------
async function renderBlog(path, st, preview) {
  const sh = await shell(); if (!sh) return null;
  const posts = Object.values(st?.blog || {}).filter(p => p.published);
  const m = BLOG_POST.exec(path);
  const post = preview || (m ? st?.blog[m[1]] : null);
  if (m && !preview && !post?.published) return null;
  const root = parseHTML(sh);
  root.querySelector('main#main').set_content(post ? blogPostHTML(post, posts) : blogIndexHTML(posts));
  root.querySelector('body')?.setAttribute('data-page', 'blog');
  const head = root.querySelector('head');
  head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="/bm/blog.css?v=1">' + (post ? blogJsonLd(post) : ''));
  root.querySelectorAll('head link[rel="stylesheet"]').filter(l => /kaynak/.test(l.getAttribute('href') || '')).forEach(l => l.remove());
  root.querySelectorAll('body script').filter(s => /\/bm\/(?!session)/.test(s.getAttribute('src') || '')).forEach(s => s.remove());
  root.querySelector('body').insertAdjacentHTML('beforeend', '<script src="/bm/blog.js?v=1" defer></script>');
  if (post) {
    applySeo(root, '/blog/' + post.slug + '/', {title: post.seo?.title || post.title + ' | Brazil Migration Blog', description: post.seo?.description || post.excerpt || '', image: post.cover, noindex: post.seo?.noindex || !!preview});
    const h = root.querySelector('head'); setMeta(h, 'property', 'og:type', 'article'); setMeta(h, 'property', 'article:published_time', post.date); if (post.modified) setMeta(h, 'property', 'article:modified_time', post.modified);
  } else applySeo(root, '/blog/', {title: 'Blog: Brezilya’da oturum, vatandaşlık ve yaşam rehberi | Brazil Migration', description: 'Brezilya oturum izni, vatandaşlık, şirket kurulumu ve São Paulo’da yaşam üzerine kaynaklı, güncel Türkçe rehber yazılar.'});
  return root;
}

// ---------- icons: text glyphs (↗ ✓ ⌄ × …) → icon library (/bm/icons.css, see server/platform/icons.mjs) ----------
export function arrowize(html) {
  html = iconizeHTML(html);
  if (!html.includes('/bm/icons.css')) html = html.replace('</head>', '<link rel="stylesheet" href="/bm/icons.css?v=4"></head>');
  if (!html.includes('/bm/icons.js')) html = html.replace(/<\/body>(?![\s\S]*<\/body>)/, '<script src="/bm/icons.js?v=4" defer></script></body>');
  return html;
}

// ---------- render ----------
const renderCache = new Map();
export async function renderPage(db, path, {editor = false, preview = null} = {}) {
  const st = preview ? null : await siteState(db);
  const ckey = path + '|' + (st?.stamp || '');
  if (!editor && !preview && renderCache.has(ckey)) return renderCache.get(ckey);
  const staticHtml = await readStatic(path);
  const page = st?.pages[path] || {};
  let root, status = 200;
  if (preview?.blog) root = await renderBlog(path, st || await siteState(db), preview.blog);
  else if (preview) root = await renderCustom(preview, path);
  else if (staticHtml) {
    if (page.hidden && !editor) return {status: 404, html: await notFound(db)};
    root = parseHTML(staticHtml);
    applyOverrides(root, page.overrides, editor);
    if (!editor) applySeo(root, path, page.seo);
  } else if (path === '/blog/' || BLOG_POST.test(path)) root = await renderBlog(path, st);
  else if (st?.custom[path] && (st.custom[path].published || editor)) root = await renderCustom(st.custom[path], path);
  else return {status: 404, html: await notFound(db)};
  if (!root) return {status: 404, html: await notFound(db)};
  if (st?.menu || preview) applyMenu(root, (st || await siteState(db)).menu);
  try { const S = st || await siteState(db); applyCompany(root, S.company); applyTrust(root, S); } catch {}
  let html = '<!doctype html>' + root.toString().replace(/^<!doctype html>/i, '');
  if (siteUrl()) html = html.replace(OLD_HOSTS, siteUrl());
  html = arrowize(html);
  const out = {status, html};
  if (!editor && !preview) { if (renderCache.size > 200) renderCache.clear(); renderCache.set(ckey, out); }
  return out;
}
async function notFound(db) {
  const sh = await shell(); if (!sh) return '<h1>Sayfa bulunamadı</h1>';
  const root = parseHTML(sh);
  root.querySelector('main#main')?.set_content('<section class="wrap" style="padding:90px 0 110px;text-align:center"><div class="kicker">404</div><h1 style="margin:10px 0 14px">Aradığınız sayfa bulunamadı.</h1><p style="color:var(--muted)">Sayfa taşınmış veya kaldırılmış olabilir.</p><p><a class="btn" href="/">Ana sayfaya dön ↗</a></p></section>');
  const t = root.querySelector('title'); if (t) t.set_content('Sayfa bulunamadı | Brazil Migration');
  try { const st = await siteState(db); if (st.menu) applyMenu(root, st.menu); applyCompany(root, st.company); applyTrust(root, st); } catch {}
  return arrowize('<!doctype html>' + root.toString().replace(/^<!doctype html>/i, ''));
}

// Editor document: the page with saved changes applied, every editable element tagged, scripts removed.
export async function editorHTML(db, path) {
  const staticHtml = await readStatic(path); if (!staticHtml) return null;
  const st = await siteState(db);
  const root = parseHTML(staticHtml);
  const tags = editables(root);
  for (const e of tags) { e.el.setAttribute('data-bm-k', e.key); e.el.setAttribute('data-bm-t', e.kind); }
  applyOverrides(root, st.pages[path]?.overrides, true);
  if (st.menu) applyMenu(root, st.menu);
  root.querySelectorAll('script').forEach(s => { if (!/theme\.js/.test(s.getAttribute('src') || '')) s.remove(); });
  root.querySelectorAll('[onclick]').forEach(el => el.removeAttribute('onclick'));
  return '<!doctype html>' + root.toString().replace(/^<!doctype html>/i, '');
}

export async function sitemapXML(db) {
  const st = await siteState(db), base = siteUrl() || '';
  const today = new Date().toISOString().slice(0, 10);
  const urls = (await staticPages()).filter(p => !st.pages[p.path]?.hidden && !st.pages[p.path]?.seo?.noindex && !['/giris/', '/icerik-plani/'].includes(p.path)).map(p => p.path);
  for (const c of Object.values(st.custom)) if (c.published && !c.seo?.noindex) urls.push(c.path);
  const posts = Object.values(st.blog).filter(p => p.published && !p.seo?.noindex);
  if (posts.length) urls.push('/blog/');
  const lm = {}; for (const p of posts) { urls.push('/blog/' + p.slug + '/'); lm['/blog/' + p.slug + '/'] = p.modified || p.date; }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${esc(base + u)}</loc><lastmod>${lm[u] || today}</lastmod></url>`).join('')}</urlset>`;
}
