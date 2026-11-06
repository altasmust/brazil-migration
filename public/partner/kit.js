'use strict';
// Partner paneli → Referanslar: "Partner Kiti" — dört dilde hazır mesaj şablonları, referans bağlantısıyla kopyala / WhatsApp'ta paylaş, banner seti.
(() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const T = {
    tr: ['Türkçe', 'Merhaba! Brezilya’da oturum, vatandaşlık veya şirket kuruluşu düşünüyorsanız çalıştığım ekip Brazil Migration’ı öneririm. 15 dakikalık ön görüşme ücretsiz ve kendi dilinizde, canlı çeviriyle yapılıyor. Buradan randevu alabilirsiniz: {link}'],
    pt: ['Português', 'Olá! Se você conhece alguém que quer morar no Brasil (autorização de residência, cidadania ou abertura de empresa), recomendo a Brazil Migration. A primeira conversa de 15 minutos é gratuita e com tradução simultânea. Agende aqui: {link}'],
    en: ['English', 'Hi! If you are thinking about moving to Brazil (residence permit, citizenship or opening a company), I recommend Brazil Migration. The 15-minute first call is free and held in your own language with live translation. Book here: {link}'],
    fa: ['فارسی', 'سلام! اگر به اقامت، تابعیت یا ثبت شرکت در برزیل فکر می‌کنید، Brazil Migration را پیشنهاد می‌کنم. مشاوره اولیه ۱۵ دقیقه‌ای رایگان است و به زبان فارسی با ترجمه همزمان انجام می‌شود. رزرو از اینجا: {link}'],
  };
  let refs = null, sel = '', lang = 'tr';
  const linkOf = () => location.origin + (sel ? '/r/' + sel : '/');
  async function load() {
    if (refs) return refs;
    try { const r = await fetch('/api/workspace/bootstrap', {credentials: 'same-origin', cache: 'no-store'}); const d = await r.json(); refs = (d.items || []).filter(i => i.kind === 'ref').map(i => ({id: i.id, name: i.data?.name || i.id})); } catch { refs = []; }
    sel = refs[0]?.id || ''; return refs;
  }
  const msg = () => T[lang][1].replace('{link}', linkOf());
  function card() {
    return `<article class="card card-pad" id="bm-kit" style="margin-top:24px"><div class="section-head"><div><h2>Partner Kiti</h2><p>Müşterilerinize göndereceğiniz hazır mesajlar ve tanıtım görselleri</p></div></div>
    <div class="bmk-ctl">${refs.length ? `<label>Referans bağlantısı<select id="bmk-ref">${refs.map(r => `<option value="${esc(r.id)}"${r.id === sel ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>` : '<p class="subtle">Önce yukarıdan bir referans bağlantısı oluşturun; mesajlarda o bağlantı kullanılır.</p>'}
    <div class="bmk-tabs" role="tablist">${Object.entries(T).map(([k, v]) => `<button type="button" role="tab" aria-selected="${k === lang}" class="${k === lang ? 'on' : ''}" data-kl="${k}">${v[0]}</button>`).join('')}</div></div>
    <div class="bmk-msg" dir="${lang === 'fa' ? 'rtl' : 'ltr'}" lang="${lang}">${esc(msg())}</div>
    <div class="bmk-act"><button class="btn small" type="button" data-kit="copy">Mesajı kopyala</button><a class="btn secondary small" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg())}">WhatsApp’ta paylaş</a><button class="btn secondary small" type="button" data-kit="link">Yalnız bağlantıyı kopyala</button></div>
    <div class="bmk-ban"><div><b>Banner seti</b><p class="subtle">Web siteniz ve sosyal medya için 1080×1080, 1200×628 ve dikey boyutlarda hazır görseller.</p></div><a class="btn secondary small" href="/partner/banner/brazil-migration-banner-seti.zip" download>Banner setini indir (ZIP)</a></div></article>`;
  }
  const copy = async t => { try { await navigator.clipboard.writeText(t); (window.toast || alert)('Kopyalandı.'); } catch { prompt('Kopyalayın:', t); } };
  function redraw() { const el = document.getElementById('bm-kit'); if (el) el.outerHTML = card(); }
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-kl]'); if (k) { lang = k.dataset.kl; redraw(); return; }
    const a = e.target.closest('[data-kit]'); if (a) copy(a.dataset.kit === 'link' ? linkOf() : msg());
  });
  document.addEventListener('change', e => { if (e.target.id === 'bmk-ref') { sel = e.target.value; redraw(); } });
  async function place() {
    if (location.hash !== '#affiliate' && location.hash !== '#extra-liveaffiliate') return;
    const root = document.getElementById('content'); if (!root || root.querySelector('#bm-kit') || !root.querySelector('.card')) return;
    await load(); if (root.querySelector('#bm-kit')) return;
    root.insertAdjacentHTML('beforeend', card());
  }
  const css = document.createElement('style');
  css.textContent = '.bmk-ctl{display:flex;justify-content:space-between;align-items:end;gap:14px;flex-wrap:wrap;margin-bottom:12px}.bmk-ctl label{display:grid;gap:5px;font-size:13px;font-weight:600}.bmk-ctl select{font:inherit;border:1px solid #d7dfd2;border-radius:10px;padding:8px 10px}.bmk-tabs{display:flex;gap:6px;flex-wrap:wrap}.bmk-tabs button{border:1px solid #dfe5d8;background:#fff;border-radius:999px;padding:6px 13px;font:inherit;font-size:13px;cursor:pointer}.bmk-tabs button.on{background:#1b5e20;color:#fff;border-color:#1b5e20}.bmk-msg{background:#f6f9f3;border:1px solid #e3e8de;border-radius:12px;padding:14px 16px;line-height:1.7;white-space:pre-wrap;word-break:break-word}.bmk-act{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.bmk-ban{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;border-top:1px solid #eef1eb;padding-top:16px}.bmk-ban p{margin:4px 0 0}';
  document.head.appendChild(css);
  const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(place, 150); });
  const start = () => { const c = document.getElementById('content'); if (c) mo.observe(c, {childList: true}); place(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
