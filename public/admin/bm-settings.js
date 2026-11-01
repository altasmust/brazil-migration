'use strict';
// Ayarlar düzeni (E-posta ve Google Meet → Genel Ayarlar, KYC → Güvenlik), Yetkilendirme grupları, Ödeme Altyapıları modülleri.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı. Birkaç saniye sonra tekrar deneyin.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const ic = (n, cls = '') => `<bm-i class="ic ic-${n} ${cls}" aria-hidden="true"></bm-i>`;
  const R = () => window.BMRoutes || {};

  // ---------- Genel Ayarlar / Güvenlik: yalnız çalışan sekmeler ----------
  const PAGES = {general: {'Firma Bilgileri': 'company', 'E-posta (SMTP)': 'eposta', 'Google Meet': 'meet'}, security: {'KYC · Didit': 'kimlik'}};
  const OLD = {eposta: ['general', 'E-posta (SMTP)'], meet: ['general', 'Google Meet'], kimlik: ['security', 'KYC · Didit']};
  let pending = null;
  for (const page of Object.keys(PAGES)) {
    const fn = function () {
      if (pending && pending[0] === page) { tab = pending[1]; pending = null; }
      const T = Object.keys(PAGES[page]); if (!T.includes(tab)) tab = T[0];
      const key = PAGES[page][tab];
      const inner = key === 'company' ? companyPage() : R()[key] ? R()[key]() : '<div class="loading">Yükleniyor…</div>';
      return heading() + `<section class="panel settings-revision">${T.length > 1 ? tabs(T) : ''}<div class="settings bms-tabembed">${inner}</div></section>`;
    };
    if (page === 'general') general = fn; else security = fn;
  }
  const _ov = overview;
  overview = function () {
    const r = route();
    if (OLD[r]) { pending = OLD[r]; setTimeout(() => location.replace('#' + OLD[r][0]), 0); return '<div class="loading">Yönlendiriliyor…</div>'; }
    if (r === 'overview') return dashboard();
    return _ov();
  };

  // ---------- Firma Bilgileri (sitede footer, İletişim, yasal metinler, WhatsApp) ----------
  function companyPage() {
    setTimeout(async () => {
      const root = $('#bmco-root'); if (!root) return;
      let c; try { c = (await A('settings/company')).company || {}; } catch (e) { root.innerHTML = `<div class="bmc-err">${esc(e.message)}</div>`; return; }
      const so = c.socials || {};
      const f = (k, l, v, ph = '', hint = '', type = 'text') => `<label class="bmy-f"><span>${l}</span><input class="bmy-in" name="${k}" type="${type}" value="${esc(v || '')}" placeholder="${esc(ph)}">${hint ? `<small>${hint}</small>` : ''}</label>`;
      root.innerHTML = `<form class="bmco" id="bmco-form"><div class="bmco-grid">
        <section><h3>${ic('building')} Firma</h3>${f('brand', 'Marka adı', c.brand || 'Brazil Migration')}${f('legalName', 'Resmî unvan', c.legalName, 'Ör. Brazil Migration Consultoria Ltda.', 'Gizlilik ve KVKK metinlerinde veri sorumlusu olarak görünür.')}${f('taxId', 'Vergi / şirket numarası', c.taxId, 'Ör. CNPJ 00.000.000/0001-00')}<label class="bmy-f"><span>Adres</span><textarea class="bmy-in" name="address" rows="2" placeholder="Cadde, numara, semt, şehir">${esc(c.address || '')}</textarea><small>İletişim sayfasında ve yasal metinlerde görünür.</small></label></section>
        <section><h3>${ic('phone')} İletişim</h3>${f('email', 'E-posta', c.email, 'bilgi@brazilmigration.com', '', 'email')}${f('phone', 'Telefon', c.phone, '+55 11 0000 0000')}${f('whatsapp', 'WhatsApp numarası', c.whatsapp, '+55 11 90000 0000', 'Ülke koduyla yazın.')}<label class="bmco-cb"><input type="checkbox" name="showWhatsapp" ${c.showWhatsapp ? 'checked' : ''}> Sitenin sağ alt köşesinde WhatsApp butonu göster</label>${f('hours', 'Çalışma saatleri', c.hours, 'Hafta içi 09:00–18:00 (São Paulo)')}</section>
        <section><h3>${ic('globe')} Sosyal medya</h3>${['instagram', 'linkedin', 'facebook', 'youtube', 'x'].map(k => f('s_' + k, {instagram: 'Instagram', linkedin: 'LinkedIn', facebook: 'Facebook', youtube: 'YouTube', x: 'X (Twitter)'}[k], so[k], 'https://')).join('')}<small class="bmco-note">Boş bırakılanlar sitede gösterilmez. Doldurulanlar footer’da ve Google için şirket bilgisinde (schema.org) yer alır.</small></section>
      </div><div class="form-actions"><button class="btn primary" type="submit">${ic('check')} Kaydet</button><a class="btn" href="/iletisim/" target="_blank" rel="noopener">${ic('eye')} İletişim sayfasını gör</a>${c.updated ? `<small class="bmco-note">Son güncelleme: ${new Date(c.updated).toLocaleString('tr-TR')}</small>` : ''}</div></form>`;
      $('#bmco-form').onsubmit = async e => {
        e.preventDefault(); const fd = new FormData(e.target), v = Object.fromEntries(fd);
        const body = {...v, showWhatsapp: !!fd.get('showWhatsapp'), socials: Object.fromEntries(['instagram', 'linkedin', 'facebook', 'youtube', 'x'].map(k => [k, v['s_' + k] || '']))};
        try { await A('settings/company', 'POST', body); say('Firma bilgileri kaydedildi. Sitede birkaç saniye içinde görünür.'); render(); } catch (err) { say(err.message); }
      };
    }, 0);
    return '<div id="bmco-root"><div class="loading">Yükleniyor…</div></div>';
  }

  // ---------- Başlangıç (gösterge paneli) ----------
  const TRD = d => { const [y, m, g] = d.split('-').map(Number); return new Date(y, m - 1, g).toLocaleDateString('tr-TR', {day: 'numeric', month: 'short'}); };
  function chart(d) {
    const S = [['bookings', 'Ön görüşme', '#1b5e20'], ['signups', 'Yeni kayıt', '#7fb069'], ['leads', 'Ön değerlendirme', '#d3a44b']];
    const max = Math.max(1, ...d.days.flatMap(x => S.map(([k]) => d.series[k][x]))), W = 700, H = 190, pad = 26, gw = (W - pad) / d.days.length, bw = Math.max(4, (gw - 8) / 3);
    const ticks = [0, Math.ceil(max / 2), max];
    const bars = d.days.map((x, i) => S.map(([k, l, c], j) => { const v = d.series[k][x], h = v / max * (H - 30); return `<rect x="${pad + i * gw + 4 + j * bw}" y="${H - 20 - h}" width="${bw - 1}" height="${Math.max(h, v ? 2 : 0)}" rx="2" fill="${c}"><title>${TRD(x)} · ${l}: ${v}</title></rect>`; }).join('') + (i % 2 === 0 ? `<text x="${pad + i * gw + gw / 2}" y="${H - 4}" text-anchor="middle">${TRD(x)}</text>` : '')).join('');
    const grid = ticks.map(t => { const y = H - 20 - t / max * (H - 30); return `<line x1="${pad}" x2="${W}" y1="${y}" y2="${y}"/><text x="${pad - 6}" y="${y + 4}" text-anchor="end">${t}</text>`; }).join('');
    const tot = k => d.days.reduce((n, x) => n + d.series[k][x], 0);
    return `<div class="bmd-legend">${S.map(([k, l, c]) => `<span><i style="background:${c}"></i>${l} <b>${tot(k)}</b></span>`).join('')}</div><svg class="bmd-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Son 14 gün">${grid}${bars}</svg>`;
  }
  function funnel(f) {
    const st = [['Ön değerlendirme', f.leads, '#d3a44b'], ['Ön görüşme', f.bookings, '#7fb069'], ['Müşteri', f.customers, '#1b5e20']], max = Math.max(1, ...st.map(x => x[1]));
    return st.map(([l, v, c], i) => `<div class="bmd-fun"><span>${l}</span><div><i style="width:${Math.max(4, v / max * 100)}%;background:${c}"></i></div><b>${v}</b>${i ? `<small>${st[i - 1][1] ? Math.round(v / st[i - 1][1] * 100) + '%' : '—'}</small>` : '<small></small>'}</div>`).join('');
  }
  function dashboard() {
    setTimeout(async () => {
      const root = $('#bmd-root'); if (!root) return;
      let d, v = null; try { [d, v] = await Promise.all([A('dashboard'), fetch('/api/admin/visitors', {cache: 'no-store'}).then(r => r.ok ? r.json() : null).catch(() => null)]); } catch (e) { root.innerHTML = `<div class="bmc-err">${esc(e.message)}</div>`; return; }
      const card = (icn, label, val, sub, href, warn, extra = '') => `<a class="bmd-card ${warn ? 'warn' : ''}" href="${href}"><span class="bmd-ic">${ic(icn)}</span><span class="bmd-cv"><small>${label}</small><b>${val}</b><em>${sub}</em>${extra}</span></a>`;
      const dt = t => t ? new Date(t).toLocaleString('tr-TR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}) : '—';
      const todo = [d.partnersReview && ['briefcase', `${d.partnersReview} partner başvurusu onay bekliyor`, '#partnerler'], d.docsPending && ['doc', `${d.docsPending} belge inceleme bekliyor`, '#customers'], d.credReq && ['shield-check', `${d.credReq} KYC kredi talebi bekliyor`, '#krediler'], d.bookingsOpen && ['calendar', `${d.bookingsOpen} planlanmış ön görüşme`, '#gorusmeler']].filter(Boolean);
      const name = (document.getElementById('user-name')?.textContent || '').trim().split(' ')[0];
      const h = new Date().getHours(), hi = h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
      const kycPct = Math.min(100, Math.round(d.kyc.used / Math.max(1, d.kyc.limit) * 100));
      const sys = [['mail', 'E-posta', d.system.mail === 'smtp' ? 'SMTP' : d.system.mail === 'resend' ? 'Resend' : 'Test modu', d.system.mail !== 'test'], ['shield-check', 'Kimlik doğrulama', d.system.didit ? 'Didit etkin' : 'Kapalı', d.system.didit], ['settings', 'Veritabanı', d.system.db === 'replica' ? 'Hızlı mod' : 'Doğrudan', d.system.db === 'replica']];
      root.innerHTML = `<div class="bmd-hello"><div><h1>${hi}${name && name !== 'Yönetici' ? ', ' + esc(name) : ''}</h1><span>${new Date().toLocaleDateString('tr-TR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</span></div>
          <div class="bmd-quick"><a class="btn" href="#yeni">${ic('plus')} Yeni müşteri</a><a class="btn" href="#blog">${ic('doc')} Blog yazısı</a><a class="btn" href="#sayfalar">${ic('eye')} Sayfaları düzenle</a><a class="btn" href="/" target="_blank" rel="noopener">${ic('globe')} Siteyi aç</a></div></div>
        <div class="bmd-cards">${card('calendar', 'Ön görüşme · 7 gün', d.bookings7, d.bookingsOpen + ' planlanmış', '#gorusmeler')}${card('users', 'Müşteriler', d.customers, '+' + d.customers30 + ' son 30 gün', '#customers')}${card('briefcase', 'Aktif partnerler', d.partnersActive, d.partnersReview ? d.partnersReview + ' başvuru bekliyor' : 'Bekleyen başvuru yok', '#partnerler', d.partnersReview)}${card('shield-check', 'KYC · bu ay', d.kyc.used + ' / ' + d.kyc.limit, d.credReq ? d.credReq + ' kredi talebi' : 'Didit aylık limit', '#krediler', d.credReq, `<span class="bmd-bar"><i style="width:${kycPct}%"></i></span>`)}${card('target', 'Ön değerlendirme · 30 gün', d.leads30, 'Tamamlanan testler', '#degerlendirmeler')}</div>
        <div class="bmd-row2"><section class="panel"><header class="panel-head"><h2>${ic('calendar')} Son 14 gün</h2><a class="bmd-more" href="#analytics">Raporlar</a></header><div class="bmd-pad">${chart(d)}</div></section>
          <section class="panel"><header class="panel-head"><h2><span class="bmd-live"></span> Şu an sitede</h2><a class="bmd-more" href="#analytics">Ayrıntı</a></header><div class="bmd-pad">${v ? `<div class="bmd-vis"><div><b>${v.active}</b><small>aktif ziyaretçi · son 5 dk</small></div><div><b>${v.last24h}</b><small>son 24 saat</small></div></div><div class="bmd-pages">${(v.pages || []).slice(0, 5).map(p => `<div><span>${esc(p.path)}</span><b>${p.count}</b></div>`).join('') || '<p class="bmd-empty">Şu an sitede kimse yok.</p>'}</div><small class="bmd-note">Yalnız çerez iznini kabul eden ziyaretçiler sayılır.</small>` : '<p class="bmd-empty">Ziyaretçi verisi alınamadı.</p>'}</div></section></div>
        <div class="bmd-cols"><section class="panel"><header class="panel-head"><h2>${ic('bell')} Yapılacaklar</h2></header><div class="bmd-list">${todo.length ? todo.map(([i, t, h]) => `<a class="bmd-item" href="${h}"><span class="bmd-ic sm">${ic(i)}</span><span>${esc(t)}</span>${ic('arrow-right')}</a>`).join('') : `<p class="bmd-empty">${ic('check')} Bekleyen iş yok.</p>`}</div></section>
          <section class="panel"><header class="panel-head"><h2>${ic('calendar')} Son ön görüşme talepleri</h2><a class="bmd-more" href="#gorusmeler">Tümü</a></header><div class="bmd-list">${d.upcoming.length ? d.upcoming.map(b => `<a class="bmd-item" href="#gorusmeler"><span class="bmd-av">${esc((b.name || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase())}</span><span><b>${esc(b.name || '—')}</b><small>${esc(b.service || 'Ön görüşme')} · ${dt(b.start || b.created)}</small></span><span class="bmy-pill ${b.status === 'Planlandı' ? 'on' : ''}">${esc(b.status)}</span></a>`).join('') : '<p class="bmd-empty">Henüz ön görüşme talebi yok.</p>'}</div></section>
          <section class="panel"><header class="panel-head"><h2>${ic('user')} Son kayıtlar</h2><a class="bmd-more" href="#customers">Tümü</a></header><div class="bmd-list">${d.newest.length ? d.newest.map(p => `<a class="bmd-item" href="#account/${encodeURIComponent(p.id)}"><span class="bmd-av ${p.role === 'advisor' ? 'p' : ''}">${esc((p.name || p.email || '?').trim().split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase())}</span><span><b>${esc(p.name || p.email)}</b><small>${p.role === 'advisor' ? 'Partner' : 'Müşteri'} · ${dt(p.created)}</small></span>${ic('arrow-right')}</a>`).join('') : '<p class="bmd-empty">Henüz kayıt yok.</p>'}</div></section></div>
        <div class="bmd-row2 b"><section class="panel"><header class="panel-head"><h2>${ic('target')} Dönüşüm</h2><small class="bmd-note">Tüm zamanlar</small></header><div class="bmd-pad">${funnel(d.funnel)}</div></section>
          <section class="panel"><header class="panel-head"><h2>${ic('settings')} Sistem</h2><a class="bmd-more" href="#durum">Sistem durumu</a></header><div class="bmd-list">${sys.map(([i, l, t, ok]) => `<div class="bmd-item"><span class="bmd-ic sm ${ok ? '' : 'off'}">${ic(i)}</span><span><b>${l}</b><small>${t}</small></span><span class="bmy-pill ${ok ? 'on' : ''}">${ok ? 'Hazır' : 'Kontrol et'}</span></div>`).join('')}</div></section></div>`;
    }, 0);
    return `<div id="bmd-root" class="bmd"><div class="loading">Yükleniyor…</div></div>`;
  }

  // ---------- YETKİLENDİRME: gruplar ----------
  const PERMS = {
    'Panel': ['Başlangıç ekranı', 'Gelir istatistikleri', 'Notlar', 'Hatırlatmalar', 'Görevler'],
    'Müşteriler': ['Listeleme', 'Görüntüleme', 'Oluşturma', 'Düzenleme', 'Silme', 'Hesabı yönet (giriş yap)', 'Dosyalar'],
    'Partnerler': ['Başvuruları görüntüleme', 'Onay / red', 'KYC kredileri'],
    'Ön görüşmeler': ['Görüntüleme', 'Düzenleme'],
    'Faturalandırma': ['Faturalar', 'Ödemeler', 'Ödeme altyapıları'],
    'Destek': ['Talepleri görüntüleme', 'Yanıtlama'],
    'Site yönetimi': ['Sayfalar', 'Blog yazıları', 'Menü'],
    'Ayarlar': ['Genel ayarlar', 'E-posta ve Meet', 'Güvenlik ve KYC', 'Personel', 'Yetkilendirme', 'Sistem durumu'],
  };
  const ALL = Object.entries(PERMS).flatMap(([g, ps]) => ps.map(p => g + ' / ' + p));
  const DEFAULT_GROUPS = [
    {id: 'g-admin', name: 'Yöneticiler', desc: 'Tüm yetkiler', perms: ALL, members: []},
    {id: 'g-advisor', name: 'Danışmanlar', desc: 'Müşteri dosyaları ve ön görüşmeler', perms: ALL.filter(x => /^(Müşteriler|Ön görüşmeler|Destek)/.test(x) && !/Silme/.test(x)), members: []},
    {id: 'g-finance', name: 'Muhasebe', desc: 'Fatura ve ödemeler', perms: ALL.filter(x => /^Faturalandırma/.test(x) || x === 'Müşteriler / Görüntüleme'), members: []},
  ];
  let G = null, sel = null;
  const loadGroups = () => { try { const d = JSON.parse(state.config['permission-groups']?.data || 'null'); return Array.isArray(d) && d.length ? d : JSON.parse(JSON.stringify(DEFAULT_GROUPS)); } catch { return JSON.parse(JSON.stringify(DEFAULT_GROUPS)); } };
  async function saveGroups() {
    const data = JSON.stringify(G.map(g => ({id: g.id, name: g.name, desc: g.desc, perms: g.perms.filter(p => ALL.includes(p)), members: g.members})));
    await api('config', {section: 'permission-groups', values: {data}});
    state.config['permission-groups'] = {data};
  }
  permissions = function () {
    G = G || loadGroups(); if (!sel || !G.find(g => g.id === sel)) sel = G[0]?.id;
    const g = G.find(x => x.id === sel), staffList = records('staff');
    const memberOf = id => G.filter(x => x.members.includes(id)).map(x => x.name);
    return heading() + `<div class="bmp-perm">
      <aside class="panel bmp-groups"><header class="panel-head"><h2>Gruplar</h2><button class="btn small" data-bmp="new">${ic('plus')} Yeni grup</button></header>
        ${G.map(x => `<button class="bmp-g ${x.id === sel ? 'on' : ''}" data-bmp-sel="${esc(x.id)}"><b>${esc(x.name)}</b><small>${x.perms.length}/${ALL.length} yetki · ${x.members.length} kişi</small></button>`).join('')}
        <p class="bmp-note">${ic('info')} Şu an yönetim paneline yalnızca site sahibi girebilir. Personele giriş açıldığında, kişi hangi gruptaysa o grubun yetkileriyle çalışır. Birden çok gruptaki kişi, grupların tüm yetkilerini alır.</p></aside>
      ${g ? `<section class="panel bmp-edit"><header class="panel-head"><h2>${esc(g.name)}</h2><span class="sp"></span><button class="btn small danger" data-bmp="del" ${G.length < 2 ? 'disabled' : ''}>${ic('x')} Grubu sil</button><button class="btn small primary" data-bmp="save">${ic('check')} Kaydet</button></header>
        <div class="bmp-body"><div class="bmp-row"><label>Grup adı<input class="bmp-in" data-bmp-f="name" value="${esc(g.name)}"></label><label>Açıklama<input class="bmp-in" data-bmp-f="desc" value="${esc(g.desc || '')}" placeholder="Bu grup ne yapar?"></label></div>
        <h3 class="bmp-h">Üyeler</h3>${staffList.length ? `<div class="bmp-members">${staffList.map(s => `<label class="bmp-m"><input type="checkbox" data-bmp-mem="${esc(s.id)}" ${g.members.includes(s.id) ? 'checked' : ''}><span><b>${esc(s.name)}</b><small>${esc(s.email || '')}${memberOf(s.id).filter(n => n !== g.name).length ? ' · ' + esc(memberOf(s.id).filter(n => n !== g.name).join(', ')) : ''}</small></span></label>`).join('')}</div>` : `<p class="bmp-empty">Henüz personel yok. <a href="#staff">Yönetici ve Personeller</a> sayfasından ekleyin, sonra buradan gruba atayın.</p>`}
        <h3 class="bmp-h">Yetkiler <label class="bmp-all"><input type="checkbox" data-bmp-all ${g.perms.length === ALL.length ? 'checked' : ''}> Tümünü seç</label></h3>
        <div class="bmp-grid">${Object.entries(PERMS).map(([sec, ps]) => { const keys = ps.map(p => sec + ' / ' + p), on = keys.filter(k => g.perms.includes(k)).length; return `<section class="bmp-sec"><h4><label><input type="checkbox" data-bmp-sec="${esc(sec)}" ${on === keys.length ? 'checked' : ''}> ${esc(sec)}</label><small>${on}/${keys.length}</small></h4>${ps.map(p => `<label><input type="checkbox" data-bmp-p="${esc(sec + ' / ' + p)}" ${g.perms.includes(sec + ' / ' + p) ? 'checked' : ''}> ${esc(p)}</label>`).join('')}</section>`; }).join('')}</div></div></section>` : ''}</div>`;
  };
  document.addEventListener('click', async e => {
    const root = e.target.closest('.bmp-perm'); if (!root) return;
    const t = e.target.closest('[data-bmp],[data-bmp-sel]'); if (!t) return;
    const g = G.find(x => x.id === sel);
    if (t.dataset.bmpSel) { sel = t.dataset.bmpSel; render(); return; }
    const a = t.dataset.bmp;
    try {
      if (a === 'new') { const name = prompt('Grup adı', 'Yeni grup'); if (!name) return; const id = 'g-' + Date.now().toString(36); G.push({id, name: name.slice(0, 60), desc: '', perms: [], members: []}); sel = id; await saveGroups(); say('Grup oluşturuldu.'); render(); }
      if (a === 'del' && g && confirm(`“${g.name}” grubu silinsin mi?`)) { G = G.filter(x => x !== g); sel = G[0]?.id; await saveGroups(); say('Grup silindi.'); render(); }
      if (a === 'save') { await saveGroups(); say('Grup yetkileri kaydedildi.'); render(); }
    } catch (err) { say(err.message); }
  });
  document.addEventListener('change', e => {
    if (!e.target.closest('.bmp-perm')) return;
    const g = G.find(x => x.id === sel); if (!g) return; const t = e.target;
    if (t.dataset.bmpMem) { g.members = t.checked ? [...new Set([...g.members, t.dataset.bmpMem])] : g.members.filter(x => x !== t.dataset.bmpMem); }
    if (t.dataset.bmpP) { g.perms = t.checked ? [...new Set([...g.perms, t.dataset.bmpP])] : g.perms.filter(x => x !== t.dataset.bmpP); }
    if (t.dataset.bmpSec) { const keys = PERMS[t.dataset.bmpSec].map(p => t.dataset.bmpSec + ' / ' + p); g.perms = t.checked ? [...new Set([...g.perms, ...keys])] : g.perms.filter(x => !keys.includes(x)); }
    if ('bmpAll' in t.dataset) g.perms = t.checked ? [...ALL] : [];
    if (t.dataset.bmpMem || t.dataset.bmpP || t.dataset.bmpSec || 'bmpAll' in t.dataset) { const y = scrollY; render(); scrollTo(0, y); }
  });
  document.addEventListener('input', e => { const t = e.target; if (!t.dataset.bmpF) return; const g = G.find(x => x.id === sel); if (g) g[t.dataset.bmpF] = t.value.slice(0, t.dataset.bmpF === 'name' ? 60 : 160); });

  // ---------- ÖDEME ALTYAPILARI ----------
  let M = null, flt = {status: 'all', cat: '', q: ''};
  const tile = m => `<span class="bmy-ico" style="--c:${m.color}">${ic(m.icon)}</span>`;
  const pill = m => m.enabled ? `<span class="bmy-pill on">${ic('check')} Etkin</span>` : `<span class="bmy-pill">${ic('power')} Devre dışı</span>`;
  const sw = m => `<label class="bmy-sw" title="${m.enabled ? 'Devre dışı bırak' : 'Etkinleştir'}"><input type="checkbox" data-bmy-tog="${m.id}" ${m.enabled ? 'checked' : ''}><span></span></label>`;
  payments = function () {
    if (!['Başlangıç', 'Tüm Modüller'].includes(tab)) tab = 'Başlangıç';
    setTimeout(async () => { try { if (!M) M = (await A('payments')).modules; draw(); } catch (e) { const r = $('#bmy-root'); if (r) r.innerHTML = `<div class="bmc-err">${esc(e.message)}</div>`; } }, 0);
    return heading() + `<section class="panel">${tabs(['Başlangıç', 'Tüm Modüller'])}<div id="bmy-root" class="bmy"><div class="loading">Yükleniyor…</div></div></section>`;
  };
  function draw() {
    const root = $('#bmy-root'); if (!root || !M) return;
    const on = M.filter(m => m.enabled);
    if (tab === 'Başlangıç') {
      root.innerHTML = `<div class="bmy-start"><div class="bmy-stats"><div><b>${M.length}</b><small>Modül</small></div><div class="ok"><b>${on.length}</b><small>Etkin</small></div><div><b>${on.filter(m => m.mode === 'test' && m.id !== 'havale').length}</b><small>Test modunda</small></div></div>
        <h3 class="bmy-h">Etkin ödeme yöntemleri</h3>${on.length ? `<div class="bmy-list">${on.map(m => `<button class="bmy-row" data-bmy-open="${m.id}">${tile(m)}<span><b>${esc(m.label || m.name)}</b><small>${esc(m.category)}${m.id !== 'havale' ? ' · ' + (m.mode === 'live' ? 'Canlı' : 'Test modu') : ' · ' + (m.values.accounts || []).length + ' hesap'}</small></span>${pill(m)}</button>`).join('')}</div>` : `<div class="bmy-empty">${ic('credit-card', 'ic-xl')}<b>Henüz etkin ödeme yöntemi yok.</b><span>Tüm Modüller sekmesinden bir modül seçip bilgilerini girerek etkinleştirin.</span><button class="btn primary" data-tab="Tüm Modüller">Modülleri gör</button></div>`}
        <div class="info">Kartla ödeme modülleri (iyzico, PayTR, Shopier, Paratika) bilgileri kaydedip etkinleştirmenize hazırdır. Gizli anahtarlar sunucuda saklanır ve tarayıcıya geri gönderilmez. Canlı tahsilata geçmeden önce test modunda deneme yapın.</div></div>`;
    } else {
      const cats = [...new Set(M.map(m => m.category))];
      const list = M.filter(m => (flt.status === 'all' || (flt.status === 'on') === m.enabled) && (!flt.cat || m.category === flt.cat) && (!flt.q || (m.name + ' ' + m.category).toLocaleLowerCase('tr').includes(flt.q.toLocaleLowerCase('tr'))));
      root.innerHTML = `<div class="bmy-all"><aside class="bmy-filters"><h3>Filtreler</h3>
          <div class="bmy-radios">${[['all', 'Tümü'], ['on', 'Etkin'], ['off', 'Devre dışı']].map(([v, l]) => `<label><input type="radio" name="bmy-st" value="${v}" ${flt.status === v ? 'checked' : ''}> ${l}</label>`).join('')}</div>
          <select class="bmy-in" id="bmy-cat"><option value="">Tüm kategoriler</option>${cats.map(c => `<option ${flt.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
          <button class="btn small" id="bmy-clear">${ic('refresh')} Filtreleri temizle</button>
          <div class="bmy-count"><div><b>${M.length}</b><small>Toplam</small></div><div class="ok"><b>${on.length}</b><small>Etkin</small></div></div></aside>
        <div><div class="bmy-head"><span class="bmy-hico">${ic('settings')}</span><div><b>Tüm Modüller</b><small>Ödeme altyapılarını seçin, bilgilerini girin ve etkinleştirin. Bir karta tıklayarak ayarlarını açın.</small></div></div>
          <label class="bmy-search">${ic('search')}<input id="bmy-q" placeholder="Modüller içinde ara" value="${esc(flt.q)}"></label>
          <div class="bmy-grid">${list.map(m => `<article class="bmy-card ${m.enabled ? 'on' : ''}" data-bmy-open="${m.id}" tabindex="0">${tile(m)}<div class="bmy-top">${pill(m)}</div><b>${esc(m.label || m.name)}</b><small>${esc(m.category)} · ${esc(m.region)}</small><p>${esc(m.desc)}</p><div class="bmy-foot"><span class="bmy-cfg">${ic('settings')} ${m.ready ? 'Ayarları düzenle' : 'Bilgileri gir'}</span>${sw(m)}</div></article>`).join('') || '<div class="bmy-empty">Eşleşen modül yok.</div>'}</div></div></div>`;
      root.querySelectorAll('[name=bmy-st]').forEach(r => r.onchange = () => { flt.status = r.value; draw(); });
      $('#bmy-cat').onchange = e => { flt.cat = e.target.value; draw(); };
      $('#bmy-clear').onclick = () => { flt = {status: 'all', cat: '', q: ''}; draw(); };
      const q = $('#bmy-q'); q.oninput = () => { flt.q = q.value; const p = q.selectionStart; draw(); const n = $('#bmy-q'); n.focus(); n.setSelectionRange(p, p); };
    }
  }
  async function toggle(id, enabled, box) {
    try { M = (await A('payments/save', 'POST', {id, enabled})).modules; say(enabled ? 'Modül etkinleştirildi.' : 'Modül devre dışı bırakıldı.'); draw(); }
    catch (e) { if (box) box.checked = !enabled; say(e.message); if (enabled) openModule(id, e.message); }
  }
  function openModule(id, warn) {
    const m = M.find(x => x.id === id); if (!m) return;
    const accounts = JSON.parse(JSON.stringify(m.values.accounts || []));
    const acc = () => accounts.map((a, i) => `<div class="bmy-acc"><input class="bmy-in" data-a="${i}.bank" value="${esc(a.bank)}" placeholder="Banka"><input class="bmy-in" data-a="${i}.holder" value="${esc(a.holder)}" placeholder="Hesap sahibi"><input class="bmy-in mono" data-a="${i}.iban" value="${esc(a.iban)}" placeholder="TR00 0000 0000 0000 0000 0000 00"><select class="bmy-in" data-a="${i}.currency">${['TRY', 'USD', 'EUR', 'BRL'].map(c => `<option ${a.currency === c ? 'selected' : ''}>${c}</option>`).join('')}</select><button type="button" class="bmy-x" data-arm="${i}" title="Kaldır">${ic('x')}</button></div>`).join('') || '<p class="bmy-muted">Henüz hesap eklenmedi.</p>';
    const fields = m.fields.map(f => f.type === 'accounts' ? `<div class="bmy-f full"><span>${esc(f.label)}</span><div id="bmy-accs">${acc()}</div><button type="button" class="btn small" id="bmy-aadd">${ic('plus')} Hesap ekle</button></div>`
      : f.type === 'textarea' ? `<label class="bmy-f full"><span>${esc(f.label)}</span><textarea class="bmy-in" name="${f.k}" rows="3" placeholder="${esc(f.ph || '')}">${esc(m.values[f.k] || '')}</textarea></label>`
      : `<label class="bmy-f"><span>${esc(f.label)}${f.req ? ' *' : ''}</span><input class="bmy-in mono" name="${f.k}" ${f.secret ? 'type="password" autocomplete="new-password"' : 'autocomplete="off"'} value="${esc(m.values[f.k] || '')}" placeholder="${f.secret && m.values[f.k] ? 'Kayıtlı — değiştirmek için yazın' : ''}"></label>`).join('');
    $('#modal-title').textContent = m.name + ' ayarları';
    $('#modal-body').innerHTML = `<form class="bmy-form" id="bmy-form">${warn ? `<div class="info warning">${esc(warn)}</div>` : ''}
      <div class="bmy-mhead">${tile(m)}<div><b>${esc(m.name)}</b><small>${esc(m.desc)}</small></div><label class="bmy-sw big"><input type="checkbox" name="enabled" ${m.enabled ? 'checked' : ''}><span></span></label></div>
      <div class="bmy-fields"><label class="bmy-f"><span>Müşteriye görünen ad</span><input class="bmy-in" name="label" value="${esc(m.label)}" placeholder="${esc(m.name)}"></label>
      ${m.modes ? `<label class="bmy-f"><span>Çalışma modu</span><select class="bmy-in" name="mode"><option value="test" ${m.mode !== 'live' ? 'selected' : ''}>Test (deneme ödemeleri)</option><option value="live" ${m.mode === 'live' ? 'selected' : ''}>Canlı (gerçek tahsilat)</option></select></label>` : ''}
      ${fields}</div><p class="bmy-help">${ic('info')} ${esc(m.help)}</p>
      <div class="form-actions"><button type="button" class="btn" data-action="close">Vazgeç</button><button class="btn primary" type="submit">${ic('check')} Kaydet</button></div></form>`;
    if (!$('#modal').open) $('#modal').showModal();
    const redraw = () => { $('#bmy-accs').innerHTML = acc(); };
    const form = $('#bmy-form');
    form.oninput = e => { const a = e.target.dataset.a; if (a) { const [i, k] = a.split('.'); accounts[i][k] = e.target.value; } };
    form.onchange = form.oninput;
    form.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'bmy-aadd') { accounts.push({bank: '', holder: '', iban: '', currency: 'TRY'}); redraw(); } if (b.dataset.arm) { accounts.splice(+b.dataset.arm, 1); redraw(); } };
    form.onsubmit = async e => {
      e.preventDefault(); const fd = new FormData(form), values = {};
      for (const f of m.fields) values[f.k] = f.type === 'accounts' ? accounts : (fd.get(f.k) ?? '');
      try { M = (await A('payments/save', 'POST', {id, enabled: !!fd.get('enabled'), mode: fd.get('mode') || undefined, label: fd.get('label') || '', values})).modules; $('#modal').close(); say('Ödeme modülü kaydedildi.'); draw(); }
      catch (err) { say(err.message); }
    };
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('#bmy-root')) return;
    if (e.target.closest('.bmy-sw')) return;
    const c = e.target.closest('[data-bmy-open]'); if (c) openModule(c.dataset.bmyOpen);
  });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset?.bmyTog) toggle(t.dataset.bmyTog, t.checked, t); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches?.('.bmy-card')) openModule(e.target.dataset.bmyOpen); });

  Object.assign(names, {overview: 'Başlangıç', general: 'Genel Ayarlar', security: 'Güvenlik ve KYC', permissions: 'Yetkilendirme', payments: 'Ödeme Altyapıları'});
})();
