'use strict';
// Müşteri paneli → Genel Bakış: "Deneyiminizi paylaşın" kartı. Yorum yönetici onayından sonra sitede yayınlanır.
(() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let D = null, loading = false;
  const ST = {pending: ['Onay bekliyor', 'amber'], published: ['Sitede yayında', ''], hidden: ['Yayında değil', 'neutral']};
  const load = async () => { if (D || loading) return D; loading = true; try { const r = await fetch('/api/workspace/testimonial', {credentials: 'same-origin', cache: 'no-store'}); if (r.ok) D = await r.json(); } catch {} loading = false; return D; };
  function card() {
    const r = D.review, sv = D.services || {}, st = r && ST[r.status];
    const stars = n => [1, 2, 3, 4, 5].map(i => `<button type="button" class="bmr-s${i <= n ? ' on' : ''}" data-r="${i}" aria-label="${i} yıldız" aria-pressed="${i <= n}">★</button>`).join('');
    return `<article class="card card-pad" id="bm-review" style="margin-top:24px"><div class="section-head"><div><h2>Deneyiminizi paylaşın</h2><p>Görüşünüz bizim için değerli. İzin verirseniz, onaylandıktan sonra sitemizde adınızın baş harfiyle birlikte yayınlanır.</p></div>${st ? `<span class="badge ${st[1]}">${st[0]}</span>` : ''}</div>
    <form id="bmr-form" class="bmr-form"><div class="bmr-stars" role="group" aria-label="Puanınız">${stars(r?.rating || 5)}</div><input type="hidden" name="rating" value="${r?.rating || 5}">
    <label>Yorumunuz<textarea name="text" rows="4" minlength="20" maxlength="900" required placeholder="Süreç nasıl geçti? Ekibimizle çalışmak nasıldı?">${esc(r?.text || '')}</textarea></label>
    <div class="bmr-row"><label>Görünecek ad<input name="name" maxlength="40" value="${esc(r?.name || '')}" placeholder="Örn. Ayşe K."></label><label>Şehir<input name="city" maxlength="40" value="${esc(r?.city || '')}" placeholder="Örn. São Paulo"></label><label>Hizmet<select name="service">${Object.entries(sv).map(([k, v]) => `<option value="${k}"${r?.service === k ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label></div>
    <label class="bmr-ok"><input type="checkbox" name="consent" required${r?.consent ? ' checked' : ''}> Yorumumun bu ad ve şehir bilgisiyle Brazil Migration web sitesinde yayınlanmasına izin veriyorum. İznimi dilediğim zaman geri alabilirim.</label>
    <div class="bmr-act"><button class="btn" type="submit">${r ? 'Yorumu güncelle' : 'Yorumu gönder'}</button><span class="bmr-msg" role="status" aria-live="polite"></span></div>
    ${r?.reply ? `<p class="bmr-reply"><b>Yanıtımız:</b> ${esc(r.reply)}</p>` : ''}</form></article>`;
  }
  function bind() {
    const f = document.getElementById('bmr-form'); if (!f || f.dataset.b) return; f.dataset.b = 1;
    f.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; const n = +b.dataset.r; f.rating.value = n; f.querySelectorAll('[data-r]').forEach(x => { const on = +x.dataset.r <= n; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); });
    f.addEventListener('submit', async e => {
      e.preventDefault(); const msg = f.querySelector('.bmr-msg'), btn = f.querySelector('[type=submit]');
      const body = {rating: +f.rating.value, text: f.text.value.trim(), name: f.name.value.trim(), city: f.city.value.trim(), service: f.service.value, consent: f.consent.checked};
      if (body.text.length < 20) { msg.textContent = 'Yorum en az 20 karakter olmalı.'; return; }
      if (!body.consent) { msg.textContent = 'Yayınlanması için izin kutusunu işaretleyin.'; return; }
      btn.disabled = true; msg.textContent = 'Gönderiliyor…';
      try { const r = await fetch('/api/workspace/testimonial', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)}); const d = await r.json().catch(() => ({})); if (!r.ok) throw Error(d.error || 'Gönderilemedi.');
        D.review = {...(D.review || {}), ...d.review}; document.getElementById('bm-review').outerHTML = card(); bind(); document.querySelector('#bm-review .bmr-msg').textContent = 'Teşekkürler! Yorumunuz onaylandıktan sonra yayınlanacak.'; }
      catch (err) { msg.textContent = err.message; btn.disabled = false; }
    });
  }
  async function place() {
    if ((location.hash || '#overview') !== '#overview') return;
    const root = document.getElementById('content'); if (!root || root.querySelector('#bm-review') || !root.querySelector('.metrics,.card')) return;
    if (!(await load())) return;
    if (root.querySelector('#bm-review')) return;
    root.insertAdjacentHTML('beforeend', card()); bind();
  }
  const css = document.createElement('style');
  css.textContent = '.bmr-form{display:grid;gap:14px}.bmr-form label{display:grid;gap:6px;font-size:13px;font-weight:600}.bmr-form textarea,.bmr-form input:not([type=checkbox]),.bmr-form select{font:inherit;font-weight:400;border:1px solid #d7dfd2;border-radius:10px;padding:10px 12px;background:#fff}.bmr-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.bmr-stars{display:flex;gap:4px}.bmr-s{border:0;background:none;font-size:28px;line-height:1;color:#d5dbd0;cursor:pointer;padding:0 2px}.bmr-s.on{color:#d4a017}.bmr-ok{display:flex!important;grid-template-columns:none;gap:8px!important;align-items:flex-start;font-weight:400!important;color:#5d6c61}.bmr-ok input{margin-top:3px}.bmr-act{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.bmr-msg{font-size:13.5px;color:#1b5e20}.bmr-reply{background:#f3f8ef;border-left:3px solid #1b5e20;border-radius:8px;padding:10px 14px;margin:0;font-size:14px}@media(max-width:760px){.bmr-row{grid-template-columns:1fr}}';
  document.head.appendChild(css);
  const mo = new MutationObserver(() => { clearTimeout(mo.t); mo.t = setTimeout(place, 120); });
  const start = () => { const c = document.getElementById('content'); if (c) mo.observe(c, {childList: true}); place(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
