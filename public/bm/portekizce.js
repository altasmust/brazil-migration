'use strict';
// Portekizce öğren: üniteler → kelime kartları → alıştırma (can, XP, seri). İlerleme tarayıcıda saklanır.
(() => {
  const U = window.BM_PT || [], root = document.getElementById('pt-app');
  if (!root) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const KEY = 'bm-pt-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
  const S = Object.assign({xp: 0, done: {}, streak: 0, last: ''}, load());
  const today = () => new Date().toISOString().slice(0, 10);
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const ICON = {wave: '👋', user: '🙂', hash: '🔢', cart: '🛒', cup: '☕', bus: '🚌', home: '🏠', doc: '📄', heart: '🩺'};
  let voice = null;
  const pickVoice = () => { const v = speechSynthesis.getVoices(); voice = v.find(x => /pt-BR/i.test(x.lang)) || v.find(x => /^pt/i.test(x.lang)) || null; };
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  const speak = t => { if (!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/…/g, '').split(' / ')[0]); u.lang = 'pt-BR'; if (voice) u.voice = voice; u.rate = .9; speechSynthesis.speak(u); };
  const unlocked = i => i === 0 || !!S.done[U[i - 1].id];

  function header() {
    const total = U.length, finished = U.filter(u => S.done[u.id]).length;
    return `<div class="pt-stats"><div><b>🔥 ${S.streak}</b><span>günlük seri</span></div><div><b>⭐ ${S.xp}</b><span>XP</span></div><div><b>🏆 ${finished}/${total}</b><span>ünite</span></div></div>`;
  }
  function home() {
    const w = U.flatMap(u => u.words), d = w[(new Date().getDate() * 7) % w.length];
    root.innerHTML = `${header()}<div class="pt-day"><span class="pt-tag">Günün ifadesi</span><div class="pt-day-row"><div><b>${esc(d[0])}</b><span>${esc(d[1])}</span><small>Okunuş: ${esc(d[2])}</small></div><button class="pt-say" data-say="${esc(d[0])}" aria-label="Dinle">🔊</button></div></div>
      <div class="pt-path">${U.map((u, i) => { const ok = unlocked(i), done = S.done[u.id]; return `<button class="pt-unit ${done ? 'done' : ''} ${ok ? '' : 'locked'}" ${ok ? `data-unit="${i}"` : 'disabled'}><span class="pt-bubble">${done ? '✓' : ok ? ICON[u.icon] || '★' : '🔒'}</span><span class="pt-ut"><b>${i + 1}. ${esc(u.title)}</b><small>${esc(u.sub)}</small>${done ? `<em>${done.stars} ★ · tekrar et</em>` : ''}</span></button>`; }).join('')}</div>
      <p class="pt-fine">İlerlemeniz bu tarayıcıda saklanır. Sesli telaffuz için cihazınızın Portekizce (Brezilya) sesi kullanılır.</p>`;
  }
  function learn(i) {
    const u = U[i];
    root.innerHTML = `<div class="pt-top"><button class="pt-x" data-home aria-label="Kapat">✕</button><div class="pt-bar"><i style="width:8%"></i></div><span class="pt-hearts">❤️ 3</span></div>
      <h2 class="pt-h">${ICON[u.icon] || ''} ${esc(u.title)} — kelimeler</h2><p class="pt-sub">Kartlara dokunarak dinleyin. Hazır olunca alıştırmaya geçin.</p>
      <div class="pt-cards">${u.words.map(w => `<button class="pt-card" data-say="${esc(w[0])}"><b>${esc(w[0])}</b><span>${esc(w[1])}</span><small>🔊 ${esc(w[2])}</small></button>`).join('')}</div>
      <button class="pt-go" data-quiz="${i}">Alıştırmaya başla →</button>`;
  }
  function makeQuestions(u) {
    const all = U.flatMap(x => x.words), qs = [];
    shuffle(u.words).slice(0, 8).forEach((w, k) => {
      const type = ['pt2tr', 'tr2pt', 'listen'][k % 3];
      const pool = shuffle([...u.words, ...all].filter(x => x[0] !== w[0])).filter((x, j, a) => a.findIndex(y => y[0] === x[0]) === j).slice(0, 3);
      const opts = shuffle([w, ...pool]);
      qs.push({type, w, opts});
    });
    return qs;
  }
  let Q = null;
  function quiz(i) { Q = {i, qs: makeQuestions(U[i]), n: 0, hearts: 3, right: 0}; question(); }
  function question() {
    const {qs, n, hearts} = Q, q = qs[n], u = U[Q.i];
    const prompt = q.type === 'pt2tr' ? `<p class="pt-ask">Bu ne demek?</p><div class="pt-word">${esc(q.w[0])} <button class="pt-say sm" data-say="${esc(q.w[0])}" aria-label="Dinle">🔊</button></div>`
      : q.type === 'tr2pt' ? `<p class="pt-ask">Portekizcesi hangisi?</p><div class="pt-word tr">${esc(q.w[1])}</div>`
      : `<p class="pt-ask">Dinleyin ve anlamını seçin</p><button class="pt-listen" data-say="${esc(q.w[0])}">🔊 Dinle</button>`;
    const label = o => q.type === 'tr2pt' ? o[0] : o[1];
    root.innerHTML = `<div class="pt-top"><button class="pt-x" data-home aria-label="Kapat">✕</button><div class="pt-bar"><i style="width:${Math.round(n / qs.length * 100)}%"></i></div><span class="pt-hearts">❤️ ${hearts}</span></div>
      <span class="pt-tag">${esc(u.title)}</span>${prompt}<div class="pt-opts">${q.opts.map((o, k) => `<button class="pt-opt" data-ans="${k}">${esc(label(o))}</button>`).join('')}</div><div class="pt-feedback" id="pt-fb"></div>`;
    if (q.type === 'listen') setTimeout(() => speak(q.w[0]), 250);
  }
  function answer(k) {
    const q = Q.qs[Q.n], ok = q.opts[k][0] === q.w[0], fb = document.getElementById('pt-fb');
    document.querySelectorAll('.pt-opt').forEach((b, j) => { b.disabled = true; if (q.opts[j][0] === q.w[0]) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
    if (ok) Q.right++; else Q.hearts--;
    fb.className = 'pt-feedback ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = `<div><b>${ok ? 'Harika! 🎉' : 'Doğru cevap:'}</b> ${ok ? '' : esc(q.w[0]) + ' — ' + esc(q.w[1])}<small>Okunuş: ${esc(q.w[2])}</small></div><button class="pt-go" id="pt-next">${Q.hearts <= 0 ? 'Üniteyi tekrar et' : Q.n + 1 >= Q.qs.length ? 'Sonucu gör' : 'Devam →'}</button>`;
    speak(q.w[0]);
    document.getElementById('pt-next').onclick = () => { if (Q.hearts <= 0) return learn(Q.i); Q.n++; if (Q.n >= Q.qs.length) finish(); else question(); };
  }
  function finish() {
    const u = U[Q.i], stars = Q.hearts === 3 ? 3 : Q.hearts === 2 ? 2 : 1, gained = 10 + Q.right * 2;
    S.xp += gained;
    const prev = S.done[u.id]; S.done[u.id] = {stars: Math.max(stars, prev?.stars || 0), at: Date.now()};
    const t = today(); if (S.last !== t) { const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10); S.streak = S.last === y ? S.streak + 1 : 1; S.last = t; }
    save();
    const next = Q.i + 1 < U.length ? Q.i + 1 : null;
    root.innerHTML = `<div class="pt-done"><div class="pt-trophy">🏆</div><h2>Ünite tamamlandı!</h2><p>${esc(u.title)} · ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</p><div class="pt-stats"><div><b>+${gained}</b><span>XP</span></div><div><b>${Q.right}/${Q.qs.length}</b><span>doğru</span></div><div><b>🔥 ${S.streak}</b><span>günlük seri</span></div></div>
      ${next !== null ? `<button class="pt-go" data-unit="${next}">Sıradaki ünite: ${esc(U[next].title)} →</button>` : '<p>Tüm üniteleri bitirdiniz. Parabéns! 🇧🇷</p>'}<button class="pt-link" data-home>Ünite haritasına dön</button></div>`;
  }
  root.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.say) { speak(t.dataset.say); if (t.classList.contains('pt-card')) t.classList.add('heard'); if (!t.dataset.unit && !t.dataset.ans) return; }
    if (t.dataset.home !== undefined) return home();
    if (t.dataset.unit) return learn(Number(t.dataset.unit));
    if (t.dataset.quiz) return quiz(Number(t.dataset.quiz));
    if (t.dataset.ans) return answer(Number(t.dataset.ans));
  });
  home();
})();
