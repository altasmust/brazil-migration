# Brazil Migration

Web sitesi + müşteri, danışman/partner, avukat, muhasebe panelleri + ayrı yönetim paneli.
Next.js 16 (Vercel), veritabanı Turso (libSQL), özel dosyalar Vercel Blob (private).

## Adresler
| Sayfa | Yol |
|---|---|
| Tek giriş (müşteri, danışman, avukat, muhasebe, diğer) | `/giris/` |
| Partner başvurusu | `/partner-ol/` |
| Müşteri paneli | `/panel/` |
| Danışman / partner / muhasebe paneli | `/partner/` |
| Avukat paneli | `/avukat/` |
| Yönetim paneli (yalnızca `ADMIN_HOST` adresinde) | `/admin/` · giriş `/admin/giris/` |
| Hesaplar, Yeni oluştur, Partner başvuruları, Panel modülleri | `/admin/hesaplar/` |

## Vercel kurulumu
1. Vercel → **Add New → Project** → GitHub `altasmust/brazil-migration` → **Deploy**.
2. **Storage → Create → Blob → Private** → projeye bağla.
3. **Storage / Marketplace → Turso** → veritabanı oluştur → projeye bağla (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` otomatik gelir). Tablolar ilk istekte otomatik kurulur.
4. **Settings → Environment Variables** (aşağıdaki tablo) → **Deployments → Redeploy**.
5. Admin alt alan adı: **Settings → Domains** → ikinci bir alan adı ekle (ör. `bm-yonetim.vercel.app` veya `admin.alanadiniz.com`) → aynı değeri `ADMIN_HOST` olarak gir.
6. `https://<ADMIN_HOST>/admin/giris/` → kurulum anahtarı (`ADMIN_SETUP_KEY`) ile yönetici şifresini belirle.

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Evet | Turso entegrasyonu ekler |
| `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID` | Evet | Blob store bağlanınca otomatik |
| `ADMIN_SETUP_KEY` | Evet (ilk kurulum) | Yönetici ilk şifresini belirlerken istenir |
| `ADMIN_HOST` | Önerilir | Yönetim panelinin host adı (virgülle birden fazla). Tanımlıysa ana sitede `/admin` 404 olur |
| `SITE_URL` | Önerilir | Ana site adresi, ör. `https://brazil-migration.vercel.app` (e-posta bağlantıları ve admin→site yönlendirmesi) |
| `ADMIN_URL` | İsteğe bağlı | Yönetim adresi (varsayılan `https://<ADMIN_HOST>`) |
| `OWNER_EMAIL` | İsteğe bağlı | Yönetici e-postası (varsayılan `fatih.altas@elevandos.com`) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Canlı e-posta için | Yoksa **test modu**: e-posta gitmez, bağlantı ekranda gösterilir |
| `EMAIL_TEST_MODE=off` | Canlıya geçince | Test modunda bağlantıların ekranda görünmesini kapatır |
| `ANTHROPIC_API_KEY` | Otomatik belge onayı için | Yoksa partner/müşteri belgeleri admin/danışman incelemesine düşer |
| `AI_VERIFY_MODEL`, `AI_VERIFY_MIN_CONFIDENCE` | İsteğe bağlı | Varsayılan `claude-sonnet-5-5`, `0.85` |
| `MAX_UPLOAD_MB` | İsteğe bağlı | Vercel'de varsayılan 4 (Vercel fonksiyon gövde sınırı 4.5 MB) |
| `DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_ENABLED` | İsteğe bağlı | Mevcut Didit KYC modülü (`docs/didit-setup.md`) |

## Yerel geliştirme
```
npm install
ADMIN_SETUP_KEY=yerel-anahtar npm run dev     # http://localhost:3000
npm test
```
Yerelde Turso/Blob gerekmez: veritabanı `.data/local.db`, dosyalar `.data/blobs` altında tutulur.

## Mimari notlar
- `server/platform/` yeni katman: `db.mjs` (D1 uyumlu libSQL adaptörü + otomatik migration), `storage.mjs` (R2 uyumlu Blob adaptörü), `auth.mjs` (scrypt şifre, oturum çerezleri, tek kullanımlık bağlantılar), `api.mjs` (giriş, kayıt, partner, admin hesapları, modüller), `verify.mjs` (yapay zekâ belge kontrolü), `geo.mjs` (en yakın danışman), `mail.mjs` (Resend / test modu).
- Eski modüller (`server/workspace.mjs`, `advisor.mjs`, `lawyer.mjs`, `kyc.mjs`, `admin.mjs`) aynen çalışır; kimlik bilgisi sunucu tarafında doğrulanmış oturumdan eklenir, tarayıcıdan gelen kimlik başlıkları silinir.
- Yeni tablo değişikliği: `drizzle/` altına SQL ekleyin, `node scripts/gen-migrations.mjs` çalıştırın.
