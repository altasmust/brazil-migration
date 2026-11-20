// Açık API + webhook: anahtar yaşam döngüsü (yalnız özet saklanır), kapsamlar, sayfalama, hız sınırı, firma izolasyonu, SSRF koruması,
// imzalı teslimat, olay tarayıcı (bir kez, geçmiş yok), yeniden deneme, otomatik pasif, kişisel veri temizliği.
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {createHmac} from 'node:crypto';

const dir = mkdtempSync(join(tmpdir(), 'bm-integrations-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite'); process.env.LOCAL_BLOB_DIR = join(dir, 'blobs'); process.env.TENANT_DB_DIR = join(dir, 'tenants'); process.env.DEMO_SEED = 'off';
process.env.ADMIN_SETUP_KEY = 'setup-key-for-tests-123'; process.env.WEBHOOK_ALLOW_HTTP = '1'; process.env.WEBHOOK_ALLOW_PRIVATE = '1';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform, openApi} = await import(R + 'http.mjs');
const {resolveTenant} = await import(R + 'tenant.mjs');
const {runWithTenant} = await import(R + 'tenant-context.mjs');
const {getDatabase} = await import(R + 'db.mjs');
const {privateIp, checkTarget, scanEvents, flushOutbox} = await import(R + 'integrations.mjs');

