'use strict';
// Müşteri paneli: ödenmemiş faturalar için havale/EFT ile ödeme bilgisi (Admin → Ödeme Altyapıları → Banka Havalesi).
(() => {
  let methods = null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const money = (v, c) => { try { return new Intl.NumberFormat('tr-TR', {style: 'currency', currency: c || 'USD'}).format((Number(v) || 0) / 100); } catch { return v + ' ' + c; } };
  const load = () => methods ??= fetch('/api/auth/payment-methods', {cache: 'no-store'}).then(r => r.ok ? r.json() : {methods: []}).then(d => d.methods || []).catch(() => []);
  const css = `.bm-pay-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid #1b5e20;color:#1b5e20;background:#fff;border-radius:9px;padding:8px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.bm-pay-btn:hover{background:#eef6ea}
  .bm-pay-ov{position:fixed;inset:0;z-index:9999;background:rgba(10,25,18,.45);display:grid;place-items:center;padding:16px}.bm-pay{background:#fff;color:#183b2c;border-radius:18px;max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:24px 24px 20px;box-shadow:0 30px 80px rgba(0,0,0,.3);font-family:inherit}
  .bm-pay h2{margin:0 0 4px;font-size:19px}.bm-pay .sub{color:#68776b;font-size:13px;margin:0 0 16px}.bm-pay .amt{display:flex;justify-content:space-between;background:#f3f7ef;border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:14px}.bm-pay .amt b{font-size:18px}
  .bm-acc{border:1px solid #dfe5d8;border-radius:12px;padding:12px 14px;margin-bottom:10px;font-size:13.5px;display:grid;gap:4px}.bm-acc .iban{display:flex;justify-content:space-between;gap:10px;align-items:center;font-family:ui-monospace,Menlo,monospace;font-size:13px;background:#f7f9f5;border-radius:8px;padding:8px 10px}
  .bm-acc button,.bm-pay .ref button{border:1px solid #dfe5d8;background:#fff;border-radius:7px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer}.bm-pay .ref{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px;margin:6px 0 12px}
  .bm-pay .note{font-size:13px;line-height:1.6;color:#4d5f53;background:#fff8e6;border-radius:10px;padding:10px 12px;margin:0 0 14px}.bm-pay .acts{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.bm-pay .acts a,.bm-pay .acts button{border-radius:9px;padding:10px 16px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;border:1px solid #dfe5d8;background:#fff;color:#183b2c}.bm-pay .acts a{background:#1b5e20;border-color:#1b5e20;color:#fff}
  [data-theme=dark] .bm-pay{background:#14241c;color:#e2ece4}[data-theme=dark] .bm-pay .amt,[data-theme=dark] .bm-acc .iban{background:#18291f}[data-theme=dark] .bm-acc{border-color:#304238}[data-theme=dark] .bm-pay .note{background:#2c2614;color:#e2ece4}`;
  const copy = async (t, b) => { try { await navigator.clipboard.writeText(t); } catch {} const o = b.textContent; b.textContent = 'Kopyalandı'; setTimeout(() => b.textContent = o, 1400); };
  function open(el, havale) {
    const ref = 'FTR-' + el.dataset.bmPay.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
    const cur = el.dataset.cur || 'USD';
    const accs = (havale.accounts || []).slice().sort((a, b) => (b.currency === cur) - (a.currency === cur));
    const ov = document.createElement('div'); ov.className = 'bm-pay-ov';
    ov.innerHTML = `<div class="bm-pay" role="dialog" aria-modal="true" aria-label="Havale ile ödeme"><h2>Havale / EFT ile ödeme</h2><p class="sub">${esc(el.dataset.title || 'Fatura')}</p>
      <div class="amt"><span>Ödenecek tutar</span><b>${esc(money(el.dataset.amount, cur))}</b></div>
      <div class="ref"><span>Açıklamaya yazın: <b>${ref}</b></span><button type="button" data-c="${ref}">Kopyala</button></div>
      ${accs.map(a => `<div class="bm-acc"><b>${esc(a.bank)}${a.currency ? ' · ' + esc(a.currency) : ''}</b><span>${esc(a.holder)}</span><div class="iban"><span>${esc(a.iban.replace(/(.{4})/g, '$1 ').trim())}</span><button type="button" data-c="${esc(a.iban)}">Kopyala</button></div></div>`).join('')}
      ${havale.note ? `<p class="note">${esc(havale.note)}</p>` : ''}
      <p class="sub">Ödemenizi yaptıktan sonra dekontu <b>Dosyalarım</b> bölümünden yükleyin. Ödeme ekibimiz tarafından onaylanınca fatura “Ödendi” olarak görünür.</p>
      <div class="acts"><button type="button" data-x>Kapat</button><a href="#documents" data-x>Dekontu yükle</a></div></div>`;
    ov.addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (c) return copy(c.dataset.c, c); if (e.target === ov || e.target.closest('[data-x]')) ov.remove(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { ov.remove(); document.removeEventListener('keydown', k); } });
    document.body.appendChild(ov);
  }
  async function enhance() {
    const els = [...document.querySelectorAll('[data-bm-pay]:not([data-done])')]; if (!els.length) return;
    els.forEach(e => e.dataset.done = '1');
    const havale = (await load()).find(m => m.id === 'havale'); if (!havale) return;
    if (!document.getElementById('bm-pay-css')) { const s = document.createElement('style'); s.id = 'bm-pay-css'; s.textContent = css; document.head.appendChild(s); }
    for (const el of els) { const b = document.createElement('button'); b.type = 'button'; b.className = 'bm-pay-btn'; b.textContent = 'Havale / EFT ile öde'; b.onclick = () => open(el, havale); el.replaceWith(b); Object.assign(b.dataset, {bmPay: el.dataset.bmPay, amount: el.dataset.amount, cur: el.dataset.cur, title: el.dataset.title, done: '1'}); b.onclick = () => open(b, havale); }
  }
  new MutationObserver(enhance).observe(document.documentElement, {childList: true, subtree: true});
  if (document.readyState !== 'loading') enhance(); else document.addEventListener('DOMContentLoaded', enhance);
})();
