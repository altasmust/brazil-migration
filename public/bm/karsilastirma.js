'use strict';
// Türkiye (İstanbul) – Brezilya (São Paulo) karşılaştırması. Fiyatlar USD; canlı kur ve hava durumu tarayıcıda çekilir.
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let FX = {TRY: 49.77, BRL: 5.30, date: '26.10.2026 (yaklaşık)', live: false}; // 1 USD karşılığı
  const usd = n => '$' + Math.round(n).toLocaleString('tr-TR');
  const loc = (n, c) => c === 'TRY' ? '₺' + Math.round(n * FX.TRY).toLocaleString('tr-TR') : 'R$ ' + Math.round(n * FX.BRL).toLocaleString('tr-TR');

  // [kalem, İstanbul USD, São Paulo USD, not]  score: [TR, BR] /10
  const COST = {
    ev: {title: 'Ev ve kira', short: 'Merkezde ve banliyöde kira, satın alma fiyatları ve kiralama kuralları.', score: [5, 7],
      rows: [['1+1 kira, merkez (aylık)', 894, 649], ['1+1 kira, merkez dışı (aylık)', 548, 405], ['3+1 kira, merkez (aylık)', 1617, 1195], ['Daire satın alma, merkez (m²)', 3154, 2685]],
      intro: ['Barınma, iki şehir arasındaki en büyük farkın görüldüğü kalem. São Paulo’da merkezi bir 1+1 daire, İstanbul’daki benzerinden ortalama dörtte bir daha ucuza kiralanıyor; aileler için 3+1 dairelerde aylık fark birkaç yüz doları buluyor.', 'Satın almada da São Paulo metrekare başına daha uygun. Ancak Brezilya’da kiraya ek olarak aylık site aidatı (condomínio) ve emlak vergisi (IPTU) ödendiğini, ilanlarda bu kalemlerin genellikle ayrı yazıldığını unutmayın.'],
      tr: ['Kira artışı yasal olarak son 12 ayın TÜFE ortalamasıyla sınırlı', 'Depozito en fazla üç aylık kira olabilir', 'Talep yüksek; merkezde boş daire bulmak ve kira pazarlığı zor'],
      br: ['Kefil (fiador), kira güvence sigortası (seguro fiança) veya en fazla üç aylık depozito (caução) istenir', 'Konut sözleşmeleri genellikle 30 ay; yıllık artış sözleşmedeki endekse (IGP-M veya IPCA) bağlı', 'Pinheiros, Vila Mariana, Moema ve Brooklin yabancıların sık tercih ettiği semtler'],
      tips: ['QuintoAndar gibi platformlar kefil istemeden dijital kiralama sunar.', 'İlan fiyatına condomínio ve IPTU’yu ekleyerek toplam aylık maliyeti hesaplayın.', 'Sözleşme imzalamadan önce CPF numaranızın hazır olması gerekir.']},
    araba: {title: 'Araba ve ulaşım', short: 'Sıfır araç fiyatları, yakıt, toplu taşıma ve araç vergileri.', score: [4, 7],
      rows: [['Toyota Corolla, sıfır (en uygun paket)', 2545500 / 49.77, 158991 / 5.30, 'TR liste fiyatı 2.545.500 ₺ (Eylül 2026) · BR FIPE R$ 158.991 (Ekim 2026)'], ['Benzin (1 litre)', 1.34, 1.21], ['Aylık toplu taşıma kartı', 60, 44.4]],
      intro: ['Araç sahibi olmak Brezilya’da belirgin biçimde daha erişilebilir. Aynı Toyota Corolla, Türkiye’deki yüksek ÖTV nedeniyle dolar bazında São Paulo’dakinden yaklaşık yüzde 70 daha pahalı.', 'Yakıt fiyatları birbirine yakın; Brezilya’daki araçların çoğu benzin ve etanolle çalışabilen “flex” motorlu olduğu için pompada daha ucuz olanı seçebilirsiniz. Toplu taşımada São Paulo’nun metro, tren ve otobüs ağı tek kartla (Bilhete Único) kullanılıyor.'],
      tr: ['Sıfır araçta ÖTV ve KDV fiyatın büyük kısmını oluşturur', 'Yıllık Motorlu Taşıtlar Vergisi (MTV) araç yaşı ve değerine göre', 'İstanbul’da metro ağı büyüyor, trafik yoğun'],
      br: ['Araç fiyatları daha düşük; ikinci el piyasası FIPE tablosuyla şeffaf', 'São Paulo eyaletinde yıllık araç vergisi (IPVA) araç değerinin %4’ü civarında', 'Merkezde plakaya göre hafta içi trafik kısıtlaması (rodízio) uygulanır'],
      tips: ['Yabancı ehliyet Brezilya’da sınırlı süre geçerlidir; kalıcı ikamette CNH’ye dönüştürmeniz gerekir.', 'Araç alırken FIPE tablosundaki değeri pazarlık referansı olarak kullanın.', 'Uber ve 99 gibi uygulamalar São Paulo’da yaygın ve görece uygun.']},
    elektronik: {title: 'Elektronik eşya', short: 'Telefon ve elektronik fiyatları, ithalat vergileri ve alışveriş ipuçları.', score: [4, 5],
      rows: [['iPhone 17 (giriş modeli, lansman)', 11658.85 / 5.30, 7999 / 5.30, 'Brezilya R$ 7.999 · Türkiye’de karşılığı ≈ R$ 11.659 (Canaltech karşılaştırması)']],
      intro: ['Elektronik iki ülkede de pahalı. İthal ürünlere yüksek vergi uygulandığı için hem Türkiye hem Brezilya, iPhone’un dünyada en pahalı satıldığı ülkeler arasında. Yine de aynı model Türkiye’de Brezilya’dakinden yaklaşık yüzde 45 daha pahalı.', 'Brezilya’da yerel üretim yapılan bazı ürünlerde (Android telefonlar, televizyonlar) fiyatlar daha makul. Taksitli alışveriş (parcelado sem juros) çok yaygın ve çoğu mağaza faizsiz 10–12 taksit sunuyor.'],
      tr: ['Yurt dışından getirilen telefonlarda yüksek IMEI kayıt harcı', 'Kur dalgalanması fiyatlara hızla yansıyor', 'Kredi kartı taksitleri bazı kategorilerde sınırlı'],
      br: ['Yurt dışı sitelerden alışverişte ithalat vergisi ve eyalet vergisi (ICMS) ödenir', 'Faizsiz taksit (parcelado sem juros) neredeyse standart', 'Kasım’daki Black Friday döneminde büyük indirimler'],
      tips: ['Telefonunuzu Türkiye’den getirecekseniz Brezilya’da kullanmadan önce Anatel uyumunu kontrol edin.', 'Mercado Livre ve Amazon.com.br fiyat karşılaştırması için iyi başlangıç noktaları.', 'Büyük alımları Black Friday dönemine planlamak ciddi tasarruf sağlayabilir.']},
    gida: {title: 'Gıda ve market', short: 'Market sepeti, et ve süt ürünleri, restoran ve dışarıda yemek.', score: [6, 7],
      rows: [['Restoranda öğle menüsü', 10, 7.66], ['İki kişilik akşam yemeği', 47.9, 42.5], ['Dana eti (1 kg)', 21.5, 10.7], ['Tavuk göğsü (1 kg)', 6.25, 5.23], ['Süt (1 litre)', 1.17, 1.14], ['Ekmek (500 g)', 0.73, 1.56], ['Yumurta (12 adet)', 2.52, 2.77], ['Pirinç (1 kg)', 1.71, 1.23], ['Peynir (1 kg)', 10.2, 12.7]],
      intro: ['Market sepetinde iki şehir birbirine yakın, ancak kalem bazında farklar büyük. Brezilya dünyanın en büyük et üreticilerinden biri; dana eti São Paulo’da İstanbul’un neredeyse yarı fiyatına. Buna karşılık ekmek ve peynir İstanbul’da daha ucuz.', 'Dışarıda yemek São Paulo’da biraz daha uygun. Öğle saatlerinde “prato feito” veya kiloyla satan “por quilo” restoranlar uygun fiyatlı, doyurucu seçenekler sunuyor.'],
      tr: ['Ekmek, peynir ve sebze görece ucuz', 'Semt pazarları yaygın ve uygun', 'Gıda enflasyonu son yıllarda yüksek seyrediyor'],
      br: ['Et, tavuk, pirinç ve tropik meyveler uygun', 'Haftalık sokak pazarları (feira livre) her semtte', 'Çalışanlara yemek ve market kartı (vale-refeição / vale-alimentação) yaygın bir yan hak'],
      tips: ['Feira livre’lerde kapanışa yakın saatlerde fiyatlar düşer.', 'Atacadão ve Assaí gibi toptan marketler aileler için ciddi tasarruf sağlar.', 'Türk mutfağına özgü ürünleri São Paulo’daki Orta Doğu ve Ermeni marketlerinde bulabilirsiniz.']},
    fatura: {title: 'Faturalar', short: 'Elektrik, su, ısınma, internet ve mobil hat giderleri.', score: [7, 6],
      rows: [['Elektrik, su, ısınma (aile, aylık)', 83.7, 97.4], ['Elektrik, su, ısınma (tek kişi, aylık)', 54.4, 64.6], ['Ev interneti 50 Mbps+ (aylık)', 15.4, 20.2]],
      intro: ['Faturalar, İstanbul’un önde olduğu kategori. Ev giderleri ve internet São Paulo’da yüzde 15–30 arası daha pahalı. İstanbul’da kışın doğalgaz faturası artarken São Paulo’nun ılıman ikliminde ısınma ihtiyacı neredeyse hiç yok.', 'Brezilya’da elektrik tarifesi “bandeira tarifária” sistemine göre aydan aya değişebiliyor. Evlerde sıcak su genellikle elektrikli duşlarla (chuveiro elétrico) sağlandığı için elektrik faturası suyun önüne geçiyor.'],
      tr: ['Elektrik ve doğalgaz kısmen sübvansiyonlu', 'Kış aylarında ısınma faturası belirgin şekilde yükselir', 'Fiber internet ve mobil paketler uygun fiyatlı'],
      br: ['Elektrik tarifesi bandeira sistemine göre dalgalanır', 'Isınma gideri yok denecek kadar az; klima yaz aylarında devreye girer', 'Mobil operatörler: Vivo, Claro ve TIM'],
      tips: ['Kiraladığınız evde duşun elektrikli mi gazlı mı olduğunu sorun; fatura farkı önemli.', 'İnterneti mobil hatla paket olarak almak genellikle daha ucuzdur.', 'Fatura ödemeleri Pix veya banka uygulamasıyla saniyeler içinde yapılır.']},
    yasam: {title: 'Genel yaşam', short: 'Aylık toplam gider, maaşlar, kreş, okul ve özel sağlık.', score: [6, 7],
      rows: [['Aylık toplam yaşam gideri, tek kişi', 1328, 1126], ['Aylık toplam yaşam gideri, aile', 3415, 2856], ['Ortalama net maaş (aylık)', 1177, 843, 'Yüksek değer bu satırda avantajdır'], ['Kreş / anaokulu (aylık)', 1014, 486], ['Uluslararası ilkokul (yıllık)', 23206, 15990], ['Doktor muayenesi (özel)', 61.2, 48.1]],
      intro: ['Toplam tabloda São Paulo’da yaşamak, İstanbul’a göre yaklaşık yüzde 15 daha ucuz. Fark özellikle çocuklu ailelerde açılıyor: kreş São Paulo’da yarı fiyatına, uluslararası okullar ise yılda birkaç bin dolar daha uygun.', 'Öte yandan ortalama net maaş İstanbul’da daha yüksek. Bu nedenle Brezilya’ya taşınmayı düşünenler için gelirin nereden kazanıldığı belirleyici: Türkiye’den veya yurt dışından gelir elde etmeye devam edenler, São Paulo’nun düşük maliyetinden en çok faydalananlar oluyor.'],
      tr: ['Ortalama net maaş daha yüksek', 'Özel okul ve kreş maliyetleri yüksek', 'Yüksek enflasyon nedeniyle fiyatlar sık değişiyor'],
      br: ['Toplam yaşam maliyeti daha düşük', 'Kayıtlı çalışanlara 13. maaş ve izin ikramiyesi (férias + 1/3) yasal hak', 'Kreş ve okul giderleri belirgin şekilde uygun'],
      tips: ['Bütçenizi hem dolar hem reel bazında planlayın; kur farkı sonucu değiştirebilir.', 'Uzaktan çalışma veya yurt dışı gelirle taşınma seçeneklerini ön değerlendirmede inceleyin.', 'İlk aylar için en az üç aylık yaşam giderini rezerv olarak ayırın.']},
  };
  const KEYS = Object.keys(COST);

  // Kart illüstrasyonları (inline SVG): solda İstanbul, sağda São Paulo silueti, ortada kategori
  const ART = {
    ev: '<path d="M160 118 200 84l40 34v38h-80z" fill="#fff" stroke="#184d32" stroke-width="3"/><path d="M150 122 200 78l50 44" fill="none" stroke="#c0392b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><rect x="190" y="128" width="20" height="28" rx="2" fill="#2e7d32"/><rect x="168" y="124" width="14" height="13" rx="2" fill="#d7eca4" stroke="#184d32" stroke-width="2"/><rect x="218" y="124" width="14" height="13" rx="2" fill="#d7eca4" stroke="#184d32" stroke-width="2"/><g transform="translate(252 108) rotate(-30)"><circle r="9" fill="none" stroke="#e0b23f" stroke-width="4"/><path d="M9 0h20M23 0v7M29 0v6" stroke="#e0b23f" stroke-width="4" stroke-linecap="round"/></g>',
    araba: '<path d="M134 150h132" stroke="#184d32" stroke-width="3" stroke-dasharray="10 8" opacity=".5"/><path d="M146 138v-12c0-5 3-8 8-9l16-3 14-16c3-3 6-4 10-4h28c4 0 7 2 9 5l12 15 14 3c5 1 8 5 8 10v11z" fill="#2e7d32" stroke="#184d32" stroke-width="3" stroke-linejoin="round"/><path d="M178 113l10-12h18v12zM212 113v-12h14l9 12z" fill="#d7eca4"/><circle cx="172" cy="139" r="11" fill="#203e32" stroke="#fff" stroke-width="4"/><circle cx="234" cy="139" r="11" fill="#203e32" stroke="#fff" stroke-width="4"/><rect x="250" y="118" width="9" height="5" rx="2" fill="#e0b23f"/>',
    elektronik: '<rect x="146" y="90" width="84" height="54" rx="5" fill="#203e32" stroke="#184d32" stroke-width="3"/><rect x="152" y="96" width="72" height="42" rx="2" fill="#d7eca4"/><path d="M134 146h108l-6 8h-96z" fill="#2e7d32"/><rect x="232" y="82" width="34" height="66" rx="7" fill="#fff" stroke="#184d32" stroke-width="3"/><rect x="237" y="90" width="24" height="46" rx="2" fill="#2e7d32"/><circle cx="249" cy="142" r="2.5" fill="#184d32"/><path d="M170 124l10-10 8 7 14-15" fill="none" stroke="#184d32" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    gida: '<path d="M200 70c10 4 14 14 10 24-12-2-16-12-10-24z" fill="#2e7d32"/><circle cx="182" cy="102" r="14" fill="#c0392b"/><path d="M182 88c0-5 3-8 7-9" stroke="#184d32" stroke-width="3" fill="none"/><ellipse cx="220" cy="100" rx="22" ry="11" fill="#e0b23f" transform="rotate(-20 220 100)"/><path d="M146 112h108l-12 44h-84z" fill="#fff" stroke="#184d32" stroke-width="3" stroke-linejoin="round"/><path d="M146 112l20-24M254 112l-20-24" stroke="#184d32" stroke-width="4" stroke-linecap="round"/><path d="M170 124v22M190 124v22M210 124v22M230 124v22" stroke="#2e7d32" stroke-width="3" stroke-linecap="round"/>',
    fatura: '<rect x="172" y="76" width="64" height="82" rx="5" fill="#fff" stroke="#184d32" stroke-width="3"/><path d="M182 92h44M182 104h34M182 116h40M182 128h24" stroke="#2e7d32" stroke-width="4" stroke-linecap="round"/><rect x="200" y="138" width="28" height="10" rx="3" fill="#e0b23f"/><circle cx="152" cy="104" r="20" fill="#e0b23f" stroke="#184d32" stroke-width="3"/><path d="M145 124h14v10h-14z" fill="#184d32"/><path d="M146 104l6-8 6 8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M258 96c8 10 12 17 12 23a12 12 0 0 1-24 0c0-6 4-13 12-23z" fill="#3c8dbc" stroke="#184d32" stroke-width="3"/>',
    yasam: '<rect x="150" y="122" width="20" height="34" rx="3" fill="#c0392b" opacity=".85"/><rect x="176" y="104" width="20" height="52" rx="3" fill="#2e7d32"/><rect x="202" y="90" width="20" height="66" rx="3" fill="#184d32"/><path d="M146 156h84" stroke="#184d32" stroke-width="3" stroke-linecap="round"/><path d="M150 108l26-18 26 6 28-22" fill="none" stroke="#e0b23f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><g fill="#e0b23f" stroke="#184d32" stroke-width="2.5"><ellipse cx="252" cy="148" rx="16" ry="6"/><ellipse cx="252" cy="140" rx="16" ry="6"/><ellipse cx="252" cy="132" rx="16" ry="6"/></g>',
  };
  const thumb = k => `<svg class="tb-art" viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f3df"/><stop offset="1" stop-color="#f7fbf2"/></linearGradient></defs><rect width="400" height="170" fill="url(#g-${k})"/><circle cx="330" cy="40" r="20" fill="#f6d77a" opacity=".7"/>
    <g fill="#c0392b" opacity=".16"><path d="M20 150v-36a26 26 0 0 1 52 0v36z"/><rect x="10" y="60" width="5" height="90"/><path d="M8 62l4.5-14 4.5 14z"/><rect x="78" y="70" width="5" height="80"/><path d="M76 72l4.5-14 4.5 14z"/><path d="M90 150v-22a16 16 0 0 1 32 0v22z"/></g>
    <g fill="#1b8a3a" opacity=".18"><rect x="300" y="70" width="18" height="80"/><rect x="322" y="50" width="16" height="100"/><rect x="342" y="84" width="20" height="66"/><rect x="366" y="62" width="14" height="88"/><path d="M286 150c0-30 2-50 4-62M290 88c-10-6-20-4-26 2M290 88c8-8 20-8 26-2M290 88c-4-10-2-18 4-22" stroke="#1b8a3a" stroke-width="4" fill="none"/></g>
    <rect y="156" width="400" height="14" fill="#cfe5c0"/>${ART[k]}</svg>`;
  const ICON = {ev: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>', araba: '<path d="M5 16h14l-1.5-5.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5z"/><circle cx="8" cy="17" r="1.8"/><circle cx="16" cy="17" r="1.8"/>', elektronik: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>', gida: '<path d="M4 9h16l-2 10H6z"/><path d="M8 9l3-5M16 9l-3-5"/>', fatura: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>', yasam: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'};
  const ico = k => `<span class="tb-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg></span>`;

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
  const SCORE = [['Ev ve kira', 5, 7, 3], ['Araba ve ulaşım', 4, 7, 2], ['Elektronik', 4, 5, 1], ['Gıda', 6, 7, 2], ['Faturalar', 7, 6, 1], ['Genel yaşam', 6, 7, 2], ['Sağlık', 7, 8, 3], ['Eğitim', 6, 7, 2], ['Vergi yükü', 5, 6, 2], ['Dijital yaşam', 7, 8, 1], ['İklim', 6, 8, 1], ['Para birimi istikrarı', 3, 6, 2]];

  function costTable(key) {
    const c = COST[key];
    return `<div class="tb-head"><span>Kalem</span><span>🇹🇷 İstanbul</span><span>🇧🇷 São Paulo</span><span>Fark</span></div><div class="tb-table">${c.rows.map(([name, tr, br, note]) => {
      const hi = name.startsWith('Ortalama net maaş'), better = hi ? (tr > br ? 'tr' : 'br') : (tr < br ? 'tr' : 'br');
      const max = Math.max(tr, br), diff = Math.round(Math.abs(tr - br) / Math.min(tr, br) * 100);
      return `<div class="tb-row"><div class="tb-name">${esc(name)}${note ? `<small>${esc(note)}</small>` : ''}</div>
        <div class="tb-val tr ${better === 'tr' ? 'win' : ''}"><b>${usd(tr)}</b><small>${loc(tr, 'TRY')}</small><i style="width:${Math.round(tr / max * 100)}%"></i></div>
        <div class="tb-val br ${better === 'br' ? 'win' : ''}"><b>${usd(br)}</b><small>${loc(br, 'BRL')}</small><i style="width:${Math.round(br / max * 100)}%"></i></div>
        <div class="tb-diff">${diff ? `<span class="${better}">${better === 'br' ? '🇧🇷' : '🇹🇷'} %${diff} ${hi ? 'yüksek' : 'uygun'}</span>` : '—'}</div></div>`;
    }).join('')}</div>`;
  }
  const wins = k => { let t = 0, b = 0; COST[k].rows.forEach(([n, tr, br]) => (n.startsWith('Ortalama net maaş') ? tr > br : tr < br) ? t++ : b++); return [t, b]; };
  function renderCards() {
    $('#tb-cards').innerHTML = KEYS.map((k, i) => { const c = COST[k], [a, b] = c.score; return `<a class="tb-card2" href="#${k}" data-cat="${k}"><span class="tb-thumb">${thumb(k)}</span><span class="tb-arrow" aria-hidden="true">↗</span><span class="tb-meta">${ico(k)}<span class="tb-num">${String(i + 1).padStart(2, '0')}</span></span><h3>${esc(c.title)}</h3><p>${esc(c.short)}</p><span class="tb-mini"><span class="tr">🇹🇷 ${a}</span><span class="br">🇧🇷 ${b}</span><em>${a === b ? 'Berabere' : (b > a ? 'São Paulo önde' : 'İstanbul önde')}</em></span></a>`; }).join('');
  }
  function renderDetail(k) {
    const c = COST[k], [a, b] = c.score, [wt, wb] = wins(k), i = KEYS.indexOf(k), nx = KEYS[(i + 1) % KEYS.length], pv = KEYS[(i + KEYS.length - 1) % KEYS.length];
    const lead = a === b ? 'İki şehir bu kategoride başa baş.' : (b > a ? 'Bu kategoride São Paulo daha avantajlı.' : 'Bu kategoride İstanbul daha avantajlı.');
    $('#tb-detail').innerHTML = `<nav class="tb-back"><a href="#maliyet" data-back>← Tüm kategoriler</a><span>${KEYS.map(x => `<a href="#${x}" class="${x === k ? 'on' : ''}">${esc(COST[x].title)}</a>`).join('')}</span></nav>
      <article class="tb-det"><div class="tb-det-hd"><div class="tb-det-art">${thumb(k)}</div><div class="tb-det-tx"><span class="kicker">KATEGORİ ${String(i + 1).padStart(2, '0')} / ${String(KEYS.length).padStart(2, '0')}</span><h2>${esc(c.title)}</h2><p class="tb-det-lead">${esc(lead)}</p>
        <div class="tb-det-score"><div class="tr"><span>🇹🇷 İstanbul</span><b>${a}</b><small>/ 10</small></div><div class="br"><span>🇧🇷 São Paulo</span><b>${b}</b><small>/ 10</small></div><div class="w"><span>Kalem bazında</span><b>${wt} – ${wb}</b><small>İstanbul – São Paulo</small></div></div></div></div>
        <div class="tb-det-body">${c.intro.map(t => `<p>${esc(t)}</p>`).join('')}</div>
        <h3 class="tb-det-h">Fiyat karşılaştırması</h3><div class="tb-card">${costTable(k)}<p class="tb-note">Fiyatlar ortalamadır. Yerel para karşılıkları güncel kurla hesaplanır.</p></div>
        <div class="tb-sys-grid tb-det-pros"><div><span class="tb-flag">🇹🇷 Türkiye’de bilmeniz gerekenler</span><ul>${c.tr.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div><span class="tb-flag">🇧🇷 Brezilya’da bilmeniz gerekenler</span><ul>${c.br.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>
        <div class="tb-tips"><h3>💡 Taşınmadan önce ipuçları</h3><ol>${c.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>
        <nav class="tb-pn"><a href="#${pv}">← ${esc(COST[pv].title)}</a><a href="#${nx}">${esc(COST[nx].title)} →</a></nav></article>`;
  }
  function route(scroll) {
    const k = location.hash.slice(1), on = KEYS.includes(k);
    $('#tb-cards').hidden = on; $('#tb-detail').hidden = !on;
    $('#maliyet .tb-sec-hd').hidden = on;
    if (on) renderDetail(k);
    if (scroll && (on || k === 'maliyet')) $('#maliyet').scrollIntoView({behavior: 'smooth', block: 'start'});
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

  window.addEventListener('hashchange', () => route(true));
  renderCards(); route(KEYS.includes(location.hash.slice(1))); renderSystems(); renderClimate(); renderFx(); renderScore();

  // canlı kur
  fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY,BRL').then(r => r.json()).then(d => { if (d?.rates?.TRY && d.rates.BRL) { FX = {TRY: d.rates.TRY, BRL: d.rates.BRL, date: new Date(d.date).toLocaleDateString('tr-TR'), live: true}; renderFx(); route(false); } }).catch(() => {});
  // canlı hava durumu (Open-Meteo)
  const WMO = c => c === 0 ? ['☀️', 'Açık'] : c <= 2 ? ['🌤️', 'Az bulutlu'] : c === 3 ? ['☁️', 'Bulutlu'] : c <= 48 ? ['🌫️', 'Sisli'] : c <= 67 ? ['🌧️', 'Yağmurlu'] : c <= 77 ? ['❄️', 'Karlı'] : c <= 82 ? ['🌦️', 'Sağanak'] : ['⛈️', 'Fırtınalı'];
  const live = {};
  Promise.all(['tr', 'br'].map(k => fetch(`https://api.open-meteo.com/v1/forecast?latitude=${CLIMATE[k].lat}&longitude=${CLIMATE[k].lon}&current=temperature_2m,weather_code`).then(r => r.json()).then(d => { const [icon, desc] = WMO(d.current.weather_code); live[k] = {t: d.current.temperature_2m, icon, desc}; }).catch(() => {}))).then(() => renderClimate(live));
})();
