'use strict';
// Oturum izni sayfası: paket / özel başlık seçimini mevcut görüşme formuna ekler.
(() => {
  const T = x => (window.BM_T ? window.BM_T(x) : x);
  const open = label => {
    label = label && label.split(' — ').map(T).join(' — ');
    if (typeof window.book !== 'function') { location.href = '/iletisim/'; return; }
    window.book(location.pathname.includes('sirket') ? 'sirket' : location.pathname.includes('vatandas') ? 'vatandaslik' : 'oturum');
    if (!label) return;
    setTimeout(() => {
      const body = document.getElementById('booking-body'); if (!body) return;
      let s = body.querySelector('.booking-summary');
      if (!s) { s = document.createElement('div'); s.className = 'booking-summary'; body.querySelector('form')?.before(s); }
      s.textContent = T('Seçiminiz:') + ' ' + label;
      const note = body.querySelector('textarea'); if (note && !note.value) note.value = T('İlgilendiğim kapsam:') + ' ' + label;
    }, 0);
  };
  const dlg = document.getElementById('vt-dlg');
  document.addEventListener('click', e => {
    if (e.target.closest('[data-vt-compare]')) { dlg?.showModal(); return; }
    if (e.target.closest('[data-vt-close]') || e.target === dlg) { dlg?.close(); return; }
    const b = e.target.closest('[data-oi-book]'); if (b) { dlg?.open && dlg.close(); open(b.dataset.oiBook); }
  });
  const btn = document.getElementById('oi-custom-btn'), pick = document.getElementById('oi-pick');
  document.addEventListener('change', e => {
    if (e.target.name !== 'oi-topic') return;
    btn.disabled = false; pick.textContent = T('Seçilen başlık:') + ' ' + T(e.target.value);
  });
  btn?.addEventListener('click', () => { const t = document.querySelector('input[name=oi-topic]:checked'); if (t) open(T('Size özel değerlendirme') + ' — ' + T(t.value)); });
})();
