# Brazil Migration — Hostinger kurulumu

Bu proje bir Next.js (Node.js) uygulamasıdır. Hostinger'da **Business Web Hosting** veya **Cloud** paketinde
"Web App" olarak çalışır (Premium/Single paketler Node.js çalıştırmaz).

## 1. Yükleme
Hostinger → Websites → Create site → Web App → **Dosyalarınızı yükleyin** → `brazil-migration-hostinger.zip`.
Hostinger ayarları otomatik algılar; algılamazsa:
- Framework: Next.js · Node sürümü: 20 veya üstü (22 önerilir)
- Build komutu: `npm run build` · Start komutu: `npm start` · Kök dizin: `/`

## 2. Ortam değişkenleri (Environment variables)
| Değişken | Değer |
|---|---|
| `SITE_URL` | `https://alanadiniz.com` |
| `ADMIN_HOST` | `yonetim.alanadiniz.com` (yönetim paneli yalnızca bu adreste açılır) |
| `ADMIN_URL` | `https://yonetim.alanadiniz.com` |
| `ADMIN_SETUP_KEY` | Uzun rastgele bir metin (ilk yönetici kurulumu için) |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Turso veritabanı bilgileri (Vercel → Settings → Environment Variables veya turso.tech panelinden). Aynı veritabanı kullanılırsa mevcut hesaplar ve kayıtlar korunur. |
| `LOCAL_BLOB_DIR` | Yüklenen belgelerin klasörü. Uygulama klasörü dışında kalıcı bir yol önerilir (ör. `/home/KULLANICI/bm-uploads`); boş bırakılırsa `.data/blobs` kullanılır ve yeniden dağıtımda silinebilir. |
| `MAX_UPLOAD_MB` | `10` |
| `RESEND_API_KEY`, `EMAIL_FROM` | E-posta gönderimi (Resend). Yoksa sistem test modunda çalışır. |
| `EMAIL_TEST_MODE` | Canlıda `off` |
| `DEMO_SEED` | Canlıda `off` (demo hesaplar oluşturulmaz) |
| `ANTHROPIC_API_KEY` | İsteğe bağlı: belgelerin yapay zekâ ile ön kontrolü |
| `DIDIT_ENABLED`, `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID` | İsteğe bağlı: Didit kimlik doğrulaması |
| `WHATSAPP_NUMBER` | İsteğe bağlı: WhatsApp butonu (ör. `905xxxxxxxxx`) |

`TURSO_*` tanımlanmazsa uygulama sunucu diskinde yerel bir veritabanı (`.data/local.db`) oluşturur; yeniden dağıtımda kaybolabileceği için canlıda Turso kullanın.

## 3. Alan adları
Hostinger'da web uygulamasına ana alan adını (`alanadiniz.com`, `www`) ve yönetim alt alan adını (`yonetim.alanadiniz.com`) bağlayın.
Yönetim paneli: `https://yonetim.alanadiniz.com/admin/giris/` · Herkes için giriş: `https://alanadiniz.com/giris/`

## 4. Güncelleme
Yeni bir zip geldiğinde: Web App → Deployments → yeni dosyayı yükleyip yeniden dağıtın. Ortam değişkenleri korunur.

## Hız: yerel veritabanı kopyası (önerilir)
Turso veritabanı ABD'de (aws-us-east-1) olduğu için her sorgu ~100 ms sürer. Ortam değişkenlerine `TURSO_REPLICA` = `on` ekleyip uygulamayı yeniden başlatın: sunucu `.data/replica.db` adlı yerel bir kopya tutar, okumalar internete çıkmadan yapılır, yazmalar yine Turso'ya gider ve kopya 15 saniyede bir eşitlenir (`TURSO_SYNC_SECONDS`). Kopya kurulamazsa uygulama otomatik olarak Turso'ya doğrudan bağlanır. Admin → Ayarlar → Sistem Durumu'nda "hızlı mod" yazısını görmelisiniz.
