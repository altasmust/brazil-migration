'use strict';
// Ana sayfa: mevcut düzeni koruyarak ikon, görsel ve vurgu ekler.
(() => {
  const P = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    family: '<circle cx="8" cy="7" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 20v-1.5A5.5 5.5 0 0 1 13.5 18.5V20M14 20v-1a4 4 0 0 1 7.5-2"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    ring: '<circle cx="12" cy="15" r="6"/><path d="m9 4 3 4 3-4z"/>',
    flag: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
    building: '<path d="M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    scale: '<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
    leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l8-8"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    doc: '<path d="M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5 5 0 0 1 3.5 5"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  };
  const ico = (k, cls = '') => `<span class="bm-ico ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg></span>`;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  const trust = $('.trust');
  if (trust) { trust.classList.add('bm-live'); [...trust.children].forEach(x => { if (x.textContent.includes('USD')) x.textContent = 'Şeffaf kapsam ve teklif'; }); [['globe', ''], ['shield', ''], ['clock', 'gold'], ['pin', '']].forEach(([k, c], i) => trust.children[i]?.insertAdjacentHTML('afterbegin', ico(k, c))); }

  const CARDS = {'/brezilya-oturum-izni/': ['family', 'oturum'], '/brezilya-vatandasligi/': ['flag', 'vatandaslik'], '/brezilyada-sirket-kurma/': ['building', 'sirket']};
  $$('.service-card').forEach(c => {
    const m = CARDS[c.getAttribute('href')]; if (!m) return;
    c.classList.add('bm-live');
    c.insertAdjacentHTML('afterbegin', `<span class="bm-thumb" aria-hidden="true"><img src="/images/marketing-v2/${m[1]}-768.webp" srcset="/images/marketing-v2/${m[1]}-480.webp 480w, /images/marketing-v2/${m[1]}-768.webp 768w" sizes="(max-width: 760px) 46vw, 420px" width="768" height="512" alt="" loading="lazy" decoding="async"></span>${ico(m[0])}`);
  });

  const WHY = ['home', 'scale', 'leaf', 'chat'];
  $$('.why .why-grid article').forEach((a, i) => { a.classList.add('bm-live'); a.insertAdjacentHTML('afterbegin', ico(WHY[i] || 'shield', i === 1 ? 'gold' : '')); });

  const sl = $('.settling-list');
  if (sl) { sl.classList.add('bm-live'); ['route', 'doc', 'users'].forEach((k, i) => sl.children[i]?.insertAdjacentHTML('afterbegin', ico(k))); }

  const hc = $('.hero-card');
  if (hc) {
    hc.classList.add('bm-live'); hc.insertAdjacentHTML('afterbegin', ico('target', 'gold'));
    const p = hc.querySelector('p'); if (p) p.innerHTML = '3 kısa soru, size özel<br>puanlı yol haritası.';
    const a = hc.querySelector('a'); if (a) a.innerHTML = '3 soruda keşfet <span>→</span>';
  }

  const qt = $('.quiz-teaser');
  if (qt) {
    qt.classList.add('bm-live');
    const h = qt.querySelector('h2'); if (h) h.textContent = 'Hangi hizmet size uygun?';
    const p = qt.querySelector('p'); if (p) p.textContent = 'Üç kısa soruyu yanıtlayın; hedefinize göre puanlanmış en uygun 3 seçeneği ve kişisel yol haritanızı görün.';
    const sm = qt.querySelector('small'); if (sm) sm.textContent = 'Yönlendirme skorudur; resmî uygunluk kararı değildir.';
    qt.querySelector('div')?.insertAdjacentHTML('beforeend', `<div class="bm-qicons">${ico('home')}${ico('flag')}${ico('building')}</div>`);
  }

  const foot = $('footer.site-footer');
  if (foot && !$('.bm-ribbon')) foot.insertAdjacentHTML('beforebegin', `<section class="wrap bm-ribbon-wrap" aria-label="Neden Brazil Migration"><div class="bm-ribbon">
    <div>${ico('route')}<span><b>3 ana hizmet</b><small>Oturum, vatandaşlık ve şirket kurulumu</small></span></div>
    <div>${ico('chat', 'gold')}<span><b>Türkçe destek</b><small>Baştan sona tek muhatap</small></span></div>
    <div>${ico('scale')}<span><b>Avukat koordinasyonu</b><small>Dosyanıza özel hukuki kontrol</small></span></div>
    <div>${ico('shield')}<span><b>Güvenli panel</b><small>Belgeler, süreç ve bildirimler</small></span></div></div></section>`);
})();

// Ülke şeridi: fareyle sürükleyerek kaydırma (dokunmatikte doğal kaydırma)
(() => {
  const init = () => { const el = document.querySelector('.country-strip'); if (!el) return;
    let down = false, sx = 0, sl = 0, moved = false;
    el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = el.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; el.classList.add('dragging'); } el.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => el.classList.remove('dragging'), 0); });
    el.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
