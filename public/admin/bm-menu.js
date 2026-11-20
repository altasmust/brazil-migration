/* Yönetim paneli üst menüsü: dağınık 15 başlığı 9 mantıklı gruba toplar.
   Mevcut bağlantıları (href / düğme) yerinde taşır; bu yüzden yetki, rozet ve rota davranışı değişmez.
   Başka modüller menüye sonradan (gecikmeli) bağlantı eklerse gözlemci bunları da doğru gruba taşır. */
(() => {
  const nav = document.getElementById('navigation');
  if (!nav) return;

  // [grup adı, [[bölüm başlığı, [[anahtar, isteğe bağlı yeni etiket], ...]], ...]]
  const PLAN = [
    ['Müşteriler', [
      ['Müşteri', [['customers'], ['yeni']]],
      ['Başvuru ve talepler', [['gorusmeler'], ['degerlendirmeler'], ['partnerler'], ['krediler']]]
    ]],
    ['Dosyalar', [
      ['Dosya takibi', [['dosyapano'], ['gorevpano'], ['sureler'], ['sablonlar', 'Dosya Şablonları']]],
      ['Kişisel', [['notes'], ['reminders'], ['tasks']]]
    ]],
    ['Satış', [
      ['Satış hattı', [['adaylar'], ['teklifler'], ['sozlesmeler'], ['odemeplani']]],
      ['Faturalandırma', [['invoices'], ['payments']]]
    ]],
    ['İletişim', [
      ['Mesajlaşma', [['gelenkutusu'], ['mesajsablonlari'], ['aiasistan']]],
      ['Destek', [['support'], ['konular']]]
    ]],
    ['Partner Ağı', [
      ['', [['ag'], ['yonlendirmeler'], ['firma-dizini']]]
    ]],
    ['Raporlar', [
      ['', [['raporlar'], ['analytics', 'Ziyaretçi Analitiği']]]
    ]],
    ['Site Yönetimi', [
      ['İçerik', [['sayfalar'], ['blog']]],
      ['Görünüm', [['menu'], ['ikonlar'], ['theme'], ['diller']]],
      ['Pazarlama', [['yorumlar'], ['aboneler'], ['fiyatlar']]]
    ]],
    ['Güven ve Uyum', [
      ['', [['security'], ['guvenlik', 'Hesap Güvenliği'], ['gizlilik'], ['audit']]]
    ]],
    ['Ayarlar', [
      ['Firma', [['general'], ['plan'], ['firmalar'], ['moduller']]],
      ['Ekip', [['staff'], ['permissions']]],
      ['Sistem', [['durum'], ['yedekler'], ['guncellemeler'], ['api']]]
    ]]
  ];
  const FALLBACK = 'Diğer';

  const keyOf = el => {
    if (el.tagName === 'A') { const h = el.getAttribute('href') || ''; return h.startsWith('#') ? h.slice(1) : h; }
    return 'btn:' + (el.dataset.action || '') + ':' + (el.dataset.type || '');
  };
  const planned = new Set(PLAN.flatMap(([, secs]) => secs.flatMap(([, items]) => items.map(i => i[0]))));
  const labelOf = new Map();            // anahtar -> özgün etiket (rozetsiz metin ilk görüldüğünde saklanır)
  const secEls = new Map();             // "grup|bölüm" -> başlık öğesi (yeniden kullanılır)
  const groupEls = new Map();           // grup adı -> <details>
  let park = null, busy = false;

  const groupEl = name => {
    let d = groupEls.get(name);
    if (!d) {
      d = document.createElement('details');
      d.dataset.bmGroup = name;
      d.innerHTML = '<summary></summary><div class="dropdown"></div>';
      d.querySelector('summary').textContent = name;
      groupEls.set(name, d);
    }
    return d;
  };
  const secEl = (g, s) => {
    const k = g + '|' + s;
    let e = secEls.get(k);
    if (!e) { e = document.createElement('div'); e.className = 'bm-sec'; e.textContent = s; e.setAttribute('role', 'presentation'); secEls.set(k, e); }
    return e;
  };
  const relabel = (el, label) => {
    if (!label || el.dataset.bmLabeled === label) return;
    // yalnızca ilk metin düğümünü değiştir; rozet (<span class="bmc-count">) korunur
    const t = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (t) { t.textContent = label + (/\s$/.test(t.textContent) ? ' ' : ''); el.dataset.bmLabeled = label; }
  };

  function tidy() {
    if (busy) return;
    busy = true;
    obs.disconnect();
    try {
      // 1) tüm bağlantı/düğmeleri topla (bizim gruplarımızda olanlar dahil)
      const items = new Map();
      nav.querySelectorAll('.dropdown > a, .dropdown > button').forEach(el => { const k = keyOf(el); if (!items.has(k)) items.set(k, el); });

      // 2) eski (orijinal) grup başlıklarını park alanına al; referansları tutan modüller çalışmaya devam eder
      if (!park) { park = document.createElement('div'); park.id = 'bm-nav-park'; park.hidden = true; }
      [...nav.children].forEach(c => { if (c.tagName === 'DETAILS' && !c.dataset.bmGroup) park.appendChild(c); });

      // 3) planlanmayan (yeni eklenmiş) bağlantılar "Diğer" grubuna
      const extra = [...items.keys()].filter(k => !planned.has(k));
      const plan = extra.length ? [...PLAN, [FALLBACK, [['', extra.map(k => [k])]]]] : PLAN;

      // 4) grupları kur
      const order = [];
      plan.forEach(([gname, secs]) => {
        const d = groupEl(gname), dd = d.querySelector('.dropdown');
        const want = [];
        secs.forEach(([sname, list]) => {
          const els = list.map(([k, label]) => { const el = items.get(k); if (el && label) relabel(el, label); return el; }).filter(Boolean);
          if (!els.length) return;
          if (sname) want.push(secEl(gname, sname));
          want.push(...els);
        });
        if (!want.length) { d.remove(); return; }
        // yalnızca fark varsa DOM'u değiştir
        const cur = [...dd.children];
        if (cur.length !== want.length || cur.some((c, i) => c !== want[i])) dd.replaceChildren(...want);
        order.push(d);
      });
      // 5) sıralamayı uygula (park en sonda)
      const curOrder = [...nav.children].filter(c => c.dataset?.bmGroup);
      if (curOrder.length !== order.length || curOrder.some((c, i) => c !== order[i]) || nav.lastElementChild !== park) {
        order.forEach(d => nav.appendChild(d));
        nav.appendChild(park);
      }
      // 6) sağa hizalanacak son üç grup
      order.forEach((d, i) => d.classList.toggle('bm-right', i >= order.length - 3));
      mark();
    } finally {
      obs.observe(nav, {childList: true, subtree: true});
      busy = false;
    }
  }

  // Açık sayfanın grubunu vurgula
  function mark() {
    const h = (location.hash || '#').slice(1).split(/[/?]/)[0];
    nav.querySelectorAll('details[data-bm-group]').forEach(d => {
      const on = !!h && !!d.querySelector('.dropdown > a[href="#' + CSS.escape(h) + '"]');
      d.classList.toggle('bm-on', on);
    });
    nav.querySelectorAll('.dropdown > a.bm-cur').forEach(a => a.classList.remove('bm-cur'));
    if (h) nav.querySelector('.dropdown > a[href="#' + CSS.escape(h) + '"]')?.classList.add('bm-cur');
  }

  let timer = 0;
  const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(tidy, 30); });
  window.addEventListener('hashchange', mark);
  tidy();
})();
