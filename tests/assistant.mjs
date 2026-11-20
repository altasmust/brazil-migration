// AI asistan (onaylı): kural tabanlı yedek + (sahte) model yolu, onay akışı, garanti ifadesi engeli, görev çıkarma, belge özeti.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-assist-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite');
process.env.LOCAL_BLOB_DIR = join(dir, 'blobs');
process.env.TENANT_DB_DIR = join(dir, 'tenants');
process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.SMTP_HOST; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {getMainDatabase} = await import(R + 'db.mjs');
const {casesAdmin} = await import(R + 'cases.mjs');
const {assistantAdmin, extractTasks, hasGuarantee} = await import(R + 'assistant.mjs');

const db = getMainDatabase(); await db.ready();
const run = (sql, ...a) => db.prepare(sql).bind(...a).run(), get = (sql, ...a) => db.prepare(sql).bind(...a).first();
const jreq = (path, body) => new Request('http://x/api/platform/admin/' + path, {method: body === undefined ? 'GET' : 'POST', headers: {'Content-Type': 'application/json'}, body: body === undefined ? undefined : JSON.stringify(body)});
const call = async (mod, route, body) => { try { const r = await mod(jreq(route, body), db, route.split('?')[0], {actor: 'Yönetici', bucket: BUCKET}); return {status: r.status, data: await r.json()}; } catch (e) { return {status: e.status || 500, data: {error: e.message}}; } };
const ai = (route, body) => call(assistantAdmin, route, body), cs = (route, body) => call(casesAdmin, route, body);
const BUCKET = {get: async () => ({arrayBuffer: async () => new TextEncoder().encode('%PDF-1.4 sahte').buffer})};
const mk = (id, name, email) => run('INSERT INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', id, 'u-' + id, email, name, 'customer', 'owner', '{}', '{}', 'active', 'owner', null, Date.now());
const item = (id, kind, owner, data) => run('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', id, kind, owner, JSON.stringify(data), Date.now(), Date.now());

