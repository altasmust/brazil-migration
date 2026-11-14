'use strict';
// Panel v2 (müşteri + danışman): görüşme kayıtları, canlı bildirimler, ipucu balonları, başvuru türüne göre görseller.
(() => {
  const partner = location.pathname.startsWith('/partner/');
  document.body.dataset.v2 = partner ? 'partner' : 'customer';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const api = async (p, opt) => { const r = await fetch('/api/workspace/' + p, {credentials: 'same-origin', cache: 'no-store', ...opt}); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
  const TZ = 'Europe/Istanbul';
  const dt = t => new Date(t).toLocaleString('tr-TR', {timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'});
  const hm = t => new Date(t).toLocaleTimeString('tr-TR', {timeZone: TZ, hour: '2-digit', minute: '2-digit'});
  const dur = sec => { sec = Math.max(0, Math.round(sec || 0)); const m = Math.floor(sec / 60), s = sec % 60; return m ? (s ? `${m} dk ${s} sn` : `${m} dk`) : `${s} sn`; };
  const ago = t => { const d = (Date.now() - t) / 1000; if (d < 60) return 'şimdi'; if (d < 3600) return Math.floor(d / 60) + ' dk önce'; if (d < 86400) return Math.floor(d / 3600) + ' sa önce'; return new Date(t).toLocaleDateString('tr-TR', {timeZone: TZ, day: '2-digit', month: 'short'}); };

  // ---------------- görüşme kayıtları ----------------
  let HIST = null, HT = 0, HP = null;
  const hist = (force = false) => {
    if (!force && HIST && Date.now() - HT < 20000) return Promise.resolve(HIST);
    return HP ||= api('meet/history').then(d => { HIST = d.sessions || []; HT = Date.now(); return HIST; }).catch(() => HIST || []).finally(() => { HP = null; });
  };
  const who = s => partner ? (s.customerName || 'Müşteri') : (s.hostName || 'Danışmanınız');
  const sumText = s => s.summary ? esc(s.summary) : '';
  function meetingCard(s) {
    return `<article class="card card-pad mt-card"><div class="mt-head"><div><h2>${esc(who(s))}</h2><small>${esc(dt(s.start))} – ${esc(hm(s.end))}</small></div>
      <div class="mt-chips"><span>⏱ ${esc(dur(s.sec))}</span>${s.hostName ? `<span>👤 ${esc(s.hostName)}${partner && s.customerName ? ' · ' + esc(s.customerName) : ''}</span>` : ''}<span>🔑 ${esc(s.room)}</span></div></div>
      <p class="mt-sumh">GÖRÜŞME ÖZETİ</p>
      ${s.summary ? `<p class="mt-sum">${sumText(s)}</p>` : `<p class="mt-sum none">${s.lines ? 'Özet hazırlanıyor veya oluşturulamadı.' : 'Bu görüşme için konuşma dökümü kaydedilmediği için özet yok.'}</p>`}
      ${s.docId ? `<div><a class="btn secondary small" href="/api/workspace/file/${esc(s.docId)}?download">Döküm dosyasını indir</a></div>` : ''}</article>`;
  }
  const meetingsHeading = `<div class="page-heading"><div><span class="eyebrow">BRAZIL MIGRATION / ${partner ? 'PARTNER' : 'MÜŞTERİ'}</span><h1>Görüşmeler</h1><p>${partner ? 'Müşterilerinizle yaptığınız görüşmelerin tarihi, süresi ve özeti.' : 'Danışmanınızla yaptığınız görüşmelerin tarihi, süresi ve özeti.'}</p></div></div>`;
  async function showMeetings() {
    const c = $('#content'); c.innerHTML = meetingsHeading + '<div class="card card-pad">Yükleniyor…</div>';
    const list = await hist(true);
    if (location.hash !== '#meetings') return;
    c.innerHTML = meetingsHeading + (list.length ? `<div class="mt-list">${list.map(meetingCard).join('')}</div>` : `<div class="card card-pad"><p>Henüz tamamlanmış bir görüşme yok.</p><p class="subtle">Bir görüşme bittiğinde tarih, süre ve konuşulanların özeti burada listelenir.</p></div>`);
  }
  function recentCard(list) {
    const top = list.slice(0, 3);
    return `<article class="card card-pad mt-recent"><div class="section-head"><div><h2>Son görüşmeler</h2><p>Tarih, süre ve görüşme özeti</p></div><a class="btn secondary small" href="#meetings">Tümü</a></div>${top.map(s => `<div class="mt-mini"><span class="mt-dot">📹</span><div><b>${esc(who(s))}</b><small>${esc(dt(s.start))}</small>${s.summary ? `<p>${esc(s.summary)}</p>` : ''}</div><span class="mt-dur">${esc(dur(s.sec))}</span></div>`).join('')}</article>`;
  }

  // ---------------- sayfa yönlendirme (render sarmalayıcı) ----------------
  function markNav(h) {
    document.querySelectorAll('[data-page]').forEach(a => { const on = a.dataset.page === h; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  }
  function after() {
    const h = location.hash.slice(1) || 'overview';
    if (h === 'meetings') { markNav('meetings'); showMeetings(); }
    else if (partner && h === 'team') {
      markNav('team'); const f = window.BMFeatures;
      $('#content').innerHTML = f?.ready ? f.view('team') : '<div class="card card-pad">Hesap bilgileriniz yükleniyor…</div>';
    }
    decorate();
  }
  const baseRender = render;
  render = function () { baseRender(); after(); };
  window.addEventListener('hashchange', () => setTimeout(() => { if (location.hash === '#meetings' || (partner && location.hash === '#team')) after(); }, 0));

  // ---------------- başvuru türüne göre görseller ----------------
  const SV = {
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/></svg>',
    building: '<svg viewBox="0 0 24 24"><path d="M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M17 13h1M17 17h1"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h4"/></svg>'
  };
  const kindOf = s => /oturum/i.test(s) ? 'permit' : /şirket/i.test(s) ? 'company' : /vize/i.test(s) ? 'visa' : /vatanda/i.test(s) ? 'citizen' : /vergi/i.test(s) ? 'tax' : 'other';
  function visual(kind, name) {
    const n = esc(name || 'BRAZIL MIGRATION');
    const row = (ic, sub) => `<div class="vr"><span class="vp">${SV[ic]}</span><div><strong>${n}</strong><span>BRAZIL MIGRATION</span><span>${sub}</span></div></div>`;
    if (kind === 'permit') return `<div class="vis-card vis-permit"><small>República Federativa do Brasil</small><div class="vt">RESIDÊNCIA • OTURUM</div>${row('user', 'HİZMET TAKİBİ')}<div class="vb"></div></div>`;
    if (kind === 'company') return `<div class="vis-card vis-company"><small>Cadastro Nacional da Pessoa Jurídica</small><div class="vt">CNPJ • ŞİRKET</div>${row('building', 'ŞİRKET KURULUMU')}<div class="vb"></div></div>`;
    if (kind === 'visa') return `<div class="vis-card vis-visa"><small>Passaporte · Visto</small><div class="vt">VİZE BAŞVURUSU</div>${row('globe', 'VİZE DANIŞMANLIĞI')}<div class="vstamp">BRASIL<br>VISTO</div></div>`;
    if (kind === 'citizen') return `<div class="vis-card vis-citizen"><small>Certidão · Nacionalidade</small><div class="vt">VATANDAŞLIK</div>${row('user', 'NATURALIZAÇÃO')}<div class="vseal">★</div></div>`;
    if (kind === 'tax') return `<div class="vis-card vis-tax"><small>Cadastro de Pessoas Físicas</small><div class="vt">CPF • VERGİ NO</div>${row('doc', '000.000.000-00')}<div class="vb"></div></div>`;
    if (kind === 'none') return `<div class="vis-card vis-none"><div><div class="vt">Başvuru bekleniyor</div><small>İlk başvurunuz açıldığında burada görünür</small></div></div>`;
    return `<div class="vis-card vis-other"><small>Brazil Migration</small><div class="vt">BAŞVURU DOSYASI</div>${row('doc', 'DİĞER HİZMET')}<div class="vb"></div></div>`;
  }
  function decorate() {
    // 1) genel bakış: "Başvurunuz ne aşamada?" kartındaki görsel
    document.querySelectorAll('.permit-visual:not([data-v2])').forEach(pv => {
      const card = pv.querySelector('.identity-card'); if (!card) return;
      const sub = pv.closest('article')?.querySelector('.section-head p')?.textContent || '';
      const svc = sub.includes('·') ? sub.split('·')[0].trim() : '';
      const kind = svc ? kindOf(svc) : 'none';
      const name = card.querySelector('.id-content strong')?.textContent || '';
      pv.dataset.v2 = kind;
      if (kind !== 'permit') card.outerHTML = visual(kind, name);
      else card.outerHTML = visual('permit', name);
    });
    // 2) hizmet kartları: her başvuru türü farklı görsel
    document.querySelectorAll('.service-card:not([data-v2])').forEach(sc => {
      const h = sc.querySelector('h2')?.textContent || ''; if (!h) return;
      sc.dataset.v2 = '1';
      const holder = document.createElement('div'); holder.className = 'svc-vis'; holder.innerHTML = visual(kindOf(h), '');
      sc.insertBefore(holder, sc.firstChild);
    });
    // 3) genel bakış: son görüşmeler kartı
    const top = $('.dashboard-top');
    if (top && !$('.mt-recent') && HIST?.length) top.insertAdjacentHTML('afterend', recentCard(HIST));
    else if (top && !HIST && !HP) hist().then(l => { if (l.length && $('.dashboard-top') && !$('.mt-recent')) $('.dashboard-top').insertAdjacentHTML('afterend', recentCard(l)); });
  }
  const content = $('#content');
  if (content) new MutationObserver(() => decorate()).observe(content, {childList: true});

  // ---------------- canlı bildirimler ----------------
  const NT = partner
    ? {documents: '#documents', finance: '#finance', applications: '#reports', support: '#extra-livesupport', meet: '/gorusme/', kyc: '#kyc', meetings: '#meetings', team: '#team', customers: '#customers', referrals: '#affiliate', profile: '#extra-liveprofile', audit: '#extra-liveaudit'}
    : {documents: '#documents', finance: '#finance', applications: '#services', support: '#support', meet: '/gorusme/', kyc: '#documents', meetings: '#meetings', profile: '#extra-liveprofile'};
  const HINT = {
    documents: 'Dosyalarım’dan belgeyi önizleyin veya indirin; eksik varsa yükleyin.',
    finance: 'Finans’tan faturayı görüntüleyin; ödeme bekleyen varsa oradan ödenir.',
    applications: 'Başvurular’dan durumu ve aşamaları izleyin.',
    support: 'Destek’ten talebi açın ve yanıtlayın.',
    meet: 'Tıklayın: görüşme odasına gidersiniz.',
    kyc: 'Belge İnceleme’de belgeyi onaylayın veya reddedin.',
    meetings: 'Görüşmeler’de tarih, süre ve özeti görün.',
    team: 'Ekip sayfasında kullanıcıyı ve yetkilerini yönetin.',
    customers: 'Müşteriler’den dosyayı açın.',
    referrals: 'Referanslar’dan bağlantıyı kopyalayıp paylaşın.',
    profile: 'Profil sayfasından bilgilerinizi düzenleyin.'
  };
  let NOTES = [], seen = null;
  function drawNotes() {
    const box = $('#notifications'); if (!box) return;
    const unread = NOTES.filter(n => !n.read).length;
    const bell = $('#notifications-button');
    if (bell) { bell.classList.toggle('has-new', unread > 0); bell.setAttribute('aria-label', `Bildirimler${unread ? ', ' + unread + ' okunmamış' : ''}`); }
    box.innerHTML = `<div class="section-head"><h2>Bildirimler</h2><button class="text-button" id="read-notifications" data-tip="Tüm bildirimleri okundu yapar; kayıtlar silinmez.">Okundu işaretle</button></div>` +
      (NOTES.length ? NOTES.slice(0, 25).map(n => `<article class="${n.read ? 'read' : 'unread'}" data-go="${esc(n.link || '')}" data-tip="${esc(HINT[n.link] || 'Ayrıntı için tıklayın.')}"><span class="notification-dot ${n.read ? '' : 'amber'}"></span><div><strong>${esc(n.title)}</strong><span class="nt-hint">${esc(HINT[n.link] || '')}</span><span class="nt-time">${esc(ago(n.created))}</span></div></article>`).join('') : '<div class="nt-empty">Henüz bildirim yok. Belge, fatura, destek ve görüşme işlemleri burada görünür.</div>');
  }
  async function pollNotes() {
    if (document.hidden) return;
    try {
      const d = await api('notices'); NOTES = d.notices || [];
      const ids = new Set(NOTES.map(n => n.id));
      if (seen) { const fresh = NOTES.filter(n => !n.read && !seen.has(n.id)); if (fresh[0] && typeof toast === 'function') toast('🔔 ' + fresh[0].title + (fresh.length > 1 ? ` (+${fresh.length - 1})` : '')); }
      seen = ids; drawNotes();
    } catch { /* oturum yok / ağ hatası: statik liste kalsın */ }
  }
  document.addEventListener('click', async e => {
    const rd = e.target.closest('#read-notifications');
    if (rd) { e.stopImmediatePropagation(); try { await api('notices', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'}); NOTES.forEach(n => n.read = true); drawNotes(); } catch { /* yoksay */ } return; }
    const a = e.target.closest('#notifications article[data-go]');
    if (a) {
      const t = NT[a.dataset.go]; $('#notifications').hidden = true; $('#notifications-button')?.setAttribute('aria-expanded', 'false');
      if (t) { if (t.startsWith('/')) location.href = t; else location.hash = t; }
    }
  }, true);
  setTimeout(pollNotes, 1500);
  setInterval(pollNotes, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollNotes(); });
  window.addEventListener('bm-live-refresh', pollNotes);

  // ---------------- ipucu balonları ----------------
  const TIPS = [
    // menü
    ['a[href="#overview"]', 'Başvuru durumu, kalan süreler ve son hareketler tek ekranda.'],
    ['a[href="#customers"]', 'Size atanan müşterilerin dosyalarını açın veya görüşmeye çağırın.'],
    ['.nav-sub>a[href="#documents"]', 'Belgeler: Giden = yüklenen belgeler, Gelen = ekipten gelen dosyalar.'],
    ['.sub a[href="#documents"]', 'Başvuru için yüklenen belgeler ve gönderdiğiniz dosyalar.'],
    ['.sub a[href="#documents-in"]', 'Ekibin size / müşteriye gönderdiği sözleşme ve sonuç dosyaları.'],
    ['a[href="#finance"]', partner ? 'Faturalar, ödemeler ve kazançlarınız.' : 'Faturalarınızı görün ve online ödeyin.'],
    ['a[href="#affiliate"]', 'Referans bağlantınızı kopyalayın, banner kodlarını alın; tıklamadan kazanca tüm adımları izleyin.'],
    ['a[href="#kyc"]', 'Müşteri belgelerini ve kimlik doğrulamasını inceleyin; onaylayın veya reddedin.'],
    ['a[href="#reports"]', 'Tüm başvurular ve aşamaları.'],
    ['a[href="#services"]', 'Başvurularınızın aşamasını izleyin, süresi dolanları yenileyin.'],
    ['a[href="#support"]', 'Danışmanınıza talep yazın; yanıt gelince bildirim alırsınız.'],
    ['a[href="#meetings"]', 'Biten görüşmelerin tarihi, süresi ve konuşma özeti.'],
    ['a[href="#team"]', 'Çalışanlarınızı ekleyin; bölüm ve müşteri bazında yetki verin.'],
    ['a[href="/panel/vize/"]', 'Vize başvuru formunu adım adım doldurun; danışmanınız görür.'],
    ['a.bm-meet-link', 'Canlı çevirili görüntülü görüşme: başlatın veya davetle katılın.'],
    ['#notifications-button', 'Yaptığınız ve size gelen işlemler burada listelenir; tıklayınca ilgili sayfaya gidersiniz.'],
    ['#profile-button', 'Profilinizi ve iletişim bilgilerinizi düzenleyin.']
  ];
  const BTN = [
    [/^Yeni Başvuru$/i, 'Yeni bir başvuru açar; ilgili kişilere bildirim gider.'],
    [/Dosyayı aç/i, 'Müşterinin belgelerini, başvurularını ve faturalarını açar.'],
    [/Görüşmeye çağır/i, 'Müşteriye bildirim gider; müşteri “Davete Katıl” ile odaya girer. Davet 2 saat geçerlidir. Görüşmeyi bitirince kayıt ve özet otomatik oluşur.'],
    [/Vize formu/i, 'Müşterinin doldurduğu vize başvuru formunu görüntüler.'],
    [/^(Yükle|Değiştir)$/i, 'PDF, JPG veya PNG seçin (en fazla 10 MB). Yüklenince ilgili kişiye bildirim gider.'],
    [/^Gör$|^Önizle$/i, 'Belgeyi bu sayfadan çıkmadan önizleyin.'],
    [/^İndir$|Döküm dosyasını indir/i, 'Dosyayı cihazınıza indirir.'],
    [/Belge Gönder/i, 'Müşterinin dosyasına belge gönderir; müşteri bildirim alır.'],
    [/Fatura Gönder/i, 'Fatura oluşturur ve ilgili kişiye bildirir.'],
    [/Ödemeyi Teyit Et/i, 'Banka/sağlayıcı kaydını kontrol edip ödemeyi onaylar; kazanç kaydedilir.'],
    [/Destek Talebi|Talep Oluştur/i, 'Konuyu yazın; talep atanmış danışmana, yoksa yönetime gider.'],
    [/Randevu/i, 'Tarih ve saat önerin; danışman onayladığında bildirim gelir.'],
    [/Ekibimi yönet|Kullanıcı Oluştur/i, 'Çalışan ekleyin ve hangi bölümlere erişeceğini seçin.'],
    [/Referans Linki|Yeni Referans/i, 'Kampanya adı verin; size özel bağlantı oluşur.'],
    [/Banner/i, 'Google Ads / site için hazır banner boyutları ve kodları.'],
    [/^Kopyala$/i, 'Bağlantıyı panoya kopyalar.'],
    [/^Detaylar$/i, 'Başvurunun rotası, durumu ve tarihini gösterir.'],
    [/^Yenile$/i, 'Süresi dolan hizmet için yenileme başvurusu açar.'],
    [/^Hizmetlerim$|^Başvurular$/i, 'Başvurularınızın listesine gider.'],
    [/Destek merkezi/i, 'Sorularınız ve talepleriniz için.'],
    [/Profilimi Düzenle/i, 'Ad, telefon ve fatura bilgilerinizi güncelleyin.'],
    [/Kredi iste/i, 'KYC kredisi talebi yöneticiye gider.'],
    [/^Tümü$/i, 'Tüm görüşme kayıtlarını açar.'],
    [/^Çıkış$/i, 'Oturumu güvenle kapatır.']
  ];
  function applyTips(root = document) {
    for (const [sel, tip] of TIPS) root.querySelectorAll(sel).forEach(el => { if (!el.dataset.tip) el.dataset.tip = tip; });
    root.querySelectorAll('button,a.btn,.btn,.text-button').forEach(el => {
      if (el.dataset.tip) return; const t = el.textContent.replace(/\s+/g, ' ').trim(); if (!t || t.length > 40) return;
      const hit = BTN.find(([re]) => re.test(t)); if (hit) el.dataset.tip = hit[1];
    });
  }
  const tip = document.createElement('div'); tip.id = 'bm-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  let cur = null, tt;
  function showTip(el) {
    const text = el.dataset.tip; if (!text) return; cur = el; tip.textContent = text; tip.classList.remove('up'); tip.style.left = '0px'; tip.style.top = '0px';
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight; let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8), top = r.bottom + 10;
    if (top + h > innerHeight - 8) { top = r.top - h - 10; tip.classList.add('up'); }
    tip.style.left = left + 'px'; tip.style.top = top + 'px'; tip.style.setProperty('--ax', Math.max(12, Math.min(w - 22, r.left + r.width / 2 - left - 5)) + 'px'); tip.classList.add('on');
  }
  const hideTip = () => { clearTimeout(tt); cur = null; tip.classList.remove('on'); };
  document.addEventListener('mouseover', e => { const el = e.target.closest?.('[data-tip]'); if (!el) { if (cur) hideTip(); return; } if (el === cur) return; clearTimeout(tt); tt = setTimeout(() => showTip(el), 320); });
  document.addEventListener('mouseout', e => { const el = e.target.closest?.('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tip]'); if (el) showTip(el); });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('click', hideTip, true);
  document.addEventListener('scroll', hideTip, true);
  let tipT; new MutationObserver(() => { clearTimeout(tipT); tipT = setTimeout(() => applyTips(), 120); }).observe(document.body, {childList: true, subtree: true});
  applyTips();

  // ---------------- ekip bağlantısı yetkisi ----------------
  window.addEventListener('bm-live-ready', () => {
    const m = window.BMFeatures?.member?.();
    if (partner && m && !(m.role === 'owner' || (m.permissions?.team || 0) >= 1)) $('#nav-team')?.remove();
  });
  render();
})();
