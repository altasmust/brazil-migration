'use strict';
// Hizmet türüne göre varsayılan yol haritası aşamaları. Danışman/yönetici her başvuruda aşama ekleyip çıkarabilir (application.data.stages).
(() => {
  const T = {
    'Oturum İzni': ['Başvuru alındı', 'Belgeler hazırlandı', 'Avukat incelemesi', 'Resmî başvuru yapıldı', 'Süreç tamamlandı'],
    'Şirket Kurulum': ['Başvuru alındı', 'Belgeler hazırlandı', 'Şirket türü ve unvan seçimi', 'Kuruluş başvurusu (Junta Comercial)', 'Vergi kaydı (CNPJ)', 'Süreç tamamlandı'],
    'Vergi Numarası': ['Başvuru alındı', 'Belgeler hazırlandı', 'CPF başvurusu yapıldı', 'CPF numarası alındı'],
    'Vize': ['Başvuru alındı', 'Belgeler hazırlandı', 'Form ve avukat incelemesi', 'Konsolosluk başvurusu', 'Süreç tamamlandı'],
    'Vatandaşlık': ['Başvuru alındı', 'Belgeler hazırlandı', 'Avukat incelemesi', 'Resmî başvuru yapıldı', 'Süreç tamamlandı'],
    'Diğer': ['Başvuru alındı', 'İnceleme', 'Süreç tamamlandı'],
  };
  const CARD = {
    'Oturum İzni': ['REPÚBLICA FEDERATIVA DO BRASIL', 'RESIDÊNCIA • OTURUM', 'São Paulo', 'Yeni başlangıcınızın merkezi'],
    'Şirket Kurulum': ['RECEITA FEDERAL DO BRASIL', 'CNPJ • ŞİRKET', 'Şirket Kurulumu', 'Brezilya’da şirketiniz'],
    'Vergi Numarası': ['RECEITA FEDERAL DO BRASIL', 'CPF • VERGİ NO', 'Vergi Numarası', 'Bireysel CPF süreci'],
    'Vize': ['REPÚBLICA FEDERATIVA DO BRASIL', 'VISTO • VİZE', 'Vize İşlemleri', 'Seyahat ve ikamet izni'],
    'Vatandaşlık': ['REPÚBLICA FEDERATIVA DO BRASIL', 'CIDADANIA • VATANDAŞLIK', 'Vatandaşlık', 'Uzun vadeli yolculuk'],
    'Diğer': ['BRAZIL MIGRATION', 'SÜREÇ • TAKİP', 'Diğer Süreçler', 'Danışmanınız yanınızda'],
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const names = svc => T[svc] || T['Diğer'];
  // Kayıtlı aşama yoksa durumdan türetir.
  function resolve(app) {
    if (!app) return [];
    const d = app.data || {};
    if (Array.isArray(d.stages) && d.stages.length) return d.stages.map(x => ({n: x.n, s: x.s}));
    const n = names(d.service), st = d.status;
    let done = 1;
    if (st === 'Avukatta') done = Math.min(2, n.length - 1);
    if (st === 'Aktif' || st === 'Tamamlandı') done = n.length;
    return n.map((name, i) => ({n: name, s: i < done ? 'done' : i === done && st !== 'Pasif' ? 'doing' : 'wait'}));
  }
  const label = s => s === 'done' ? 'Tamamlandı' : s === 'doing' ? 'Devam ediyor' : 'Bekleniyor';
  // Yönetici/danışman için düzenleme alanı
  function editor(app) {
    const st = resolve(app);
    return `<div class="stage-edit" data-stage-edit><strong style="font-size:13px">Yol haritası aşamaları</strong>${st.map(x => row(x)).join('')}<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn secondary small" data-stage-add>+ Aşama ekle</button><button type="button" class="btn secondary small" data-stage-reset>Varsayılana dön</button></div><small class="subtle">Aşamaları yeniden adlandırabilir, durumlarını değiştirebilir veya silebilirsiniz. Müşteri bu listeyi “Başvurunuz ne aşamada?” kartında görür.</small></div>`;
  }
  const row = x => `<div class="row"><input data-stage-name value="${esc(x.n)}" maxlength="60" aria-label="Aşama adı"><select data-stage-state aria-label="Durum"><option value="done"${x.s === 'done' ? ' selected' : ''}>Tamamlandı</option><option value="doing"${x.s === 'doing' ? ' selected' : ''}>Devam ediyor</option><option value="wait"${x.s === 'wait' ? ' selected' : ''}>Bekleniyor</option></select><button type="button" class="btn secondary small" data-stage-del aria-label="Aşamayı sil">Sil</button></div>`;
  function collect(root) {
    const box = (root || document).querySelector('[data-stage-edit]'); if (!box) return undefined;
    if (box.dataset.reset) return null;
    return [...box.querySelectorAll('.row')].map(r => ({n: r.querySelector('[data-stage-name]').value.trim(), s: r.querySelector('[data-stage-state]').value})).filter(x => x.n);
  }
  document.addEventListener('click', e => {
    const box = e.target.closest('[data-stage-edit]'); if (!box) return;
    if (e.target.closest('[data-stage-add]')) { const rows = box.querySelectorAll('.row'); rows[rows.length - 1].insertAdjacentHTML('afterend', row({n: '', s: 'wait'})); delete box.dataset.reset; rows[rows.length - 1].nextElementSibling.querySelector('input').focus(); }
    if (e.target.closest('[data-stage-del]')) { if (box.querySelectorAll('.row').length > 1) e.target.closest('.row').remove(); }
    if (e.target.closest('[data-stage-reset]')) { box.dataset.reset = '1'; box.querySelectorAll('.row').forEach(r => r.style.opacity = '.4'); }
  });
  window.BMStages = {T, CARD, names, resolve, label, editor, collect, cur: ''};
})();
