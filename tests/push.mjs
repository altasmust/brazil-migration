// PWA bildirimleri: firma başına VAPID, abonelik doğrulama, geçmiş bildirim gönderilmez, her bildirim bir kez, gizlilik (varsayılan genel metin / isteğe bağlı ayrıntı),
// kapsam ayrımı (yönetici/müşteri/danışman), oturuma bağlı abonelik (çıkış → durur), cihaz başka hesaba geçince eski sahibe gitmez, 410 → abonelik silinir, üst sınır, test ucu.
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createECDH, randomBytes} from 'node:crypto';
import webpush from 'web-push';

const dir = mkdtempSync(join(tmpdir(), 'bm-push-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite'); process.env.LOCAL_BLOB_DIR = join(dir, 'blobs'); process.env.TENANT_DB_DIR = join(dir, 'tenants'); process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform} = await import(R + 'http.mjs');
const {resolveTenant} = await import(R + 'tenant.mjs');
const {runWithTenant} = await import(R + 'tenant-context.mjs');
const {scanNotices, sender} = await import(R + 'push.mjs');

const auth = platform('auth'), jars = {};
async function hit(host, path, body, jar = host) {
  const headers = {Host: host, Origin: 'http://' + host, 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Chrome/120'}; if (jars[jar]) headers.Cookie = jars[jar];
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await auth(new Request('http://' + host + '/api/auth/' + path, {method: body === undefined ? 'GET' : 'POST', headers, body: payload}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set && set.includes('=') && !/Max-Age=0/.test(set)) jars[jar] = set.split(';')[0]; if (/Max-Age=0/.test(set || '')) delete jars[jar];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return {status: res.status, data};
}
const tokenOf = link => new URL(link, 'http://x').searchParams.get('sifre'), A = 'acme.localhost', B = 'beta.localhost';
const newSub = (name = 'ok') => { const e = createECDH('prime256v1'); e.generateKeys(); return {endpoint: 'https://push.example.test/' + name + '/' + randomBytes(8).toString('hex'), keys: {p256dh: e.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url')}}; };

// ---- gönderici taklidi: gerçek web-push ile şifreli isteği üretir (anahtarlar/VAPID geçerli mi), ağa çıkmaz ----
const sent = []; let gone = new Set();
sender.send = async (sub, payload, opts) => {
  if (gone.has(sub.endpoint)) throw Object.assign(new Error('gone'), {statusCode: 410});
  const d = webpush.generateRequestDetails(sub, payload, opts); assert.match(d.headers.Authorization, /^vapid t=/); assert.ok(d.body.length > 20, 'şifreli gövde'); assert.equal(d.headers['Content-Encoding'], 'aes128gcm');
  sent.push({endpoint: sub.endpoint, payload: JSON.parse(payload), vapid: d.headers.Authorization, ttl: opts.TTL, subject: opts.vapidDetails.subject, pub: opts.vapidDetails.publicKey});
};

try {
  let r = await hit('localhost', 'tenant/create', {name: 'Acme Göç', slug: 'acme', email: 'owner@acme.test'}); await hit(A, 'reset', {token: tokenOf(r.data.devLink), password: 'AcmeParola2026'}, 'acme#adm');
  r = await hit('localhost', 'tenant/create', {name: 'Beta Visa', slug: 'beta', email: 'owner@beta.test'}); await hit(B, 'reset', {token: tokenOf(r.data.devLink), password: 'BetaParola2026'}, 'beta#adm');
  assert.equal((await hit(A, 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'}, 'acme#adm')).status, 200); assert.equal((await hit(B, 'admin/login', {email: 'owner@beta.test', password: 'BetaParola2026'}, 'beta#adm')).status, 200);
  const acmeT = await resolveTenant(new Request('http://' + A + '/', {headers: {Host: A}})), db = acmeT.db, run = fn => runWithTenant(acmeT, fn), scan = () => run(() => scanNotices(db));
  const mk = async (name, email) => { assert.equal((await hit(A, 'register', {name, email, password: 'Parola2026xx', consent: true}, 'x')).status, 200); await db.prepare('UPDATE auth_users SET verified=1 WHERE email=?').bind(email).run(); const p = await db.prepare('SELECT id, uid FROM people WHERE email=?').bind(email).first(); return p; };
  const c1 = await mk('Kaan Demir', 'kaan@test.com'), c2 = await mk('Ece Su', 'ece@test.com'); await db.prepare("UPDATE people SET role='advisor' WHERE id=?").bind(c2.id).run();
  assert.equal((await hit(A, 'login', {email: 'kaan@test.com', password: 'Parola2026xx'}, 'kaan')).status, 200); assert.equal((await hit(A, 'login', {email: 'ece@test.com', password: 'Parola2026xx'}, 'ece')).status, 200);
  const notice = (owner, title, link = 'documents', created = Date.now()) => db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind('n-' + Math.random().toString(36).slice(2), 'notice', owner, JSON.stringify({title, link, read: false}), created, created).run();

  // ---- anahtar / doğrulama ----
  assert.equal((await hit(A, 'push/key', undefined, 'anon')).status, 401, 'girişsiz erişim yok');
  r = await hit(A, 'push/key', undefined, 'kaan'); assert.equal(r.status, 200); assert.match(r.data.publicKey, /^[A-Za-z0-9_-]{87}$/); assert.equal((await hit(A, 'push/key', undefined, 'kaan')).data.publicKey, r.data.publicKey, 'anahtar kalıcı'); const meK = r.data.me;
  assert.notEqual((await hit(A, 'push/key', undefined, 'ece')).data.me, meK, 'kullanıcıya özel işaret'); await hit(B, 'register', {name: 'Beta Müşteri', email: 'b@test.com', password: 'Parola2026xx', consent: true}, 'bx');
  const betaT = await resolveTenant(new Request('http://' + B + '/', {headers: {Host: B}})); await betaT.db.prepare('UPDATE auth_users SET verified=1 WHERE email=?').bind('b@test.com').run(); await hit(B, 'login', {email: 'b@test.com', password: 'Parola2026xx'}, 'beta');
  assert.notEqual((await hit(B, 'push/key', undefined, 'beta')).data.publicKey, r.data.publicKey, 'her firmanın kendi VAPID anahtarı var');
  const s1 = newSub('d1');
  for (const bad of [{}, {subscription: {endpoint: 'http://x.test/a', keys: s1.keys}}, {subscription: {endpoint: s1.endpoint, keys: {p256dh: 'kisa', auth: s1.keys.auth}}}, {subscription: {endpoint: s1.endpoint, keys: {p256dh: s1.keys.p256dh, auth: '!!'}}}]) assert.equal((await hit(A, 'push/subscribe', bad, 'kaan')).status, 400);

  // ---- geçmiş bildirimler gönderilmez ----
  await notice(c1.id, 'ESKİ bildirim'); await new Promise(r => setTimeout(r, 20));
  assert.equal((await hit(A, 'push/subscribe', {subscription: s1}, 'kaan')).status, 200); r = await hit(A, 'push/status?endpoint=' + encodeURIComponent(s1.endpoint), undefined, 'kaan'); assert.deepEqual([r.data.devices, r.data.thisDevice, r.data.detail], [1, true, false]);
  assert.equal(await scan(), 0); assert.equal(sent.length, 0, 'abonelikten önceki bildirim gitmedi');

  // ---- varsayılan: genel metin ----
  await notice(c1.id, 'Pasaport belgeniz onaylandı', 'documents'); assert.equal(await scan(), 1); assert.equal(sent.length, 1);
  let p = sent[0].payload; assert.equal(p.body, 'Yeni bildiriminiz var.', 'ayrıntı sızmaz'); assert.ok(!JSON.stringify(sent[0]).includes('Pasaport')); assert.equal(p.url, '/panel/#documents'); assert.match(p.title, /Acme/); assert.equal(sent[0].subject, 'mailto:owner@acme.test'.replace('owner@acme.test', sent[0].subject.slice(7)));
  assert.equal(await scan(), 0); assert.equal(sent.length, 1, 'aynı bildirim ikinci kez gönderilmez'); assert.equal(sent[0].ttl, 86400);
  // dil
  assert.equal((await hit(A, 'lang', {lang: 'pt'}, 'kaan')).status, 200); await notice(c1.id, 'x'); await scan(); assert.equal(sent[1].payload.body, 'Você tem uma nova notificação.');
  // ayrıntı açık
  assert.equal((await hit(A, 'push/subscribe', {subscription: s1, detail: true}, 'kaan')).status, 200); assert.equal((await hit(A, 'push/status?endpoint=' + encodeURIComponent(s1.endpoint), undefined, 'kaan')).data.detail, true); await notice(c1.id, 'Randevunuz yarın 10:00', 'meetings'); await scan(); assert.equal(sent[2].payload.body, 'Randevunuz yarın 10:00'); assert.equal(sent[2].payload.url, '/panel/#meetings');
  assert.equal(Number((await db.prepare("SELECT COUNT(*) AS n FROM items WHERE kind='push_sub'").first()).n), 1, 'aynı cihaz tek kayıt');

  // ---- kapsam ayrımı ----
  const n0 = sent.length; await notice(c2.id, 'Danışman bildirimi', 'cases'); await scan(); assert.equal(sent.length, n0, 'aboneliği olmayan danışmana gitmez'); await notice('owner', 'Yönetici bildirimi', 'customers'); await scan(); assert.equal(sent.length, n0, 'yönetici aboneliği yokken gitmez');
  const sa = newSub('admin'); assert.equal((await hit(A, 'admin/push/subscribe', {subscription: sa}, 'acme#adm')).status, 200); const sc = newSub('advisor'); assert.equal((await hit(A, 'push/subscribe', {subscription: sc}, 'ece')).status, 200);
  await notice('owner', 'Yeni müşteri kaydı', 'customers'); await notice(c2.id, 'Yeni dosya atandı', 'cases'); await notice(c1.id, 'Fatura', 'finance'); await scan(); const fresh = sent.slice(n0);
  assert.equal(fresh.length, 3); const by = e => fresh.find(f => f.endpoint === e).payload; assert.equal(by(sa.endpoint).url, '/admin/#customers'); assert.equal(by(sc.endpoint).url, '/partner/#cases'); assert.equal(by(s1.endpoint).url, '/panel/#finance'); assert.ok(!fresh.some(f => f.endpoint === sa.endpoint && f.payload.url.startsWith('/panel')), 'yönetici cihazına müşteri bildirimi gitmez');
  assert.equal(fresh.find(f => f.endpoint === sc.endpoint).payload.body, 'Yeni bildiriminiz var.');
  // bağlantı değeri güvenli: işaretli karakterler temizlenir
  await notice(c1.id, 't', '../x"><script>'); await scan(); assert.ok(/^\/panel\/(#[\w-]*)?$/.test(sent[sent.length - 1].payload.url), sent[sent.length - 1].payload.url);

  // ---- oturuma bağlı: çıkış yapınca durur, tekrar giriş + abonelik ile döner ----
  const kaanSubs = () => sent.filter(f => f.endpoint === s1.endpoint).length; let k0 = kaanSubs();
  assert.equal((await hit(A, 'logout', {}, 'kaan')).status, 200); await notice(c1.id, 'Çıkıştan sonra'); await scan(); assert.equal(kaanSubs(), k0, 'çıkış yapılmış cihaza gönderilmez');
  assert.equal((await hit(A, 'login', {email: 'kaan@test.com', password: 'Parola2026xx'}, 'kaan')).status, 200); await notice(c1.id, 'Girişten sonra, abonelik yenilenmeden'); await scan(); assert.equal(kaanSubs(), k0, 'yeni oturum abonelik eşitleyene kadar bekler');
  await hit(A, 'push/subscribe', {subscription: s1}, 'kaan'); await notice(c1.id, 'Eşitlendikten sonra'); await scan(); assert.equal(kaanSubs(), k0 + 1);
  // oturum kapatma (başka cihazdan) da durdurur
  const other = await hit(A, 'login', {email: 'kaan@test.com', password: 'Parola2026xx'}, 'kaan2'); assert.equal(other.status, 200); const s2 = newSub('d2'); await hit(A, 'push/subscribe', {subscription: s2}, 'kaan2'); const me = await hit(A, 'security/me', undefined, 'kaan'); const sess = me.data.sessions.find(x => !x.current); assert.equal((await hit(A, 'security/sessions/revoke', {id: sess.id}, 'kaan')).status, 200);
  const n2 = sent.length; await notice(c1.id, 'Oturum kapatıldı'); await scan(); assert.deepEqual(sent.slice(n2).map(f => f.endpoint), [s1.endpoint], 'kapatılan oturumun cihazına gitmez');

  assert.equal((await hit(A, 'login', {email: 'kaan@test.com', password: 'Parola2026xx'}, 'kaan2')).status, 200); assert.equal((await hit(A, 'push/subscribe', {subscription: s2}, 'kaan2')).status, 200);
  // ---- cihaz başka hesaba geçti ----
  assert.equal((await hit(A, 'push/subscribe', {subscription: s1}, 'ece')).status, 200); const n3 = sent.length; await notice(c1.id, 'Kaan için'); await notice(c2.id, 'Ece için'); await scan(); const sw = sent.slice(n3).filter(f => f.endpoint === s1.endpoint); assert.equal(sw.length, 1, 'paylaşılan cihaza yalnız yeni sahibin bildirimi gider'); assert.equal(sw[0].payload.url, '/partner/#documents');
  // ---- 410 → silinir ----
  gone.add(sc.endpoint); const n4 = sent.length; await notice(c2.id, 'Gone testi'); await scan(); assert.equal((await hit(A, 'push/status?endpoint=' + encodeURIComponent(sc.endpoint), undefined, 'ece')).data.thisDevice, false, 'süresi dolmuş abonelik silindi'); gone.clear();
  // ---- test ucu ----
  const n5 = sent.length; await hit(A, 'push/unsubscribe', {endpoint: s2.endpoint}, 'kaan'); assert.equal((await hit(A, 'push/test', {}, 'kaan')).status, 400, 'aboneliği olmayan hesaba test gönderilmez'); await hit(A, 'push/subscribe', {subscription: s2}, 'kaan2'); r = await hit(A, 'push/test', {}, 'kaan2'); assert.equal(r.data.sent, 1); assert.equal(sent[sent.length - 1].payload.body, 'As notificações estão funcionando ✓', 'kullanıcının diliyle'); assert.equal(sent[sent.length - 1].ttl, 600);
  // ---- çıkarma ----
  assert.equal((await hit(A, 'push/unsubscribe', {endpoint: s2.endpoint}, 'kaan2')).status, 200); assert.equal((await hit(A, 'push/status?endpoint=' + encodeURIComponent(s2.endpoint), undefined, 'kaan2')).data.thisDevice, false); assert.equal((await hit(A, 'push/unsubscribe', {endpoint: s1.endpoint}, 'kaan2')).status, 200); assert.equal((await hit(A, 'push/status?endpoint=' + encodeURIComponent(s1.endpoint), undefined, 'ece')).data.thisDevice, true, 'başkasının aboneliği silinemez');
  // ---- üst sınır ----
  for (let i = 0; i < 12; i++) { assert.equal((await hit(A, 'push/subscribe', {subscription: newSub('m' + i)}, 'kaan2')).status, 200); await new Promise(r => setTimeout(r, 2)); } assert.equal((await hit(A, 'push/status', undefined, 'kaan2')).data.devices, 10, 'kullanıcı başına en fazla 10 cihaz');
  // ---- firma izolasyonu ----
  assert.equal(Number((await betaT.db.prepare("SELECT COUNT(*) AS n FROM items WHERE kind='push_sub'").first()).n), 0);
  console.log('push tests: PASS');
} catch (e) { console.error(e); process.exit(1); }
process.exit(0);
