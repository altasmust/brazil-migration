'use strict';
// Çerez tercihi: zorunlu çerezler her zaman; ziyaret istatistiği yalnızca izinle (visitor-presence.js 'bm-consent' olayını dinler).
(() => {
  const KEY = 'bm-consent';
  const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const set = v => { try { localStorage.setItem(KEY, v); } catch {} dispatchEvent(new CustomEvent('bm-consent', {detail: v})); };
  const css = `.bm-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;background:var(--cream,#f8f9f3);color:var(--ink,#183b2c);border:1px solid var(--line,#dfe5d8);border-radius:18px;box-shadow:0 24px 60px rgba(16,41,28,.22);padding:20px 22px;font-family:inherit;animation:bmcc .35s ease}
  [data-theme=dark] .bm-cc{background:#14241c;border-color:#304238;box-shadow:0 24px 60px rgba(0,0,0,.5)}
  .bm-cc h2{font-size:16px;margin:0 0 6px}.bm-cc p{font-size:13.5px;line-height:1.6;margin:0 0 14px;color:var(--muted,#68776b)}.bm-cc p a{color:inherit;text-decoration:underline}
  .bm-cc-b{display:flex;gap:10px;flex-wrap:wrap}.bm-cc-b button{flex:1;min-width:150px;border-radius:10px;padding:12px 14px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;border:1px solid var(--line,#dfe5d8);background:transparent;color:inherit}
  .bm-cc-b .ok{background:var(--forest,#1b5e20);border-color:var(--forest,#1b5e20);color:#fff}
  @keyframes bmcc{from{opacity:0;transform:translateY(12px)}}@media (prefers-reduced-motion:reduce){.bm-cc{animation:none}}`;
  function show() {
    if (document.querySelector('.bm-cc')) return;
    if (!document.getElementById('bm-cc-css')) { const s = document.createElement('style'); s.id = 'bm-cc-css'; s.textContent = css; document.head.appendChild(s); }
    const d = document.createElement('div'); d.className = 'bm-cc'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Çerez tercihleri');
    d.innerHTML = '<h2>Çerez tercihiniz</h2><p>Sitenin çalışması için zorunlu çerezler kullanılır. İzin verirseniz, siteyi geliştirmek için ziyaret istatistikleri ve analiz araçları (ör. Google Analytics) da kullanılır; bunlar ve varsa reklam ölçüm çerezleri yalnızca izninizle çalışır. Ayrıntılar: <a href="/cerez-politikasi/">Çerez Politikası</a> · <a href="/gizlilik-politikasi/">Gizlilik</a></p><div class="bm-cc-b"><button type="button" data-v="necessary">Yalnızca zorunlu</button><button type="button" class="ok" data-v="all">Kabul et</button></div>';
    d.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; set(b.dataset.v); d.remove(); });
    document.body.appendChild(d);
  }
  const init = () => {
    if (!get() && !(navigator.doNotTrack === '1' || navigator.globalPrivacyControl)) show();
    document.addEventListener('click', e => { if (e.target.closest('[data-consent-open]')) { e.preventDefault(); show(); } });
  };
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
