// Çok firmalı mimari: firma açma, host çözümleme, veri/yapılandırma/dosya izolasyonu, askıya alma.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-tenants-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite');
process.env.LOCAL_BLOB_DIR = join(dir, 'blobs');
process.env.TENANT_DB_DIR = join(dir, 'tenants');
process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const {platform, legacy, site, getEnv} = await import('/home/claude/proje/Brazil-Migration/server/platform/http.mjs');
const {createTenant, resolveTenant, updateTenant, validateSlug} = await import('/home/claude/proje/Brazil-Migration/server/platform/tenant.mjs');
const {runWithTenant, currentTenant, cfgEnv, MAIN} = await import('/home/claude/proje/Brazil-Migration/server/platform/tenant-context.mjs');
const {getBucket} = await import('/home/claude/proje/Brazil-Migration/server/platform/storage.mjs');
const {getMainDatabase} = await import('/home/claude/proje/Brazil-Migration/server/platform/db.mjs');

const auth = platform('auth');
const siteH = site();
const jars = {};
async function call(host, path, body, method) {
  const headers = {Host: host, Origin: 'http://' + host};
  if (jars[host]) headers.Cookie = jars[host];
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const req = new Request('http://' + host + '/api/auth/' + path, {method: method || (body === undefined ? 'GET' : 'POST'), headers, body: payload});
  const res = await auth(req, {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set) jars[host] = set.split(';')[0];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return {status: res.status, data};
}
const tokenOf = link => new URL(link).searchParams.get('sifre');

try {
  // adres doğrulama
  assert.throws(() => validateSlug('www'), /ayrılmış/);
  assert.throws(() => validateSlug('a'), /3–30/);
  assert.throws(() => validateSlug('Büyük Harf'), /3–30/);
  assert.equal(validateSlug('Acme-Gocmen'), 'acme-gocmen');

  // platform adresinden iki firma aç
  let r = await call('localhost', 'tenant/create', {name: 'Acme Göç', slug: 'acme', email: 'owner@acme.test', lang: 'pt'});
  assert.equal(r.status, 200); const acmeLink = r.data.devLink; assert.ok(acmeLink);
  r = await call('localhost', 'tenant/create', {name: 'Beta Visa', slug: 'beta', email: 'owner@beta.test'});
  assert.equal(r.status, 200); const betaLink = r.data.devLink;
  assert.equal((await call('localhost', 'tenant/create', {name: 'Acme 2', slug: 'acme', email: 'x@x.test'})).status, 409);     // adres tekil
  assert.equal((await call('localhost', 'tenant/create', {name: 'X', slug: 'admin', email: 'x@x.test'})).status, 400);        // ayrılmış
  assert.equal((await call('localhost', 'tenant/create', {name: 'Bot', slug: 'bot-x', email: 'b@b.test', website: 'x'})).data.ok, true); // bot tuzağı: sessizce yok sayılır
  assert.equal((await call('localhost', 'tenant/check?slug=acme')).data.ok, false);
  assert.equal((await call('localhost', 'tenant/check?slug=yeni-firma')).data.ok, true);
  assert.equal((await getMainDatabase().prepare("SELECT COUNT(*) n FROM tenants").first()).n, 2);

  // firma adresinden tenant API'si kapalı (yalnız platform adresinde açılır)
  assert.equal((await call('acme.localhost', 'tenant/create', {name: 'Z', slug: 'zzz', email: 'z@z.test'})).status, 404);

  // host çözümleme
  const tReq = h => new Request('http://' + h + '/', {headers: {Host: h}});
  assert.equal((await resolveTenant(tReq('localhost'))).isDefault, true);
  assert.equal((await resolveTenant(tReq('brazilmigration.com'))).isDefault, true);
  const acme = await resolveTenant(tReq('acme.localhost')), beta = await resolveTenant(tReq('beta.localhost'));
  assert.equal(acme.slug, 'acme'); assert.equal(beta.slug, 'beta'); assert.notEqual(acme.db, beta.db);
  assert.equal((await resolveTenant(tReq('yok.localhost'))).missing, true);

  // her firmanın sahibi yalnız kendi adresinde, kendi parolasıyla girer
  assert.equal((await call('acme.localhost', 'reset', {token: tokenOf(acmeLink), password: 'AcmeParola2026'})).status, 200);
  assert.equal((await call('beta.localhost', 'reset', {token: tokenOf(betaLink), password: 'BetaParola2026'})).status, 200);
  assert.equal((await call('acme.localhost', 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'})).status, 200);
  assert.equal((await call('beta.localhost', 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'})).status, 403);   // başka firmanın sahibi buradan giremez
  assert.equal((await call('beta.localhost', 'admin/login', {email: 'admin@brazilmigration.com', password: 'x'})).status, 403);       // ana firma yöneticisi de giremez
  assert.equal((await call('localhost', 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'})).status, 403);

  // müşteri kaydı yalnız o firmanın veritabanına yazılır; doğrulama bağlantısı firma adresine gider
  r = await call('acme.localhost', 'register', {name: 'Ayşe', email: 'ayse@test.com', password: 'Ayse2026pw', consent: true});
  assert.equal(r.status, 200); assert.ok(r.data.devLink.startsWith('http://acme.localhost'), r.data.devLink);
  const count = async db => (await db.prepare("SELECT COUNT(*) n FROM auth_users WHERE email='ayse@test.com'").first()).n;
  assert.equal(await count(acme.db), 1); assert.equal(await count(beta.db), 0); assert.equal(await count(getMainDatabase()), 0);

  // yapılandırma katmanı sızmaz: firma kendi OWNER_EMAIL/DIDIT değerini görür, ana firmaninkini değil
  process.env.DIDIT_API_KEY = 'platform-secret';
  await runWithTenant(acme, async () => {
    assert.equal(cfgEnv('OWNER_EMAIL'), 'owner@acme.test');
    assert.equal(cfgEnv('DIDIT_API_KEY'), undefined);
    assert.equal(getEnv().DIDIT_API_KEY, undefined);
    assert.equal(currentTenant().slug, 'acme');
  });
  await runWithTenant(beta, async () => assert.equal(cfgEnv('OWNER_EMAIL'), 'owner@beta.test'));
  assert.equal(cfgEnv('DIDIT_API_KEY'), 'platform-secret');            // ana firma eskisi gibi
  assert.equal(currentTenant(), MAIN);
  delete process.env.DIDIT_API_KEY;

  // dosyalar firma önekiyle ayrılır
  await runWithTenant(acme, () => getBucket().put('docs/a.txt', Buffer.from('acme-gizli')));
  assert.equal(await runWithTenant(beta, () => getBucket().get('docs/a.txt')), null);
  assert.equal(await getBucket().get('docs/a.txt'), null);
  assert.equal(Buffer.from(await (await runWithTenant(acme, () => getBucket().get('docs/a.txt'))).arrayBuffer()).toString(), 'acme-gizli');

  // firma vitrini: ana firmanın sayfaları sızmaz
  const page = async (host, p) => { const res = await siteH(new Request('http://' + host + '/api/site/page', {headers: {Host: host, 'x-bm-path': p}}), {params: Promise.resolve({path: ['page']})}); return {status: res.status, text: await res.text()}; };
  let p = await page('acme.localhost', '/'); assert.equal(p.status, 200); assert.match(p.text, /Acme Göç/); assert.doesNotMatch(p.text, /Brezilya Göçmenlik/);
  assert.equal((await page('acme.localhost', '/brezilya-oturum-izni/')).status, 404);
  p = await page('localhost', '/brezilya-oturum-izni/'); assert.equal(p.status, 200);                                            // ana firma eskisi gibi

  // askıya alma ve silme
  await updateTenant(acme.id, {status: 'suspended'});
  assert.equal((await page('acme.localhost', '/')).status, 503);
  await updateTenant(acme.id, {status: 'active'});
  assert.equal((await page('acme.localhost', '/')).status, 200);
  await updateTenant(beta.id, {status: 'deleted'});
  assert.equal((await page('beta.localhost', '/')).status, 404);

  console.log('PASS: tenant creation, slug rules, host routing, per-tenant DB/login/config/files isolation, storefront, suspend/delete');
} finally {
  rmSync(dir, {recursive: true, force: true});
}

process.exit(0);
