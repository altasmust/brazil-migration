'use strict';
// Ana sayfa hero: şehir slider'ı (São Paulo · Rio de Janeiro · Florianópolis). Her şehrin gündüz + gece görseli var;
// koyu tema = gece (style.css .city-night). Belirli aralıklarla değişir; üzerine gelince / sekme gizliyken durur.
(() => {
  const hero = document.querySelector('.home-hero'); if (!hero || hero.dataset.hs) return; hero.dataset.hs = '1';
  const U = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
  const SLIDES = [
    {city: 'São Paulo', place: 'Ponte Estaiada · Pinheiros'},
    {city: 'Rio de Janeiro', place: 'Pão de Açúcar’dan Copacabana', day: 'photo-1763110805060-80dbead1f9d3', night: 'photo-1544991337-95176b5233c4', alt: 'Rio de Janeiro, Pão de Açúcar’dan Copacabana ve Atlantik kıyısı', credit: 'Shai Pal · Davi Costa / Unsplash'},
    {city: 'Florianópolis', place: 'Beira-Mar Norte · Hercílio Luz Köprüsü', day: 'photo-1565574337618-b08146e94992', night: 'photo-1743776961025-6c42bc916b8e', alt: 'Florianópolis sahil şeridi ve Hercílio Luz Köprüsü', credit: 'Eduardo Zmievski · Tiago Muraro / Unsplash'},
  ];
  const INTERVAL = 7000;
  // 1. mevcut São Paulo görsellerini ilk slayta taşı
  const first = document.createElement('div'); first.className = 'hs-slide on';
  hero.querySelectorAll(':scope > img.city-day, :scope > img.city-night').forEach(i => first.appendChild(i));
  hero.prepend(first);
  const slides = [first];
  const srcset = id => [960, 1440, 1920, 2560].map(w => `${U(id, w)} ${w}w`).join(', ');
  const build = s => {
    const el = document.createElement('div'); el.className = 'hs-slide'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<img class="city-day" alt="${s.alt}" decoding="async" sizes="100vw" data-srcset="${srcset(s.day)}" data-src="${U(s.day, 1920)}"><img class="city-night" alt="" aria-hidden="true" decoding="async" sizes="100vw" data-srcset="${srcset(s.night)}" data-src="${U(s.night, 1920)}">`;
    slides[slides.length - 1].after(el); slides.push(el); return el;
  };
  SLIDES.slice(1).forEach(build);
  const load = el => el.querySelectorAll('img[data-src]').forEach(i => { i.srcset = i.dataset.srcset; i.src = i.dataset.src; i.removeAttribute('data-src'); i.removeAttribute('data-srcset'); });
  // 2. alt bar: şehir adı + noktalar
  const bar = document.createElement('div'); bar.className = 'hs-bar';
  bar.innerHTML = `<div class="hs-cap" aria-live="polite"><b></b><span></span><small></small></div><div class="hs-dots" role="tablist" aria-label="Şehirler">${SLIDES.map((s, i) => `<button type="button" role="tab" aria-label="${s.city}" aria-selected="${i === 0}" data-i="${i}"><i></i></button>`).join('')}</div>`;
  hero.appendChild(bar);
  let cur = 0, timer = 0, paused = false;
  const em = hero.querySelector('h1 em'), hb = hero.querySelector('.hero-bottom span');
  const setText = (el, t) => { if (!el || el.textContent === t) return; el.classList.add('hs-fade'); setTimeout(() => { el.textContent = t; el.classList.remove('hs-fade'); }, 350); };
  const cap = i => { const s = SLIDES[i], c = bar.querySelector('.hs-cap'); setText(em, s.city + '.'); if (hb) setText(hb, s.city.toUpperCase() + '  ·  BRASIL'); c.querySelector('b').textContent = s.city; c.querySelector('span').textContent = s.place; c.querySelector('small').textContent = s.credit ? 'Foto: ' + s.credit : ''; };
  const show = i => {
    i = (i + slides.length) % slides.length; if (i === cur) return;
    load(slides[i]); load(slides[(i + 1) % slides.length]);
    slides[cur].classList.remove('on'); slides[cur].setAttribute('aria-hidden', 'true');
    slides[i].classList.add('on'); slides[i].removeAttribute('aria-hidden');
    bar.querySelectorAll('[data-i]').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.i === i)));
    cur = i; cap(i); restart();
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restart = () => { clearTimeout(timer); bar.classList.remove('run'); void bar.offsetWidth; if (!paused && !reduce) { bar.classList.add('run'); timer = setTimeout(() => show(cur + 1), INTERVAL); } };
  bar.style.setProperty('--hs-t', INTERVAL + 'ms');
  bar.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) show(+b.dataset.i); });
  const pause = p => { paused = p; hero.classList.toggle('hs-paused', p); restart(); };
  hero.addEventListener('mouseenter', () => pause(true)); hero.addEventListener('mouseleave', () => pause(false));
  hero.addEventListener('focusin', () => pause(true)); hero.addEventListener('focusout', () => pause(false));
  document.addEventListener('visibilitychange', () => pause(document.hidden));
  // dokunmatik: kaydırarak geçiş
  let x0 = null; hero.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive: true});
  hero.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); x0 = null; }, {passive: true});
  cap(0);
  // ilk görsel yüklendikten sonra 2. slaytı hazırla, sonra döngüyü başlat
  const go = () => { load(slides[1]); restart(); };
  if (document.readyState === 'complete') setTimeout(go, 400); else addEventListener('load', () => setTimeout(go, 400), {once: true});
})();
