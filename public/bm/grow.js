'use strict';
// Bülten/rehber formu, uygulama (PWA) kurulumu ve hata bildirimi.
(() => {
  // --- PWA: service worker
  if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  // --- JS hatalarını yöneticiye bildir (sayfa başına en fazla 3)
  let n = 0; const report = (msg, src, line) => { if (n++ > 2 || !msg) return; try { navigator.sendBeacon ? navigator.sendBeacon('/api/auth/errlog', new Blob([JSON.stringify({msg: String(msg).slice(0, 300), src: String(src || '').slice(0, 200), line, page: location.pathname})], {type: 'application/json'})) : 0; } catch {} };
  addEventListener('error', e => { if (e.filename && e.filename.startsWith(location.origin)) report(e.message, e.filename, e.lineno); });
  addEventListener('unhandledrejection', e => { const r = e.reason; if (r && r.stack && r.stack.includes(location.origin)) report('Promise: ' + (r.message || r), '', 0); });
  // --- Ücretsiz rehber / bülten formu
  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-nl]'); if (!f) return; e.preventDefault();
    const msg = f.querySelector('.nl-msg'), btn = f.querySelector('button[type=submit]'), fd = new FormData(f);
    const email = String(fd.get('email') || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = 'Geçerli bir e-posta adresi girin.'; msg.className = 'nl-msg err'; return; }
    if (!fd.get('consent')) { msg.textContent = 'Lütfen onay kutusunu işaretleyin.'; msg.className = 'nl-msg err'; return; }
    btn.disabled = true; msg.textContent = 'Gönderiliyor…'; msg.className = 'nl-msg';
    try {
      const r = await fetch('/api/auth/subscribe', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, consent: true, source: fd.get('source'), website: fd.get('website')})});
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.message || 'Gönderilemedi');
      msg.textContent = j.already ? 'Zaten abonesiniz — rehber bağlantısı daha önce e-postanıza gönderildi.' : 'Neredeyse tamam! E-postanıza gelen bağlantıya tıklayarak onaylayın; rehber hemen gelecek. (Gelen kutusunda yoksa spam klasörüne bakın.)';
      msg.className = 'nl-msg ok'; f.querySelector('input[type=email]').value = '';
      try { window.gtag && gtag('event', 'generate_lead', {method: 'rehber'}); } catch {}
    } catch (err) { msg.textContent = err.message; msg.className = 'nl-msg err'; btn.disabled = false; }
  });
  // --- Rehber sayfası: onay durumuna göre içeriği aç
  const st = new URLSearchParams(location.search).get('durum');
  if (location.pathname === '/rehber/') {
    try { if (st === 'onaylandi') localStorage.setItem('bm-rehber', '1'); } catch {}
    let open = false; try { open = localStorage.getItem('bm-rehber') === '1'; } catch {}
    document.documentElement.classList.toggle('rh-open', open);
    const note = document.querySelector('[data-rh-status]');
    if (note && st) note.textContent = {onaylandi: '✓ Aboneliğiniz onaylandı. Rehberin tamamı aşağıda; tarayıcınızın Yazdır → PDF olarak kaydet seçeneğiyle indirebilirsiniz.', ayrildi: 'Bülten aboneliğiniz sonlandırıldı. Tekrar görüşmek dileğiyle.', gecersiz: 'Bağlantı geçersiz veya süresi dolmuş. Formu yeniden doldurabilirsiniz.'}[st] || '';
  }
})();
