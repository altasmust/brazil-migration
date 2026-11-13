'use strict';
// Telefon alanı: ülke kodu seçimi + ülkeye göre hane sınırı. <input type="tel" data-phone> otomatik dönüştürülür;
// özgün input (name="phone") gizli kalır ve "+90 5321234567" biçiminde değeri tutar.
(() => {
  // [ad, çağrı kodu, en az hane, en çok hane]
  const C = [['Türkiye', '90', 10, 10], ['Brezilya', '55', 10, 11], ['Portekiz', '351', 9, 9], ['Azerbaycan', '994', 9, 9], ['Kuzey Makedonya', '389', 8, 8], ['Rusya', '7', 10, 10], ['İspanya', '34', 9, 9], ['İran', '98', 10, 10], ['Suudi Arabistan', '966', 9, 9], ['Türkmenistan', '993', 8, 8], ['Özbekistan', '998', 9, 9], ['Kırgızistan', '996', 9, 9], ['Endonezya', '62', 9, 12],
    ['Almanya', '49', 10, 11], ['Amerika Birleşik Devletleri / Kanada', '1', 10, 10], ['Birleşik Krallık', '44', 10, 10], ['Fransa', '33', 9, 9], ['İtalya', '39', 9, 10], ['Hollanda', '31', 9, 9], ['Belçika', '32', 8, 9], ['İsviçre', '41', 9, 9], ['Avusturya', '43', 10, 11], ['Yunanistan', '30', 10, 10], ['Bulgaristan', '359', 8, 9], ['Romanya', '40', 9, 9], ['Gürcistan', '995', 9, 9], ['Ermenistan', '374', 8, 8], ['Kazakistan', '7', 10, 10], ['Ukrayna', '380', 9, 9], ['Irak', '964', 10, 10], ['Suriye', '963', 9, 9], ['Lübnan', '961', 7, 8], ['Ürdün', '962', 9, 9], ['Mısır', '20', 10, 10], ['Birleşik Arap Emirlikleri', '971', 9, 9], ['Katar', '974', 8, 8], ['Kuveyt', '965', 8, 8], ['Afganistan', '93', 9, 9], ['Pakistan', '92', 10, 10], ['Hindistan', '91', 10, 10], ['Çin', '86', 11, 11], ['Japonya', '81', 10, 10], ['Güney Kore', '82', 9, 10], ['Tayland', '66', 9, 9], ['Arjantin', '54', 10, 11], ['Şili', '56', 9, 9], ['Kolombiya', '57', 10, 10], ['Meksika', '52', 10, 10], ['Paraguay', '595', 9, 9], ['Uruguay', '598', 8, 9], ['Angola', '244', 9, 9], ['Mozambik', '258', 9, 9], ['Güney Afrika', '27', 9, 9], ['Nijerya', '234', 10, 10], ['Avustralya', '61', 9, 9]];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const byCode = [...C].sort((a, b) => b[1].length - a[1].length);
  function parse(v, def) {
    v = String(v || '').trim();
    if (v.startsWith('+')) { const d = v.slice(1).replace(/\D/g, ''); const c = byCode.find(x => d.startsWith(x[1])); if (c) return [C.indexOf(c), d.slice(c[1].length)]; }
    return [def, v.replace(/\D/g, '')];
  }
  function mount(inp) {
    if (inp.dataset.phoneReady) return; inp.dataset.phoneReady = '1';
    const def = Math.max(0, C.findIndex(x => x[0] === (inp.dataset.country || 'Türkiye')));
    const [ci0, num0] = parse(inp.value, def);
    const box = document.createElement('div'); box.className = 'phone-field';
    box.innerHTML = `<div class="pf-row"><select aria-label="Ülke kodu">${C.map((c, i) => `<option value="${i}">${esc(c[0])} (+${c[1]})</option>`).join('')}</select><input type="tel" inputmode="numeric" autocomplete="tel-national" aria-label="Telefon numarası"></div><small></small>`;
    const sel = box.querySelector('select'), num = box.querySelector('input'), hint = box.querySelector('small');
    sel.value = String(ci0); num.value = num0;
    inp.style.display = 'none'; inp.removeAttribute('required'); inp.after(box);
    const sync = () => {
      const c = C[+sel.value]; num.value = num.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, c[3]); num.maxLength = c[3]; num.placeholder = '5'.repeat(1) + '0'.repeat(c[2] - 1);
      hint.textContent = c[2] === c[3] ? `${c[3]} haneli numara girin (başına 0 koymayın).` : `${c[2]}–${c[3]} haneli numara girin (başına 0 koymayın).`;
      const ok = !num.value || num.value.length >= c[2];
      num.setCustomValidity(ok ? '' : `Numara en az ${c[2]} haneli olmalı.`);
      inp.value = num.value ? `+${c[1]} ${num.value}` : '';
      inp.dispatchEvent(new Event('input', {bubbles: true}));
    };
    sel.addEventListener('change', sync); num.addEventListener('input', sync); sync();
  }
  const scan = (root = document) => root.querySelectorAll?.('input[data-phone]').forEach(mount);
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches?.('input[data-phone]')) mount(n); else scan(n); } }).observe(document.documentElement, {childList: true, subtree: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan()); else scan();
  window.BMPhone = {mount, scan, countries: C};
})();
