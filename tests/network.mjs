// Partner ağı: opt-in dizin, rıza şartlı yönlendirme, kabule kadar gizli iletişim bilgisi, durum geri bildirimi, firmalar arası izolasyon.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-network-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite');
process.env.LOCAL_BLOB_DIR = join(dir, 'blobs');
process.env.TENANT_DB_DIR = join(dir, 'tenants');
process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform} = await import(R + 'http.mjs');
const {resolveTenant, updateTenant} = await import(R + 'tenant.mjs');
const {getMainDatabase} = await import(R + 'db.mjs');
const auth = platform('auth'), adminH = platform('admin'), jars = {};
async function hit(handler, base, host, path, body) {
  const headers = {Host: host, Origin: 'http://' + host}; if (jars[host]) headers.Cookie = jars[host];
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await handler(new Request('http://' + host + base + path, {method: body === undefined ? 'GET' : 'POST', headers, body: payload}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set) jars[host] = set.split(';')[0];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return {status: res.status, data};
}
const call = (h, p, b) => hit(auth, '/api/auth/', h, p, b), adm = (h, p, b) => hit(adminH, '/api/platform/admin/', h, p, b);
const tokenOf = link => new URL(link).searchParams.get('sifre');
const A = 'acme.localhost', B = 'beta.localhost', C = 'gama.localhost';

try {
  const hosts = {};
  for (const [slug, name] of [['acme', 'Acme Göç'], ['beta', 'Beta Visa'], ['gama', 'Gama Danışmanlık']]) {
    const r = await call('localhost', 'tenant/create', {name, slug, email: `owner@${slug}.test`}); const h = slug + '.localhost'; hosts[slug] = h;
    await call(h, 'reset', {token: tokenOf(r.data.devLink), password: 'Parola2026' + slug}); assert.equal((await call(h, 'admin/login', {email: `owner@${slug}.test`, password: 'Parola2026' + slug})).status, 200);
  }
  const tenant = async h => resolveTenant(new Request('http://' + h + '/', {headers: {Host: h}})), acme = await tenant(A), beta = await tenant(B);

  // profil ve dizin: varsayılan gizli, isteyen listelenir, iletişim e-postası dizinde görünmez
  assert.equal((await adm(A, 'network/me')).data.profile, null);
  assert.equal((await adm(B, 'network/profile', {name: 'Beta Visa', contactEmail: 'kotu', listed: true, countries: ['Brezilya'], services: ['Vize']})).status, 400);
  assert.equal((await adm(B, 'network/profile', {contactEmail: 'ağ@beta.test', listed: true})).status, 400);                         // listelenmek için ülke + hizmet
  assert.equal((await adm(B, 'network/profile', {contactEmail: 'ag@beta.test', listed: true, countries: ['Brezilya', 'Portekiz'], services: ['Vize', 'Oturum İzni'], languages: ['pt', 'tr'], about: 'Vize uzmanı', share: 15})).status, 200);
  assert.equal((await adm(C, 'network/profile', {contactEmail: 'ag@gama.test', listed: false, countries: ['Brezilya'], services: ['Vize']})).status, 200);   // gizli kalır
  assert.equal((await adm(A, 'network/profile', {contactEmail: 'ag@acme.test', listed: false})).status, 200);
  let r = await adm(A, 'network/directory'); assert.equal(r.data.firms.length, 1); assert.equal(r.data.firms[0].name, 'Beta Visa'); assert.equal(r.data.firms[0].contactEmail, undefined); assert.equal(r.data.firms[0].tenant !== undefined, true);
  assert.equal((await adm(A, 'network/directory?country=portekiz')).data.firms.length, 1); assert.equal((await adm(A, 'network/directory?country=japonya')).data.firms.length, 0); assert.equal((await adm(A, 'network/directory?service=oturum')).data.firms.length, 1);
  assert.equal((await adm(B, 'network/directory')).data.firms.length, 0);                                                              // kendisi listede çıkmaz
  const betaId = r.data.firms[0].tenant;

  // yönlendirme: rıza şart, listelenmemiş/olmayan firmaya gidemez
  const ref = {to: betaId, name: 'Mehmet Demir', email: 'mehmet@test.com', phone: '+90 532 111 22 33', country: 'Türkiye', service: 'Vize', note: 'Emekli, acil', share: 10, consent: true};
  assert.equal((await adm(A, 'network/refs/send', {...ref, consent: false})).status, 400);
  assert.equal((await adm(A, 'network/refs/send', {...ref, to: (await tenant(C)).id})).status, 404);                                   // gizli firma
  assert.equal((await adm(A, 'network/refs/send', {...ref, to: acme.id})).status, 404);                                                // kendine
  assert.equal((await adm(A, 'network/refs/send', {...ref, name: 'M'})).status, 400);
  r = await adm(A, 'network/refs/send', ref); assert.equal(r.status, 200); const id1 = r.data.id;
  assert.equal((await adm(A, 'network/refs/send', ref)).status, 409);                                                                  // aynı müşteri tekrar gönderilmez

  // gizlilik: alıcı kabulden önce iletişim bilgisini görmez
  r = await adm(B, 'network/refs'); assert.equal(r.data.received.length, 1); let rc = r.data.received[0];
  assert.equal(rc.masked, true); assert.equal(rc.client.email, undefined); assert.equal(rc.client.phone, undefined); assert.equal(rc.client.name, 'Mehmet D.'); assert.equal(rc.from, 'Acme Göç'); assert.equal(rc.service, 'Vize');
  assert.ok(!JSON.stringify(r.data).includes('mehmet@test.com') && !JSON.stringify(r.data).includes('532'));
  r = await adm(A, 'network/refs'); assert.equal(r.data.sent.length, 1); assert.equal(r.data.sent[0].client.email, 'mehmet@test.com'); assert.equal(r.data.sent[0].to, 'Beta Visa'); assert.equal(r.data.received.length, 0);
  // üçüncü firma hiçbir şey görmez, dokunamaz
  r = await adm(C, 'network/refs'); assert.equal(r.data.sent.length + r.data.received.length, 0);
  assert.equal((await adm(C, 'network/refs/respond', {id: id1, action: 'accept'})).status, 404);
  assert.equal((await adm(A, 'network/refs/respond', {id: id1, action: 'accept'})).status, 404);                                       // gönderen kendi yönlendirmesini kabul edemez
  assert.equal((await adm(B, 'network/refs/withdraw', {id: id1})).status, 404);                                                        // alıcı geri çekemez
  assert.equal((await adm(B, 'network/refs/status', {id: id1, status: 'won'})).status, 409);                                           // kabul etmeden durum yok

  // kabul → alıcı firmanın kendi veritabanında aday oluşur, iletişim bilgisi açılır
  r = await adm(B, 'network/refs/respond', {id: id1, action: 'accept', note: 'Yarın ararız'}); assert.equal(r.status, 200); assert.ok(r.data.leadId);
  const lead = await beta.db.prepare('SELECT data FROM items WHERE id=?').bind(r.data.leadId).first(), ld = JSON.parse(lead.data);
  assert.equal(ld.email, 'mehmet@test.com'); assert.equal(ld.source, 'Partner ağı'); assert.equal(ld.consent, true); assert.equal(ld.stage, 'new');
  assert.equal((await acme.db.prepare("SELECT COUNT(*) n FROM items WHERE kind='lead'").first()).n, 0);                                // gönderenin DB'sine dokunulmaz
  rc = (await adm(B, 'network/refs')).data.received[0]; assert.equal(rc.masked, false); assert.equal(rc.client.email, 'mehmet@test.com');
  assert.equal((await adm(B, 'network/refs/respond', {id: id1, action: 'decline'})).status, 409);
  // durum geri bildirimi + kayıtlı pay (para hareketi yok)
  assert.equal((await adm(B, 'network/refs/status', {id: id1, status: 'contacted'})).status, 200);
  assert.equal((await adm(B, 'network/refs/status', {id: id1, status: 'iptal'})).status, 400);
  assert.equal((await adm(B, 'network/refs/status', {id: id1, status: 'won', value: 2000, currency: 'USD', note: 'Sözleşme imzalandı'})).status, 200);
  r = await adm(A, 'network/refs'); const s1 = r.data.sent[0]; assert.equal(s1.status, 'won'); assert.equal(s1.value, 200000); assert.ok(s1.history.some(h => h.text.includes('%10') && h.text.includes('200.00 USD') && h.text.includes('platform dışında')));
  assert.equal(JSON.parse((await beta.db.prepare('SELECT data FROM items WHERE id=?').bind(ld.leadId || (await adm(B, 'sales/leads')).data.leads[0].id).first()).data).stage, 'won');   // alıcı adayı da kazanıldı
  assert.equal((await adm(B, 'network/refs/status', {id: id1, status: 'lost'})).status, 409);                                          // kapanmış

  // red ve geri çekme: iletişim bilgisi silinir
  const ref2 = {...ref, name: 'Ali Veli Can', email: 'ali@test.com', phone: ''}; r = await adm(A, 'network/refs/send', ref2); const id2 = r.data.id;
  assert.equal((await adm(B, 'network/refs/respond', {id: id2, action: 'decline', note: 'Kapasite yok'})).status, 200);
  const raw = async id => JSON.parse((await getMainDatabase().prepare('SELECT data FROM net_ref WHERE id=?').bind(id).first()).data);
  assert.equal((await raw(id2)).client.email, ''); assert.equal((await raw(id2)).client.name, 'Ali C.');
  r = await adm(A, 'network/refs/send', {...ref2, email: 'veli@test.com'}); const id3 = r.data.id; assert.equal((await adm(A, 'network/refs/withdraw', {id: id3})).status, 200); assert.equal((await raw(id3)).client.email, '');
  assert.equal((await adm(A, 'network/refs/withdraw', {id: id1})).status, 409);

  // dizinden çıkınca / firma askıya alınınca listelenmez
  assert.equal((await adm(B, 'network/profile', {contactEmail: 'ag@beta.test', listed: false})).status, 200); assert.equal((await adm(A, 'network/directory')).data.firms.length, 0);
  assert.equal((await adm(A, 'network/refs/send', {...ref2, email: 'yeni@test.com'})).status, 404);
  await adm(B, 'network/profile', {contactEmail: 'ag@beta.test', listed: true, countries: ['Brezilya'], services: ['Vize']}); assert.equal((await adm(A, 'network/directory')).data.firms.length, 1);
  await updateTenant(beta.id, {status: 'suspended'}); assert.equal((await adm(A, 'network/directory')).data.firms.length, 0);

  console.log('PASS: partner network — opt-in directory, consent-gated referrals, contact details hidden until accepted, lead created only in receiver DB, status feedback, share recorded only, decline/withdraw scrub, per-firm isolation');
} finally { rmSync(dir, {recursive: true, force: true}); }
process.exit(0);
