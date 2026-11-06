'use strict';
// "Dil engeli olmadan" anlatım videosu: canlı çevirili görüşmeyi sahne sahne gösteren, video oynatıcı görünümlü animasyon.
(() => {
  const F = c => `<img src="/bm/flags/${c}.svg" alt="" width="18" height="13">`;
  const L = {tr: ['tr', 'TR'], pt: ['br', 'PT'], en: ['gb', 'EN'], fa: ['ir', 'FA']};
  const SC = [
    {who: 'me', lang: 'tr', text: 'Merhaba, aile birleşimi için hangi belgeler gerekiyor?', to: 'pt', tr: 'Olá, quais documentos são necessários para a reunião familiar?', step: 0},
    {who: 'law', lang: 'pt', text: 'Certidão de casamento apostilada e tradução juramentada.', to: 'tr', tr: 'Apostilli evlilik belgesi ve yeminli tercüme gerekiyor.', step: 1},
    {who: 'me', lang: 'fa', text: 'این روند چقدر طول می‌کشد؟', to: 'pt', tr: 'Quanto tempo leva esse processo?', step: 2, rtl: true},
    {who: 'law', lang: 'pt', text: 'Em média, de dois a quatro meses.', to: 'fa', tr: 'به طور متوسط دو تا چهار ماه.', step: 2, rtlTr: true},
    {who: 'me', lang: 'en', text: 'Great, can we talk again next week?', to: 'pt', tr: 'Ótimo, podemos conversar de novo na semana que vem?', step: 3},
  ];
  const STEPS = ['Kendi dilinizde konuşun', 'Anında çevrilir', 'TR · PT · EN · FA', 'Uygulama gerekmez'];
  const DUR = 5200;
  const lawyer = `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="bmvB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24455e"/><stop offset="1" stop-color="#18324a"/></linearGradient></defs>
    <path d="M38 200c4-40 30-62 62-62s58 22 62 62z" fill="url(#bmvB)"/><path d="M88 138h24l-12 26z" fill="#f3f3f3"/>
    <path d="M58 92c-6-44 20-70 46-70 30 0 50 24 44 66-2 14-4 30 2 44-14 6-30-4-34-14H86c-6 12-22 20-34 12 8-12 8-26 6-38z" fill="#4a2d1f"/>
    <rect x="89" y="112" width="22" height="22" rx="8" fill="#e3b391"/><ellipse cx="100" cy="88" rx="30" ry="35" fill="#eec3a2"/>
    <path d="M70 80c6-22 22-32 42-30 12 2 20 10 22 22-18-2-38-8-50-22-4 12-8 22-14 30z" fill="#4a2d1f"/>
    <circle cx="89" cy="90" r="3" fill="#2b1d16"/><circle cx="111" cy="90" r="3" fill="#2b1d16"/><path d="M92 106c5 4 11 4 16 0" stroke="#b5645a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  const client = `<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M34 200c4-42 32-64 66-64s62 22 66 64z" fill="#2f5d46"/><path d="M84 136h32l-16 14z" fill="#264d3a"/>
    <rect x="88" y="110" width="24" height="26" rx="9" fill="#d8a77f"/><ellipse cx="100" cy="86" rx="31" ry="36" fill="#e2b58f"/>
    <path d="M69 80c-2-30 14-46 34-46 22 0 34 16 30 44-6-12-16-20-32-20-14 0-24 8-32 22z" fill="#2a2420"/>
    <path d="M72 96c2 22 14 34 28 34s26-12 28-34c-4 10-10 14-14 14H86c-4 0-10-4-14-14z" fill="#3a302a"/>
    <circle cx="89" cy="88" r="3" fill="#2b1d16"/><circle cx="111" cy="88" r="3" fill="#2b1d16"/><path d="M93 108c4 3 10 3 14 0" stroke="#7a4b3a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

  function mount(host) {
    host.innerHTML = `<div class="bmv-frame" role="img" aria-label="Canlı çevirili görüşme anlatımı: Türkçe konuşan müşteri ile Portekizce konuşan avukat, konuşmalar anında çevriliyor.">
      <div class="bmv-top"><span class="bmv-rec"><i></i>CANLI</span><span class="bmv-title">Brazil Migration Görüşme</span><span class="bmv-time">00:00</span></div>
      <div class="bmv-main" data-who="law">${lawyer}<span class="bmv-wave"><i></i><i></i><i></i><i></i><i></i></span><span class="bmv-name">Dra. Ana · ${F('br')} PT</span></div>
      <div class="bmv-self" data-who="me">${client}<span class="bmv-wave"><i></i><i></i><i></i><i></i></span><span class="bmv-name bmv-myl">Siz · ${F('tr')} TR</span></div>
      <div class="bmv-cap"><div class="bmv-who"></div><div class="bmv-t" dir="auto"></div><div class="bmv-tr" dir="auto"></div></div>
      <div class="bmv-ctl"><button type="button" class="bmv-play" aria-label="Duraklat"><span></span></button><div class="bmv-prog"><i></i></div><span class="bmv-dur">0:26</span></div>
    </div><ol class="bmv-steps">${STEPS.map((s, i) => `<li data-i="${i}"><b>${i + 1}</b>${s}</li>`).join('')}</ol>`;
    const $ = s => host.querySelector(s);
    const capWho = $('.bmv-who'), capT = $('.bmv-t'), capTr = $('.bmv-tr'), prog = $('.bmv-prog i'), time = $('.bmv-time'), btn = $('.bmv-play');
    let k = 0, t0 = 0, paused = false, visible = false, raf = 0, typed = -1, pausedAt = 0;
    const total = SC.length * DUR;
    const show = i => {
      const s = SC[i]; host.querySelectorAll('[data-who]').forEach(el => el.classList.toggle('talk', el.dataset.who === s.who));
      host.querySelector('.bmv-myl').innerHTML = `Siz · ${F(L[SC.slice(0, i + 1).filter(x => x.who === 'me').pop().lang][0])} ${L[SC.slice(0, i + 1).filter(x => x.who === 'me').pop().lang][1]}`;
      capWho.innerHTML = `${s.who === 'me' ? 'Siz' : 'Dra. Ana'} · ${F(L[s.lang][0])} ${L[s.lang][1]}`;
      capT.textContent = ''; capTr.innerHTML = ''; capTr.classList.remove('on');
      host.querySelectorAll('.bmv-steps li').forEach(li => li.classList.toggle('on', +li.dataset.i === s.step));
      typed = 0;
    };
    const frame = now => {
      if (!paused && visible) {
        const el = (((now - t0) % total) + total) % total, i = Math.min(SC.length - 1, Math.floor(el / DUR)), local = el - i * DUR, s = SC[i];
        if (i !== k || typed < 0) { k = i; show(i); }
        const n = Math.min(s.text.length, Math.floor(local / 1800 * s.text.length));
        if (n !== typed) { capT.textContent = s.text.slice(0, n) + (n < s.text.length ? '▍' : ''); typed = n; }
        if (local > 2100 && !capTr.classList.contains('on')) { capTr.innerHTML = `<span class="bmv-arrow">→ ${F(L[s.to][0])} ${L[s.to][1]}</span><span dir="auto">${s.tr}</span>`; capTr.classList.add('on'); }
        if (local > 4700) host.querySelectorAll('[data-who]').forEach(e => e.classList.remove('talk'));
        prog.style.width = (el / total * 100).toFixed(2) + '%';
        const sec = Math.floor(el / 1000); time.textContent = '00:' + String(sec).padStart(2, '0');
      }
      raf = requestAnimationFrame(frame);
    };
    btn.onclick = () => {
      paused = !paused; host.classList.toggle("paused", paused); btn.setAttribute('aria-label', paused ? 'Oynat' : 'Duraklat');
      if (paused) pausedAt = performance.now(); else t0 += performance.now() - pausedAt;
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { show(0); capT.textContent = SC[0].text; capTr.innerHTML = `<span class="bmv-arrow">→ ${F('br')} PT</span><span>${SC[0].tr}</span>`; capTr.classList.add('on'); btn.hidden = true; return; }
    new IntersectionObserver(es => es.forEach(e => { const v = e.isIntersecting; if (v && !visible) { t0 = performance.now() - k * DUR; typed = -1; } visible = v; }), {threshold: .25}).observe(host);
    show(0); raf = requestAnimationFrame(frame);
  }
  const init = () => document.querySelectorAll('[data-bmv]:not([data-ready])').forEach(h => { h.dataset.ready = '1'; mount(h); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
