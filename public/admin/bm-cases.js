'use strict';
// Dosya yönetimi (Faz 2): Dosya Panosu · Görev Panosu · Süreler · Şablonlar. Arka uç: /api/platform/admin/cases/*
(() => {
  const A = async (path, method = 'GET', body) => {
    const r = await fetch('/api/platform/admin/' + path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, cache: 'no-store'}).catch(() => { throw new Error('Sunucuya ulaşılamadı.'); });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) { location.href = '/admin/giris/?next=' + encodeURIComponent('/admin/' + location.hash); throw new Error('Giriş gerekli'); }
    if (!r.ok) throw new Error(d.error || 'İşlem tamamlanamadı.');
    return d;
  };
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const fd = d => (d ? d.split('-').reverse().join('.') : '');
  const wrap = (title, sub) => '<div class="bcs">' + heading(title) + (sub ? '<p class="bcs-sub">' + sub + '</p>' : '') + '<div id="bcs-root"><div class="loading">Yükleniyor…</div></div></div>';
  const run = fn => setTimeout(async () => { try { await fn($('#bcs-root')); } catch (e) { const r = $('#bcs-root'); if (r && e.message !== 'Giriş gerekli') r.innerHTML = '<div class="bmc-err">' + esc(e.message) + '</div>'; } }, 0);
  const modal = (title, html) => { $('#modal-title').textContent = title; $('#modal-body').innerHTML = html; if (!$('#modal').open) $('#modal').showModal(); };
  const closeModal = () => $('#modal').open && $('#modal').close();
  const opt = (v, l, sel) => '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(l) + '</option>';
  const dChip = n => '<span class="bcs-chip ' + (n < 0 ? 'bad' : n <= 14 ? 'warn' : 'ok') + '">' + (n < 0 ? Math.abs(n) + ' gün geçti' : n === 0 ? 'bugün' : n + ' gün') + '</span>';
  const ST = {bekleniyor: 'Bekleniyor', yuklendi: 'Yüklendi', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi', gerekmiyor: 'Gerekmiyor'};

  // ---------------- Dosya Panosu ----------------
  let BD = null, SEL = '', CUR = '';
  const boardPage = () => { run(async root => { BD = await A('cases/board'); if (!SEL || !BD.templates.some(t => t.id === SEL)) SEL = (BD.templates.find(t => BD.cases.some(c => c.templateId === t.id)) || BD.templates[0] || {}).id || ''; drawBoard(root); }); return wrap('Dosya Panosu', 'Müşteri dosyalarını aşamalara göre izleyin; kartı sürükleyin veya oklarla taşıyın. Aşama değişince müşterinin yol haritası ve bildirimleri otomatik güncellenir.'); };
  const unassignedHTML = () => {
    if (!BD.unassigned.length) return '';
    const rows = BD.unassigned.map(u => {
      const pick = BD.templates.find(t => t.service === u.service) || BD.templates[0];
      return '<li><div><b>' + esc(u.customer) + '</b> <small>' + esc(u.service) + ' · ' + esc(u.status || '') + '</small></div><div class="bcs-inl"><select data-cs-pick="' + u.applicationId + '">' + BD.templates.map(t => opt(t.id, t.name, pick && t.id === pick.id)).join('') + '</select><button class="btn small" data-cs-assign="' + u.applicationId + '">Ata</button></div></li>';
    }).join('');
    return '<section class="panel bcs-p"><header class="panel-head"><h2>Şablon atanmamış başvurular (' + BD.unassigned.length + ')</h2><button class="btn small" data-cs-auto>Hizmete göre hepsine ata</button></header><ul class="bcs-ul">' + rows + '</ul></section>';
  };
  const cardHTML = c => {
    const chips = ['<span class="bcs-chip">Belge ' + c.progress.have + '/' + c.progress.total + '</span>'];
    if (c.next) chips.push(dChip(c.next.days));
    if (c.tasks) chips.push('<span class="bcs-chip">Görev ' + c.tasks + '</span>');
    return '<article class="bcs-card" draggable="true" data-cs-open="' + c.applicationId + '"><b>' + esc(c.customer) + '</b><small>' + esc(c.service) + '</small><div class="bcs-chips">' + chips.join('') + '</div><div class="bcs-mv"><button type="button" data-cs-mv="-1" data-app="' + c.applicationId + '" aria-label="Önceki aşama">←</button><button type="button" data-cs-mv="1" data-app="' + c.applicationId + '" aria-label="Sonraki aşama">→</button></div></article>';
  };
  function drawBoard(root) {
    root = root || $('#bcs-root'); if (!root) return;
    const t = BD.templates.find(x => x.id === SEL), cases = BD.cases.filter(c => c.templateId === SEL);
    const cols = t ? t.stages.map((name, i) => '<div class="bcs-col" data-cs-col="' + i + '"><h3>' + esc(name) + ' <span>' + cases.filter(c => c.stage === i).length + '</span></h3>' + (cases.filter(c => c.stage === i).map(cardHTML).join('') || '<p class="bcs-empty">—</p>') + '</div>').join('') : '';
    root.innerHTML = unassignedHTML() +
      '<div class="bcs-bar"><label>Şablon <select data-cs-tplsel>' + BD.templates.map(x => opt(x.id, x.name + ' (' + BD.cases.filter(c => c.templateId === x.id).length + ')', x.id === SEL)).join('') + '</select></label><a class="btn small" href="#sablonlar">Şablonları düzenle</a></div>' +
      (t ? '<div class="bcs-board" id="bcs-board">' + cols + '</div>' : '<div class="bmc-empty sm"><b>Henüz şablon yok.</b><span>Şablonlar sayfasından hazır şablonları yükleyin.</span></div>') +
      (t && !cases.length ? '<p class="bcs-hint">Bu şablonu kullanan dosya yok. Başvurular otomatik atanmaz; yukarıdaki listeden atayın.</p>' : '');
  }
  const refresh = async () => { if (routes[route()]) render(); };
  const move = async (app, stage) => { try { await A('cases/move', 'POST', {applicationId: app, stage}); await refresh(); if (CUR === app && $('#modal').open) openCase(app); } catch (e) { say(e.message); } };

  // ---------------- Dosya detayı (modal) ----------------
  async function openCase(id) {
    CUR = id; const d = await A('cases/case?id=' + encodeURIComponent(id)), st = d.state;
    if (!st) { modal(d.customer.name, '<p>Bu dosya henüz bir şablona atanmadı.</p>'); return; }
    const p = d.progress, pct = p.total ? Math.round(p.have / p.total * 100) : 0;
    const docList = d.documents.map(x => opt(x.id, x.title + ' · ' + new Date(x.created).toLocaleDateString('tr-TR'), false)).join('');
    const docSel = c => (c.documentId ? opt(c.documentId, 'Bağlı belge', true) + '<option value="">— bağlantıyı kaldır —</option>' : '<option value="">— belge seç —</option>') + docList;
    const chk = st.checklist.map(c => '<li class="bcs-ck"><div class="bcs-ckh"><b>' + esc(c.name) + '</b>' + (c.required ? '' : ' <small>(isteğe bağlı)</small>') + (c.hint ? '<small class="bcs-blk">' + esc(c.hint) + '</small>' : '') + '</div>' +
      '<div class="bcs-ckc"><select data-cs-chk="status" data-app="' + id + '" data-item="' + c.id + '" aria-label="Durum">' + Object.keys(ST).map(k => opt(k, ST[k], k === c.status)).join('') + '</select>' +
      '<select data-cs-chk="documentId" data-app="' + id + '" data-item="' + c.id + '" aria-label="Bağlı belge">' + docSel(c) + '</select>' +
      '<input data-cs-chk="note" data-app="' + id + '" data-item="' + c.id + '" value="' + esc(c.note || '') + '" placeholder="Not / ret nedeni" maxlength="300" aria-label="Not"><button class="btn small" data-cs-chk-del="' + c.id + '" aria-label="Kalemi kaldır">✕</button></div></li>').join('');
    const dls = st.deadlines.map(x => '<li><input value="' + esc(x.label) + '" data-dl-label="' + x.id + '" maxlength="100"><input type="date" value="' + esc(x.date) + '" data-dl-date="' + x.id + '"><button class="btn small" data-cs-dl-save="' + x.id + '">Kaydet</button><button class="btn small" data-cs-dl-del="' + x.id + '" aria-label="Süreyi sil">✕</button></li>').join('');
    const ev = (st.events || []).slice().reverse().slice(0, 40).map(e => '<li class="' + (e.visible ? '' : 'priv') + '"><small>' + new Date(e.t).toLocaleString('tr-TR', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'}) + (e.by ? ' · ' + esc(e.by) : '') + (e.visible ? '' : ' · iç not') + '</small>' + esc(e.text) + '</li>').join('');
    const tasks = d.tasks.map(t => '<li><span class="bcs-chip">' + ({todo: 'Yapılacak', doing: 'Sürüyor', done: 'Bitti'}[t.status] || t.status) + '</span><span style="flex:1">' + esc(t.title) + '</span>' + (t.due ? '<small>' + fd(t.due) + '</small>' : '') + '</li>').join('');
    modal(d.customer.name + ' · ' + d.application.service,
      '<div class="bcs-det"><div class="bcs-top"><label>Aşama <select data-cs-stage="' + id + '">' + st.stages.map((s, i) => opt(i, (i + 1) + '. ' + s, i === st.stage)).join('') + '</select></label><div class="bcs-prog"><div><i style="width:' + pct + '%"></i></div><small>Zorunlu belge: ' + p.have + '/' + p.total + ' alındı · ' + p.approved + ' onaylı</small></div></div>' +
      '<h3>Belge kontrol listesi</h3><ul class="bcs-cklist">' + chk + '</ul>' +
      '<div class="bcs-inl"><input id="bcs-newdoc" placeholder="Yeni belge iste (ör. Banka dekontu)" maxlength="120"><button class="btn small" data-cs-chk-add>Belge iste</button></div>' +
      '<h3>Süreler ve hatırlatıcılar</h3><p class="bcs-hint">Tarih girince müşteriye 60 · 30 · 14 · 7 · 1 gün kala e-posta ve panel bildirimi gider.</p><ul class="bcs-ul">' + (dls || '<li><small>Bu şablonda süre yok.</small></li>') + '</ul>' +
      '<div class="bcs-inl"><input id="bcs-dl-label" placeholder="Süre adı (ör. Pasaport bitişi)" maxlength="100"><input type="date" id="bcs-dl-date"><button class="btn small" data-cs-dl-add>Süre ekle</button></div>' +
      (tasks ? '<h3>Görevler</h3><ul class="bcs-ul">' + tasks + '</ul>' : '') +
      '<h3>Zaman çizelgesi</h3><div class="bcs-inl"><input id="bcs-note" placeholder="Not ekle" maxlength="300"><label class="bcs-chk"><input type="checkbox" id="bcs-note-vis"> Müşteri görsün</label><button class="btn small" data-cs-note>Ekle</button></div><ul class="bcs-ev">' + (ev || '<li><small>Henüz olay yok.</small></li>') + '</ul></div>');
  }
  const act = async (fn, msg) => { try { await fn(); if (msg) say(msg); await openCase(CUR); await refresh(); } catch (e) { say(e.message); } };

  // ---------------- Görev Panosu ----------------
  let TK = null;
  const tasksPage = () => { run(async root => { TK = await A('cases/tasks'); drawTasks(root); }); return wrap('Görev Panosu', 'Dosyalara bağlı ve bağımsız görevler. Şablondan atanan görevler dosya atanınca otomatik oluşur.'); };
  function drawTasks(root) {
    root = root || $('#bcs-root'); if (!root) return;
    const today = new Date().toISOString().slice(0, 10), cols = [['todo', 'Yapılacak'], ['doing', 'Sürüyor'], ['done', 'Bitti']];
    const card = t => '<article class="bcs-card"><b>' + esc(t.title) + '</b><small>' + esc(t.customer && t.caseId ? t.customer + ' · ' + t.service : 'Genel görev') + '</small><div class="bcs-chips">' + (t.due ? '<span class="bcs-chip ' + (t.status !== 'done' && t.due < today ? 'bad' : '') + '">' + fd(t.due) + '</span>' : '') + '</div><div class="bcs-mv"><button type="button" data-cs-tk="-1" data-id="' + t.id + '" aria-label="Geri">←</button><button type="button" data-cs-tk="1" data-id="' + t.id + '" aria-label="İleri">→</button><button type="button" data-cs-tk-del="' + t.id + '" aria-label="Sil">✕</button></div></article>';
    root.innerHTML = '<form class="bcs-bar" id="bcs-tk-form"><input name="title" placeholder="Yeni görev" required maxlength="140"><select name="caseId"><option value="">Dosyaya bağlı değil</option>' + TK.cases.map(c => opt(c.id, c.label, false)).join('') + '</select><input type="date" name="due"><button class="btn small" type="submit">Görev ekle</button></form>' +
      '<div class="bcs-board bcs-board3">' + cols.map(([k, l]) => '<div class="bcs-col"><h3>' + l + ' <span>' + TK.tasks.filter(t => t.status === k).length + '</span></h3>' + (TK.tasks.filter(t => t.status === k).map(card).join('') || '<p class="bcs-empty">—</p>') + '</div>').join('') + '</div>';
  }

  // ---------------- Süreler ----------------
  const deadlinesPage = () => { run(async root => {
    const d = (await A('cases/deadlines')).deadlines, grp = [['Süresi geçenler', x => x.days < 0], ['30 gün içinde', x => x.days >= 0 && x.days <= 30], ['31–90 gün', x => x.days > 30 && x.days <= 90], ['Daha sonra', x => x.days > 90]];
    root.innerHTML = d.length ? grp.map(([t, f]) => { const rows = d.filter(f); return rows.length ? '<section class="panel bcs-p"><header class="panel-head"><h2>' + t + ' (' + rows.length + ')</h2></header><ul class="bcs-ul">' + rows.map(x => '<li><div><b>' + esc(x.label) + '</b> <small>' + esc(x.customer) + ' · ' + esc(x.service) + '</small></div><div class="bcs-inl"><span>' + fd(x.date) + '</span>' + dChip(x.days) + '<button class="btn small" data-cs-open="' + x.applicationId + '">Dosyayı aç</button></div></li>').join('') + '</ul></section>' : ''; }).join('') : '<div class="bmc-empty sm"><b>Takip edilen süre yok.</b><span>Dosya detayında süre tarihi girin; hatırlatmalar otomatik gider.</span></div>';
  }); return wrap('Süreler', 'Tüm dosyalardaki tarihler (pasaport, oturum, randevu…). Yaklaşanlar için müşteriye ve ekibe otomatik hatırlatma gider.'); };

  // ---------------- Şablonlar ----------------
  let TP = null;
  const templatesPage = () => { run(async root => { TP = await A('cases/templates'); drawTemplates(root); }); return wrap('Dosya Şablonları', 'Her hizmet için aşamalar, belge kontrol listesi ve otomatik görevler. Hazır şablonlar başlangıç içindir; güncel mevzuata ve kendi uygulamanıza göre düzenleyin.'); };
  function drawTemplates(root) {
    root = root || $('#bcs-root'); if (!root) return;
    root.innerHTML = '<div class="bcs-bar"><button class="btn" data-cs-tpl-new>+ Yeni şablon</button><button class="btn small" data-cs-tpl-restore>Hazır şablonları geri yükle</button></div><div class="bcs-tgrid">' +
      TP.templates.map(t => '<article class="bcs-card bcs-tcard"><b>' + esc(t.name) + '</b>' + (t.builtin ? ' <span class="bcs-chip">hazır</span>' : '') + '<small>' + esc(t.service) + '</small><p>' + esc(t.desc || '') + '</p><div class="bcs-chips"><span class="bcs-chip">' + t.stages.length + ' aşama</span><span class="bcs-chip">' + t.checklist.length + ' belge</span><span class="bcs-chip">' + t.tasks.length + ' görev</span><span class="bcs-chip">' + t.deadlines.length + ' süre</span></div><div class="bcs-mv"><button class="btn small" data-cs-tpl-edit="' + t.id + '">Düzenle</button><button class="btn small" data-cs-tpl-del="' + t.id + '">Sil</button></div></article>').join('') + '</div>';
  }
  const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
  function editTemplate(id) {
    const t = id ? TP.templates.find(x => x.id === id) : {name: '', service: 'Oturum İzni', desc: '', stages: ['Başvuru alındı', 'Belgeler toplanıyor', 'İnceleme', 'Süreç tamamlandı'], checklist: [], tasks: [], deadlines: []};
    modal(id ? 'Şablonu düzenle' : 'Yeni şablon',
      '<form class="bcs-form" id="bcs-tpl-form" data-id="' + esc(id || '') + '"><label>Ad<input name="name" required minlength="2" maxlength="80" value="' + esc(t.name) + '"></label>' +
      '<label>Hizmet türü<select name="service">' + TP.services.map(s => opt(s, s, s === t.service)).join('') + '</select></label>' +
      '<label>Açıklama<input name="desc" maxlength="300" value="' + esc(t.desc || '') + '"></label>' +
      '<label>Aşamalar <small>(her satır bir aşama, en az 2)</small><textarea name="stages" rows="6">' + esc(t.stages.join('\n')) + '</textarea></label>' +
      '<label>Belge kontrol listesi <small>(her satır bir belge; isteğe bağlı için başa * koyun; ipucu için | kullanın)</small><textarea name="checklist" rows="8">' + esc(t.checklist.map(c => (c.required ? '' : '* ') + c.name + (c.hint ? ' | ' + c.hint : '')).join('\n')) + '</textarea></label>' +
      '<label>Otomatik görevler <small>(Başlık | aşama no | kaç gün içinde)</small><textarea name="tasks" rows="5">' + esc(t.tasks.map(x => x.title + ' | ' + (x.stage + 1) + ' | ' + x.dueDays).join('\n')) + '</textarea></label>' +
      '<label>Takip edilecek süreler <small>(her satır bir tarih alanı; tarihi dosyada girersiniz)</small><textarea name="deadlines" rows="3">' + esc(t.deadlines.map(x => x.label).join('\n')) + '</textarea></label>' +
      '<div class="form-actions"><button class="btn" type="submit">Kaydet</button></div></form>');
  }

  // ---------------- Olaylar ----------------
  document.addEventListener('click', async e => {
    const t = e.target, $c = s => t.closest(s);
    try {
      let b;
      if ((b = $c('[data-cs-mv]'))) { e.stopPropagation(); const c = BD.cases.find(x => x.applicationId === b.dataset.app); if (!c) return; const n = c.stage + Number(b.dataset.csMv); if (n >= 0 && n < c.stages.length) await move(c.applicationId, n); return; }
      if ((b = $c('[data-cs-assign]'))) { if (!confirm('Dosya şablona atanacak; müşterinin yol haritası şablonun aşamalarıyla güncellenir. Devam edilsin mi?')) return; const id = b.dataset.csAssign, sel = $('[data-cs-pick="' + id + '"]'); await A('cases/assign', 'POST', {applicationId: id, templateId: sel.value}); say('Dosya şablona atandı.'); BD = await A('cases/board'); drawBoard(); return; }
      if ($c('[data-cs-auto]')) { if (!confirm(BD.unassigned.length + ' başvuru hizmet türüne uygun şablona atanacak; müşterilerin yol haritası şablonun aşamalarıyla güncellenir. Devam edilsin mi?')) return; const r = await A('cases/auto', 'POST', {}); say(r.assigned + ' dosya şablona atandı.'); BD = await A('cases/board'); drawBoard(); return; }
      if ((b = $c('[data-cs-open]'))) { await openCase(b.dataset.csOpen); return; }
      if ((b = $c('[data-cs-chk-del]'))) { if (confirm('Bu belge kalemi dosyadan kaldırılsın mı?')) await act(() => A('cases/checklist/remove', 'POST', {applicationId: CUR, itemId: b.dataset.csChkDel})); return; }
      if ($c('[data-cs-chk-add]')) { const v = $('#bcs-newdoc').value.trim(); if (v) await act(() => A('cases/checklist/add', 'POST', {applicationId: CUR, name: v}), 'Belge istendi; müşteri bilgilendirildi.'); return; }
      if ((b = $c('[data-cs-dl-save]'))) { const id = b.dataset.csDlSave; await act(() => A('cases/deadline', 'POST', {applicationId: CUR, id, label: $('[data-dl-label="' + id + '"]').value, date: $('[data-dl-date="' + id + '"]').value}), 'Süre kaydedildi.'); return; }
      if ((b = $c('[data-cs-dl-del]'))) { await act(() => A('cases/deadline/delete', 'POST', {applicationId: CUR, id: b.dataset.csDlDel})); return; }
      if ($c('[data-cs-dl-add]')) { const l = $('#bcs-dl-label').value.trim(); if (l) await act(() => A('cases/deadline', 'POST', {applicationId: CUR, label: l, date: $('#bcs-dl-date').value}), 'Süre eklendi.'); return; }
      if ($c('[data-cs-note]')) { const v = $('#bcs-note').value.trim(); if (v) await act(() => A('cases/event', 'POST', {applicationId: CUR, text: v, visible: $('#bcs-note-vis').checked})); return; }
      if ((b = $c('[data-cs-tk]'))) { const t0 = TK.tasks.find(x => x.id === b.dataset.id), order = ['todo', 'doing', 'done'], n = order.indexOf(t0.status) + Number(b.dataset.csTk); if (n >= 0 && n < 3) { await A('cases/tasks', 'POST', {id: t0.id, status: order[n]}); TK = await A('cases/tasks'); drawTasks(); } return; }
      if ((b = $c('[data-cs-tk-del]'))) { await A('cases/tasks/delete', 'POST', {id: b.dataset.csTkDel}); TK = await A('cases/tasks'); drawTasks(); return; }
      if ($c('[data-cs-tpl-new]')) { editTemplate(''); return; }
      if ((b = $c('[data-cs-tpl-edit]'))) { editTemplate(b.dataset.csTplEdit); return; }
      if ((b = $c('[data-cs-tpl-del]'))) { if (confirm('Şablon silinsin mi? (Kullanımdaki şablon silinemez.)')) { await A('cases/templates/delete', 'POST', {id: b.dataset.csTplDel}); TP = await A('cases/templates'); drawTemplates(); say('Şablon silindi.'); } return; }
      if ($c('[data-cs-tpl-restore]')) { await A('cases/templates/restore', 'POST', {}); TP = await A('cases/templates'); drawTemplates(); say('Hazır şablonlar yüklendi.'); return; }
    } catch (err) { say(err.message); }
  });
  document.addEventListener('change', async e => {
    const s = e.target;
    try {
      if (s.matches('[data-cs-tplsel]')) { SEL = s.value; drawBoard(); return; }
      if (s.matches('[data-cs-stage]')) { await move(s.dataset.csStage, Number(s.value)); return; }
      if (s.matches('[data-cs-chk]')) { const body = {applicationId: s.dataset.app, itemId: s.dataset.item}; body[s.dataset.csChk] = s.value; await A('cases/checklist', 'POST', body); await openCase(CUR); await refresh(); say('Kaydedildi.'); }
    } catch (err) { say(err.message); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target;
    try {
      if (f.id === 'bcs-tk-form') { e.preventDefault(); const d = new FormData(f); await A('cases/tasks', 'POST', {title: d.get('title'), caseId: d.get('caseId') || undefined, due: d.get('due') || undefined}); TK = await A('cases/tasks'); drawTasks(); say('Görev eklendi.'); return; }
      if (f.id === 'bcs-tpl-form') { e.preventDefault(); const d = new FormData(f);
        const body = {id: f.dataset.id || undefined, name: d.get('name'), service: d.get('service'), desc: d.get('desc'), stages: lines(d.get('stages')),
          checklist: lines(d.get('checklist')).map(l => { const opt = l.startsWith('*'), p = l.replace(/^\*\s*/, '').split('|'); return {name: p[0].trim(), required: !opt, hint: p.slice(1).join('|').trim()}; }),
          tasks: lines(d.get('tasks')).map(l => { const p = l.split('|').map(x => x.trim()); return {title: p[0], stage: Math.max(0, (parseInt(p[1], 10) || 1) - 1), dueDays: parseInt(p[2], 10) || 0}; }),
          deadlines: lines(d.get('deadlines')).map(label => ({label}))};
        await A('cases/templates', 'POST', body); closeModal(); TP = await A('cases/templates'); drawTemplates(); say('Şablon kaydedildi.'); }
    } catch (err) { say(err.message); }
  });
  // sürükle-bırak (aşama panosu)
  document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.bcs-card[data-cs-open]'); if (c) { e.dataTransfer.setData('text/plain', c.dataset.csOpen); e.dataTransfer.effectAllowed = 'move'; } });
  document.addEventListener('dragover', e => { if (e.target.closest && e.target.closest('[data-cs-col]')) e.preventDefault(); });
  document.addEventListener('drop', async e => { const col = e.target.closest && e.target.closest('[data-cs-col]'); if (!col) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain'), c = BD && BD.cases.find(x => x.applicationId === id); if (c && c.stage !== Number(col.dataset.csCol)) await move(id, Number(col.dataset.csCol)); });

  // ---------------- Yönlendirme ve menü ----------------
  const routes = {dosyapano: boardPage, gorevpano: tasksPage, sureler: deadlinesPage, sablonlar: templatesPage};
  Object.assign(names, {dosyapano: 'Dosya Panosu', gorevpano: 'Görev Panosu', sureler: 'Süreler', sablonlar: 'Dosya Şablonları'});
  const _ov = overview;
  overview = function () { const r = route(); return routes[r] ? routes[r]() : _ov(); };
  const nav = $('#navigation');
  if (nav && !nav.querySelector('a[href="#dosyapano"]')) {
    const el = document.createElement('details');
    el.innerHTML = '<summary>Dosyalar</summary><div class="dropdown"><a href="#dosyapano">Dosya Panosu</a><a href="#gorevpano">Görev Panosu</a><a href="#sureler">Süreler</a><a href="#sablonlar">Şablonlar</a></div>';
    const after = [...nav.querySelectorAll('details')].find(d => d.querySelector('summary')?.textContent.trim() === 'Destek');
    if (after) after.after(el); else nav.appendChild(el);
  }
  if (routes[route()]) setTimeout(() => { if (!$('#bcs-root')) render(); }, 350);

  const css = document.createElement('style');
  css.textContent = '.bcs-sub{margin:-6px 0 18px;color:#68776b}.bcs-hint{font-size:12.5px;color:#68776b;margin:6px 0 12px}.bcs-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:0 0 14px}.bcs-bar label{display:flex;gap:8px;align-items:center;font-weight:600;font-size:13px}.bcs-bar select,.bcs-bar input,.bcs-inl select,.bcs-inl input:not([type=checkbox]),.bcs-det select,.bcs-det input:not([type=checkbox]),.bcs-form input,.bcs-form select,.bcs-form textarea{font:inherit;font-weight:400;border:1px solid #d7dfd2;border-radius:10px;padding:8px 10px;background:#fff;min-width:0}'
    + '.bcs-p{padding:0 18px 14px;margin-bottom:14px}.bcs-p .panel-head{margin:0 -18px 8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px}.bcs-ul{list-style:none;margin:0 0 10px;padding:0}.bcs-ul li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #eef1eb;flex-wrap:wrap}.bcs-ul li small{color:#7b887e}.bcs-inl{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.bcs-chk{display:flex;gap:6px;align-items:center;font-size:13px}'
    + '.bcs-board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(230px,1fr);gap:12px;overflow-x:auto;padding-bottom:10px;align-items:start}.bcs-board3{grid-auto-columns:minmax(0,1fr)}.bcs-col{background:#f1f5ee;border:1px solid #e0e7da;border-radius:14px;padding:10px;min-height:140px}.bcs-col h3{font-size:13px;margin:2px 4px 10px;display:flex;justify-content:space-between;color:#1b4d2a}.bcs-col h3 span{background:#fff;border-radius:999px;padding:0 8px;font-weight:600}.bcs-empty{color:#a0aa9f;text-align:center;margin:12px 0}'
    + '.bcs-card{background:#fff;border:1px solid #e3e8de;border-radius:12px;padding:11px 12px;margin-bottom:10px;cursor:pointer;display:grid;gap:4px}.bcs-card:hover{border-color:#8fb596;box-shadow:0 2px 8px rgba(27,94,32,.08)}.bcs-card small{color:#7b887e}.bcs-card p{margin:2px 0;font-size:12.5px;color:#5d6a5f}.bcs-chips{display:flex;gap:6px;flex-wrap:wrap}.bcs-chip{font-size:11.5px;background:#eef3ea;border-radius:999px;padding:2px 9px;color:#33503a}.bcs-chip.ok{background:#e6f3e7;color:#1b5e20}.bcs-chip.warn{background:#fdf1d8;color:#8a5a00}.bcs-chip.bad{background:#fde7e6;color:#a1211c}.bcs-mv{display:flex;gap:6px;margin-top:4px}.bcs-mv button{border:1px solid #d7dfd2;background:#fff;border-radius:8px;padding:2px 10px;cursor:pointer;font-size:13px}.bcs-tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}.bcs-tcard{cursor:default}'
    + '.bcs-det h3{margin:18px 0 8px;font-size:15px}.bcs-top{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.bcs-prog{flex:1;min-width:200px}.bcs-prog>div{height:8px;background:#e3eae3;border-radius:6px;overflow:hidden}.bcs-prog i{display:block;height:100%;background:#1b5e20}.bcs-tw{overflow-x:auto}.bcs-cklist{list-style:none;margin:0 0 10px;padding:0}.bcs-ck{padding:10px 0;border-bottom:1px solid #eef1eb}.bcs-ckc{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.bcs-ckc select{min-width:130px}.bcs-ckc input{flex:1;min-width:150px}#modal:has(.bcs-det){width:min(860px,94vw);max-width:860px}.bcs-tbl{width:100%;border-collapse:collapse;font-size:13px}.bcs-tbl th{text-align:left;font-size:11.5px;text-transform:uppercase;color:#68776b;padding:6px 6px}.bcs-tbl td{padding:7px 6px;border-top:1px solid #eef1eb;vertical-align:top}.bcs-blk{display:block;color:#7b887e}.bcs-ev{list-style:none;margin:10px 0 0;padding:0;max-height:240px;overflow:auto}.bcs-ev li{padding:7px 0;border-bottom:1px solid #eef1eb;font-size:13px}.bcs-ev li small{display:block;color:#7b887e}.bcs-ev li.priv{color:#6b5b2a}'
    + '.bcs-form{display:grid;gap:12px}.bcs-form label{display:grid;gap:5px;font-size:13px;font-weight:600}.bcs-form label small{font-weight:400;color:#7b887e}.bcs-form textarea{resize:vertical}@media(max-width:760px){.bcs-board{grid-auto-columns:minmax(220px,80%)}}';
  document.head.appendChild(css);
})();
