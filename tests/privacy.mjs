// KVKK/LGPD/GDPR: aydınlatma metni, rıza kaydı, müşteri dışa aktarma + talep, silme (anonimleştirme), mali kayıtların saklanması, denetim izi, firma izolasyonu.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-privacy-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite'); process.env.LOCAL_BLOB_DIR = join(dir, 'blobs'); process.env.TENANT_DB_DIR = join(dir, 'tenants'); process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform} = await import(R + 'http.mjs');
const {resolveTenant} = await import(R + 'tenant.mjs');
const {runWithTenant} = await import(R + 'tenant-context.mjs');
const {getBucket} = await import(R + 'storage.mjs');
const {buildNotice} = await import(R + 'privacy.mjs');

const auth = platform('auth'), adminH = platform('admin'), jars = {};
async function hit(handler, base, host, path, body, jar = host) {
  const headers = {Host: host, Origin: 'http://' + host, 'User-Agent': 'TestAgent/1.0'}; if (jars[jar]) headers.Cookie = jars[jar];
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await handler(new Request('http://' + host + base + path, {method: body === undefined ? 'GET' : 'POST', headers, body: payload}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set) jars[jar] = set.split(';')[0];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return {status: res.status, data, res, text};
}
const call = (h, p, b, jar) => hit(auth, '/api/auth/', h, p, b, jar), adm = (h, p, b) => hit(adminH, '/api/platform/admin/', h, p, b, h + '#adm');
const tokenOf = link => new URL(link, 'http://x').searchParams.get('sifre');
const A = 'acme.localhost', B = 'beta.localhost', old = Date.now() - 6000;

try {
  let r = await call('localhost', 'tenant/create', {name: 'Acme Göç', slug: 'acme', email: 'owner@acme.test', lang: 'pt'}); const a = r.data.devLink;
  r = await call('localhost', 'tenant/create', {name: 'Beta Visa', slug: 'beta', email: 'owner@beta.test'}); const b = r.data.devLink;
  await call(A, 'reset', {token: tokenOf(a), password: 'AcmeParola2026'}, A + '#adm'); await call(B, 'reset', {token: tokenOf(b), password: 'BetaParola2026'}, B + '#adm');
  assert.equal((await call(A, 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'}, A + '#adm')).status, 200); assert.equal((await call(B, 'admin/login', {email: 'owner@beta.test', password: 'BetaParola2026'}, B + '#adm')).status, 200);
  const acme = await resolveTenant(new Request('http://' + A + '/', {headers: {Host: A}})), db = acme.db;
  const rows = async sql => (await db.prepare(sql).all()).results;

  // ---- aydınlatma metni üretici ----
  const n1 = buildNotice({legalName: 'Acme Ltda', contactEmail: 'kvkk@acme.test', regions: ['kvkk', 'lgpd', 'gdpr'], processors: 'Bulut', retention: '5 yıl', aiUse: true}, 'pt'); assert.equal(n1.title, 'Aviso de Privacidade'); assert.ok(n1.sections.find(s => s.list?.length === 3), '3 mevzuat için 3 hak maddesi'); assert.ok(JSON.stringify(n1).includes('IA'));
  assert.equal(buildNotice({regions: ['kvkk']}, 'en').title, 'Privacy Notice'); assert.equal(buildNotice({regions: ['kvkk']}, 'xx').title, 'Kişisel Verilerin Korunması ve Aydınlatma Metni');
  r = await call(A, 'privacy/notice?lang=en'); assert.equal(r.status, 200); assert.equal(r.data.firm, 'Acme Göç');
  assert.equal((await adm(A, 'privacy/settings', {regions: [], contactEmail: 'a@b.co'})).status, 400); assert.equal((await adm(A, 'privacy/settings', {regions: ['lgpd'], contactEmail: 'gecersiz'})).status, 400);
  assert.equal((await adm(A, 'privacy/settings', {legalName: 'Acme Ltda', contactEmail: 'kvkk@acme.test', regions: ['kvkk', 'lgpd'], retention: '5 yıl', aiUse: false})).status, 200);
  assert.equal((await call(A, 'privacy/notice?lang=tr')).data.firm, 'Acme Ltda'); assert.equal((await adm(A, 'privacy/settings')).data.preview.sections.length, 8);

  // ---- rıza kaydı: kayıt formu, başvuru formu ----
  r = await call(A, 'register', {name: 'Kaan Demir', email: 'kaan@test.com', password: 'Parola2026x', consent: true, consentText: 'KVKK metnini okudum', marketing: true}, 'kaan'); assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal((await call(A, 'register', {name: 'Rıza Yok', email: 'riza@test.com', password: 'Parola2026x'}, 'x')).status, 400);
  const kaan = await db.prepare("SELECT id FROM people WHERE email='kaan@test.com'").first(); const kc = (await rows("SELECT data FROM items WHERE kind='consent'")).map(x => JSON.parse(x.data)); assert.ok(kc.some(c => c.type === 'privacy-notice' && c.source === 'register')); assert.ok(kc.some(c => c.type === 'marketing' && c.granted));
  assert.equal((await adm(A, 'sales/form', {enabled: true})).status, 200); assert.equal((await call(A, 'sales/lead', {name: 'Mehmet Demir', email: 'mehmet@test.com', consent: true, ts: old, service: 'Vize'}, 'l')).status, 200);
  assert.ok((await rows("SELECT owner FROM items WHERE kind='consent'")).some(x => x.owner === 'email:mehmet@test.com'), 'form rızası e-posta adına kaydedilir');

  // ---- müşteri: hesabı hazırla (davet → şifre → giriş), mali + belge + mesaj verisi ekle ----
  r = await adm(A, 'sales/leads'); const lead = r.data.leads.find(l => l.email === 'mehmet@test.com'); r = await adm(A, 'sales/leads/convert', {id: lead.id}); const cust = r.data.customerId;
  await call(A, 'reset', {token: tokenOf(r.data.devLink), password: 'Musteri2026x'}, 'cust'); assert.equal((await call(A, 'login', {email: 'mehmet@test.com', password: 'Musteri2026x'}, 'cust')).status, 200);
  await runWithTenant(acme, async () => { await getBucket().put('private/' + cust + '/d1', new TextEncoder().encode('gizli belge')); });
  const ins = (id, kind, data, owner = cust) => db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(id, kind, owner, JSON.stringify(data), Date.now(), Date.now()).run();
  await ins('d1', 'document', {title: 'Pasaport', name: 'p.pdf', mime: 'application/pdf', key: 'private/' + cust + '/d1', status: 'Yüklendi'}); await ins('t1', 'ticket', {subject: 'Soru', status: 'İşlemde', messages: [{sender: 'Mehmet', text: 'Merhaba', at: Date.now()}]});
  await ins('inv1', 'invoice', {title: 'Danışmanlık', amount: 100000, status: 'Ödendi'}); await ins('app1', 'application', {service: 'Vize', status: 'Aktif'});
  const blobFile = join(process.cwd(), process.env.LOCAL_BLOB_DIR, 't', acme.id, 'private', cust, 'd1'); assert.ok(existsSync(blobFile), 'blob yazıldı: ' + blobFile);

  // ---- müşteri uçları ----
  assert.equal((await call(A, 'privacy/me', undefined, 'anon')).status, 401);
  r = await call(A, 'privacy/me', undefined, 'cust'); assert.equal(r.status, 200); assert.equal(r.data.marketing, false); assert.equal(r.data.contact, 'kvkk@acme.test'); assert.ok(r.data.consents.length >= 1);
  assert.equal((await call(A, 'privacy/me/consent', {type: 'marketing', granted: true}, 'cust')).data.marketing, true); assert.equal((await call(A, 'privacy/me', undefined, 'cust')).data.marketing, true);
  assert.equal((await call(A, 'privacy/me/consent', {type: 'marketing', granted: false}, 'cust')).data.marketing, false); assert.equal((await call(A, 'privacy/me/consent', {type: 'x'}, 'cust')).status, 400);
  r = await call(A, 'privacy/me/export', undefined, 'cust'); assert.equal(r.status, 200); assert.match(r.res.headers.get('content-disposition'), /attachment/); const ex = r.data;
  assert.equal(ex.person.email, 'mehmet@test.com'); assert.ok(ex.records.some(x => x.kind === 'ticket') && ex.records.some(x => x.kind === 'invoice') && ex.records.some(x => x.kind === 'document')); assert.ok(!JSON.stringify(ex).includes('private/' + cust), 'dosya anahtarı dışa aktarılmaz'); assert.ok(ex.leads.length === 1 && ex.consents.length >= 2);
  r = await call(A, 'privacy/me/request', {type: 'delete', note: 'Hesabımı silin'}, 'cust'); assert.equal(r.status, 200); assert.ok(Math.abs(r.data.due - (Date.now() + 15 * 864e5)) < 5000, 'LGPD seçiliyken 15 gün');
  assert.equal((await call(A, 'privacy/me/request', {type: 'delete'}, 'cust')).status, 409); assert.equal((await call(A, 'privacy/me/request', {type: 'x'}, 'cust')).status, 400);

  // ---- yönetici: talep listesi, ret, silme ----
  r = await adm(A, 'privacy/requests'); assert.equal(r.data.requests.length, 1); const reqId = r.data.requests[0].id; assert.equal(r.data.requests[0].overdue, false); assert.equal(r.data.requests[0].name, 'Mehmet Demir');
  assert.equal((await adm(A, 'privacy/requests/resolve', {id: reqId, action: 'reject'})).status, 400, 'ret gerekçesiz olmaz'); assert.equal((await adm(A, 'privacy/requests/resolve', {id: reqId, action: 'done'})).status, 400, 'silme onaysız olmaz');
  r = await adm(A, 'privacy/export?person=' + cust); assert.equal(r.status, 200); assert.equal(r.data.person.id, cust);
  assert.equal((await adm(B, 'privacy/export?person=' + cust)).status, 404, 'başka firma erişemez'); assert.equal((await adm(B, 'privacy/requests')).data.requests.length, 0);
  assert.equal((await adm(A, 'privacy/erase', {person: kaan.id, confirm: 'evet'})).status, 400);
  r = await adm(A, 'privacy/requests/resolve', {id: reqId, action: 'done', confirm: 'SİL', note: 'Silindi'}); assert.equal(r.status, 200); const rep = r.data.report;
  assert.equal(rep.files, 1); assert.equal(rep.deleted.ticket, 1); assert.equal(rep.deleted.document, 1); assert.equal(rep.retained.invoice, 1); assert.ok(!existsSync(blobFile), 'belge dosyası silindi');
  const gone = await db.prepare('SELECT name,email,status,uid FROM people WHERE id=?').bind(cust).first(); assert.deepEqual([gone.name, gone.status, gone.uid], ['Silinen kullanıcı', 'deleted', null]); assert.match(gone.email, /^deleted-.*@silindi\.invalid$/);
  assert.equal((await rows("SELECT id FROM items WHERE owner='" + cust + "' AND kind IN ('ticket','document','application')")).length, 0); assert.equal((await rows("SELECT id FROM items WHERE id='inv1'")).length, 1, 'fatura saklanır');
  assert.equal((await rows("SELECT id FROM items WHERE kind='lead' AND lower(json_extract(data,'$.email'))='mehmet@test.com'")).length, 0, 'aday kaydı silindi');
  assert.notEqual((await call(A, 'login', {email: 'mehmet@test.com', password: 'Musteri2026x'}, 'cust2')).status, 200, 'silinen hesapla giriş yapılamaz');
  assert.equal((await adm(A, 'privacy/requests?status=done')).data.requests.length, 1);

  // ---- rıza listesi + CSV + denetim izi ----
  r = await adm(A, 'privacy/consents?type=marketing'); assert.ok(r.data.consents.length >= 2 && r.data.consents.every(c => c.type === 'marketing'));
  r = await adm(A, 'privacy/consents.csv'); assert.match(r.res.headers.get('content-type'), /text\/csv/); assert.ok(r.text.replace(/^\uFEFF/, '').startsWith('Kişi;E-posta;Tür'));
  r = await adm(A, 'privacy/audit?q=privacy'); assert.ok(r.data.audit.some(x => x.action === 'privacy.erase') && r.data.audit.some(x => x.action === 'privacy.request.done') && r.data.audit.some(x => x.action === 'privacy.request.delete'));
  r = await adm(A, 'privacy/audit.csv'); assert.ok(r.text.includes('privacy.erase'));
  console.log('PASS: privacy notice generator (tr/en/pt, regions), consent register, customer export/requests, erasure (anonymise + files + retained financial records), audit trail, tenant isolation');
} finally { rmSync(dir, {recursive: true, force: true}); rmSync(join(process.cwd(), process.env.LOCAL_BLOB_DIR), {recursive: true, force: true}); }
process.exit(0);
