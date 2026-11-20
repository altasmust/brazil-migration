// Faz 4 · İletişim: birleşik gelen kutusu (e-posta + uygulama içi), çok dilli şablonlar, müşteri dil tercihi, firma izolasyonu.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-comms-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite');
process.env.LOCAL_BLOB_DIR = join(dir, 'blobs');
process.env.TENANT_DB_DIR = join(dir, 'tenants');
process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform} = await import(R + 'http.mjs');
const {resolveTenant} = await import(R + 'tenant.mjs');
const {runWithTenant} = await import(R + 'tenant-context.mjs');
const {renderTpl, langOf, TEMPLATES} = await import(R + 'comms.mjs');

const auth = platform('auth'), adminH = platform('admin'), jars = {};
async function hit(handler, base, host, path, body) {
  const headers = {Host: host, Origin: 'http://' + host, 'User-Agent': 'TestAgent/1.0'}; if (jars[host]) headers.Cookie = jars[host];
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await handler(new Request('http://' + host + base + path, {method: body === undefined ? 'GET' : 'POST', headers, body: payload}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set) jars[host] = set.split(';')[0];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; } return {status: res.status, data};
}
const call = (h, p, b) => hit(auth, '/api/auth/', h, p, b), adm = (h, p, b) => hit(adminH, '/api/platform/admin/', h, p, b);
const tokenOf = link => new URL(link).searchParams.get('sifre');
const A = 'acme.localhost', B = 'beta.localhost', old = Date.now() - 6000;

