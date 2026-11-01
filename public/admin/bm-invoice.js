'use strict';
// Faturalar: gerçek müşteri ve partner hesaplarına fatura kesilir; fatura müşterinin/partnerin panelinde görünür ve ödenir.
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
  const fmt = (c, cur) => { try { return new Intl.NumberFormat('tr-TR', {style: 'currency', currency: cur || 'USD'}).format((Number(c) || 0) / 100); } catch { return ((Number(c) || 0) / 100).toFixed(2) + ' ' + cur; } };
  const ROLE = {customer: 'Müşteri', advisor: 'Partner'};
  let ACC = null;
  const accounts = async () => ACC ??= (await A('accounts')).accounts.filter(a => ['customer', 'advisor'].includes(a.role) || ['customer', 'partner', 'advisor'].includes(a.type));

  // ---------- yeni fatura ----------
  const _invoiceNew = invoiceNew;
  invoiceNew = function () {
    const pre = invoiceNew.customer || new URLSearchParams(location.hash.split('?')[1] || '').get('hesap') || '';
    setTimeout(async () => {
      const sel = $('#bmi-owner'); if (!sel) return;
      try {
        const list = await accounts();
        const grp = (r, label) => { const xs = list.filter(a => (a.role || '') === r).sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr')); return xs.length ? `<optgroup label="${label}">${xs.map(a => `<option value="${esc(a.id)}" data-partner="${esc(a.manager || a.advisorName || '')}" ${a.id === pre ? 'selected' : ''}>${esc(a.name || a.email)} · ${esc(a.email || '')}</option>`).join('')}</optgroup>` : ''; };
        sel.innerHTML = `<option value="">Hesap seçin</option>${grp('customer', 'Müşteriler')}${grp('advisor', 'Partnerler')}`;
        if (!list.length) sel.innerHTML = '<option value="">Henüz müşteri veya partner hesabı yok</option>';
      } catch (e) { sel.innerHTML = `<option value="">${esc(e.message)}</option>`; }
    }, 0);
    let h = _invoiceNew();
    h = h.replace(/<div class="info">Bu form yönetim paneline fatura kaydı ekler\.[^<]*<\/div>/, '<div class="info">Fatura, seçtiğiniz müşterinin veya partnerin panelindeki <b>Finans</b> bölümünde görünür; oradan kartla (iyzico) veya havale ile ödenebilir. Resmî e-fatura yerine geçmez.</div>');
    h = h.replace(/<label[^>]*>\s*<span[^>]*>Müşteri<\/span>[\s\S]*?<\/select>\s*<\/label>|<div class="field"[^>]*>\s*<label[^>]*>Müşteri<\/label>[\s\S]*?<\/select>\s*<\/div>/, '');
    h = h.replace('<section class="panel"><div class="panel-body">', `<section class="panel"><div class="panel-body"><label class="bmi-f">Fatura kesilecek hesap<select id="bmi-owner" name="owner" required><option value="">Yükleniyor…</option></select><small>Müşteriler ve partnerler listelenir.</small></label><label class="bmi-f">Fatura başlığı<input name="title" placeholder="Ör. Oturum İzni hizmet bedeli · 1. taksit"></label>`);
    h = h.replace('<div class="info warning">Bildirim gönderimi bağlı değil.</div>', '<label class="bmi-cb"><input type="checkbox" name="notify" checked> Hesap sahibine e-posta ile bildir</label><label class="bmi-f">Partner komisyonu (%)<input name="rate" type="number" min="0" max="100" step="0.5" value="0"><small>Müşterinin bağlı olduğu partner varsa, ödeme alınınca bu oranda kazanç kaydedilir.</small></label>');
    h = h.replace("Fatura Kaydını Oluştur", "Faturayı oluştur");
    return h;
  };
  // eski müşteri seçicisini kaldır, kendi formumuzu gönder
  const strip = () => { const f = $('#invoice-form'); if (!f) return; f.querySelectorAll('select[name=customer]').forEach(s => (s.closest('label,.field,.form-field') || s).remove()); };
  new MutationObserver(strip).observe(document.documentElement, {childList: true, subtree: true});
  document.addEventListener('submit', async e => {
    const f = e.target; if (f.id !== 'invoice-form') return;
    e.preventDefault(); e.stopImmediatePropagation();
    const fd = new FormData(f), v = Object.fromEntries(fd), btn = e.submitter; if (btn) btn.disabled = true;
    try {
      if (!v.owner) throw new Error('Fatura kesilecek hesabı seçin.');
      const lines = (typeof invoiceLines !== 'undefined' ? invoiceLines : []).map(x => ({name: x.name, qty: x.qty, price: x.price}));
      if (!lines.length || lines.some(x => !String(x.name).trim() || x.qty <= 0 || x.price < 0)) throw new Error('Fatura kalemlerini kontrol edin.');
      const r = await A('invoices/create', 'POST', {owner: v.owner, title: v.title, number: v.name, issued: v.issued, due: v.due, currency: v.currency, discount: v.discount, notes: v.notes, status: v.status, rate: v.rate, notify: !!fd.get('notify'), lines});
      say(r.mailed ? 'Fatura oluşturuldu ve e-posta gönderildi.' : 'Fatura oluşturuldu.'); location.hash = 'invoices';
    } catch (err) { say(err.message); } finally { if (btn) btn.disabled = false; }
  }, true);

  // ---------- fatura listesi ----------
  let F = {q: '', st: ''};
  const _listPage = listPage;
  listPage = function (type) {
    if (type !== 'invoice') return _listPage(type);
    setTimeout(async () => {
      const root = $('#bmi-root'); if (!root) return;
      let d; try { d = await A('invoices'); } catch (e) { root.innerHTML = `<div class="bmc-err">${esc(e.message)}</div>`; return; }
      const draw = () => {
        const L = d.invoices.filter(i => (!F.st || i.status === F.st) && (!F.q || (i.title + ' ' + i.name + ' ' + i.email + ' ' + (i.number || '')).toLocaleLowerCase('tr').includes(F.q.toLocaleLowerCase('tr'))));
        const sum = st => d.invoices.filter(i => i.status === st).reduce((m, i) => { m[i.currency || 'USD'] = (m[i.currency || 'USD'] || 0) + i.amount; return m; }, {});
        const tot = o => Object.entries(o).map(([c, v]) => fmt(v, c)).join(' · ') || fmt(0, 'USD');
        root.innerHTML = `<div class="bmi-stats"><div><small>Ödenmemiş</small><b>${tot(sum('Ödenmedi'))}</b></div><div class="ok"><small>Tahsil edilen</small><b>${tot(sum('Ödendi'))}</b></div><div><small>Fatura sayısı</small><b>${d.invoices.length}</b></div></div>
          <div class="bmi-bar"><input class="bmi-in" id="bmi-q" placeholder="Fatura, müşteri veya e-posta ara" value="${esc(F.q)}"><select class="bmi-in" id="bmi-st">${['', 'Ödenmedi', 'Ödendi', 'İptal'].map(s => `<option value="${s}" ${F.st === s ? 'selected' : ''}>${s || 'Tüm durumlar'}</option>`).join('')}</select><span class="sp"></span><a class="btn primary" href="#invoiceNew">${ic('plus')} Yeni fatura</a></div>
          <section class="panel"><div class="bmc-table"><table><thead><tr><th>Fatura</th><th>Hesap</th><th>Tutar</th><th>Son ödeme</th><th>Durum</th><th></th></tr></thead><tbody>${L.map(i => `<tr><td><b>${esc(i.title)}</b><small class="bmc-ct">${esc(i.number || i.id)} · ${new Date(i.created).toLocaleDateString('tr-TR')}</small></td><td>${esc(i.name)}<small class="bmc-ct">${ROLE[i.role] || ''} · ${esc(i.email)}</small></td><td><b>${fmt(i.amount, i.currency)}</b></td><td>${esc(i.due || '—')}</td>
            <td><span class="bmy-pill ${i.status === 'Ödendi' ? 'on' : ''}">${esc(i.status)}</span>${i.method === 'iyzico' ? '<small class="bmc-ct">Kartla (iyzico)</small>' : i.reference ? `<small class="bmc-ct">${esc(i.reference)}</small>` : ''}</td>
            <td><div class="bmi-acts">${i.status !== 'Ödendi' ? `<button class="btn small" data-paid="${esc(i.id)}">${ic('check')} Ödendi</button>` : ''}${i.status === 'Ödenmedi' ? `<button class="btn small" data-cancel="${esc(i.id)}">İptal</button>` : ''}${i.status !== 'Ödendi' ? `<button class="btn small danger" data-del="${esc(i.id)}" title="Sil">${ic('x')}</button>` : ''}${i.status === 'Ödendi' && i.method !== 'iyzico' ? `<button class="btn small" data-unpaid="${esc(i.id)}">Geri al</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="6" class="bmc-none" style="padding:28px;text-align:center">${d.invoices.length ? 'Eşleşen fatura yok.' : 'Henüz fatura yok. “Yeni fatura” ile başlayın.'}</td></tr>`}</tbody></table></div></section>`;
        $('#bmi-q').oninput = e => { F.q = e.target.value; const p = e.target.selectionStart; draw(); const n = $('#bmi-q'); n.focus(); n.setSelectionRange(p, p); };
        $('#bmi-st').onchange = e => { F.st = e.target.value; draw(); };
      };
      draw();
      root.onclick = async e => {
        const b = e.target.closest('button'); if (!b) return;
        try {
          if (b.dataset.paid) { const ref = prompt('Ödeme referansı (dekont no, açıklama vb.)', 'Havale'); if (ref === null) return; await A('invoices/status', 'POST', {id: b.dataset.paid, status: 'Ödendi', reference: ref}); say('Fatura ödendi olarak işaretlendi.'); }
          if (b.dataset.unpaid && confirm('Fatura tekrar “Ödenmedi” yapılsın mı?')) await A('invoices/status', 'POST', {id: b.dataset.unpaid, status: 'Ödenmedi'});
          if (b.dataset.cancel && confirm('Fatura iptal edilsin mi?')) await A('invoices/status', 'POST', {id: b.dataset.cancel, status: 'İptal'});
          if (b.dataset.del && confirm('Fatura kalıcı olarak silinsin mi?')) await A('invoices/delete', 'POST', {id: b.dataset.del});
          d = await A('invoices'); draw();
        } catch (err) { say(err.message); }
      };
    }, 0);
    return heading('Faturalar') + '<div id="bmi-root" class="bmi"><div class="loading">Yükleniyor…</div></div>';
  };
})();
