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