try {
  let r = await call('localhost', 'tenant/create', {name: 'Acme Göç', slug: 'acme', email: 'owner@acme.test', lang: 'pt'}); const a = r.data.devLink;
  r = await call('localhost', 'tenant/create', {name: 'Beta Visa', slug: 'beta', email: 'owner@beta.test'}); const b = r.data.devLink;
  await call(A, 'reset', {token: tokenOf(a), password: 'AcmeParola2026'}); await call(B, 'reset', {token: tokenOf(b), password: 'BetaParola2026'});
  assert.equal((await call(A, 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'})).status, 200);
  assert.equal((await call(B, 'admin/login', {email: 'owner@beta.test', password: 'BetaParola2026'})).status, 200);
  const acme = await resolveTenant(new Request('http://' + A + '/', {headers: {Host: A}}));
  const inA = fn => runWithTenant(acme, () => fn(acme.db));

  // ---- şablonlar: Türkçe metin eski e-postalarla birebir; diğer diller dolu; firma varsayılan dili pt ----
  for (const [k, t] of Object.entries(TEMPLATES)) for (const l of ['tr', 'en', 'pt', 'fa']) assert.ok(t[l]?.subject && t[l]?.text, `${k}.${l} eksik`);
  const q = await inA(db => renderTpl(db, 'quote.ready', 'tr', {title: 'Vize', first: 'Ali', number: 'T-1', total: '100,00 BRL', valid: '2026-12-01'}));
  assert.equal(q.subject, 'Teklifiniz: Vize'); assert.equal(q.title, 'Merhaba Ali,'); assert.equal(q.text, 'Vize için teklifiniz hazır (T-1). Toplam: 100,00 BRL. Geçerlilik: 2026-12-01. Bağlantıdan inceleyip kabul edebilir veya yanıtlayabilirsiniz.'); assert.equal(q.button, 'Teklifi görüntüle');
  assert.equal(await inA(db => langOf(db, 'kimse@test.com')), 'pt', 'bilinmeyen kişi: firma varsayılanı');
  assert.equal(await inA(db => langOf(db, 'kimse@test.com', 'EN')), 'en', 'ipucu önce gelir');

  // ---- başvuru formu: müşterinin dilinde teşekkür + gelen kutusu kaydı ----
  assert.equal((await adm(A, 'sales/form', {enabled: true})).status, 200);
  const form = {name: 'Mehmet Demir', email: 'mehmet@test.com', phone: '+90 532 111 22 33', country: 'Türkiye', service: 'Oturum İzni', message: 'Emekli oturumu', consent: true, ts: old};
  assert.equal((await call(A, 'sales/lead', {...form, lang: 'en'})).status, 200);
  assert.equal((await call(A, 'sales/lead', {...form, name: 'Joao Silva', email: 'joao@test.com'})).status, 200);   // dil yok → firma varsayılanı (pt)
  r = await adm(A, 'inbox/threads'); assert.equal(r.status, 200); assert.equal(r.data.threads.length, 2);
  const tm = r.data.threads.find(t => t.email === 'mehmet@test.com'), tj = r.data.threads.find(t => t.email === 'joao@test.com');
  assert.equal(tm.lastText, 'We received your request — Acme Göç'); assert.equal(tj.lastText, 'Recebemos sua solicitação — Acme Göç'); assert.equal(tm.channel, 'email');
  assert.equal(await inA(db => langOf(db, 'mehmet@test.com')), 'en', 'form dili tercih olarak saklanır');
  assert.equal((await adm(B, 'inbox/threads')).data.threads.length, 0, 'başka firma göremez');
  r = await adm(A, 'inbox/thread?id=' + encodeURIComponent(tm.id)); assert.equal(r.data.items.length, 1); assert.ok(!JSON.stringify(r.data).includes('http'), 'bağlantı/jeton günlükte yok');

  // ---- müşteriye dönüştür: şifre/davet e-postaları günlüğe yazılmaz; yeni e-postalar kişinin kaydına düşer ----
  r = await adm(A, 'sales/leads'); const lead = r.data.leads.find(l => l.email === 'mehmet@test.com');
  r = await adm(A, 'sales/leads/convert', {id: lead.id}); assert.equal(r.status, 200); const cust = r.data.customerId, invite = r.data.devLink;
  const logs = await acme.db.prepare("SELECT data FROM items WHERE kind='mail_log'").all();
  assert.ok(!logs.results.some(x => /davet|şifre|doğrula|invite/i.test(JSON.parse(x.data).subject)), 'oturum/davet e-postaları kaydedilmemeli');
  assert.equal((await adm(A, 'inbox/thread?id=nope')).status, 404);

  // ---- müşteri kendi dilini seçer (oturum gerekli) ----
  assert.equal((await call(A, 'lang', {lang: 'en'})).status, 401);
  await call(A, 'reset', {token: new URL(invite, 'http://x').searchParams.get('sifre'), password: 'Musteri2026x'});
  assert.equal((await call(A, 'login', {email: 'mehmet@test.com', password: 'Musteri2026x'})).status, 200);
  assert.equal((await call(A, 'lang', {lang: 'zz'})).status, 400);
  assert.equal((await call(A, 'lang', {lang: 'fa'})).status, 200); assert.equal(await inA(db => langOf(db, 'mehmet@test.com')), 'fa');
  assert.equal((await call(A, 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'})).status, 200);   // yönetici oturumuna geri dön

  // ---- gelen kutusundan yanıt: e-posta (müşterinin dilinde konu) ve uygulama içi ----
  assert.equal((await adm(A, 'inbox/lang', {person: cust, lang: 'en'})).status, 200);
  r = await adm(A, 'inbox/reply', {person: cust, channel: 'email', text: 'Evraklarınız tamam.'}); assert.equal(r.status, 200);
  assert.equal((await adm(A, 'inbox/reply', {person: cust, channel: 'email', text: ''})).status, 400);
  r = await adm(A, 'inbox/reply', {person: cust, channel: 'app', text: 'Merhaba, randevu perşembe.', subject: 'Randevu'}); assert.equal(r.status, 200);
  const tk = await acme.db.prepare("SELECT id, data FROM items WHERE kind='ticket' AND owner=?").bind(cust).first(); const td = JSON.parse(tk.data);
  assert.equal(td.status, 'Yanıt Bekliyor'); assert.equal(td.messages.length, 1); assert.equal(td.messages[0].sender, 'Yönetici');
  assert.equal((await acme.db.prepare("SELECT COUNT(*) n FROM items WHERE kind='notice' AND owner=?").bind(cust).first()).n >= 1, true, 'müşteriye bildirim');
  // müşteri yanıtı (uygulama içi) → akışta "gelen" olarak görünür
  const person = await acme.db.prepare('SELECT name FROM people WHERE id=?').bind(cust).first();
  td.messages.push({sender: person.name, text: 'Teşekkürler!', at: Date.now() + 5}); await acme.db.prepare('UPDATE items SET data=?, updated=? WHERE id=?').bind(JSON.stringify(td), Date.now(), tk.id).run();
  r = await adm(A, 'inbox/thread?id=' + cust); const its = r.data.items;
  assert.ok(its.some(i => i.ch === 'email' && i.dir === 'out' && /new message/i.test(i.subject)), 'e-posta müşterinin dilinde (en) gitmeli'); assert.ok(its.some(i => i.ch === 'app' && i.dir === 'out')); assert.ok(its.some(i => i.ch === 'app' && i.dir === 'in' && i.text === 'Teşekkürler!'));
  assert.equal(r.data.lang, 'en'); assert.equal(r.data.tickets.length, 1);
  assert.equal((await adm(A, 'inbox/log', {person: cust, subject: 'Re: Evraklar', text: 'Gönderdim.'})).status, 200);
  assert.ok((await adm(A, 'inbox/thread?id=' + cust)).data.items.some(i => i.dir === 'in' && i.ch === 'email'));
  assert.equal((await adm(A, 'inbox/reply', {person: cust, channel: 'app', text: 'Kapatıyorum.', close: true})).status, 200);
  assert.equal(JSON.parse((await acme.db.prepare('SELECT data FROM items WHERE id=?').bind(tk.id).first()).data).status, 'Kapandı');
  assert.equal((await adm(A, 'inbox/reply', {person: 'email:joao@test.com', channel: 'app', text: 'x'})).status, 400, 'uygulama içi mesaj yalnız müşteriye');
  assert.equal((await adm(A, 'inbox/threads?q=kapat')).data.threads.length, 1);

  // ---- şablon özelleştirme: kaydet → kullanılır → sıfırla ----
  r = await adm(A, 'inbox/templates'); assert.equal(r.data.templates.length, Object.keys(TEMPLATES).length); assert.equal(r.data.templates[0].langs.tr.custom, false);
  assert.equal((await adm(A, 'inbox/template', {key: 'quote.ready', lang: 'en', subject: 'Offer {title}', text: ''})).status, 400);
  assert.equal((await adm(A, 'inbox/template', {key: 'yok', lang: 'en', subject: 'x', text: 'y'})).status, 400);
  assert.equal((await adm(A, 'inbox/template', {key: 'quote.ready', lang: 'en', subject: 'Offer {title}', text: 'Hi {first}, total {total}.'})).status, 200);
  const o = await inA(db => renderTpl(db, 'quote.ready', 'en', {title: 'Visa', first: 'Ann', total: '1 BRL'})); assert.equal(o.subject, 'Offer Visa'); assert.equal(o.text, 'Hi Ann, total 1 BRL.'); assert.equal(o.button, 'View quote', 'boş alan yerleşiğe düşer');
  assert.equal((await inA(db => renderTpl(db, 'quote.ready', 'pt', {title: 'Visa'}))).subject, 'Sua proposta: Visa', 'diğer diller etkilenmez');
  assert.equal((await adm(A, 'inbox/template/reset', {key: 'quote.ready', lang: 'en'})).status, 200); assert.equal((await inA(db => renderTpl(db, 'quote.ready', 'en', {title: 'Visa'}))).subject, 'Your quote: Visa');
  assert.equal((await adm(B, 'inbox/templates')).data.templates[0].langs.en.custom, false);

  // ---- çeviri uç noktası doğrulaması ----
  assert.equal((await adm(A, 'inbox/translate', {text: '', to: 'en'})).status, 400); assert.equal((await adm(A, 'inbox/translate', {text: 'merhaba', to: 'xx'})).status, 400);
  // yetki: oturumsuz istek gelen kutusuna erişemez
  jars[A] = ''; assert.equal((await adm(A, 'inbox/threads')).status, 401);

  console.log('PASS: inbox (email+app timeline, reply, inbound log, search), multilingual templates (tr identical, overrides, per-customer language), no tokens/auth mails in log, tenant isolation');
} finally {
  rmSync(dir, {recursive: true, force: true});
}
process.exit(0);
