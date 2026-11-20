'use strict';
// Partner Ağı (Faz 3): firmalar arası aday yönlendirme. Arka uç: /api/platform/admin/network/*
// Dizine girmek isteğe bağlıdır; müşteri bilgisi yalnız müşterinin onayıyla ve alıcı kabul edince açılır. Pay yalnız kayıt içindir.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const wrap = (title, sub) => '<div class="bcs">' + heading(title) + (sub ? '<p class="bcs-sub">' + sub + '</p>' : '') + '<div id="bnw-root"><div class="loading">Yükleniyor…</div></div></div>';
  const run = fn => setTimeout(async () => { try { await fn($('#bnw-root')); } catch (e) { const r = $('#bnw-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
  const modal = (title, html) => { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; if (!$('#modal').open) $('#modal').showModal(); };
  const closeModal = () => $('#modal').open && $('#modal').close();
  const opt = (v, l, sel) => '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(l) + '</option>';
  const chip = (t, c) => '<span class="bcs-chip ' + (c || '') + '">' + esc(t) + '</span>';
  const dt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}) : '');
  const money = (c, cur) => (c / 100).toLocaleString('tr-TR', {minimumFractionDigits: 2}) + ' ' + (cur || '');
  const csv = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const SC = {pending: 'warn', accepted: 'ok', contacted: 'ok', won: 'ok', declined: 'bad', withdrawn: 'bad', lost: 'bad'};

  // ---------------- Profil ve dizin ----------------
  let ME = null, DIR = null;
  const netPage = () => { run(async root => { ME = await A('network/me'); DIR = await A('network/directory'); drawNet(root); }); return wrap('Partner Ağı', 'Diğer danışmanlık firmalarıyla müşteri yönlendirin. Katılım isteğe bağlıdır; müşteri bilgileriniz ancak siz izin verdiğinizde ve karşı firma kabul ettiğinde paylaşılır.'); };
  function drawNet(root) {
    root = root || $('#bnw-root'); if (!root) return;
    const p = ME.profile || {name: ME.defaultName, contactEmail: '', about: '', countries: [], services: [], languages: [], share: 0, listed: false};
    const firms = DIR.firms.map(f => '<article class="bcs-card"><b>' + esc(f.name) + '</b><small>' + esc(f.countries.join(', ') || '—') + '</small><p>' + esc(f.about || '') + '</p><div class="bcs-chips">' + f.services.map(s => chip(s)).join('') + f.languages.map(l => chip(l.toUpperCase())).join('') + (f.share ? chip('pay %' + f.share, 'ok') : '') + '</div><div class="bcs-inl" style="margin-top:6px"><button class="btn small" data-nw-refer-to="' + esc(f.tenant) + '">Müşteri yönlendir</button></div></article>').join('');
    root.innerHTML = '<section class="panel bcs-p"><header class="panel-head"><h2>Firma profiliniz</h2>' + (p.listed ? chip('Dizinde görünüyorsunuz', 'ok') : chip('Dizinde görünmüyorsunuz')) + '</header>' +
      '<form class="bcs-form" id="bnw-profile"><div class="bsl-two"><label>Dizinde görünecek ad<input name="name" maxlength="100" value="' + esc(p.name) + '"></label><label>Bildirim e-postası <small>(yalnız yönlendirme bildirimleri; dizinde gösterilmez)</small><input name="contactEmail" type="email" required value="' + esc(p.contactEmail) + '"></label></div>' +
      '<label>Kısa tanıtım<textarea name="about" rows="2" maxlength="600">' + esc(p.about) + '</textarea></label><div class="bsl-two"><label>Çalıştığınız ülkeler <small>(virgülle)</small><input name="countries" value="' + esc(p.countries.join(', ')) + '"></label><label>Hizmetler <small>(virgülle)</small><input name="services" list="bnw-svc" value="' + esc(p.services.join(', ')) + '"><datalist id="bnw-svc">' + ME.services.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist></label></div>' +
      '<div class="bsl-two"><label>Diller <small>(tr, pt, en…)</small><input name="languages" value="' + esc(p.languages.join(', ')) + '"></label><label>Önerdiğiniz yönlendirme payı % <small>(yalnız bilgi amaçlı)</small><input name="share" type="number" min="0" max="50" step="1" value="' + (p.share || 0) + '"></label></div>' +
      '<label class="bcs-chk"><input type="checkbox" name="listed"' + (p.listed ? ' checked' : '') + '> Ağ dizininde görünmek istiyorum (diğer firmalar bana müşteri yönlendirebilir)</label>' +
      '<p class="bcs-hint">Dizinde yalnız ad, ülke, hizmet, dil ve tanıtım yazınız görünür. Profili kaydetmeden yönlendirme gönderemezsiniz; dizinde görünmeden de gönderebilirsiniz. Pay oranı yalnız kayıt içindir: platform para tahsil etmez veya dağıtmaz, ödeme firmalar arasında yapılır.</p><div class="form-actions"><button class="btn" type="submit">Profili kaydet</button></div></form></section>' +
      '<section class="panel bcs-p"><header class="panel-head"><h2>Firma dizini</h2></header><form class="bcs-bar" id="bnw-filter"><input name="q" placeholder="Firma ara" value=""><input name="country" placeholder="Ülke"><input name="service" placeholder="Hizmet"><button class="btn small" type="submit">Ara</button></form><div class="bcs-board bcs-board3" id="bnw-dir" style="grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">' + (firms || '<div class="bmc-empty sm"><b>Dizinde henüz başka firma yok.</b><span>Diğer firmalar dizine katıldıkça burada görünür.</span></div>') + '</div></section>';
  }

  // ---------------- Yönlendirme gönderme ----------------
  async function refer(pre) {
    pre = pre || {}; ME = ME || await A('network/me'); DIR = await A('network/directory');
    if (!ME.profile) { modal('Önce profilinizi kaydedin', '<p>Yönlendirme göndermek için Partner Ağı sayfasında firma profilinizi (bildirim e-postası) kaydetmeniz gerekir.</p><div class="form-actions"><a class="btn" href="#ag" onclick="document.getElementById(\'modal\').close()">Profile git</a></div>'); return; }
    if (!DIR.firms.length) { modal('Dizin boş', '<p>Dizinde yönlendirme yapılabilecek firma yok. Diğer firmalar dizine katıldıkça burada görünür.</p>'); return; }
    modal('Müşteri yönlendir', '<form class="bcs-form" id="bnw-send" data-lead="' + esc(pre.leadId || '') + '"><label>Firma<select name="to" required>' + DIR.firms.map(f => opt(f.tenant, f.name + ' — ' + f.countries.join(', '), f.tenant === pre.to)).join('') + '</select></label>' +
      '<div class="bsl-two"><label>Müşteri adı<input name="name" required minlength="2" maxlength="100" value="' + esc(pre.name || '') + '"></label><label>Hizmet<input name="service" maxlength="60" value="' + esc(pre.service || '') + '"></label></div><div class="bsl-two"><label>E-posta<input name="email" type="email" value="' + esc(pre.email || '') + '"></label><label>Telefon<input name="phone" maxlength="40" value="' + esc(pre.phone || '') + '"></label></div>' +
      '<label>Ülke<input name="country" maxlength="60" value="' + esc(pre.country || '') + '"></label><label>Not <small>(duruma dair kısa bilgi — iletişim bilgisi yazmayın)</small><textarea name="note" rows="3" maxlength="800"></textarea></label><label>Önerilen yönlendirme payı % <small>(yalnız kayıt)</small><input name="share" type="number" min="0" max="50" step="1" value="' + ((ME.profile && ME.profile.share) || 0) + '"></label>' +
      '<label class="bcs-chk"><input type="checkbox" name="consent" required> Müşteri, bilgilerinin bu firmayla paylaşılmasına onay verdi (onayı sizin aldığınızı doğrularsınız; kaydedilir).</label><p class="bcs-hint">Karşı firma kabul edene kadar yalnız müşterinin adının baş harfi, ülkesi ve hizmeti görünür. Reddedilirse iletişim bilgisi silinir.</p><div class="form-actions"><button class="btn" type="submit">Yönlendirmeyi gönder</button></div></form>');
  }
  window.bmNetRefer = refer;

  // ---------------- Yönlendirmeler ----------------
  let RF = null;
  const refsPage = () => { run(async root => { RF = await A('network/refs'); drawRefs(root); }); return wrap('Yönlendirmeler', 'Gelen yönlendirmeleri yanıtlayın, gönderdiklerinizin durumunu izleyin.'); };
  const histHTML = r => '<details><summary>Geçmiş (' + r.history.length + ')</summary><ul class="bcs-ul bsl-hist">' + r.history.slice().reverse().map(h => '<li><small>' + dt(h.at) + '</small><div>' + esc(h.text) + '</div></li>').join('') + '</ul></details>';
  function recvCard(r) {
    const c = r.client, contact = r.masked ? '<small>İletişim bilgisi kabul edince açılır.</small>' : '<small>' + esc(c.email || '') + (c.phone ? ' · ' + esc(c.phone) : '') + '</small>';
    const acts = r.status === 'pending' ? '<button class="btn small" data-nw-accept="' + r.id + '">Kabul et</button><button class="btn small danger" data-nw-decline="' + r.id + '">Reddet</button>' : (r.status === 'accepted' || r.status === 'contacted') ? (r.status === 'accepted' ? '<button class="btn small" data-nw-st="contacted" data-id="' + r.id + '">İletişim kuruldu</button>' : '') + '<button class="btn small" data-nw-st="won" data-id="' + r.id + '">Kazanıldı</button><button class="btn small danger" data-nw-st="lost" data-id="' + r.id + '">Kaybedildi</button>' : '';
    return '<article class="bcs-card" style="cursor:default"><b>' + esc(c.name) + '</b><small>' + esc(r.from) + ' · ' + esc(r.service || 'Hizmet belirtilmedi') + (c.country ? ' · ' + esc(c.country) : '') + '</small>' + contact + (r.note ? '<p>' + esc(r.note) + '</p>' : '') + '<div class="bcs-chips">' + chip(r.statusText, SC[r.status]) + (r.share ? chip('pay %' + r.share) : '') + (r.value ? chip(money(r.value, r.currency), 'ok') : '') + '</div><div class="bcs-inl" style="margin-top:6px">' + acts + (r.leadId ? '<a class="btn small" href="#adaylar">Aday panosu</a>' : '') + '</div>' + histHTML(r) + '</article>';
  }
  function sentCard(r) {
    return '<article class="bcs-card" style="cursor:default"><b>' + esc(r.client.name) + '</b><small>' + esc(r.to) + ' · ' + esc(r.service || 'Hizmet belirtilmedi') + (r.client.country ? ' · ' + esc(r.client.country) : '') + '</small><div class="bcs-chips">' + chip(r.statusText, SC[r.status]) + (r.share ? chip('pay %' + r.share) : '') + (r.value ? chip(money(r.value, r.currency), 'ok') : '') + '<small>' + dt(r.updated) + '</small></div>' + (r.status === 'pending' ? '<div class="bcs-inl" style="margin-top:6px"><button class="btn small danger" data-nw-withdraw="' + r.id + '">Geri çek</button></div>' : '') + histHTML(r) + '</article>';
  }
  function drawRefs(root) {
    root = root || $('#bnw-root'); if (!root) return;
    const pend = RF.received.filter(r => r.status === 'pending').length;
    root.innerHTML = '<div class="bcs-bar"><button class="btn" data-nw-new>+ Müşteri yönlendir</button></div><section class="panel bcs-p"><header class="panel-head"><h2>Gelen yönlendirmeler' + (pend ? ' (' + pend + ' yanıt bekliyor)' : '') + '</h2></header><div class="bcs-board bcs-board3" style="grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + (RF.received.map(recvCard).join('') || '<p class="bcs-hint">Henüz gelen yönlendirme yok.</p>') + '</div></section>' +
      '<section class="panel bcs-p"><header class="panel-head"><h2>Gönderdiğiniz yönlendirmeler</h2></header><div class="bcs-board bcs-board3" style="grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))">' + (RF.sent.map(sentCard).join('') || '<p class="bcs-hint">Henüz yönlendirme göndermediniz.</p>') + '</div></section>';
  }
  const reload = async () => { RF = await A('network/refs'); if (route() === 'yonlendirmeler') drawRefs(); };

  document.addEventListener('click', async e => {
    const t = e.target, $c = s => t.closest(s); let b;
    try {
      if ((b = $c('[data-nw-refer-to]'))) { await refer({to: b.dataset.nwReferTo}); return; }
      if ($c('[data-nw-new]')) { await refer({}); return; }
      if ((b = $c('[data-nw-accept]'))) { if (!confirm('Yönlendirme kabul edilsin mi? Müşterinin iletişim bilgileri açılır ve Aday Panosu’nda “Yeni” aday olarak görünür.')) return; await A('network/refs/respond', 'POST', {id: b.dataset.nwAccept, action: 'accept'}); await reload(); say('Kabul edildi; aday panonuza eklendi.'); return; }
      if ((b = $c('[data-nw-decline]'))) { const why = prompt('Ret nedeni (isteğe bağlı; gönderen firmaya iletilir):', ''); if (why === null) return; await A('network/refs/respond', 'POST', {id: b.dataset.nwDecline, action: 'decline', note: why}); await reload(); say('Reddedildi; müşterinin iletişim bilgisi silindi.'); return; }
      if ((b = $c('[data-nw-st]'))) { const body = {id: b.dataset.id, status: b.dataset.nwSt}; if (body.status === 'won') { const v = prompt('Anlaşma tutarı (isteğe bağlı; pay hesabı için):', ''); if (v === null) return; if (v) { body.value = v.replace(',', '.'); body.currency = prompt('Para birimi (USD, BRL, EUR, TRY):', 'USD') || 'USD'; } } await A('network/refs/status', 'POST', body); await reload(); say('Durum güncellendi; gönderen firma bilgilendirildi.'); return; }
      if ((b = $c('[data-nw-withdraw]'))) { if (confirm('Yönlendirme geri çekilsin mi? Müşterinin iletişim bilgisi silinir.')) { await A('network/refs/withdraw', 'POST', {id: b.dataset.nwWithdraw}); await reload(); } return; }
    } catch (err) { say(err.message); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target;
    try {
      if (f.id === 'bnw-profile') { e.preventDefault(); const d = new FormData(f); await A('network/profile', 'POST', {name: d.get('name'), contactEmail: d.get('contactEmail'), about: d.get('about'), countries: csv(d.get('countries')), services: csv(d.get('services')), languages: csv(d.get('languages')), share: d.get('share'), listed: !!d.get('listed')}); ME = await A('network/me'); DIR = await A('network/directory'); drawNet(); say('Profil kaydedildi.'); return; }
      if (f.id === 'bnw-filter') { e.preventDefault(); const d = new FormData(f), qs = new URLSearchParams({q: d.get('q'), country: d.get('country'), service: d.get('service')}); DIR = await A('network/directory?' + qs); const keep = [...f.querySelectorAll('input')].map(i => i.value); drawNet(); [...$('#bnw-filter').querySelectorAll('input')].forEach((i, n) => { i.value = keep[n]; }); return; }
      if (f.id === 'bnw-send') { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); await A('network/refs/send', 'POST', {...d, consent: true, leadId: f.dataset.lead || undefined}); closeModal(); say('Yönlendirme gönderildi.'); if (route() === 'yonlendirmeler') await reload(); else location.hash = '#yonlendirmeler'; return; }
    } catch (err) { say(err.message); }
  });

  // ---------------- Yönlendirme ve menü ----------------
  const routes = {ag: netPage, yonlendirmeler: refsPage};
  Object.assign(names, {ag: 'Partner Ağı', yonlendirmeler: 'Yönlendirmeler'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav && !nav.querySelector('a[href="#ag"]')) {
    const el = document.createElement('details');
    el.innerHTML = '<summary>Partner Ağı</summary><div class="dropdown"><a href="#ag">Profil ve dizin</a><a href="#yonlendirmeler">Yönlendirmeler</a></div>';
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    const after = sum('Satış') || sum('Dosyalar') || sum('Destek');
    if (after) after.after(el); else nav.appendChild(el);
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bnw-root')) render(); }, 350);
})();
