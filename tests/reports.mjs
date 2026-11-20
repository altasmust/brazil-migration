// Raporlar: dönüşüm hunisi/kazanma süresi, gelir (para birimi ayrı, danışman payı, bekleyen/vadesi geçmiş), dosya süresi, danışman performansı, tarih aralığı, CSV (+enjeksiyon koruması, denetim), yetki ve firma izolasyonu.
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-reports-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite'); process.env.LOCAL_BLOB_DIR = join(dir, 'blobs'); process.env.TENANT_DB_DIR = join(dir, 'tenants'); process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform} = await import(R + 'http.mjs');
const {resolveTenant} = await import(R + 'tenant.mjs');

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
const A = 'acme.localhost', B = 'beta.localhost', DAYMS = 864e5, T = Date.now(), ago = d => T - d * DAYMS, ds = ms => new Date(ms).toISOString().slice(0, 10);

try {
  let r = await call('localhost', 'tenant/create', {name: 'Acme Göç', slug: 'acme', email: 'owner@acme.test'}); const a = r.data.devLink;
  r = await call('localhost', 'tenant/create', {name: 'Beta Visa', slug: 'beta', email: 'owner@beta.test'}); const b = r.data.devLink;
  await call(A, 'reset', {token: tokenOf(a), password: 'AcmeParola2026'}, A + '#adm'); await call(B, 'reset', {token: tokenOf(b), password: 'BetaParola2026'}, B + '#adm');
  assert.equal((await call(A, 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'}, A + '#adm')).status, 200); assert.equal((await call(B, 'admin/login', {email: 'owner@beta.test', password: 'BetaParola2026'}, B + '#adm')).status, 200);
  const acme = await resolveTenant(new Request('http://' + A + '/', {headers: {Host: A}})), db = acme.db;
  assert.equal((await hit(adminH, '/api/platform/admin/', A, 'reports', undefined, 'anon')).status, 401, 'girişsiz erişim yok');
  const e = (await adm(A, 'reports')).data; assert.equal(e.conversion.leads, 0); assert.equal(e.conversion.winRate, null); assert.equal(e.cases.avgDays, null); assert.deepEqual(e.revenue.gross, {}, 'boş veride çökmez');

  const person = (id, name, role, advisor, created, source = null) => db.prepare("INSERT INTO people(id,uid,email,name,role,manager,permissions,scope,status,advisor,source,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, null, id + '@t.test', name, role, 'owner', '{}', '{}', 'active', advisor, source, created).run();
  const item = (id, kind, owner, data, created) => db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(id, kind, owner, JSON.stringify(data), created, created).run();
  await person('adv1', 'Ayşe Danışman', 'advisor', null, ago(300)); await person('c1', '=HYPERLINK("x")', 'customer', 'adv1', ago(50), 'Referans'); await person('c2', 'Mehmet Müşteri', 'customer', null, ago(8));
  const hist = (at, text) => [{at, by: 'Y', kind: 'stage', text}];
  await item('lead-1', 'lead', 'owner', {name: 'Kazanan', email: 'w@t.test', source: 'Web sitesi', service: 'Oturum', stage: 'won', at: ago(40), history: hist(ago(30), 'Aşama: Teklif verildi → Kazanıldı')}, ago(40));
  await item('lead-2', 'lead', 'owner', {name: 'Kaybeden', email: 'l@t.test', source: 'Web sitesi', service: 'Oturum', stage: 'lost', at: ago(35), history: []}, ago(35));
  await item('lead-3', 'lead', 'owner', {name: 'Teklifte', email: 'q@t.test', source: 'Instagram', service: 'Şirket', stage: 'quoted', at: ago(20), history: []}, ago(20));
  await item('lead-4', 'lead', 'owner', {name: 'Eski', email: 'o@t.test', source: 'Web sitesi', stage: 'new', at: ago(200), history: []}, ago(200));
  await item('q-1', 'quote', 'owner', {status: 'accepted', amount: 50000, currency: 'USD'}, ago(25)); await item('q-2', 'quote', 'owner', {status: 'draft', amount: 1, currency: 'USD'}, ago(24));
  await item('i1', 'invoice', 'c1', {title: 'Oturum', number: 'F-1', amount: 100000, currency: 'USD', status: 'Ödendi', paidAt: ago(10), service: 'oturum', advisor: 'adv1', rate: 25}, ago(12));
  await item('i2', 'invoice', 'c2', {title: 'Şirket', number: 'F-2', amount: 30000, currency: 'BRL', status: 'Ödendi', paidAt: ago(5), service: 'sirket'}, ago(6));
  await item('i3', 'invoice', 'c1', {title: 'Eski ödeme', number: 'F-3', amount: 99999, currency: 'USD', status: 'Ödendi', paidAt: ago(200), service: 'oturum'}, ago(201));
  await item('i4', 'invoice', 'c2', {title: 'Bekleyen', number: 'F-4', amount: 20000, currency: 'USD', status: 'Ödenmedi', due: ds(ago(2)), service: 'diger'}, ago(7));
  await item('i5', 'invoice', 'c2', {title: 'İptal', number: 'F-5', amount: 5, currency: 'USD', status: 'İptal'}, ago(3));
  await item('app1', 'application', 'c1', {service: 'Oturum izni', status: 'Tamamlandı'}, ago(60)); await item('cs-app1', 'case_state', 'c1', {stages: ['A', 'B'], stage: 1, events: [{t: ago(25)}, {t: ago(20)}]}, ago(60));
  await item('app2', 'application', 'c1', {service: 'Şirket kurulumu', status: 'Aktif'}, ago(10)); await item('cs-app2', 'case_state', 'c1', {stages: ['Belgeler', 'İnceleme'], stage: 1, events: []}, ago(10));
  await item('app3', 'application', 'c2', {service: 'Şirket kurulumu', status: 'Başvuru alındı'}, ago(5));

  // ---- varsayılan aralık (son 90 gün) ----
  r = await adm(A, 'reports'); assert.equal(r.status, 200); const d = r.data;
  assert.equal(d.range.to, ds(T)); assert.equal(d.range.from, ds(T - 89 * DAYMS));
  const c = d.conversion; assert.equal(c.leads, 3, 'aralık dışı aday sayılmaz'); assert.equal(c.won, 1); assert.equal(c.winRate, 50); assert.equal(c.leadToWon, 33.3); assert.equal(c.avgDaysToWin, 10, 'kazanma süresi geçmişten');
  assert.deepEqual(c.funnel.map(f => f.count), [3, 2, 2, 2, 1]); assert.equal(c.open, 1); assert.deepEqual(c.bySource.find(s => s.source === 'Web sitesi'), {source: 'Web sitesi', leads: 2, won: 1}); assert.equal(c.quotes.total, 2); assert.equal(c.quotes.sent, 1); assert.equal(c.quotes.accepted, 1); assert.deepEqual(c.quotes.acceptedValue, {USD: 50000});
  const v = d.revenue; assert.deepEqual(v.gross, {USD: 100000, BRL: 30000}, 'para birimleri ayrı, aralık dışı ödeme yok'); assert.deepEqual(v.commission, {USD: 25000}); assert.equal(v.count, 2); assert.deepEqual(v.outstanding.amount, {USD: 20000}); assert.equal(v.outstanding.overdueCount, 1); assert.equal(v.cancelled, 1);
  assert.deepEqual(v.byService.map(s => [s.service, s.currency, s.amount]).sort(), [['oturum', 'USD', 100000], ['sirket', 'BRL', 30000]]); assert.ok(v.monthly.every(m => /^\d{4}-\d{2}$/.test(m.month)));
  const k = d.cases; assert.equal(k.opened, 2 + 1 - 0, 'app1 aralık dışı açılışlı değil ama 60 gün önce: aralıkta'); // app1 (60g), app2 (10g), app3 (5g) → hepsi son 90 günde
  assert.equal(k.completed, 1); assert.equal(k.active, 2); assert.equal(k.avgDays, 40, 'süre: açılış → son olay'); assert.deepEqual(k.byStage.map(s => s.stage).sort(), ['Başvuru alındı', 'İnceleme']);
  const adv = Object.fromEntries(d.advisors.map(x => [x.id, x])); assert.equal(adv.adv1.customers, 1); assert.equal(adv.adv1.completedCases, 1); assert.equal(adv.adv1.activeCases, 1); assert.deepEqual(adv.adv1.revenue, {USD: 100000}); assert.deepEqual(adv.adv1.commission, {USD: 25000}); assert.equal(adv.adv1.avgDays, 40);
  assert.equal(adv.owner.name, 'Merkez ofis'); assert.equal(adv.owner.customers, 1); assert.deepEqual(adv.owner.revenue, {BRL: 30000}); assert.equal(adv.owner.newCustomers, 1); assert.deepEqual(d.customerSources.map(s => s.source).sort(), ['Doğrudan', 'Referans'], 'yeni müşteri kaynakları (kaynağı yoksa Doğrudan)');

  // ---- tarih aralığı ----
  r = await adm(A, `reports?from=${ds(ago(15))}&to=${ds(ago(4))}`); assert.deepEqual(r.data.revenue.gross, {USD: 100000, BRL: 30000}); assert.equal(r.data.conversion.leads, 0); assert.equal(r.data.cases.opened, 2);
  r = await adm(A, `reports?from=${ds(ago(15))}&to=${ds(ago(8))}`); assert.deepEqual(r.data.revenue.gross, {USD: 100000}, 'bitiş günü dâhil, sonrası hariç');
  assert.equal((await adm(A, 'reports?from=2026-05-01&to=2026-04-01')).status, 400); assert.equal((await adm(A, 'reports?from=2000-01-01&to=2026-04-01')).status, 400, '5 yıldan uzun aralık reddedilir'); assert.equal((await adm(A, 'reports?from=bozuk')).status, 200, 'bozuk tarih varsayılana düşer');

  // ---- CSV ----
  r = await adm(A, 'reports/csv?section=revenue'); assert.equal(r.status, 200); assert.match(r.res.headers.get('content-type'), /text\/csv/); assert.match(r.res.headers.get('content-disposition'), /rapor-revenue-\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv/);
  const lines = r.text.replace(/^﻿/, '').split('\r\n'); assert.equal(lines[0], 'Ödeme tarihi;Fatura no;Başlık;Müşteri;Hizmet;Danışman;Tutar;Para birimi;Danışman payı'); assert.equal(lines.length, 3); assert.ok(lines.some(l => l.includes('F-1') && l.includes('"1000,00";USD;"250,00"') && l.includes("'=HYPERLINK")), 'tutar, pay ve formül enjeksiyonu koruması: ' + lines.join('|'));
  for (const sec of ['leads', 'cases', 'advisors']) { r = await adm(A, 'reports/csv?section=' + sec); assert.equal(r.status, 200, sec); assert.ok(r.text.split('\r\n').length >= 2, sec); }
  assert.ok((await adm(A, 'reports/csv?section=cases')).text.includes(';40'), 'dosya süresi CSV'); assert.equal((await adm(A, 'reports/csv?section=x')).status, 400); assert.equal((await adm(A, 'reports/csv')).status, 400);
  assert.ok((await db.prepare("SELECT data FROM items WHERE kind='audit'").all()).results.some(x => /report.export/.test(x.data)), 'dışa aktarma denetim kaydı');
  // ---- firma izolasyonu ----
  r = await adm(B, 'reports'); assert.equal(r.status, 200); assert.equal(r.data.conversion.leads, 0); assert.deepEqual(r.data.revenue.gross, {}); assert.equal(r.data.advisors.length, 0, 'başka firmanın danışmanı görünmez'); assert.equal((await adm(B, 'reports/csv?section=revenue')).text.replace(/^﻿/, '').split('\r\n').length, 1);
  console.log('reports tests: PASS');
} finally { /* tmp */ }
process.exit(0);
