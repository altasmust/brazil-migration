// Dosya yönetimi: şablonlar, atama, aşama panosu, kontrol listesi, süreler, görevler, hatırlatıcılar, müşteri görünümü, firma izolasyonu.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-cases-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite');
process.env.LOCAL_BLOB_DIR = join(dir, 'blobs');
process.env.TENANT_DB_DIR = join(dir, 'tenants');
process.env.DEMO_SEED = 'off';
delete process.env.RESEND_API_KEY; delete process.env.SMTP_HOST; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {getMainDatabase} = await import(R + 'db.mjs');
const {casesAdmin, casesCustomer, runCaseReminders, BUILTIN} = await import(R + 'cases.mjs');
const {createTenant} = await import(R + 'tenant.mjs');
const {runWithTenant} = await import(R + 'tenant-context.mjs');

const db = getMainDatabase(); await db.ready();
const run = (sql, ...a) => db.prepare(sql).bind(...a).run();
const get = async (sql, ...a) => (await db.prepare(sql).bind(...a).first());
const jreq = (path, body, method) => new Request('http://x/api/platform/admin/' + path, {method: method || (body === undefined ? 'GET' : 'POST'), headers: {'Content-Type': 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});
const adm = async (route, body) => { try { const r = await casesAdmin(jreq(route, body), db, route.split('?')[0], {actor: 'Test'}); return {status: r.status, data: await r.json()}; } catch (e) { return {status: e.status || 500, data: {error: e.message}}; } };
const cust = async (person, route, body) => { try { const r = await casesCustomer(jreq(route, body), db, route, person); return {status: r.status, data: await r.json()}; } catch (e) { return {status: e.status || 500, data: {error: e.message}}; } };
const mkCustomer = (id, name, email) => run('INSERT INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', id, 'u-' + id, email, name, 'customer', 'owner', '{}', '{}', 'active', 'owner', null, Date.now());
const mkApp = (id, owner, service) => run("INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)", id, 'application', owner, JSON.stringify({service, from: 'Türkiye', to: 'Brezilya (São Paulo)', status: 'Başvuru alındı', advisor: 'owner', stages: null}), Date.now(), Date.now());
const mkDoc = (id, owner) => run("INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)", id, 'document', owner, JSON.stringify({title: 'Pasaport', name: 'pasaport.pdf', mime: 'application/pdf', direction: 'out', key: 'private/x'}), Date.now(), Date.now());

try {
  // hazır şablonlar ilk istekte yüklenir; firma düzenleyebilir/silebilir
  let r = await adm('cases/templates'); assert.equal(r.status, 200);
  assert.equal(r.data.templates.length, BUILTIN.length); assert.ok(r.data.templates.every(t => t.stages.length >= 2 && t.checklist.length >= 1));
  const oturum = r.data.templates.find(t => t.builtin === 'oturum');
  r = await adm('cases/templates', {name: 'X', stages: ['Tek']}); assert.equal(r.status, 400);                                  // en az iki aşama
  r = await adm('cases/templates', {name: 'Kendi şablonum', service: 'Vize', stages: ['Başvuru alındı', 'İnceleme', 'Bitti'], checklist: [{name: 'Pasaport'}, {name: 'Foto', required: false}], tasks: [{title: 'Ara', stage: 9, dueDays: 3}], deadlines: [{label: 'Vize bitişi'}]});
  assert.equal(r.status, 200); const own = r.data.id;
  r = await adm('cases/templates'); const mine = r.data.templates.find(t => t.id === own); assert.equal(mine.tasks[0].stage, 2); assert.equal(mine.checklist.length, 2);
  r = await adm('cases/templates/delete', {id: own}); assert.equal(r.status, 200);
  assert.equal((await adm('cases/templates')).data.templates.length, BUILTIN.length);

  // müşteri + başvuru; şablona atanmamışlar listelenir, otomatik atama hizmete göre eşler
  await mkCustomer('c1', 'Ayşe Yılmaz', 'ayse@test.com'); await mkCustomer('c2', 'Bruno Silva', 'bruno@test.com');
  await mkApp('a1', 'c1', 'Oturum İzni'); await mkApp('a2', 'c2', 'Vize'); await mkDoc('d1', 'c1'); await mkDoc('d2', 'c2');
  r = await adm('cases/board'); assert.equal(r.data.unassigned.length, 2); assert.equal(r.data.cases.length, 0);
  r = await adm('cases/assign', {applicationId: 'a1', templateId: oturum.id}); assert.equal(r.status, 200);
  r = await adm('cases/auto', {}); assert.equal(r.data.assigned, 1);                                                           // yalnız a2 kaldı
  r = await adm('cases/board'); assert.equal(r.data.unassigned.length, 0); assert.equal(r.data.cases.length, 2);
  const c1 = r.data.cases.find(c => c.applicationId === 'a1'); assert.equal(c1.stage, 1); assert.equal(c1.stages[1], 'Belgeler toplanıyor'); assert.equal(c1.progress.have, 0); assert.ok(c1.tasks >= 4);
  // müşterinin mevcut yol haritası (application.data.stages) şablonla eşitlendi
  let app = JSON.parse((await get("SELECT data FROM items WHERE id='a1'")).data); assert.deepEqual(app.stages.map(s => s.s), ['done', 'doing', 'wait', 'wait', 'wait', 'wait']);

  // aşama taşıma: yol haritası, kapanış durumu, müşteri bildirimi ve zaman çizelgesi
  r = await adm('cases/move', {applicationId: 'a1', stage: 99}); assert.equal(r.status, 400);
  assert.equal((await adm('cases/move', {applicationId: 'a1', stage: 3})).status, 200);
  app = JSON.parse((await get("SELECT data FROM items WHERE id='a1'")).data); assert.deepEqual(app.stages.map(s => s.s), ['done', 'done', 'done', 'doing', 'wait', 'wait']); assert.equal(app.status, 'Başvuru alındı');
  assert.equal((await adm('cases/move', {applicationId: 'a1', stage: 5})).status, 200);
  assert.equal(JSON.parse((await get("SELECT data FROM items WHERE id='a1'")).data).status, 'Tamamlandı');
  await adm('cases/move', {applicationId: 'a1', stage: 2});
  assert.equal(JSON.parse((await get("SELECT data FROM items WHERE id='a1'")).data).status, 'Aktif');                         // geri alınca yeniden açılır
  assert.ok(await get("SELECT id FROM items WHERE kind='notice' AND owner='c1' AND json_extract(data,'$.title') LIKE 'Dosyanız yeni aşamada%'"));

  // belge kontrol listesi: yönetici belgeyi bağlar/onaylar/reddeder, müşteri kendi belgesini yükler
  r = await adm('cases/case?id=a1'); const items = r.data.state.checklist; assert.ok(items.length >= 6); assert.equal(r.data.documents.length, 1);
  const pass = items[0];
  assert.equal((await adm('cases/checklist', {applicationId: 'a1', itemId: pass.id, documentId: 'd2'})).status, 404);          // başka müşterinin belgesi bağlanamaz
  r = await adm('cases/checklist', {applicationId: 'a1', itemId: pass.id, documentId: 'd1'}); assert.equal(r.status, 200); assert.equal(r.data.progress.have, 1);
  r = await adm('cases/checklist', {applicationId: 'a1', itemId: pass.id, status: 'onaylandi'}); assert.equal(r.data.progress.approved, 1);
  r = await adm('cases/checklist', {applicationId: 'a1', itemId: items[1].id, status: 'reddedildi', note: 'Apostil eksik'}); assert.equal(r.status, 200);
  assert.equal((await adm('cases/checklist', {applicationId: 'a1', itemId: items[1].id, status: 'uydurma'})).status, 400);
  assert.equal((await adm('cases/checklist/add', {applicationId: 'a1', name: 'Banka dekontu'})).status, 200);
  const person = {id: 'c1', role: 'customer', name: 'Ayşe Yılmaz'};
  r = await cust(person, 'case/mine'); assert.equal(r.status, 200); assert.equal(r.data.cases.length, 1);
  const mineCase = r.data.cases[0]; assert.equal(mineCase.stage, 2); assert.equal(mineCase.checklist.find(c => c.id === items[1].id).note, 'Apostil eksik');
  assert.ok(mineCase.events.length >= 3); assert.ok(mineCase.events.every(e => e.text));
  assert.equal((await cust({id: 'c2', role: 'customer', name: 'B'}, 'case/mine')).data.cases.length, 1);                     // yalnız kendi dosyası
  assert.equal((await cust({id: 'c2', role: 'customer', name: 'B'}, 'case/attach', {applicationId: 'a1', itemId: items[1].id, documentId: 'd2'})).status, 403);
  assert.equal((await cust(person, 'case/attach', {applicationId: 'a1', itemId: items[1].id, documentId: 'd2'})).status, 404);  // başkasının belgesi
  r = await cust(person, 'case/attach', {applicationId: 'a1', itemId: items[1].id, documentId: 'd1'}); assert.equal(r.status, 200); assert.equal(r.data.progress.have, 2);
  assert.equal((await cust({id: 'x', role: 'advisor'}, 'case/mine')).data.cases.length, 0);
  assert.equal((await cust({id: 'x', role: 'advisor'}, 'case/attach', {})).status, 403);

  // süreler + hatırlatıcı (60/30/14/7/1 eşikleri; geç eklenen süre tek mesajda birleşir; tekrar gönderilmez)
  const today = new Date(); const addDays = n => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + n)).toISOString().slice(0, 10);
  const dl = (await adm('cases/case?id=a1')).data.state.deadlines; assert.ok(dl.length >= 3);
  assert.equal((await adm('cases/deadline', {applicationId: 'a1', id: dl[0].id, label: dl[0].label, date: '2026-13-45'})).status, 400);
  assert.equal((await adm('cases/deadline', {applicationId: 'a1', id: dl[0].id, label: dl[0].label, date: addDays(25)})).status, 200);
  assert.equal((await adm('cases/deadline', {applicationId: 'a1', label: 'Pasaport yenileme', date: addDays(-3)})).status, 200);
  assert.equal(await runCaseReminders(db), 2);                                       // 25 gün kaldı → 30 eşiği; geçmiş süre → firmaya uyarı
  assert.equal(await runCaseReminders(db), 0);                                       // aynı gün tekrar yok
  assert.equal(await runCaseReminders(db, Date.now() + 19 * 864e5), 1);              // 6 gün kaldı → 14 ve 7 eşikleri tek mesaj
  assert.ok(await get("SELECT id FROM items WHERE kind='notice' AND owner='c1' AND json_extract(data,'$.title') LIKE '%gün sonra%'"));
  assert.ok(await get("SELECT id FROM items WHERE kind='notice' AND owner='owner' AND json_extract(data,'$.title') LIKE 'Süre geçti%'"));
  r = await adm('cases/deadlines'); assert.ok(r.data.deadlines.length >= 2); assert.ok(r.data.deadlines.every((d, i, a) => !i || a[i - 1].days <= d.days));
  assert.equal((await cust(person, 'case/mine')).data.cases[0].deadlines.length >= 2, true);
  await adm('cases/event', {applicationId: 'a1', text: 'İç not: müşteri aranacak', visible: false}); await adm('cases/event', {applicationId: 'a1', text: 'Randevu alındı', visible: true});
  const ev = (await cust(person, 'case/mine')).data.cases[0].events.map(e => e.text); assert.ok(ev.includes('Randevu alındı')); assert.ok(!ev.some(t => t.includes('İç not')));

  // görev panosu
  r = await adm('cases/tasks'); const t0 = r.data.tasks[0]; assert.ok(r.data.tasks.length >= 8); assert.ok(t0.customer && t0.service);
  assert.equal((await adm('cases/tasks', {id: t0.id, status: 'doing'})).status, 200); assert.equal((await adm('cases/tasks', {id: t0.id, status: 'x'})).status, 400);
  r = await adm('cases/tasks', {title: 'Elle görev', caseId: 'a2', due: addDays(2)}); assert.equal(r.status, 200);
  assert.equal((await adm('cases/tasks')).data.tasks.find(t => t.id === r.data.id).customer, 'Bruno Silva');
  assert.equal((await adm('cases/tasks/delete', {id: r.data.id})).status, 200);
  assert.equal((await adm('cases/templates/delete', {id: oturum.id})).status, 409);                                          // kullanımdaki şablon silinemez

  // firma izolasyonu: başka firmanın veritabanında bu dosyalar görünmez
  const other = await createTenant({name: 'Öteki Göç', slug: 'oteki', ownerEmail: 'o@oteki.test'});
  await runWithTenant(other, async () => {
    await other.db.ready();
    const rr = await casesAdmin(jreq('cases/board'), other.db, 'cases/board', {}); const d = await rr.json();
    assert.equal(d.cases.length, 0); assert.equal(d.unassigned.length, 0); assert.equal(d.templates.length, BUILTIN.length);
  });
  assert.equal((await adm('cases/yok')).status, 404);

  console.log('PASS: case templates, assignment, stage board + roadmap sync, checklist/document links, deadlines + reminders, task board, customer view, isolation');
} finally {
  rmSync(dir, {recursive: true, force: true});
}
process.exit(0);
