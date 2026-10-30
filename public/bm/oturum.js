'use strict';
// Oturum izni sayfası: paket / özel başlık seçimini mevcut görüşme formuna ekler.
(() => {
  const open = label => {
    if (typeof window.book !== 'function') { location.href = '/iletisim/'; return; }
    window.book(location.pathname.includes('sirket') ? 'sirket' : 'oturum');
    if (!label) return;
    setTimeout(() => {
      const body = document.getElementById('booking-body'); if (!body) return;
      let s = body.querySelector('.booking-summary');
      if (!s) { s = document.createElement('div'); s.className = 'booking-summary'; body.querySelector('form')?.before(s); }
      s.textContent = 'Seçiminiz: ' + label;
      const note = body.querySelector('textarea'); if (note && !note.value) note.value = 'İlgilendiğim kapsam: ' + label;
    }, 0);
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-oi-book]'); if (b) open(b.dataset.oiBook); });
  const btn = document.getElementById('oi-custom-btn'), pick = document.getElementById('oi-pick');
  document.addEventListener('change', e => {
    if (e.target.name !== 'oi-topic') return;
    btn.disabled = false; pick.textContent = 'Seçilen başlık: ' + e.target.value;
  });
  btn?.addEventListener('click', () => { const t = document.querySelector('input[name=oi-topic]:checked'); if (t) open('Size özel değerlendirme — ' + t.value); });
})();