const auth = platform('auth'), adminH = platform('admin'), api = openApi(), jars = {};
async function hit(handler, base, host, path, body, jar = host) {
  const headers = {Host: host, Origin: 'http://' + host, 'User-Agent': 'TestAgent/1.0'}; if (jars[jar]) headers.Cookie = jars[jar];
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await handler(new Request('http://' + host + base + path, {method: body === undefined ? 'GET' : 'POST', headers, body: payload}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set) jars[jar] = set.split(';')[0];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return {status: res.status, data, res, text};
}
const call = (h, p, b, jar) => hit(auth, '/api/auth/', h, p, b, jar), adm = (p, b, h = 'localhost') => hit(adminH, '/api/platform/admin/', h, p, b, h + '#adm');
async function v1(path, {key, method = 'GET', body, host = 'localhost'} = {}) {
  const headers = {Host: host, 'x-forwarded-for': '198.51.100.7'}; if (key) headers.Authorization = 'Bearer ' + key; if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await api(new Request('http://' + host + '/api/v1/' + path, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return {status: res.status, data, res};
}
const tokenOf = link => new URL(link, 'http://x').searchParams.get('sifre'), sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- yerel webhook alıcısı ----
const got = []; let mode = 200;
const srv = createServer((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { got.push({headers: req.headers, body: b, url: req.url}); if (mode === 302) { res.writeHead(302, {Location: 'http://127.0.0.1:1/x'}); return res.end(); } res.writeHead(mode); res.end('ok'); }); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const HOOK = `http://127.0.0.1:${srv.address().port}/hook`;

try {
  // ---- yönetici + firmalar ----
  let r = await call('localhost', 'admin/setup', {setupKey: process.env.ADMIN_SETUP_KEY, password: 'AdminParola2026x'}, 'localhost#adm'); assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await call('localhost', 'tenant/create', {name: 'Acme Göç', slug: 'acme', email: 'owner@acme.test'}); const acmeLink = r.data.devLink; await call('acme.localhost', 'reset', {token: tokenOf(acmeLink), password: 'AcmeParola2026'}, 'acme.localhost#adm');
  assert.equal((await call('acme.localhost', 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'}, 'acme.localhost#adm')).status, 200);
  const mainT = await resolveTenant(new Request('http://localhost/', {headers: {Host: 'localhost'}})), db = runWithTenant(mainT, () => getDatabase()), acmeT = await resolveTenant(new Request('http://acme.localhost/', {headers: {Host: 'acme.localhost'}}));
  const item = (id, kind, owner, data, created = Date.now(), updated = created, d = db) => d.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(id, kind, owner, JSON.stringify(data), created, updated).run();
  const person = (id, name, created) => db.prepare("INSERT INTO people(id,uid,email,name,role,manager,permissions,scope,status,advisor,source,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, null, id + '@t.test', name, 'customer', 'owner', '{}', '{}', 'active', null, null, created).run();
  const run = fn => runWithTenant(mainT, fn);

  // ---- SSRF ----
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.1', '172.16.5.5', '172.31.255.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '224.0.0.1']) assert.ok(privateIp(ip), ip + ' özel olmalı');
  for (const ip of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700::1111']) assert.ok(!privateIp(ip), ip + ' genel olmalı');
  const sv = {h: process.env.WEBHOOK_ALLOW_HTTP, p: process.env.WEBHOOK_ALLOW_PRIVATE}; delete process.env.WEBHOOK_ALLOW_HTTP; delete process.env.WEBHOOK_ALLOW_PRIVATE;
  for (const u of ['http://8.8.8.8/x', 'ftp://8.8.8.8/x', 'https://localhost/x', 'https://127.0.0.1/x', 'https://[::1]/x', 'https://10.0.0.5/x', 'https://169.254.169.254/latest', 'https://u:p@8.8.8.8/x', 'https://foo.internal/x', 'bozuk']) await assert.rejects(() => run(() => checkTarget(u)), e => e.status === 400, u + ' reddedilmeli');
  assert.equal(await run(() => checkTarget('https://8.8.8.8/hook')), 'https://8.8.8.8/hook'); assert.equal((await adm('integrations/webhooks', {url: 'https://127.0.0.1/x', events: ['lead.created']})).status, 400, 'uç nokta üzerinden de reddedilir');
  assert.equal((await adm('integrations/webhooks', {url: 'http://127.0.0.1:9/x', events: ['lead.created']}, 'acme.localhost')).status, 400, 'firmalar http/özel adres bayrağını açamaz');
  process.env.WEBHOOK_ALLOW_HTTP = sv.h; process.env.WEBHOOK_ALLOW_PRIVATE = sv.p;

  // ---- API anahtarları ----
  assert.equal((await hit(adminH, '/api/platform/admin/', 'localhost', 'integrations/keys', undefined, 'anon')).status, 401, 'girişsiz yönetim yok');
  assert.equal((await adm('integrations/keys', {name: 'x', scopes: ['leads:read']})).status, 400, 'ad en az 2 karakter'); assert.equal((await adm('integrations/keys', {name: 'Boş', scopes: ['sistem:root']})).status, 400, 'geçersiz kapsam');
  r = await adm('integrations/keys', {name: 'Web sitesi', scopes: ['leads:read', 'leads:write']}); assert.equal(r.status, 201); const key1 = r.data.key; assert.match(key1, /^bmk_[A-Za-z0-9_-]{40,}$/);
  const list = await adm('integrations/keys'); assert.equal(list.data.keys.length, 1); assert.ok(!list.text.includes(key1) && !list.text.includes('hash'), 'liste anahtarı/özeti sızdırmaz'); assert.equal(list.data.keys[0].prefix, key1.slice(0, 12));
  const stored = JSON.stringify((await db.prepare("SELECT data FROM items WHERE kind='api_key'").all()).results); assert.ok(!stored.includes(key1), 'anahtar düz saklanmaz');

  // ---- kimlik doğrulama / kapsam ----
  assert.equal((await v1('me')).status, 401); assert.equal((await v1('me', {key: 'bmk_' + 'x'.repeat(43)})).status, 401); assert.equal((await v1('me', {key: 'Basic abc'})).status, 401); assert.equal((await v1('me', {key: key1 + 'a'})).status, 401, 'değiştirilmiş anahtar');
  r = await v1('me', {key: key1}); assert.equal(r.status, 200); assert.deepEqual(r.data.key.scopes, ['leads:read', 'leads:write']);
  assert.equal((await v1('customers', {key: key1})).status, 403, 'kapsam dışı'); assert.equal((await v1('invoices', {key: key1})).status, 403); assert.equal((await v1('yok', {key: key1})).status, 404);
  assert.equal((await adm('integrations/keys')).data.keys[0].lastUsed > 0, true, 'son kullanım işlenir');

  // ---- aday oluştur / oku ----
  const post = b => v1('leads', {key: key1, method: 'POST', body: b});
  assert.equal((await post({name: 'Ayşe Yılmaz', email: 'ayse@ornek.com'})).status, 400, 'consent zorunlu'); assert.equal((await post({name: 'A', email: 'ayse@ornek.com', consent: true})).status, 400); assert.equal((await post({name: 'Ayşe', email: 'gecersiz', consent: true})).status, 400); assert.equal((await post({name: 'Ayşe', consent: true})).status, 400, 'e-posta veya telefon');
  r = await post({name: 'Ayşe Yılmaz', email: 'Ayse@Ornek.com', service: 'Oturum izni', consent: true, consentText: 'Aydınlatma metnini onayladı'}); assert.equal(r.status, 201); assert.equal(r.data.created, true); r = await post({name: 'Ayşe Yılmaz', email: 'ayse@ornek.com', consent: true}); assert.equal(r.status, 200); assert.equal(r.data.created, false, 'aynı e-posta tekrar eklenmez');
  assert.ok((await db.prepare("SELECT owner FROM items WHERE kind='consent'").all()).results.some(x => x.owner === 'email:ayse@ornek.com'), 'rıza kaydı oluştu');
  r = await v1('leads', {key: key1}); assert.equal(r.status, 200); assert.equal(r.data.data.length, 1); assert.deepEqual([r.data.data[0].email, r.data.data[0].source, r.data.data[0].stage, r.data.data[0].service], ['ayse@ornek.com', 'API', 'new', 'Oturum izni']); assert.equal(r.data.next, null);
  assert.equal((await v1('leads?stage=won', {key: key1})).data.data.length, 0); assert.equal((await v1('leads?stage=zzz', {key: key1})).status, 400);

  // ---- okuma anahtarı + sayfalama ----
  r = await adm('integrations/keys', {name: 'Muhasebe', scopes: ['customers:read', 'invoices:read', 'cases:read']}); const key2 = r.data.key; const t0 = Date.now() - 3 * 864e5;
  for (let i = 1; i <= 3; i++) await person('cu' + i, 'Müşteri ' + i, t0 + i * 1000);
  await item('inv-1', 'invoice', 'cu1', {number: 'F-1', title: 'A', amount: 12345, currency: 'USD', status: 'Ödendi', paidAt: t0, service: 'oturum', issued: '2026-01-01'}, t0, t0 + 1000);
  await item('inv-2', 'invoice', 'cu2', {number: 'F-2', title: 'B', amount: 500, currency: 'BRL', status: 'Ödenmedi', due: '2026-02-01'}, t0, t0 + 2000); await item('inv-3', 'invoice', 'cu2', {number: 'F-3', title: 'C', amount: 700, currency: 'EUR', status: 'İptal'}, t0, t0 + 2000);
  await item('app-1', 'application', 'cu1', {service: 'Oturum izni', status: 'Aktif'}, t0, t0 + 1000); await item('cs-app-1', 'case_state', 'cu1', {stages: ['Başvuru', 'İnceleme'], stage: 1}, t0);
  const pages = async (path, limit) => { let cur = '', all = [], n = 0; do { r = await v1(path + (path.includes('?') ? '&' : '?') + 'limit=' + limit + (cur ? '&cursor=' + cur : ''), {key: key2}); assert.equal(r.status, 200, JSON.stringify(r.data)); all.push(...r.data.data); cur = r.data.next; n++; } while (cur && n < 20); return all; };
  const inv = await pages('invoices', 1); assert.deepEqual(inv.map(i => i.id), ['inv-1', 'inv-2', 'inv-3'], 'aynı güncelleme zamanlı kayıtlar da atlanmaz/tekrarlanmaz'); assert.deepEqual([inv[0].amount, inv[0].currency, inv[0].status, inv[0].customerId, inv[0].number], [12345, 'USD', 'paid', 'cu1', 'F-1']); assert.deepEqual(inv.map(i => i.status), ['paid', 'unpaid', 'cancelled']);
  assert.deepEqual((await pages('invoices?status=paid', 50)).map(i => i.id), ['inv-1']); assert.equal((await v1('invoices?status=zzz', {key: key2})).status, 400);
  assert.deepEqual((await pages('customers', 2)).map(c => c.id), ['cu1', 'cu2', 'cu3']); assert.ok(!JSON.stringify(await pages('customers', 50)).includes('"hash"'), 'müşteri çıktısında gizli alan yok');
  const cs = await pages('cases', 5); assert.deepEqual([cs[0].id, cs[0].customerId, cs[0].stage, cs[0].status], ['app-1', 'cu1', 'İnceleme', 'Aktif']); assert.equal((await v1('leads', {key: key2})).status, 403);
  assert.equal((await v1('invoices?limit=9999', {key: key2})).data.data.length, 3, 'limit üst sınırı'); assert.equal((await v1('invoices?cursor=bozuk', {key: key2})).data.data.length, 3, 'bozuk cursor yok sayılır');

  // ---- iptal, hız sınırı, firma izolasyonu ----
  assert.equal((await v1('me', {key: key2, host: 'acme.localhost'})).status, 401, 'başka firmanın hostunda anahtar geçersiz');
  r = await adm('integrations/keys', {name: 'Hız testi', scopes: ['cases:read']}); const key3 = r.data.key; let limited = 0, ok = 0; for (let i = 0; i < 125; i++) { const x = await v1('cases?limit=1', {key: key3}); if (x.status === 429) { limited++; assert.equal(x.res.headers.get('retry-after') > 0, true); } else ok++; } assert.equal(ok, 120, 'dakikada 120 istek'); assert.equal(limited, 5);
  const kid = (await adm('integrations/keys')).data.keys.find(k => k.name === 'Muhasebe').id; assert.equal((await adm('integrations/keys/revoke', {id: kid})).status, 200); assert.equal((await v1('me', {key: key2})).status, 401, 'iptal edilen anahtar çalışmaz'); assert.equal((await adm('integrations/keys/revoke', {id: 'ak-yok'})).status, 404);
  assert.equal((await adm('integrations/keys', undefined, 'acme.localhost')).data.keys.length, 0, 'acme anahtar listesi ayrı');

  // ---- webhook oluştur ----
  const old = Date.now() - 60e3; await item('inv-old', 'invoice', 'cu1', {number: 'F-0', amount: 1, currency: 'USD', status: 'Ödendi', paidAt: old}, old, old);
  assert.equal((await adm('integrations/webhooks', {url: HOOK, events: []})).status, 400); assert.equal((await adm('integrations/webhooks', {url: HOOK, events: ['sistem.silindi']})).status, 400);
  r = await adm('integrations/webhooks', {url: HOOK, events: ['lead.created', 'lead.won', 'customer.created', 'invoice.paid', 'case.completed'], description: 'Test'}); assert.equal(r.status, 201); const secret = r.data.secret, hid = r.data.id; assert.match(secret, /^whsec_/);
  r = await adm('integrations/webhooks'); assert.ok(!r.text.includes(secret), 'imza anahtarı listede yok'); assert.equal(r.data.webhooks[0].secretHint, '…' + secret.slice(-4)); assert.equal(r.data.webhooks[0].active, true);
  await run(() => scanEvents(db)); await run(() => flushOutbox(db)); assert.equal(got.length, 0, 'geçmiş kayıtlar (webhook öncesi) gönderilmez');
  const verify = g => { const m = /t=(\d+),v1=([0-9a-f]{64})/.exec(g.headers['x-bm-signature']); assert.ok(m, 'imza biçimi'); assert.equal(createHmac('sha256', secret).update(m[1] + '.' + g.body).digest('hex'), m[2], 'imza doğru'); assert.ok(Math.abs(Date.now() / 1000 - Number(m[1])) < 60); return JSON.parse(g.body); };
  const tick = async () => { await run(() => scanEvents(db)); await run(() => flushOutbox(db)); };

  // lead.created (API ile), tek sefer
  await post({name: 'Bora Kaya', email: 'bora@ornek.com', consent: true}); await sleep(5); await tick(); assert.equal(got.length, 1); let ev = verify(got[0]); assert.equal(got[0].headers['x-bm-event'], 'lead.created'); assert.equal(ev.type, 'lead.created'); assert.equal(ev.data.email, 'bora@ornek.com'); assert.equal(ev.id, got[0].headers['x-bm-delivery']); assert.equal(got[0].headers['user-agent'], 'BrazilMigration-Webhook/1');
  await tick(); await tick(); assert.equal(got.length, 1, 'aynı olay tekrar gönderilmez');
  // lead.won
  const leadId = (await db.prepare("SELECT id FROM items WHERE kind='lead' AND json_extract(data,'$.email')='bora@ornek.com'").first()).id; await db.prepare("UPDATE items SET data=json_set(data,'$.stage','won'), updated=? WHERE id=?").bind(Date.now(), leadId).run(); await tick(); assert.equal(got.length, 2); assert.equal(verify(got[1]).type, 'lead.won'); assert.equal(got[1].headers['x-bm-event'], 'lead.won');
  // invoice.paid, customer.created, case.completed
  await item('inv-new', 'invoice', 'cu3', {number: 'F-9', amount: 2500, currency: 'BRL', status: 'Ödendi', paidAt: Date.now(), service: 'sirket'}); await person('cu9', 'Yeni Müşteri', Date.now()); await item('app-9', 'application', 'cu9', {service: 'CPF', status: 'Tamamlandı'});
  await tick(); const types = got.slice(2).map(g => g.headers['x-bm-event']).sort(); assert.deepEqual(types, ['case.completed', 'customer.created', 'invoice.paid']); const inv9 = got.slice(2).map(verify).find(e => e.type === 'invoice.paid'); assert.deepEqual([inv9.data.id, inv9.data.amount, inv9.data.currency, inv9.data.customerId], ['inv-new', 2500, 'BRL', 'cu3']);
  await db.prepare("UPDATE items SET updated=? WHERE id='inv-new'").bind(Date.now()).run(); await tick(); assert.equal(got.length, 5, 'güncellenen ama zaten gönderilen fatura tekrar gitmez');
  // teslimat sonrası kişisel veri tutulmaz
  const rows = (await db.prepare("SELECT data FROM items WHERE kind='wh_out'").all()).results.map(x => JSON.parse(x.data)); assert.ok(rows.every(d => d.status === 'done' && Object.keys(d.payload).join() === 'ref'), 'payload temizlendi'); assert.ok(!JSON.stringify(rows).includes('bora@ornek.com'));
  r = await adm('integrations/webhooks/deliveries?id=' + hid); assert.equal(r.data.deliveries.length, 5); assert.ok(r.data.deliveries.every(d => d.status === 'done' && d.code === 200));

  // test ucu
  r = await adm('integrations/webhooks/test', {id: hid}); assert.equal(r.data.ok, true); assert.equal(got.length, 6); assert.equal(got[5].headers['x-bm-event'], 'ping'); verify(got[5]); assert.equal((await adm('integrations/webhooks/deliveries?id=' + hid)).data.deliveries.length, 5, 'test gönderimi günlüğe girmez');

  // ---- hata → yeniden deneme ----
  mode = 500; await post({name: 'Can Demir', email: 'can@ornek.com', consent: true}); await sleep(5); await tick(); assert.equal(got.length, 7);
  r = await adm('integrations/webhooks/deliveries?id=' + hid); let d0 = r.data.deliveries[0]; assert.deepEqual([d0.status, d0.attempts, d0.code, d0.error], ['pending', 1, 500, 'HTTP 500']); assert.ok(d0.next > Date.now() + 50e3, 'ilk yeniden deneme ~1 dk sonra');
  r = await adm('integrations/webhooks'); assert.equal(r.data.webhooks[0].fails, 1); assert.equal(r.data.webhooks[0].pending, 1); await tick(); assert.equal(got.length, 7, 'zamanı gelmeden tekrar denenmez');
  mode = 200; await db.prepare("UPDATE items SET data=json_set(data,'$.next',?) WHERE id=?").bind(Date.now() - 1, d0.id).run(); await tick(); assert.equal(got.length, 8); assert.equal(verify(got[7]).data.email, 'can@ornek.com', 'yeniden denemede aynı yük'); assert.equal(got[7].headers['x-bm-delivery'], d0.id, 'aynı teslimat kimliği');
  r = await adm('integrations/webhooks'); assert.equal(r.data.webhooks[0].fails, 0); assert.equal(r.data.webhooks[0].pending, 0); assert.equal((await adm('integrations/webhooks/deliveries?id=' + hid)).data.deliveries[0].status, 'done');
  // yönlendirme izlenmez
  mode = 302; await post({name: 'Deniz Ak', email: 'deniz@ornek.com', consent: true}); await sleep(5); await tick(); d0 = (await adm('integrations/webhooks/deliveries?id=' + hid)).data.deliveries[0]; assert.equal(d0.status, 'pending'); assert.match(d0.error, /Yönlendirme/); const n302 = got.length; assert.equal(n302, 9);
  // elle yeniden deneme
  mode = 200; assert.equal((await adm('integrations/webhooks/retry', {id: d0.id})).status, 200); assert.equal(got.length, 10); assert.equal((await adm('integrations/webhooks/deliveries?id=' + hid)).data.deliveries[0].status, 'done');

  // ---- art arda hata → otomatik pasif ----
  const hk = JSON.parse((await db.prepare('SELECT data FROM items WHERE id=?').bind(hid).first()).data); await db.prepare('UPDATE items SET data=? WHERE id=?').bind(JSON.stringify({...hk, fails: 14}), hid).run();
  mode = 500; await post({name: 'Ece Su', email: 'ece@ornek.com', consent: true}); await sleep(5); await tick(); r = await adm('integrations/webhooks'); assert.equal(r.data.webhooks[0].active, false); assert.match(r.data.webhooks[0].disabledReason, /otomatik durduruldu/); assert.equal(r.data.webhooks[0].pending, 0, 'pasifte bekleyen kalmaz');
  const nOff = got.length; await post({name: 'Fatih Er', email: 'fatih@ornek.com', consent: true}); await sleep(5); await tick(); assert.equal(got.length, nOff, 'pasif webhook gönderim yapmaz');
  // yeniden etkinleştirme geçmişi yeniden göndermez
  mode = 200; assert.equal((await adm('integrations/webhooks/update', {id: hid, active: true})).status, 200); await tick(); assert.equal(got.length, nOff, 'pasifken oluşan olaylar etkinleşince gönderilmez');
  await post({name: 'Gül Ak', email: 'gul@ornek.com', consent: true}); await sleep(5); await tick(); assert.equal(got.length, nOff + 1); assert.equal(verify(got[got.length - 1]).data.email, 'gul@ornek.com');
  // güncelle / sil
  assert.equal((await adm('integrations/webhooks/update', {id: hid, events: ['invoice.paid']})).status, 200); assert.equal((await adm('integrations/webhooks/update', {id: hid, events: []})).status, 400); await post({name: 'Hale Ok', email: 'hale@ornek.com', consent: true}); await sleep(5); await tick(); assert.equal(got.length, nOff + 1, 'seçili olmayan olay gönderilmez');
  assert.equal((await adm('integrations/webhooks/delete', {id: hid})).status, 200); assert.equal((await adm('integrations/webhooks')).data.webhooks.length, 0); assert.equal(Number((await db.prepare("SELECT COUNT(*) AS n FROM items WHERE kind='wh_out'").first()).n), 0, 'silinince teslimat kayıtları da gider'); assert.equal((await adm('integrations/webhooks/delete', {id: hid})).status, 404);
  assert.ok((await db.prepare("SELECT data FROM items WHERE kind='audit'").all()).results.some(x => /api.key.create/.test(x.data)) && (await db.prepare("SELECT data FROM items WHERE kind='audit'").all()).results.some(x => /webhook.create/.test(x.data)), 'denetim kayıtları');
  // acme (başka firma) hiçbir şey görmez
  assert.equal((await adm('integrations/webhooks', undefined, 'acme.localhost')).data.webhooks.length, 0);
  console.log('integrations tests: PASS');
} finally { srv.close(); }
process.exit(0);
