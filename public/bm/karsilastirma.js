'use strict';
// Türkiye (İstanbul) – Brezilya (São Paulo) karşılaştırması. Fiyatlar USD; canlı kur ve hava durumu tarayıcıda çekilir.
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let FX = {TRY: 49.77, BRL: 5.30, date: '26.10.2026 (yaklaşık)', live: false}; // 1 USD karşılığı
  const usd = n => '$' + Math.round(n).toLocaleString('tr-TR');
  const loc = (n, c) => c === 'TRY' ? '₺' + Math.round(n * FX.TRY).toLocaleString('tr-TR') : 'R$ ' + Math.round(n * FX.BRL).toLocaleString('tr-TR');

  // [kalem, İstanbul USD, São Paulo USD, not]
  const COST = {
    ev: {title: 'Ev ve kira', icon: '🏠', rows: [['1+1 kira, merkez (aylık)', 894, 649], ['1+1 kira, merkez dışı (aylık)', 548, 405], ['3+1 kira, merkez (aylık)', 1617, 1195], ['Daire satın alma, merkez (m²)', 3154, 2685]]},
    araba: {title: 'Araba ve ulaşım', icon: '🚗', rows: [['Toyota Corolla, sıfır (en uygun paket)', 2545500 / 49.77, 158991 / 5.30, 'TR liste fiyatı 2.545.500 ₺ (Eylül 2026) · BR FIPE R$ 158.991 (Ekim 2026)'], ['Benzin (1 litre)', 1.34, 1.21], ['Aylık toplu taşıma kartı', 60, 44.4]]},
    elektronik: {title: 'Elektronik eşya', icon: '📱', rows: [['iPhone 17 (giriş modeli, lansman)', 11658.85 / 5.30, 7999 / 5.30, 'Brezilya R$ 7.999 · Türkiye’de karşılığı ≈ R$ 11.659 (Canaltech karşılaştırması)']], note: 'İki ülkede de ithal elektronik yüksek vergilidir; Brezilya’da iPhone dünyanın en pahalı ikinci, Türkiye’de en pahalı ülkeler arasındadır.'},
    gida: {title: 'Gıda ve market', icon: '🛒', rows: [['Restoranda öğle menüsü', 10, 7.66], ['İki kişilik akşam yemeği', 47.9, 42.5], ['Dana eti (1 kg)', 21.5, 10.7], ['Tavuk göğsü (1 kg)', 6.25, 5.23], ['Süt (1 litre)', 1.17, 1.14], ['Ekmek (500 g)', 0.73, 1.56], ['Yumurta (12 adet)', 2.52, 2.77], ['Pirinç (1 kg)', 1.71, 1.23], ['Peynir (1 kg)', 10.2, 12.7]]},
    fatura: {title: 'Faturalar', icon: '💡', rows: [['Elektrik, su, ısınma (aile, aylık)', 83.7, 97.4], ['Elektrik, su, ısınma (tek kişi, aylık)', 54.4, 64.6], ['Ev interneti 50 Mbps+ (aylık)', 15.4, 20.2]]},
    yasam: {title: 'Genel yaşam', icon: '📊', rows: [['Aylık toplam gider, tek kişi (kira hariç)', 1328, 1126], ['Aylık toplam gider, aile', 3415, 2856], ['Ortalama net maaş (aylık)', 1177, 843, 'Yüksek değer bu satırda avantajdır'], ['Kreş / anaokulu (aylık)', 1014, 486], ['Uluslararası ilkokul (yıllık)', 23206, 15990], ['Doktor muayenesi (özel)', 61.2, 48.1]]},
  };

  const SYSTEMS = [
    {id: 'saglik', icon: '🩺', title: 'Sağlık sistemi', tr: ['SGK / Genel Sağlık Sigortası ile kamu hastaneleri ve şehir hastaneleri', 'İkamet izinli yabancılar için sağlık sigortası zorunlu', 'Özel hastane ağı geniş, sağlık turizmi güçlü'], br: ['SUS: herkese ücretsiz, evrensel kamu sağlık sistemi — yabancılar dahil', 'Aşı, acil ve birinci basamak hizmetler ücretsiz', 'Büyük şehirlerde özel sağlık planları (plano de saúde) yaygın'], verdict: 'Brezilya’nın SUS sistemi sigorta şartı olmadan herkese açıktır; özel hizmet kalitesi iki ülkede de yüksektir.'},
    {id: 'egitim', icon: '🎓', title: 'Eğitim sistemi', tr: ['Devlet okulları ücretsiz, 12 yıl zorunlu eğitim', 'Devlet üniversiteleri düşük harçlı; yabancılara farklı ücret uygulanabilir', 'Uluslararası okul seçeneği İstanbul’da geniş'], br: ['Devlet okulları ücretsiz; 4–17 yaş arası eğitim zorunlu', 'Federal ve eyalet üniversiteleri ücretsiz (ENEM / vestibular ile giriş)', 'São Paulo’da USP ve Unicamp gibi Latin Amerika’nın önde gelen üniversiteleri'], verdict: 'Brezilya’da kamu üniversiteleri tamamen ücretsizdir; okul öncesi ve uluslararası okul maliyeti São Paulo’da daha düşüktür.'},
    {id: 'vergi', icon: '🧾', title: 'Vergi yükü', tr: ['Gelir vergisi %15–%40 (2026: 190.000 ₺’ye kadar %15, 5,3 milyon ₺ üzeri %40)', 'KDV genel oran %20', 'SGK işçi payı yaklaşık %14 + işsizlik %1'], br: ['Gelir vergisi %0–%27,5; 2026’dan itibaren aylık R$ 5.000’a kadar gelir fiilen muaf (Lei 15.270/2025)', 'Tüketim vergileri (ICMS, PIS/COFINS, IPI) fiyata gömülü ve yüksek; 2026’da CBS/IBS reformuna geçiş başladı', 'INSS çalışan payı %7,5–%14'], verdict: 'Brezilya’da gelir vergisi orta gelirde daha düşüktür; buna karşılık ürün fiyatlarındaki tüketim vergisi yükü yüksektir.'},
    {id: 'dijital', icon: '📲', title: 'Dijital yaşam ve teknoloji', tr: ['e-Devlet ile çoğu kamu işlemi çevrim içi', 'Mobil bankacılık ve FAST anlık ödeme yaygın', 'Fiber internet büyük şehirlerde yaygın, fiyatlar düşük'], br: ['Pix: ücretsiz, 7/24 anlık ödeme — nüfusun büyük çoğunluğu kullanıyor', 'gov.br ile dijital kimlik ve kamu hizmetleri', 'Nubank gibi dijital bankalar ve geniş fiber altyapı'], verdict: 'İki ülke de dijital hizmetlerde güçlü; Brezilya’nın Pix sistemi günlük ödemelerde nakit ve kartın yerini almış durumda.'},
  ];

  const CLIMATE = {
    tr: {city: 'İstanbul', lat: 41.01, lon: 28.98, avg: '≈ 15 °C', summer: '24–29 °C', winter: '3–9 °C, ara sıra kar', note: 'Dört mevsim; nemli yazlar ve soğuk, yağışlı kışlar.'},
    br: {city: 'São Paulo', lat: -23.55, lon: -46.63, avg: '≈ 20 °C', summer: '19–28 °C, yağışlı', winter: '12–23 °C, kuru', note: 'Ilıman subtropikal; kış yumuşak, yaz yağmurlu. Mevsimler Türkiye’nin tersidir.'},
  };

  // [kategori, TR puan, BR puan, varsayılan ağırlık]
  const SCORE = [['Ev ve kira', 5, 7, 3], ['Araba ve ulaşım', 4, 7, 2], ['Elektronik', 4, 5, 1], ['Gıda', 6, 7, 2], ['Faturalar', 7, 6, 1], ['Sağlık', 7, 8, 3], ['Eğitim', 6, 7, 2], ['Vergi yükü', 5, 6, 2], ['Dijital yaşam', 7, 8, 1], ['İklim', 6, 8, 1], ['Para birimi istikrarı', 3, 6, 2]];

  function costTable(key) {
    const c = COST[key];
    return `<div class="tb-table">${c.rows.map(([name, tr, br, note]) => {
      const better = key === 'yasam' && name.startsWith('Ortalama net maaş') ? (tr > br ? 'tr' : 'br') : (tr < br ? 'tr' : 'br');
      const max = Math.max(tr, br), diff = Math.round(Math.abs(tr - br) / Math.min(tr, br) * 100);
      return `<div class="tb-row"><div class="tb-name">${esc(name)}${note ? `<small>${esc(note)}</small>` : ''}</div>
        <div class="tb-val tr ${better === 'tr' ? 'win' : ''}"><b>${usd(tr)}</b><small>${loc(tr, 'TRY')}</small><i style="width:${Math.round(tr / max * 100)}%"></i></div>
        <div class="tb-val br ${better === 'br' ? 'win' : ''}"><b>${usd(br)}</b><small>${loc(br, 'BRL')}</small><i style="width:${Math.round(br / max * 100)}%"></i></div>
        <div class="tb-diff">${diff ? `<span class="${better}">${better === 'br' ? '🇧🇷' : '🇹🇷'} %${diff} ${key === 'yasam' && name.startsWith('Ortalama') ? 'yüksek' : 'uygun'}</span>` : '—'}</div></div>`;
    }).join('')}</div>${c.note ? `<p class="tb-note">${esc(c.note)}</p>` : ''}`;
  }
  function renderCosts(active = 'ev') {
    $('#tb-tabs').innerHTML = Object.entries(COST).map(([k, c]) => `<button class="${k === active ? 'on' : ''}" data-tab="${k}">${c.icon} ${esc(c.title)}</button>`).join('');
    $('#tb-costs').innerHTML = `<div class="tb-head"><span>Kalem</span><span>🇹🇷 İstanbul</span><span>🇧🇷 São Paulo</span><span>Fark</span></div>${costTable(active)}`;
  }
  function renderSystems() {
    $('#tb-systems').innerHTML = SYSTEMS.map(s => `<article class="tb-sys" id="${s.id}"><h3>${s.icon} ${esc(s.title)}</h3><div class="tb-sys-grid"><div><span class="tb-flag">🇹🇷 Türkiye</span><ul>${s.tr.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div><span class="tb-flag">🇧🇷 Brezilya</span><ul>${s.br.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div><p class="tb-verdict">💡 ${esc(s.verdict)}</p></article>`).join('');
  }
  function renderClimate(live = {}) {
    $('#tb-climate').innerHTML = ['tr', 'br'].map(k => { const c = CLIMATE[k], l = live[k]; return `<article class="tb-wx"><div class="tb-wx-top"><div><span class="tb-flag">${k === 'tr' ? '🇹🇷' : '🇧🇷'} ${c.city}</span><b class="tb-temp">${l ? Math.round(l.t) + ' °C' : '—'}</b><small>${l ? 'Şu an · ' + esc(l.desc) : 'Canlı hava durumu yükleniyor…'}</small></div><span class="tb-wx-ico">${l ? l.icon : '⛅'}</span></div><dl><dt>Yıllık ortalama</dt><dd>${c.avg}</dd><dt>Yaz</dt><dd>${c.summer}</dd><dt>Kış</dt><dd>${c.winter}</dd></dl><p>${esc(c.note)}</p></article>`; }).join('');
  }
  function renderFx() {
    const brlTry = FX.TRY / FX.BRL;
    $('#tb-fx').innerHTML = `<div class="tb-fx-rates"><div><span>1 R$ (Brezilya reali)</span><b>₺${brlTry.toFixed(2).replace('.', ',')}</b></div><div><span>1 USD</span><b>₺${FX.TRY.toFixed(2).replace('.', ',')} · R$ ${FX.BRL.toFixed(2).replace('.', ',')}</b></div><div><span>1.000 ₺</span><b>R$ ${(1000 / brlTry).toFixed(0)}</b></div></div>
      <div class="tb-conv"><label>Tutar<input id="tb-amt" type="number" min="0" value="10000"></label><label>Para birimi<select id="tb-cur"><option value="TRY">₺ Türk lirası</option><option value="BRL">R$ Brezilya reali</option></select></label><div class="tb-conv-out" id="tb-out"></div></div>
      <p class="tb-note">${FX.live ? 'Canlı kur (Avrupa Merkez Bankası referansı), ' : 'Yaklaşık kur, '}tarih: ${esc(FX.date)}. Türk lirası yüksek enflasyon nedeniyle hızlı değer kaybediyor; Brezilya Merkez Bankası’nın enflasyon hedefi %3’tür.</p>`;
    const calc = () => { const a = Number($('#tb-amt').value) || 0, cur = $('#tb-cur').value; $('#tb-out').innerHTML = cur === 'TRY' ? `<b>R$ ${(a / brlTry).toLocaleString('tr-TR', {maximumFractionDigits: 2})}</b><small>≈ $${(a / FX.TRY).toLocaleString('tr-TR', {maximumFractionDigits: 0})}</small>` : `<b>₺${(a * brlTry).toLocaleString('tr-TR', {maximumFractionDigits: 2})}</b><small>≈ $${(a / FX.BRL).toLocaleString('tr-TR', {maximumFractionDigits: 0})}</small>`; };
    $('#tb-amt').oninput = calc; $('#tb-cur').onchange = calc; calc();
  }
  function renderScore() {
    const w = SCORE.map((r, i) => Number(document.querySelector(`[data-w="${i}"]`)?.value ?? r[3]));
    const tot = w.reduce((a, b) => a + b, 0) || 1;
    const tr = SCORE.reduce((a, r, i) => a + r[1] * w[i], 0) / tot, br = SCORE.reduce((a, r, i) => a + r[2] * w[i], 0) / tot;
    $('#tb-score-sum').innerHTML = `<div class="tb-big tr"><span>🇹🇷 Türkiye</span><b>${tr.toFixed(1)}</b><small>/ 10</small></div><div class="tb-vs">VS</div><div class="tb-big br"><span>🇧🇷 Brezilya</span><b>${br.toFixed(1)}</b><small>/ 10</small></div>`;
    if (!document.querySelector('[data-w]')) {
      $('#tb-score-rows').innerHTML = SCORE.map(([n, a, b, d], i) => `<div class="tb-sc"><span class="n">${esc(n)}</span><span class="bars"><i class="tr" style="width:${a * 10}%">${a}</i><i class="br" style="width:${b * 10}%">${b}</i></span><label title="Sizin için önemi">Önem <input type="range" min="0" max="3" step="1" value="${d}" data-w="${i}"></label></div>`).join('');
      document.querySelectorAll('[data-w]').forEach(r => r.oninput = renderScore);
    }
    const hero = $('#tb-hero-score'); if (hero) hero.innerHTML = `<span>🇹🇷 ${tr.toFixed(1)}</span><em>genel skor</em><span>🇧🇷 ${br.toFixed(1)}</span>`;
  }

  document.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) renderCosts(t.dataset.tab); });
  renderCosts(); renderSystems(); renderClimate(); renderFx(); renderScore();

  // canlı kur
  fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY,BRL').then(r => r.json()).then(d => { if (d?.rates?.TRY && d.rates.BRL) { FX = {TRY: d.rates.TRY, BRL: d.rates.BRL, date: new Date(d.date).toLocaleDateString('tr-TR'), live: true}; renderFx(); const a = document.querySelector('#tb-tabs .on')?.dataset.tab; renderCosts(a || 'ev'); } }).catch(() => {});
  // canlı hava durumu (Open-Meteo)
  const WMO = c => c === 0 ? ['☀️', 'Açık'] : c <= 2 ? ['🌤️', 'Az bulutlu'] : c === 3 ? ['☁️', 'Bulutlu'] : c <= 48 ? ['🌫️', 'Sisli'] : c <= 67 ? ['🌧️', 'Yağmurlu'] : c <= 77 ? ['❄️', 'Karlı'] : c <= 82 ? ['🌦️', 'Sağanak'] : ['⛈️', 'Fırtınalı'];
  const live = {};
  Promise.all(['tr', 'br'].map(k => fetch(`https://api.open-meteo.com/v1/forecast?latitude=${CLIMATE[k].lat}&longitude=${CLIMATE[k].lon}&current=temperature_2m,weather_code`).then(r => r.json()).then(d => { const [icon, desc] = WMO(d.current.weather_code); live[k] = {t: d.current.temperature_2m, icon, desc}; }).catch(() => {}))).then(() => renderClimate(live));
})();
