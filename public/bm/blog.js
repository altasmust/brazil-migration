'use strict';
// Blog: içindekiler vurgusu, bağlantı kopyalama, sesli okuma (tarayıcının Türkçe sesi), kategori filtresi.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // category chips on /blog/
  const chips = $('.bl-chips');
  if (chips) chips.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', chips).forEach(x => x.classList.toggle('on', x === b));
    $$('.bl-list .bl-card').forEach(c => { c.hidden = !!b.dataset.cat && c.dataset.cat !== b.dataset.cat; c.style.display = c.hidden ? 'none' : ''; });
  });

  // tables → labelled cards on phones
  $$('.bl-body table').forEach(t => { const h = $$('thead th', t).map(x => x.textContent.trim()); if (!h.length) return; t.classList.add('bl-stack'); $$('tbody tr', t).forEach(r => $$('td', r).forEach((td, i) => h[i] && td.setAttribute('data-label', h[i]))); });

  // copy link
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { const t = document.createElement('textarea'); t.value = b.dataset.copy; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    b.classList.add('ok'); const l = b.getAttribute('aria-label'); b.setAttribute('aria-label', 'Kopyalandı'); setTimeout(() => { b.classList.remove('ok'); b.setAttribute('aria-label', l); }, 1600);
  });

  // table of contents: highlight the section being read; close the mobile list after a click
  const links = $$('.bl-toc a');
  const heads = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (heads.length && 'IntersectionObserver' in window) {
    const set = id => links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
    const io = new IntersectionObserver(es => { const v = es.filter(x => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) set(v.target.id); }, {rootMargin: '-110px 0px -65% 0px'});
    heads.forEach(h => io.observe(h)); set(heads[0].id);
  }
  $$('.bl-mtoc a').forEach(a => a.addEventListener('click', () => { const d = a.closest('details'); if (d) d.open = false; }));

  // listen: speechSynthesis, read in sentence chunks so long articles work on mobile too
  const box = $('[data-listen]'), S = window.speechSynthesis; const LG = (box && box.getAttribute('data-lang')) || 'tr-TR';
  if (box && S && 'SpeechSynthesisUtterance' in window) {
    box.hidden = false;
    const btn = $('.bl-play', box), bar = $('[data-lbar]', box), rate = $('[data-lrate]', box);
    const PLAY = btn.innerHTML, PAUSE = '<svg class="bl-i" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
    let chunks = null, i = 0, state = 'idle', voice = null, gen = 0;
    const pickVoice = () => { const v = S.getVoices(); voice = v.find(x => x.lang.toLowerCase().replace('_', '-').startsWith(LG.slice(0, 2))) || null; };
    pickVoice(); S.onvoiceschanged = pickVoice;
    const build = () => {
      const parts = [$('.bl-article h1')?.textContent || ''];
      $$('[data-read]').forEach(r => $$('p, h2, h3, li, summary, td, th', r).forEach(n => { if (!n.closest('li p') || n.tagName !== 'P') parts.push(n.textContent); }));
      const out = [];
      parts.map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).forEach(t => (t.match(/[^.!?…]+[.!?…]*\s*/g) || [t]).forEach(s => { s = s.trim(); if (!s) return; const last = out[out.length - 1]; if (last && last.length + s.length < 220) out[out.length - 1] = last + ' ' + s; else out.push(s); }));
      return out;
    };
    const ui = () => { btn.innerHTML = state === 'play' ? PAUSE : PLAY; btn.setAttribute('aria-label', state === 'play' ? 'Duraklat' : 'Makaleyi dinle'); bar.style.width = chunks ? Math.round(i / chunks.length * 100) + '%' : '0'; };
    const speak = () => {
      if (!chunks || i >= chunks.length) { state = 'idle'; i = 0; ui(); return; }
      const g = ++gen, u = new SpeechSynthesisUtterance(chunks[i]); u.lang = LG; if (voice) u.voice = voice; u.rate = Number(rate.value) || 1;
      u.onend = () => { if (state !== 'play' || g !== gen) return; i++; ui(); speak(); };
      u.onerror = ev => { if (g !== gen || ev.error === 'interrupted' || ev.error === 'canceled') return; state = 'idle'; ui(); };
      S.speak(u);
    };
    btn.addEventListener('click', () => {
      if (state === 'play') { state = 'pause'; gen++; S.cancel(); ui(); return; }
      if (!chunks) chunks = build();
      if (!voice && !S.getVoices().length) pickVoice();
      state = 'play'; ui(); gen++; S.cancel(); setTimeout(speak, 60);
    });
    rate.addEventListener('change', () => { if (state === 'play') { gen++; S.cancel(); setTimeout(speak, 60); } });
    addEventListener('pagehide', () => S.cancel());
  }
})();
// Dış kaynaklı kapak/görsel yüklenemezse (engel, yavaş ağ, silinmiş fotoğraf) kırık simge yerine yerel görsele dön
(() => {
  const FB = '/sao-paulo-day-hq-960.webp';
  const fix = img => { if (img.dataset.fb) return; if (img.complete && img.naturalWidth > 0) return; if (!img.complete) return; img.dataset.fb = '1'; img.removeAttribute('srcset'); img.src = FB; };
  document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && !t.dataset.fb) { t.dataset.fb = '1'; t.removeAttribute('srcset'); t.src = FB; } }, true);
  document.querySelectorAll('img').forEach(fix);
})();
