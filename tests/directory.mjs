// Firma dizini: yayına başvuru, ana firma doğrulaması, herkese açık arama (e-posta sızmaz), onaylı iletişim talebi → firmanın kendi veritabanında aday,
// ad değişince yeniden onay, askı/ret, spam korumaları, firmalar arası izolasyon, yetki (yalnız ana firma karar verir).
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-dir-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite'); process.env.LOCAL_BLOB_DIR = join(dir, 'blobs'); process.env.TENANT_DB_DIR = join(dir, 'tenants'); process.env.DEMO_SEED = 'off';
process.env.ADMIN_SETUP_KEY = 'setup-key-123';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform} = await import(R + 'http.mjs');
const {resolveTenant, updateTenant} = await import(R + 'tenant.mjs');
const auth = platform('auth'), adminH = platform('admin'), jars = {};
let ipn = 10;
async function hit(handler, base, host, path, body, ip) {
  const headers = {Host: host, Origin: 'http://' + host}; if (jars[host]) headers.Cookie = jars[host]; if (ip) headers['x-forwarded-for'] = ip;
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await handler(new Request('http://' + host + base + path, {method: body === undefined ? 'GET' : 'POST', headers, body: payload}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set && set.includes('=') && !/Max-Age=0/.test(set)) jars[host] = set.split(';')[0];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return {status: res.status, data};
}
const call = (h, p, b, ip) => hit(auth, '/api/auth/', h, p, b, ip), adm = (h, p, b) => hit(adminH, '/api/platform/admin/', h, p, b);
const tokenOf = link => new URL(link).searchParams.get('sifre');
const M = 'localhost', A = 'acme.localhost', B = 'beta.localhost';
const FORM = (o = {}) => ({slug: 'acme', name: 'Ayşe Yılmaz', email: 'ayse@test.com', phone: '+90 555 111 22 33', service: 'Oturum İzni', country: 'Türkiye', message: 'Merhaba, bilgi almak istiyorum.', consent: true, ts: Date.now() - 10000, ...o});
const leads = async host => { const t = await resolveTenant(new Request('http://' + host + '/', {headers: {Host: host}})); const {runWithTenant} = await import(R + 'tenant-context.mjs'), {getDatabase} = await import(R + 'db.mjs'); const db = t.db || await runWithTenant(t, () => getDatabase()); return (await db.prepare("SELECT id, data FROM items WHERE kind='lead'").all()).results.map(r => ({id: r.id, ...JSON.parse(r.data)})); };

try {
  // ana firma yöneticisi + iki firma
  assert.equal((await call(M, 'admin/setup', {setupKey: 'setup-key-123', password: 'AdminPassword2026'})).status, 200);
  assert.equal((await call(M, 'admin/login', {email: 'admin@brazilmigration.com', password: 'AdminPassword2026'})).status, 200);
  const mainJar = jars[M]; delete jars[M];
  for (const [slug, name] of [['acme', 'Acme Göç'], ['beta', 'Beta Visa']]) {
    const r = await call(M, 'tenant/create', {name, slug, email: `owner@${slug}.test`}); const h = slug + '.localhost';
    await call(h, 'reset', {token: tokenOf(r.data.devLink), password: 'Parola2026' + slug}); assert.equal((await call(h, 'admin/login', {email: `owner@${slug}.test`, password: 'Parola2026' + slug})).status, 200);
  }
  const asMain = async (p, b) => { jars[M] = mainJar; try { return await adm(M, p, b); } finally { delete jars[M]; } };

  // ---- başlangıç: kimse listelenmez; herkese açık uçlar girişsiz çalışır ----
  let r = await call(A, 'directory/list'); assert.equal(r.status, 200); assert.equal(r.data.total, 0); assert.deepEqual(r.data.facets, {countries: [], services: [], languages: []});
  assert.equal((await call(A, 'directory/firm?slug=acme')).status, 404);
  assert.equal((await adm(A, 'directory/me')).data.listing, null); assert.equal((await adm(A, 'directory/me')).data.slug, 'acme');

  // ---- başvuru doğrulamaları ----
  const P = (o = {}) => ({name: 'Acme Göç', about: 'İstanbul merkezli ekibimiz Brezilya oturum izni ve şirket kurulumunda 10 yıldır çalışır.', city: 'İstanbul', countries: ['Brezilya', 'Türkiye'], services: ['Oturum İzni', 'Vize'], languages: ['tr', 'pt'], website: 'acme.example.com', registry: 'OAB/SP 123456', leadEmail: 'talep@acme.test', publish: true, ...o});
  for (const [bad, why] of [[{countries: []}, 'ülke'], [{services: []}, 'hizmet'], [{about: 'çok kısa'}, 'tanıtım'], [{leadEmail: 'kotu'}, 'e-posta'], [{website: 'http://acme.example.com'}, 'https'], [{name: 'A'}, 'ad']]) assert.equal((await adm(A, 'directory/profile', P(bad))).status, 400, why);
  assert.equal((await asMain('directory/admin/list')).status, 200);
  r = await adm(A, 'directory/profile', P()); assert.equal(r.status, 200); assert.equal(r.data.status, 'pending');
  r = await adm(A, 'directory/me'); assert.equal(r.data.listing.website, 'https://acme.example.com', 'adres https olarak normalize edilir'); assert.equal(r.data.listing.status, 'pending');
  r = await call(A, 'directory/list'); assert.equal(r.data.total, 0, 'doğrulanmadan yayında görünmez'); assert.equal((await call(A, 'directory/firm?slug=acme')).status, 404);
  assert.equal((await call(A, 'directory/contact', FORM())).status, 404, 'doğrulanmamış firmaya talep gidemez');

  // ---- yetki: yalnız ana firma karar verir ----
  assert.equal((await adm(A, 'directory/admin/list')).status, 404); assert.equal((await adm(A, 'directory/admin/decide', {tenant: (await adm(A, 'directory/me')).data.listing.tenant, action: 'verify'})).status, 404);
  assert.equal((await adm(B, 'directory/admin/decide', {tenant: 'x', action: 'verify'})).status, 404);
  r = await asMain('directory/admin/list'); assert.equal(r.data.listings.length, 1); const acmeId = r.data.listings[0].tenant; assert.equal(r.data.listings[0].status, 'pending'); assert.equal(r.data.listings[0].leadEmail, 'talep@acme.test'); assert.equal(r.data.listings[0].ownerEmail, 'owner@acme.test');
  // ana firma bildirimi düştü
  { const {getDatabase} = await import(R + 'db.mjs'); const n = await getDatabase().prepare("SELECT data FROM items WHERE kind='notice'").all(); assert.ok(n.results.some(x => /doğrulama bekleyen vitrin/.test(x.data)), 'ana firmaya bildirim'); }
  assert.equal((await asMain('directory/admin/decide', {tenant: acmeId, action: 'reject', note: 'x'})).status, 400, 'ret nedeni zorunlu');
  assert.equal((await asMain('directory/admin/decide', {tenant: acmeId, action: 'yok'})).status, 400);
  assert.equal((await asMain('directory/admin/decide', {tenant: 'tn_olmayan', action: 'verify'})).status, 404);

  // ---- ret → düzelt → yeniden başvur ----
  r = await asMain('directory/admin/decide', {tenant: acmeId, action: 'reject', note: 'Meslek kaydı doğrulanamadı.'}); assert.equal(r.data.status, 'rejected');
  r = await adm(A, 'directory/me'); assert.equal(r.data.listing.status, 'rejected'); assert.match(r.data.listing.note, /Meslek kaydı/);
  r = await adm(A, 'directory/profile', P({registry: 'OAB/SP 654321'})); assert.equal(r.data.status, 'pending'); assert.equal((await adm(A, 'directory/me')).data.listing.note, undefined, 'eski ret notu temizlenir');

  // ---- doğrulama → herkese açık ----
  assert.equal((await asMain('directory/admin/decide', {tenant: acmeId, action: 'verify', note: 'OAB kaydı kontrol edildi.'})).data.status, 'verified');
  r = await call(M, 'directory/list'); assert.equal(r.data.total, 1); const f = r.data.firms[0];
  assert.deepEqual([f.slug, f.name, f.city, f.verifiedAt > 0], ['acme', 'Acme Göç', 'İstanbul', true]); assert.equal(f.registry, 'OAB/SP 654321');
  assert.ok(!JSON.stringify(r.data).includes('talep@acme.test') && !JSON.stringify(r.data).includes('owner@acme.test'), 'e-posta herkese açık yanıtta yok');
  assert.ok(!('leadEmail' in f) && !('note' in f) && !('tenant' in f), 'iç alanlar sızmaz');
  assert.deepEqual(r.data.facets.countries.map(x => x.value).sort(), ['Brezilya', 'Türkiye']);
  // filtreler (büyük/küçük harf ve aksan duyarsız)
  for (const [qs, n] of [['country=brezilya', 1], ['country=TURKIYE', 1], ['country=Almanya', 0], ['service=vize', 1], ['service=vatandaslik', 0], ['language=PT', 1], ['language=fa', 0], ['q=istanbul', 1], ['q=oturum', 1], ['q=yokbunda', 0], ['country=brezilya&service=vize&language=tr', 1]]) assert.equal((await call(M, 'directory/list?' + qs)).data.total, n, qs);
  assert.equal((await call(M, 'directory/firm?slug=acme')).data.firm.name, 'Acme Göç');

  // ---- iletişim talebi ----
  assert.equal((await call(M, 'directory/contact', FORM({consent: false}), '10.0.0.1')).status, 400, 'rıza şart');
  assert.equal((await call(M, 'directory/contact', FORM({email: 'kotu'}), '10.0.0.1')).status, 400);
  assert.equal((await call(M, 'directory/contact', FORM({name: 'A'}), '10.0.0.1')).status, 400);
  assert.equal((await call(M, 'directory/contact', FORM({slug: 'yok'}), '10.0.0.1')).status, 404);
  assert.equal((await leads(A)).length, 0, 'hatalı talepler aday açmaz');
  // bot: gizli alan ve çok hızlı gönderim sessizce yutulur
  assert.equal((await call(M, 'directory/contact', FORM({hp: 'http://spam'}), '10.0.0.2')).data.ok, true); assert.equal((await call(M, 'directory/contact', FORM({ts: Date.now()}), '10.0.0.2')).data.ok, true); assert.equal((await leads(A)).length, 0, 'bot talebi aday açmaz');
  r = await call(M, 'directory/contact', FORM(), '10.0.0.3'); assert.equal(r.status, 200); assert.equal(r.data.ok, true); assert.match(r.data.message, /Acme Göç/);
  let L = await leads(A); assert.equal(L.length, 1); assert.deepEqual([L[0].name, L[0].email, L[0].source, L[0].service, L[0].consent], ['Ayşe Yılmaz', 'ayse@test.com', 'Firma dizini', 'Oturum İzni', true]); assert.match(L[0].consentText, /Acme Göç firmasına iletilmesini/);
  assert.equal((await leads(B)).length, 0, 'başka firmaya düşmez'); assert.equal((await leads(M)).length, 0);
  { const t = await resolveTenant(new Request('http://' + A + '/', {headers: {Host: A}})); const c = (await t.db.prepare("SELECT data FROM items WHERE kind='consent'").all()).results.map(x => JSON.parse(x.data)); assert.ok(c.some(x => x.source === 'directory'), 'rıza firmanın kayıtlarına yazıldı');
    assert.ok((await t.db.prepare("SELECT data FROM items WHERE kind='notice'").all()).results.some(x => /Firma dizininden yeni talep/.test(x.data)), 'firmaya panel bildirimi'); }
  // aynı kişi aynı firmaya 3'ten fazla göndermez
  assert.equal((await call(M, 'directory/contact', FORM(), '10.0.0.4')).status, 200); assert.equal((await call(M, 'directory/contact', FORM(), '10.0.0.5')).status, 200); assert.equal((await call(M, 'directory/contact', FORM(), '10.0.0.6')).status, 429);
  // IP başına saatlik sınır
  for (let i = 0; i < 5; i++) assert.equal((await call(M, 'directory/contact', FORM({email: `x${i}@test.com`}), '10.0.1.1')).status, 200);
  assert.equal((await call(M, 'directory/contact', FORM({email: 'x9@test.com'}), '10.0.1.1')).status, 429, 'IP sınırı');
  assert.equal(((await asMain('directory/admin/list')).data.listings[0].contacts) >= 1, true, 'talep sayacı');

  // ---- firma bilgisini düzenler: doğrulama korunur, ad değişirse düşer ----
  r = await adm(A, 'directory/profile', P({about: 'Güncellenmiş tanıtım metni: Brezilya oturum izni, vatandaşlık ve şirket kurulumu.'})); assert.equal(r.data.status, 'verified', 'ad aynı: doğrulama korunur');
  r = await adm(A, 'directory/profile', P({publish: false})); assert.equal(r.data.status, 'draft'); assert.equal((await call(M, 'directory/list')).data.total, 0, 'yayından çekilince görünmez'); assert.equal((await call(M, 'directory/contact', FORM({email: 'z@test.com'}), '10.0.2.1')).status, 404);
  r = await adm(A, 'directory/profile', P()); assert.equal(r.data.status, 'verified', 'aynı adla geri yayına: yeniden onay gerekmez');
  r = await adm(A, 'directory/profile', P({name: 'Başka Ad Ltd'})); assert.equal(r.data.status, 'pending', 'ad değişince yeniden onay'); assert.equal((await call(M, 'directory/list')).data.total, 0);
  assert.equal((await asMain('directory/admin/decide', {tenant: acmeId, action: 'verify'})).data.status, 'verified');
  // "talep almıyorum" anahtarı
  await adm(A, 'directory/profile', P({name: 'Başka Ad Ltd', accepting: false})); r = await call(M, 'directory/list'); assert.equal(r.data.firms[0].accepting, false); assert.equal((await call(M, 'directory/contact', FORM({email: 'w@test.com'}), '10.0.3.1')).status, 409);
  await adm(A, 'directory/profile', P({name: 'Başka Ad Ltd', accepting: true}));

  // ---- askı ----
  assert.equal((await asMain('directory/admin/decide', {tenant: acmeId, action: 'suspend', note: 'x'})).status, 400);
  assert.equal((await asMain('directory/admin/decide', {tenant: acmeId, action: 'suspend', note: 'Şikâyet inceleniyor.'})).data.status, 'suspended');
  assert.equal((await call(M, 'directory/list')).data.total, 0); r = await adm(A, 'directory/profile', P({name: 'Başka Ad Ltd'})); assert.equal(r.status, 403, 'askıdaki firma kendini yayına alamaz'); assert.match(r.data.error, /Şikâyet/);
  assert.equal((await adm(A, 'directory/profile', P({name: 'Başka Ad Ltd', publish: false}))).status, 200, 'askıdayken düzenleyebilir'); assert.equal((await adm(A, 'directory/me')).data.listing.status, 'suspended');
  assert.equal((await asMain('directory/admin/decide', {tenant: acmeId, action: 'restore'})).data.status, 'verified'); assert.equal((await call(M, 'directory/list')).data.total, 1);
  // firma hesabı askıya alınınca dizinden düşer
  const acme = await resolveTenant(new Request('http://' + A + '/', {headers: {Host: A}})); await updateTenant(acme.id, {status: 'suspended'}); assert.equal((await call(M, 'directory/list')).data.total, 0, 'askıdaki firma dizinden düşer'); await updateTenant(acme.id, {status: 'active'}); assert.equal((await call(M, 'directory/list')).data.total, 1);

  // ---- ana firma kendi vitrinini de açabilir; çoklu firma, sayfalama ve ad yazımı ----
  r = await asMain('directory/me'); assert.equal(r.data.isMain, true); assert.equal(r.data.slug, 'brazil-migration');
  assert.equal((await asMain('directory/profile', P({name: 'Brazil Migration', countries: ['Brezilya'], services: ['Vatandaşlık'], languages: ['tr', 'pt', 'en'], leadEmail: 'info@bm.test', registry: ''}))).data.status, 'pending');
  assert.equal((await asMain('directory/admin/decide', {tenant: 'main', action: 'verify'})).data.status, 'verified');
  r = await call(M, 'directory/list'); assert.equal(r.data.total, 2); assert.equal(r.data.facets.countries.find(x => x.value === 'Brezilya').n, 2);
  assert.equal((await call(M, 'directory/list?page=2')).data.firms.length, 0); assert.equal((await call(M, 'directory/list?page=abc')).data.page, 1);
  // ana firmaya talep → ana firmanın kendi veritabanında aday
  assert.equal((await call(M, 'directory/contact', FORM({slug: 'brazil-migration', service: 'Vatandaşlık', email: 'mehmet@test.com', name: 'Mehmet Kaya'}), '10.0.4.1')).status, 200);
  { const {getDatabase} = await import(R + 'db.mjs'); const l = (await getDatabase().prepare("SELECT data FROM items WHERE kind='lead'").all()).results.map(x => JSON.parse(x.data)); assert.equal(l.length, 1); assert.equal(l[0].email, 'mehmet@test.com'); assert.equal(l[0].source, 'Firma dizini'); }
  assert.equal((await leads(A)).filter(x => x.email === 'mehmet@test.com').length, 0, 'firmalar arası sızma yok');

  console.log('directory tests: PASS');
} catch (e) { console.error(e); process.exit(1); }
process.exit(0);
