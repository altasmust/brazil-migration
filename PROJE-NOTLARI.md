# Brazil Migration — Proje Notları

> Bağlam için tek kaynak bu dosya. Yapılan her iş ve kullanıcının söylediği her şey buraya eklenir.

## Proje özeti (zip'ten, 29 Ekim 2026 paketi)
- Kaynak sürümü: 6b97a64b… · yayımlanan sürüm: 31 (ChatGPT Sites üzerinde barındırılıyordu)
- Altyapı: Vinext (Next.js 16 benzeri) + Cloudflare Worker, D1 (SQLite) veritabanı, R2 dosya depolama
- Kimlik doğrulama: ChatGPT ile giriş (SIWC) — Sites platformuna bağlı; başka sunucuda çalışmaz, yeniden yazılması gerekir
- Dil: site Türkçe (Brezilya'ya göç / şirket kurma hizmetleri, São Paulo)

## Bölümler
- `public/` — pazarlama sitesi (statik HTML): ana sayfa, oturum izni, vatandaşlık, evlilik, LGBT oturum izni, şirket kurma, iletişim, kaynaklar, değerlendirme (quiz), içerik planı
- `public/admin` — admin paneli (ürünler, ziyaretçiler/dünya haritası, ayarlar, müşteriler)
- `public/panel` — müşteri paneli
- `public/partner` — danışman/partner paneli (referans kampanyaları, komisyon)
- `public/avukat` — avukat paneli
- `public/kyc` — Didit KYC akışı (kodlu ama kapalı; DIDIT_API_KEY, DIDIT_WORKFLOW_ID, DIDIT_ENABLED gerekiyor — docs/didit-setup.md)
- `server/*.mjs` — API mantığı (admin, advisor, lawyer, kyc, products, visitors, workspace)
- `app/api/*` — API route'ları → server/ modüllerine yönlendiriyor
- `drizzle/` — 2 migration (0000, 0001), `db/schema.ts`
- `tests/` — authorization.mjs, admin.mjs, advisor.mjs, lawyer.mjs, render-ui.mjs

## Mevcut özellikler (IMPLEMENTATION.md)
- Başvurular, yenileme linkleri, destek mesajları, randevu talepleri, panel bildirimleri
- Dosya yükleme (PDF/JPEG/PNG, 10 MB, mobil kamera)
- Fatura oluşturma, Stripe/PayPal ödeme linki, manuel ödeme onayı; fatura başına tek komisyon kaydı
- Personel davetleri (7 gün geçerli), yetkiler (yok/okuma/yazma), müşteri kapsamı, denetim geçmişi
- 12 bölge için dil tercihi (yalnızca menü çevrili)

## Eksik / bağlanmamış
- E-posta gönderimi yok; e-posta/şifre girişi ve 2FA yok
- Ödeme webhook'u yok
- Google Takvim/Meet bağlı değil (yalnızca taslak link)
- İçerik çevirisi menü dışında yok

## İş günlüğü
- 2026-10-30: Zip açıldı (/home/claude/proje/Brazil-Migration), proje incelendi, bu not dosyası oluşturuldu. Kullanıcı projeye burada devam etmek istiyor.
- 2026-10-30: Kullanıcı "önce yerelde çalıştır" dedi. Yapılanlar:
  - `npm ci` → 687 paket kuruldu (Node 22.23)
  - 4 test paketi (authorization, admin, advisor, lawyer) → hepsi PASS
  - Yerel D1'e migration uygulandı: önce `npm run build`, sonra `wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/000X.sql` (0000 + 0001)
  - Sahip hesabı kodda sabit: `fatih.altas@elevandos.com` (server/workspace.mjs ve server/lawyer.mjs). İlk girişte owner olarak bağlanıyor.
  - `scripts/vite/sites-vite-plugin.ts` → yerel sahte giriş artık `SITES_LOCAL_EMAIL` / `SITES_LOCAL_UID` ortam değişkenlerini okuyor (sadece geliştirme; üretimi etkilemez)
  - Çalıştırma: `SITES_LOCAL_EMAIL=fatih.altas@elevandos.com SITES_LOCAL_UID=local_owner npm run dev -- --port 5173`, sonra `/signin-with-chatgpt?return_to=/admin/`
  - Sonuç: site, admin, müşteri paneli, partner, avukat paneli ve KYC açılıyor, konsolda hata yok (yalnızca dış kaynak yükleme hataları — sandbox ağı)
- Gözlem: müşteri paneli ("Mustafa ALTAŞ", 288,12 MKD fatura, 355 gün oturum kartı) gerçek veri değil, örnek/demo veri gösteriyor; admin'de "Örnek verilerle önizle" butonu var.

## 2026-10-30/31 — Büyük değişiklik talebi (kullanıcının sözleri özetle)
- PARTNER: Brezilya'ya hizmet vermek isteyen danışmanlık şirketleri için partner olma sayfası. Üyelikten sonra mevcut danışman girişinden girsin; Vergi Levhası, İmza Sirküsü, Kimlik ön+arka yüklenene ve doğrulanana kadar sınırlı erişim (yalnızca profil). Belgeler arka planda otomatik taransın, geçerse otomatik onay.
- MÜŞTERİ: Başvuruda bölgedeki en yakın danışmana otomatik atama; hesap oluştururken e-posta doğrulaması. Hizmet satın alınca yüklenen evraklarda doğrulama olsun; öncesinde doğrulama zorunlu değil.
- Admin hariç herkes (müşteri, avukat, muhasebe, danışman) tek yerden giriş yapsın. Admin paneli ayrı, web arayüzünde bulunmasın, alt alan adında olsun.
- Admin > Müşteriler > "Yeni oluştur": Müşteri, Danışman, Avukat, Muhasebeci, Diğer; admin elle hesap açsın ve izinleri yönetsin.
- Mevcut panel özellikleri aynı kalsın; admin panellere modül ekleyip düzenleyip çıkarabilsin.
- Geçici olarak Vercel'de çalışsın; kullanıcı canlı test yapacak.
- GitHub'da başka projesi var, karışmasından endişeliydi → ayrı yeni repo açtı: https://github.com/altasmust/brazil-migration
- Seçimler (kullanıcı tercih belirtmedi, önerilenle gidildi): Turso (libSQL) + Vercel Blob (private); belge kontrolü yapay zekâ (Anthropic API), emin olunamazsa admin incelemesi; e-posta Resend, anahtar yokken test modu (link ekranda görünür).

## Mimari (yeni)
- Vinext/Cloudflare kaldırıldı → gerçek Next.js 16 (Vercel). Eski CF dosyaları: /home/claude/proje/_cf-eski (repoda yok)
- server/platform/db.mjs: D1 uyumlu adaptör (libSQL). Turso yoksa yerelde .data/local.db. Migration'lar ilk istekte otomatik (server/platform/migrations.mjs, `node scripts/gen-migrations.mjs` ile drizzle/*.sql'den üretilir)
- server/platform/storage.mjs: R2 uyumlu adaptör → Vercel Blob private; yerelde .data/blobs
- server/platform/auth.mjs: e-posta/şifre (scrypt), oturum çerezi bm_session (site) / bm_admin (admin), tek kullanımlık tokenlar (verify/reset/invite). Eski modüllere kimlik, `oai-authenticated-user-*` başlıkları sunucu tarafında eklenerek aktarılıyor (tarayıcıdan gelenler siliniyor)
- server/platform/api.mjs: /api/auth/* (register, partner-register, verify, login, logout, me, forgot, reset, admin/login, admin/setup, admin/status, cities), /api/platform/* (partner durum/yükleme, modules), /api/platform/admin/* (accounts, partners, modules, builtins)
- proxy.ts: ADMIN_HOST tanımlıysa admin sadece o host'ta; ana sitede /admin 404. "/klasor/" → "/klasor/index.html"
- Sahip e-postası OWNER_EMAIL (varsayılan fatih.altas@elevandos.com); yönetici yalnızca admin host'tan girer. İlk şifre ADMIN_SETUP_KEY ile /admin/giris/ üzerinden.
- Merkez ofis personeli (employee + manager='owner', ör. muhasebeci) tüm müşterileri görebilir (workspace.mjs + advisor.mjs küçük yama)
- Vercel'de yükleme sınırı 4 MB (Vercel fonksiyon gövde limiti 4.5 MB) — MAX_UPLOAD_MB ile değişir

## 2026-10-31 — Teslim edilenler (2. commit)
- Sayfalar: /giris/ (tek giriş + müşteri kaydı + şifremi unuttum/hesap etkinleştir + doğrulama), /partner-ol/ (partner başvurusu), /admin/giris/ (yönetici girişi + ilk kurulum), /admin/hesaplar/ (Hesaplar · Yeni oluştur · Partner başvuruları · Panel modülleri)
- Admin menüsü: Müşteriler → Yeni Oluştur, Hesaplar ve İzinler, Partner Başvuruları (+ eski "Müşteri Kayıtları (yönetim)"); Ayarlar → Panel Modülleri
- public/bm/session.js tüm üye panellerinde: oturum yoksa /giris/'e yönlendirir, Çıkış butonu, partner kısıtlı modu (4 belge + profil), admin modülleri/gizlenen sekmeler, demo isim yerine gerçek ad
- Sayfa üreticisi: `python3 scripts/make-auth-pages.py scripts/src/site-shell.html` (giriş/partner sayfalarını site şablonundan üretir)
- ChatGPT giriş/çıkış linkleri ve metinleri kaldırıldı; partner referans linki artık site adresini kullanıyor
- Testler: `npm test` → 9 paket PASS (yeni tests/platform.mjs dahil)
- Uçtan uca tarayıcı testi yerelde geçti (admin kurulum, hesap oluşturma, müşteri kaydı→doğrulama→panel, en yakın danışman ~185 km, partner kısıtlı mod→belge→admin onay→tam erişim, modül ekleme/gizleme, avukat ve muhasebeci girişi, admin host ayrımı)

## Açık konular / sonraki adımlar
- Müşteri paneli "Genel Bakış" ve partner paneli genel bakış hâlâ ÖRNEK veriler gösteriyor (sayılar, kart, grafikler); yalnızca isim gerçek. Gerçek veriye bağlanması gerekiyor.
- Statik sayfaların canonical/og meta etiketleri eski chatgpt.site adresini gösteriyor → kalıcı alan adı belli olunca değiştirilecek
- Vercel'de müşteri belge yükleme sınırı pratikte ~4 MB (panel 10 MB diyor)
- Admin host'ta /kyc/ açılmaz (KYC sayfası ana sitede)
- Kullanıcı Vercel'de: proje import, Blob (private), Turso, env değişkenleri kuracak
- 2026-10-31: Turso entegrasyonu özel önek soruyor (varsayılan STORAGE). db.mjs artık libsql:// URL'sini hangi adla gelirse gelsin bulur (findTurso). Kullanıcıya önek TURSO önerildi.
- 2026-10-31: Vercel kurulumu Claude tarafından (kullanıcının Chrome oturumu üzerinden) yapıldı:
  - Proje: hostizm-2878/brazil-migration (prj_56YvTJIbCvLor5cLKDIYfShFRyfI), team_ivEjxOVCOamKxP26bn6ElUVm
  - Ana site: https://brazil-migration.vercel.app · Yönetim: https://brazil-migration-yonetim.vercel.app (domain eklendi)
  - Env: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BLOB_STORE_ID (entegrasyonlar) + ADMIN_SETUP_KEY (sensitive), SITE_URL, ADMIN_HOST, ADMIN_URL (production+preview)
  - Vercel API'den yeni deploy "Challenge required" verdi → deploy GitHub push ile tetikleniyor
- 2026-10-31: Kullanıcı "ilk kurulumu atla, admin ve partner için demo kullanıcı adı/şifre ver" dedi → server/platform/seed.mjs: ilk açılışta yönetici (OWNER_EMAIL) ve onaylı demo partner (partner@demo.bm, İstanbul) oluşturur; repoda yalnızca şifre hash'leri var. DEMO_SEED=off ile kapanır. Şifreler sohbette kullanıcıya verildi (değiştirmesi önerildi).
- 2026-10-31: Kullanıcı oturum izni sayfası için tasarım görseli gönderdi ("böyle güncelle"). /brezilya-oturum-izni/ yeniden düzenlendi: hero korundu; 4 adım, "İki paket. Size özel bir yol." (Oturum İzni 6/9, Şirket + Oturum 9/9, Size özel değerlendirme: Eğitim izni / Aile Birleşimi / İnsani sebepler ve koruma / Yatırım izni — seçince görüşme butonu açılır), Gerekli belgeler (8), Oturum ve CRNM ile yaşam (6 + not), Neden bizi seçmelisiniz (9) + CTA. Eski rehber metni, USD fiyatlı Temel/Standart/Premium paketler, quiz kutusu ve SSS bu sayfadan kaldırıldı (eski hali: git geçmişinde). Dosyalar: public/bm/oturum.css, public/bm/oturum.js. DİKKAT: build.py/content.py bu sayfayı yeniden üretirse değişiklik ezilir — elle düzenlendi.
- 2026-10-31: Kullanıcı Şirket_kurma.docx gönderdi: "Şirket kurma sayfasını da oturum izni sayfası gibi yap". Docx: (1) Nasıl Çalışır 4 adım → yazılar değişsin, mantık aynı; (2) Şirket Türleri kartları (MEI/LTDA/SAS; artı/eksi/ideal) → site renkleriyle, "bu alanda paketler olmalı"; (3) Gerekli Belgeler → ekle/düzenle; (4) Vergi Rejimleri; hizmet listesi: Şirket Kurulumu, Apostilli Evrak Tercüme, Noter, Çalışma İzni belgesi, Muhasebe kaydı, Sigorta kaydı, Banka hesabı açılışı, İdari Hukuk, Şirket Avukatı; Neden Bizi Seçmelisiniz ("teknoloji ve hukuk alanında uzmanız") + 13 madde.
  - Yapılan: /brezilyada-sirket-kurma/ — hero korundu; 4 adım; 3 paket (MEI Başlangıç 5/9, LTDA Standart 7/9, Kurumsal SA 9/9; dahil/dahil değil, ideal, teklif butonu, karşılaştırma tablosu; fiyat yok); 8 şirket belgesi; vergi rejimleri; Neden biz (12 kart + ve daha fazlası); CTA. Eski rehber/fiyatlı paketler/quiz/SSS kaldırıldı. MEI limiti 2026 için R$ 81.000 teyit edildi.
- 2026-10-31: Kullanıcı vatandaşlık.docx gönderdi: "Aynı şekilde vatandaşlık sayfasını da düzenle". İstekler: 4 adım (yazılar değişsin); paket alanı vatandaşlık türleri kart stilinde; 2 paket + karşılaştırma (tıklayınca iki paketin avantaj/dezavantajı ve skor seviyesi); 3. pakette seçilebilir akordiyon + görüşme talep et (Doğal Yolla, Yatırım Yoluyla, Evlilik Yoluyla Vatandaşlık, İstisnai durum); hizmetler: Vatandaşlık, Apostilli Evrak Tercüme, Noter, Çalışma İzni belgesi, Muhasebe kaydı, Sigorta kaydı, İdari Hukuk; belgeler tablosu (apostil/tercüme sütunlu) ekle/düzenle; Neden biz 8 madde + ve daha fazlası; 2026 güncellemeler görseli.
  - Yapılan: /brezilya-vatandasligi/ — Başvuru Paketi 3/7, Tam Destek 7/7, karşılaştırma <dialog> (skor + hizmet tablosu + avantaj/dezavantaj + "bu paketi seç"), 3. kart akordiyon; 12 belge apostil/tercüme göstergeli; "Vatandaşlık yolları" 4 kart (Lei 13.445 Md. 65/66/67/68/70) + güncel süreç notları; Neden biz; CTA.
  - Görseldeki yanlışlar düzeltildi: "Özel vatandaşlık = Brezilyalı eş/çocuk" yanlış → doğru: eş/çocuk olağan vatandaşlıkta süreyi en az 1 yıla indirir (Md. 66); özel vatandaşlık diplomatik görevle ilgili (Md. 68). "Yatırım yoluyla vatandaşlık" Brezilya'da yok → yatırım oturum sağlar diye açıklandı. Görseldeki doğrulanamayan 2026 iddiaları (harç R$200→250, CELPE-Bras online, 12–24 ay) sayıya girmeden genel ifadelerle yazıldı.
- 2026-10-31: Kullanıcı uygunluk_testi.docx gönderdi: "Ön değerlendirme kısmında bunu kullan, sayfayı sen geliştir". Docx: sol tarafta görsel, sağda "Hangi hizmet size uygun? 3 soruda" kartı (Soru1 hedef: Vatandaşlık/Yasal ikamet-CRNM/Şirket/CPF/Brezilyalı ile evlenmek/Taşınma; Soru2 durum: hiç gitmedim/kısa süre/turist/vizem var/yasal ikamet), sonuç ekranı (Hemen başvurulabilir/Yakında/Uzun vadeli sayaçları, puan/100, süre, adımlar, detaylı rehber butonu, yol haritası + WhatsApp CTA). Şart: sonucu görmek için e-posta ZORUNLU + "abonelik koşullarını okudum onayladım" işareti.
  - Yapılan: /degerlendirme/ yeniden yazıldı (public/bm/degerlendirme.js/.css). 3. soru tarafımdan eklendi: Brezilya ile bağ (Brezilyalı eş, çocuk, iş teklifi, yatırım sermayesi, uzaktan/emekli geliri, hiçbiri). Puanlama istemci tarafında (CPF, oturum→CRNM, aile birleşimi, evlilik, şirket, yatırımcı, dijital göçebe, vatandaşlık (indirimli), taşınma); hedefle eşleşen +8. E-posta + onay olmadan buton pasif. Sonuçlar /api/auth/lead ile items(kind='lead') kaydedilir, admine bildirim; "Yol haritamı gönder" Resend varsa e-posta atar. Admin: /admin/hesaplar/#degerlendirmeler (liste + CSV), admin menüsünde Müşteriler → Ön Değerlendirmeler. WhatsApp butonu WHATSAPP_NUMBER env tanımlanınca görünür (numara henüz yok). ?kategori= derin linkleri ilk soruyu atlıyor. Eski 10 soruluk quiz bu sayfada devre dışı (body data-page="assessment").
- 2026-10-31: Kullanıcı: "Anasayfa soluk; düzeni bozmadan ikon/görsel ile canlı yap", "Doğrulama için Didit (ücretsiz önerilen)", "bitirelim ve canlıya bağlayalım".
  - Ana sayfa: public/bm/home.css + home.js (düzen aynı): trust şeridi ikonları ("Şeffaf USD paketleri" → "Şeffaf kapsam ve teklif"), hizmet kartlarına illüstrasyon + ikon + hover, 4'lü bilgi şeridi, "Neden biz" ikonlu kartlar, yerleşme listesi ikonlu, hero kartı "3 soruda keşfet", quiz bandı yeni ön değerlendirme metni + gradyan.
  - Didit: ücretsiz plan = iş e-postasıyla açılan hesaba aylık $10 kredi ≈ 30 tam KYC ($0.33). Didit yapılandırılınca (DIDIT_ENABLED=true, DIDIT_API_KEY, DIDIT_WORKFLOW_ID) partner sadece Vergi Levhası + İmza Sirküsü yükler, kimlik Didit oturumuyla (/api/platform/partner/kyc/start|refresh; dönüş /partner/?kyc=done). Onay: belgeler AI uygun + Didit Approved → otomatik; aksi halde admin. Yeni durum kyc_pending. Kota müşteri KYC ile ortak (aylık 30). Didit yoksa eski 4 belge yüklemesi.
- 2026-10-31: Kullanıcı düzeltme istedi: hizmet kartı görselindeki beyaz geçiş kötü, ikon ile numara bitişik, 'Neden biz' ve slider altı (trust şeridi) ikonları kaymış. Sebep: eski style.css span kuralları (.why-grid article>span, .trust span) ikon kutularına da uygulanıyordu. home.css'e özgül düzeltmeler eklendi (ikonlar ortalı, beyaz geçiş kaldırıldı, ikon-numara arası 12px, trust şeridi 4 eşit sütun ortalı). home.css?v=2.
- 2026-10-31: Kullanıcı istekleri: LGBT ve Evlilik sayfalarını kaldır (her yerden, düzen korunarak); Rehber & araçlar'da Mevzuat rehberi yerine "Portekizce öğren" (Duolingo mantığında basit); 15 dk ücretsiz görüşme formu → Google Meet linki otomatik e-posta, admin'de Google Meet eklentisi (sabit link / API); demo müşteri hesabı; footer sayfa/link düzeni, footer'dan giriş linklerini kaldır; admin menüdeki ızgara ikonunu kaldır.
  - Yapılan: lgbt-brezilya-oturum-izni ve brezilya-evlilik-oturum-izni silindi (next.config 308 → /brezilya-oturum-izni/); menü, tam ekran menü, footer, ana sayfa kartları ("üç farklı kapı"), data.js (pages+quizzes), sitemap, visitors yolları, icerik-plani bölümleri, iletişim listesi, meta açıklamalar, admin ürün türleri (products.mjs, products.js, settings-revision.js, tema arka planları) temizlendi. Üstteki "ETKİLEŞİMLİ PROTOTİP" şeridi tüm sayfalardan kaldırıldı.
  - /portekizce/: 9 ünite (selamlaşma, tanışma, sayılar, alışveriş, restoran, ulaşım, ev/kira, resmi işler, sağlık/acil), kelime kartları + pt-BR sesli okuma (speechSynthesis), 8 soruluk alıştırma (anlam/çeviri/dinleme), 3 can, XP, günlük seri, ünite kilidi, günün ifadesi; ilerleme localStorage. Dosyalar: public/bm/portekizce(.js|.css|-data.js).
  - Footer: Hizmetlerimiz (Oturum, Vatandaşlık, Şirket, Ücretsiz ön değerlendirme) · Keşfedin (Portekizce öğren, Yaklaşım, Dünyadan Brezilya'ya, Partnerimiz olun, İletişim). Danışan/Avukat girişi linkleri kaldırıldı (header'daki Giriş butonu duruyor).
  - Görüşme: app.js book()/prepareBooking → POST /api/auth/booking (items kind='booking'); Meet ayarı items id='integration-meet' {mode fixed|webhook, link, webhook, secret, notifyEmail, active}. Webhook modunda Apps Script ile her görüşmeye ayrı Calendar+Meet (örnek kod admin sayfasında). E-posta Resend yokken gitmez; link ekranda gösterilir + Google Takvim'e ekle linki. Admin: /admin/hesaplar/#meet ve #gorusmeler; admin menü: Ayarlar → Google Meet Entegrasyonu, Destek → Ön Görüşme Talepleri.
  - Demo müşteri: musteri@demo.bm (seed.mjs, danışmanı demo partner). Şifre sohbette verildi.
  - Admin yeşil menü çubuğundaki ızgara (Başlangıç) ikonu kaldırıldı.

## 2026-10-31 — Türkiye–Brezilya karşılaştırma sayfası
- Kullanıcı: "Türkiye ve Brezilya karşılaştırması sayfası yap: ev, araba, elektronik, gıda, faturalar; sağlık; eğitim; vergi yükü; dijital yaşam; genel skor; hava durumu ve para birimi."
- Yeni: public/turkiye-brezilya/index.html (degerlendirme kabuğundan, body data-page="compare"), public/bm/karsilastirma.css, public/bm/karsilastirma.js.
- İçerik: sekmeli maliyet tablosu (Ev, Araba, Elektronik, Gıda, Faturalar, Genel yaşam; USD + ₺/R$, fark rozeti), Sağlık/Eğitim/Vergi/Dijital kartları, canlı hava (Open-Meteo), canlı kur + çevirici (api.frankfurter.dev, yedek kur USD/TRY 49,77, USD/BRL 5,30), ağırlığı ayarlanabilir genel skor (TR 5,4 / BR 6,9 varsayılan), kaynaklar.
- Veri: livingcost.org (Haz 2026), Toyota TR Corolla 2.545.500 ₺, FIPE R$158.991, Canaltech iPhone 17, GVK 2026 dilimleri, IRPF 2026 + Lei 15.270/2025.
- Menü (mega-nav + full-menu Rehber & araçlar), footer Keşfedin, sitemap.xml, visitors.mjs yollarına eklendi.
- 2026-10-31 (devam): Kullanıcı: "header önceki sayfalar gibi olsun; altta Ev/kira, Araba ve ulaşım, Elektronik eşya, Gıda ve market, Faturalar, Genel yaşam ana sayfadaki hizmet kartları gibi kartlar olsun; içine girince karşılaştırma, skorlar, detaylar ve yazı göster."
  - Hero: koyu degrade hero kaldırıldı → breadcrumb + service-hero (görsel parque.webp) + genel skor rozeti.
  - Sekmeler kaldırıldı → 6 kart (inline SVG illüstrasyon: solda İstanbul, sağda São Paulo silueti; ikon kutusu + 01–06 numara; kart altında TR/BR kategori skoru). Tıklayınca hash yönlendirme (#ev, #araba, #elektronik, #gida, #fatura, #yasam): kategori başlığı + skor kutuları (TR, BR, kalem bazında kazanım), 2 paragraf açıklama, fiyat tablosu, "Türkiye/Brezilya’da bilmeniz gerekenler", ipuçları, önceki/sonraki. "← Tüm kategoriler" kartlara döner.
  - Genel skora "Genel yaşam" (6/7, ağırlık 2) eklendi → hero rozeti TR 5,5 / BR 6,9. Not: detay başlığında <header> kullanma (style.css header{height:104px} kuralı kırpıyor).
- 2026-10-31 (devam): Kullanıcı: "Genel değerlendirme skoru, Şu an İstanbul ve São Paulo’da hava, Sağlık/eğitim/vergi/dijital yaşam — bunları kaldır." → Üç bölüm ve JS'leri (SYSTEMS, CLIMATE/Open-Meteo, SCORE) kaldırıldı; hero'daki genel skor rozeti de kaldırıldı. Kalan: hero, 6 kategori kartı + detaylar, kur çevirici, CTA, kaynaklar. Meta açıklama güncellendi.
- 2026-10-31 (devam): Kullanıcı: "Bu görseli de diğer sayfalardaki gibi yap" (hero'daki parque fotoğrafı). → Kullanılmayan illüstrasyon giris.webp (São Paulo'ya açılan kapı, pasaport, anahtar; şeffaf arka plan) hero görseli yapıldı.
- 2026-10-31 (devam): Kullanıcı ana sayfa hizmet kartları görseli: "bu alanı da düzelt kenar boş kaldı". Sebep: style.css .service-card:last-child{grid-column:span 2} (eski 5 kartlık düzen) → 3 kartta son kart alt satıra kayıp sağda boşluk bırakıyordu. bm/home.css: ≥761px'te tek satır 3 kart; 441–760px'te son kart yatay (yazı solda, görsel sağda). home.css?v=4.
- 2026-10-31: Kullanıcı Vercel ücretli olacağı için PHP'ye çevirmeyi sordu → önermedim (arka uç büyük, haftalar sürer). Hostinger Business/Cloud Next.js'i Node.js web app olarak çalıştırıyor; Hostinger paketi tek GitHub hesabına bağlanabiliyor (kullanıcının GitHub'ında başka Hostinger bağlı). Kullanıcı: "gitlab'a yüklesek nasıl" → Hostinger gitlab.com'u destekliyor. Eklendi: .github/workflows/gitlab-mirror.yml (GitHub main → GitLab main, secrets GITLAB_TOKEN + GITLAB_REPO; yoksa atlar). Hostinger'da: BLOB değişkeni yoksa storage.mjs diske yazar (LOCAL_BLOB_DIR), Turso aynen.
- 2026-10-31: Kullanıcı: GitLab'dan vazgeçti — "sadece Hostinger'de kullanalım, dosyaları yükleyebilmem için bana dosyaları gönder". (Sandbox gitlab.com'a erişemiyor.) .github/gitlab-mirror kaldırıldı; package.json engines node>=20.9; .env.example Hostinger'a göre; HOSTINGER-KURULUM.md eklendi. Zip: git archive (node_modules/.next/.data/.git yok) → brazil-migration-hostinger.zip, Hostinger Web App → "Dosyalarınızı yükleyin". Güncellemeler bundan sonra yeni zip olarak gönderilecek.
- 2026-10-31: Hostinger'a zip ile yüklendi (Node 22.x, 8 env: SITE_URL=https://brazilmigration.com, ADMIN_HOST=yonetim.brazilmigration.com, ADMIN_URL, ADMIN_SETUP_KEY, TURSO_*, LOCAL_BLOB_DIR=.data/blobs, MAX_UPLOAD_MB=10). Alan adı: brazilmigration.com. Hostinger güvenlik taraması: Next 16.3.4'te 12 açık (3 kritik) + zod 4.1.11 (@vercel/blob → @vercel/oidc üzerinden) → next 16.4.3'e yükseltildi, package.json overrides zod ^4.6.6; npm audit 0 açık, build + testler geçti. Yeni zip gönderildi.
- 2026-10-31: Kullanıcı (admin, ekran görüntüleriyle): "Müşteri Kayıtları (yönetim) → Müşteri Listesi 1. sıra, Yeni Müşteri Ekle 2. sıra; grup yönetimi (görseldeki gibi: ad, ikon, renk, indirim+ürün, birleştir, koruma, öncelik, ayrı fatura); listede ikonlu tür sütunu (Müşteri/Avukat/Partner/Muhasebe); kişi detayına girince sekmeli arayüz (Özet/Profil/Faturalar… görseldeki gibi) geri gelsin; /admin/hesaplar/ sayfası absürt ve kafa karıştırıcı; admin giriş sayfası güzel olsun, üyelik yok, tek giriş." Admin şu an brazilmigration.com/admin/ (Hostinger tek alan adı; ADMIN_HOST/ADMIN_URL silindi, kullanıcı ileride yonetim.brazilmigration.com istiyor).
  - Yapılan: public/admin/bm-crm.js + bm-crm.css (yeni). Müşteri Listesi (#customers) artık GERÇEK giriş hesaplarını (/api/platform/admin/accounts) gösterir: 4 kart (Müşteri, Partner&Danışman, Avukat, Muhasebe&Personel), bant, arama/tür/grup/durum filtresi, CSV, toplu gruba atama, satır menüsü (detay, düzenle/izinler, giriş bağlantısı, aktif/pasif). Tür = customer/partner(advisor+partner kaydı)/advisor/lawyer/accountant/other.
  - Grup Yönetimi modalı → API POST groups (items id 'account-groups' {groups, assign}); accounts/group (tekil/toplu). İndirim/koruma/öncelik/ayrı fatura alanları KAYDEDİLİYOR ama henüz fatura/sipariş akışında uygulanmıyor.
  - Kişi detayı #account/<id>: Özet (kayıt/hizmet/fatura/destek kartları, bilgiler, muhasebe, hesap puanı, hızlı işlemler, son notlar), Profil (accounts/meta POST), İzinler (personel) veya Ürün&Hizmetler/Faturalar (müşteri; eski kayıtlar e-postayla eşlenir), Notlar (accounts/notes), Etkinlik (accounts/activity, audit kayıtları).
  - Eski /admin/hesaplar/ sekmeleri yönetim paneline gömüldü: #yeni, #partnerler, #degerlendirmeler, #gorusmeler, #moduller, #meet (hesaplar/app.js window.BMAcc; bm-embed.css = bm-admin.css'in .bm-embed ile kapsamlanmış kopyası). /admin/hesaplar/ artık /admin/#… adresine yönlendirir. Menü: Müşteriler → Müşteri Listesi, Yeni Müşteri Ekle, Partner Başvuruları, Ön Değerlendirmeler ("Yeni Oluştur", "Hesaplar ve İzinler", eski "Yönetim Kaydı Ekle" kaldırıldı).
  - Admin giriş sayfası yeniden tasarlandı (sol marka paneli + sağ form, şifre göster, şifremi unuttum; kayıt yok). Kurulum/sıfırlama akışları aynı.
  - DİKKAT: yeni GET uçları handlePlatformAdmin içinde (ilk denemede yanlışlıkla handleAuth'a girmişti, düzeltildi).
- 2026-10-31: Kullanıcı: "Kimlikteki MUSTAFA ALTAŞ farklı bir Brezilya adı olsun; üst menüden Kimlik Doğrulama kalksın (dosya yüklenince otomatik taranacak); MKD yerine her ülkenin kendi para birimi; giriş ekranında SAO PAULO değil BREZİLYA YOLCULUĞU; 'Müşteri, danışman / partner… aynı yerden giriş yapar' yazısı saçma; admin müşteri detayında profil çok basit (WiseCP benzeri görsel); partner için üst menüde erişebileceği alanlar yok: dosyaları, müşterileri, alt hesap oluşturma, doğrulanmış evrakları."
  - Yapılan: panel.js oturum kartı adı → LUCAS OLIVEIRA SANTOS. /kyc/panel-link.js müşteri ve partner panellerinden kaldırıldı (admin Ayarlar → Kimlik Doğrulama duruyor). /api/auth/me artık user.country döner; session.js örnek tutarlardaki MKD'yi ülkenin para birimine çevirir (Türkiye TRY, Brezilya BRL, … ; bilinmiyorsa TRY). /giris/: "Brezilya yolculuğunuz", yeni açıklama metni, adımlardan "evlilik" çıkarıldı.
  - Admin kişi detayı: Profil sekmesi yeniden (sol menü Genel/İletişim/Özel ayarlar/Bildirimler; Hesap türü bireysel/kurumsal, durum Aktif/Pasif/Engellendi, kişisel+firma bilgileri, vergi no/dairesi, sabit tel, dil, para birimi (ülkeden), grup, 5 özel ayar anahtarı, e-posta/SMS bildirim tercihleri, oluşturma/son giriş). account_meta.extra'da saklanır; özel ayar/bildirimler henüz akışlara bağlı değil. Partner/danışman sekmeleri: Müşterileri, Alt Hesaplar (oluşturma formu → POST accounts {manager: partnerId}, role employee), Doğrulanmış Evraklar (partners API, dosya görüntüleme), Dosyalar (yeni GET accounts/files, accounts/file). Müşteride de Dosyalar sekmesi. Liste API'si manager, extra, lastLogin (auth_sessions) döndürüyor.
- 2026-10-31: Kullanıcı: "Müşteri veya partner fark etmez, her kişi için 'giriş bağlantısı' yerine 'Hesabı yönet'e tıklayınca şifre sormadan o kullanıcının hesabına girip yönetebileyim."
  - Yapılan: POST /api/platform/admin/accounts/impersonate {id} (yalnız yönetici; hesap aktif olmalı; auth kullanıcısı yoksa oluşturur, uid bağlar) → 3 dk geçerli tek kullanımlık 'impersonate' token + audit 'account.impersonate'. GET /api/auth/impersonate?t= (site tarafı) token'ı kullanır, 2 saatlik site oturumu açar (items 'imp-<sha(token)>' kaydı), kişinin paneline 302 yönlendirir. currentUser: doğrulanmamış kullanıcı da imp oturumunda girebilir. /api/auth/me → user.impersonated; session.js panelin üstünde kahverengi "Yönetici olarak … hesabını yönetiyorsunuz · Oturumu kapat" şeridi gösterir. Admin oturumu (bm_admin) etkilenmez.
  - Admin: kişi detayında sağ üstte ve Muhasebe kartında "Hesabı yönet" (yeni sekme), listede satır menüsünün ilk maddesi. Giriş/şifre bağlantısı gönderme Hızlı işlemler'de duruyor. Test: partner → /partner/, müşteri → /panel/, şifresiz personel de girebiliyor; token ikinci kez kullanılamıyor (400); oturumsuz istek 401.
