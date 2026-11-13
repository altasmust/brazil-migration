'use strict';
// Loaded by every member panel (customer, partner/staff, lawyer, KYC).
// - redirects to the unified login when there is no session
// - adds a logout button
// - partners with unapproved documents get a limited "onboarding" view (profile + documents only)
// - renders panel modules managed from the admin panel and hides built-in items the admin turned off
(() => {
  const path = location.pathname;
  const area = path.startsWith('/partner') ? 'partner' : path.startsWith('/avukat') ? 'lawyer' : path.startsWith('/kyc') ? 'kyc' : 'customer';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const get = async u => { const r = await fetch(u, {cache: 'no-store'}); const d = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(d.error || 'Hata'), {status: r.status}); return d; };
  const css = `.bm-logout{border:1px solid var(--line,#dfe5d8);background:transparent;border-radius:999px;padding:8px 14px;font:inherit;font-size:12.5px;font-weight:600;color:inherit;cursor:pointer;margin-left:8px;white-space:nowrap}
.bm-logout:hover{border-color:#1b5e20;color:#1b5e20}
#bm-module-view{max-width:1240px;margin:0 auto;padding:36px 24px 80px}
#bm-module-view .bm-mod-card{background:#fff;border:1px solid #dfe5d8;border-radius:18px;padding:30px}
#bm-module-view h1{margin:0 0 6px;font-size:30px;color:#183b2c}#bm-module-view .crumb{font-size:11px;letter-spacing:.14em;font-weight:700;color:#68776b;text-transform:uppercase}
#bm-module-view .content{line-height:1.8;color:#2b3f33;white-space:pre-wrap;margin-top:18px}
#bm-module-view iframe{width:100%;min-height:70vh;border:1px solid #dfe5d8;border-radius:12px;margin-top:18px;background:#fff}
.bm-onb{max-width:1100px;margin:0 auto;padding:34px 22px 90px;display:grid;gap:22px}
.bm-onb .card{background:#fff;border:1px solid #dfe5d8;border-radius:18px;padding:26px}
.bm-onb h1{margin:4px 0 8px;font-size:30px;color:#183b2c}.bm-onb h2{margin:0 0 14px;font-size:19px;color:#183b2c}
.bm-onb .kicker{font-size:11px;letter-spacing:.16em;font-weight:700;color:#1b5e20;text-transform:uppercase}
.bm-onb p{color:#58685d;line-height:1.7;margin:0}
.bm-onb .status{display:flex;gap:14px;align-items:flex-start;border-radius:14px;padding:16px 18px;margin-top:14px}
.bm-onb .status.wait{background:#fff8e6;border:1px solid #f0dfaf}.bm-onb .status.bad{background:#fdecea;border:1px solid #f3c4bd}.bm-onb .status.run{background:#eef5e9;border:1px solid #cfe3c3}
.bm-docs{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.bm-doc{border:1px dashed #c9d4c1;border-radius:14px;padding:18px;display:grid;gap:10px;align-content:start}
.bm-doc.done{border-style:solid;border-color:#cfe3c3;background:#f6faf3}
.bm-doc strong{color:#183b2c}.bm-doc small{color:#68776b}
.bm-doc .pill{justify-self:start;font-size:11px;font-weight:700;border-radius:999px;padding:4px 10px;background:#eef1ea;color:#58685d}
.bm-doc .pill.ok{background:#e3f1db;color:#1b5e20}.bm-doc .pill.bad{background:#fbe1dd;color:#8a1c12}
.bm-doc label.up{display:inline-flex;justify-content:center;border-radius:10px;padding:10px 12px;background:#1b5e20;color:#fff;font-weight:700;font-size:13px;cursor:pointer}
.bm-doc input[type=file]{display:none}
.bm-onb form{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bm-onb form label{display:grid;gap:6px;font-size:12.5px;font-weight:600;color:#183b2c}
.bm-onb form input{padding:11px 12px;border:1px solid #dfe5d8;border-radius:9px;font:inherit;font-size:14px}
.bm-onb form .full{grid-column:1/-1}
.bm-onb .btn{border:0;background:#1b5e20;color:#fff;border-radius:10px;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer;justify-self:start}
.bm-onb .hist{list-style:none;padding:0;margin:0;display:grid;gap:8px;font-size:13px;color:#58685d}
.bm-onb .msg{font-size:13px;margin-top:10px}.bm-onb .msg.err{color:#8a1c12}.bm-onb .msg.ok{color:#1b5e20}
@media(max-width:720px){.bm-onb form{grid-template-columns:1fr}}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const header = () => document.querySelector('header');
  function addLogout(email) {
    const h = header(); if (!h || h.querySelector('.bm-logout')) return;
    const b = document.createElement('button'); b.className = 'bm-logout'; b.type = 'button'; b.textContent = 'Çıkış'; b.title = email ? 'Çıkış yap (' + email + ')' : 'Çıkış yap';
    b.onclick = async () => { await fetch('/api/auth/logout', {method: 'POST'}); location.href = '/giris/'; };
    (h.querySelector('.account') || h).appendChild(b);
  }

  // ---------- partner onboarding (limited access) ----------
  const STATUS = {
    docs_required: ['wait', 'Belgeleriniz bekleniyor', 'Hesabınızın açılması için aşağıdaki dört belgeyi yükleyin. Onaya kadar yalnızca profilinizi düzenleyebilirsiniz.'],
    queued: ['run', 'Belgeleriniz kontrol sırasında', 'Tüm belgeler alındı; otomatik doğrulama birazdan başlayacak.'],
    checking: ['run', 'Belgeleriniz otomatik kontrol ediliyor', 'Bu işlem genellikle bir dakikadan kısa sürer. Sayfa kendini güncelleyecek.'],
    review: ['wait', 'Belgeleriniz incelemede', 'Otomatik kontrol kesin bir sonuç veremedi; ekibimiz belgelerinizi inceliyor. Sonuç bildirim olarak gelecek.'],
    rejected: ['bad', 'Belgelerinizde düzeltme gerekiyor', ''],
    kyc_pending: ['run', 'Belgeleriniz uygun — kimlik doğrulaması bekleniyor', 'Son adım: aşağıdan kimliğinizi Didit ile doğrulayın. Onaylandığında hesabınız otomatik açılır.'],
  };
  const KYC_TR = {'Not Started': 'Başlatıldı, tamamlanmadı', 'In Progress': 'Devam ediyor', 'Awaiting User': 'Sizi bekliyor', 'In Review': 'İnceleniyor', Approved: 'Onaylandı', Declined: 'Reddedildi', Resubmitted: 'Yeniden gönderildi', Abandoned: 'Yarım bırakıldı', Expired: 'Süresi doldu', 'Kyc Expired': 'Süresi doldu', Initializing: 'Hazırlanıyor'};
  async function onboarding(p, member) {
    document.querySelectorAll('body > *:not(header):not(script):not(style):not(dialog):not(#toast)').forEach(el => el.hidden = true);
    const h = header(); h?.querySelectorAll('nav a').forEach(a => a.style.display = 'none');
    let root = document.getElementById('bm-onb');
    if (!root) { root = document.createElement('main'); root.id = 'bm-onb'; root.className = 'bm-onb'; h ? h.after(root) : document.body.prepend(root); }
    const prof = (await get('/api/workspace/bootstrap').catch(() => ({}))).items?.find(i => i.kind === 'profile')?.data || {};
    const st = STATUS[p.status] || STATUS.docs_required;
    root.innerHTML = `<section class="card"><span class="kicker">Partner hesabı · ${esc(p.company || '')}</span><h1>Hoş geldiniz${member?.name ? ', ' + esc(member.name.split(' ')[0]) : ''}.</h1><p>Hesabınız sınırlı erişim modunda. ${p.didit ? 'Vergi levhası ve imza sirkülerinizi yükleyip kimliğinizi Didit ile doğruladığınızda' : 'Belgeleriniz doğrulandığında'} müşteriler, dosyalar, finans, referanslar, KYC ve raporlar modülleri otomatik açılır.</p>
      <div class="status ${st[0]}"><div><strong>${st[1]}</strong><p>${esc(p.status === 'rejected' ? (p.reason || 'Lütfen belgelerinizi güncelleyip tekrar yükleyin.') : st[2])}</p>${p.check?.summary ? `<p style="margin-top:6px"><small>Son kontrol: ${esc(p.check.summary)}</small></p>` : ''}</div></div></section>
      <section class="card"><h2>Gerekli belgeler</h2><p style="margin-bottom:16px">PDF, JPG veya PNG · en fazla ${p.maxMb} MB. Belgelerin okunaklı ve tam sayfa olmasına dikkat edin.</p><div class="bm-docs">${Object.entries(p.required).map(([k, title]) => { const d = p.docs[k]; const cls = d?.status === 'Uygun' ? 'ok' : d?.status === 'Sorunlu' ? 'bad' : ''; return `<div class="bm-doc ${d ? 'done' : ''}"><strong>${esc(title)}</strong>${d ? `<span class="pill ${cls}">${esc(d.status || 'Yüklendi')}</span><small>${esc(d.name)}</small><a href="/api/platform/partner/file/${k}" target="_blank" rel="noopener" style="font-size:13px;color:#1b5e20">Görüntüle</a>` : '<span class="pill">Bekleniyor</span>'}${['queued', 'checking'].includes(p.status) ? '' : `<label class="up">${d ? 'Değiştir' : 'Yükle'}<input type="file" accept="application/pdf,image/jpeg,image/png" data-doc="${k}"></label>`}</div>`; }).join('')}</div><p class="msg" id="bm-onb-msg"></p></section>
      ${p.didit ? `<section class="card"><h2>Kimlik doğrulama</h2><p style="margin-bottom:14px">Kimliğiniz <b>Didit</b> üzerinden doğrulanır: kimlik kartınızı veya pasaportunuzu telefon kameranızla okutur, kısa bir selfie çekersiniz. İşlem 2–3 dakika sürer; görüntüler bizim sistemimizde saklanmaz.</p><div class="bm-doc ${p.kyc?.status === 'Approved' ? 'done' : ''}" style="max-width:520px"><strong>Kimlik + canlılık + yüz eşleştirme</strong><span class="pill ${p.kyc?.status === 'Approved' ? 'ok' : p.kyc?.status === 'Declined' ? 'bad' : ''}">${esc(KYC_TR[p.kyc?.status] || 'Başlatılmadı')}</span>${p.kyc?.status === 'Approved' ? '' : `<label class="up" id="bm-kyc-start" role="button" tabindex="0">${p.kyc?.url ? 'Doğrulamaya devam et' : 'Kimliğimi doğrula'}</label>${p.kyc ? '<button class="btn" type="button" id="bm-kyc-refresh" style="background:#fff;color:#1b5e20;border:1px solid #cfe3c3">Sonucu kontrol et</button>' : ''}`}</div><p class="msg" id="bm-kyc-msg"></p></section>` : ''}
      <section class="card"><h2>Profil bilgileri</h2><form id="bm-onb-profile"><label>Yetkili ad soyad<input name="name" value="${esc(prof.name || member?.name || '')}" required></label><label>Firma unvanı<input name="company" value="${esc(prof.company || p.company || '')}"></label><label>Telefon<input name="phone" value="${esc(prof.phone || '')}"></label><label>Vergi dairesi<input name="taxOffice" value="${esc(prof.taxOffice || '')}"></label><label>Vergi no<input name="taxNumber" value="${esc(prof.taxNumber || '')}"></label><label>Banka<input name="bank" value="${esc(prof.bank || '')}"></label><label class="full">IBAN<input name="iban" value="${esc(prof.iban || '')}"></label><label class="full">Adres<input name="address" value="${esc(prof.address || '')}"></label><button class="btn">Profili kaydet</button><p class="msg full" id="bm-prof-msg"></p></form></section>`;
    root.querySelectorAll('input[type=file][data-doc]').forEach(inp => inp.addEventListener('change', async () => {
      const f = inp.files[0]; if (!f) return; const m = document.getElementById('bm-onb-msg');
      if (f.size > p.maxMb * 1048576) { m.className = 'msg err'; m.textContent = `Dosya en fazla ${p.maxMb} MB olabilir.`; return; }
      const fd = new FormData(); fd.append('doc', inp.dataset.doc); fd.append('file', f);
      m.className = 'msg'; m.textContent = 'Yükleniyor…';
      const r = await fetch('/api/platform/partner/upload', {method: 'POST', body: fd}); const d = await r.json().catch(() => ({}));
      if (!r.ok) { m.className = 'msg err'; m.textContent = d.error || 'Yükleme başarısız.'; return; }
      start(true);
    }));
    root.querySelector('#bm-onb-profile').addEventListener('submit', async e => {
      e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target)); const m = document.getElementById('bm-prof-msg');
      const r = await fetch('/api/workspace/profile', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(fd)}); const d = await r.json().catch(() => ({}));
      m.className = 'msg full ' + (r.ok ? 'ok' : 'err'); m.textContent = r.ok ? 'Profil kaydedildi.' : (d.error || 'Kaydedilemedi.');
    });
    const kmsg = document.getElementById('bm-kyc-msg');
    const kpost = async path => { const r = await fetch('/api/platform/partner/kyc/' + path, {method: 'POST'}); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.'); return d; };
    document.getElementById('bm-kyc-start')?.addEventListener('click', async () => { kmsg.className = 'msg'; kmsg.textContent = 'Didit doğrulama sayfası hazırlanıyor…'; try { const d = await kpost('start'); if (d.url) location.href = d.url; else start(true); } catch (e) { kmsg.className = 'msg err'; kmsg.textContent = e.message; } });
    document.getElementById('bm-kyc-refresh')?.addEventListener('click', async () => { kmsg.className = 'msg'; kmsg.textContent = 'Kontrol ediliyor…'; try { await kpost('refresh'); start(true); } catch (e) { kmsg.className = 'msg err'; kmsg.textContent = e.message; } });
    if (p.didit && p.kyc && !['Approved', 'Declined', 'Abandoned', 'Expired'].includes(p.kyc.status) && new URLSearchParams(location.search).has('kyc') && !onboarding.checked) { onboarding.checked = true; kpost('refresh').then(() => start(true)).catch(() => {}); }
    if (['queued', 'checking'].includes(p.status)) setTimeout(() => start(true), 6000);
  }

  // ---------- admin-managed modules ----------
  function navOf() { const h = header(); return h && h.querySelector('nav'); }
  async function modules(panel) {
    let data; try { data = await get('/api/platform/modules?panel=' + panel); } catch { return; }
    const nav = navOf(); if (!nav) return;
    const hidden = new Set((data.hidden || []).map(s => s.toLocaleLowerCase('tr')));
    if (hidden.has('servisler')) hidden.add('hizmetlerim');
    nav.querySelectorAll('a').forEach(a => { if (hidden.has(a.textContent.trim().toLocaleLowerCase('tr'))) a.style.display = 'none'; });
    if (!data.modules?.length) return;
    const main = document.querySelector('main');
    let view = document.getElementById('bm-module-view');
    if (!view) { view = document.createElement('section'); view.id = 'bm-module-view'; view.hidden = true; main?.before(view); }
    const close = () => { view.hidden = true; if (main) main.hidden = false; nav.querySelectorAll('a[data-bm-module]').forEach(a => a.classList.remove('active')); };
    nav.addEventListener('click', e => { const a = e.target.closest('a'); if (a && !a.dataset.bmModule) close(); }, true);
    for (const m of data.modules) {
      if (m.type === 'link') { const a = document.createElement('a'); a.href = m.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = m.title + ' ↗'; a.dataset.bmModule = m.id; nav.appendChild(a); continue; }
      const a = document.createElement('a'); a.href = '#mod-' + m.id; a.textContent = m.title; a.dataset.bmModule = m.id;
      a.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        nav.querySelectorAll('a').forEach(x => { x.classList.remove('active'); x.removeAttribute('aria-current'); }); a.classList.add('active');
        if (main) main.hidden = true; view.hidden = false;
        view.innerHTML = `<div class="bm-mod-card"><span class="crumb">${esc(m.title)}</span><h1>${esc(m.title)}</h1>${m.type === 'embed' ? `<iframe src="${esc(m.url)}" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>` : `<div class="content">${esc(m.content).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(https:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')}</div>`}</div>`;
        window.scrollTo({top: 0});
      });
      nav.appendChild(a);
    }
  }

  // ---------- customer overview: show the signed-in member instead of the demo name ----------
  const DEMO = area === 'partner' ? ['Fatih'] : ['Mustafa'];
  function personalize(name) {
    if (!name) return;
    const first = name.split(' ')[0], initials = name.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toLocaleUpperCase('tr');
    const fix = () => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        for (const demo of DEMO) {
          if (n.nodeValue.includes(demo + ' ALTAŞ')) n.nodeValue = n.nodeValue.replaceAll(demo + ' ALTAŞ', name);
          else if (n.nodeValue.includes(demo)) n.nodeValue = n.nodeValue.replaceAll(demo, first);
        }
      }
      document.querySelectorAll('.avatar').forEach(a => { if (a.textContent.trim() === 'MA' || a.textContent.trim() === 'FA') a.textContent = initials; });
    };
    fix(); new MutationObserver(fix).observe(document.body, {childList: true, subtree: true, characterData: false});
  }

  // ---------- para birimi: müşterinin ülkesine göre (örnek tutarlardaki MKD yerine) ----------
  const CUR = {'Brezilya': 'BRL', 'Türkiye': 'TRY', 'Azerbaycan': 'AZN', 'Kuzey Makedonya': 'MKD', 'Rusya': 'RUB', 'İspanya': 'EUR', 'İran': 'IRR', 'Suudi Arabistan': 'SAR', 'Türkmenistan': 'TMT', 'Özbekistan': 'UZS', 'Kırgızistan': 'KGS', 'Endonezya': 'IDR'};
  function currency(country) {
    const code = CUR[country] || 'TRY'; if (code === 'MKD') return;
    const fix = () => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n; (n = w.nextNode());) if (/\bMKD\b/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/\bMKD\b/g, code); };
    fix(); new MutationObserver(fix).observe(document.body, {childList: true, subtree: true});
  }

  // ---------- müşteri paneli: gerçek Didit kimlik doğrulama durumu ----------
  const KYC_LABEL = {'Not Started': ['amber', 'Başlamadı'], 'In Progress': ['amber', 'Devam ediyor'], 'Awaiting User': ['amber', 'Sizi bekliyor'], 'In Review': ['amber', 'İncelemede'], 'Approved': ['', 'Doğrulandı'], 'Declined': ['red', 'Reddedildi'], 'Resubmitted': ['amber', 'Yeniden gönderildi'], 'Abandoned': ['red', 'Yarım kaldı'], 'Expired': ['red', 'Süresi doldu'], 'Kyc Expired': ['red', 'Süresi doldu']};
  function kycCard() {
    let model = null;
    const paint = () => {
      const el = document.getElementById('bm-kyc'); if (!el || !model || el.dataset.done) return;
      const s = (model.sessions || [])[0], st = el.querySelector('[data-kyc-status]'), acts = el.querySelector('[data-kyc-actions]');
      const [cls, label] = s ? KYC_LABEL[s.status] || ['amber', s.status] : model.ready ? ['amber', 'Henüz yapılmadı'] : ['amber', 'Yakında'];
      if (st) st.innerHTML = `<span class="badge ${cls}">${label}</span>`;
      if (acts && s?.status === 'Approved') acts.innerHTML = '<span class="badge">✓ Kimliğiniz doğrulandı</span>';
      else if (acts && !model.ready) acts.innerHTML = '<small style="color:var(--muted,#7b897f)">Kimlik doğrulama kısa süre içinde açılacak.</small>';
      el.dataset.done = '1';
    };
    fetch('/api/kyc', {cache: 'no-store'}).then(r => r.ok ? r.json() : null).then(d => { model = d; paint(); }).catch(() => {});
    new MutationObserver(paint).observe(document.body, {childList: true, subtree: true});
  }

  // ---------- partner: aylık KYC kredisi + kredi talebi ----------
  async function creditBar() {
    let d; try { d = await get('/api/platform/partner/kyc-credit'); } catch { return; }
    const c = d.credit, pend = (d.requests || []).find(r => r.status === 'pending');
    const reset = new Date(c.resetAt).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long'});
    let bar = document.getElementById('bm-credit');
    if (!bar) { bar = document.createElement('div'); bar.id = 'bm-credit'; const h = document.querySelector('header'); (h && h.parentNode ? h : document.body.firstChild).insertAdjacentElement(h ? 'afterend' : 'beforebegin', bar); }
    const empty = c.remaining <= 0;
    bar.style.cssText = `display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:9px 16px;font:500 13px/1.4 Poppins,system-ui,sans-serif;border-bottom:1px solid ${empty ? '#f3c9c4' : '#dfe9dd'};background:${empty ? '#fdeeec' : '#f2f7ef'};color:${empty ? '#8a1c12' : '#1d4a2f'}`;
    const btn = (t, primary) => `<button type="button" data-credit-ask style="border:1px solid ${primary ? '#1b5e20' : '#c9d8c4'};background:${primary ? '#1b5e20' : '#fff'};color:${primary ? '#fff' : '#1b5e20'};border-radius:999px;padding:5px 14px;font:600 12.5px Poppins,system-ui,sans-serif;cursor:pointer">${t}</button>`;
    bar.innerHTML = `<span>🛡️ KYC kredisi: <b>${c.remaining}</b> / ${c.allowance} kaldı · yenilenme: ${reset}</span>` +
      (pend ? `<span style="opacity:.85">⏳ ${pend.amount} kredilik talebiniz yönetici onayı bekliyor</span>` : empty ? `<span>Krediniz bitti; yeni kimlik doğrulaması başlatılamaz. Ek kredi almak ister misiniz?</span>${btn('Kredi iste', true)}` : btn('Kredi iste'));
    const ask = bar.querySelector('[data-credit-ask]'); if (ask) ask.onclick = () => creditModal();
  }
  function creditModal() {
    document.getElementById('bm-credit-modal')?.remove();
    const m = document.createElement('div'); m.id = 'bm-credit-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#0b1f1566;display:grid;place-items:center;padding:16px;font-family:Poppins,system-ui,sans-serif';
    m.innerHTML = `<form style="background:#fff;border-radius:16px;padding:24px;width:min(420px,100%);box-shadow:0 30px 80px #0003;display:grid;gap:14px;color:#1d3a2c">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:17px">Ek KYC kredisi iste</b><button type="button" data-x style="border:0;background:none;font-size:22px;cursor:pointer">×</button></div>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#5b6b60">Kaç kimlik doğrulaması daha yapmanız gerekiyor? Talebiniz yöneticiye iletilir; onaylandığında kredi bu ay için hesabınıza tanımlanır.</p>
      <label style="display:grid;gap:6px;font-size:12.5px;font-weight:600">Kredi miktarı<input name="amount" type="number" min="1" max="500" value="10" required style="height:44px;border:1px solid #dfe6df;border-radius:10px;padding:0 12px;font:inherit;font-size:15px"></label>
      <label style="display:grid;gap:6px;font-size:12.5px;font-weight:600">Not (isteğe bağlı)<textarea name="note" rows="3" maxlength="500" placeholder="ör. Bu ay 8 yeni müşteri başvurusu bekliyoruz" style="border:1px solid #dfe6df;border-radius:10px;padding:10px 12px;font:inherit;font-size:13.5px;resize:vertical"></textarea></label>
      <div data-msg style="font-size:13px;color:#8a1c12"></div>
      <button data-submit style="height:46px;border:0;border-radius:12px;background:#1b5e20;color:#fff;font:600 14px Poppins,system-ui,sans-serif;cursor:pointer">Talep gönder</button></form>`;
    document.body.appendChild(m);
    m.querySelector('[data-x]').onclick = () => m.remove(); m.onclick = e => { if (e.target === m) m.remove(); };
    const f = m.querySelector('form');
    f.onsubmit = async e => { e.preventDefault(); const b = f.querySelector('[data-submit]'); b.disabled = true;
      try { const r = await fetch('/api/platform/partner/kyc-credit/request', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({amount: f.amount.value, note: f.note.value})}); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Talep gönderilemedi.');
        f.innerHTML = '<b style="font-size:17px">Talebiniz iletildi ✓</b><p style="margin:0;font-size:13.5px;line-height:1.6;color:#5b6b60">Yönetici onayladığında kredi hesabınıza tanımlanacak ve size bildirim gelecek.</p><button type="button" style="height:44px;border:0;border-radius:12px;background:#1b5e20;color:#fff;font:600 14px Poppins,system-ui,sans-serif;cursor:pointer">Tamam</button>';
        f.querySelector('button').onclick = () => m.remove(); creditBar();
      } catch (err) { f.querySelector('[data-msg]').textContent = err.message; b.disabled = false; } };
  }

  async function start(refresh) {
    let me;
    try { me = await get('/api/auth/me'); } catch { me = {}; }
    if (!me.user) { location.href = '/giris/?next=' + encodeURIComponent(path + location.hash); return; }
    const accounts = me.accounts || [];
    const here = accounts.find(a => area === 'customer' ? a.panel === 'customer' : area === 'partner' ? ['partner', 'staff'].includes(a.panel) : area === 'lawyer' ? a.panel === 'lawyer' : true);
    if (!here && area !== 'kyc') { location.href = accounts[0]?.home || '/giris/'; return; }
    addLogout(me.user.email);
    { const br = document.querySelector('header a.brand'); if (br && area !== 'kyc') br.href = area === 'customer' ? '/panel/#overview' : area === 'partner' ? '/partner/' : '/avukat/'; }
    if (area === 'customer' || area === 'partner') currency(me.user.country);
    if (area === 'customer') kycCard();
    if (me.user.impersonated && !document.getElementById('bm-imp')) {
      const bar = document.createElement('div'); bar.id = 'bm-imp';
      bar.style.cssText = 'position:sticky;top:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;padding:9px 16px;background:#7a5410;color:#fff;font:600 13px/1.4 Poppins,system-ui,sans-serif';
      bar.innerHTML = '<span>🔑 Yönetici olarak <b></b> hesabını yönetiyorsunuz.</span><button type="button" style="border:1px solid #fff8;background:#fff2;color:#fff;border-radius:999px;padding:5px 14px;font:inherit;cursor:pointer">Oturumu kapat</button>';
      bar.querySelector('b').textContent = me.user.email;
      bar.querySelector('button').onclick = async () => { await fetch('/api/auth/logout', {method: 'POST'}).catch(() => {}); window.close(); location.href = '/admin/'; };
      document.body.prepend(bar);
    }
    if (area === 'partner') {
      const p = (await get('/api/platform/partner').catch(() => ({}))).partner;
      if (p && p.status !== 'approved') { const member = (await get('/api/workspace/bootstrap').catch(() => ({}))).member; personalize(member?.name); return onboarding(p, member); }
      if (refresh && document.getElementById('bm-onb')) return location.reload();
    }
    if (area !== 'kyc') modules(area === 'partner' ? (here.panel === 'staff' ? 'staff' : 'partner') : area);
    if (area === 'partner' || (area === 'kyc' && accounts.some(a => ['partner', 'staff'].includes(a.panel)))) creditBar();
    if (area === 'customer' || area === 'partner') {
      const b = await get('/api/workspace/bootstrap').catch(() => null);
      if (b?.member?.name) personalize(b.member.name);
      if (here?.panel === 'staff') document.querySelectorAll('header small').forEach(x => { if (x.textContent.trim() === 'Partner hesabı') x.textContent = here.label; });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(false)); else start(false);
})();
