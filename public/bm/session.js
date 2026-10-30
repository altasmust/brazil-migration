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
  };
  async function onboarding(p, member) {
    document.querySelectorAll('body > *:not(header):not(script):not(style):not(dialog):not(#toast)').forEach(el => el.hidden = true);
    const h = header(); h?.querySelectorAll('nav a').forEach(a => a.style.display = 'none');
    let root = document.getElementById('bm-onb');
    if (!root) { root = document.createElement('main'); root.id = 'bm-onb'; root.className = 'bm-onb'; h ? h.after(root) : document.body.prepend(root); }
    const prof = (await get('/api/workspace/bootstrap').catch(() => ({}))).items?.find(i => i.kind === 'profile')?.data || {};
    const st = STATUS[p.status] || STATUS.docs_required;
    root.innerHTML = `<section class="card"><span class="kicker">Partner hesabı · ${esc(p.company || '')}</span><h1>Hoş geldiniz${member?.name ? ', ' + esc(member.name.split(' ')[0]) : ''}.</h1><p>Hesabınız sınırlı erişim modunda. Belgeleriniz doğrulandığında müşteriler, dosyalar, finans, referanslar, KYC ve raporlar modülleri otomatik açılır.</p>
      <div class="status ${st[0]}"><div><strong>${st[1]}</strong><p>${esc(p.status === 'rejected' ? (p.reason || 'Lütfen belgelerinizi güncelleyip tekrar yükleyin.') : st[2])}</p>${p.check?.summary ? `<p style="margin-top:6px"><small>Son kontrol: ${esc(p.check.summary)}</small></p>` : ''}</div></div></section>
      <section class="card"><h2>Gerekli belgeler</h2><p style="margin-bottom:16px">PDF, JPG veya PNG · en fazla ${p.maxMb} MB. Belgelerin okunaklı ve tam sayfa olmasına dikkat edin.</p><div class="bm-docs">${Object.entries(p.required).map(([k, title]) => { const d = p.docs[k]; const cls = d?.status === 'Uygun' ? 'ok' : d?.status === 'Sorunlu' ? 'bad' : ''; return `<div class="bm-doc ${d ? 'done' : ''}"><strong>${esc(title)}</strong>${d ? `<span class="pill ${cls}">${esc(d.status || 'Yüklendi')}</span><small>${esc(d.name)}</small><a href="/api/platform/partner/file/${k}" target="_blank" rel="noopener" style="font-size:13px;color:#1b5e20">Görüntüle</a>` : '<span class="pill">Bekleniyor</span>'}${['queued', 'checking'].includes(p.status) ? '' : `<label class="up">${d ? 'Değiştir' : 'Yükle'}<input type="file" accept="application/pdf,image/jpeg,image/png" data-doc="${k}"></label>`}</div>`; }).join('')}</div><p class="msg" id="bm-onb-msg"></p></section>
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
    if (['queued', 'checking'].includes(p.status)) setTimeout(() => start(true), 6000);
  }

  // ---------- admin-managed modules ----------
  function navOf() { const h = header(); return h && h.querySelector('nav'); }
  async function modules(panel) {
    let data; try { data = await get('/api/platform/modules?panel=' + panel); } catch { return; }
    const nav = navOf(); if (!nav) return;
    const hidden = new Set((data.hidden || []).map(s => s.toLocaleLowerCase('tr')));
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

  async function start(refresh) {
    let me;
    try { me = await get('/api/auth/me'); } catch { me = {}; }
    if (!me.user) { location.href = '/giris/?next=' + encodeURIComponent(path + location.hash); return; }
    const accounts = me.accounts || [];
    const here = accounts.find(a => area === 'customer' ? a.panel === 'customer' : area === 'partner' ? ['partner', 'staff'].includes(a.panel) : area === 'lawyer' ? a.panel === 'lawyer' : true);
    if (!here && area !== 'kyc') { location.href = accounts[0]?.home || '/giris/'; return; }
    addLogout(me.user.email);
    if (area === 'partner') {
      const p = (await get('/api/platform/partner').catch(() => ({}))).partner;
      if (p && p.status !== 'approved') { const member = (await get('/api/workspace/bootstrap').catch(() => ({}))).member; personalize(member?.name); return onboarding(p, member); }
      if (refresh && document.getElementById('bm-onb')) return location.reload();
    }
    if (area !== 'kyc') modules(area === 'partner' ? (here.panel === 'staff' ? 'staff' : 'partner') : area);
    if (area === 'customer' || area === 'partner') {
      const b = await get('/api/workspace/bootstrap').catch(() => null);
      if (b?.member?.name) personalize(b.member.name);
      if (here?.panel === 'staff') document.querySelectorAll('header small').forEach(x => { if (x.textContent.trim() === 'Partner hesabı') x.textContent = here.label; });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(false)); else start(false);
})();
