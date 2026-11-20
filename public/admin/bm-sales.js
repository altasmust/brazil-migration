'use strict';
// Satış (Faz 3): Adaylar · Teklifler · Sözleşmeler · Ödeme Planları. Arka uç: /api/platform/admin/sales/*
// Pano, kart, tablo ve form sınıfları bm-cases.js ile ortaktır (bcs-*).
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const wrap = (title, sub) => '<div class="bcs">' + heading(title) + (sub ? '<p class="bcs-sub">' + sub + '</p>' : '') + '<div id="bsl-root"><div class="loading">Yükleniyor…</div></div></div>';
  const run = fn => setTimeout(async () => { try { await fn($('#bsl-root')); } catch (e) { const r = $('#bsl-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
  const modal = (title, html) => { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; if (!$('#modal').open) $('#modal').showModal(); };
  const closeModal = () => $('#modal').open && $('#modal').close();
  const opt = (v, l, sel) => '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(l) + '</option>';
  const money = (c, cur) => (c / 100).toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' ' + (cur || '');
  const dt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '');
  const fd = d => (d ? d.split('-').reverse().join('.') : '');
  const ago = ms => { const d = Math.floor((Date.now() - ms) / 864e5); return d <= 0 ? 'bugün' : d + ' gün önce'; };
  const chip = (t, c) => '<span class="bcs-chip ' + (c || '') + '">' + esc(t) + '</span>';
  const copy = async (text, msg) => { try { await navigator.clipboard.writeText(text); say(msg || 'Bağlantı kopyalandı.'); } catch { prompt('Bağlantıyı kopyalayın:', text); } };
  const CUR = ['USD', 'BRL', 'EUR', 'TRY'];
  const SIGN_NOTE = '<div class="bsl-note"><b>Elektronik imza hakkında:</b> Burada kullanılan imza <b>basit elektronik imzadır</b>: müşteriye özel bağlantı, okuyup kabul onayı, ad-soyad (yazılı veya çizili imza), zaman/IP/tarayıcı kaydı ve belgenin SHA-256 özeti saklanır. Nitelikli e-imza (ör. e-Devlet / ICP-Brasil sertifikası) değildir; bu tür belge gerektiren işlemler için ilgili kurumun yöntemini kullanın. Sözleşme metnini kendi avukatınıza inceletin.</div>';

  // ---------------- Adaylar ----------------
  let LD = null, LQ = '';
  const leadsPage = () => { run(async root => { LD = await A('sales/leads'); drawLeads(root); }); return wrap('Aday Panosu', 'Başvuru formundan, ön değerlendirmeden, partner ağından veya elle gelen adaylar. Kartı sürükleyerek aşamayı değiştirin.'); };
  function leadCard(l) {
    return '<article class="bcs-card" draggable="true" data-sl-lead="' + esc(l.id) + '"><b>' + esc(l.name || l.email || l.phone) + '</b><small>' + esc(l.service || 'Hizmet belirtilmedi') + (l.country ? ' · ' + esc(l.country) : '') + '</small><div class="bcs-chips">' + chip(l.source || 'Ön değerlendirme') + (l.value ? chip(money(l.value, l.currency || 'USD'), 'ok') : '') + chip(ago(l.updated)) + '</div></article>';
  }
  function drawLeads(root) {
    root = root || $('#bsl-root'); if (!root) return;
    const q = LQ.toLowerCase(), shown = LD.leads.filter(l => !q || [l.name, l.email, l.phone, l.service, l.country].join(' ').toLowerCase().includes(q));
    const by = id => shown.filter(l => l.stage === id), won = LD.leads.filter(l => l.stage === 'won').length, lost = LD.leads.filter(l => l.stage === 'lost').length, open = LD.leads.length - won - lost;
    root.innerHTML = '<div class="bsl-stats">' + [['Açık aday', open], ['Kazanılan', won], ['Kaybedilen', lost], ['Kazanma oranı', won + lost ? Math.round(won / (won + lost) * 100) + '%' : '—']].map(x => '<div><b>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div>' +
      '<div class="bcs-bar"><button class="btn" data-sl-newlead>+ Aday ekle</button><button class="btn small" data-sl-form>Başvuru formu ve gömme kodu</button><input type="search" placeholder="Ara: ad, e-posta, telefon…" data-sl-q value="' + esc(LQ) + '" style="flex:1;min-width:180px"></div>' +
      '<div class="bcs-board" id="bsl-board" style="grid-auto-columns:minmax(210px,1fr)">' + LD.stages.map(s => '<div class="bcs-col" data-sl-col="' + s.id + '"><h3>' + esc(s.name) + ' <span>' + by(s.id).length + '</span></h3>' + (by(s.id).map(leadCard).join('') || '<p class="bcs-empty">—</p>') + '</div>').join('') + '</div>';
  }
  const reloadLeads = async () => { LD = await A('sales/leads'); if (route() === 'adaylar') drawLeads(); };
  async function setStage(id, stage) {
    const l = LD.leads.find(x => x.id === id); if (!l || l.stage === stage) return;
    const body = {id, stage}; if (stage === 'lost') { const r = prompt('Kaybedilme nedeni (isteğe bağlı):', ''); if (r === null) return; body.lostReason = r; }
    await A('sales/leads/update', 'POST', body); await reloadLeads(); if ($('#modal').open && CURLEAD === id) openLead(id);
  }
  let CURLEAD = '';
  function leadForm(l) {
    const f = (n, label, v, extra) => '<label>' + label + '<input name="' + n + '" value="' + esc(v || '') + '" ' + (extra || '') + '></label>';
    return '<form class="bcs-form" id="bsl-lead-form" data-id="' + esc(l.id || '') + '">' + f('name', 'Ad soyad', l.name, 'required minlength="2" maxlength="100"') + f('email', 'E-posta', l.email, 'type="email" maxlength="254"') + f('phone', 'Telefon / WhatsApp', l.phone, 'maxlength="40"') +
      '<label>Hizmet<input name="service" list="bsl-services" value="' + esc(l.service || '') + '" maxlength="60"><datalist id="bsl-services">' + LD.services.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist></label>' + f('country', 'Ülke', l.country, 'maxlength="60"') +
      '<label>Kaynak<select name="source">' + LD.sources.map(s => opt(s, s, s === (l.source || 'Telefon / WhatsApp'))).join('') + '</select></label>' +
      '<div class="bcs-inl"><label style="flex:1">Tahmini değer<input name="value" type="number" min="0" step="0.01" value="' + (l.value ? l.value / 100 : '') + '"></label><label>Para birimi<select name="currency">' + CUR.map(c => opt(c, c, c === (l.currency || 'USD'))).join('') + '</select></label></div>' +
      (l.id ? '' : '<label>Not<textarea name="note" rows="3" maxlength="1000"></textarea></label>') + '<div class="form-actions"><button class="btn" type="submit">' + (l.id ? 'Kaydet' : 'Adayı ekle') + '</button></div></form>';
  }
  function openLead(id) {
    const l = LD.leads.find(x => x.id === id); if (!l) return; CURLEAD = id;
    const hist = (l.history || []).slice().reverse().map(h => '<li><small>' + dt(h.at) + ' · ' + esc(h.by) + '</small><div>' + esc(h.text) + '</div></li>').join('');
    modal(l.name || l.email, '<div class="bcs-det"><div class="bcs-top"><label>Aşama <select data-sl-stage="' + esc(id) + '">' + LD.stages.map(s => opt(s.id, s.name, s.id === l.stage)).join('') + '</select></label>' + (l.customerId ? chip('Müşteri hesabı var', 'ok') : '') + (l.consent ? chip('Rıza kayıtlı') : '') + '</div>' +
      (l.message ? '<p class="bsl-msg">' + esc(l.message) + '</p>' : '') + (l.lostReason ? '<p class="bcs-hint">Kaybedilme nedeni: ' + esc(l.lostReason) + '</p>' : '') +
      '<div class="bcs-inl" style="margin:12px 0">' + (l.customerId ? '' : '<button class="btn small" data-sl-convert="' + esc(id) + '"' + (l.email ? '' : ' disabled title="E-posta gerekli"') + '>Müşteriye dönüştür</button>') + '<button class="btn small" data-sl-quote-for="' + esc(id) + '">Teklif hazırla</button><button class="btn small" data-sl-refer="' + esc(id) + '">Partner ağına yönlendir</button><button class="btn small danger" data-sl-del="' + esc(id) + '">Sil</button></div>' +
      '<h3>Bilgiler</h3>' + leadForm(l) + '<h3>Notlar ve geçmiş</h3><div class="bcs-inl"><input id="bsl-note" placeholder="Not ekle (ör. 15 Aralık’ta arandı)" maxlength="500" style="flex:1"><button class="btn small" data-sl-note="' + esc(id) + '">Ekle</button></div><ul class="bcs-ul bsl-hist">' + (hist || '<li>—</li>') + '</ul></div>');
  }
  async function formSettings() {
    const d = await A('sales/form'), c = d.config, snippet = '<iframe src="' + d.link + '" title="Başvuru formu" style="width:100%;height:680px;border:0"></iframe>';
    modal('Başvuru formu', '<div class="bcs-form"><p class="bcs-hint">Bu formu web sitenizde bir bağlantı veya gömülü çerçeve olarak kullanın. Gelen başvurular Aday Panosu’na “Yeni” olarak düşer. Bot koruması (gizli alan, süre ve IP sınırı) açıktır.</p>' +
      '<label>Form bağlantısı<div class="bcs-inl"><input readonly value="' + esc(d.link) + '" style="flex:1"><button class="btn small" type="button" data-sl-copy="' + esc(d.link) + '">Kopyala</button><a class="btn small" target="_blank" rel="noopener" href="' + esc(d.link) + '">Aç</a></div></label>' +
      '<label>Sitenize gömme kodu<div class="bcs-inl"><textarea readonly rows="2" style="flex:1">' + esc(snippet) + '</textarea><button class="btn small" type="button" data-sl-copy="' + esc(snippet) + '">Kopyala</button></div></label></div>' +
      '<form class="bcs-form" id="bsl-form-cfg" style="margin-top:14px"><label class="bcs-chk"><input type="checkbox" name="enabled"' + (c.enabled ? ' checked' : '') + '> Form açık' + (c.enabled ? '' : ' <small>(şu an kapalı — açmak için işaretleyip kaydedin)</small>') + '</label><label>Başlık<input name="title" maxlength="120" value="' + esc(c.title) + '"></label><label>Açıklama<textarea name="intro" rows="2" maxlength="500">' + esc(c.intro || '') + '</textarea></label>' +
      '<label>Hizmet seçenekleri <small>(her satır bir seçenek)</small><textarea name="services" rows="4">' + esc((c.services || []).join('\n')) + '</textarea></label><label>Rıza metni<textarea name="consentText" rows="2" maxlength="500">' + esc(c.consentText) + '</textarea></label><label>Teşekkür mesajı<input name="thanks" maxlength="400" value="' + esc(c.thanks) + '"></label>' +
      '<label>Yeni başvuruda bildirim e-postası <small>(isteğe bağlı)</small><input name="notifyEmail" type="email" value="' + esc(c.notifyEmail || '') + '"></label><div class="bcs-inl"><label class="bcs-chk"><input type="checkbox" name="askPhone"' + (c.askPhone !== false ? ' checked' : '') + '> Telefon sor</label><label class="bcs-chk"><input type="checkbox" name="askCountry"' + (c.askCountry !== false ? ' checked' : '') + '> Ülke sor</label></div><div class="form-actions"><button class="btn" type="submit">Kaydet</button></div></form>');
  }

  // ---------------- Teklifler ----------------
  let QD = null, CUSTOMERS = null;
  const QSTATUS = {draft: ['Taslak', ''], sent: ['Gönderildi', 'warn'], accepted: ['Kabul edildi', 'ok'], rejected: ['Reddedildi', 'bad'], expired: ['Süresi doldu', 'bad']};
  const quotesPage = () => { run(async root => { QD = await A('sales/quotes'); drawQuotes(root); }); return wrap('Teklifler', 'Kalemli teklif hazırlayın, müşteriye özel bağlantıyla gönderin; kabul edilince sözleşme ve ödeme planına bağlayın.'); };
  function drawQuotes(root) {
    root = root || $('#bsl-root'); if (!root) return;
    const rows = QD.quotes.map(q => { const st = QSTATUS[q.status] || [q.status, ''];
      const acts = (q.status === 'draft' ? '<button class="btn small" data-sl-q-edit="' + q.id + '">Düzenle</button><button class="btn small" data-sl-q-send="' + q.id + '">Gönder</button>' : '') +
        (q.status === 'sent' || q.status === 'expired' ? '<button class="btn small" data-sl-q-link="' + q.id + '">Bağlantıyı kopyala</button><button class="btn small" data-sl-q-send="' + q.id + '">Yeniden gönder</button><button class="btn small" data-sl-q-wd="' + q.id + '">Geri çek</button>' : '') +
        (q.status === 'accepted' ? (q.contractId ? '<button class="btn small" data-sl-c-open="' + q.contractId + '">Sözleşme</button>' : '<button class="btn small" data-sl-q-contract="' + q.id + '">Sözleşme hazırla</button>') + '<button class="btn small" data-sl-q-plan="' + q.id + '">Ödeme planı</button>' : '') + (q.status !== 'accepted' ? '<button class="btn small danger" data-sl-q-del="' + q.id + '">Sil</button>' : '');
      return '<tr><td><b>' + esc(q.number) + '</b></td><td>' + esc(q.name) + '<small class="bcs-blk">' + esc(q.title) + '</small></td><td>' + money(q.amount, q.currency) + '</td><td>' + chip(st[0], st[1]) + (q.viewedAt ? '<small class="bcs-blk">Görüntülendi</small>' : '') + '</td><td>' + fd(q.validUntil) + '</td><td><div class="bcs-inl">' + acts + '</div></td></tr>'; }).join('');
    root.innerHTML = '<div class="bcs-bar"><button class="btn" data-sl-q-new>+ Yeni teklif</button></div>' + (QD.quotes.length ? '<div class="bcs-tw"><table class="bcs-tbl"><thead><tr><th>No</th><th>Müşteri</th><th>Tutar</th><th>Durum</th><th>Geçerlilik</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div class="bmc-empty sm"><b>Henüz teklif yok.</b><span>“Yeni teklif” ile başlayın veya bir adayın kartından teklif hazırlayın.</span></div>');
  }
  const lineRow = (l = {}) => '<div class="bsl-line"><input data-ln="name" placeholder="Kalem (ör. Oturum izni danışmanlığı)" maxlength="200" value="' + esc(l.name || '') + '"><input data-ln="qty" type="number" min="1" step="1" value="' + (l.qty || 1) + '" aria-label="Adet"><input data-ln="price" type="number" min="0" step="0.01" value="' + (l.price != null ? l.price / 100 : '') + '" placeholder="Birim fiyat" aria-label="Birim fiyat"><button type="button" class="btn small danger" data-sl-ln-del aria-label="Kalemi sil">×</button></div>';
  function quoteTotal() {
    const f = $('#bsl-q-form'); if (!f) return; let sub = 0; f.querySelectorAll('.bsl-line').forEach(r => { sub += Math.max(1, Math.round(Number(r.querySelector('[data-ln=qty]').value) || 1)) * Math.round((Number(r.querySelector('[data-ln=price]').value) || 0) * 100); });
    const dsc = Math.max(0, Math.min(100, Number(f.discount.value) || 0)), tax = Math.max(0, Math.min(100, Number(f.tax.value) || 0)), after = Math.round(sub * (1 - dsc / 100)), total = after + Math.round(after * tax / 100);
    $('#bsl-q-total').textContent = money(total, f.currency.value);
  }
  async function openQuote(q, pre) {
    CUSTOMERS = CUSTOMERS || (await A('sales/customers')).customers; QD = QD || await A('sales/quotes');
    q = q || {}; pre = pre || {}; const g = k => q[k] ?? pre[k] ?? '', lines = q.lines && q.lines.length ? q.lines : [{name: pre.service ? pre.service + ' danışmanlığı' : '', qty: 1}], inst = q.installments || {};
    modal(q.id ? 'Teklifi düzenle · ' + q.number : 'Yeni teklif', '<form class="bcs-form" id="bsl-q-form" data-id="' + esc(q.id || '') + '" data-lead="' + esc(g('leadId')) + '" data-customer="' + esc(g('customerId')) + '">' +
      '<div class="bsl-two"><label>Müşteri adı<input name="name" required minlength="2" maxlength="100" value="' + esc(g('name')) + '"></label><label>E-posta<input name="email" type="email" required value="' + esc(g('email')) + '"></label></div>' +
      '<div class="bsl-two"><label>Telefon<input name="phone" maxlength="40" value="' + esc(g('phone')) + '"></label><label>Hizmet<input name="service" list="bsl-svc2" maxlength="60" value="' + esc(g('service')) + '"><datalist id="bsl-svc2">' + QD.services.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist></label></div>' +
      '<label>Teklif başlığı<input name="title" maxlength="160" value="' + esc(q.title || (pre.service ? pre.service + ' teklifi' : 'Hizmet teklifi')) + '"></label>' +
      '<div><b style="font-size:13px">Kalemler</b><div id="bsl-lines">' + lines.map(lineRow).join('') + '</div><button type="button" class="btn small" data-sl-ln-add style="margin-top:8px">+ Kalem ekle</button></div>' +
      '<div class="bsl-two"><label>Para birimi<select name="currency">' + CUR.map(c => opt(c, c, c === (q.currency || 'USD'))).join('') + '</select></label><label>İndirim %<input name="discount" type="number" min="0" max="100" step="0.5" value="' + (q.discount || 0) + '"></label></div>' +
      '<div class="bsl-two"><label>Vergi / KDV % <small>(varsa)</small><input name="tax" type="number" min="0" max="100" step="0.5" value="' + (q.tax || 0) + '"></label><label>Geçerlilik (gün)<input name="validDays" type="number" min="1" max="180" value="14"></label></div>' +
      '<div class="bsl-total">Toplam: <b id="bsl-q-total">—</b></div>' +
      '<fieldset class="bsl-fs"><legend>Ödeme önerisi (isteğe bağlı)</legend><div class="bsl-two"><label>Taksit sayısı<input name="icount" type="number" min="1" max="36" value="' + (inst.count || 1) + '"></label><label>İlk ödeme tarihi<input name="ifirst" type="date" value="' + esc(inst.firstDue || '') + '"></label></div><label>Peşinat <small>(ilk taksit, isteğe bağlı)</small><input name="idown" type="number" min="0" step="0.01" value="' + (inst.down ? inst.down / 100 : '') + '"></label></fieldset>' +
      '<label>Kabulde otomatik sözleşme <select name="contractTpl">' + opt('', '— sözleşme gönderme —', !q.contractTpl) + QD.templates.map(t => opt(t.id, t.name, t.id === q.contractTpl)).join('') + '</select></label>' +
      '<label>Notlar / koşullar <small>(teklifte görünür)</small><textarea name="notes" rows="3" maxlength="2000">' + esc(q.notes || '') + '</textarea></label><div class="form-actions"><button class="btn" type="submit">Taslağı kaydet</button></div></form>');
    quoteTotal();
  }
  const quoteBody = f => ({id: f.dataset.id || undefined, leadId: f.dataset.lead || undefined, customerId: f.dataset.customer || undefined, name: f.name.value, email: f.email.value, phone: f.phone.value, service: f.service.value, title: f.title.value, currency: f.currency.value, discount: f.discount.value, tax: f.tax.value, validDays: f.validDays.value, notes: f.notes.value, contractTpl: f.contractTpl.value,
    lines: [...f.querySelectorAll('.bsl-line')].map(r => ({name: r.querySelector('[data-ln=name]').value, qty: r.querySelector('[data-ln=qty]').value, price: r.querySelector('[data-ln=price]').value})), installments: {count: f.icount.value, firstDue: f.ifirst.value, down: f.idown.value}});
  async function sendQuote(id) {
    const q = QD.quotes.find(x => x.id === id); if (!confirm((q ? q.name + ' · ' + money(q.amount, q.currency) : 'Teklif') + ' müşteriye e-postayla gönderilsin mi? Müşteri bağlantıdan teklifi görüp kabul/ret edebilir.')) return;
    const r = await A('sales/quotes/send', 'POST', {id}); QD = await A('sales/quotes'); if (route() === 'teklifler') drawQuotes();
    modal('Teklif gönderildi', '<p>' + (r.mailed ? 'E-posta gönderildi.' : '<b>E-posta gönderilemedi</b> (e-posta altyapısı kapalı olabilir). Bağlantıyı müşteriye kendiniz iletin:') + '</p><div class="bcs-inl"><input readonly value="' + esc(r.link) + '" style="flex:1"><button class="btn small" data-sl-copy="' + esc(r.link) + '">Kopyala</button></div>');
  }

  // ---------------- Sözleşmeler ----------------
  let CD = null, TD = null;
  const CSTATUS = {draft: ['Taslak', ''], sent: ['İmza bekliyor', 'warn'], signed: ['İmzalandı', 'ok'], void: ['İptal', 'bad']};
  const contractsPage = () => { run(async root => { CD = await A('sales/contracts'); TD = await A('sales/contract-templates'); drawContracts(root); }); return wrap('Sözleşmeler', 'Şablondan sözleşme üretin, müşteriye imza bağlantısı gönderin. İmza kanıtı (zaman, IP, belge özeti) sözleşmeyle birlikte saklanır.'); };
  function drawContracts(root) {
    root = root || $('#bsl-root'); if (!root) return;
    const rows = CD.contracts.map(c => { const st = CSTATUS[c.status] || [c.status, ''];
      return '<tr><td><b>' + esc(c.number) + '</b></td><td>' + esc(c.name) + '<small class="bcs-blk">' + esc(c.title) + '</small></td><td>' + chip(st[0], st[1]) + (c.signature ? '<small class="bcs-blk">' + dt(c.signature.at) + '</small>' : '') + '</td><td><div class="bcs-inl"><button class="btn small" data-sl-c-open="' + c.id + '">Aç</button></div></td></tr>'; }).join('');
    root.innerHTML = SIGN_NOTE + '<div class="bcs-bar"><button class="btn" data-sl-c-new>+ Yeni sözleşme</button></div>' + (CD.contracts.length ? '<div class="bcs-tw"><table class="bcs-tbl"><thead><tr><th>No</th><th>Müşteri</th><th>Durum</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div class="bmc-empty sm"><b>Henüz sözleşme yok.</b><span>Kabul edilen tekliflerden veya “Yeni sözleşme” ile oluşturun.</span></div>') +
      '<section class="panel bcs-p" style="margin-top:18px"><header class="panel-head"><h2>Sözleşme şablonları</h2><button class="btn small" data-sl-tpl-new>+ Yeni şablon</button></header><ul class="bcs-ul">' + TD.templates.map(t => '<li><div><b>' + esc(t.name) + '</b>' + (t.builtin ? ' ' + chip('başlangıç taslağı') : '') + '</div><div class="bcs-inl"><button class="btn small" data-sl-tpl-edit="' + t.id + '">Düzenle</button><button class="btn small danger" data-sl-tpl-del="' + t.id + '">Sil</button></div></li>').join('') + '</ul><p class="bcs-hint">Metinde kullanabileceğiniz alanlar: ' + TD.vars.map(v => '<code>{{' + v[0] + '}}</code>').join(' ') + '</p></section>';
  }
  async function openContract(id) {
    const d = await A('sales/contracts/get?id=' + encodeURIComponent(id)), c = d.contract, st = CSTATUS[c.status] || [c.status, ''], s = c.signature;
    modal(c.number + ' · ' + c.name, '<div class="bcs-det"><div class="bcs-top">' + chip(st[0], st[1]) + '<small>' + esc(c.email) + '</small></div>' + (d.unresolved.length ? '<div class="bsl-note warn">Doldurulmamış alanlar var: ' + d.unresolved.map(esc).join(', ') + '. Gönderilmeden önce düzenleyin.</div>' : '') +
      '<div class="bcs-inl" style="margin:12px 0">' + (c.status === 'draft' ? '<button class="btn small" data-sl-c-edit="' + c.id + '">Metni düzenle</button><button class="btn small" data-sl-c-send="' + c.id + '">İmzaya gönder</button><button class="btn small danger" data-sl-c-del="' + c.id + '">Sil</button>' : '') +
      (c.status === 'sent' ? '<button class="btn small" data-sl-copy="' + esc(d.link) + '">İmza bağlantısını kopyala</button><button class="btn small" data-sl-c-send="' + c.id + '">Yeniden gönder</button><button class="btn small danger" data-sl-c-void="' + c.id + '">İptal et</button>' : '') + (c.status === 'signed' ? '<button class="btn small" data-sl-copy="' + esc(d.link) + '">Bağlantıyı kopyala</button>' : '') + '</div>' +
      (s ? '<div class="bsl-evid"><b>İmza kanıtı</b><dl><dt>İmzalayan</dt><dd>' + esc(s.name) + ' (' + (s.method === 'drawn' ? 'çizili imza' : 'yazılı imza') + ')</dd><dt>Zaman</dt><dd>' + dt(s.at) + '</dd><dt>IP / tarayıcı</dt><dd>' + esc(s.ip) + ' · ' + esc(s.ua) + '</dd><dt>Onay metni</dt><dd>' + esc(s.consent) + '</dd><dt>Belge özeti (SHA-256)</dt><dd><code>' + esc(s.bodyHash) + '</code></dd><dt>İmza mührü</dt><dd><code>' + esc(s.seal) + '</code></dd></dl></div>' : '') +
      '<pre class="bsl-doc">' + esc(c.body) + '</pre><h3>Geçmiş</h3><ul class="bcs-ul bsl-hist">' + (c.history || []).slice().reverse().map(h => '<li><small>' + dt(h.at) + ' · ' + esc(h.by) + '</small><div>' + esc(h.text) + '</div></li>').join('') + '</ul></div>');
  }
  async function newContract(pre) {
    TD = TD || await A('sales/contract-templates'); CUSTOMERS = CUSTOMERS || (await A('sales/customers')).customers; pre = pre || {};
    modal('Yeni sözleşme', '<form class="bcs-form" id="bsl-c-form"><label>Şablon<select name="templateId">' + TD.templates.map(t => opt(t.id, t.name, false)).join('') + '</select></label><div class="bsl-two"><label>Müşteri adı<input name="name" required minlength="2" value="' + esc(pre.name || '') + '"></label><label>E-posta<input name="email" type="email" required value="' + esc(pre.email || '') + '"></label></div><label>Başlık <small>(boşsa şablon adı)</small><input name="title" maxlength="160"></label><p class="bcs-hint">Teklif kalemleri ve tutar yalnız tekliften oluşturulan sözleşmelerde otomatik dolar. Elle oluşturulanlarda ilgili alanları metinde kendiniz yazın.</p><div class="form-actions"><button class="btn" type="submit">Taslak oluştur</button></div></form>');
  }
  function editTpl(id) {
    const t = id ? TD.templates.find(x => x.id === id) : {name: '', body: ''};
    modal(id ? 'Şablonu düzenle' : 'Yeni sözleşme şablonu', '<form class="bcs-form" id="bsl-tpl-form" data-id="' + esc(id || '') + '"><label>Ad<input name="name" required maxlength="120" value="' + esc(t.name) + '"></label><label>Metin <small>(alanlar: ' + TD.vars.map(v => '{{' + v[0] + '}}').join(' ') + ')</small><textarea name="body" rows="18" required style="font-family:ui-monospace,monospace;font-size:12.5px">' + esc(t.body) + '</textarea></label><p class="bcs-hint">Bu metin hukuki tavsiye değildir; kullanmadan önce avukatınıza inceletin.</p><div class="form-actions"><button class="btn" type="submit">Kaydet</button></div></form>');
  }

  // ---------------- Ödeme planları ----------------
  let PD = null;
  const plansPage = () => { run(async root => { PD = await A('sales/plans'); drawPlans(root); }); return wrap('Ödeme Planları', 'Bir hizmet bedelini taksitlere bölün; her taksit normal bir fatura olarak müşterinin panelinde görünür (Pix/boleto, havale veya etkin ödeme yöntemleriyle ödenir).'); };
  const ISTAT = {'Ödendi': 'ok', 'Ödenmedi': '', 'İptal': 'bad', 'Silinmiş': 'bad'};
  function drawPlans(root) {
    root = root || $('#bsl-root'); if (!root) return;
    const cards = PD.plans.map(p => { const pct = p.total ? Math.round(p.paid / p.total * 100) : 0;
      return '<article class="panel bcs-p bsl-plan"><header class="panel-head"><div><h2>' + esc(p.title) + '</h2><small>' + esc(p.customer.name) + ' · ' + esc(p.number) + '</small></div><div class="bcs-inl">' + (p.status === 'completed' ? chip('Tamamlandı', 'ok') : p.status === 'cancelled' ? chip('İptal', 'bad') : p.overdueCount ? chip(p.overdueCount + ' gecikmiş · ' + money(p.overdueAmount, p.currency), 'bad') : chip('Güncel', 'ok')) + (p.status === 'active' ? '<button class="btn small danger" data-sl-p-cancel="' + p.id + '">İptal et</button>' : '') + '</div></header>' +
        '<div class="bcs-prog"><div><i style="width:' + pct + '%"></i></div><small>' + money(p.paid, p.currency) + ' / ' + money(p.total, p.currency) + ' ödendi (%' + pct + ')</small></div><div class="bcs-chips" style="margin-top:10px">' + p.items.map(i => chip(i.n + '. ' + fd(i.due) + ' · ' + money(i.amount, p.currency) + ' · ' + (i.overdue ? 'Gecikti' : i.status), i.overdue ? 'bad' : ISTAT[i.status])).join('') + '</div></article>'; }).join('');
    root.innerHTML = '<div class="bcs-bar"><button class="btn" data-sl-p-new>+ Yeni ödeme planı</button><label class="bcs-chk"><input type="checkbox" data-sl-rem' + (PD.settings.reminders ? ' checked' : '') + '> Vade hatırlatması ve gecikme uyarısı gönder (yalnız plan taksitleri)</label></div>' + (cards || '<div class="bmc-empty sm"><b>Henüz ödeme planı yok.</b><span>Kabul edilen bir tekliften veya “Yeni ödeme planı” ile oluşturun.</span></div>');
  }
  async function newPlan(pre) {
    CUSTOMERS = CUSTOMERS || (await A('sales/customers')).customers; PD = PD || await A('sales/plans'); pre = pre || {};
    const cid = pre.customerId || (CUSTOMERS.find(c => pre.email && c.email === String(pre.email).toLowerCase()) || {}).id || '';
    modal('Yeni ödeme planı', '<form class="bcs-form" id="bsl-p-form" data-quote="' + esc(pre.quoteId || '') + '" data-contract="' + esc(pre.contractId || '') + '"><label>Müşteri<select name="customerId" required>' + opt('', '— müşteri seçin —', !cid) + CUSTOMERS.map(c => opt(c.id, c.name + ' · ' + c.email, c.id === cid)).join('') + '</select></label>' + (cid ? '' : '<p class="bcs-hint">Müşteri hesabı yoksa önce Aday Panosu’ndan “Müşteriye dönüştür” deyin.</p>') +
      '<label>Başlık<input name="title" required maxlength="140" value="' + esc(pre.title || 'Hizmet bedeli') + '"></label><div class="bsl-two"><label>Toplam tutar<input name="total" type="number" min="1" step="0.01" required value="' + (pre.total || '') + '"></label><label>Para birimi<select name="currency">' + PD.currencies.map(c => opt(c, c, c === (pre.currency || 'USD'))).join('') + '</select></label></div>' +
      '<div class="bsl-two"><label>Taksit sayısı<input name="count" type="number" min="1" max="36" value="' + (pre.count || 3) + '"></label><label>Peşinat <small>(ilk taksit, isteğe bağlı)</small><input name="down" type="number" min="0" step="0.01" value="' + (pre.down || '') + '"></label></div>' +
      '<div class="bsl-two"><label>İlk ödeme tarihi<input name="firstDue" type="date" required value="' + esc(pre.firstDue || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)) + '"></label><label>Aralık<select name="interval">' + opt('monthly', 'Her ay', true) + opt('14', '14 günde bir', false) + opt('30', '30 günde bir', false) + '</select></label></div>' +
      '<label>Hizmet türü <small>(komisyon oranı için)</small><select name="service">' + PD.services.map(s => opt(s, s, s === pre.service)).join('') + '</select></label><label class="bcs-chk"><input type="checkbox" name="notify" checked> Müşteriye plan özetini e-postayla gönder</label><p class="bcs-hint">Her taksit için ayrı fatura oluşturulur. Ödeme yöntemleri Ayarlar → Ödeme Altyapıları’ndan yönetilir; havale/Pix ile ödemeleri Faturalar sayfasından onaylarsınız.</p><div class="form-actions"><button class="btn" type="submit">Planı oluştur</button></div></form>');
  }

  // ---------------- Olaylar ----------------
  const reloadQuotes = async () => { QD = await A('sales/quotes'); if (route() === 'teklifler') drawQuotes(); };
  const reloadContracts = async () => { CD = await A('sales/contracts'); if (route() === 'sozlesmeler') drawContracts(); };
  const reloadPlans = async () => { PD = await A('sales/plans'); if (route() === 'odemeplani') drawPlans(); };
  const leadPre = l => ({name: l.name, email: l.email, phone: l.phone, service: l.service, leadId: l.id, customerId: l.customerId});
  document.addEventListener('click', async e => {
    const t = e.target, $c = s => t.closest(s);
    try {
      let b;
      if ((b = $c('[data-sl-copy]'))) { await copy(b.dataset.slCopy); return; }
      if ((b = $c('[data-sl-lead]'))) { openLead(b.dataset.slLead); return; }
      if ($c('[data-sl-newlead]')) { modal('Aday ekle', leadForm({})); return; }
      if ($c('[data-sl-form]')) { await formSettings(); return; }
      if ((b = $c('[data-sl-convert]'))) { if (!confirm('Aday müşteri hesabına dönüştürülecek ve e-postasına davet bağlantısı gönderilecek (plan kotanıza sayılır). Devam edilsin mi?')) return; const r = await A('sales/leads/convert', 'POST', {id: b.dataset.slConvert}); await reloadLeads(); openLead(b.dataset.slConvert); say(r.existing ? 'Mevcut müşteri hesabıyla eşleştirildi.' : r.mailSent ? 'Müşteri hesabı oluşturuldu, davet gönderildi.' : 'Hesap oluşturuldu (e-posta gönderilemedi — Hesaplar’dan davet bağlantısı gönderin).'); return; }
      if ((b = $c('[data-sl-quote-for]'))) { const l = LD.leads.find(x => x.id === b.dataset.slQuoteFor); closeModal(); await openQuote(null, leadPre(l)); return; }
      if ((b = $c('[data-sl-refer]'))) { const l = LD.leads.find(x => x.id === b.dataset.slRefer); if (window.bmNetRefer) { closeModal(); window.bmNetRefer({leadId: l.id, name: l.name, email: l.email, phone: l.phone, country: l.country, service: l.service}); } else say('Partner ağı modülü yüklenemedi.'); return; }
      if ((b = $c('[data-sl-del]'))) { if (!confirm('Aday kalıcı olarak silinsin mi?')) return; await A('sales/leads/delete', 'POST', {id: b.dataset.slDel}); closeModal(); await reloadLeads(); say('Aday silindi.'); return; }
      if ((b = $c('[data-sl-note]'))) { const v = $('#bsl-note').value.trim(); if (v) { await A('sales/leads/update', 'POST', {id: b.dataset.slNote, note: v}); await reloadLeads(); openLead(b.dataset.slNote); } return; }
      // teklifler
      if ($c('[data-sl-q-new]')) { await openQuote(); return; }
      if ($c('[data-sl-ln-add]')) { $('#bsl-lines').insertAdjacentHTML('beforeend', lineRow()); return; }
      if ($c('[data-sl-ln-del]')) { const rows = $('#bsl-lines').children; if (rows.length > 1) { $c('.bsl-line').remove(); quoteTotal(); } return; }
      if ((b = $c('[data-sl-q-edit]'))) { await openQuote(QD.quotes.find(x => x.id === b.dataset.slQEdit)); return; }
      if ((b = $c('[data-sl-q-send]'))) { await sendQuote(b.dataset.slQSend); return; }
      if ((b = $c('[data-sl-q-link]'))) { const r = await A('sales/quotes/link?id=' + encodeURIComponent(b.dataset.slQLink)); await copy(r.link); return; }
      if ((b = $c('[data-sl-q-wd]'))) { if (confirm('Teklif geri çekilsin mi? Müşterinin bağlantısı çalışmaz olur; teklifi düzenleyip yeniden gönderebilirsiniz.')) { await A('sales/quotes/withdraw', 'POST', {id: b.dataset.slQWd}); await reloadQuotes(); } return; }
      if ((b = $c('[data-sl-q-del]'))) { if (confirm('Teklif silinsin mi?')) { await A('sales/quotes/delete', 'POST', {id: b.dataset.slQDel}); await reloadQuotes(); } return; }
      if ((b = $c('[data-sl-q-contract]'))) { const r = await A('sales/quotes/contract', 'POST', {id: b.dataset.slQContract}); await reloadQuotes(); await reloadContracts(); await openContract(r.id); return; }
      if ((b = $c('[data-sl-q-plan]'))) { const q = QD.quotes.find(x => x.id === b.dataset.slQPlan), i = q.installments || {}; await newPlan({customerId: q.customerId, email: q.email, quoteId: q.id, contractId: q.contractId, title: q.title, total: q.amount / 100, currency: q.currency, count: i.count || 1, down: i.down ? i.down / 100 : '', firstDue: i.firstDue, service: q.service}); return; }
      // sözleşmeler
      if ((b = $c('[data-sl-c-open]'))) { await openContract(b.dataset.slCOpen); return; }
      if ($c('[data-sl-c-new]')) { await newContract(); return; }
      if ((b = $c('[data-sl-c-edit]'))) { const d = await A('sales/contracts/get?id=' + encodeURIComponent(b.dataset.slCEdit)), c = d.contract; modal('Sözleşme metni · ' + c.number, '<form class="bcs-form" id="bsl-cedit-form" data-id="' + esc(c.id) + '"><label>Başlık<input name="title" maxlength="160" value="' + esc(c.title) + '"></label><label>Metin<textarea name="body" rows="20" style="font-family:ui-monospace,monospace;font-size:12.5px">' + esc(c.body) + '</textarea></label><div class="form-actions"><button class="btn" type="submit">Kaydet</button></div></form>'); return; }
      if ((b = $c('[data-sl-c-send]'))) { if (!confirm('Sözleşme imza için müşteriye gönderilsin mi? Gönderildikten sonra metin değiştirilemez.')) return; const r = await A('sales/contracts/send', 'POST', {id: b.dataset.slCSend}); await reloadContracts(); modal('İmzaya gönderildi', '<p>' + (r.mailed ? 'E-posta gönderildi.' : '<b>E-posta gönderilemedi.</b> Bağlantıyı müşteriye kendiniz iletin:') + '</p><div class="bcs-inl"><input readonly value="' + esc(r.link) + '" style="flex:1"><button class="btn small" data-sl-copy="' + esc(r.link) + '">Kopyala</button></div>'); return; }
      if ((b = $c('[data-sl-c-void]'))) { const why = prompt('İptal nedeni (isteğe bağlı):', ''); if (why === null) return; await A('sales/contracts/void', 'POST', {id: b.dataset.slCVoid, reason: why}); closeModal(); await reloadContracts(); say('Sözleşme iptal edildi.'); return; }
      if ((b = $c('[data-sl-c-del]'))) { if (confirm('Taslak silinsin mi?')) { await A('sales/contracts/delete', 'POST', {id: b.dataset.slCDel}); closeModal(); await reloadContracts(); } return; }
      if ($c('[data-sl-tpl-new]')) { editTpl(''); return; }
      if ((b = $c('[data-sl-tpl-edit]'))) { editTpl(b.dataset.slTplEdit); return; }
      if ((b = $c('[data-sl-tpl-del]'))) { if (confirm('Şablon silinsin mi?')) { await A('sales/contract-templates/delete', 'POST', {id: b.dataset.slTplDel}); TD = await A('sales/contract-templates'); drawContracts(); } return; }
      // planlar
      if ($c('[data-sl-p-new]')) { await newPlan(); return; }
      if ((b = $c('[data-sl-p-cancel]'))) { if (confirm('Plan iptal edilsin mi? Ödenmemiş taksit faturaları iptal edilir; ödenmiş olanlar korunur.')) { const r = await A('sales/plans/cancel', 'POST', {id: b.dataset.slPCancel}); await reloadPlans(); say(r.cancelled + ' taksit iptal edildi.'); } return; }
    } catch (err) { say(err.message); }
  });
  document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#bsl-q-form')) quoteTotal(); if (e.target.matches && e.target.matches('[data-sl-q]')) { LQ = e.target.value; const pos = e.target.selectionStart; drawLeads(); const n = $('[data-sl-q]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } } });
  document.addEventListener('change', async e => {
    const s = e.target;
    try {
      if (s.matches('[data-sl-stage]')) { await setStage(s.dataset.slStage, s.value); return; }
      if (s.matches('[data-sl-rem]')) { await A('sales/settings', 'POST', {reminders: s.checked}); say(s.checked ? 'Hatırlatmalar açık.' : 'Hatırlatmalar kapalı.'); return; }
      if (s.closest && s.closest('#bsl-q-form')) quoteTotal();
    } catch (err) { say(err.message); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target;
    try {
      if (f.id === 'bsl-lead-form') { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (f.dataset.id) { await A('sales/leads/update', 'POST', {...d, id: f.dataset.id}); await reloadLeads(); openLead(f.dataset.id); say('Kaydedildi.'); } else { await A('sales/leads', 'POST', d); closeModal(); await reloadLeads(); say('Aday eklendi.'); } return; }
      if (f.id === 'bsl-form-cfg') { e.preventDefault(); const d = new FormData(f); await A('sales/form', 'POST', {enabled: !!d.get('enabled'), title: d.get('title'), intro: d.get('intro'), services: String(d.get('services')).split('\n'), consentText: d.get('consentText'), thanks: d.get('thanks'), notifyEmail: d.get('notifyEmail'), askPhone: !!d.get('askPhone'), askCountry: !!d.get('askCountry')}); say('Form ayarları kaydedildi.'); closeModal(); return; }
      if (f.id === 'bsl-q-form') { e.preventDefault(); const r = await A('sales/quotes', 'POST', quoteBody(f)); closeModal(); await reloadQuotes(); if (route() !== 'teklifler') location.hash = '#teklifler'; say('Teklif taslağı kaydedildi (' + r.number + '). Göndermek için listeden “Gönder”e basın.'); return; }
      if (f.id === 'bsl-c-form') { e.preventDefault(); const d = Object.fromEntries(new FormData(f)), r = await A('sales/contracts/create', 'POST', d); await reloadContracts(); await openContract(r.id); return; }
      if (f.id === 'bsl-cedit-form') { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); await A('sales/contracts/update', 'POST', {...d, id: f.dataset.id}); await reloadContracts(); await openContract(f.dataset.id); say('Taslak kaydedildi.'); return; }
      if (f.id === 'bsl-tpl-form') { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); await A('sales/contract-templates', 'POST', {...d, id: f.dataset.id || undefined}); closeModal(); TD = await A('sales/contract-templates'); drawContracts(); say('Şablon kaydedildi.'); return; }
      if (f.id === 'bsl-p-form') { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); const body = {...d, notify: !!d.notify, quoteId: f.dataset.quote || undefined, contractId: f.dataset.contract || undefined}; if (d.interval !== 'monthly') body.intervalDays = d.interval; const r = await A('sales/plans/create', 'POST', body); closeModal(); say(r.items.length + ' taksit faturası oluşturuldu.'); if (route() !== 'odemeplani') location.hash = '#odemeplani'; else await reloadPlans(); return; }
    } catch (err) { say(err.message); }
  });
  // sürükle-bırak (aday panosu)
  document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('[data-sl-lead]'); if (c) { e.dataTransfer.setData('text/plain', 'lead:' + c.dataset.slLead); e.dataTransfer.effectAllowed = 'move'; } });
  document.addEventListener('dragover', e => { if (e.target.closest && e.target.closest('[data-sl-col]')) e.preventDefault(); });
  document.addEventListener('drop', async e => { const col = e.target.closest && e.target.closest('[data-sl-col]'); if (!col) return; const raw = e.dataTransfer.getData('text/plain'); if (!raw.startsWith('lead:')) return; e.preventDefault(); try { await setStage(raw.slice(5), col.dataset.slCol); } catch (err) { say(err.message); } });
  window.bmSalesNewQuote = openQuote;

  // ---------------- Yönlendirme ve menü ----------------
  const routes = {adaylar: leadsPage, teklifler: quotesPage, sozlesmeler: contractsPage, odemeplani: plansPage};
  Object.assign(names, {adaylar: 'Aday Panosu', teklifler: 'Teklifler', sozlesmeler: 'Sözleşmeler', odemeplani: 'Ödeme Planları'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav && !nav.querySelector('a[href="#adaylar"]')) {
    const el = document.createElement('details');
    el.innerHTML = '<summary>Satış</summary><div class="dropdown"><a href="#adaylar">Adaylar</a><a href="#teklifler">Teklifler</a><a href="#sozlesmeler">Sözleşmeler</a><a href="#odemeplani">Ödeme Planları</a></div>';
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    const after = sum('Dosyalar') || sum('Destek');
    if (after) after.after(el); else nav.appendChild(el);
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bsl-root')) render(); }, 350);

  const css = document.createElement('style');
  css.textContent = '.bsl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:0 0 14px}.bsl-stats div{background:#f1f5ee;border:1px solid #e0e7da;border-radius:12px;padding:10px 14px;display:grid}.bsl-stats b{font-size:22px;color:#1b4d2a}.bsl-stats span{font-size:12px;color:#68776b}'
    + '.bsl-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bsl-line{display:grid;grid-template-columns:1fr 70px 110px 34px;gap:8px;margin-top:8px}.bsl-line input{font:inherit;border:1px solid #d7dfd2;border-radius:10px;padding:8px 10px;min-width:0}.bsl-total{text-align:right;font-size:15px}.bsl-total b{font-size:20px;color:#1b4d2a}.bsl-fs{border:1px solid #e0e7da;border-radius:12px;padding:10px 14px;display:grid;gap:10px}.bsl-fs legend{font-size:12.5px;font-weight:600;padding:0 6px;color:#33503a}'
    + '.bsl-note{background:#fff8e6;border:1px solid #f0dfae;color:#6d5410;border-radius:12px;padding:11px 14px;font-size:12.5px;line-height:1.5;margin:0 0 14px}.bsl-note.warn{background:#fdeceb;border-color:#f3c4c1;color:#8f2a24}.bsl-msg{background:#f5f7f3;border-radius:10px;padding:10px 12px;font-size:13.5px;white-space:pre-wrap}'
    + '.bsl-doc{white-space:pre-wrap;word-break:break-word;font:13px/1.6 ui-monospace,Menlo,monospace;background:#fafbf9;border:1px solid #e3e8de;border-radius:12px;padding:14px;max-height:340px;overflow:auto}.bsl-evid{background:#eef7ef;border:1px solid #cfe5d1;border-radius:12px;padding:12px 14px;margin:0 0 12px;font-size:13px}.bsl-evid dl{display:grid;grid-template-columns:150px 1fr;gap:6px 10px;margin:8px 0 0}.bsl-evid dt{color:#68776b}.bsl-evid dd{margin:0;word-break:break-all}.bsl-evid code{font-size:11.5px}'
    + '.bcs-form label.bcs-chk{display:flex;flex-direction:row;gap:8px;align-items:flex-start;font-weight:400;font-size:13px}.bcs-form label.bcs-chk input{margin-top:3px;flex:none;width:auto}.bsl-hist li{display:block}.bsl-hist small{color:#7b887e}.bsl-plan .bcs-prog{max-width:520px}@media(max-width:700px){.bsl-two{grid-template-columns:1fr}.bsl-line{grid-template-columns:1fr 60px 90px 34px}.bsl-evid dl{grid-template-columns:1fr}}';
  document.head.appendChild(css);
})();
