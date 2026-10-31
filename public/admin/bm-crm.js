'use strict';
// Brazil Migration CRM: gerçek giriş hesaplarını (müşteri, partner, danışman, avukat, muhasebe, diğer)
// yönetim panelinin içinde listeler; gruplar, kişi detayı ve eski /admin/hesaplar/ sekmeleri burada.
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'});
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const D = {accounts: [], groups: [], meta: null, partners: null, loaded: 0};
  const day = t => t ? new Date(t).toLocaleDateString('tr-TR', {day: '2-digit', month: 'short', year: 'numeric'}) : '—';
  const ago = t => { if (!t) return '—'; const m = Math.floor((Date.now() - t) / 864e5 / 30.4); return m < 1 ? 'Bu ay' : m < 12 ? m + ' ay' : Math.floor(m / 12) + ' yıl ' + (m % 12 ? m % 12 + ' ay' : ''); };

  // ---------- ikonlar ----------
  const P = {
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    handshake: '<path d="m11 17 2 2a1.5 1.5 0 0 0 2-2"/><path d="m14 14 2.5 2.5a1.5 1.5 0 0 0 2-2L14 10l-1.5 1.5a2 2 0 0 1-3-3L12 6l-1-1-7 7 4 4"/><path d="m21 12-4-4-2.5 2.5M3 12l2-2"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
    calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>',
    badge: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17a4 4 0 0 1 8 0"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    dots: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    pin: '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>',
    note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h6"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11l2-8H6.5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 18 9 12l6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  };
  const I = (k, cls = '') => `<svg class="bmc-i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.person}</svg>`;
  const GROUP_ICONS = ['person', 'users', 'briefcase', 'award', 'scale', 'calculator', 'star', 'shield', 'heart', 'globe', 'building', 'flag'];

  // ---------- hesap türleri ----------
  const KIND = {
    customer: {label: 'Müşteri', icon: 'person', cls: 'k-cus'},
    partner: {label: 'Partner', icon: 'handshake', cls: 'k-par'},
    advisor: {label: 'Danışman', icon: 'briefcase', cls: 'k-adv'},
    lawyer: {label: 'Avukat', icon: 'scale', cls: 'k-law'},
    accountant: {label: 'Muhasebe', icon: 'calculator', cls: 'k-acc'},
    other: {label: 'Personel', icon: 'badge', cls: 'k-oth'},
  };
  const kindOf = a => a.type === 'advisor' && a.partner ? 'partner' : (KIND[a.type] ? a.type : 'other');
  const kindChip = a => { const k = KIND[kindOf(a)]; return `<span class="bmc-kind ${k.cls}">${I(k.icon)}${k.label}</span>`; };
  const groupOf = a => D.groups.find(g => g.id === a.group);
  const groupChip = g => g ? `<span class="bmc-grp" style="--g:${esc(g.color)}">${I(g.icon)}${esc(g.name)}</span>` : '<span class="bmc-none">—</span>';
  const statusChip = a => a.status === 'active' ? '<span class="bmc-st on">' + I('check') + 'AKTİF</span>' : '<span class="bmc-st off">PASİF</span>';
  const loginChip = a => { const m = {'Aktif': 'on', 'Doğrulama bekliyor': 'wait', 'Şifre bekleniyor': 'wait', 'Giriş yok': 'off'}; return `<span class="bmc-login ${m[a.login] || 'off'}">${a.login === 'Aktif' ? 'Giriş aktif' : esc(a.login)}</span>`; };
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('tr');

  async function load(force) {
    if (!force && D.loaded && Date.now() - D.loaded < 15000) return;
    const [acc, meta] = await Promise.all([A('accounts'), D.meta ? Promise.resolve(D.meta) : A('meta')]);
    D.accounts = acc.accounts; D.groups = acc.groups || []; D.meta = meta; D.loaded = Date.now();
  }
  const mount = (html, fn) => { setTimeout(async () => { try { await fn(); } catch (e) { if (e.message !== 'Giriş gerekli') { const m = $('#bmc-root') || $('#main'); m.insertAdjacentHTML('afterbegin', `<div class="bmc-err">${esc(e.message)}</div>`); } } }, 0); return html; };

  // ---------- MÜŞTERİ LİSTESİ ----------
  const F = {q: '', kind: '', group: '', status: '', sel: new Set()};
  function listHTML() {
    const L = D.accounts, act = k => L.filter(a => kindOf(a) === k || (k === 'advisor' && kindOf(a) === 'partner'));
    const card = (title, items, icon) => `<article class="account-pair"><h2>${I(icon)} ${title}</h2><div class="account-counts"><div><small>AKTİF</small><strong>${items.filter(a => a.status === 'active').length}</strong></div><div><small>PASİF</small><strong>${items.filter(a => a.status !== 'active').length}</strong></div></div></article>`;
    const recent = L.filter(a => Date.now() - a.created < 30 * 864e5).length;
    const waiting = L.filter(a => a.login !== 'Aktif').length;
    const pend = D.partners ?? '…';
    const shown = filtered();
    return `<div class="account-stats">${card('Müşteriler', act('customer'), 'person')}${card('Partner & Danışman', act('advisor'), 'handshake')}${card('Avukat', act('lawyer'), 'scale')}${card('Muhasebe & Personel', L.filter(a => ['accountant', 'other'].includes(kindOf(a))), 'calculator')}</div>
      <div class="customer-band"><div>${I('users')}<span><small>Toplam hesap</small><b>${L.length}</b></span></div><div>${I('key')}<span><small>Girişi tamamlanmamış</small><b>${waiting}</b></span></div><div>${I('handshake')}<span><small>İncelenecek partner başvurusu</small><b><a href="#partnerler">${pend}</a></b></span></div><div>${I('calendar')}<span><small>Son 30 gün yeni hesap</small><b>${recent}</b></span></div></div>
      <section class="panel bmc-list"><div class="bmc-tools">
        <label class="bmc-search">${I('search', 'sr')}<input id="bmc-q" placeholder="Ara… (ad, e-posta, telefon, şehir)" value="${esc(F.q)}"><em>${shown.length} kayıt</em></label>
        <select id="bmc-kind"><option value="">Tüm türler</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${F.kind === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select>
        <select id="bmc-group"><option value="">Grup seçin</option><option value="-" ${F.group === '-' ? 'selected' : ''}>Grupsuz</option>${D.groups.map(g => `<option value="${esc(g.id)}" ${F.group === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
        <select id="bmc-status"><option value="">Durum</option><option value="active" ${F.status === 'active' ? 'selected' : ''}>Aktif</option><option value="disabled" ${F.status === 'disabled' ? 'selected' : ''}>Pasif</option></select>
        <span class="sp"></span>
        <button class="btn ghost" id="bmc-csv" title="CSV indir">${I('download')}</button>
        <button class="btn soft" id="bmc-groups">${I('users')} Grup Yönetimi</button>
        <a class="btn primary" href="#yeni">${I('plus')} Yeni Müşteri Oluştur</a></div>
        <div class="bmc-bulk" id="bmc-bulk" hidden><b id="bmc-bn"></b> seçili · <select id="bmc-bg"><option value="">Gruba ata…</option><option value="-">Gruptan çıkar</option>${D.groups.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select><button class="btn" id="bmc-bclear">Seçimi temizle</button></div>
        <div class="bmc-table" id="bmc-table">${tableHTML(shown)}</div></section>`;
  }
  function filtered() {
    const q = F.q.toLocaleLowerCase('tr');
    return D.accounts.filter(a => (!F.kind || kindOf(a) === F.kind) && (!F.status || (F.status === 'active' ? a.status === 'active' : a.status !== 'active')) && (!F.group || (F.group === '-' ? !groupOf(a) : a.group === F.group)) && (!q || [a.name, a.email, a.phone, a.city, a.country, a.company].join(' ').toLocaleLowerCase('tr').includes(q)));
  }
  function tableHTML(list) {
    if (!list.length) return `<div class="bmc-empty">${I('users')}<b>Kayıt bulunamadı.</b><span>${D.accounts.length ? 'Filtreleri değiştirin.' : 'İlk hesabı “Yeni Müşteri Oluştur” ile ekleyin. Siteden kayıt olan müşteriler de burada listelenir.'}</span></div>`;
    return `<table><thead><tr><th class="c"><input type="checkbox" id="bmc-all"></th><th>Ad Soyad</th><th>E-posta / Telefon</th><th>Tür</th><th>Grup</th><th>Ülke / Şehir</th><th>Kayıt</th><th>Giriş</th><th>Durum</th><th></th></tr></thead><tbody>${list.map(a => `<tr data-open="${esc(a.id)}">
      <td class="c"><input type="checkbox" data-sel="${esc(a.id)}" ${F.sel.has(a.id) ? 'checked' : ''}></td>
      <td><div class="bmc-who"><span class="bmc-av">${esc(initials(a.name))}</span><span><b>${esc(a.name)}</b>${a.company ? `<small>${esc(a.company)}</small>` : a.advisorName && kindOf(a) === 'customer' ? `<small>Danışman: ${esc(a.advisorName)}</small>` : ''}</span></div></td>
      <td><span class="bmc-ct">${esc(a.email)}</span>${a.phone ? `<small class="bmc-ct">${esc(a.phone)}</small>` : ''}</td>
      <td>${kindChip(a)}</td><td>${groupChip(groupOf(a))}</td>
      <td>${esc([a.country, a.city].filter(Boolean).join(' / ') || '—')}</td>
      <td><span class="bmc-date">${day(a.created)}</span></td><td>${loginChip(a)}</td><td>${statusChip(a)}</td>
      <td class="c"><button class="bmc-dots" data-menu="${esc(a.id)}" aria-label="İşlemler">${I('dots')}</button></td></tr>`).join('')}</tbody></table>`;
  }
  function bindList() {
    const redraw = () => { $('#bmc-table').innerHTML = tableHTML(filtered()); $('.bmc-search em').textContent = filtered().length + ' kayıt'; bulk(); };
    $('#bmc-q').oninput = e => { F.q = e.target.value; redraw(); };
    [['#bmc-kind', 'kind'], ['#bmc-group', 'group'], ['#bmc-status', 'status']].forEach(([s, k]) => $(s).onchange = e => { F[k] = e.target.value; redraw(); });
    $('#bmc-groups').onclick = groupsModal;
    $('#bmc-csv').onclick = csv;
    $('#bmc-bclear').onclick = () => { F.sel.clear(); redraw(); };
    $('#bmc-bg').onchange = async e => { const v = e.target.value; if (!v) return; try { await A('accounts/group', 'POST', {ids: [...F.sel], group: v === '-' ? '' : v}); F.sel.clear(); await load(true); say('Grup ataması kaydedildi.'); render(); } catch (err) { say(err.message); } };
    $('#bmc-root').onclick = e => {
      const t = e.target;
      if (t.id === 'bmc-all') { filtered().forEach(a => t.checked ? F.sel.add(a.id) : F.sel.delete(a.id)); $$('[data-sel]').forEach(c => c.checked = t.checked); bulk(); return; }
      if (t.dataset.sel) { t.checked ? F.sel.add(t.dataset.sel) : F.sel.delete(t.dataset.sel); bulk(); return; }
      const m = t.closest('[data-menu]'); if (m) { rowMenu(m); e.stopPropagation(); return; }
      const mi = t.closest('[data-mi]'); if (mi) { rowAction(mi.dataset.mi, mi.dataset.id); return; }
      const tr = t.closest('tr[data-open]'); if (tr && !t.closest('input,button,a,select')) location.hash = '#account/' + encodeURIComponent(tr.dataset.open);
    };
  }
  const $$ = s => [...document.querySelectorAll(s)];
  function bulk() { const b = $('#bmc-bulk'); if (!b) return; b.hidden = !F.sel.size; $('#bmc-bn').textContent = F.sel.size; }
  function rowMenu(btn) {
    $$('.bmc-menu').forEach(x => x.remove());
    const a = D.accounts.find(x => x.id === btn.dataset.menu); if (!a) return;
    const m = document.createElement('div'); m.className = 'bmc-menu';
    m.innerHTML = [['manage', 'key', 'Hesabı yönet (panele gir)'], ['open', 'person', 'Detayı aç'], ['edit', 'lock', kindOf(a) === 'customer' ? 'Düzenle / danışman ata' : 'Düzenle / izinler'], ['invite', 'send', 'Giriş bağlantısı gönder'], ['toggle', 'shield', a.status === 'active' ? 'Pasif yap (giriş kapat)' : 'Aktif yap']].map(([k, i, l]) => `<button data-mi="${k}" data-id="${esc(a.id)}">${I(i)}${l}</button>`).join('');
    btn.parentElement.style.position = 'relative'; btn.parentElement.appendChild(m);
    setTimeout(() => document.addEventListener('click', () => m.remove(), {once: true}), 0);
  }
  async function rowAction(k, id) {
    const a = D.accounts.find(x => x.id === id); if (!a) return;
    try {
      if (k === 'manage') return manage(id);
      if (k === 'open') location.hash = '#account/' + encodeURIComponent(id);
      if (k === 'edit') await window.BMAcc.edit(id);
      if (k === 'invite') { const d = await A('accounts/invite', 'POST', {id}); linkInfo(d); }
      if (k === 'toggle') { await A('accounts', 'PATCH', {id, status: a.status === 'active' ? 'disabled' : 'active'}); await load(true); say('Durum güncellendi.'); render(); }
    } catch (err) { say(err.message); }
  }
  async function manage(id) {
    const w = window.open('about:blank', '_blank');
    try { const d = await A('accounts/impersonate', 'POST', {id}); if (w) w.location.href = d.url; else location.href = d.url; }
    catch (err) { if (w) w.close(); say(err.message); }
  }
  function linkInfo(d) {
    if (d.devLink) modal('Giriş bağlantısı', `<p class="bmc-p">E-posta servisi henüz bağlı olmadığı için bağlantı e-postayla gönderilemedi. Bu bağlantıyı kişiye iletin (7 gün geçerli):</p><input class="bmc-in" readonly value="${esc(d.devLink)}" onclick="this.select()">`);
    else say(d.mailSent ? 'Giriş bağlantısı e-postayla gönderildi.' : 'Bağlantı hazırlandı.');
  }
  function csv() {
    const rows = [['Ad Soyad', 'E-posta', 'Telefon', 'Tür', 'Grup', 'Ülke', 'Şehir', 'Kayıt', 'Giriş', 'Durum'], ...filtered().map(a => [a.name, a.email, a.phone || '', KIND[kindOf(a)].label, groupOf(a)?.name || '', a.country || '', a.city || '', day(a.created), a.login, a.status === 'active' ? 'Aktif' : 'Pasif'])];
    const blob = new Blob(['﻿' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n')], {type: 'text/csv;charset=utf-8'});
    const u = URL.createObjectURL(blob), l = document.createElement('a'); l.href = u; l.download = 'musteri-listesi.csv'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  function modal(title, html, cls = '') { $('#modal-title').textContent = title; $('#modal-body').innerHTML = `<div class="bmc-modal ${cls}">${html}</div>`; const d = $('#modal'); d.classList.toggle('bmc-wide', cls.includes('wide')); if (!d.open) d.showModal(); }

  // ---------- GRUP YÖNETİMİ ----------
  function groupsModal() {
    const prods = (typeof records === 'function' ? records('product') : []).map(p => p.name || p.title).filter(Boolean);
    let G = JSON.parse(JSON.stringify(D.groups));
    const tip = t => `<i class="bmc-tip" title="${esc(t)}">i</i>`;
    const draw = () => {
      $('#bmc-gl').innerHTML = G.length ? G.map((g, i) => `<div class="bmc-grow" data-i="${i}">
        <input class="bmc-in" data-f="name" value="${esc(g.name)}" placeholder="Grup adı" maxlength="40">
        <div class="bmc-icsel"><button type="button" class="bmc-in bmc-icbtn" data-ic="${i}" style="color:${esc(g.color)}">${I(g.icon)}<span>${esc(g.icon)}</span></button><div class="bmc-icpop" hidden>${GROUP_ICONS.map(k => `<button type="button" data-pick="${k}" title="${k}">${I(k)}</button>`).join('')}</div></div>
        <input type="color" data-f="color" value="${esc(g.color)}" class="bmc-color">
        <div class="bmc-disc"><div><input class="bmc-in" type="number" min="0" max="100" data-f="discount" value="${Number(g.discount) || 0}"><span>%</span>
          <details class="bmc-prod"><summary class="bmc-in">${g.products.length ? g.products.length + ' ürün seçili' : 'Tüm ürünler'}</summary><div>${prods.length ? prods.map(p => `<label><input type="checkbox" data-prod="${esc(p)}" ${g.products.includes(p) ? 'checked' : ''}> ${esc(p)}</label>`).join('') : '<small>Henüz ürün eklenmemiş. Ürünler → Ürün & Hizmetler.</small>'}</div></details></div>
          <label class="bmc-cb"><input type="checkbox" data-f="combine" ${g.combine ? 'checked' : ''}> Diğer indirimlerle birleştir</label></div>
        <label class="bmc-cb c"><input type="checkbox" data-f="protect" ${g.protect ? 'checked' : ''}></label>
        <label class="bmc-cb c"><input type="checkbox" data-f="priority" ${g.priority ? 'checked' : ''}></label>
        <label class="bmc-cb c"><input type="checkbox" data-f="separateInvoice" ${g.separateInvoice ? 'checked' : ''}></label>
        <button type="button" class="bmc-del" data-del="${i}" aria-label="Grubu sil">×</button></div>`).join('') : '<div class="bmc-empty sm">Henüz grup yok. “Grup Ekle” ile başlayın (ör. VIP, Kurumsal, Partner müşterileri).</div>';
    };
    modal('Grup Yönetimi', `<div class="bmc-ghead"><span>Grup Adı</span><span>İkon</span><span>Renk</span><span>İndirim</span><span class="c">Koruma ${tip('Bu gruptaki hesaplar toplu işlemlerde (toplu pasif yapma, toplu silme) korunur.')}</span><span class="c">Öncelik ${tip('Bu gruptaki hesapların destek talepleri ve başvuruları öncelikli işaretlenir.')}</span><span class="c">Ayrı Fatura ${tip('Bu gruptaki hesapların her siparişi için ayrı fatura kesilir.')}</span><span></span></div>
      <div id="bmc-gl"></div>
      <div class="bmc-gfoot"><button type="button" class="btn soft" id="bmc-gadd">${I('plus')} Grup Ekle</button><span class="sp"></span><small class="muted">Grup indirimleri sipariş ve fatura oluştururken uygulanmak üzere kaydedilir.</small><button type="button" class="btn primary" id="bmc-gsave">Değişiklikleri Kaydet</button></div>`, 'wide');
    draw();
    const body = $('#modal-body');
    body.oninput = body.onchange = e => {
      const row = e.target.closest('[data-i]'); if (!row) return; const g = G[row.dataset.i];
      const f = e.target.dataset.f; if (f) g[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      if (f === 'color') row.querySelector('.bmc-icbtn').style.color = e.target.value;
      if (e.target.dataset.prod !== undefined && e.type === 'change') { g.products = [...row.querySelectorAll('[data-prod]:checked')].map(x => x.dataset.prod); row.querySelector('.bmc-prod summary').textContent = g.products.length ? g.products.length + ' ürün seçili' : 'Tüm ürünler'; }
    };
    body.onclick = e => {
      const ic = e.target.closest('[data-ic]'); if (ic) { const pop = ic.nextElementSibling; $$('.bmc-icpop').forEach(p => p !== pop && (p.hidden = true)); pop.hidden = !pop.hidden; return; }
      const pk = e.target.closest('[data-pick]'); if (pk) { const row = pk.closest('[data-i]'); G[row.dataset.i].icon = pk.dataset.pick; draw(); return; }
      const del = e.target.closest('[data-del]'); if (del) { const g = G[del.dataset.del]; const n = D.accounts.filter(a => a.group === g.id).length; if (n && !confirm(`"${g.name}" grubunda ${n} hesap var. Grup silinirse bu hesaplar grupsuz kalır. Devam edilsin mi?`)) return; G.splice(del.dataset.del, 1); draw(); return; }
      if (e.target.closest('#bmc-gadd')) { G.push({id: '', name: '', icon: 'person', color: ['#1b5e20', '#0d6efd', '#8b4513', '#00695c', '#b23b48', '#a6741c'][G.length % 6], discount: 0, products: [], combine: false, protect: false, priority: false, separateInvoice: false}); draw(); body.querySelector('[data-i]:last-child [data-f=name]')?.focus(); return; }
      if (e.target.closest('#bmc-gsave')) save();
    };
    async function save() {
      if (G.some(g => !g.name.trim())) return say('Her grubun bir adı olmalı.');
      try { const d = await A('groups', 'POST', {groups: G}); D.groups = d.groups; $('#modal').close(); await load(true); say('Gruplar kaydedildi.'); render(); } catch (err) { say(err.message); }
    }
  }

  // ---------- KİŞİ DETAYI ----------
  let dTab = 'ozet';
  function legacy(a) {
    const R = t => (typeof records === 'function' ? records(t) : []);
    const ids = new Set(R('customer').filter(c => (c.email || '').toLowerCase() === a.email.toLowerCase()).map(c => c.id));
    const mine = t => R(t).filter(x => ids.has(x.customer) || (x.email || '').toLowerCase() === a.email.toLowerCase());
    return {orders: mine('order'), invoices: mine('invoice'), tickets: mine('ticket')};
  }
  function score(a) {
    const parts = [['E-posta & giriş', a.login === 'Aktif' ? 30 : a.login === 'Giriş yok' ? 0 : 10, 30], ['Telefon', a.phone ? 15 : 0, 15], ['Konum', a.city ? 15 : 0, 15], ['Grup / segment', a.group ? 10 : 0, 10], ['Hesap durumu', a.status === 'active' ? 20 : 0, 20], ['Hesap yaşı', Math.min(10, Math.floor((Date.now() - a.created) / (30 * 864e5)) * 2), 10]];
    return {total: parts.reduce((n, p) => n + p[1], 0), parts};
  }
  const CUR = {'Brezilya': 'BRL', 'Türkiye': 'TRY', 'Azerbaycan': 'AZN', 'Kuzey Makedonya': 'MKD', 'Rusya': 'RUB', 'İspanya': 'EUR', 'İran': 'IRR', 'Suudi Arabistan': 'SAR', 'Türkmenistan': 'TMT', 'Özbekistan': 'UZS', 'Kırgızistan': 'KGS', 'Endonezya': 'IDR'};
  const NOTIFY = [['general', 'Genel', 'Hesap güncellemeleri, güvenlik uyarıları ve genel hatırlatmalar.', true], ['invoices', 'Faturalar', 'Yeni faturalar, ödeme hatırlatmaları ve gecikme bildirimleri.'], ['support', 'Destek', 'Destek taleplerine gelen yanıtlar ve durum değişiklikleri.'], ['services', 'Ürün / Hizmet', 'Başvuru ve hizmet durumu değişiklikleri.'], ['marketing', 'Pazarlama', 'Kampanyalar, duyurular ve bülten.']];
  function profileHTML(a) {
    const e = a.extra || {}, law = a.id.startsWith('law:'), st = e.blocked ? 'blocked' : a.status === 'active' ? 'active' : 'disabled';
    const radio = (n, v, l, on) => `<label class="bmc-radio"><input type="radio" name="${n}" value="${v}" ${on ? 'checked' : ''}> ${l}</label>`;
    const box = (title, ic, inner, cls = '') => `<section class="bmc-pbox ${cls}"><h3>${I(ic)} ${title}</h3><div>${inner}</div></section>`;
    const f = (l, inp, cls = '') => `<label class="${cls}">${l}${inp}</label>`;
    const sw = (k, l, d) => `<label class="bmc-sw"><input type="checkbox" name="x_${k}" ${e[k] ? 'checked' : ''}><i></i><span><b>${l}</b><small>${d}</small></span></label>`;
    const notif = (key, list) => NOTIFY.map(([k, l, d, fixed]) => `<label class="bmc-ck ${fixed ? 'fixed' : ''}"><input type="checkbox" name="${key}" value="${k}" ${fixed || !e[key] || e[key].includes(k) ? 'checked' : ''} ${fixed ? 'disabled' : ''}><span><b>${l}${fixed ? ' <em>Her zaman açık</em>' : ''}</b><small>${d}</small></span></label>`).join('');
    const cur = e.currency || CUR[a.country] || 'TRY';
    return `<form class="bmc-prof" id="bmc-pf"><aside class="bmc-pnav"><a class="on" href="#pf-genel">${I('person')}<span><b>Genel</b><small>Hesap bilgileri ve tercihler</small></span></a><a href="#pf-iletisim">${I('mail')}<span><b>İletişim</b><small>E-posta, telefon, adres</small></span></a><a href="#pf-ozel">${I('shield')}<span><b>Özel ayarlar</b><small>Fatura ve hesap kuralları</small></span></a><a href="#pf-bildirim">${I('send')}<span><b>Bildirimler</b><small>E-posta ve SMS tercihleri</small></span></a></aside>
      <div class="bmc-pmain">
        <div class="bmc-pgrid" id="pf-genel">${box('Hesap Türü', 'badge', radio('kind', 'bireysel', 'Bireysel', e.kind !== 'kurumsal') + radio('kind', 'kurumsal', 'Kurumsal', e.kind === 'kurumsal'))}${box('Hesap Durumu', 'shield', radio('st', 'active', 'Aktif', st === 'active') + radio('st', 'disabled', 'Pasif', st === 'disabled') + radio('st', 'blocked', 'Engellendi', st === 'blocked'))}</div>
        <div class="bmc-pgrid">${box('Kişisel Bilgiler', 'person', f('Ad Soyad *', `<input class="bmc-in" name="name" value="${esc(a.name)}" required>`) + f('Doğum Tarihi (isteğe bağlı)', `<input class="bmc-in" type="date" name="birthDate" value="${esc(e.birthDate || '')}">`) + f('Kimlik / Pasaport Numarası (isteğe bağlı)', `<input class="bmc-in" name="idNumber" value="${esc(e.idNumber || '')}">`))}
          ${box('Firma Bilgileri', 'building', f('Firma Adı', `<input class="bmc-in" name="company" value="${esc(a.company || '')}" ${law ? 'disabled' : ''}>`) + f('Görev / Unvan', `<input class="bmc-in" name="title" value="${esc(a.title || '')}" ${law ? 'disabled' : ''}>`) + `<div class="bmc-two">${f('Vergi Numarası', `<input class="bmc-in" name="taxNumber" value="${esc(e.taxNumber || '')}">`)}${f('Vergi Dairesi (isteğe bağlı)', `<input class="bmc-in" name="taxOffice" value="${esc(e.taxOffice || '')}">`)}</div>`)}</div>
        ${box('İletişim Bilgileri', 'mail', `<div class="bmc-three">${f('E-posta *', `<input class="bmc-in" value="${esc(a.email)}" disabled title="E-posta giriş bilgisidir, değiştirilemez.">`)}${f('Telefon (Mobil)', `<input class="bmc-in" name="phone" value="${esc(a.phone || '')}">`)}${f('Telefon (Sabit, isteğe bağlı)', `<input class="bmc-in" name="landline" value="${esc(e.landline || '')}">`)}</div>${law ? '' : `<div class="bmc-two">${f('Ülke', `<select class="bmc-in" name="country"><option value="">Seçin</option>${Object.keys(D.meta?.countries || {}).map(c => `<option ${a.country === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`)}${f('Şehir', '<select class="bmc-in" name="city"></select>')}</div>`}`, 'wide" id="pf-iletisim')}
        ${box('Tercihler', 'gear' in P ? 'gear' : 'globe', `<div class="bmc-three">${f('Dil', `<select class="bmc-in" name="language">${[['tr', 'Türkçe'], ['pt', 'Português'], ['en', 'English']].map(([v, l]) => `<option value="${v}" ${(e.language || 'tr') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}${f('Para Birimi', `<select class="bmc-in" name="currency">${[...new Set(['TRY', 'BRL', 'USD', 'EUR', ...Object.values(CUR)])].map(c => `<option ${cur === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}${f('Müşteri Grubu', `<select class="bmc-in" name="group"><option value="">Grup yok</option>${D.groups.map(g => `<option value="${esc(g.id)}" ${a.group === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>`)}</div>`, 'wide')}
        ${box('Özel Ayarlar', 'shield', `<div class="bmc-sws">${sw('taxExempt', 'Vergi Muafiyeti', 'Faturalarında vergi uygulanmaz.')}${sw('noSuspend', 'Askıya Alınmasın', 'Ödeme gecikse de hizmetleri otomatik askıya alınmaz.')}${sw('noCancel', 'İptal Edilmesin', 'Ödenmemiş faturalar nedeniyle hizmetleri otomatik iptal edilmez.')}${sw('separateInvoice', 'Ayrı Fatura', 'Her hizmet için ayrı fatura oluşturulur.')}${sw('noLateFee', 'Geç Ödeme Ücreti Uygulama', 'Vadesi geçmiş faturalarına gecikme ücreti eklenmez.')}</div>`, 'wide" id="pf-ozel')}
        <div class="bmc-pgrid" id="pf-bildirim">${box('E-posta Bildirimleri', 'mail', notif('notifyMail'))}${box('SMS Bildirimleri', 'phone', notif('notifySms'))}</div>
        <div class="bmc-pfoot"><span>${I('calendar')}<small>Hesap oluşturma tarihi</small><b>${new Date(a.created).toLocaleString('tr-TR', {dateStyle: 'medium', timeStyle: 'short'})}</b></span><span>${I('key')}<small>Son giriş</small><b>${a.lastLogin ? new Date(a.lastLogin).toLocaleString('tr-TR', {dateStyle: 'medium', timeStyle: 'short'}) : 'Henüz giriş yapmadı'}</b></span><button class="btn primary">Değişiklikleri Kaydet</button></div>
        <p class="bmc-p">Özel ayarlar ve bildirim tercihleri kaydedilir; fatura ve bildirim gönderim akışlarına bağlanması sonraki adımdadır.</p>
      </div></form>`;
  }
  function detailHTML(a) {
    const k = KIND[kindOf(a)], g = groupOf(a), L = legacy(a), s = score(a);
    const unpaid = L.invoices.filter(x => x.status === 'Ödenmedi'), paid = L.invoices.filter(x => x.status === 'Ödendi');
    const sum = xs => xs.reduce((n, x) => n + Number(x.total || x.amount || 0), 0);
    const kd = kindOf(a), isAdv = kd === 'partner' || kd === 'advisor';
    const tabs = [['ozet', 'Özet'], ['profil', 'Profil'],
      ...(kd === 'customer' ? [['dosya', 'Dosyalar'], ['siparis', 'Ürün & Hizmetler'], ['fatura', 'Faturalar']] : []),
      ...(isAdv ? [['musteri', 'Müşterileri'], ['alt', 'Alt Hesaplar'], ['kredi', 'KYC Kredisi'], ...(kd === 'partner' ? [['evrak', 'Doğrulanmış Evraklar']] : []), ['dosya', 'Dosyalar']] : []),
      ...(kd !== 'customer' ? [['izin', 'İzinler']] : []), ['not', 'Notlar'], ['etkinlik', 'Etkinlik Kayıtları']];
    if (!tabs.some(t => t[0] === dTab)) dTab = 'ozet';
    const head = `<div class="bmc-dhead"><div><a class="bmc-back" href="#customers">${I('back')} Müşteri Listesi</a><h1>${k.label} Detayı / ${esc(a.name)} <small>(#${esc(String(a.id).replace('law:', '').slice(0, 6))})</small></h1>
      <div class="bmc-chips">${statusChip(a)}${kindChip(a)}${g ? groupChip(g) : ''}${loginChip(a)}${a.partner ? `<a class="bmc-kind k-par" href="#partnerler">Partner başvurusu: ${esc({approved: 'Onaylı', review: 'İnceleme bekliyor', rejected: 'Düzeltme istendi', docs_required: 'Belge bekleniyor', kyc_pending: 'Kimlik bekleniyor'}[a.partner.status] || a.partner.status)}</a>` : ''}</div></div><div class="bmc-dact"><button class="btn primary" data-act="manage" title="Şifre sormadan bu kişinin paneline girer (yeni sekmede, 2 saat geçerli)">${I('key')} Hesabı yönet</button></div></div>
      <nav class="bmc-tabs">${tabs.map(([id, l]) => `<button data-dtab="${id}" class="${dTab === id ? 'on' : ''}">${l}</button>`).join('')}</nav>`;
    const stat = (i, l, v, sub, badge = '') => `<article class="bmc-stat">${I(i)}<div><small>${l}</small><b>${v}</b><span>${sub}</span></div>${badge ? `<em>${badge}</em>` : ''}</article>`;
    const row = (l, v, i) => `<div class="bmc-kv"><small>${i ? I(i) : ''}${l}</small><span>${v || '—'}</span></div>`;
    let body = '';
    if (dTab === 'ozet') body = `<div class="bmc-stats">${stat('calendar', 'Kayıt tarihi', ago(a.created), day(a.created))}${stat('cart', 'Hizmetler', L.orders.filter(o => ['Aktif', 'İşlemde'].includes(o.status)).length + ' Aktif', L.orders.length + ' toplam sipariş', L.orders.length > 1 ? 'Çoklu hizmet' : '')}${stat('file', 'Ödenen faturalar', money(sum(paid)), paid.length + ' fatura', sum(paid) > 1000 ? 'Altın' : '')}${stat('activity', 'Destek talepleri', L.tickets.length, 'Toplam')}</div>
      <div class="bmc-grid3">
        <section class="panel"><header class="panel-head">${I('person')}<h2>${k.label} Bilgileri</h2><button class="bmc-link" data-act="edit">${I('lock')} ${kindOf(a) === 'customer' ? 'Düzenle / danışman' : 'Düzenle / izinler'}</button></header>
          <div class="bmc-card"><span class="bmc-av lg">${esc(initials(a.name))}</span><div><b>${esc(a.name)}</b><small>${esc(a.company || a.title || k.label)}</small></div></div>
          <div class="bmc-kvs">${row('E-posta', esc(a.email), 'mail')}${row('Telefon', esc(a.phone || ''), 'phone')}${row('Konum', esc([a.country, a.city].filter(Boolean).join(' / ')), 'pin')}${row('Hesap türü', k.label, k.icon)}${row('Kayıt tarihi', day(a.created), 'calendar')}${row('Giriş', esc(a.login), 'key')}${kindOf(a) === 'customer' ? row('Danışman', esc(a.advisorName || 'Merkez ofis'), 'briefcase') : ''}${row('Grup', g ? esc(g.name) + (g.discount ? ` · %${g.discount} indirim` : '') : '', 'users')}</div></section>
        <section class="panel"><header class="panel-head">${I('file')}<h2>Muhasebe</h2></header><div class="bmc-acc"><small>ÖDENMEMİŞ FATURALAR</small><b class="${unpaid.length ? 'red' : ''}">${money(sum(unpaid))}</b><i class="${L.invoices.length ? '' : 'none'}" style="--p:${L.invoices.length ? Math.round(paid.length / L.invoices.length * 100) : 0}%"></i>
          <div class="bmc-acc3"><div><small>ÖDENEN</small><b>${money(sum(paid))}</b><span>×${paid.length}</span></div><div><small>BEKLEYEN</small><b>${money(sum(unpaid))}</b><span>×${unpaid.length}</span></div><div><small>SİPARİŞ</small><b>${L.orders.length}</b><span>toplam</span></div></div></div>
          <div class="bmc-actions"><a class="btn" href="#invoiceNew">${I('plus')} Yeni Fatura</a><button class="btn primary" data-act="manage">${I('key')} Hesabı yönet</button></div></section>
        <section class="panel bmc-score"><header class="panel-head">${I('shield')}<h2>Hesap Puanı</h2></header><div class="bmc-gauge" style="--v:${s.total}"><b>${s.total}</b><small>/ 100</small></div><p class="bmc-glabel">${s.total >= 70 ? 'İyi' : s.total >= 40 ? 'Orta' : 'Eksik'}</p>
          ${s.parts.map(([l, v, m]) => `<div class="bmc-bar"><span>${l}</span><em>${v}/${m}</em><i style="--p:${Math.round(v / m * 100)}%"></i></div>`).join('')}</section>
      </div>
      <div class="bmc-grid2"><section class="panel"><header class="panel-head">${I('gear' in P ? 'gear' : 'shield')}<h2>Hızlı işlemler</h2></header><div class="bmc-quick">
          <button class="btn" data-act="toggle">${I('shield')} ${a.status === 'active' ? 'Hesabı pasif yap' : 'Hesabı aktif yap'}</button>
          <button class="btn" data-act="invite">${I('send')} Giriş / şifre bağlantısı gönder</button>
          <label class="bmc-qsel">${I('users')}<select data-act="group"><option value="">Grup: yok</option>${D.groups.map(x => `<option value="${esc(x.id)}" ${a.group === x.id ? 'selected' : ''}>Grup: ${esc(x.name)}</option>`).join('')}</select></label>
          <a class="btn" href="mailto:${esc(a.email)}">${I('mail')} E-posta yaz</a></div></section>
        <section class="panel"><header class="panel-head">${I('note')}<h2>Son notlar</h2><button class="bmc-link" data-dtab="not">Tümü</button></header><div id="bmc-lastnotes" class="bmc-notes sm"><small class="muted">Yükleniyor…</small></div></section></div>`;
    if (dTab === 'profil') body = profileHTML(a);
    if (dTab === 'musteri') { const cs = D.accounts.filter(x => kindOf(x) === 'customer' && x.advisor === a.id); body = `<section class="panel"><header class="panel-head">${I('users')}<h2>${esc(a.name)} müşterileri (${cs.length})</h2><a class="bmc-link" href="#yeni">${I('plus')} Yeni müşteri</a></header>${cs.length ? `<div class="bmc-table"><table><thead><tr><th>Ad Soyad</th><th>E-posta / Telefon</th><th>Grup</th><th>Ülke / Şehir</th><th>Kayıt</th><th>Giriş</th><th>Durum</th></tr></thead><tbody>${cs.map(c => `<tr data-go="${esc(c.id)}"><td><div class="bmc-who"><span class="bmc-av">${esc(initials(c.name))}</span><b>${esc(c.name)}</b></div></td><td><span class="bmc-ct">${esc(c.email)}</span>${c.phone ? `<small class="bmc-ct">${esc(c.phone)}</small>` : ''}</td><td>${groupChip(groupOf(c))}</td><td>${esc([c.country, c.city].filter(Boolean).join(' / ') || '—')}</td><td>${day(c.created)}</td><td>${loginChip(c)}</td><td>${statusChip(c)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="bmc-empty sm">${I('users')}<b>Bu ${kd === 'partner' ? 'partnere' : 'danışmana'} atanmış müşteri yok.</b><span>Yeni müşteriler konuma göre en yakın danışmana otomatik atanır; müşteri detayındaki “Düzenle / danışman” ile elle de atayabilirsiniz.</span></div>`}</section>`; }
    if (dTab === 'alt') { const subs = D.accounts.filter(x => x.manager === a.id && x.id !== a.id && x.role === 'employee'); body = `<div class="bmc-grid2"><section class="panel"><header class="panel-head">${I('users')}<h2>Alt hesaplar (${subs.length})</h2></header>${subs.length ? `<div class="bmc-notes">${subs.map(x => `<div class="bmc-sub" data-go="${esc(x.id)}"><span class="bmc-av">${esc(initials(x.name))}</span><div><b>${esc(x.name)}</b><small>${esc(x.email)} · ${esc(x.title || KIND[kindOf(x)].label)}</small></div>${loginChip(x)}${statusChip(x)}</div>`).join('')}</div>` : `<div class="bmc-empty sm">${I('users')}<b>Alt hesap yok.</b><span>Partnerin ekibi için (asistan, muhasebe, satış) ayrı giriş hesapları açın. Her alt hesap partnerin müşterilerini, verdiğiniz izinlerle görür.</span></div>`}</section>
      <section class="panel"><header class="panel-head">${I('plus')}<h2>Yeni alt hesap oluştur</h2></header><form class="bmc-form" id="bmc-sub"><label>Ad soyad<input class="bmc-in" name="name" required minlength="2"></label><label>E-posta<input class="bmc-in" name="email" type="email" required></label><label>Telefon<input class="bmc-in" name="phone"></label><label>Görev / unvan<input class="bmc-in" name="title" placeholder="ör. Asistan, Satış"></label><label class="full">Hesap türü<select class="bmc-in" name="type"><option value="other">Ekip üyesi (personel)</option><option value="accountant">Muhasebe</option></select></label><div class="full bmc-actions"><button class="btn primary">${I('plus')} Alt hesabı oluştur</button><small class="muted">Kişiye şifre belirleme bağlantısı gönderilir. İzinleri sonradan alt hesabın detayından değiştirebilirsiniz.</small></div></form></section></div>`; }
    if (dTab === 'kredi') body = `<section class="panel"><header class="panel-head">${I('shield')}<h2>KYC kredisi · bu ay</h2><a class="bmc-link" href="#krediler">Tüm partner kredileri</a></header><div id="bmc-kredi"><div class="loading" style="padding:30px">Yükleniyor…</div></div></section>`;
    if (dTab === 'evrak') body = `<section class="panel"><header class="panel-head">${I('shield')}<h2>Doğrulanmış evraklar</h2><a class="bmc-link" href="#partnerler">Başvuruyu incele</a></header><div id="bmc-evrak" class="bmc-notes"><small class="muted">Yükleniyor…</small></div></section>`;
    if (dTab === 'dosya') body = `<section class="panel"><header class="panel-head">${I('file')}<h2>${isAdv ? 'Partner ve müşterilerinin dosyaları' : 'Müşteri dosyaları'}</h2></header><div id="bmc-files"><div class="loading" style="padding:30px">Yükleniyor…</div></div></section>`;
    if (dTab === 'izin') body = `<section class="panel"><header class="panel-head">${I('lock')}<h2>Panel izinleri</h2><button class="bmc-link" data-act="edit">${I('lock')} İzinleri düzenle</button></header><div class="bmc-perms">${D.meta ? D.meta.perms.map(p => { const v = Number(a.permissions?.[p] || 0); return `<div><span>${esc(D.meta.permLabels[p] || p)}</span><em class="lv${v}">${['Yok', 'Görüntüle', 'Düzenle'][v]}</em></div>`; }).join('') : ''}</div>${a.type === 'lawyer' ? '<p class="bmc-p">Avukat hesapları avukat panelinin tamamına erişir; modül izinleri uygulanmaz.</p>' : ''}</section>`;
    if (dTab === 'siparis') body = `<section class="panel"><header class="panel-head">${I('cart')}<h2>Ürün & Hizmetler</h2><a class="bmc-link" href="#orders">Tüm siparişler</a></header>${L.orders.length ? `<table class="bmc-mini"><thead><tr><th>Hizmet</th><th>Tarih</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>${L.orders.map(o => `<tr><td>${esc(o.product || o.name || o.title || 'Hizmet')}</td><td>${day(o.created)}</td><td>${money(Number(o.total || o.amount || 0))}</td><td>${esc(o.status || '')}</td></tr>`).join('')}</tbody></table>` : `<div class="bmc-empty sm">${I('cart')}<b>Bu hesaba bağlı sipariş yok.</b></div>`}</section>`;
    if (dTab === 'fatura') body = `<section class="panel"><header class="panel-head">${I('file')}<h2>Faturalar</h2><a class="bmc-link" href="#invoiceNew">${I('plus')} Yeni fatura</a></header>${L.invoices.length ? `<table class="bmc-mini"><thead><tr><th>Fatura</th><th>Tarih</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>${L.invoices.map(o => `<tr><td>${esc(o.number || o.id)}</td><td>${day(o.created)}</td><td>${money(Number(o.total || o.amount || 0))}</td><td>${esc(o.status || '')}</td></tr>`).join('')}</tbody></table>` : `<div class="bmc-empty sm">${I('file')}<b>Bu hesaba kesilmiş fatura yok.</b></div>`}</section>`;
    if (dTab === 'not') body = `<section class="panel"><header class="panel-head">${I('note')}<h2>Notlar</h2></header><form id="bmc-nf" class="bmc-nf"><textarea class="bmc-in" name="text" rows="3" placeholder="Bu kişi hakkında yalnızca yönetimin göreceği bir not yazın…" maxlength="2000"></textarea><button class="btn primary">Not ekle</button></form><div id="bmc-notes" class="bmc-notes"><small class="muted">Yükleniyor…</small></div></section>`;
    if (dTab === 'etkinlik') body = `<section class="panel"><header class="panel-head">${I('activity')}<h2>Etkinlik kayıtları</h2></header><div id="bmc-act" class="bmc-notes"><small class="muted">Yükleniyor…</small></div></section>`;
    return head + `<div class="bmc-dbody">${body}</div>`;
  }
  const notesHTML = (ns, del = true) => ns.length ? ns.map(n => `<div class="bmc-note"><p>${esc(n.text)}</p><small>${esc(n.by || '')} · ${new Date(n.at).toLocaleString('tr-TR', {dateStyle: 'short', timeStyle: 'short'})}</small>${del ? `<button data-ndel="${esc(n.id)}" aria-label="Notu sil">${I('trash')}</button>` : ''}</div>`).join('') : '<small class="muted">Henüz not yok.</small>';
  const ACT = {'account.create.customer': 'Müşteri hesabı oluşturuldu', 'account.update': 'Hesap güncellendi', 'account.profile': 'Profil bilgileri güncellendi', 'account.group': 'Grup ataması değişti', 'account.impersonate': 'Yönetici hesaba giriş yaptı (Hesabı yönet)', 'partner.approve': 'Partner başvurusu onaylandı', 'partner.reject': 'Partner başvurusu reddedildi', 'partner.recheck': 'Partner belgeleri yeniden kontrole gönderildi'};
  async function bindDetail(a) {
    const root = $('#bmc-root');
    root.onclick = async e => {
      const t = e.target.closest('[data-dtab]'); if (t) { dTab = t.dataset.dtab; draw(); return; }
      const nd = e.target.closest('[data-ndel]'); if (nd) { const d = await A('accounts/notes', 'POST', {id: a.id, remove: nd.dataset.ndel}); $('#bmc-notes').innerHTML = notesHTML(d.notes); return; }
      const act = e.target.closest('button[data-act]'); if (!act) return;
      try {
        if (act.dataset.act === 'manage') return manage(a.id);
        if (act.dataset.act === 'edit') await window.BMAcc.edit(a.id);
        if (act.dataset.act === 'invite') linkInfo(await A('accounts/invite', 'POST', {id: a.id}));
        if (act.dataset.act === 'toggle') { await A('accounts', 'PATCH', {id: a.id, status: a.status === 'active' ? 'disabled' : 'active'}); await reload(); say('Durum güncellendi.'); }
      } catch (err) { say(err.message); }
    };
    const gs = root.querySelector('select[data-act=group]'); if (gs) gs.onchange = async () => { try { await A('accounts/group', 'POST', {id: a.id, group: gs.value}); await reload(); say('Grup güncellendi.'); } catch (err) { say(err.message); } };
    const pf = $('#bmc-pf');
    if (pf) {
      const cities = () => { if (!pf.country) return; const list = D.meta?.countries?.[pf.country.value] || []; pf.city.innerHTML = '<option value="">Seçin</option>' + list.map(c => `<option ${a.city === c ? 'selected' : ''}>${esc(c)}</option>`).join(''); };
      if (pf.country) { pf.country.onchange = () => { cities(); const c = CUR[pf.country.value]; if (c) pf.currency.value = c; }; cities(); }
      pf.querySelectorAll('.bmc-pnav a').forEach(l => l.onclick = ev => { ev.preventDefault(); pf.querySelectorAll('.bmc-pnav a').forEach(x => x.classList.toggle('on', x === l)); pf.querySelector(l.getAttribute('href'))?.scrollIntoView({behavior: 'smooth', block: 'start'}); });
      pf.onsubmit = async e => {
        e.preventDefault(); const v = n => pf.elements[n]?.value ?? '', ck = n => !!pf.elements['x_' + n]?.checked, list = n => [...pf.querySelectorAll(`[name=${n}]:checked`)].map(x => x.value);
        const st = pf.querySelector('[name=st]:checked')?.value || 'active';
        const extra = {kind: pf.querySelector('[name=kind]:checked')?.value, birthDate: v('birthDate'), idNumber: v('idNumber'), taxNumber: v('taxNumber'), taxOffice: v('taxOffice'), landline: v('landline'), language: v('language'), currency: v('currency'), taxExempt: ck('taxExempt'), noSuspend: ck('noSuspend'), noCancel: ck('noCancel'), separateInvoice: ck('separateInvoice'), noLateFee: ck('noLateFee'), blocked: st === 'blocked', notifyMail: ['general', ...list('notifyMail')], notifySms: ['general', ...list('notifySms')]};
        try {
          await A('accounts/meta', 'POST', {id: a.id, name: v('name'), phone: v('phone'), company: v('company'), title: v('title'), country: v('country'), city: v('city'), status: st === 'active' ? 'active' : 'disabled', extra});
          if (a.id.startsWith('law:')) await A('accounts', 'PATCH', {id: a.id, status: st === 'active' ? 'active' : 'disabled'});
          if ((pf.elements.group.value || '') !== (a.group || '')) await A('accounts/group', 'POST', {id: a.id, group: pf.elements.group.value});
          await reload(); say('Değişiklikler kaydedildi.');
        } catch (err) { say(err.message); }
      };
    }
    root.querySelectorAll('[data-go]').forEach(r => r.onclick = () => { location.hash = '#account/' + encodeURIComponent(r.dataset.go); });
    const sub = $('#bmc-sub');
    if (sub) sub.onsubmit = async e => { e.preventDefault(); const btn = sub.querySelector('button'); btn.disabled = true; try { const d = await A('accounts', 'POST', {type: sub.type.value, name: sub.name.value, email: sub.email.value, phone: sub.phone.value, title: sub.title.value, manager: a.id, permissions: D.meta?.defaults?.[sub.type.value]}); sub.reset(); await load(true); draw(); d.devLink ? linkInfo(d) : say(d.mailSent ? 'Alt hesap oluşturuldu, giriş bağlantısı e-postayla gönderildi.' : 'Alt hesap oluşturuldu.'); } catch (err) { say(err.message); btn.disabled = false; } };
    if ($('#bmc-kredi')) {
      const all = await A('kyc-credits'), c = all.partners.find(p => p.id === a.id), box = $('#bmc-kredi');
      if (!c) box.innerHTML = '<div class="bmc-empty sm"><b>Kredi bilgisi bulunamadı.</b></div>';
      else {
        const reqs = all.requests.filter(r => r.owner === a.id).slice(0, 10);
        box.innerHTML = `<div class="bmc-stats" style="padding:16px;margin:0"><article class="bmc-stat">${I('calendar')}<div><small>Aylık kredi</small><b>${c.monthly}</b><span class="bmc-inl"><input class="bmc-in" type="number" min="0" value="${c.monthly}" id="bmc-km" style="width:80px;height:32px"><button class="btn" id="bmc-kms">Kaydet</button></span></div></article><article class="bmc-stat">${I('plus')}<div><small>Bu ay ek</small><b>${c.extra > 0 ? '+' : ''}${c.extra}</b><span>Talep onayı + manuel</span></div></article><article class="bmc-stat">${I('activity')}<div><small>Kullanılan</small><b>${c.used} / ${c.allowance}</b><span>${bar(c.used, c.allowance)}</span></div></article><article class="bmc-stat">${I('shield')}<div><small>Kalan</small><b class="${c.remaining ? '' : 'bmc-red'}">${c.remaining}</b><span>${dmy(c.resetAt)} yenilenir</span></div></article></div>
          <div class="bmc-actions" style="padding:0 16px 10px"><button class="btn" id="bmc-kadj">± Manuel düzeltme</button></div>
          <div class="bmc-grid2" style="padding:0 16px 16px"><div><b style="font-size:13px">Bu ayın hareketleri</b><div class="bmc-notes sm" style="padding:8px 0">${creditHistory(c.history)}</div></div><div><b style="font-size:13px">Kredi talepleri</b><div class="bmc-notes sm" style="padding:8px 0">${reqs.length ? reqs.map(r => `<div class="bmc-note"><p>${r.amount} kredi · ${r.status === 'pending' ? 'Bekliyor' : r.status === 'approved' ? '+' + r.approved + ' onaylandı' : 'Reddedildi'}</p><small>${esc(r.note || '')} · ${day(r.at)}</small></div>`).join('') : '<small class="muted">Talep yok.</small>'}</div>${reqs.some(r => r.status === 'pending') ? '<a class="btn primary" href="#krediler">Bekleyen talebi yanıtla</a>' : ''}</div></div>`;
        $('#bmc-kms').onclick = async () => { try { await A('kyc-credits/set', 'POST', {partner: a.id, monthly: $('#bmc-km').value}); say('Aylık kredi kaydedildi.'); draw(); } catch (err) { say(err.message); } };
        $('#bmc-kadj').onclick = () => adjustModal(c, () => draw());
      }
    }
    if ($('#bmc-evrak')) {
      const d = await A('partners'); const p = d.partners.find(x => x.id === a.id); const box = $('#bmc-evrak');
      const ST = {approved: ['on', 'Onaylandı'], verified: ['on', 'Doğrulandı'], ok: ['on', 'Uygun'], rejected: ['off', 'Reddedildi'], review: ['wait', 'İnceleniyor'], uploaded: ['wait', 'Yüklendi'], queued: ['wait', 'Sırada'], checking: ['wait', 'Kontrol ediliyor']};
      box.innerHTML = !p ? '<small class="muted">Bu hesap için partner başvurusu bulunamadı.</small>' : `<div class="bmc-docs">${Object.entries(p.docs || {}).map(([k, doc]) => { const l = doc.status || 'Yüklendi', c = /^uygun|onay/i.test(l) || p.status === 'approved' ? 'on' : /^sorun|ret|red/i.test(l) ? 'off' : 'wait'; return `<a class="bmc-doc" href="/api/platform/admin/partners/file/${encodeURIComponent(a.id)}/${encodeURIComponent(k)}" target="_blank" rel="noopener">${I('file')}<span><b>${esc(d.labels?.[k] || k)}</b><small>${esc(doc.name || '')} · ${day(doc.at)}</small></span><em class="bmc-login ${c}">${esc(l)}</em></a>`; }).join('') || '<small class="muted">Henüz evrak yüklenmemiş.</small>'}</div>
        <div class="bmc-kvs" style="margin-top:12px;border-top:1px solid #eef1eb">${[['Firma', p.company], ['Vergi dairesi / no', [p.taxOffice, p.taxNumber].filter(Boolean).join(' · ')], ['Başvuru durumu', {approved: 'Onaylı', review: 'İnceleme bekliyor', rejected: 'Düzeltme istendi: ' + (p.reason || ''), docs_required: 'Belge bekleniyor', kyc_pending: 'Kimlik doğrulaması bekleniyor', queued: 'Kontrol sırasında', checking: 'Kontrol ediliyor'}[p.status] || p.status], ['Kimlik doğrulaması (Didit)', p.kyc ? p.kyc.status : (d.didit ? 'Başlatılmadı' : 'Belge ile')], ['Otomatik kontrol', p.check ? (p.check.decision === 'approve' ? 'Uygun' : 'İnceleme gerekli') + (p.check.summary ? ' — ' + p.check.summary : '') : '—'], ['Hizmetler', (p.services || []).join(', ')]].map(([l, v]) => `<div class="bmc-kv"><small>${l}</small><span>${esc(v || '—')}</span></div>`).join('')}</div>`;
    }
    if ($('#bmc-files')) {
      const d = await A('accounts/files?id=' + encodeURIComponent(a.id)); const isAdv = ['partner', 'advisor'].includes(kindOf(a));
      $('#bmc-files').innerHTML = d.files.length ? `<table class="bmc-mini"><thead><tr><th>Dosya</th>${isAdv ? '<th>Müşteri</th>' : ''}<th>Gönderen</th><th>Tarih</th><th>Durum</th><th></th></tr></thead><tbody>${d.files.map(f => `<tr><td>${I(f.invoice ? 'file' : 'note')} <b>${esc(f.title || f.name || 'Dosya')}</b>${f.invoice ? ' <em class="bmc-login wait">Fatura</em>' : ''}</td>${isAdv ? `<td>${f.owner === a.id ? '<span class="bmc-none">Partnerin kendisi</span>' : esc(f.ownerName)}</td>` : ''}<td>${esc(f.sender || '')}</td><td>${day(f.at)}</td><td>${esc(f.status || '')}</td><td><a class="bmc-link" href="/api/platform/admin/accounts/file?id=${encodeURIComponent(f.id)}" target="_blank" rel="noopener">Görüntüle ↗</a></td></tr>`).join('')}</tbody></table>` : `<div class="bmc-empty sm">${I('file')}<b>Henüz dosya yok.</b><span>${isAdv ? 'Partnerin ve müşterilerinin panelden yüklediği belgeler burada listelenir.' : 'Müşterinin panelden yüklediği belgeler burada listelenir.'}</span></div>`;
    }
    if ($('#bmc-notes') || $('#bmc-lastnotes')) { const d = await A('accounts/notes?id=' + encodeURIComponent(a.id)); if ($('#bmc-notes')) $('#bmc-notes').innerHTML = notesHTML(d.notes); if ($('#bmc-lastnotes')) $('#bmc-lastnotes').innerHTML = notesHTML(d.notes.slice(0, 3), false); }
    const nf = $('#bmc-nf'); if (nf) nf.onsubmit = async e => { e.preventDefault(); try { const d = await A('accounts/notes', 'POST', {id: a.id, text: nf.text.value}); nf.reset(); $('#bmc-notes').innerHTML = notesHTML(d.notes); } catch (err) { say(err.message); } };
    if ($('#bmc-act')) { const d = await A('accounts/activity?id=' + encodeURIComponent(a.id)); $('#bmc-act').innerHTML = d.activity.length ? d.activity.map(x => `<div class="bmc-note"><p>${esc(ACT[x.action] || x.action)}</p><small>${esc(x.actor || '')} · ${new Date(x.at).toLocaleString('tr-TR', {dateStyle: 'short', timeStyle: 'short'})}</small></div>`).join('') : '<small class="muted">Kayıt yok.</small>'; }
    async function reload() { await load(true); draw(); }
    function draw() { const fresh = D.accounts.find(x => x.id === a.id) || a; a = fresh; root.innerHTML = detailHTML(fresh); bindDetail(fresh); }
  }

  // ---------- rotalar ----------
  const EMBED = {yeni: 'Yeni Müşteri Ekle', partnerler: 'Partner Başvuruları', degerlendirmeler: 'Ön Değerlendirmeler', gorusmeler: 'Ön Görüşme Talepleri', moduller: 'Panel Modülleri', meet: 'Google Meet Entegrasyonu'};
  Object.assign(names, EMBED, {customers: 'Müşteri Listesi', account: 'Müşteri Detayı'});
  const routes = {
    account: () => mount(`<div id="bmc-root" class="bmc"><div class="loading">Yükleniyor…</div></div>`, async () => {
      await load(); const id = decodeURIComponent(location.hash.split('/').slice(1).join('/'));
      const a = D.accounts.find(x => x.id === id); const root = $('#bmc-root');
      if (!a) { root.innerHTML = `<div class="bmc-empty">${I('person')}<b>Hesap bulunamadı.</b><a href="#customers">Müşteri listesine dön</a></div>`; return; }
      dTab = 'ozet'; root.innerHTML = detailHTML(a); bindDetail(a);
    }),
    hesaplar: () => { setTimeout(() => location.replace('#customers'), 0); return ''; },
  };
  for (const [k, t] of Object.entries(EMBED)) routes[k] = () => mount(`<div class="bm-embed">${heading(t)}<div id="note" class="bm-note"></div><section id="view"><div class="loading">Yükleniyor…</div></section></div>`, () => window.BMAcc.route());

  // ---------- E-POSTA (SMTP) AYARLARI ----------
  const field = (l, inp, hint = '', cls = '') => `<label class="${cls}">${l}${inp}${hint ? `<small class="muted">${hint}</small>` : ''}</label>`;
  routes.eposta = () => mount(`<div class="bmc" id="bmc-root">${heading('E-posta (SMTP) Ayarları')}<div class="loading">Yükleniyor…</div></div>`, async () => {
    const d = await A('settings/mail'), m = d.mail, root = $('#bmc-root');
    const st = d.provider === 'smtp' ? ['on', 'SMTP ile gönderiliyor'] : d.provider === 'resend' ? ['on', 'Resend ile gönderiliyor'] : ['wait', 'Test modu — e-posta gönderilmiyor'];
    root.innerHTML = heading('E-posta (SMTP) Ayarları') + `<div class="bmc-grid2 bmc-set"><section class="panel"><header class="panel-head">${I('mail')}<h2>Gönderim hesabı</h2><span class="bmc-login ${st[0]}">${st[1]}</span></header>
      <form class="bmc-form" id="bmc-mail">
        ${field('Gönderen adı', `<input class="bmc-in" name="fromName" value="${esc(m.fromName)}">`, 'Alıcının gelen kutusunda görünen ad.')}
        ${field('Gönderen e-posta adresi', `<input class="bmc-in" name="fromEmail" type="email" value="${esc(m.fromEmail)}" placeholder="bilgi@brazilmigration.com" required>`, 'Tüm bildirimler bu adresten gider.')}
        ${field('SMTP sunucusu', `<input class="bmc-in" name="host" value="${esc(m.host)}" required>`, 'Hostinger: smtp.hostinger.com')}
        <div class="bmc-two">${field('Port', `<input class="bmc-in" name="port" type="number" value="${esc(m.port)}">`)}${field('Güvenlik', `<select class="bmc-in" name="secure"><option value="ssl" ${m.secure ? 'selected' : ''}>SSL/TLS (465)</option><option value="starttls" ${!m.secure ? 'selected' : ''}>STARTTLS (587)</option></select>`)}</div>
        ${field('Kullanıcı adı', `<input class="bmc-in" name="user" value="${esc(m.user)}" placeholder="bilgi@brazilmigration.com" autocomplete="off">`, 'Genellikle e-posta adresinin kendisi.')}
        ${field('Şifre', `<input class="bmc-in" name="pass" type="password" value="${esc(m.pass)}" placeholder="E-posta hesabının şifresi" autocomplete="new-password">`, m.pass ? 'Kayıtlı. Değiştirmek için yenisini yazın.' : 'Hostinger’da bu e-posta hesabını oluştururken belirlediğiniz şifre.')}
        ${field('Yanıt adresi (isteğe bağlı)', `<input class="bmc-in" name="replyTo" type="email" value="${esc(m.replyTo)}" placeholder="bilgi@brazilmigration.com">`, 'Müşteri “Yanıtla”ya bastığında gideceği adres.', 'full')}
        <label class="bmc-cb full"><input type="checkbox" name="active" ${m.active ? 'checked' : ''}> SMTP gönderimini kullan</label>
        <div class="full bmc-actions"><button class="btn primary">${I('check')} Kaydet</button><button type="button" class="btn" id="bmc-hostinger">Hostinger varsayılanlarını doldur</button></div></form></section>
      <section class="panel"><header class="panel-head">${I('send')}<h2>Test e-postası</h2></header><form class="bmc-form" id="bmc-mtest" style="grid-template-columns:1fr auto;align-items:end"><label>Alıcı<input class="bmc-in" name="to" type="email" required placeholder="admin@brazilmigration.com"></label><button class="btn primary" style="height:40px">Test gönder</button></form>
        <div class="bmc-notes"><div class="bmc-note"><p><b>Hostinger için ayarlar</b></p><small>Sunucu <b>smtp.hostinger.com</b> · Port <b>465</b> (SSL/TLS) veya <b>587</b> (STARTTLS) · Kullanıcı adı: tam e-posta adresi · Şifre: Hostinger → E-postalar bölümünde bu hesap için belirlediğiniz şifre.</small></div>
        <div class="bmc-note"><p><b>Hangi e-postalar gider?</b></p><small>E-posta doğrulama, şifre sıfırlama ve davet bağlantıları, ön görüşme (Google Meet) bilgileri, ön değerlendirme yol haritası ve sistem bildirimleri.</small></div>
        <div class="bmc-note"><p><b>Teslim edilebilirlik</b></p><small>E-postaların spam’e düşmemesi için Hostinger’da alan adınızın SPF, DKIM ve DMARC kayıtlarının etkin olduğundan emin olun (Hostinger → E-postalar → Bağlantı / DNS ayarları).</small></div></div></section></div>`;
    const f = $('#bmc-mail');
    f.secure.onchange = () => { f.port.value = f.secure.value === 'ssl' ? 465 : 587; };
    $('#bmc-hostinger').onclick = () => { f.host.value = 'smtp.hostinger.com'; f.port.value = 465; f.secure.value = 'ssl'; if (!f.fromEmail.value) f.fromEmail.value = 'bilgi@brazilmigration.com'; if (!f.user.value) f.user.value = f.fromEmail.value; if (!f.replyTo.value) f.replyTo.value = f.fromEmail.value; f.active.checked = true; };
    f.fromEmail.oninput = () => { if (!f.user.dataset.touched) f.user.value = f.fromEmail.value; };
    f.user.oninput = () => { f.user.dataset.touched = 1; };
    f.onsubmit = async e => { e.preventDefault(); try { const r = await A('settings/mail', 'POST', {fromName: f.fromName.value, fromEmail: f.fromEmail.value, host: f.host.value, port: f.port.value, secure: f.secure.value === 'ssl', user: f.user.value, pass: f.pass.value, replyTo: f.replyTo.value, active: f.active.checked}); say(r.configured ? 'Kaydedildi. Şimdi test e-postası gönderin.' : 'Kaydedildi.'); render(); } catch (err) { say(err.message); } };
    const t = $('#bmc-mtest');
    t.onsubmit = async e => { e.preventDefault(); const b = t.querySelector('button'); b.disabled = true; b.textContent = 'Gönderiliyor…'; try { await A('settings/mail/test', 'POST', {to: t.to.value}); say('Test e-postası gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.'); } catch (err) { modal('Test e-postası gönderilemedi', `<p class="bmc-p">${esc(err.message)}</p>`); } finally { b.disabled = false; b.textContent = 'Test gönder'; } };
  });

  // ---------- KİMLİK DOĞRULAMA (DIDIT) ----------
  routes.kimlik = () => mount(`<div class="bmc" id="bmc-root">${heading('Kimlik Doğrulama (Didit API)')}<div class="loading">Yükleniyor…</div></div>`, async () => {
    const [d, ai] = await Promise.all([A('settings/didit'), A('settings/ai')]), k = d.didit, root = $('#bmc-root');
    root.innerHTML = heading('Kimlik Doğrulama (Didit API)') + `<div class="bmc-grid2 bmc-set"><section class="panel"><header class="panel-head">${I('shield')}<h2>Didit bağlantısı</h2><span class="bmc-login ${d.ready ? 'on' : 'wait'}">${d.ready ? 'Etkin' : 'Kapalı'}</span></header>
      <form class="bmc-form" id="bmc-didit">
        <label class="bmc-sw full"><input type="checkbox" name="enabled" ${k.enabled ? 'checked' : ''}><i></i><span><b>Didit kimlik doğrulamasını kullan</b><small>Açıkken partnerler kimlik kartı yerine Didit ile canlı kimlik doğrulaması yapar; yalnızca Vergi Levhası ve İmza Sirküsü yükler.</small></span></label>
        ${field('API anahtarı', `<input class="bmc-in" name="apiKey" type="password" value="${esc(k.apiKey)}" placeholder="Didit → API Keys" autocomplete="new-password">`, k.apiKey ? 'Kayıtlı. Değiştirmek için yenisini yazın.' : '', 'full')}
        ${field('Workflow ID', `<input class="bmc-in" name="workflowId" value="${esc(k.workflowId)}" placeholder="Didit → Workflows → ID">`)}
        ${field('Aylık doğrulama sınırı', `<input class="bmc-in" name="limit" type="number" min="1" value="${esc(k.limit)}">`, 'Didit ücretsiz kotası: kimlik, canlılık ve yüz eşleştirme için ayda 500.')}
        <div class="full bmc-actions"><button class="btn primary">${I('check')} Kaydet</button></div></form>
        <header class="panel-head" style="border-top:1px solid var(--line)">${I('file')}<h2>Otomatik belge kontrolü (yapay zekâ)</h2><span class="bmc-login ${ai.ready ? 'on' : 'wait'}">${ai.ready ? 'Etkin' : 'Kapalı'}</span></header>
        <form class="bmc-form" id="bmc-ai"><p class="bmc-p full" style="margin:0">Partnerin yüklediği <b>Vergi Levhası, İmza Sirküsü</b> ve kimlik belgeleri yüklendiği anda okunur: belge türü, firma unvanı, vergi numarası ve vergi dairesinin başvuru formuyla eşleşmesi, tarih ve okunabilirlik kontrol edilir. Hepsi uygunsa (ve Didit açıksa kimlik de onaylıysa) partner otomatik onaylanır; şüpheli durumda size “İnceleme bekliyor” olarak düşer. Müşteri belgeleri de satın alma sonrası aynı şekilde ön kontrolden geçer.</p>
          ${field('Anthropic API anahtarı', `<input class="bmc-in" name="apiKey" type="password" value="${esc(ai.ai.apiKey)}" placeholder="sk-ant-…" autocomplete="new-password">`, ai.ai.apiKey ? 'Kayıtlı. Değiştirmek için yenisini yazın.' : 'console.anthropic.com → API Keys bölümünden alın.', 'full')}
          ${field('Otomatik onay için en düşük güven', `<select class="bmc-in" name="minConfidence">${[[0.75, '%75 (daha esnek)'], [0.85, '%85 (önerilen)'], [0.95, '%95 (çok sıkı)']].map(([v, l]) => `<option value="${v}" ${Math.abs(ai.ai.minConfidence - v) < 0.001 ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
          <div class="full bmc-actions"><button class="btn primary">${I('check')} Kaydet</button>${ai.ai.apiKey ? '<button type="button" class="btn" id="bmc-ai-off">Kapat</button>' : ''}</div></form></section>
      <section class="panel"><header class="panel-head">${I('note')}<h2>Kurulum adımları</h2></header><div class="bmc-notes">
        <div class="bmc-note"><p><b>1. Hesap</b></p><small>business.didit.me adresinde iş e-postanızla hesap açın.</small></div>
        <div class="bmc-note"><p><b>2. Workflow</b></p><small>Workflows bölümünde “KYC” (kimlik belgesi + canlılık) akışı oluşturun ve Workflow ID’sini kopyalayın.</small></div>
        <div class="bmc-note"><p><b>3. API anahtarı</b></p><small>API &amp; Webhooks bölümünden API anahtarı oluşturun ve bu sayfaya yapıştırın.</small></div>
        <div class="bmc-note"><p><b>Dönüş adresi</b></p><small>Kişi Didit ekranında selfie ve belge fotoğrafını çektikten sonra sitemize bu adresle geri döner: <b>${esc(d.callback)}</b> (müşteriler /kyc/ sayfasına döner). Sonuç arka planda sorgulanır.</small></div>
        <div class="bmc-note"><p><b>Belge taraması</b></p><small>Didit kimliği (selfie + belge) doğrular; vergi levhası ve imza sirküsü kontrolünü soldaki “Otomatik belge kontrolü” yapar. Müşteriler kimliklerini kendi panellerindeki “Kimlik doğrulama” kartından doğrular.</small></div></div></section></div>`;
    const af = $('#bmc-ai');
    af.onsubmit = async e => { e.preventDefault(); try { const r = await A('settings/ai', 'POST', {apiKey: af.apiKey.value, minConfidence: af.minConfidence.value}); say(r.ready ? 'Otomatik belge kontrolü etkin.' : 'Kaydedildi.'); render(); } catch (err) { say(err.message); } };
    const off = $('#bmc-ai-off'); if (off) off.onclick = async () => { try { await A('settings/ai', 'POST', {remove: true}); say('Otomatik belge kontrolü kapatıldı.'); render(); } catch (err) { say(err.message); } };
    const f = $('#bmc-didit');
    f.onsubmit = async e => { e.preventDefault(); try { const r = await A('settings/didit', 'POST', {enabled: f.enabled.checked, apiKey: f.apiKey.value, workflowId: f.workflowId.value, limit: f.limit.value}); say(r.ready ? 'Didit etkinleştirildi.' : 'Kaydedildi.'); render(); } catch (err) { say(err.message); } };
  });
  Object.assign(names, {eposta: 'E-posta (SMTP) Ayarları', kimlik: 'Kimlik Doğrulama (Didit API)'});
  // ---------- KYC KREDİLERİ ----------
  const dmy = t => new Date(t).toLocaleDateString('tr-TR', {day: 'numeric', month: 'long'});
  const bar = (used, all) => `<span class="bmc-cbar"><i style="width:${all ? Math.min(100, Math.round(used / all * 100)) : 100}%" class="${!all || used >= all ? 'full' : used / all >= .8 ? 'warn' : ''}"></i></span>`;
  function creditHistory(h) { return h.length ? h.map(x => `<div class="bmc-note"><p>${x.n > 0 ? '+' : ''}${x.n} kredi · ${esc(x.note || '')}</p><small>${esc(x.type === 'extra' ? 'Talep onayı' : 'Manuel düzeltme')} · ${esc(x.by || '')} · ${new Date(x.at).toLocaleString('tr-TR', {dateStyle: 'short', timeStyle: 'short'})}</small></div>`).join('') : '<small class="muted">Bu ay ek kredi veya düzeltme yok.</small>'; }
  function adjustModal(p, after) {
    modal('Manuel kredi düzeltmesi · ' + p.name, `<form class="bmc-form" id="bmc-adj" style="padding:0"><p class="bmc-p full" style="margin:0">Bu ay için krediyi artırın (ör. <b>5</b>) veya azaltın (ör. <b>-2</b>). Reddedilen ya da yarım kalan bir doğrulamanın kredisini geri vermek için +1 yazabilirsiniz. Düzeltme ay sonunda sıfırlanır.</p>
      <label>Miktar<input class="bmc-in" name="n" type="number" required placeholder="5 veya -2"></label><label>Not<input class="bmc-in" name="note" placeholder="ör. Reddedilen doğrulama iadesi"></label>
      <div class="full bmc-actions" style="padding:0"><button class="btn primary">${I('check')} Uygula</button><span class="muted" style="font-size:12px">Şu an: ${p.used} / ${p.allowance} kullanıldı</span></div></form>`);
    $('#bmc-adj').onsubmit = async e => { e.preventDefault(); const f = e.target; try { await A('kyc-credits/adjust', 'POST', {partner: p.id, n: f.n.value, note: f.note.value}); $('#modal').close(); say('Kredi güncellendi.'); after(); } catch (err) { say(err.message); } };
  }
  routes.krediler = () => mount(`<div class="bmc" id="bmc-root">${heading('KYC Kredileri')}<div class="loading">Yükleniyor…</div></div>`, async () => {
    const d = await A('kyc-credits'), root = $('#bmc-root'), pend = d.requests.filter(r => r.status === 'pending'), done = d.requests.filter(r => r.status !== 'pending').slice(0, 20);
    const reset = d.partners[0]?.resetAt || Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1);
    root.innerHTML = heading('KYC Kredileri') + `<div class="bmc-stats">
        <article class="bmc-stat">${I('shield')}<div><small>Didit havuzu · bu ay</small><b>${d.pool.used} / ${d.pool.limit}</b><span>${bar(d.pool.used, d.pool.limit)}</span></div></article>
        <article class="bmc-stat">${I('handshake')}<div><small>Partnerlere tanımlı</small><b>${d.pool.distributed} kredi</b><span>${d.partners.length} partner / danışman</span></div>${d.pool.distributed > d.pool.limit ? '<em>Havuzu aşıyor</em>' : ''}</article>
        <article class="bmc-stat">${I('send')}<div><small>Bekleyen talep</small><b>${pend.length}</b><span>Onay bekleyen kredi istekleri</span></div></article>
        <article class="bmc-stat">${I('calendar')}<div><small>Yenilenme</small><b>${dmy(reset)}</b><span>Aylık krediler her ayın 1’inde sıfırlanır</span></div></article></div>
      ${d.pool.distributed > d.pool.limit ? `<div class="bmc-callout">${I('shield')}<div><b>Dağıtılan kredi havuzu aşıyor</b><span>Partnerlere toplam ${d.pool.distributed} kredi tanımlı, Didit aylık sınırı ${d.pool.limit}. Sınır dolunca yeni doğrulama başlatılamaz. Sınırı Ayarlar → Kimlik Doğrulama’dan güncelleyebilirsiniz.</span></div><a class="btn" href="#kimlik">Sınırı düzenle</a></div>` : ''}
      <section class="panel" style="margin-bottom:16px"><header class="panel-head">${I('send')}<h2>Bekleyen kredi talepleri</h2></header>${pend.length ? `<div class="bmc-table"><table><thead><tr><th>Partner</th><th>İstenen</th><th>Not</th><th>Tarih</th><th>Bu ay durum</th><th>Onaylanacak</th><th></th></tr></thead><tbody>${pend.map(r => { const p = d.partners.find(x => x.id === r.owner) || {used: 0, allowance: 0}; return `<tr><td><b>${esc(r.name)}</b><small class="bmc-ct">${esc(r.by && r.by !== r.name ? 'Talep eden: ' + r.by : r.email || '')}</small></td><td><b>${r.amount}</b> kredi</td><td>${esc(r.note || '—')}</td><td>${day(r.at)}</td><td>${p.used} / ${p.allowance}</td><td><input class="bmc-in" type="number" min="1" value="${r.amount}" data-amt="${esc(r.id)}" style="width:90px"></td><td style="white-space:nowrap"><button class="btn primary" data-req="${esc(r.id)}" data-dec="approve">${I('check')} Onayla</button> <button class="btn" data-req="${esc(r.id)}" data-dec="reject">Reddet</button></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="bmc-empty sm">${I('check')}<b>Bekleyen talep yok.</b><span>Partnerler kredileri bitince panellerinden “Kredi iste” ile talep gönderir; burada ve bildirimlerde görünür.</span></div>`}</section>
      <section class="panel" style="margin-bottom:16px"><header class="panel-head">${I('handshake')}<h2>Partner kredileri · ${esc(new Date().toLocaleDateString('tr-TR', {month: 'long', year: 'numeric'}))}</h2><small class="muted">Yeni partnerlere otomatik ${d.defaultMonthly} kredi / ay</small></header>${d.partners.length ? `<div class="bmc-table"><table><thead><tr><th>Partner / danışman</th><th>Aylık kredi</th><th>Bu ay ek</th><th>Kullanılan</th><th>Kalan</th><th></th></tr></thead><tbody>${d.partners.map(p => `<tr><td><a class="bmc-who" href="#account/${encodeURIComponent(p.id)}" style="text-decoration:none;color:inherit"><span class="bmc-av">${esc(initials(p.name))}</span><span><b>${esc(p.name)}</b><small>${esc(p.email)}${p.partner && p.partner !== 'approved' ? ' · onay bekliyor' : ''}</small></span></a></td>
          <td><span class="bmc-inl"><input class="bmc-in" type="number" min="0" value="${p.monthly}" data-mon="${esc(p.id)}" style="width:80px"><button class="btn" data-setmon="${esc(p.id)}">Kaydet</button></span></td>
          <td>${p.extra > 0 ? '+' : ''}${p.extra}</td><td>${p.used} / ${p.allowance} ${bar(p.used, p.allowance)}</td><td><b class="${p.remaining ? '' : 'bmc-red'}">${p.remaining}</b></td>
          <td style="white-space:nowrap"><button class="btn" data-adj="${esc(p.id)}">± Manuel düzeltme</button> <button class="btn ghost" data-hist="${esc(p.id)}" title="Bu ayın hareketleri">${I('activity')}</button></td></tr><tr class="bmc-histrow" data-histrow="${esc(p.id)}" hidden><td colspan="6"><div class="bmc-notes sm">${creditHistory(p.history)}</div></td></tr>`).join('')}</tbody></table></div>` : `<div class="bmc-empty sm">${I('handshake')}<b>Henüz partner yok.</b></div>`}</section>
      ${done.length ? `<section class="panel"><header class="panel-head">${I('activity')}<h2>Son yanıtlanan talepler</h2></header><table class="bmc-mini"><thead><tr><th>Partner</th><th>İstenen</th><th>Sonuç</th><th>Not</th><th>Tarih</th></tr></thead><tbody>${done.map(r => `<tr><td>${esc(r.name)}</td><td>${r.amount}</td><td>${r.status === 'approved' ? `<span class="bmc-login on">+${r.approved} onaylandı</span>` : '<span class="bmc-login off">Reddedildi</span>'}</td><td>${esc(r.reply || r.note || '')}</td><td>${day(r.decidedAt || r.updated)}</td></tr>`).join('')}</tbody></table></section>` : ''}`;
    root.onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      try {
        if (t.dataset.req) {
          const dec = t.dataset.dec; let note = '';
          if (dec === 'reject') { note = prompt('Ret gerekçesi (partnere iletilir):', '') ?? null; if (note === null) return; }
          await A('kyc-credits/request', 'POST', {id: t.dataset.req, decision: dec, amount: root.querySelector(`[data-amt="${t.dataset.req}"]`)?.value, note});
          say(dec === 'approve' ? 'Kredi tanımlandı, partnere bildirildi.' : 'Talep reddedildi.'); render();
        }
        if (t.dataset.setmon) { await A('kyc-credits/set', 'POST', {partner: t.dataset.setmon, monthly: root.querySelector(`[data-mon="${t.dataset.setmon}"]`).value}); say('Aylık kredi kaydedildi.'); render(); }
        if (t.dataset.adj) adjustModal(d.partners.find(p => p.id === t.dataset.adj), () => render());
        if (t.dataset.hist) { const r = root.querySelector(`[data-histrow="${t.dataset.hist}"]`); r.hidden = !r.hidden; }
      } catch (err) { say(err.message); }
    };
  });
  Object.assign(names, {krediler: 'KYC Kredileri'});
  setTimeout(() => A('kyc-credits').then(d => { const n = d.requests.filter(r => r.status === 'pending').length; if (!n) return; const a = document.querySelector('#navigation a[href="#krediler"]'); if (a) a.insertAdjacentHTML('beforeend', ` <span class="bmc-count">${n}</span>`); }).catch(() => {}), 900);


  // ---------- YÖNETİCİ PROFİLİ ----------
  document.addEventListener('click', async e => {
    const t = e.target.closest('[data-action=profile]'); if (!t) return;
    e.preventDefault(); e.stopImmediatePropagation();
    let p; try { p = (await A('profile')).profile; } catch (err) { return say(err.message); }
    modal('Yönetici Profili', `<form class="bmc-form" id="bmc-prof" style="padding:0">
      <div class="full bmc-card" style="padding:0 0 14px;border:0"><span class="bmc-av lg">${esc(initials(p.name))}</span><div><b>${esc(p.name)}</b><small>${esc(p.email)} · Site yöneticisi</small></div></div>
      ${field('Ad soyad', `<input class="bmc-in" name="name" value="${esc(p.name)}" required>`)}
      ${field('Giriş e-postası', `<input class="bmc-in" name="email" type="email" value="${esc(p.email)}" required>`, 'Yönetim paneline bu adresle girersiniz.')}
      <div class="full" style="border-top:1px solid var(--line);padding-top:14px"><b style="font-size:13px">Şifre değiştir</b><small class="muted" style="display:block;margin-top:2px">E-posta veya şifre değiştirmek için mevcut şifrenizi girin. Değiştirmeyecekseniz yeni şifre alanlarını boş bırakın.</small></div>
      ${field('Mevcut şifre', '<input class="bmc-in" name="currentPassword" type="password" autocomplete="current-password">', '', 'full')}
      ${field('Yeni şifre (en az 12 karakter)', '<input class="bmc-in" name="newPassword" type="password" minlength="12" autocomplete="new-password">')}
      ${field('Yeni şifre (tekrar)', '<input class="bmc-in" name="newPassword2" type="password" minlength="12" autocomplete="new-password">')}
      <div class="full bmc-actions" style="padding:6px 0 0"><button class="btn primary">${I('check')} Kaydet</button><a class="btn" href="#eposta">${I('mail')} E-posta ayarları</a><a class="btn" href="#security">${I('shield')} Güvenlik ayarları</a></div></form>`);
    const f = $('#bmc-prof');
    f.querySelectorAll('a.btn').forEach(a => a.onclick = () => $('#modal').close());
    f.onsubmit = async ev => {
      ev.preventDefault();
      if (f.newPassword.value !== f.newPassword2.value) return say('Yeni şifreler eşleşmiyor.');
      try {
        const r = await A('profile', 'POST', {name: f.name.value, email: f.email.value, currentPassword: f.currentPassword.value, newPassword: f.newPassword.value || undefined});
        $('#modal').close(); say(r.email !== p.email ? 'Kaydedildi. Bundan sonra ' + r.email + ' ile giriş yapın.' : 'Profil kaydedildi.');
        const nm = document.getElementById('user-name'); if (nm) nm.textContent = r.name; const av = document.getElementById('user-avatar'); if (av) av.textContent = initials(r.name);
      } catch (err) { say(err.message); }
    };
  }, true);

  // Genel Ayarlar sayfasında e-posta ayarlarına kısayol
  if (typeof general === 'function') { const _general = general; general = function () { const h = _general(); const i = h.indexOf('</div>'); const card = `<div class="bmc-callout">${I('mail')}<div><b>E-posta gönderimi</b><span>Bildirim, doğrulama ve şifre e-postalarının hangi adresten gideceğini SMTP ayarlarından belirleyin.</span></div><a class="btn primary" href="#eposta">E-posta (SMTP) Ayarları</a></div>`; return i > 0 ? h.slice(0, i + 6) + card + h.slice(i + 6) : card + h; }; }

  const _listPage = listPage;
  listPage = function (type) {
    if (type !== 'customer') return _listPage(type);
    return mount(`<div class="customer-area bmc" id="bmc-root">${heading('Müşteri Listesi')}<div class="loading">Hesaplar yükleniyor…</div></div>`, async () => {
      await load(); const root = $('#bmc-root'); if (!root) return;
      root.innerHTML = heading('Müşteri Listesi') + listHTML(); bindList(); bulk();
      if (D.partners === null && window.BMAcc) window.BMAcc.pendingPartners().then(n => { D.partners = n; const b = root.querySelector('a[href="#partnerler"]'); if (b) b.textContent = n; }).catch(() => {});
    });
  };
  const _overview = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _overview(); };
  document.addEventListener('bm-acc-saved', async () => { await load(true); if (['customers', 'account'].includes(route())) render(); say('Hesap güncellendi.'); });
  // Kayıtlı oturumla ilk açılışta yeni rotalar için sayfayı yeniden çiz (eski render ilk yüklemede overview'ı seçebilir)
  if (routes[route()]) setTimeout(() => { if (!document.querySelector('#bmc-root,.bm-embed')) render(); }, 600);
  // Partner başvuru sayısı menüde
  setTimeout(() => window.BMAcc?.pendingPartners().then(n => { D.partners = n; if (!n) return; const a = document.querySelector('#navigation a[href="#partnerler"]'); if (a) a.insertAdjacentHTML('beforeend', ` <span class="bmc-count">${n}</span>`); }).catch(() => {}), 800);
})();
