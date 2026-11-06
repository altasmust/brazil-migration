'use strict';
// Pazarlama (Yorumlar · Aboneler & Bülten · Paket Fiyatları) ve Ayarlar → Yedekler & Hata Kaydı.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const ic = n => `<bm-i class="ic ic-${n}" aria-hidden="true"></bm-i>`;
  const day = t => t ? new Date(t).toLocaleString('tr-TR', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '—';
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const stars = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  const wrap = (title, sub, body) => `<div class="bmg">${heading(title)}${sub ? `<p class="bmg-sub">${sub}</p>` : ''}<div id="bmg-root">${body || '<div class="loading">Yükleniyor…</div>'}</div></div>`;
  const run = fn => setTimeout(async () => { try { await fn($('#bmg-root')); } catch (e) { const r = $('#bmg-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = `<div class="bmc-err">${esc(e.message)}</div>`; } }, 0);
  const modal = (title, html) => { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; if (!$('#modal').open) $('#modal').showModal(); };
  const close = () => $('#modal').open && $('#modal').close();

  // ---------------- Yorumlar ----------------
  let RV = null, rvF = 'pending';
  const RS = {pending: ['Onay bekliyor', 'wait'], published: ['Yayında', 'on'], hidden: ['Gizli', 'off']};
  function reviewsDraw(root) {
    const list = RV.reviews.filter(r => rvF === 'all' || r.status === rvF), c = s => RV.reviews.filter(r => r.status === s).length;
    root.innerHTML = `<div class="bmg-bar"><div class="bmg-seg">${[['pending', 'Onay bekleyen', c('pending')], ['published', 'Yayında', c('published')], ['hidden', 'Gizli', c('hidden')], ['all', 'Tümü', RV.reviews.length]].map(([k, l, n]) => `<button class="${rvF === k ? 'on' : ''}" data-rvf="${k}">${l} <small>${n}</small></button>`).join('')}</div><button class="btn primary small" data-rv="add">${ic('plus')} İzinli yorum ekle</button></div>
    ${list.length ? `<div class="bmg-list">${list.map(r => `<article class="bmg-rv"><div class="bmg-rvh"><span class="bmg-stars">${stars(r.rating)}</span><span class="bmc-login ${RS[r.status]?.[1] || ''}">${RS[r.status]?.[0] || r.status}</span><small>${esc(r.source === 'panel' ? 'Müşteri panelinden' : 'Kaynak: ' + (r.source || '—'))} · ${day(r.submittedAt || r.created)}</small></div>
      <p class="bmg-rvt">“${esc(r.text)}”</p>${r.reply ? `<p class="bmg-rvr"><b>Yanıtımız:</b> ${esc(r.reply)}</p>` : ''}
      <div class="bmg-rvf"><span><b>${esc(r.name)}</b> · ${esc([RV.services[r.service], r.city].filter(Boolean).join(' · '))}${r.email ? ` · <small>${esc(r.email)}</small>` : ''}</span><span class="bmg-act">${r.status !== 'published' ? `<button class="btn primary small" data-rv="pub" data-id="${esc(r.id)}">${ic('check')} Yayınla</button>` : `<button class="btn small" data-rv="hide" data-id="${esc(r.id)}">Gizle</button>`}<button class="btn small" data-rv="edit" data-id="${esc(r.id)}">${ic('chat')} Yanıtla / düzenle</button><button class="btn small bmg-del" data-rv="del" data-id="${esc(r.id)}">Sil</button></span></div></article>`).join('')}</div>`
      : `<div class="bmc-empty sm">${ic('star')}<b>${rvF === 'pending' ? 'Onay bekleyen yorum yok.' : 'Bu filtrede yorum yok.'}</b><span>Müşteriler panelin Genel Bakış sayfasındaki “Deneyiminizi paylaşın” kartından yorum yazar. Yorum yalnız siz onayladıktan sonra sitede görünür.</span></div>`}
    <div class="bmg-note">${ic('info')} <span>Yorumlar sitede yalnız <b>yayında</b> olanlar ve en az 1 tane varsa görünür (ana sayfa, hizmet sayfaları, fiyatlar). Uydurma veya izinsiz yorum eklemeyin; Brezilya’da OAB reklam kuralları ve Türkiye’de reklam/tüketici mevzuatı gerçek dışı tavsiyeleri yasaklar.</span></div>`;
  }
  function reviewForm(r) {
    const sv = RV.services, add = !r;
    modal(add ? 'İzinli yorum ekle' : 'Yorumu düzenle', `<form class="bmg-form" id="bmg-rvform">
      ${add ? '<div class="info warning">Yalnızca gerçek bir müşterinin size ilettiği ve yayınlanmasına izin verdiği yorumu ekleyin.</div>' : ''}
      <label>Puan<select name="rating">${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${(r?.rating || 5) === n ? 'selected' : ''}>${stars(n)} (${n})</option>`).join('')}</select></label>
      <label>Yorum<textarea name="text" rows="5" required minlength="20" maxlength="900">${esc(r?.text || '')}</textarea></label>
      <div class="bmg-row"><label>Görünecek ad<input name="name" value="${esc(r?.name || '')}" maxlength="40" placeholder="Ayşe K."></label><label>Şehir<input name="city" value="${esc(r?.city || '')}" maxlength="40"></label><label>Hizmet<select name="service">${Object.entries(sv).map(([k, v]) => `<option value="${k}" ${r?.service === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label></div>
      ${add ? `<label>Kaynak<input name="source" required maxlength="60" placeholder="Ör. Google yorumu, e-posta, WhatsApp mesajı"></label><label class="bmg-cb"><input type="checkbox" name="consent" required> Yorum sahibinin bu yorumun sitede yayınlanmasına izin verdiğini onaylıyorum.</label><label class="bmg-cb"><input type="checkbox" name="publish" checked> Hemen yayınla</label>` : `<label>Yanıtımız (isteğe bağlı, sitede yorumun altında görünür)<textarea name="reply" rows="3" maxlength="500">${esc(r.reply || '')}</textarea></label>`}
      <div class="form-actions"><button type="button" class="btn" data-action="close">Vazgeç</button><button class="btn primary" type="submit">${ic('check')} Kaydet</button></div></form>`);
    $('#bmg-rvform').onsubmit = async e => {
      e.preventDefault(); const f = e.target, b = {rating: +f.rating.value, text: f.text.value, name: f.name.value, city: f.city.value, service: f.service.value};
      if (add) Object.assign(b, {source: f.source.value, consent: f.consent.checked, publish: f.publish.checked}); else Object.assign(b, {id: r.id, reply: f.reply.value});
      try { await A('reviews/save', 'POST', b); close(); say('Yorum kaydedildi.'); RV = await A('reviews'); reviewsDraw($('#bmg-root')); } catch (err) { say(err.message); }
    };
  }
  const reviewsPage = () => { run(async root => { RV = await A('reviews'); reviewsDraw(root); }); return wrap('Müşteri Yorumları', 'Müşterilerin panelden yazdığı yorumları onaylayın, yanıtlayın ve sitede yayınlayın.'); };

  // ---------------- Aboneler & Bülten ----------------
  let SB = null;
  const SS = {active: ['Onaylı', 'on'], pending: ['Onay bekliyor', 'wait'], unsub: ['Ayrıldı', 'off']};
  function subsDraw(root) {
    const c = SB.counts;
    root.innerHTML = `<div class="bmg-kpis">${[['Onaylı abone', c.active], ['Onay bekleyen', c.pending], ['Ayrılan', c.unsub], ['Gönderilen bülten', SB.sent.length]].map(([l, v]) => `<div><small>${l}</small><b>${v}</b></div>`).join('')}</div>
    <div class="bmg-2"><section class="panel bmg-p"><header class="panel-head"><h2>Bülten gönder</h2></header><form class="bmg-form" id="bmg-nl">
      <label>Konu<input name="subject" required maxlength="140" placeholder="Ör. 2026 Brezilya oturum kurallarında yenilikler"></label>
      <label>Metin<textarea name="text" rows="8" required minlength="20" maxlength="8000" placeholder="Merhaba,&#10;&#10;…"></textarea></label>
      <div class="bmg-row"><label>Bağlantı (isteğe bağlı)<input name="link" placeholder="/blog/... veya https://…"></label><label>Buton yazısı<input name="button" maxlength="40" placeholder="Devamını oku"></label></div>
      <label>Test adresi<input name="test" type="email" placeholder="Önce kendinize gönderin"></label>
      <div class="form-actions"><button type="button" class="btn" data-nl="test">${ic('mail')} Test gönder</button><button class="btn primary" type="submit">${ic('mail')} ${c.active} aboneye gönder</button></div>
      <p class="bmg-hint">Her e-postanın altına otomatik “abonelikten ayrıl” bağlantısı eklenir. Gönderim SMTP ayarlarınızla yapılır (Genel Ayarlar → E-posta).</p></form>
      ${SB.sent.length ? `<h3 class="bmg-h3">Geçmiş gönderimler</h3><ul class="bmg-ul">${SB.sent.map(s => `<li><b>${esc(s.subject)}</b><small>${day(s.at || s.created)} · ${s.sent} gönderildi${s.failed ? ' · ' + s.failed + ' hata' : ''}</small></li>`).join('')}</ul>` : ''}</section>
    <section class="panel bmg-p"><header class="panel-head"><h2>Aboneler</h2><a class="btn small" href="/api/platform/admin/subscribers/export">${ic('doc')} CSV indir</a></header>
      ${SB.subscribers.length ? `<div class="bmc-table"><table><thead><tr><th>E-posta</th><th>Durum</th><th>Kaynak</th><th>Tarih</th><th></th></tr></thead><tbody>${SB.subscribers.slice(0, 300).map(s => `<tr><td>${esc(s.email)}</td><td><span class="bmc-login ${SS[s.status]?.[1] || ''}">${SS[s.status]?.[0] || esc(s.status)}</span></td><td><small>${esc(s.source || '—')}</small></td><td><small>${day(s.confirmedAt || s.created)}</small></td><td><button class="btn small bmg-del" data-sub="${esc(s.id)}" aria-label="Sil">×</button></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="bmc-empty sm">${ic('mail')}<b>Henüz abone yok.</b><span>Sitedeki “Ücretsiz rehber” formları (her sayfanın altı ve /rehber/) abone toplar. Ziyaretçi e-postasındaki bağlantıya tıklayınca onaylı aboneye dönüşür (çift onay).</span></div>`}</section></div>`;
  }
  const subsPage = () => { run(async root => { SB = await A('subscribers'); subsDraw(root); }); return wrap('Aboneler & Bülten', 'Ücretsiz rehber karşılığı toplanan e-posta aboneleri ve bülten gönderimi.'); };

  // ---------------- Paket Fiyatları ----------------
  const pricesPage = () => { run(async root => {
    const d = await A('settings/prices'), p = d.prices || {};
    root.innerHTML = `<section class="panel bmg-p" style="max-width:820px"><header class="panel-head"><h2>Fiyatlar sayfası (/fiyatlar/)</h2><a class="btn small" href="/fiyatlar/" target="_blank" rel="noopener">${ic('eye')} Sayfayı aç</a></header><form class="bmg-form" id="bmg-pr">
      <p class="bmg-hint">Boş bırakılan paketlerde sitede <b>“Kişiye özel teklif”</b> yazar. Fiyatı istediğiniz biçimde yazın: <code>1.500 USD</code>, <code>“2.900 USD’den başlayan”</code>, <code>R$ 8.000</code> gibi.</p>
      <div class="bmg-prs">${d.keys.map(([k, l]) => `<label>${esc(l)}<input name="${k}" value="${esc(p[k] || '')}" maxlength="40" placeholder="Kişiye özel teklif"></label>`).join('')}</div>
      <label>Fiyat altı notu<input name="note" value="${esc(p.note || '')}" maxlength="200" placeholder="Dosya kapsamına göre ücretsiz ön görüşmede netleşir"></label>
      <div class="form-actions"><button class="btn primary" type="submit">${ic('check')} Kaydet ve yayınla</button></div></form></section>`;
    $('#bmg-pr').onsubmit = async e => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); try { await A('settings/prices', 'POST', b); say('Fiyatlar kaydedildi; site güncellendi.'); } catch (err) { say(err.message); } };
  }); return wrap('Paket Fiyatları', 'Paketler ve fiyatlar sayfasında görünen hizmet bedelleri.'); };

  // ---------------- Yedekler & Hata kaydı ----------------
  const backupsPage = () => { run(async root => {
    const [b, er] = await Promise.all([A('backups'), A('errlog')]);
    root.innerHTML = `<div class="bmg-2"><section class="panel bmg-p"><header class="panel-head"><h2>Veritabanı yedekleri</h2><button class="btn primary small" id="bmg-bk">${ic('refresh')} Şimdi yedekle</button></header>
      <p class="bmg-hint">Tüm veriler (hesaplar, müşteri dosyaları, faturalar, site ayarları) her gün otomatik olarak sıkıştırılmış JSON olarak dosya deposuna yedeklenir; son <b>${b.keep}</b> yedek saklanır. Ek güvence için haftada bir yedeği indirip bilgisayarınızda saklayın.</p>
      ${b.error ? `<div class="bmc-err">Son otomatik yedek başarısız (${day(b.errorAt)}): ${esc(b.error)}</div>` : ''}
      ${b.backups.length ? `<ul class="bmg-ul">${b.backups.map(x => `<li><span><b>${day(x.at)}</b><small>${kb(x.size)} · ${x.rows} kayıt · ${x.tables} tablo · ${esc(x.by)}</small></span><a class="btn small" href="/api/platform/admin/backups/download?key=${encodeURIComponent(x.key)}">${ic('doc')} İndir</a></li>`).join('')}</ul>` : `<div class="bmc-empty sm">${ic('shield')}<b>Henüz yedek yok.</b><span>İlk otomatik yedek sunucu açıldıktan kısa süre sonra alınır; şimdi almak için “Şimdi yedekle”ye basın.</span></div>`}
      <h3 class="bmg-h3">Çalışma süresi izleme</h3><p class="bmg-hint">Sitenin kapandığını anında öğrenmek için ücretsiz <a href="https://uptimerobot.com" target="_blank" rel="noopener">UptimeRobot</a> (kart gerekmez) hesabında “HTTP(s)” monitör ekleyin ve adres olarak <code>${esc(location.origin)}/api/health</code> yazın. Site veya veritabanı yanıt vermezse e-posta alırsınız.</p></section>
    <section class="panel bmg-p"><header class="panel-head"><h2>Ziyaretçi hata kaydı</h2>${er.errors.length ? '<button class="btn small" id="bmg-erc">Temizle</button>' : ''}</header>
      <p class="bmg-hint">Ziyaretçilerin tarayıcısında oluşan JavaScript hataları (kişisel veri içermez). Aynı hata tekrarlandıkça sayacı artar.</p>
      ${er.errors.length ? `<ul class="bmg-ul bmg-err">${er.errors.map(x => `<li><span><b>${esc(x.msg)}</b><small>${esc(x.page || '')}${x.src ? ' · ' + esc(x.src.split('/').pop()) + ':' + x.line : ''} · ${x.count}× · son ${day(x.at)}</small></span></li>`).join('')}</ul>` : `<div class="bmc-empty sm">${ic('check')}<b>Kayıtlı hata yok.</b><span>Sitede ziyaretçi tarafında hata oluşursa burada listelenir.</span></div>`}</section></div>`;
    $('#bmg-bk').onclick = async e => { e.target.disabled = true; try { await A('backups/run', 'POST', {}); say('Yedek alındı.'); render(); } catch (err) { say(err.message); e.target.disabled = false; } };
    const c = $('#bmg-erc'); if (c) c.onclick = async () => { try { await A('errlog/clear', 'POST', {}); render(); } catch (err) { say(err.message); } };
  }); return wrap('Yedekler & Hata Kaydı', 'Otomatik veritabanı yedekleri, sağlık kontrolü ve ziyaretçi tarafı hata kaydı.'); };

  // ---------------- olaylar ----------------
  document.addEventListener('click', async e => {
    const f = e.target.closest('[data-rvf]'); if (f) { rvF = f.dataset.rvf; reviewsDraw($('#bmg-root')); return; }
    const b = e.target.closest('[data-rv]');
    if (b) {
      const id = b.dataset.id, r = RV?.reviews.find(x => x.id === id), act = b.dataset.rv;
      if (act === 'add') return reviewForm(null);
      if (act === 'edit') return reviewForm(r);
      try {
        if (act === 'del') { if (!confirm('Bu yorum kalıcı olarak silinsin mi?')) return; await A('reviews/delete', 'POST', {id}); }
        else await A('reviews/save', 'POST', {id, status: act === 'pub' ? 'published' : 'hidden'});
        say(act === 'pub' ? 'Yorum yayında.' : act === 'hide' ? 'Yorum gizlendi.' : 'Yorum silindi.'); RV = await A('reviews'); reviewsDraw($('#bmg-root'));
      } catch (err) { say(err.message); }
      return;
    }
    const s = e.target.closest('[data-sub]');
    if (s) { if (!confirm('Abone silinsin mi?')) return; try { await A('subscribers/delete', 'POST', {id: s.dataset.sub}); SB = await A('subscribers'); subsDraw($('#bmg-root')); } catch (err) { say(err.message); } return; }
    const t = e.target.closest('[data-nl=test]');
    if (t) { const f2 = $('#bmg-nl'); if (!f2.test.value) { say('Test adresi yazın.'); f2.test.focus(); return; } try { const d = await A('newsletter/send', 'POST', {...Object.fromEntries(new FormData(f2)), test: f2.test.value}); say(d.sent ? 'Test e-postası gönderildi.' : 'Gönderilemedi; SMTP ayarlarını kontrol edin.'); } catch (err) { say(err.message); } }
  });
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'bmg-nl') return; e.preventDefault();
    const f = e.target; if (!confirm(`Bülten ${SB.counts.active} onaylı aboneye gönderilsin mi?`)) return;
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try { const b = Object.fromEntries(new FormData(f)); delete b.test; const d = await A('newsletter/send', 'POST', b); say(`${d.sent} aboneye gönderildi${d.failed ? ', ' + d.failed + ' hata' : ''}.`); SB = await A('subscribers'); subsDraw($('#bmg-root')); }
    catch (err) { say(err.message); btn.disabled = false; }
  });

  // ---------------- rotalar + menü ----------------
  const routes = {yorumlar: reviewsPage, aboneler: subsPage, fiyatlar: pricesPage, yedekler: backupsPage};
  Object.assign(names, {yorumlar: 'Müşteri Yorumları', aboneler: 'Aboneler & Bülten', fiyatlar: 'Paket Fiyatları', yedekler: 'Yedekler & Hata Kaydı'});
  const _overview = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _overview(); };
  const nav = $('#navigation');
  if (nav && !nav.querySelector('a[href="#yorumlar"]')) {
    const site = [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === 'Site Yönetimi');
    const el = document.createElement('details');
    el.innerHTML = '<summary>Pazarlama</summary><div class="dropdown"><a href="#yorumlar">Müşteri Yorumları</a><a href="#aboneler">Aboneler &amp; Bülten</a><a href="#fiyatlar">Paket Fiyatları</a></div>';
    if (site) site.after(el); else nav.appendChild(el);
    const ay = [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === 'Ayarlar');
    ay?.querySelector('a[href="#durum"]')?.insertAdjacentHTML('afterend', '<a href="#yedekler">Yedekler &amp; Hata Kaydı</a>');
  }
  // bekleyen yorum rozeti
  setTimeout(() => A('reviews').then(d => { const n = d.reviews.filter(r => r.status === 'pending').length; const a = $('#navigation a[href="#yorumlar"]'); if (n && a) a.insertAdjacentHTML('beforeend', ` <span class="bmc-count">${n}</span>`); }).catch(() => {}), 1100);
  if (routes[route()]) setTimeout(() => { if (!$('#bmg-root')) render(); }, 300);

  const css = document.createElement('style');
  css.textContent = `.bmg-sub{margin:-6px 0 18px;color:#68776b}.bmg-bar{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}.bmg-seg{display:flex;gap:6px;flex-wrap:wrap}.bmg-seg button{border:1px solid #dfe5d8;background:#fff;border-radius:999px;padding:7px 14px;font:inherit;font-size:13px;cursor:pointer}.bmg-seg button.on{background:#1b5e20;color:#fff;border-color:#1b5e20}.bmg-seg small{opacity:.75}
  .bmg-list{display:grid;gap:12px}.bmg-rv{background:#fff;border:1px solid #e3e8de;border-radius:14px;padding:16px 18px}.bmg-rvh{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.bmg-rvh small{color:#7b887e}.bmg-stars{color:#d4a017;letter-spacing:1px}.bmg-rvt{margin:10px 0;line-height:1.6}.bmg-rvr{background:#f3f8ef;border-left:3px solid #1b5e20;border-radius:6px;padding:8px 12px;font-size:13.5px;margin:0 0 10px}.bmg-rvf{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:13.5px}.bmg-act{display:flex;gap:6px;flex-wrap:wrap}.bmg-del{color:#b3261e}
  .bmg-note{display:flex;gap:10px;margin-top:18px;font-size:12.5px;color:#68776b;background:#fbf8ef;border:1px solid #efe4c4;border-radius:12px;padding:12px 14px}
  .bmg-form{display:grid;gap:12px}.bmg-form label{display:grid;gap:5px;font-size:13px;font-weight:600}.bmg-form input:not([type=checkbox]),.bmg-form textarea,.bmg-form select{font:inherit;font-weight:400;border:1px solid #d7dfd2;border-radius:10px;padding:9px 11px;background:#fff}.bmg-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.bmg-cb{display:flex!important;gap:8px;align-items:flex-start;font-weight:400!important}
  .bmg-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}.bmg-kpis div{background:#fff;border:1px solid #e3e8de;border-radius:14px;padding:14px 16px}.bmg-kpis small{display:block;color:#7b887e;font-size:12px}.bmg-kpis b{font-size:24px}
  .bmg-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}.bmg-p{padding:0 18px 18px}.bmg-p .panel-head{margin:0 -18px 14px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px}.bmg-hint{font-size:12.5px;color:#68776b;margin:0 0 12px;line-height:1.6}.bmg-h3{font-size:14px;margin:20px 0 8px}
  .bmg-ul{list-style:none;padding:0;margin:0;display:grid;gap:8px}.bmg-ul li{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid #eef1eb;border-radius:10px;padding:9px 12px}.bmg-ul small{display:block;color:#7b887e;font-size:12px}.bmg-err b{font-family:ui-monospace,monospace;font-size:12.5px;font-weight:600;word-break:break-word}
  .bmg-prs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
  @media(max-width:900px){.bmg-2{grid-template-columns:1fr}.bmg-kpis{grid-template-columns:1fr 1fr}}`;
  document.head.appendChild(css);
})();
