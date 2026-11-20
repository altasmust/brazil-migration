'use strict';
// Müşteri paneli: dosya takibi — belge kontrol listesi (yükleme dahil), önemli tarihler ve gelişmeler.
// Başvuru ayrıntı penceresine (Hizmetlerim → Aşamaları Gör) bölüm ekler; eksik belge varsa Genel Bakış/Hizmetlerim sayfasında uyarı gösterir.
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fd = d => String(d).split('-').reverse().join('.');
  let CASES = null, loading = null, injecting = false;
  const api = async (path, body) => {
    const r = await fetch('/api/platform/' + path, {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'same-origin'});
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.'); return d;
  };
  const load = (force) => { if (force) CASES = null; if (CASES) return Promise.resolve(CASES); return loading ||= api('case/mine').then(d => (CASES = d.cases || [])).catch(() => (CASES = [])).finally(() => { loading = null; }); };
  const ICON = {bekleniyor: '•', yuklendi: '↑', onaylandi: '✓', reddedildi: '!', gerekmiyor: '–'};
  const LABEL = {bekleniyor: 'Bekleniyor', yuklendi: 'Yüklendi, inceleniyor', onaylandi: 'Onaylandı', reddedildi: 'Yeniden yükleyin', gerekmiyor: 'Gerekmiyor'};
  const chip = n => '<span class="cs-chip ' + (n < 0 ? 'bad' : n <= 14 ? 'warn' : '') + '">' + (n < 0 ? Math.abs(n) + ' gün geçti' : n === 0 ? 'bugün' : n === 1 ? 'yarın' : n + ' gün kaldı') + '</span>';

  function section(c) {
    const p = c.progress, pct = p.total ? Math.round(p.have / p.total * 100) : 0;
    const items = c.checklist.filter(x => x.status !== 'gerekmiyor').map(x => {
      const can = x.status === 'bekleniyor' || x.status === 'reddedildi' || x.status === 'yuklendi';
      return '<li class="cs-' + x.status + '"><span class="cs-ic" aria-hidden="true">' + ICON[x.status] + '</span><div class="cs-tx"><b>' + esc(x.name) + '</b>' + (x.required ? '' : ' <small>(isteğe bağlı)</small>') +
        (x.hint ? '<small>' + esc(x.hint) + '</small>' : '') + '<small class="cs-st">' + LABEL[x.status] + (x.note ? ' — ' + esc(x.note) : '') + '</small></div>' +
        (can ? '<label class="cs-up">' + (x.status === 'yuklendi' ? 'Yenile' : 'Yükle') + '<input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" data-cs-up="' + c.applicationId + '|' + x.id + '|' + esc(x.name) + '"></label>' : '') + '</li>';
    }).join('');
    const dl = c.deadlines.length ? '<h3>Önemli tarihler</h3><ul class="cs-dl">' + c.deadlines.map(d => '<li><span>' + esc(d.label) + '</span><b>' + fd(d.date) + '</b>' + chip(d.days) + '</li>').join('') + '</ul>' : '';
    const ev = c.events.length ? '<h3>Gelişmeler</h3><ul class="cs-ev">' + c.events.map(e => '<li><small>' + new Date(e.t).toLocaleString('tr-TR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}) + '</small>' + esc(e.text) + '</li>').join('') + '</ul>' : '';
    return '<div class="cs-box" data-cs-case="' + c.applicationId + '"><h3>Belge kontrol listesi</h3><div class="cs-prog"><div><i style="width:' + pct + '%"></i></div><small>' + p.have + '/' + p.total + ' gerekli belge alındı</small></div>' +
      (items ? '<ul class="cs-chk">' + items + '</ul>' : '<p class="cs-none">Bu dosya için istenen belge yok.</p>') + '<p class="cs-msg" role="status" aria-live="polite"></p>' + dl + ev + '</div>';
  }

  // Başvuru penceresi: "Başvuru" satırındaki ilk 8 karakterden dosyayı bulur.
  async function decorateModal() {
    const box = document.getElementById('modal-content'); if (!box || injecting || box.querySelector('.cs-box')) return;
    const li = [...box.querySelectorAll('.detail-list li')].find(x => x.firstElementChild && x.firstElementChild.textContent.trim() === 'Başvuru'); if (!li) return;
    const code = li.textContent.replace('Başvuru', '').trim(); if (code.length < 6) return;
    const list = await load(); const c = list.find(x => x.applicationId.startsWith(code)); if (!c || box.querySelector('.cs-box')) return;
    injecting = true; try { const html = section(c), anchor = box.querySelector('.timeline'); if (anchor) anchor.insertAdjacentHTML('afterend', html); else box.insertAdjacentHTML('beforeend', html); } finally { injecting = false; }
  }
  // Uyarı kartı: eksik veya yeniden istenen belge
  async function banner() {
    const host = document.getElementById('content'); if (!host || host.querySelector('.cs-banner')) return;
    const h = (location.hash || '#overview').slice(1); if (!['overview', 'services'].includes(h)) return;
    const list = await load(); const n = list.reduce((s, c) => s + c.progress.missing, 0), soon = list.flatMap(c => c.deadlines).filter(d => d.days >= 0 && d.days <= 30).length;
    if (!n && !soon) return; if (host.querySelector('.cs-banner')) return;
    injecting = true; try { host.insertAdjacentHTML('afterbegin', '<div class="cs-banner" role="note"><b>' + (n ? n + ' belgeniz bekleniyor' : 'Yaklaşan tarihleriniz var') + '</b><span>' + (n ? 'Hizmetlerim → Aşamaları Gör bölümünden belgelerinizi yükleyebilirsiniz.' : 'Ayrıntılar için Hizmetlerim → Aşamaları Gör.') + '</span></div>'); } finally { injecting = false; }
  }
  const watch = el => { if (!el) return; new MutationObserver(() => { if (!injecting) { decorateModal(); banner(); } }).observe(el, {childList: true, subtree: true}); };
  const init = () => { watch(document.getElementById('modal-content')); watch(document.getElementById('content')); window.addEventListener('hashchange', () => setTimeout(banner, 60)); banner(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // Yükleme: mevcut belge yükleme ucu + kontrol listesine bağlama
  document.addEventListener('change', async e => {
    const inp = e.target.closest && e.target.closest('[data-cs-up]'); if (!inp || !inp.files[0]) return;
    const [app, item, name] = inp.dataset.csUp.split('|'), box = inp.closest('.cs-box'), msg = box.querySelector('.cs-msg'), file = inp.files[0];
    msg.textContent = 'Yükleniyor…';
    try {
      const fd2 = new FormData(); fd2.append('file', file); fd2.append('kind', 'attach'); fd2.append('title', name);
      const r = await fetch('/api/workspace/upload', {method: 'POST', body: fd2, credentials: 'same-origin'}), d = await r.json().catch(() => ({}));
      if (!r.ok || !d.id) throw new Error(d.error || 'Dosya yüklenemedi.');
      await api('case/attach', {applicationId: app, itemId: item, documentId: d.id});
      const list = await load(true), c = list.find(x => x.applicationId === app); if (c) { injecting = true; try { box.outerHTML = section(c); } finally { injecting = false; } }
      const m2 = document.querySelector('.cs-box[data-cs-case="' + app + '"] .cs-msg'); if (m2) m2.textContent = '“' + name + '” alındı. Teşekkürler.';
    } catch (err) { msg.textContent = err.message; inp.value = ''; }
  });

  const css = document.createElement('style');
  css.textContent = '.cs-box{margin-top:6px}.cs-box h3{margin:18px 0 8px;font-size:15px}.cs-prog>div{height:8px;background:#e3eae3;border-radius:6px;overflow:hidden}.cs-prog i{display:block;height:100%;background:#1b5e20}.cs-prog small{color:#68776b}'
    + '.cs-chk,.cs-dl,.cs-ev{list-style:none;margin:8px 0;padding:0}.cs-chk li{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #eef1eb}.cs-ic{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:#eef1eb;font-weight:700}.cs-onaylandi .cs-ic{background:#1b5e20;color:#fff}.cs-yuklendi .cs-ic{background:#dcefdc;color:#1b5e20}.cs-reddedildi .cs-ic{background:#fde7e6;color:#a1211c}'
    + '.cs-tx{flex:1;min-width:0}.cs-tx small{display:block;color:#7b887e}.cs-tx .cs-st{color:#4d5d51}.cs-reddedildi .cs-st{color:#a1211c}.cs-up{flex:none;border:1px solid #1b5e20;color:#1b5e20;border-radius:999px;padding:5px 14px;font-size:13px;font-weight:600;cursor:pointer}.cs-up:hover{background:#1b5e20;color:#fff}'
    + '.cs-dl li{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:7px 0;border-bottom:1px solid #eef1eb}.cs-dl li span{flex:1}.cs-chip{font-size:12px;background:#eef3ea;border-radius:999px;padding:2px 10px}.cs-chip.warn{background:#fdf1d8;color:#8a5a00}.cs-chip.bad{background:#fde7e6;color:#a1211c}'
    + '.cs-ev li{padding:7px 0;border-bottom:1px solid #eef1eb;font-size:14px}.cs-ev small{display:block;color:#7b887e}.cs-msg{min-height:18px;font-size:13px;color:#1b5e20;margin:6px 0 0}.cs-none{color:#7b887e}'
    + '.cs-banner{background:#fdf6e3;border:1px solid #efe0b0;border-radius:14px;padding:12px 16px;margin:0 0 16px;display:grid;gap:2px}.cs-banner span{color:#6b5a2a;font-size:14px}';
  document.head.appendChild(css);
})();
