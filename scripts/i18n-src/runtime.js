// Panel dil katmanı (Türkçe · English · فارسی). Müşteri ve danışman panellerinde çalışır; web sitesine eklenmez.
// Sayfalar Türkçe üretilir; seçilen dilde metin düğümleri ve öznitelikler sözlükten çevrilir (MutationObserver).
(() => {
  const LANGS = {tr: {label: 'Türkçe', short: 'TR'}, en: {label: 'English', short: 'EN', locale: 'en-GB'}, fa: {label: 'فارسی', short: 'FA', locale: 'fa-IR-u-nu-latn', dir: 'rtl'}};
  let lang = 'tr';
  try { const s = localStorage.getItem('bm-lang'); if (LANGS[s]) lang = s; } catch {}
  const setLang = l => { if (!LANGS[l]) return; try { localStorage.setItem('bm-lang', l); } catch {} location.reload(); };
  window.BMLang = {get lang() { return lang; }, set: setLang, langs: LANGS};

  const html = document.documentElement;
  if (lang !== 'tr') {
    const col = lang === 'en' ? 1 : 2, MAP = new Map();
    for (const r of __DICT__) if (r[col]) MAP.set(r[0], r[col]);
    const keys = [...MAP.keys()].filter(k => k.length >= 4 || /\s/.test(k)).sort((a, b) => b.length - a.length);
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const RE = new RegExp('(?<![\\p{L}\\p{N}])(?:' + keys.map(esc).join('|') + ')(?![\\p{L}])', 'gu');
    const T = s => {
      if (!s || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(s)) return s;
      const t = s.trim(); if (!t) return s;
      const hit = MAP.get(t);
      if (hit !== undefined) return s.replace(t, hit);
      return s.replace(RE, m => MAP.get(m) ?? m);
    };
    window.BMLang.t = T;
    html.lang = lang; if (LANGS[lang].dir) html.dir = 'rtl';

    const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT']);
    const ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-title'];
    const done = new WeakMap();
    const skipEl = el => !el || SKIP.has(el.tagName) || el.closest?.('[data-no-i18n],[contenteditable="true"],.profile strong,.avatar,.bm-name');
    const textNode = n => {
      if (done.get(n) === n.data) return;
      const p = n.parentElement; if (skipEl(p)) return;
      const v = T(n.data); if (v !== n.data) n.data = v; done.set(n, n.data);
    };
    const element = el => {
      if (skipEl(el)) return;
      for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const t = T(v); if (t !== v) el.setAttribute(a, t); } }
      if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value) el.value = T(el.value);
    };
    const walk = root => {
      if (root.nodeType === 3) return textNode(root);
      if (root.nodeType !== 1 || skipEl(root)) return;
      element(root);
      const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? textNode(n) : element(n);
    };
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') textNode(m.target);
        else if (m.type === 'attributes') element(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(html, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS});
    if (document.body) walk(document.body);
    document.addEventListener('DOMContentLoaded', () => { walk(document.body); document.title = T(document.title); });

    // Tarayıcı pencereleri
    for (const fn of ['alert', 'confirm', 'prompt']) { const o = window[fn]; window[fn] = (msg, ...rest) => o.call(window, T(String(msg ?? '')), ...rest); }
    // Tarih ve sayı biçimleri: 'tr-TR' isteyen kodlar seçilen dile göre biçimlenir.
    const L = LANGS[lang].locale, fix = loc => (loc === undefined || /^tr\b/i.test(Array.isArray(loc) ? loc[0] : loc)) ? L : loc;
    for (const k of ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']) { const o = Date.prototype[k]; Date.prototype[k] = function (loc, opt) { return o.call(this, fix(loc), opt); }; }
    { const o = Number.prototype.toLocaleString; Number.prototype.toLocaleString = function (loc, opt) { return o.call(this, fix(loc), opt); }; }
    { const o = String.prototype.localeCompare; String.prototype.localeCompare = function (b, loc, opt) { return o.call(this, b, fix(loc), opt); }; }
    for (const k of ['DateTimeFormat', 'NumberFormat', 'RelativeTimeFormat', 'PluralRules']) {
      const O = Intl[k]; if (!O) continue;
      const W = function (loc, opt) { return new O(fix(loc), opt); }; W.prototype = O.prototype; W.supportedLocalesOf = O.supportedLocalesOf; Intl[k] = W;
    }
    if (lang === 'fa') {
      const f = document.createElement('link'); f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap'; document.head.appendChild(f);
    }
  }

  // Dil seçici (üst çubuk)
  const css = `.bm-lang{position:relative;display:inline-flex;align-items:center;margin-inline-end:8px}.bm-lang select{appearance:none;-webkit-appearance:none;border:1px solid #d6e2d3;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%231b5e20' stroke-width='1.6'/%3E%3C/svg%3E") no-repeat right 10px center;border-radius:999px;padding:7px 28px 7px 12px;font:600 12.5px/1 inherit;color:#1b5e20;cursor:pointer}[dir=rtl] .bm-lang select{background-position:left 10px center;padding:7px 12px 7px 28px}.bm-lang select:focus{outline:2px solid #a5d6a7;outline-offset:1px}
  .bm-lang-float{position:fixed;bottom:16px;inset-inline-start:16px;z-index:50}
  [dir=rtl] body{font-family:Vazirmatn,Tahoma,system-ui,sans-serif}[dir=rtl] input,[dir=rtl] select,[dir=rtl] textarea,[dir=rtl] button{font-family:inherit}
  [dir=rtl] .bm-lang select{font-family:Vazirmatn,Tahoma,sans-serif}
  [dir=rtl] table{text-align:right}[dir=rtl] th,[dir=rtl] td{text-align:right}
  [dir=rtl] input[type=email],[dir=rtl] input[type=url],[dir=rtl] input[type=tel],[dir=rtl] .ltr,[dir=rtl] code{direction:ltr;unicode-bidi:plaintext}`;
  const mount = () => {
    if (document.querySelector('.bm-lang')) return;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const box = document.createElement('label'); box.className = 'bm-lang'; box.setAttribute('data-no-i18n', '');
    box.innerHTML = `<span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Language</span><select aria-label="Language / Dil / زبان">${Object.entries(LANGS).map(([k, v]) => `<option value="${k}" ${k === lang ? 'selected' : ''}>${v.short} · ${v.label}</option>`).join('')}</select>`;
    box.querySelector('select').onchange = e => setLang(e.target.value);
    const host = document.querySelector('.topbar .account, .topbar .actions, header .account, header .top-actions');
    if (host) host.prepend(box); else { box.classList.add('bm-lang-float'); document.body.appendChild(box); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  // Panel üst çubuğu sonradan yeniden çizilirse seçiciyi geri koy
  new MutationObserver(() => {
    if (!document.body) return;
    const cur = document.querySelector('.bm-lang');
    if (!cur) return mount();
    if (cur.classList.contains('bm-lang-float')) { const host = document.querySelector('.topbar .account, .topbar .actions, header .account, header .top-actions'); if (host) { cur.classList.remove('bm-lang-float'); host.prepend(cur); } }
  }).observe(html, {childList: true, subtree: true});
})();
