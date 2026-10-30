'use strict';
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const date = t => t ? new Date(t).toLocaleString('tr-TR', {dateStyle: 'short', timeStyle: 'short'}) : '';
  async function api(path, method = 'GET', body) {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent(location.pathname + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  }
  const note = (type, html) => { const n = $('#note'); n.className = 'bm-note ' + type; n.innerHTML = html; if (html) n.scrollIntoView({block: 'nearest', behavior: 'smooth'}); };
  const devLink = d => d.devLink ? `<br><b>Test modu (e-posta servisi bağlı değil):</b> bu bağlantıyı kişiye iletin → <a href="${esc(d.devLink)}" target="_blank">${esc(d.devLink)}</a>` : (d.mailSent ? '<br>Giriş bağlantısı e-postayla gönderildi.' : '');
  const dlg = (title, html) => { $('#dlg-t').textContent = title; $('#dlg-b').innerHTML = html; $('#dlg').showModal(); };
  document.addEventListener('click', e => { if (e.target.closest('[data-close]')) $('#dlg').close(); });

  let META, ACCOUNTS = [], tab = 'hesaplar', newType = 'customer', filter = 'all';
  const TYPE_DESC = {customer: 'Brezilya başvurusu yapacak kişi. Müşteri paneline girer.', advisor: 'Danışman / partner. Müşterilerini, belgeleri, finansı ve referansları yönetir.', lawyer: 'Avukat paneli: gelen/giden evrak ve finans.', accountant: 'Muhasebe personeli. Faturalar, ödemeler ve komisyonlar.', other: 'Diğer personel; yetkilerini siz belirlersiniz.'};
  const STATUS = {docs_required: ['a', 'Belge bekleniyor'], queued: ['b', 'Kontrol sırasında'], checking: ['b', 'Kontrol ediliyor'], review: ['a', 'İnceleme bekliyor'], approved: ['g', 'Onaylı'], rejected: ['r', 'Düzeltme istendi']};
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
      try { await api('accounts', 'PATCH', b); $('#dlg').close(); note('ok', 'Hesap güncellendi.'); accounts(); } catch (err) { $('#ednote').className = 'full bm-note err'; $('#ednote').textContent = err.message; }
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
  async function partners() {
    const d = await api('partners');
    const pending = d.partners.filter(p => p.status === 'review').length;
    $('#pcount').hidden = !pending; $('#pcount').textContent = pending;
    $('#view').innerHTML = `${!META.verifier ? '<div class="bm-note info">Otomatik belge doğrulama henüz yapılandırılmadı (ANTHROPIC_API_KEY). Tüm belgeler yüklendiğinde başvurular “İnceleme bekliyor” durumuna düşer; buradan onaylayabilirsiniz.</div>' : ''}
    <div class="bm-box" style="padding:8px"><table class="bm-t"><thead><tr><th>Firma</th><th>Yetkili</th><th>Vergi</th><th>Belgeler</th><th>Durum</th><th></th></tr></thead><tbody>${d.partners.map(p => `<tr><td><b>${esc(p.company)}</b><br><small class="muted">${esc((p.services || []).join(', '))}</small></td><td>${esc(p.name)}<br><small class="muted">${esc(p.email)}</small></td><td><small>${esc(p.taxOffice)}<br>${esc(p.taxNumber)}</small></td><td>${Object.keys(d.labels).map(k => `<span class="tag ${p.docs[k] ? (p.docs[k].status === 'Uygun' ? 'g' : p.docs[k].status === 'Sorunlu' ? 'r' : 'b') : ''}" title="${esc(d.labels[k])}">${esc(d.labels[k].split(' ')[0])}${k.endsWith('arka') ? ' (A)' : k.endsWith('on') ? ' (Ö)' : ''}</span>`).join(' ')}</td><td><span class="tag ${STATUS[p.status]?.[0] || ''}">${esc(STATUS[p.status]?.[1] || p.status)}</span><br><small class="muted">${date(p.updated)}</small></td><td style="text-align:right"><button class="b s" data-partner="${esc(p.id)}">İncele</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Henüz partner başvurusu yok. Başvuru sayfası: <a href="/partner-ol/" target="_blank">/partner-ol/</a></td></tr>'}</tbody></table></div>`;
    $$('[data-partner]').forEach(b => b.onclick = () => partnerDetail(d.partners.find(p => p.id === b.dataset.partner), d.labels));
  }
  function partnerDetail(p, labels) {
    dlg(p.company, `<p class="muted" style="margin-top:0">${esc(p.name)} · ${esc(p.email)} · VKN ${esc(p.taxNumber)} (${esc(p.taxOffice)})</p>
      <b style="font-size:13px">Belgeler</b><div class="bm-docrow">${Object.entries(labels).map(([k, l]) => p.docs[k] ? `<a href="/api/platform/admin/partners/file/${esc(p.id)}/${k}" target="_blank" rel="noopener"><b>${esc(l)}</b><span class="muted">${esc(p.docs[k].name)}</span><span class="tag ${p.docs[k].status === 'Uygun' ? 'g' : p.docs[k].status === 'Sorunlu' ? 'r' : ''}">${esc(p.docs[k].status || 'Yüklendi')}</span></a>` : `<a aria-disabled="true"><b>${esc(l)}</b><span class="muted">Yüklenmedi</span></a>`).join('')}</div>
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

  async function route() {
    tab = (location.hash || '#hesaplar').slice(1) || 'hesaplar';
    $$('#tabs a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + tab));
    note('', '');
    try {
      if (tab === 'yeni') { if (!ACCOUNTS.length) ACCOUNTS = (await api('accounts')).accounts; newForm(); }
      else if (tab === 'partnerler') await partners();
      else if (tab === 'moduller') await modulesView();
      else await accounts();
    } catch (err) { if (err.message !== 'Giriş gerekli') note('err', esc(err.message)); }
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) editAccount(b.dataset.edit); });
  $('#logout').onclick = async () => { await fetch('/api/auth/admin/logout', {method: 'POST'}); location.href = '/admin/giris/'; };
  window.addEventListener('hashchange', route);
  (async () => {
    const me = await fetch('/api/auth/admin/me').then(r => r.json()).catch(() => ({}));
    if (!me.user) { location.href = '/admin/giris/?next=' + encodeURIComponent(location.pathname + location.hash); return; }
    $('#who').textContent = me.user.email;
    try { META = await api('meta'); } catch (err) { note('err', esc(err.message)); return; }
    api('partners').then(d => { const n = d.partners.filter(p => p.status === 'review').length; $('#pcount').hidden = !n; $('#pcount').textContent = n; }).catch(() => {});
    route();
  })();
})();
