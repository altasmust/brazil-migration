// Tarayıcı çevirmeni: JS ile sonradan eklenen metinleri sunucuyla aynı anahtar kuralıyla çevirir (server/platform/i18n.mjs).
(() => {
  const I = window.BM_I18N; if (!I) return;
  const T = new Map(Object.entries(I.t)), S = new Map(Object.entries(I.slugs || {}));
  const INLINE = new Set(['A','ABBR','B','BDI','BDO','BR','CITE','CODE','DATA','DFN','EM','I','IMG','KBD','MARK','Q','S','SAMP','SMALL','SPAN','STRONG','SUB','SUP','TIME','U','VAR','WBR','BM-I','SVG','INPUT','SELECT','TEXTAREA']);
  const VOID = new Set(['BR','IMG','WBR','INPUT','BM-I','SVG','SELECT','TEXTAREA']);
  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','CODE','PRE','SVG']);
  const ATTRS = ['alt','title','placeholder','aria-label','data-tip'];
  const norm = s => String(s).replace(/[\s ]+/g, ' ').trim();
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hasWord = s => /\p{L}{2,}/u.test(s);
  const look = k => { if (!k) return null; if (T.has(k)) return T.get(k); const n = []; const pk = k.replace(/\d+(?:[.,]\d+)*/g, m => '{' + (n.push(m) - 1) + '}'); if (!n.length || !T.has(pk)) return null; return T.get(pk).replace(/\{(\d+)\}/g, (_, i) => n[+i] ?? ''); };
  const inlineOnly = el => { for (const c of el.childNodes) { if (c.nodeType !== 1) continue; if (!INLINE.has(c.tagName)) return false; if (!VOID.has(c.tagName) && !inlineOnly(c)) return false; } return true; };
  const unit = el => { const parts = []; let k = ''; const w = n => { for (const c of n.childNodes) { if (c.nodeType === 3) k += c.nodeValue; else if (c.nodeType === 1) { const i = parts.length + 1; if (VOID.has(c.tagName)) { parts.push({v: c.outerHTML}); k += `<${i}/>`; } else { const sh = c.cloneNode(false).outerHTML, cl = `</${c.tagName.toLowerCase()}>`; parts.push({o: sh.endsWith(cl) ? sh.slice(0, -cl.length) : sh, c: cl}); k += `<${i}>`; w(c); k += `</${i}>`; } } } }; w(el); return {key: norm(k), parts}; };
  const rebuild = (tr, parts) => { let o = '', i = 0, m; const re = /<(\/?)(\d+)(\/?)>/g; while ((m = re.exec(tr))) { o += esc(tr.slice(i, m.index)); i = re.lastIndex; const p = parts[+m[2] - 1]; if (p) o += m[3] ? (p.v || '') : m[1] ? (p.c || '') : (p.o || ''); } return o + esc(tr.slice(i)); };
  const done = new WeakMap(), MISS = window.BM_I18N_MISS = new Map(); const miss = (k, kind) => { if (k && hasWord(k) && !MISS.has(k)) MISS.set(k, kind); };
  const mapHref = h => { if (!h || h[0] !== '/' || h[1] === '/') return h; const m = h.match(/^([^?#]*)([?#].*)?$/); let p = m[1] || '/'; if (!p.endsWith('/') && !p.split('/').pop().includes('.')) p += '/'; return S.has(p) ? S.get(p) + (m[2] || '') : h; };
  const attrs = el => { for (const a of ATTRS) { const v = el.getAttribute(a); if (v && hasWord(v)) { const t = look(norm(v)); if (t != null && t !== v) el.setAttribute(a, t); else if (t == null) miss(norm(v), 'attr'); } } if (el.tagName === 'A' && !el.closest('[translate=no]')) { const h = el.getAttribute('href'), n = mapHref(h); if (n !== h) el.setAttribute('href', n); } };
  const visit = el => {
    if (el.nodeType === 3) { const k = norm(el.nodeValue); if (k && hasWord(k)) { const t = look(k); if (t != null && t !== k) el.nodeValue = el.nodeValue.replace(/\S[\s\S]*\S|\S/, t); else if (t == null) miss(k, 'text'); } return; }
    if (el.nodeType !== 1 || SKIP.has(el.tagName) || el.getAttribute('translate') === 'no' && el.tagName !== 'HTML' || el.classList.contains('notranslate')) return;
    attrs(el); el.querySelectorAll && el.querySelectorAll('a[href]').forEach(attrs);
    const opt = o => { const k = norm(o.textContent); if (!k || !hasWord(k) || done.get(o) === o.textContent) return; const t = look(k); if (t != null) o.textContent = t; else miss(k, 'option'); done.set(o, o.textContent); };
    if (el.tagName === 'OPTION') { opt(el); return; } el.querySelectorAll && el.querySelectorAll('option').forEach(opt);
    if (VOID.has(el.tagName)) return;
    if (el !== document.body && el.tagName !== 'HTML' && inlineOnly(el) && hasWord(el.textContent)) {
      if (done.get(el) === el.innerHTML) return;
      const {key, parts} = unit(el), t = look(key);
      if (t != null) { const h = rebuild(t, parts); if (h !== el.innerHTML) el.innerHTML = h; done.set(el, el.innerHTML); return; }
      miss(key, 'text'); for (const c of [...el.childNodes]) visit(c); done.set(el, el.innerHTML); return;
    }
    for (const c of [...el.childNodes]) visit(c);
  };
  const unitOf = n => { let e = n.nodeType === 1 ? n : n.parentElement; while (e && e.parentElement && e.parentElement !== document.body && INLINE.has(e.tagName) && inlineOnly(e.parentElement)) e = e.parentElement; if (e && !INLINE.has(e.tagName) && e.parentElement && inlineOnly(e)) return e; return e; };
  let q = new Set(), sched = 0;
  const flush = () => { sched = 0; const list = [...q]; q.clear(); for (const n of list) if (n.isConnected) visit(n); };
  const mo = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'childList') { m.addedNodes.forEach(n => q.add(n.nodeType === 3 ? unitOf(n) : (n.parentElement && inlineOnly(n.parentElement) && n.parentElement !== document.body ? unitOf(n) : n))); if (m.target.nodeType === 1 && inlineOnly(m.target) && m.target !== document.body) q.add(m.target); } else if (m.type === 'characterData') q.add(unitOf(m.target)); else if (m.type === 'attributes') q.add(m.target); } q.delete(null); if (!sched) sched = requestAnimationFrame(flush); });
  const start = () => { visit(document.body); mo.observe(document.documentElement, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS}); };
  // dialog/alert/confirm metinleri
  for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f]; window[f] = function (msg, ...a) { const k = norm(msg ?? ''); const t = look(k); if (t == null) miss(k, 'dialog'); return o.call(window, t ?? msg, ...a); }; }
  window.BM_T = s => look(norm(s)) ?? s;
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
