'use strict';
// AI Asistan (Faz 4): belge özeti, eksik belge tespiti, mesaja taslak yanıt, görüşme notundan görev. Hiçbir çıktı kendiliğinden gitmez: hepsi “onay bekleyen taslak”tır.
// Arka uç: /api/platform/admin/ai/*. Sonuç garantisi içeren metin onaylanamaz.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const dt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}) : '');
  const TYPE = {reply: 'Yanıt / mesaj', task: 'Görev', 'doc-summary': 'Belge özeti'};
  let ST = null, DR = [], CU = [], SELC = null, DOCS = [], BUSY = false;

  const page = () => {
    setTimeout(async () => { const root = $('#bai-root'); if (!root) return; try { [ST, DR, CU] = [await A('ai/status'), (await A('ai/drafts')).drafts, (await A('ai/customers')).customers]; draw(); } catch (e) { if (root && e.message !== 'Giriş gerekli') root.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
    return '<div class="bcs">' + heading('AI Asistan') + '<p class="bcs-sub">Taslakları siz onaylarsınız; hiçbir şey müşteriye kendiliğinden gitmez. Başvuru sonuçları garanti edilmez.</p><div id="bai-root"><div class="loading">Yükleniyor…</div></div></div>';
  };
  const draftCard = d => '<article class="bcs-card" style="cursor:default" data-id="' + d.id + '"><b>' + esc(d.title || TYPE[d.type] || 'Taslak') + '</b><small>' + esc(d.customer) + ' · ' + (TYPE[d.type] || d.type) + ' · ' + dt(d.at) + ' · ' + (d.by === 'ai' ? '🤖 yapay zekâ' : '⚙️ kural tabanlı') + (d.lang ? ' · ' + d.lang.toUpperCase() : '') + '</small>' +
    (d.replyTo ? '<small>Yanıtlanan: “' + esc(d.replyTo) + '”</small>' : '') +
    (d.flags && d.flags.length ? '<div class="bmc-err">⚠ Sonuç garantisi ifadesi var; onaylamadan önce kaldırın.</div>' : '') +
    (d.type === 'reply' && d.subject ? '<input data-bai-subject maxlength="150" value="' + esc(d.subject) + '" placeholder="Konu (e-posta için)">' : '') +
    '<textarea data-bai-text rows="' + (d.type === 'task' ? 2 : 6) + '" maxlength="4000"' + (d.lang === 'fa' ? ' dir="rtl"' : '') + '>' + esc(d.text || '') + '</textarea>' +
    (d.type === 'task' ? '<label>Son tarih <input type="date" data-bai-due value="' + esc(d.due || '') + '"></label>' : '') +
    '<div class="bcs-bar">' + (d.type === 'reply' ? '<select data-bai-ch><option value="app">Uygulama içi (panel)</option><option value="email">E-posta</option></select>' : '') +
    '<button class="btn small" data-bai-ok="' + d.id + '">Onayla' + (d.type === 'reply' ? ' ve gönder' : d.type === 'task' ? ' ve görev aç' : ' ve belgeye ekle') + '</button><button class="btn small danger" data-bai-no="' + d.id + '">Reddet</button></div></article>';
  function draw() {
    const root = $('#bai-root'); if (!root) return;
    const sel = SELC ? CU.find(c => c.id === SELC) : null;
    root.innerHTML = '<section class="panel bcs-p"><header class="panel-head"><h2>Durum</h2>' + (ST.configured ? '<span class="bcs-chip ok">Yapay zekâ bağlı (' + esc(ST.model) + ')</span>' : '<span class="bcs-chip warn">Yapay zekâ anahtarı yok — kural tabanlı yedek çalışıyor</span>') + '</header>' +
      '<p class="bcs-hint">' + (ST.configured ? 'Yapay zekâ yanıt/özet/görev çıkarırken yalnız gerekli bağlamı (ad, hizmet, aşama, ilgili metin) gönderir; e-posta, telefon ve kimlik numarası gönderilmez. <b>Belge özeti</b> seçildiğinde belge dosyası modele gönderilir — müşterinin bu işlemeye uygun olduğundan emin olun (KVKK/LGPD).' : 'Eksik belge listesi, karşılama taslağı ve görev çıkarma yedek yöntemle çalışır. Daha akıllı yanıt ve belge özeti için Ayarlar → Yapay Zekâ bölümüne Anthropic anahtarınızı ekleyin.') + '</p></section>' +
      '<section class="panel bcs-p"><header class="panel-head"><h2>Müşteri için çalıştır</h2></header><div class="bcs-bar"><select id="bai-cust"><option value="">Müşteri seçin…</option>' + CU.map(c => '<option value="' + esc(c.id) + '"' + (c.id === SELC ? ' selected' : '') + '>' + esc(c.name + ' · ' + c.email) + '</option>').join('') + '</select></div>' +
      (sel ? '<div class="bcs-bar"><button class="btn small" data-bai-run="missing"' + (sel.caseId ? '' : ' disabled title="Başvurusu yok"') + '>Eksik belgeleri tespit et</button><button class="btn small" data-bai-run="reply">Son mesaja taslak yanıt hazırla</button></div>' +
      '<details><summary>Görüşme notundan görev çıkar</summary><textarea id="bai-notes" rows="5" maxlength="20000" placeholder="Görüşme notunu veya dökümü yapıştırın…"></textarea><div class="bcs-bar"><button class="btn small" data-bai-run="tasks">Görevleri çıkar</button></div></details>' +
      '<details><summary>Belge özeti (' + DOCS.length + ' belge)</summary>' + (DOCS.length ? '<ul class="bcs-ul">' + DOCS.map(d => '<li><b>' + esc(d.title) + '</b> <small>' + esc(d.mime) + ' · ' + esc(d.status) + '</small> <button class="btn small" data-bai-doc="' + d.id + '">Özetle</button>' + (d.summarized ? '<div class="bcs-hint">' + esc(d.summary).replace(/\n/g, '<br>') + '</div>' : '') + '</li>').join('') + '</ul>' : '<p class="bcs-hint">Bu müşterinin belgesi yok.</p>') + '</details>' : '<p class="bcs-hint">İşlem yapmak için bir müşteri seçin.</p>') + '</section>' +
      '<section class="panel bcs-p"><header class="panel-head"><h2>Onay bekleyen taslaklar (' + DR.length + ')</h2></header><div class="bcs-board bcs-board3" style="grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">' + (DR.length ? DR.map(draftCard).join('') : '<p class="bcs-hint">Bekleyen taslak yok.</p>') + '</div></section>';
  }
  const reload = async () => { ST = await A('ai/status'); DR = (await A('ai/drafts')).drafts; if (SELC) DOCS = (await A('ai/docs?customer=' + encodeURIComponent(SELC))).docs; draw(); };

  document.addEventListener('change', async e => {
    if (e.target.id !== 'bai-cust') return;
    try { SELC = e.target.value || null; DOCS = SELC ? (await A('ai/docs?customer=' + encodeURIComponent(SELC))).docs : []; draw(); } catch (err) { say(err.message); }
  });
  document.addEventListener('click', async e => {
    const t = e.target, $c = s => t.closest(s); let b;
    try {
      if ((b = $c('[data-bai-run]'))) {
        if (BUSY) return; BUSY = true; b.disabled = true; const c = CU.find(x => x.id === SELC), k = b.dataset.baiRun;
        try {
          let r;
          if (k === 'missing') { r = await A('ai/missing', 'POST', {caseId: c.caseId}); say(r.missing.length ? r.missing.length + ' eksik belge bulundu; taslak mesaj hazırlandı.' : 'Eksik belge yok 🎉'); }
          if (k === 'reply') { r = await A('ai/draft-reply', 'POST', {customerId: SELC}); say('Taslak hazır' + (r.source === 'rule' ? ' (yedek yöntem)' : '') + '.'); }
          if (k === 'tasks') { const text = $('#bai-notes').value; r = await A('ai/tasks', 'POST', {customerId: SELC, caseId: c.caseId || undefined, text}); say(r.none ? 'Notta görev bulunamadı.' : r.ids.length + ' görev taslağı hazır.'); }
        } finally { BUSY = false; }
        await reload(); return;
      }
      if ((b = $c('[data-bai-doc]'))) { if (BUSY) return; if (ST.configured && !confirm('Belge dosyası özetlenmek üzere yapay zekâ servisine gönderilecek. Devam edilsin mi?')) return; BUSY = true; b.disabled = true; try { await A('ai/doc-summary', 'POST', {documentId: b.dataset.baiDoc}); say('Özet taslağı hazır; onay bekleyenlere eklendi.'); } finally { BUSY = false; } await reload(); return; }
      if ((b = $c('[data-bai-ok]'))) {
        const card = b.closest('article'), body = {id: b.dataset.baiOk, text: card.querySelector('[data-bai-text]').value}, ch = card.querySelector('[data-bai-ch]'), sub = card.querySelector('[data-bai-subject]'), due = card.querySelector('[data-bai-due]');
        if (ch) body.channel = ch.value; if (sub) body.subject = sub.value; if (due) body.due = due.value;
        if (ch && !confirm(ch.value === 'email' ? 'Bu metin müşteriye E-POSTA ile gönderilsin mi?' : 'Bu metin müşteriye panelden mesaj olarak gönderilsin mi?')) return;
        await A('ai/drafts/approve', 'POST', body); say('Onaylandı.'); await reload(); return;
      }
      if ((b = $c('[data-bai-no]'))) { await A('ai/drafts/reject', 'POST', {id: b.dataset.baiNo}); await reload(); return; }
    } catch (err) { say(err.message); }
  });

  const routes = {aiasistan: page};
  Object.assign(names, {aiasistan: 'AI Asistan'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav) {
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    let g = sum('İletişim');
    if (!g) { g = document.createElement('details'); g.innerHTML = '<summary>İletişim</summary><div class="dropdown"></div>'; (sum('Partner Ağı') || sum('Satış') || sum('Dosyalar') || {after: n => nav.appendChild(n)}).after(g); }
    const dd = g.querySelector('.dropdown'); if (dd && !dd.querySelector('a[href="#aiasistan"]')) dd.insertAdjacentHTML('beforeend', '<a href="#aiasistan">AI Asistan</a>');
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bai-root')) render(); }, 350);
})();
