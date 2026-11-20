'use strict';
// Firma dizini (Faz 5): herkese açık vitrin. Arka uç: /api/platform/admin/directory/* (doğrulama uçları yalnız ana firmada).
// Firma vitrinini kendisi yazar; yayına çıkmak için platform ekibinin doğrulaması gerekir. Adı değişirse yeniden onaya düşer.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const dt = ms => (ms ? new Date(ms).toLocaleString('tr-TR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}) : '—');
  const chip = (t, c) => '<span class="bcs-chip ' + (c || '') + '">' + esc(t) + '</span>';
  const SC = {draft: '', pending: 'warn', verified: 'ok', rejected: 'bad', suspended: 'bad'};
  const LANGS = {tr: 'Türkçe', pt: 'Português', en: 'English', fa: 'فارسی', th: 'ไทย'};
  const modal = (title, html) => { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; if (!$('#modal').open) $('#modal').showModal(); };
  const closeModal = () => $('#modal').open && $('#modal').close();
  const csv = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  let ME = null, ADM = null;

  const page = () => {
    setTimeout(async () => { try { await load(); } catch (e) { const r = $('#bdr-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
    return '<div class="bcs">' + heading('Firma dizini') + '<p class="bcs-sub">Doğrulanmış firmaların ülke, hizmet ve dile göre aranabildiği herkese açık sayfada (/firmalar/) vitrininizi yayınlayın. Katılım isteğe bağlıdır; e-posta ve telefon bilgileriniz herkese açık sayfada görünmez.</p><div id="bdr-root"><div class="loading">Yükleniyor…</div></div></div>';
  };
  async function load() { ME = await A('directory/me'); ADM = ME.isMain ? await A('directory/admin/list') : null; draw(); }

  const explain = l => !l ? 'Henüz vitrin oluşturmadınız. Formu doldurup “Yayına başvur” deyin; platform ekibi bilgilerinizi doğruladıktan sonra yayına alınır.'
    : {draft: 'Vitrininiz yayında değil. Yayına başvurunca doğrulama sürecine girer.', pending: 'Başvurunuz platform ekibinin doğrulamasını bekliyor. Onaylanınca e-posta ile haber verilir.', verified: 'Vitrininiz herkese açık dizinde yayında.', rejected: 'Başvurunuz onaylanmadı. Aşağıdaki nedeni düzeltip yeniden başvurabilirsiniz.', suspended: 'Vitrininiz platform ekibi tarafından askıya alındı.'}[l.status];
  const checks = (name, map, sel) => Object.entries(map).map(([k, v]) => '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="' + name + '" value="' + esc(k) + '"' + (sel && sel.includes(k) ? ' checked' : '') + '> ' + esc(v) + '</label>').join('');

  function draw() {
    const root = $('#bdr-root'); if (!root) return; const l = ME.listing || {}, svc = Object.fromEntries(ME.services.map(s => [s, s]));
    const url = location.origin + '/firmalar/?firma=' + encodeURIComponent(ME.slug);
    let h = '<section class="panel bcs-p"><header class="panel-head"><h2>Durum</h2></header><p>' + chip(ME.statusText, SC[l.status || 'draft']) + '</p><p class="bcs-hint">' + esc(explain(ME.listing)) + '</p>' +
      (l.note && ['rejected', 'suspended'].includes(l.status) ? '<div class="bmc-note"><b>Platform notu:</b> ' + esc(l.note) + '</div>' : '') +
      (l.status === 'verified' ? '<p><a class="btn small ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Vitrinimi aç ↗</a></p>' : '') + (l.contacts ? '<p class="bcs-hint">Dizinden gelen talep sayısı: <b>' + l.contacts + '</b> (Adaylar bölümünde “Firma dizini” kaynağıyla görünür).</p>' : '') + '</section>';
    h += '<section class="panel bcs-p"><header class="panel-head"><h2>Vitrin bilgileri</h2></header><form id="bdr-f" class="bcs-form">' +
      '<label>Firma adı<input name="name" maxlength="100" required value="' + esc(l.name || ME.defaultName) + '"></label><p class="bcs-hint" style="margin-top:-6px">Doğrulandıktan sonra adı değiştirirseniz vitrin yeniden onaya düşer.</p>' +
      '<label>Kısa tanıtım (en az 40, en çok 600 karakter)<textarea name="about" rows="4" maxlength="600" placeholder="Hangi konularda, kimlere ve kaç yıldır hizmet veriyorsunuz?">' + esc(l.about || '') + '</textarea></label>' +
      '<div class="bsl-two"><label>Şehir<input name="city" maxlength="60" value="' + esc(l.city || '') + '"></label><label>Web sitesi (https://…)<input name="website" maxlength="300" value="' + esc(l.website || '') + '" placeholder="https://"></label></div>' +
      '<label>Hizmet verdiğiniz ülkeler (virgülle)<input name="countries" maxlength="300" value="' + esc((l.countries || []).join(', ')) + '" placeholder="Brezilya, Türkiye"></label>' +
      '<fieldset style="border:0;padding:0;display:grid;gap:6px"><legend style="font-size:13px;font-weight:600">Hizmetler</legend>' + checks('services', svc, l.services) + '</fieldset>' +
      '<fieldset style="border:0;padding:0;display:grid;gap:6px"><legend style="font-size:13px;font-weight:600">Konuştuğunuz diller</legend>' + checks('languages', LANGS, l.languages) + '</fieldset>' +
      '<label>Meslek / ruhsat kaydı (isteğe bağlı; doğrulamada kullanılır, doğrulanınca vitrinde görünür)<input name="registry" maxlength="80" value="' + esc(l.registry || '') + '" placeholder="Örn. OAB/SP 123456"></label>' +
      '<label>Talepler hangi e-postaya gitsin? (herkese açık değil)<input name="leadEmail" type="email" maxlength="254" value="' + esc(l.leadEmail || '') + '"></label>' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="accepting"' + (l.accepting === false ? '' : ' checked') + '> Vitrinden yeni iletişim talebi kabul ediyorum</label>' +
      '<p class="bcs-hint">Ziyaretçi talep gönderirken bilgilerinin firmanıza iletilmesini açıkça onaylar; talep Adaylar bölümüne “Firma dizini” kaynağıyla düşer ve rıza kaydı tutulur. Bu kişilerin veri sorumlusu siz olursunuz.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit" data-pub="1">' + (l.status === 'verified' ? 'Güncelle' : l.status === 'pending' ? 'Güncelle (başvuru sürer)' : 'Yayına başvur') + '</button><button class="btn ghost" type="submit" data-pub="0">' + (['verified', 'pending'].includes(l.status) ? 'Yayından çek (taslak)' : 'Taslak olarak kaydet') + '</button></div></form></section>';
    if (ADM) h += admin();
    root.innerHTML = h; bind(root);
  }

  function admin() {
    const rows = ADM.listings, pend = rows.filter(r => r.status === 'pending').length;
    return '<section class="panel bcs-p"><header class="panel-head"><h2>Doğrulama başvuruları ' + (pend ? chip(pend + ' bekliyor', 'warn') : '') + '</h2></header><p class="bcs-hint">Onaylamadan önce firma adını, meslek/ruhsat kaydını ve web sitesini kontrol edin. Onaylanan vitrin herkese açık dizinde görünür; sorun çıkarsa askıya alabilirsiniz.</p>' +
      (rows.length ? rows.map(r => '<div style="border-top:1px solid #eef1eb;padding:12px 0"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><span><b>' + esc(r.name) + '</b> ' + chip(r.statusText, SC[r.status]) + (r.tenantStatus !== 'active' ? ' ' + chip('Firma ' + r.tenantStatus, 'bad') : '') + '<small style="display:block;color:#68776b">' + esc(r.slug) + ' · ' + esc(r.ownerEmail || 'ana firma') + ' · güncelleme ' + dt(r.updated) + (r.contacts ? ' · ' + r.contacts + ' talep' : '') + '</small></span>' +
        '<span style="display:flex;gap:6px;flex-wrap:wrap">' + (r.status === 'pending' || r.status === 'rejected' ? '<button class="btn small" data-bdr-d="verify" data-t="' + esc(r.tenant) + '">Onayla</button>' : '') + (r.status === 'pending' ? '<button class="btn small ghost" data-bdr-d="reject" data-t="' + esc(r.tenant) + '">Reddet</button>' : '') + (['verified', 'pending'].includes(r.status) ? '<button class="btn small ghost" data-bdr-d="suspend" data-t="' + esc(r.tenant) + '">Askıya al</button>' : '') + (r.status === 'suspended' ? '<button class="btn small" data-bdr-d="restore" data-t="' + esc(r.tenant) + '">Geri al</button>' : '') + '</span></div>' +
        '<p style="margin:6px 0 0;font-size:13px">' + esc(r.about) + '</p><small style="color:#68776b">' + esc([r.city, r.countries.join(', '), r.services.join(', '), r.languages.join(', ').toUpperCase()].filter(Boolean).join(' · ')) + '</small>' +
        '<small style="display:block;color:#68776b">Kayıt: ' + esc(r.registry || '—') + ' · Web: ' + (r.website ? '<a href="' + esc(r.website) + '" target="_blank" rel="noopener nofollow">' + esc(r.website) + '</a>' : '—') + ' · Talep e-postası: ' + esc(r.leadEmail || '—') + '</small>' + (r.note ? '<small style="display:block;color:#68776b">Not: ' + esc(r.note) + '</small>' : '') + '</div>').join('') : '<p class="bcs-hint">Henüz başvuru yok.</p>') + '</section>';
  }

  const DEC = {verify: ['Vitrini onayla', 'Onayla ve yayınla', false, 'Yayınlandığında firmaya e-posta gider. İsterseniz doğrulama notu ekleyin (yalnız sizde görünür).'], reject: ['Başvuruyu reddet', 'Reddet', true, 'Ret nedeni firmaya e-postayla iletilir; düzeltip yeniden başvurabilir.'], suspend: ['Vitrini askıya al', 'Askıya al', true, 'Vitrin dizinden hemen kalkar; neden firmaya iletilir.'], restore: ['Askıyı kaldır', 'Geri al', false, 'Daha önce doğrulanmışsa yeniden yayına girer; değilse doğrulamaya düşer.']};
  function bind(root) {
    const go = async fn => { try { await fn(); } catch (e) { say(e.message); } };
    const f = root.querySelector('#bdr-f');
    if (f) f.addEventListener('submit', e => {
      e.preventDefault(); const x = new FormData(f), pub = e.submitter?.dataset.pub === '1';
      go(async () => { const d = await A('directory/profile', 'POST', {name: x.get('name'), about: x.get('about'), city: x.get('city'), website: x.get('website'), countries: csv(x.get('countries')), services: x.getAll('services'), languages: x.getAll('languages'), registry: x.get('registry'), leadEmail: x.get('leadEmail'), accepting: x.get('accepting') === 'on', publish: pub}); say(pub ? (d.status === 'verified' ? 'Vitrin güncellendi.' : 'Başvuru gönderildi; doğrulama bekleniyor.') : 'Taslak kaydedildi.'); await load(); });
    });
    root.querySelectorAll('[data-bdr-d]').forEach(b => b.onclick = () => {
      const a = b.dataset.bdrD, t = b.dataset.t, c = DEC[a];
      modal(c[0], '<form id="bdr-m" class="bcs-form"><p class="bcs-hint">' + esc(c[3]) + '</p><label>' + (c[2] ? 'Neden (zorunlu)' : 'Not (isteğe bağlı)') + '<textarea name="note" rows="3" maxlength="400"' + (c[2] ? ' required minlength="5"' : '') + '></textarea></label><button class="btn" type="submit">' + esc(c[1]) + '</button></form>');
      $('#bdr-m').onsubmit = e => { e.preventDefault(); go(async () => { await A('directory/admin/decide', 'POST', {tenant: t, action: a, note: new FormData(e.target).get('note')}); closeModal(); say('Kaydedildi.'); await load(); }); };
    });
  }

  const routes = {'firma-dizini': page};
  Object.assign(names, {'firma-dizini': 'Firma dizini'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav) {
    const sum = n => [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === n);
    const g = sum('Partner Ağı');
    if (g) { const dd = g.querySelector('.dropdown'); if (dd && !dd.querySelector('a[href="#firma-dizini"]')) dd.insertAdjacentHTML('beforeend', '<a href="#firma-dizini">Firma dizini</a>'); }
    else if (!nav.querySelector('a[href="#firma-dizini"]')) { const el = document.createElement('details'); el.innerHTML = '<summary>Firma dizini</summary><div class="dropdown"><a href="#firma-dizini">Vitrinim</a></div>'; nav.appendChild(el); }
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bdr-root')) render(); }, 350);
})();
