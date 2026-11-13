'use strict';
// Müşteri paneli: danışman/avukat/muhasebe "Görüşmeye çağır" gönderdiyse üstte davet şeridi çıkar.
(() => {
  let shown = '';
  async function poll() {
    try {
      const r = await fetch('/api/workspace/meeting', {credentials: 'same-origin', cache: 'no-store'}); if (!r.ok) return;
      const d = await r.json(); const bar = document.getElementById('meet-banner');
      if (d.role !== 'customer' || !d.invite) { bar?.remove(); shown = ''; return; }
      if (shown === d.invite.room) return; shown = d.invite.room; bar?.remove();
      const el = document.createElement('div'); el.id = 'meet-banner'; el.className = 'meet-banner'; el.setAttribute('role', 'alert');
      const esc = s => String(s || '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
      el.innerHTML = `<span>📹 <b>${esc(d.invite.by || 'Danışmanınız')}</b> sizi görüntülü görüşmeye çağırıyor.</span><a class="btn" href="/gorusme/?oda=${encodeURIComponent(d.invite.room)}&otomatik=1" target="_self">Davete Katıl</a>`;
      document.querySelector('header.topbar')?.after(el);
    } catch {}
  }
  poll(); setInterval(() => { if (!document.hidden) poll(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
})();