try {
  // ---- yardımcılar ----
  for (const t of ['Başvurunuz kesinlikle onaylanır, %100 garanti', 'We guarantee approval', 'Aprovação garantida', 'تضمین می‌کنیم']) assert.equal(hasGuarantee(t), true, t);
  for (const t of ['Başvurunuz değerlendirilecektir.', 'Süre genellikle birkaç hafta sürer.']) assert.equal(hasGuarantee(t), false, t);
  const ex = extractTasks('Görüşme özeti\nMüşteri pasaportunu yenileyecek.\n\nYapılacaklar:\n- Apostilli doğum belgesini iste\n- Avukat incelemesini 2026-12-05 tarihine kadar tamamla\n1) Polícia Federal randevusunu takip et\n- ok\n- Apostilli doğum belgesini iste');
  assert.deepEqual(ex.map(t => t.title), ['Apostilli doğum belgesini iste', 'Avukat incelemesini tarihine kadar tamamla', 'Polícia Federal randevusunu takip et'].map(x => x)); assert.equal(ex[1].due, '2026-12-05');

  // ---- veri: müşteri + başvuru + dosya şablonu + belge + destek mesajı ----
  await mk('c1', 'Ayşe Yılmaz', 'ayse@test.com'); await item('a1', 'application', 'c1', {service: 'Oturum İzni', status: 'Aktif', advisor: 'owner', stages: null});
  const oturum = (await cs('cases/templates')).data.templates.find(t => t.builtin === 'oturum'); assert.equal((await cs('cases/assign', {applicationId: 'a1', templateId: oturum.id})).status, 200);
  await item('d1', 'document', 'c1', {title: 'Pasaport', name: 'pasaport.pdf', mime: 'application/pdf', key: 'private/x', status: 'Yüklendi'});

  // ---- yapılandırma yok: kural tabanlı yedek ----
  let r = await ai('ai/status'); assert.equal(r.data.configured, false); assert.equal(r.data.pending, 0);
  r = await ai('ai/customers?q=ayşe'); assert.equal(r.data.customers.length, 1); assert.equal(r.data.customers[0].caseId, 'a1');

  // eksik belge: kontrol listesinden; müşterinin dilinde taslak; yüklenen kalem düşer
  r = await ai('ai/missing', {caseId: 'a1'}); assert.equal(r.status, 200); assert.equal(r.data.missing.length, r.data.total); assert.ok(r.data.total >= 3); assert.ok(r.data.draft);
  const first = r.data.missing[0]; assert.equal((await cs('cases/checklist', {applicationId: 'a1', itemId: first.id, status: 'onaylandi'})).status, 200);
  r = await ai('ai/missing', {caseId: 'a1'}); assert.equal(r.data.have, 1); assert.ok(!r.data.missing.some(m => m.id === first.id));
  assert.equal((await ai('ai/missing', {caseId: 'yok'})).status, 404);
  let drafts = (await ai('ai/drafts')).data.drafts; assert.equal(drafts.length, 2); assert.ok(drafts.every(d => d.status === 'pending' && d.by === 'rule' && d.customer === 'Ayşe Yılmaz')); assert.ok(drafts[0].text.includes('• '));
  assert.equal((await get("SELECT COUNT(*) n FROM items WHERE kind='ticket'")).n, 0, 'onaydan önce hiçbir şey gönderilmez');

  // onay: uygulama içi mesaj olarak gider; ikinci kez onaylanamaz
  const d0 = drafts[0].id; r = await ai('ai/drafts/approve', {id: d0, channel: 'app'}); assert.equal(r.status, 200);
  const tk = JSON.parse((await get("SELECT data FROM items WHERE kind='ticket' AND owner='c1'")).data); assert.equal(tk.messages.length, 1); assert.match(tk.messages[0].sender, /AI taslağı, onaylı/);
  assert.equal((await ai('ai/drafts/approve', {id: d0})).status, 404);

  // garanti ifadesi: işaretlenir, onaylanamaz; düzeltince onaylanır; ret çalışır
  const d1 = drafts[1].id; r = await ai('ai/drafts/update', {id: d1, text: 'Başvurunuz %100 onaylanır, garanti ediyoruz.'}); assert.deepEqual(r.data.flags, ['guarantee']);
  assert.equal((await ai('ai/drafts/approve', {id: d1})).status, 400);
  assert.equal((await ai('ai/drafts/approve', {id: d1, text: 'Belgelerinizi bekliyoruz.'})).status, 200);

  // taslak yanıt: önce müşteri mesajı olmalı
  assert.equal((await ai('ai/draft-reply', {customerId: 'c1'})).status, 400, 'yanıtlanacak müşteri mesajı yok');
  const t2 = {...tk}; t2.messages = [...tk.messages, {sender: 'Ayşe Yılmaz', text: 'Evraklar ne zaman hazır olur?', at: Date.now() + 5}]; await run("UPDATE items SET data=?, updated=? WHERE kind='ticket'", JSON.stringify(t2), Date.now());
  r = await ai('ai/draft-reply', {customerId: 'c1'}); assert.equal(r.status, 200); assert.equal(r.data.source, 'rule');
  const rep = (await ai('ai/drafts')).data.drafts.find(d => d.id === r.data.id); assert.match(rep.text, /Danışmanımız|danışmanım/i); assert.equal(rep.replyTo, 'Evraklar ne zaman hazır olur?');
  assert.equal((await ai('ai/drafts/reject', {id: rep.id})).status, 200); assert.equal((await ai('ai/drafts')).data.drafts.length, 0); assert.equal((await ai('ai/drafts?status=rejected')).data.drafts.length, 1);

  // görevler: görüşme notundan → onayla → gerçek görev
  assert.equal((await ai('ai/tasks', {text: 'kısa'})).status, 400);
  r = await ai('ai/tasks', {caseId: 'a1', text: 'Görüşme notu\nYapılacaklar:\n- Apostilli doğum belgesini iste\n- Avukat incelemesini 2026-12-05 tarihine kadar tamamla'}); assert.equal(r.data.ids.length, 2); assert.equal(r.data.source, 'rule');
  assert.equal((await ai('ai/tasks', {text: 'Sadece sohbet, görev yok burada.'})).data.none, true);
  const tdr = (await ai('ai/drafts')).data.drafts.filter(d => d.type === 'task'); assert.equal(tdr.length, 2);
  assert.equal((await ai('ai/drafts/approve', {id: tdr[0].id})).status, 200); assert.equal((await ai('ai/drafts/approve', {id: tdr[1].id, text: 'Avukat incelemesini tamamla', due: '2026-12-09'})).status, 200);
  const ct = (await db.prepare("SELECT data FROM items WHERE kind='case_task' AND owner='c1'").all()).results.map(x => JSON.parse(x.data)).filter(x => x.source === 'ai'); assert.equal(ct.length, 2); assert.ok(ct.every(t => t.caseId === 'a1' && t.status === 'todo')); assert.ok(ct.some(t => t.due === '2026-12-09'));

  // belge özeti (anahtar yok → bilgi notu) → onayla → belgeye işlenir
  r = await ai('ai/doc-summary', {documentId: 'd1'}); assert.equal(r.data.source, 'rule'); assert.equal((await ai('ai/doc-summary', {documentId: 'yok'})).status, 404);
  assert.equal((await ai('ai/drafts/approve', {id: r.data.id})).status, 200); assert.ok(JSON.parse((await get("SELECT data FROM items WHERE id='d1'")).data).aiSummary.text.includes('Pasaport'));

  // ---- model yolu (sahte Anthropic yanıtları) ----
  process.env.ANTHROPIC_API_KEY = 'sk-test'; const realFetch = globalThis.fetch; let calls = [];
  globalThis.fetch = async (u, o) => { if (!String(u).includes('api.anthropic.com')) return realFetch(u, o); const b = JSON.parse(o.body); calls.push(b); const last = JSON.stringify(b.messages[0].content);
    const text = /JSON dizisi/.test(last) ? '[{"title":"Evrakları kontrol et","due":"2026-12-10"},{"title":"Müşteriyi ara","due":"gecersiz"}]' : /belgeyi danışman/.test(last) ? 'Pasaport. Geçerlilik 2030.' : 'Merhaba Ayşe, evraklarınız hazırlanıyor; kesin süre için size döneceğim. Sonucu garanti edemem.';
    return new Response(JSON.stringify({content: [{type: 'text', text}]}), {status: 200, headers: {'content-type': 'application/json'}}); };
  assert.equal((await ai('ai/status')).data.configured, true);
  r = await ai('ai/draft-reply', {customerId: 'c1'}); assert.equal(r.data.source, 'ai'); assert.ok(calls[0].system.includes('garanti etme'), 'sistem talimatı garanti yasağını içerir'); assert.ok(!JSON.stringify(calls[0]).includes('ayse@test.com'), 'e-posta modele gönderilmez');
  assert.equal((await ai('ai/drafts')).data.drafts.find(d => d.id === r.data.id).by, 'ai');
  r = await ai('ai/tasks', {customerId: 'c1', text: 'Uzun görüşme notu: müşteri evrakları getirecek, sonra aranacak.'}); assert.equal(r.data.source, 'ai'); const tt = (await ai('ai/drafts')).data.drafts.filter(d => d.type === 'task'); assert.equal(tt.length, 2); assert.equal(tt.find(t => t.title === 'Müşteriyi ara').due, '');
  r = await ai('ai/doc-summary', {documentId: 'd1'}); assert.equal(r.data.source, 'ai'); assert.ok(calls.at(-1).messages[0].content.some(c => c.type === 'document'), 'PDF modele belge bloğu olarak gider');
  globalThis.fetch = async () => new Response('hata', {status: 500}); r = await ai('ai/draft-reply', {customerId: 'c1'}); assert.equal(r.data.source, 'rule', 'model hata verirse yedeğe düşer');
  globalThis.fetch = realFetch; delete process.env.ANTHROPIC_API_KEY;

  console.log('PASS: AI assistant (approval-only drafts, missing-docs, reply drafts, tasks from notes, doc summary, guarantee guard, rule fallback, model path)');
} finally { rmSync(dir, {recursive: true, force: true}); }
process.exit(0);
