'use strict';
// Gizlilik ve Uyum (Faz 5): veri talepleri, aydınlatma metni üretici, rıza kayıtları, müşteri veri işlemleri (indir/sil), denetim izi.
// Arka uç: /api/platform/admin/privacy/*. Metin üretici hukuki tavsiye değildir.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const dt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '');
  const chip = (t, c) => '<span class="bcs-chip ' + (c || '') + '">' + esc(t) + '</span>';
  const TABS = [['talepler', 'Veri talepleri'], ['metin', 'Aydınlatma metni'], ['riza', 'Rıza kayıtları'], ['islem', 'Müşteri veri işlemleri'], ['denetim', 'Denetim izi']];
  let TAB = 'talepler', CFG = null, PREV = null, REQ = [], CON = null, AUD = null, CUS = [], PLANG = 'tr';

  const page = () => {
    setTimeout(async () => { try { await show(); } catch (e) { const r = $('#bpv-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
    return '<div class="bcs">' + heading('Gizlilik ve Uyum') + '<p class="bcs-sub">KVKK · LGPD · GDPR: aydınlatma metni, rıza kayıtları, veri talepleri, silme ve denetim izi.</p><div id="bpv-root"><div class="loading">Yükleniyor…</div></div></div>';
  };
  async function show() {
    if (TAB === 'talepler') REQ = (await A('privacy/requests?status=all')).requests;
    if (TAB === 'metin') { const d = await A('privacy/settings?lang=' + PLANG); CFG = d; PREV = d.preview; }
    if (TAB === 'riza') CON = await A('privacy/consents');
    if (TAB === 'denetim') AUD = await A('privacy/audit');
    if (TAB === 'islem' && !CUS.length) CUS = (await A('ai/customers')).customers;
    draw();
  }
  const tabs = () => '<div class="bcm-tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 14px">' + TABS.map(([k, v]) => '<button type="button" class="btn small ' + (k === TAB ? '' : 'ghost') + '" data-bpv-tab="' + k + '">' + esc(v) + '</button>').join('') + '</div>';
  const TYPE = {delete: 'Silme', rectify: 'Düzeltme', export: 'Dışa aktarma'}, ST = {open: ['Bekliyor', 'warn'], done: ['Tamamlandı', 'ok'], rejected: ['Reddedildi', 'bad']};

  function draw() {
    const root = $('#bpv-root'); if (!root) return; let h = tabs();
    if (TAB === 'talepler') {
      const open = REQ.filter(r => r.status === 'open'), over = open.filter(r => r.overdue).length;
      h += '<section class="panel bcs-p"><header class="panel-head"><h2>Bekleyen talepler (' + open.length + ')</h2>' + (over ? chip(over + ' tanesi süresi geçmiş', 'bad') : '') + '</header>' + (open.length ? open.map(reqCard).join('') : '<p class="bcs-hint">Bekleyen talep yok. Müşteriler “Verilerim ve gizlilik” sayfasından talep oluşturur (<code>/verilerim/</code>).</p>') + '</section>' +
        '<section class="panel bcs-p"><header class="panel-head"><h2>Geçmiş</h2></header>' + (REQ.filter(r => r.status !== 'open').map(r => '<div class="bcs-card" style="cursor:default"><b>' + esc(r.name || '—') + '</b> ' + chip(TYPE[r.type] || r.type) + ' ' + chip(ST[r.status][0], ST[r.status][1]) + '<small>' + dt(r.at) + (r.doneAt ? ' → ' + dt(r.doneAt) : '') + (r.result ? ' · ' + esc(r.result) : '') + '</small></div>').join('') || '<p class="bcs-hint">Kayıt yok.</p>') + '</section>';
    }
    if (TAB === 'metin') {
      const c = CFG.config, reg = CFG.regions;
      h += '<section class="panel bcs-p"><header class="panel-head"><h2>Firma bilgileri</h2></header><form class="bcs-form" id="bpv-cfg"><div class="bsl-two"><label>Resmî unvan<input name="legalName" maxlength="160" value="' + esc(c.legalName) + '" placeholder="' + esc(CFG.firm) + '"></label><label>Başvuru e-postası <small>(talepler için)</small><input name="contactEmail" type="email" maxlength="254" value="' + esc(c.contactEmail) + '"></label></div>' +
        '<label>Adres<input name="address" maxlength="300" value="' + esc(c.address) + '"></label><label>Veri koruma sorumlusu / temsilci <small>(isteğe bağlı)</small><input name="dpo" maxlength="200" value="' + esc(c.dpo) + '"></label>' +
        '<div class="bcs-chk" style="display:flex;gap:14px;flex-wrap:wrap">' + Object.entries(reg).map(([k, v]) => '<label><input type="checkbox" name="r_' + k + '"' + (c.regions.includes(k) ? ' checked' : '') + '> ' + esc(v) + '</label>').join('') + '</div>' +
        '<label>Veri aktarılan hizmet sağlayıcılar<textarea name="processors" rows="2" maxlength="600">' + esc(c.processors) + '</textarea></label><label>Saklama süreleri<textarea name="retention" rows="2" maxlength="600">' + esc(c.retention) + '</textarea></label>' +
        '<label class="bcs-chk"><input type="checkbox" name="aiUse"' + (c.aiUse ? ' checked' : '') + '> Mesaj/belge işlemlerinde yapay zekâ destekli araç kullanıyoruz (metne eklenir)</label><div class="bcs-bar"><button class="btn" type="submit">Kaydet ve önizle</button></div></form></section>' +
        '<section class="panel bcs-p"><header class="panel-head"><h2>Önizleme</h2><span>' + ['tr', 'en', 'pt'].map(l => '<button type="button" class="btn small ' + (l === PLANG ? '' : 'ghost') + '" data-bpv-plang="' + l + '">' + l.toUpperCase() + '</button>').join(' ') + '</span></header>' + noticeHTML(PREV) + '<p class="bcs-hint">Herkese açık adres: <a href="/gizlilik-bildirimi/" target="_blank" rel="noopener"><code>/gizlilik-bildirimi/</code></a> · Müşteri veri sayfası: <code>/verilerim/</code>. ⚠ ' + esc(PREV.disclaimer) + '</p></section>';
    }
    if (TAB === 'riza') {
      h += '<form class="bcs-bar" id="bpv-cf"><input name="q" placeholder="Ad veya e-posta"><select name="type"><option value="">Tüm türler</option><option value="privacy-notice">Aydınlatma metni</option><option value="marketing">Duyuru/bülten</option></select><button class="btn small" type="submit">Filtrele</button><a class="btn small ghost" href="/api/platform/admin/privacy/consents.csv">CSV indir</a></form>' +
        '<section class="panel bcs-p"><header class="panel-head"><h2>Rıza kayıtları (' + CON.total + ')</h2></header>' + (CON.consents.length ? '<div style="overflow:auto"><table class="bcs-table" style="width:100%"><thead><tr><th>Kişi</th><th>Tür</th><th>Durum</th><th>Kaynak</th><th>Tarih</th></tr></thead><tbody>' + CON.consents.map(c => '<tr><td>' + esc(c.who) + '<br><small>' + esc(c.email) + '</small></td><td>' + esc(c.type === 'marketing' ? 'Duyuru/bülten' : 'Aydınlatma metni') + '</td><td>' + chip(c.granted ? 'Verildi' : 'Geri çekildi', c.granted ? 'ok' : 'bad') + '</td><td>' + esc(c.source) + '</td><td>' + dt(c.at) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="bcs-hint">Kayıt yok.</p>') + '</section>';
    }
    if (TAB === 'islem') {
      h += '<section class="panel bcs-p"><header class="panel-head"><h2>Müşteri veri işlemleri</h2></header><p class="bcs-hint">Dışa aktarma müşterinin tüm kayıtlarını JSON olarak indirir. <b>Silme geri alınamaz:</b> kişisel içerik ve belge dosyaları silinir, hesap anonimleştirilir; fatura, ödeme, sözleşme ve teklif kayıtları yasal saklama için kalır.</p>' +
        '<div class="bcs-bar"><select id="bpv-cust"><option value="">Müşteri seçin…</option>' + CUS.map(c => '<option value="' + esc(c.id) + '">' + esc(c.name + ' · ' + c.email) + '</option>').join('') + '</select><button class="btn small" data-bpv-exp>Verilerini indir (JSON)</button><button class="btn small danger" data-bpv-erase>Sil / anonimleştir…</button></div></section>';
    }
    if (TAB === 'denetim') {
      h += '<form class="bcs-bar" id="bpv-af"><input name="q" placeholder="İşlem veya kişi ara (ör. privacy, account)"><button class="btn small" type="submit">Ara</button><a class="btn small ghost" href="/api/platform/admin/privacy/audit.csv">CSV indir</a></form><section class="panel bcs-p"><header class="panel-head"><h2>Denetim izi (' + AUD.total + ')</h2></header>' + (AUD.audit.length ? '<div style="overflow:auto"><table class="bcs-table" style="width:100%"><thead><tr><th>Tarih</th><th>Kim</th><th>İşlem</th><th>Hedef</th></tr></thead><tbody>' + AUD.audit.map(a => '<tr><td>' + dt(a.at) + '</td><td>' + esc(a.actor) + '</td><td><code>' + esc(a.action) + '</code></td><td>' + esc(a.target) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="bcs-hint">Kayıt yok.</p>') + '</section>';
    }
    root.innerHTML = h;
  }
  const noticeHTML = n => '<h3>' + esc(n.title) + '</h3><p class="bcs-hint">' + esc(n.firm) + ' · v' + n.version + '</p>' + n.sections.map(s => '<h4>' + esc(s.h) + '</h4>' + (s.p || []).map(p => '<p>' + esc(p) + '</p>').join('') + (s.list ? '<ul>' + s.list.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '') + (s.after || []).map(p => '<p>' + esc(p) + '</p>').join('')).join('');
  const reqCard = r => '<article class="bcs-card" style="cursor:default" data-id="' + r.id + '"><b>' + esc(r.name || '—') + '</b> ' + chip(TYPE[r.type] || r.type) + ' ' + (r.overdue ? chip('Süresi geçti', 'bad') : chip(r.daysLeft + ' gün kaldı', r.daysLeft <= 5 ? 'warn' : '')) + '<small>' + esc(r.email || '') + ' · ' + dt(r.at) + ' · son yanıt ' + dt(r.due) + '</small>' + (r.note ? '<p>“' + esc(r.note) + '”</p>' : '') +
    '<div class="bcs-bar">' + (r.type === 'delete' ? '<button class="btn small danger" data-bpv-del="' + r.id + '">Sil ve tamamla…</button>' : '<button class="btn small" data-bpv-done="' + r.id + '">Tamamlandı</button>') + '<button class="btn small ghost" data-bpv-rej="' + r.id + '">Reddet…</button><button class="btn small ghost" data-bpv-expreq="' + esc(r.owner) + '">Verisini indir</button></div></article>';

  const reportText = rep => 'Silinen: ' + (Object.entries(rep.deleted).map(([k, v]) => k + ' ×' + v).join(', ') || '—') + '\nSaklanan (yasal): ' + (Object.entries(rep.retained).map(([k, v]) => k + ' ×' + v).join(', ') || '—') + '\nSilinen dosya: ' + rep.files;
  document.addEventListener('click', async e => {
    const t = e.target, $c = s => t.closest(s); let b;
    try {
      if ((b = $c('[data-bpv-tab]'))) { TAB = b.dataset.bpvTab; await show(); return; }
      if ((b = $c('[data-bpv-plang]'))) { PLANG = b.dataset.bpvPlang; await show(); return; }
      if ((b = $c('[data-bpv-done]'))) { const note = prompt('Sonuç notu (isteğe bağlı):', 'Talebiniz tamamlandı.'); if (note === null) return; await A('privacy/requests/resolve', 'POST', {id: b.dataset.bpvDone, action: 'done', note}); say('Talep tamamlandı.'); await show(); return; }
      if ((b = $c('[data-bpv-rej]'))) { const note = prompt('Ret gerekçesi (müşteriye bildirilir):', ''); if (!note) return; await A('privacy/requests/resolve', 'POST', {id: b.dataset.bpvRej, action: 'reject', note}); await show(); return; }
      if ((b = $c('[data-bpv-del]'))) { const c = prompt('Bu müşterinin kişisel verileri ve belge dosyaları KALICI olarak silinecek (mali kayıtlar anonim kalır). Onaylamak için SİL yazın:', ''); if (c === null) return; const r = await A('privacy/requests/resolve', 'POST', {id: b.dataset.bpvDel, action: 'done', confirm: c, note: 'Verileriniz silindi/anonimleştirildi.'}); alert('Tamamlandı.\n' + reportText(r.report)); await show(); return; }
      if ((b = $c('[data-bpv-expreq]'))) { location.href = '/api/platform/admin/privacy/export?person=' + encodeURIComponent(b.dataset.bpvExpreq); return; }
      if ($c('[data-bpv-exp]')) { const id = $('#bpv-cust').value; if (!id) { say('Müşteri seçin.'); return; } location.href = '/api/platform/admin/privacy/export?person=' + encodeURIComponent(id); return; }
      if ($c('[data-bpv-erase]')) { const id = $('#bpv-cust').value; if (!id) { say('Müşteri seçin.'); return; } const c = prompt('Bu müşterinin kişisel verileri ve belge dosyaları KALICI olarak silinecek. Geri alınamaz. Onaylamak için SİL yazın:', ''); if (c === null) return; const r = await A('privacy/erase', 'POST', {person: id, confirm: c}); alert('Tamamlandı.\n' + reportText(r.report)); CUS = []; await show(); return; }
    } catch (err) { say(err.message); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target;
    try {
      if (f.id === 'bpv-cfg') { e.preventDefault(); const d = new FormData(f), regions = Object.keys(CFG.regions).filter(k => d.get('r_' + k)); await A('privacy/settings', 'POST', {legalName: d.get('legalName'), contactEmail: d.get('contactEmail'), address: d.get('address'), dpo: d.get('dpo'), processors: d.get('processors'), retention: d.get('retention'), regions, aiUse: !!d.get('aiUse')}); say('Kaydedildi.'); await show(); return; }
      if (f.id === 'bpv-cf') { e.preventDefault(); const d = new FormData(f); CON = await A('privacy/consents?type=' + encodeURIComponent(d.get('type') || '') + '&q=' + encodeURIComponent(d.get('q') || '')); draw(); return; }
      if (f.id === 'bpv-af') { e.preventDefault(); AUD = await A('privacy/audit?q=' + encodeURIComponent(new FormData(f).get('q') || '')); draw(); }
    } catch (err) { say(err.message); }
  });

  const routes = {gizlilik: page};
  Object.assign(names, {gizlilik: 'Gizlilik ve Uyum'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav) {
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    let g = sum('Güven ve Uyum');
    if (!g) { g = document.createElement('details'); g.innerHTML = '<summary>Güven ve Uyum</summary><div class="dropdown"></div>'; (sum('İletişim') || sum('Partner Ağı') || sum('Satış') || {after: n => nav.appendChild(n)}).after(g); }
    const dd = g.querySelector('.dropdown'); if (dd && !dd.querySelector('a[href="#gizlilik"]')) dd.insertAdjacentHTML('beforeend', '<a href="#gizlilik">Gizlilik ve KVKK</a>');
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bpv-root')) render(); }, 350);
})();
