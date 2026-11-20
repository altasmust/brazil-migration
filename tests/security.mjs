// Güvenlik: TOTP (RFC 6238 vektörleri), 2FA kurulum/giriş/kurtarma kodu/tekrar kullanım/kilit, oturum listesi + kapatma, belge şifreleme (açma, eski dosya, taşıma, kapatma),
// yedek geri yükleme (yazılı onay, öncesi yedek, oturum ve şifreleme anahtarının korunması).
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-security-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite'); process.env.LOCAL_BLOB_DIR = join(dir, 'blobs'); process.env.TENANT_DB_DIR = join(dir, 'tenants'); process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST; delete process.env.TOTP_ENC_KEY;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform} = await import(R + 'http.mjs');
const {resolveTenant} = await import(R + 'tenant.mjs');
const {runWithTenant} = await import(R + 'tenant-context.mjs');
const {getBucket} = await import(R + 'storage.mjs');
const {totp, totpOk, b32, unb32} = await import(R + 'security.mjs');

// ---- RFC 6238 test vektörleri (SHA-1, sır = "12345678901234567890") ----
const rfc = b32(Buffer.from('12345678901234567890')); assert.equal(rfc, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'); assert.equal(unb32(rfc).toString(), '12345678901234567890');
assert.equal(totp(rfc, 59000, 30, 8), '94287082'); assert.equal(totp(rfc, 1111111109000, 30, 8), '07081804'); assert.equal(totp(rfc, 20000000000000, 30, 8), '65353130');
assert.ok(totpOk(rfc, '287082', 59000) && totpOk(rfc, '287082', 59000 + 30000) && !totpOk(rfc, '287082', 59000 + 90000), '±1 adım penceresi'); assert.ok(!totpOk(rfc, '12345', 59000) && !totpOk(rfc, 'abcdef', 59000));

const auth = platform('auth'), adminH = platform('admin'), jars = {};
async function hit(handler, base, host, path, body, jar = host, ua = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537') {
  const headers = {Host: host, Origin: 'http://' + host, 'User-Agent': ua, 'x-forwarded-for': '203.0.113.9'}; if (jars[jar]) headers.Cookie = jars[jar];
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await handler(new Request('http://' + host + base + path, {method: body === undefined ? 'GET' : 'POST', headers, body: payload}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set) jars[jar] = set.split(';')[0];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return {status: res.status, data, res, text, set};
}
const call = (h, p, b, jar, ua) => hit(auth, '/api/auth/', h, p, b, jar, ua), adm = (h, p, b) => hit(adminH, '/api/platform/admin/', h, p, b, h + '#adm');
const tokenOf = link => new URL(link, 'http://x').searchParams.get('sifre');
const A = 'acme.localhost', B = 'beta.localhost', PW = 'AcmeParola2026';

try {
  let r = await call('localhost', 'tenant/create', {name: 'Acme Göç', slug: 'acme', email: 'owner@acme.test'}); const a = r.data.devLink;
  r = await call('localhost', 'tenant/create', {name: 'Beta Visa', slug: 'beta', email: 'owner@beta.test'}); const b = r.data.devLink;
  await call(A, 'reset', {token: tokenOf(a), password: PW}, A + '#adm'); await call(B, 'reset', {token: tokenOf(b), password: 'BetaParola2026'}, B + '#adm');
  assert.equal((await call(A, 'admin/login', {email: 'owner@acme.test', password: PW}, A + '#adm')).status, 200); assert.equal((await call(B, 'admin/login', {email: 'owner@beta.test', password: 'BetaParola2026'}, B + '#adm')).status, 200);
  const acme = await resolveTenant(new Request('http://' + A + '/', {headers: {Host: A}})), db = acme.db, beta = await resolveTenant(new Request('http://' + B + '/', {headers: {Host: B}}));
  const rows = async sql => (await db.prepare(sql).all()).results;
  const me = (jar = A + '#adm') => call(A, 'admin/security/me', undefined, jar);
  const login = (body, jar, ua) => call(A, 'admin/login', {email: 'owner@acme.test', password: PW, ...body}, jar, ua);
  const resetLast = async () => { const x = await db.prepare("SELECT id, data FROM items WHERE kind='totp'").first(); const d = JSON.parse(x.data); delete d.last; await db.prepare('UPDATE items SET data=? WHERE id=?').bind(JSON.stringify(d), x.id).run(); };
  const resetFail = () => db.prepare("UPDATE auth_users SET failed=0, locked_until=0 WHERE email='owner@acme.test'").run();

  // ---- oturum listesi + cihaz özeti ----
  r = await me(); assert.equal(r.status, 200); assert.equal(r.data.twofa.enabled, false); assert.equal(r.data.sessions.length, 1); assert.equal(r.data.sessions[0].current, true); assert.equal(r.data.sessions[0].agent, 'Chrome · Windows'); assert.equal(r.data.sessions[0].ip, '203.0.x.x'); assert.ok(!JSON.stringify(r.data).includes('203.0.113'), 'tam IP saklanmaz');
  assert.equal((await call(A, 'security/me', undefined, 'anon')).status, 401, 'girişsiz erişim yok');
  assert.equal((await login({}, 'dev2', 'Mozilla/5.0 (iPhone) Safari/604')).status, 200); r = await me(); assert.equal(r.data.sessions.length, 2); assert.ok(r.data.sessions.some(s => s.agent === 'Safari · iOS' && !s.current));
  const other = r.data.sessions.find(s => !s.current); assert.equal((await call(A, 'admin/security/sessions/revoke', {id: other.id}, A + '#adm')).status, 200); assert.equal((await me()).data.sessions.length, 1); assert.equal((await call(A, 'admin/security/me', undefined, 'dev2')).status, 401, 'kapatılan oturum geçersiz');
  assert.equal((await call(A, 'admin/security/sessions/revoke', {id: (await me()).data.sessions[0].id}, A + '#adm')).status, 400, 'kendi oturumu bu uçla kapatılmaz');
  await login({}, 'dev3'); await login({}, 'dev4'); r = await call(A, 'admin/security/sessions/revoke-all', {}, A + '#adm'); assert.equal(r.data.closed, 2); assert.equal((await me()).data.sessions.length, 1); assert.equal((await call(A, 'admin/security/me', undefined, 'dev3')).status, 401);
  // başka firmanın yöneticisi bu firmanın oturumunu göremez/kapatamaz (firma izolasyonu: ayrı veritabanı)
  assert.equal((await call(B, 'admin/security/me', undefined, B + '#adm')).data.sessions.length, 1);

  // ---- iki aşamalı doğrulama ----
  r = await call(A, 'admin/security/2fa/setup', {}, A + '#adm'); assert.equal(r.status, 200); const secret = r.data.secret; assert.match(secret, /^[A-Z2-7]{32}$/); assert.ok(r.data.uri.startsWith('otpauth://totp/') && r.data.uri.includes('secret=' + secret));
  assert.equal((await me()).data.twofa.enabled, false, 'doğrulanmadan açılmaz'); assert.equal((await login({}, 'x1')).status, 200, 'kurulum bitmeden giriş kodsuz');
  assert.equal((await call(A, 'admin/security/2fa/enable', {code: '000000'}, A + '#adm')).status, 400);
  r = await call(A, 'admin/security/2fa/enable', {code: totp(secret)}, A + '#adm'); assert.equal(r.status, 200, JSON.stringify(r.data)); const rec = r.data.recoveryCodes; assert.equal(rec.length, 8); assert.match(rec[0], /^[0-9a-f]{5}-[0-9a-f]{5}$/);
  const raw = JSON.stringify(await rows("SELECT data FROM items WHERE kind='totp'")); assert.ok(!raw.includes(rec[0]), 'kurtarma kodları düz saklanmaz'); assert.equal((await me()).data.twofa.recovery, 8);
  assert.equal((await call(A, 'admin/security/2fa/setup', {}, A + '#adm')).status, 409, 'açıkken yeniden kurulum yok');

  // giriş: kodsuz → need2fa (oturum çerezi yok); yanlış → 401 ve sayaç; doğru → 200
  r = await login({}, 'n1'); assert.equal(r.status, 200); assert.equal(r.data.need2fa, true); assert.ok(!r.set, 'kod verilmeden çerez yok'); assert.equal((await call(A, 'admin/security/me', undefined, 'n1')).status, 401);
  r = await login({code: '123456'}, 'n2'); assert.equal(r.status, 401); assert.ok(!r.set); assert.equal((await db.prepare("SELECT failed FROM auth_users WHERE email='owner@acme.test'").first()).failed, 1, 'hatalı kod sayaca işler');
  await resetLast(); r = await login({code: totp(secret)}, 'n3'); assert.equal(r.status, 200); assert.ok(r.set); assert.equal((await me('n3')).status, 200); assert.equal((await db.prepare("SELECT failed FROM auth_users WHERE email='owner@acme.test'").first()).failed, 0);
  r = await login({code: totp(secret)}, 'n4'); assert.equal(r.status, 401, 'aynı kod ikinci kez kullanılamaz (tekrar kullanım koruması)');
  await resetLast(); assert.equal((await login({code: totp(secret, Date.now() + 30000)}, 'n5')).status, 200); assert.equal((await login({code: totp(secret)}, 'n6')).status, 401, 'daha eski adım da reddedilir');
  assert.equal((await login({password: 'YanlisParola1'}, 'n7')).status, 401);
  // kurtarma kodu: bir kez
  r = await login({code: rec[0]}, 'r1'); assert.equal(r.status, 200); assert.equal((await login({code: rec[0]}, 'r2')).status, 401, 'kurtarma kodu tek kullanımlık'); assert.equal((await me('r1')).data.twofa.recovery, 7); assert.equal((await login({code: rec[1].toUpperCase()}, 'r3')).status, 200, 'büyük/küçük harf fark etmez');

  // kapatma: parola + kod gerekir
  assert.equal((await call(A, 'admin/security/2fa/disable', {password: 'Yanlis1234', code: rec[2]}, A + '#adm')).status, 403); assert.equal((await call(A, 'admin/security/2fa/disable', {password: PW, code: '111111'}, A + '#adm')).status, 403);
  assert.equal((await call(A, 'admin/security/2fa/disable', {password: PW, code: rec[2]}, A + '#adm')).status, 200); assert.equal((await me()).data.twofa.enabled, false); assert.equal((await login({}, 'z1')).status, 200); assert.ok((await login({}, 'z2')).set, 'kapatınca kodsuz giriş');
  assert.equal((await rows("SELECT id FROM items WHERE kind='totp'")).length, 0, 'sır silindi');

  // 8 hatalı kod → kilit
  r = await call(A, 'admin/security/2fa/setup', {}, A + '#adm'); const s2 = r.data.secret; await call(A, 'admin/security/2fa/enable', {code: totp(s2)}, A + '#adm'); await resetFail();
  for (let i = 0; i < 8; i++) assert.equal((await login({code: '00000' + i}, 'k' + i)).status, 401); r = await login({code: totp(s2, Date.now() + 30000)}, 'kx'); assert.equal(r.status, 429, 'kilitlenince doğru kod bile geçmez'); await resetFail();

  // ---- belge şifreleme ----
  const root = join(process.cwd(), process.env.LOCAL_BLOB_DIR, 't', acme.id), onDisk = k => readFileSync(join(root, k)), put = (k, t) => runWithTenant(acme, () => getBucket().put(k, new TextEncoder().encode(t))), read = k => runWithTenant(acme, async () => Buffer.from(await (await getBucket().get(k)).arrayBuffer()).toString());
  await put('private/c1/old', 'ESKI-BELGE'); assert.equal(onDisk('private/c1/old').toString(), 'ESKI-BELGE');
  const ins = (id, key) => db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(id, 'document', 'c1', JSON.stringify({title: 'Pasaport', key, mime: 'text/plain'}), Date.now(), Date.now()).run();
  await ins('doc-old', 'private/c1/old'); await ins('doc-missing', 'private/c1/yok');
  r = await adm(A, 'security/docenc'); assert.deepEqual([r.data.enabled, r.data.documents, r.data.encrypted], [false, 2, 0]);
  assert.equal((await adm(A, 'security/docenc', {enabled: true})).status, 400, 'uyarı onaylanmadan açılmaz'); assert.equal((await adm(A, 'security/docenc/migrate', {})).status, 400, 'kapalıyken taşıma yok');
  assert.equal((await adm(A, 'security/docenc', {enabled: true, confirm: true})).status, 200); assert.equal((await adm(A, 'security/docenc')).data.hasKey, true);
  await put('private/c1/new', 'GIZLI-ICERIK'); const sealed = onDisk('private/c1/new'); assert.equal(sealed.subarray(0, 6).toString(), 'BMENC1'); assert.ok(!sealed.includes('GIZLI'), 'diskte düz metin yok'); assert.equal(await read('private/c1/new'), 'GIZLI-ICERIK');
  assert.equal(await read('private/c1/old'), 'ESKI-BELGE', 'şifresiz eski dosya okunur');
  await runWithTenant(acme, () => getBucket().put('backups/x.json.gz', new TextEncoder().encode('YEDEK'))); assert.equal(onDisk('backups/x.json.gz').toString(), 'YEDEK', 'yedekler şifrelenmez');
  r = await adm(A, 'security/docenc/migrate', {limit: 10}); assert.equal(r.status, 200); assert.equal(r.data.done, 1); assert.equal(r.data.failed, 1, 'dosyası olmayan kayıt sayılır ama takılmaz'); assert.equal(r.data.remaining, 0);
  assert.equal(onDisk('private/c1/old').subarray(0, 6).toString(), 'BMENC1'); assert.equal(await read('private/c1/old'), 'ESKI-BELGE'); assert.equal((await adm(A, 'security/docenc')).data.encrypted, 2);
  // başka firma aynı anahtarı kullanmaz / dosyayı açamaz
  const betaRead = await runWithTenant(beta, async () => { const o = await getBucket().get('private/c1/new'); return o; }); assert.equal(betaRead, null, 'başka firma bu dosyaya erişemez');
  // kapatınca yeni dosyalar düz, eski şifreli dosyalar okunur
  assert.equal((await adm(A, 'security/docenc', {enabled: false})).status, 200); await put('private/c1/plain2', 'DUZ'); assert.equal(onDisk('private/c1/plain2').toString(), 'DUZ'); assert.equal(await read('private/c1/new'), 'GIZLI-ICERIK', 'kapalıyken de şifreli dosya okunur');
  assert.equal((await adm(A, 'security/docenc')).data.hasKey, true, 'anahtar korunur');
  // yönetici dışı erişemez
  assert.equal((await hit(adminH, '/api/platform/admin/', A, 'security/docenc', undefined, 'anon-adm')).status, 401);

  // ---- yedek geri yükleme ----
  await adm(A, 'security/docenc', {enabled: true, confirm: true});
  r = await adm(A, 'backups/run', {}); assert.equal(r.status, 200); const key = r.data.backup.key;
  await ins('doc-after', 'private/c1/new'); await db.prepare("INSERT INTO items(id,kind,owner,data,created,updated) VALUES('marker','note','x','{}',1,1)").run(); await db.prepare("DELETE FROM items WHERE id='doc-old'").run();
  assert.equal((await adm(A, 'backups/restore', {key, confirm: 'evet'})).status, 400, 'yazılı onay şart'); assert.equal((await adm(A, 'backups/restore', {key: 'backups/baska.json.gz', confirm: 'GERİ YÜKLE'})).status, 404, 'listede olmayan yedek geri yüklenmez');
  r = await adm(A, 'backups/restore', {key, confirm: 'geri yükle'}); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.ok(r.data.rows > 5 && r.data.tables >= 3); assert.equal(r.data.snapshot.by, 'geri yükleme öncesi');
  const ids = (await rows("SELECT id FROM items")).map(x => x.id); assert.ok(!ids.includes('marker') && !ids.includes('doc-after'), 'yedekten sonraki kayıtlar gitti'); assert.ok(ids.includes('doc-old'), 'silinen kayıt geri geldi');
  assert.equal((await me()).status, 200, 'geri yüklemeden sonra yönetici oturumu sürer'); assert.equal((await adm(A, 'security/docenc')).data.hasKey, true);
  assert.equal(await read('private/c1/new'), 'GIZLI-ICERIK'); r = await adm(A, 'backups'); assert.ok(r.data.backups.some(b => b.by === 'geri yükleme öncesi')); assert.equal(r.data.restored.from, key); assert.ok((await rows("SELECT data FROM items WHERE kind='audit'")).some(x => /backup.restore/.test(x.data)), 'denetim kaydı');
  // geri yükleme öncesi yedeğe dönülebilir (marker geri gelir)
  const snap = r.data.backups.find(b => b.by === 'geri yükleme öncesi'); assert.equal((await adm(A, 'backups/restore', {key: snap.key, confirm: 'GERİ YÜKLE'})).status, 200); assert.ok((await rows("SELECT id FROM items")).some(x => x.id === 'marker'), 'öncesi yedeğiyle geri alınabilir');
  // geri yükleme yalnız bu firmayı etkiler
  assert.equal((await adm(B, 'backups')).data.backups.length, 0, 'beta yedeği etkilenmedi'); assert.equal((await call(B, 'admin/security/me', undefined, B + '#adm')).status, 200);
  console.log('security tests: PASS');
} finally { /* tmp dir OS tarafından temizlenir */ }
process.exit(0);
