'use strict';
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const date = t => t ? new Date(t).toLocaleString('tr-TR', {dateStyle: 'short', timeStyle: 'short'}) : '';
  async function api(path, method = 'GET', body) {
    const opts = {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined};
    let r; try { r = await fetch('/api/platform/admin/' + path, opts); } catch (e) { if (method !== 'GET') throw new Error('Sunucuya ulaşılamadı, tekrar deneyin.'); await new Promise(x => setTimeout(x, 900)); r = await fetch('/api/platform/admin/' + path, opts).catch(() => { throw new Error('Sunucu şu an yanıt vermiyor. Birkaç saniye sonra sayfayı yenileyin.'); }); }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent(location.pathname + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  }
  const note = (type, html) => { const n = $('#note'); if (!n) return; n.className = 'bm-note ' + type; n.innerHTML = html; if (html) n.scrollIntoView({block: 'nearest', behavior: 'smooth'}); };
  const devLink = d => d.devLink ? `<br><b>Test modu (e-posta servisi bağlı değil):</b> bu bağlantıyı kişiye iletin → <a href="${esc(d.devLink)}" target="_blank">${esc(d.devLink)}</a>` : (d.mailSent ? '<br>Giriş bağlantısı e-postayla gönderildi.' : '');
  const dlg = (title, html) => { $('#dlg-t').textContent = title; $('#dlg-b').innerHTML = html; $('#dlg').showModal(); };
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) $('#dlg').close(); });

  let META, ACCOUNTS = [], tab = 'hesaplar', newType = 'customer', filter = 'all';
  const TYPE_DESC = {customer: 'Brezilya başvurusu yapacak kişi. Müşteri paneline girer.', advisor: 'Danışman / partner. Müşterilerini, belgeleri, finansı ve referansları yönetir.', lawyer: 'Avukat paneli: gelen/giden evrak ve finans.', accountant: 'Muhasebe personeli. Faturalar, ödemeler ve komisyonlar.', other: 'Diğer personel; yetkilerini siz belirlersiniz.'};
  const STATUS = {docs_required: ['a', 'Belge bekleniyor'], queued: ['b', 'Kontrol sırasında'], checking: ['b', 'Kontrol ediliyor'], review: ['a', 'İnceleme bekliyor'], approved: ['g', 'Onaylı'], rejected: ['r', 'Düzeltme istendi'], kyc_pending: ['b', 'Kimlik doğrulaması bekleniyor']};
  const PERM_LEVEL = ['Yok', 'Görüntüle', 'Düzenle'];

  function permEditor(perms, prefix = 'perm') {
    return `<div class="bm-perm">${META.perms.map(p => `<div><span>${esc(META.permLabels[p])}</span><select name="${prefix}-${p}">${PERM_LEVEL.map((l, i) => `<option value="${i}" ${Number(perms?.[p] || 0) === i ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}</div>`;
  }
  const readPerms = (form, prefix = 'perm') => Object.fromEntries(META.perms.map(p => [p, Number(form.elements[prefix + '-' + p]?.value || 0)]));
  const countryOptions = sel => '<option value="">—</option>' + Object.keys(META.countries).map(c => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  function bindCity(form) {
    const c = form.elements.country, t = form.elements.city; if (!c) return;
    const fill = () => { t.innerHTML = '<option value="">—</option>' + (META.countries[c.value] || []).map(x => `<option>${esc(x)}</option>`).join(''); };
    c.addEventListener('change', fill); fill();
  }

  // ---------- Accounts ----------
  async function accounts() {
    ACCOUNTS = (await api('accounts')).accounts;
    const shown = ACCOUNTS.filter(a => filter === 'all' || a.type === filter);
    $('#view').innerHTML = `<div class="bm-box"><div class="bm-flex"><select class="bm-in" id="flt" style="width:auto"><option value="all">Tüm hesaplar (${ACCOUNTS.length})</option>${Object.entries(META.types).map(([k, v]) => `<option value="${k}" ${filter === k ? 'selected' : ''}>${v} (${ACCOUNTS.filter(a => a.type === k).length})</option>`).join('')}</select><input class="bm-in" id="q" placeholder="Ad, e-posta veya şehir ara" style="max-width:320px"><span class="sp"></span><a class="b p" href="#yeni">+ Yeni oluştur</a></div></div>
    <div class="bm-box" style="padding:8px 8px 4px"><table class="bm-t"><thead><tr><th>Ad / e-posta</th><th>Tür</th><th>Bölge</th><th>Danışman / Durum</th><th>Giriş</th><th></th></tr></thead><tbody>${shown.map(a => `<tr data-row="${esc((a.name + ' ' + a.email + ' ' + (a.city || '')).toLocaleLowerCase('tr'))}"><td><b>${esc(a.name)}</b><br><small class="muted">${esc(a.email)}</small>${a.company ? `<br><small class="muted">${esc(a.company)}</small>` : ''}</td><td><span class="tag">${esc(META.types[a.type] || a.type)}</span>${a.partner ? ` <span class="tag ${STATUS[a.partner.status]?.[0] || ''}">Partner: ${esc(STATUS[a.partner.status]?.[1] || a.partner.status)}</span>` : ''}</td><td>${esc([a.city, a.country].filter(Boolean).join(', '))}</td><td>${a.type === 'customer' ? esc(a.advisorName || '—') + (a.assignedBy ? `<br><small class="muted">${esc(a.assignedBy)}</small>` : '') : `<span class="tag ${a.status === 'active' ? 'g' : 'r'}">${a.status === 'active' ? 'Aktif' : 'Pasif'}</span>`}</td><td><small>${esc(a.login)}</small></td><td style="text-align:right;white-space:nowrap"><button class="b s" data-edit="${esc(a.id)}">Düzenle</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Henüz hesap yok.</td></tr>'}</tbody></table></div>`;
    $('#flt').onchange = e => { filter = e.target.value; accounts(); };
    $('#q').oninput = e => { const v = e.target.value.toLocaleLowerCase('tr'); $$('tr[data-row]').forEach(r => r.hidden = !r.dataset.row.includes(v)); };
  }
  function editAccount(id) {
    const a = ACCOUNTS.find(x => x.id === id); if (!a) return;
    const advisors = ACCOUNTS.filter(x => x.type === 'advisor' && x.status === 'active');
    const staff = !['customer', 'lawyer'].includes(a.type);
    dlg(a.name, `<form class="bm-f" id="ed"><label>Ad soyad<input name="name" value="${esc(a.name)}"></label><label>Durum<select name="status"><option value="active" ${a.status === 'active' ? 'selected' : ''}>Aktif</option><option value="disabled" ${a.status !== 'active' ? 'selected' : ''}>Pasif (giriş kapalı)</option></select></label>
      ${a.type === 'customer' ? `<label class="full">Atanan danışman<select name="advisor"><option value="owner">Merkez ofis</option>${advisors.map(x => `<option value="${esc(x.id)}" ${a.advisor === x.id ? 'selected' : ''}>${esc(x.name)}${x.city ? ' — ' + esc(x.city) : ''}</option>`).join('')}</select></label>` : ''}
      ${staff ? `<div class="full"><b style="font-size:13px">Modül izinleri</b><p class="muted" style="margin:4px 0 10px;font-size:12px">Bu kişinin panelinde hangi modülleri görüp düzenleyebileceğini belirler.</p>${permEditor(a.permissions)}</div>` : ''}
      <div class="full bm-flex"><button class="b p">Kaydet</button><button class="b" type="button" id="inv">Giriş / şifre bağlantısı gönder</button><span class="sp"></span><small class="muted">${esc(a.email)} · ${esc(a.login)}</small></div><div class="full bm-note" id="ednote"></div></form>`);
    const f = $('#ed');
    f.onsubmit = async e => {
      e.preventDefault();
      const b = {id: a.id, status: f.status.value};
      if (!a.id.startsWith('law:')) b.name = f.name.value;
      if (f.elements.advisor) b.advisor = f.advisor.value;
      if (staff) b.permissions = readPerms(f);
      try { await api('accounts', 'PATCH', b); $('#dlg').close(); document.dispatchEvent(new CustomEvent('bm-acc-saved', {detail: a.id})); } catch (err) { $('#ednote').className = 'full bm-note err'; $('#ednote').textContent = err.message; }
    };
    $('#inv').onclick = async () => { try { const d = await api('accounts/invite', 'POST', {id: a.id}); $('#ednote').className = 'full bm-note ok'; $('#ednote').innerHTML = 'Bağlantı hazırlandı.' + devLink(d); } catch (err) { $('#ednote').className = 'full bm-note err'; $('#ednote').textContent = err.message; } };
  }

  // ---------- New account ----------
  function newForm() {
    const advisors = ACCOUNTS.filter(x => x.type === 'advisor' && x.status === 'active');
    const staff = ['advisor', 'accountant', 'other'].includes(newType);
    $('#view').innerHTML = `<div class="bm-box"><h2>1. Hesap türü</h2><div class="bm-grid">${Object.entries(META.types).map(([k, v]) => `<button type="button" class="bm-type ${k === newType ? 'on' : ''}" data-type="${k}"><b>${v} ekle</b><span>${TYPE_DESC[k]}</span></button>`).join('')}</div></div>
    <div class="bm-box"><h2>2. ${esc(META.types[newType])} bilgileri</h2><form class="bm-f" id="nf">
      <label>Ad soyad<input name="name" required minlength="2"></label><label>E-posta<input name="email" type="email" required></label>
      <label>Telefon<input name="phone" type="tel"></label>
      ${newType === 'advisor' ? '<label>Firma unvanı<input name="company"></label>' : newType === 'other' || newType === 'accountant' ? '<label>Görev / unvan<input name="title"></label>' : '<span></span>'}
      ${newType !== 'lawyer' ? `<label>Ülke<select name="country">${countryOptions('')}</select></label><label>Şehir<select name="city"></select></label>` : ''}
      ${newType === 'customer' ? `<label class="full">Danışman<select name="advisor"><option value="">Otomatik — en yakın danışman</option><option value="owner">Merkez ofis</option>${advisors.map(x => `<option value="${esc(x.id)}">${esc(x.name)}${x.city ? ' — ' + esc(x.city) : ''}</option>`).join('')}</select></label>` : ''}
      ${newType === 'advisor' ? '<p class="full muted" style="margin:0;font-size:12px">Danışmanın ülke/şehir bilgisi, yeni müşterilerin en yakın danışmana atanmasında kullanılır. Admin tarafından açılan danışmanlar belge onayı beklemeden tam erişimle başlar.</p>' : ''}
      ${staff ? `<div class="full"><b style="font-size:13px">3. Modül izinleri</b><p class="muted" style="margin:4px 0 10px;font-size:12px">Varsayılan değerler hesap türüne göre dolduruldu; dilediğiniz gibi değiştirin.</p>${permEditor(META.defaults[newType])}</div>` : ''}
      <div class="full bm-flex"><button class="b p">Hesabı oluştur</button><span class="muted" style="font-size:12px">Kişiye şifre belirleme bağlantısı ${META.mail ? 'e-postayla gönderilir' : 'oluşturulur (e-posta servisi bağlanana kadar bağlantı burada gösterilir)'}.</span></div>
    </form></div>`;
    $$('[data-type]').forEach(b => b.onclick = () => { newType = b.dataset.type; newForm(); });
    const f = $('#nf'); bindCity(f);
    f.onsubmit = async e => {
      e.preventDefault(); const btn = f.querySelector('button.p'); btn.disabled = true;
      const b = {type: newType, name: f.name.value, email: f.email.value, phone: f.phone.value, company: f.elements.company?.value, title: f.elements.title?.value, country: f.elements.country?.value, city: f.elements.city?.value, advisor: f.elements.advisor?.value};
      if (staff) b.permissions = readPerms(f);
      try { const d = await api('accounts', 'POST', b); note('ok', `<b>${esc(META.types[newType])}</b> hesabı oluşturuldu: ${esc(b.email)}.` + (d.existingLogin ? ' Bu kişinin zaten bir giriş şifresi var; mevcut şifresiyle girebilir.' : devLink(d))); f.reset(); await api('accounts').then(x => ACCOUNTS = x.accounts); }
      catch (err) { note('err', esc(err.message)); } finally { btn.disabled = false; }
    };
  }

  // ---------- Partner applications ----------
  let D_PARTNERS = {};
  async function partners() {
    const d = await api('partners'); D_PARTNERS = d;
    const pending = d.partners.filter(p => p.status === 'review').length;
    const pc = $('#pcount'); if (pc) { pc.hidden = !pending; pc.textContent = pending; }
    $('#view').innerHTML = `${!META.verifier ? '<div class="bm-note info">Otomatik belge doğrulama henüz yapılandırılmadı (ANTHROPIC_API_KEY). Tüm belgeler yüklendiğinde başvurular “İnceleme bekliyor” durumuna düşer; buradan onaylayabilirsiniz.</div>' : ''}
    <div class="bm-box" style="padding:8px"><table class="bm-t"><thead><tr><th>Firma</th><th>Yetkili</th><th>Vergi</th><th>Belgeler</th><th>Durum</th><th></th></tr></thead><tbody>${d.partners.map(p => `<tr><td><b>${esc(p.company)}</b><br><small class="muted">${esc((p.services || []).join(', '))}</small></td><td>${esc(p.name)}<br><small class="muted">${esc(p.email)}</small></td><td><small>${esc(p.taxOffice)}<br>${esc(p.taxNumber)}</small></td><td>${Object.keys(d.labels).map(k => `<span class="tag ${p.docs[k] ? (p.docs[k].status === 'Uygun' ? 'g' : p.docs[k].status === 'Sorunlu' ? 'r' : 'b') : ''}" title="${esc(d.labels[k])}">${esc(d.labels[k].split(' ')[0])}${k.endsWith('arka') ? ' (A)' : k.endsWith('on') ? ' (Ö)' : ''}</span>`).join(' ')}</td><td><span class="tag ${STATUS[p.status]?.[0] || ''}">${esc(STATUS[p.status]?.[1] || p.status)}</span><br><small class="muted">${date(p.updated)}</small></td><td style="text-align:right"><button class="b s" data-partner="${esc(p.id)}">İncele</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Henüz partner başvurusu yok. Başvuru sayfası: <a href="/partner-ol/" target="_blank">/partner-ol/</a></td></tr>'}</tbody></table></div>`;
    $$('[data-partner]').forEach(b => b.onclick = () => partnerDetail(d.partners.find(p => p.id === b.dataset.partner), d.labels));
  }
  function partnerDetail(p, labels) {
    dlg(p.company, `<p class="muted" style="margin-top:0">${esc(p.name)} · ${esc(p.email)} · VKN ${esc(p.taxNumber)} (${esc(p.taxOffice)})</p>
      <b style="font-size:13px">Belgeler</b><div class="bm-docrow">${Object.entries(labels).map(([k, l]) => p.docs[k] ? `<a href="/api/platform/admin/partners/file/${esc(p.id)}/${k}" target="_blank" rel="noopener"><b>${esc(l)}</b><span class="muted">${esc(p.docs[k].name)}</span><span class="tag ${p.docs[k].status === 'Uygun' ? 'g' : p.docs[k].status === 'Sorunlu' ? 'r' : ''}">${esc(p.docs[k].status || 'Yüklendi')}</span></a>` : `<a aria-disabled="true"><b>${esc(l)}</b><span class="muted">Yüklenmedi</span></a>`).join('')}</div>
      <p style="font-size:13px"><b>Didit kimlik doğrulaması:</b> ${p.kyc ? esc(p.kyc.status) : (D_PARTNERS.didit ? 'Başlatılmadı' : 'Didit yapılandırılmadı — kimlik ön/arka yüklemesi kullanılıyor')}</p>
      ${p.check ? `<div class="bm-note ${p.check.decision === 'approve' ? 'ok' : 'info'}"><b>Otomatik kontrol (${date(p.check.at)})${p.check.confidence ? ' · güven ' + Math.round(p.check.confidence * 100) + '%' : ''}:</b> ${esc(p.check.summary)}${p.check.checks ? '<br>' + Object.entries(p.check.checks).map(([k, v]) => `${esc(labels[k] || k)}: ${v.ok ? '✓' : '✗'} ${esc(v.notes || '')}`).join('<br>') : ''}</div>` : ''}
      <b style="font-size:13px">Geçmiş</b><ul style="font-size:12.5px;color:#58685d;padding-left:18px">${p.history.map(h => `<li>${date(h.at)} — ${esc(h.text)}</li>`).join('')}</ul>
      <form id="rv" class="bm-f"><label class="full">Ret / düzeltme gerekçesi (reddederken zorunlu)<textarea name="reason" style="min-height:70px">${esc(p.reason || '')}</textarea></label><div class="full bm-flex"><button class="b p" data-d="approve">Onayla</button><button class="b r" data-d="reject">Düzeltme iste / reddet</button>${META.verifier && Object.keys(labels).every(k => p.docs[k]) ? '<button class="b" data-d="recheck">Yeniden otomatik kontrol</button>' : ''}</div><div class="full bm-note" id="rvn"></div></form>`);
    $('#rv').onclick = async e => {
      const b = e.target.closest('[data-d]'); if (!b) return; e.preventDefault();
      try { await api('partners/review', 'POST', {id: p.id, decision: b.dataset.d, reason: $('#rv').reason.value}); $('#dlg').close(); note('ok', 'Karar kaydedildi; partnere bildirim gönderildi.'); partners(); }
      catch (err) { $('#rvn').className = 'full bm-note err'; $('#rvn').textContent = err.message; }
    };
  }

  // ---------- Panel modules ----------
  const BUILTIN = {customer: ['Genel Bakış', 'Dosyalarım', 'Finans', 'Servisler', 'Destek', 'Kimlik Doğrulama'], partner: ['Genel Bakış', 'Müşteriler', 'Dosyalarım', 'Finans', 'Referanslar', 'KYC', 'Raporlar'], staff: ['Genel Bakış', 'Müşteriler', 'Dosyalarım', 'Finans', 'Referanslar', 'KYC', 'Raporlar'], lawyer: ['Gelen Evraklar', 'Giden Evraklar', 'Finans']};
  async function modulesView() {
    const d = await api('modules');
    $('#view').innerHTML = `<div class="bm-box"><div class="bm-flex"><div><h2 style="margin:0">Özel modüller</h2><p class="muted" style="margin:4px 0 0;font-size:12.5px">Seçtiğiniz panellerin menüsüne yeni sekme ekler: metin/duyuru içeriği, dış bağlantı veya gömülü sayfa (form, takvim, video…).</p></div><span class="sp"></span><button class="b p" id="addm">+ Modül ekle</button></div>
      <table class="bm-t" style="margin-top:14px"><thead><tr><th>Modül</th><th>Tür</th><th>Paneller</th><th>Sıra</th><th>Durum</th><th></th></tr></thead><tbody>${d.modules.map(m => `<tr><td><b>${esc(m.title)}</b></td><td>${{content: 'İçerik', link: 'Bağlantı', embed: 'Gömülü sayfa'}[m.type]}</td><td>${(m.panels || []).map(p => `<span class="tag">${esc(META.panels[p])}</span>`).join(' ')}</td><td>${m.order || 0}</td><td><span class="tag ${m.active !== false ? 'g' : ''}">${m.active !== false ? 'Yayında' : 'Gizli'}</span></td><td style="text-align:right;white-space:nowrap"><button class="b s" data-m="${esc(m.id)}">Düzenle</button> <button class="b s r" data-del="${esc(m.id)}">Kaldır</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Henüz özel modül yok.</td></tr>'}</tbody></table></div>
      <div class="bm-box"><h2>Hazır modüller</h2><p class="muted" style="margin:-6px 0 14px;font-size:12.5px">Panellerin mevcut sekmeleri. İşareti kaldırdığınız sekme o panelde gizlenir (veriler silinmez; tekrar açabilirsiniz).</p><form id="bi">${Object.entries(BUILTIN).map(([p, list]) => `<div style="margin-bottom:14px"><b style="font-size:13px">${esc(META.panels[p])}</b><div class="bm-flex" style="margin-top:8px">${list.map(l => `<label class="tag" style="padding:7px 11px;cursor:pointer"><input type="checkbox" data-p="${p}" value="${esc(l)}" ${(d.builtins[p]?.hidden || []).includes(l) ? '' : 'checked'}> ${esc(l)}</label>`).join('')}</div></div>`).join('')}<button class="b p">Görünürlüğü kaydet</button></form></div>`;
    $('#addm').onclick = () => moduleForm({});
    $$('[data-m]').forEach(b => b.onclick = () => moduleForm(d.modules.find(m => m.id === b.dataset.m)));
    $$('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Modül kaldırılsın mı?')) return; await api('modules/' + b.dataset.del, 'DELETE'); note('ok', 'Modül kaldırıldı.'); modulesView(); });
    $('#bi').onsubmit = async e => {
      e.preventDefault(); const out = {};
      for (const p of Object.keys(BUILTIN)) out[p] = {hidden: $$(`#bi input[data-p="${p}"]`).filter(i => !i.checked).map(i => i.value)};
      try { await api('builtins', 'POST', out); note('ok', 'Hazır modül görünürlüğü kaydedildi.'); } catch (err) { note('err', esc(err.message)); }
    };
  }
  function moduleForm(m) {
    dlg(m.id ? 'Modülü düzenle' : 'Yeni modül', `<form class="bm-f" id="mf"><label>Modül adı (menüde görünür)<input name="title" required maxlength="60" value="${esc(m.title || '')}"></label><label>Tür<select name="type"><option value="content" ${m.type === 'content' ? 'selected' : ''}>İçerik / duyuru</option><option value="link" ${m.type === 'link' ? 'selected' : ''}>Dış bağlantı (yeni sekmede)</option><option value="embed" ${m.type === 'embed' ? 'selected' : ''}>Gömülü sayfa (iframe)</option></select></label>
      <div class="full"><b style="font-size:12px">Paneller</b><div class="bm-flex" style="margin-top:8px">${Object.entries(META.panels).map(([k, v]) => `<label class="tag" style="padding:7px 11px;cursor:pointer"><input type="checkbox" name="panels" value="${k}" ${(m.panels || []).includes(k) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</div></div>
      <label class="full" data-for="url">Bağlantı (https://)<input name="url" value="${esc(m.url || '')}" placeholder="https://…"></label>
      <label class="full" data-for="content">İçerik (düz metin; **kalın** ve https:// bağlantıları desteklenir)<textarea name="content">${esc(m.content || '')}</textarea></label>
      <label>Sıra<input name="order" type="number" value="${m.order || 0}"></label><label>Durum<select name="active"><option value="1">Yayında</option><option value="0" ${m.active === false ? 'selected' : ''}>Gizli</option></select></label>
      <div class="full bm-flex"><button class="b p">Kaydet</button></div><div class="full bm-note" id="mfn"></div></form>`);
    const f = $('#mf');
    const sync = () => { f.querySelector('[data-for=url]').hidden = f.type.value === 'content'; f.querySelector('[data-for=content]').hidden = f.type.value !== 'content'; };
    f.type.onchange = sync; sync();
    f.onsubmit = async e => {
      e.preventDefault();
      const b = {id: m.id, title: f.title.value, type: f.type.value, url: f.url.value, content: f.content.value, order: Number(f.order.value), active: f.active.value === '1', panels: [...f.querySelectorAll('input[name=panels]:checked')].map(i => i.value)};
      try { await api('modules', 'POST', b); $('#dlg').close(); note('ok', 'Modül kaydedildi.'); modulesView(); } catch (err) { $('#mfn').className = 'full bm-note err'; $('#mfn').textContent = err.message; }
    };
  }

  // ---------- Pre-assessment leads ----------
  const ANS = {goal: {vatandaslik: 'Vatandaşlık', ikamet: 'Yasal ikamet / CRNM', sirket: 'Şirket kurmak', cpf: 'CPF', evlilik: 'Brezilyalı ile evlilik', tasinma: 'Taşınma planı'}, status: {hic: 'Hiç gitmedi', kisa: 'Kısa süre gitti', turist: 'Brezilya’da turist', vize: 'Vizesi var', ikamet: 'Yasal ikametli'}, bond: {es: 'Brezilyalı eş', cocuk: 'Brezilyalı çocuk', is: 'İş teklifi/planı', yatirim: 'Yatırım sermayesi', gelir: 'Uzaktan/emekli geliri', yok: 'Yok'}};
  async function leads() {
    const d = await api('leads');
    const csv = () => { const rows = [['E-posta', 'Ad', 'Hedef', 'Durum', 'Bağ', 'Sonuçlar', 'Yol haritası istedi', 'Tarih']].concat(d.leads.map(l => [l.email, l.name || '', ANS.goal[l.answers?.goal] || '', ANS.status[l.answers?.status] || '', ANS.bond[l.answers?.bond] || '', (l.results || []).map(r => r.title + ' ' + r.score).join(' | '), l.roadmapRequested ? 'Evet' : '', new Date(l.updated).toLocaleString('tr-TR')])); const blob = new Blob(['\ufeff' + rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\n')], {type: 'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'on-degerlendirmeler.csv'; a.click(); };
    $('#view').innerHTML = `<div class="bm-box"><div class="bm-flex"><div><h2 style="margin:0">Ön değerlendirme sonuçları (${d.leads.length})</h2><p class="muted" style="margin:4px 0 0;font-size:12.5px">/degerlendirme/ sayfasında testi tamamlayıp e-posta ve abonelik onayı veren ziyaretçiler.</p></div><span class="sp"></span><button class="b" id="csv">CSV indir</button></div></div>
    <div class="bm-box" style="padding:8px"><table class="bm-t"><thead><tr><th>E-posta</th><th>Yanıtlar</th><th>Önerilen seçenekler</th><th>Tarih</th></tr></thead><tbody>${d.leads.map(l => `<tr><td><b>${esc(l.email)}</b>${l.name ? `<br><small class="muted">${esc(l.name)}</small>` : ''}${l.roadmapRequested ? '<br><span class="tag g">Yol haritası istedi</span>' : ''}</td><td><small>${esc(ANS.goal[l.answers?.goal] || '-')}<br>${esc(ANS.status[l.answers?.status] || '-')}<br>${esc(ANS.bond[l.answers?.bond] || '-')}</small></td><td><small>${(l.results || []).map(r => esc(r.title) + ' — <b>' + r.score + '</b>').join('<br>')}</small></td><td><small>${date(l.updated)}</small></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Henüz kayıt yok.</td></tr>'}</tbody></table></div>`;
    $('#csv').onclick = csv;
  }

  // ---------- Google Meet integration + bookings ----------
  async function meetView() {
    const d = await api('meet'), m = d.meet || {};
    $('#view').innerHTML = `<div class="bm-box"><div class="bm-flex"><span class="bm-ico" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#e8f0fe;font-size:22px">🎥</span><div><h2 style="margin:0">Google Meet eklentisi</h2><p class="muted" style="margin:4px 0 0;font-size:12.5px">“15 dakikalık ücretsiz görüşme” formunu dolduran kişiye toplantı bağlantısı otomatik olarak e-postayla gönderilir.</p></div><span class="sp"></span><span class="tag ${m.active !== false && (m.link || m.webhook) ? 'g' : 'a'}">${m.active !== false && (m.link || m.webhook) ? 'Aktif' : 'Kurulum bekliyor'}</span></div></div>
    ${d.mail ? '' : '<div class="bm-note info">E-posta gönderimi henüz açık değil: talepler kaydedilir ve Meet linki ziyaretçiye ekranda gösterilir, ancak e-posta gitmez. <b>E-posta (SMTP)</b> sekmesinden gönderimi açınca otomatik gönderim başlar.</div>'}
    <div class="bm-box"><form class="bm-f" id="mt">
      <label class="full">Bağlantı yöntemi<select name="mode"><option value="fixed" ${m.mode !== 'webhook' ? 'selected' : ''}>Sabit Google Meet linki (en basit)</option><option value="webhook" ${m.mode === 'webhook' ? 'selected' : ''}>API / webhook — her görüşmeye ayrı link (gelişmiş)</option></select></label>
      <label class="full" data-m="fixed">Sabit Meet linki<input name="link" placeholder="https://meet.google.com/abc-defg-hij" value="${esc(m.link || '')}"><small class="muted" style="font-weight:400">Google Takvim’de tekrarlayan bir “Ön görüşme” etkinliği oluşturup Meet linkini buraya yapıştırın.</small></label>
      <label class="full" data-m="webhook">API / webhook adresi<input name="webhook" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(m.webhook || '')}"><small class="muted" style="font-weight:400">Her talepte bu adrese görüşme bilgileri (ad, e-posta, startISO, endISO) POST edilir; yanıtta <code>{"meetLink":"https://meet.google.com/…"}</code> beklenir. Yanıt gelmezse sabit link kullanılır.</small></label>
      <label data-m="webhook">Gizli anahtar (X-BM-Secret, isteğe bağlı)<input name="secret" value="${esc(m.secret || '')}"></label>
      <label>Yeni talep bildirimi e-postası<input name="notifyEmail" type="email" placeholder="ornek@sirket.com" value="${esc(m.notifyEmail || '')}"></label>
      <label>Durum<select name="active"><option value="1">Aktif</option><option value="0" ${m.active === false ? 'selected' : ''}>Kapalı</option></select></label>
      <div class="full bm-flex"><button class="b p">Kaydet</button><span class="muted" style="font-size:12px">${m.updated ? 'Son güncelleme: ' + date(m.updated) : ''}</span></div></form></div>
    <div class="bm-box"><h2>Webhook için Google Apps Script örneği</h2><p class="muted" style="font-size:12.5px;margin-top:-6px">script.google.com → Yeni proje → kodu yapıştırın → Hizmetler’den “Google Calendar API” ekleyin → Dağıt → Web uygulaması (Herkes) → çıkan adresi yukarıya girin.</p><pre style="background:#f6f7f2;border:1px solid var(--line);border-radius:10px;padding:14px;font-size:12px;overflow:auto">function doPost(e) {
  var b = JSON.parse(e.postData.contents);
  var ev = Calendar.Events.insert({
    summary: b.title, description: b.email + ' ' + (b.phone || '') + '\\n' + (b.note || ''),
    start: {dateTime: b.startISO}, end: {dateTime: b.endISO},
    attendees: [{email: b.email}],
    conferenceData: {createRequest: {requestId: b.id, conferenceSolutionKey: {type: 'hangoutsMeet'}}}
  }, 'primary', {conferenceDataVersion: 1, sendUpdates: 'all'});
  return ContentService.createTextOutput(JSON.stringify({meetLink: ev.hangoutLink}))
    .setMimeType(ContentService.MimeType.JSON);
}</pre></div>`;
    const f = $('#mt'); const sync = () => f.querySelectorAll('[data-m]').forEach(x => x.hidden = x.dataset.m === 'webhook' && f.mode.value !== 'webhook'); f.mode.onchange = sync; sync();
    f.onsubmit = async e => { e.preventDefault(); try { await api('meet', 'POST', {mode: f.mode.value, link: f.link.value.trim(), webhook: f.webhook.value.trim(), secret: f.secret.value, notifyEmail: f.notifyEmail.value.trim(), active: f.active.value === '1'}); note('ok', 'Google Meet ayarları kaydedildi.'); meetView(); } catch (err) { note('err', esc(err.message)); } };
  }
  async function bookingsView() {
    const d = await api('bookings');
    const ST = {'Planlandı': 'b', 'Tamamlandı': 'g', 'İptal': 'r', 'Gelmedi': 'a'};
    $('#view').innerHTML = `<div class="bm-box"><h2 style="margin:0">Ön görüşme talepleri (${d.bookings.length})</h2><p class="muted" style="margin:4px 0 0;font-size:12.5px">Sitedeki “15 dakikalık ücretsiz görüşme” formundan gelen talepler.</p></div>
    <div class="bm-box" style="padding:8px"><table class="bm-t"><thead><tr><th>Tarih / saat</th><th>Kişi</th><th>Hizmet / not</th><th>Meet</th><th>Durum</th></tr></thead><tbody>${d.bookings.map(x => `<tr><td><b>${esc(new Date(x.start).toLocaleString('tr-TR', {timeZone: x.timezone, dateStyle: 'medium', timeStyle: 'short'}))}</b><br><small class="muted">${esc(x.timezone === 'America/Sao_Paulo' ? 'São Paulo saati' : 'Türkiye saati')}</small></td><td>${esc(x.name)}<br><small class="muted">${esc(x.email)}${x.phone ? ' · ' + esc(x.phone) : ''}</small></td><td><small>${esc(x.service || '')}${x.package ? '<br>' + esc(x.package) : ''}${x.note ? '<br><i>' + esc(x.note) + '</i>' : ''}</small></td><td>${x.teamRoomLink ? `<a class="b s" href="${esc(x.teamRoomLink)}" target="_blank" rel="noopener">Görüşmeye katıl</a> <small class="muted">Oda ${esc(x.room)}</small><br>` : ''}${x.meet ? `<a class="b s" href="${esc(x.meet)}" target="_blank" rel="noopener">Meet</a>` : x.teamRoomLink ? '' : '<small class="muted">Link yok</small>'}<br><small class="muted">${x.mailSent ? 'E-posta gitti' : 'E-posta gitmedi'}</small></td><td><select class="bm-in" data-bk="${esc(x.id)}" style="width:auto">${Object.keys(ST).map(s => `<option ${x.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Henüz görüşme talebi yok.</td></tr>'}</tbody></table></div>`;
    $$('[data-bk]').forEach(sel => sel.onchange = async () => { try { await api('bookings', 'PATCH', {id: sel.dataset.bk, status: sel.value}); note('ok', 'Durum güncellendi.'); } catch (err) { note('err', esc(err.message)); } });
  }

  async function route(force) {
    tab = force || (location.hash || '#hesaplar').slice(1) || 'hesaplar';
    $$('#tabs a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + tab));
    note('', '');
    try {
      if (tab === 'yeni') { if (!ACCOUNTS.length) ACCOUNTS = (await api('accounts')).accounts; newForm(); }
      else if (tab === 'partnerler') await partners();
      else if (tab === 'moduller') await modulesView();
      else if (tab === 'degerlendirmeler') await leads();
      else if (tab === 'meet') await meetView();
      else if (tab === 'gorusmeler') await bookingsView();
      else await accounts();
    } catch (err) { if (err.message !== 'Giriş gerekli') note('err', esc(err.message)); }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) editAccount(b.dataset.edit); });
  // Yönetim paneline gömülü çalışır (/admin/#partnerler vb.). Ayrı sayfa artık /admin/'e yönlendirir.
  async function ensureMeta() { if (!META) META = await api('meta'); }
  window.BMAcc = {
    async route(name) { await ensureMeta(); await route(name); },
    async edit(id) { await ensureMeta(); ACCOUNTS = (await api('accounts')).accounts; editAccount(id); },
    async pendingPartners() { const d = await api('partners'); return d.partners.filter(p => p.status === 'review').length; },
  };
})();
