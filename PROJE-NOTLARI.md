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
