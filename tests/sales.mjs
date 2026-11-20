// Satış (Faz 3): aday formu + pano, teklif, sözleşme + e-imza, taksit planı + hatırlatıcılar, firma izolasyonu — uçtan uca (HTTP işleyicileri üzerinden).
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-sales-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite');
process.env.LOCAL_BLOB_DIR = join(dir, 'blobs');
process.env.TENANT_DB_DIR = join(dir, 'tenants');
process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN; delete process.env.SMTP_HOST;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {platform} = await import(R + 'http.mjs');
const {resolveTenant} = await import(R + 'tenant.mjs');
const {runWithTenant} = await import(R + 'tenant-context.mjs');
const {runSalesReminders, splitInstallments} = await import(R + 'sales.mjs');

const auth = platform('auth'), adminH = platform('admin'), jars = {};
async function hit(handler, base, host, path, body, method) {
  const headers = {Host: host, Origin: 'http://' + host, 'User-Agent': 'TestAgent/1.0'};
  if (jars[host]) headers.Cookie = jars[host];
  let payload; if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const res = await handler(new Request('http://' + host + base + path, {method: method || (body === undefined ? 'GET' : 'POST'), headers, body: payload}), {params: Promise.resolve({path: path.split('?')[0].split('/')})});
  const set = res.headers.get('set-cookie'); if (set) jars[host] = set.split(';')[0];
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return {status: res.status, data};
}
const call = (host, path, body, method) => hit(auth, '/api/auth/', host, path, body, method);
const adm = (host, path, body) => hit(adminH, '/api/platform/admin/', host, path, body);
const tokenOf = link => new URL(link).searchParams.get('sifre');
const sha = s => createHash('sha256').update(s).digest('hex');
const tokenFromLink = (link, k) => new URL(link, 'http://x').searchParams.get(k);
const A = 'acme.localhost', B = 'beta.localhost', old = Date.now() - 6000;

try {
  let r = await call('localhost', 'tenant/create', {name: 'Acme Göç', slug: 'acme', email: 'owner@acme.test', lang: 'pt'});
  const acmeLink = r.data.devLink; r = await call('localhost', 'tenant/create', {name: 'Beta Visa', slug: 'beta', email: 'owner@beta.test'}); const betaLink = r.data.devLink;
  await call(A, 'reset', {token: tokenOf(acmeLink), password: 'AcmeParola2026'}); await call(B, 'reset', {token: tokenOf(betaLink), password: 'BetaParola2026'});
  assert.equal((await call(A, 'admin/login', {email: 'owner@acme.test', password: 'AcmeParola2026'})).status, 200);
  assert.equal((await call(B, 'admin/login', {email: 'owner@beta.test', password: 'BetaParola2026'})).status, 200);
  const acme = await resolveTenant(new Request('http://' + A + '/', {headers: {Host: A}}));

  // ---- açık başvuru formu ----
  r = await call(A, 'sales/form'); assert.equal(r.data.enabled, false, 'form varsayılan kapalı');
  assert.equal((await call(A, 'sales/lead', {name: 'Kapalı Form', email: 'k@k.com', consent: true, ts: old})).status, 404);
  assert.equal((await adm(A, 'sales/form', {enabled: true})).status, 200);
  r = await call(A, 'sales/form'); assert.equal(r.status, 200); assert.equal(r.data.enabled, true); assert.equal(r.data.firm.name, 'Acme Göç'); assert.ok(r.data.services.length >= 3);
  const form = {name: 'Mehmet Demir', email: 'mehmet@test.com', phone: '+90 532 111 22 33', country: 'Türkiye', service: 'Oturum İzni', message: 'Emekli oturumu', consent: true, ts: old};
  r = await call(A, 'sales/lead', {...form, email: 'bot@test.com', website: 'http://spam'}); assert.equal(r.data.ok, true);                 // honeypot: sessizce yok sayılır
  r = await call(A, 'sales/lead', {...form, email: 'fast@test.com', ts: Date.now()}); assert.equal(r.data.ok, true);                        // çok hızlı: yok sayılır
  assert.equal((await call(A, 'sales/lead', {...form, consent: false})).status, 400);
  assert.equal((await call(A, 'sales/lead', {...form, email: 'gecersiz'})).status, 400);
  assert.equal((await call(A, 'sales/lead', {...form, name: 'A'})).status, 400);
  r = await call(A, 'sales/lead', form); assert.equal(r.status, 200);
  r = await call(A, 'sales/lead', {...form, message: 'Tekrar'}); assert.equal(r.status, 200);                                               // aynı e-posta: yeni kayıt açmaz
  r = await adm(A, 'sales/leads'); assert.equal(r.status, 200); assert.equal(r.data.leads.length, 1, 'bot ve hızlı başvuru kaydedilmemeli');
  let lead = r.data.leads[0]; assert.equal(lead.stage, 'new'); assert.equal(lead.source, 'Başvuru formu'); assert.equal(lead.consent, true); assert.equal(lead.count, 1); assert.ok(lead.history.length >= 2);
  assert.equal((await adm(B, 'sales/leads')).data.leads.length, 0);                                                                          // başka firma görmez
  assert.equal((await adm(B, 'sales/form', {enabled: true})).status, 200); assert.equal((await call('beta.localhost', 'sales/form')).data.firm.name, 'Beta Visa');
  // formu firma kapatabilir
  assert.equal((await adm(A, 'sales/form', {enabled: false, title: 'X'})).status, 200); assert.equal((await call(A, 'sales/form')).data.enabled, false); assert.equal((await call(A, 'sales/lead', {...form, email: 'x@x.com'})).status, 404);
  assert.equal((await adm(A, 'sales/form', {enabled: true, title: 'Ön görüşme', services: ['Oturum İzni', 'Vize'], notifyEmail: 'bildirim@acme.test'})).status, 200); assert.deepEqual((await call(A, 'sales/form')).data.services, ['Oturum İzni', 'Vize']);

  // ---- aday panosu ----
  r = await adm(A, 'sales/leads', {name: 'Telefonlu Aday', phone: '+55 11 99999 0000', source: 'Telefon / WhatsApp', service: 'Vize', value: 1200, currency: 'BRL'}); assert.equal(r.status, 200); const phoneLead = r.data.id; assert.ok(phoneLead.startsWith('lead-m-'));
  assert.equal((await adm(A, 'sales/leads', {name: 'Eksik'})).status, 400);                                                                   // e-posta veya telefon gerekli
  assert.equal((await adm(A, 'sales/leads/update', {id: phoneLead, stage: 'bilinmeyen'})).status, 400);
  assert.equal((await adm(A, 'sales/leads/update', {id: phoneLead, stage: 'contacted', note: 'Arandı, perşembe dönecek'})).status, 200);
  assert.equal((await adm(A, 'sales/leads/update', {id: phoneLead, stage: 'lost', lostReason: 'Bütçe'})).status, 200);
  r = await adm(A, 'sales/leads'); const pl = r.data.leads.find(l => l.id === phoneLead); assert.equal(pl.stage, 'lost'); assert.equal(pl.lostReason, 'Bütçe'); assert.equal(pl.value, 120000); assert.ok(pl.history.some(h => h.kind === 'note'));
  r = await adm(A, 'sales/summary'); assert.equal(r.data.leads, 2); assert.equal(r.data.byStage.lost, 1); assert.equal(r.data.winRate, 0);
  assert.equal((await adm(A, 'sales/leads/delete', {id: phoneLead})).status, 200); assert.equal((await adm(A, 'sales/leads')).data.leads.length, 1);
  assert.equal((await adm(B, 'sales/leads/update', {id: lead.id, stage: 'won'})).status, 404);                                                 // başka firmanın adayına dokunamaz

  // aday → müşteri (gerçek hesap oluşturma kuralları)
  r = await adm(A, 'sales/leads/convert', {id: lead.id}); assert.equal(r.status, 200); assert.ok(r.data.customerId); assert.ok(r.data.devLink, 'davet bağlantısı (test modu)'); const cust = r.data.customerId;
  const person = await acme.db.prepare("SELECT role, email, name FROM people WHERE id=?").bind(cust).first(); assert.equal(person.role, 'customer'); assert.equal(person.email, 'mehmet@test.com');
  assert.equal((await adm(A, 'sales/leads')).data.leads[0].stage, 'won');
  r = await adm(A, 'sales/leads/convert', {id: lead.id}); assert.equal(r.data.existing, true); assert.equal(r.data.customerId, cust);   // ikinci kez: aynı hesap
  assert.equal((await adm(A, 'sales/customers')).data.customers.length, 1);

  // ---- teklif ----
  const lines = [{name: 'Oturum izni danışmanlığı', qty: 1, price: 1000}, {name: 'Belge çevirisi (sayfa)', qty: 2, price: 250}];
  assert.equal((await adm(A, 'sales/quotes', {name: 'Mehmet Demir', email: 'mehmet@test.com', lines: []})).status, 400);
  assert.equal((await adm(A, 'sales/quotes', {name: 'Mehmet Demir', email: 'kotu', lines})).status, 400);
  assert.equal((await adm(A, 'sales/quotes', {name: 'Mehmet Demir', email: 'mehmet@test.com', lines, installments: {count: 3, down: 5000}})).status, 400);   // peşinat toplamı aşamaz
  r = await adm(A, 'sales/contract-templates'); assert.equal(r.status, 200); assert.ok(r.data.templates.some(t => t.id === 'cpl-starter')); assert.ok(r.data.vars.length >= 8);
  r = await adm(A, 'sales/quotes', {title: 'Oturum izni paketi', name: 'Mehmet Demir', email: 'mehmet@test.com', phone: '+90 532 111 22 33', leadId: lead.id, customerId: cust, service: 'Oturum İzni', currency: 'USD', lines, discount: 10, validDays: 10, installments: {count: 3, firstDue: '2030-01-10', down: 500}, contractTpl: 'cpl-starter'});
  assert.equal(r.status, 200); assert.equal(r.data.amount, 135000, '1500 − %10 = 1350,00'); const qid = r.data.id; assert.match(r.data.number, /^T-\d{4}-001$/);
  r = await adm(A, 'sales/quotes'); const qd = r.data.quotes[0]; assert.equal(qd.status, 'draft'); assert.equal(qd.token, undefined); assert.equal(qd.hasLink, false);
  assert.equal((await call(A, 'sales/quote?t=' + qid + '.abc')).status, 404);                                                                  // taslak/gönderilmemiş: açık değil
  r = await adm(A, 'sales/quotes/send', {id: qid}); assert.equal(r.status, 200); const qlink = r.data.link, qtok = tokenFromLink(qlink, 'q'); assert.ok(qlink.includes('/teklif/?q=qt-'));
  assert.equal((await adm(A, 'sales/leads')).data.leads[0].stage, 'won', 'kazanılmış aday geri alınmaz');
  r = await call(A, 'sales/quote?t=' + qtok); assert.equal(r.status, 200); assert.equal(r.data.status, 'sent'); assert.equal(r.data.amount, 135000); assert.equal(r.data.email, undefined); assert.equal(r.data.firm.name, 'Acme Göç'); assert.ok(r.data.installments.text.includes('3 taksit'));
  assert.equal((await call(A, 'sales/quote?t=' + qid + '.' + 'f'.repeat(32))).status, 404);                                                    // yanlış gizli anahtar
  assert.equal((await call(B, 'sales/quote?t=' + qtok)).status, 404);                                                                          // başka firmanın adresinden açılmaz
  assert.equal((await adm(A, 'sales/quotes', {id: qid, name: 'X Y', email: 'x@y.com', lines})).status, 400);                                  // gönderilmiş teklif düzenlenmez
  assert.equal((await call(A, 'sales/quote/decide', {t: qtok, decision: 'accept', name: 'Mehmet Demir'})).status, 400);                        // onay kutusu şart
  r = await call(A, 'sales/quote/decide', {t: qtok, decision: 'accept', name: 'Mehmet Demir', agree: true}); assert.equal(r.status, 200); assert.equal(r.data.status, 'accepted'); assert.ok(r.data.contractUrl, 'kabul → sözleşme otomatik'); const ctok = tokenFromLink(r.data.contractUrl, 's');
  assert.equal((await call(A, 'sales/quote/decide', {t: qtok, decision: 'reject'})).status, 409);                                              // ikinci yanıt yok
  r = await adm(A, 'sales/quotes'); assert.equal(r.data.quotes[0].status, 'accepted'); assert.equal(r.data.quotes[0].decision.by, 'Mehmet Demir'); assert.ok(r.data.quotes[0].decision.ip !== undefined);
  assert.equal((await adm(A, 'sales/quotes/delete', {id: qid})).status, 400);                                                                  // kabul edilmiş silinmez

  // süresi dolan teklif
  r = await adm(A, 'sales/quotes', {title: 'Eski', name: 'Ali Veli', email: 'ali@test.com', lines, validUntil: '2020-01-01'}); const oldQ = r.data.id;
  r = await adm(A, 'sales/quotes/send', {id: oldQ, notify: false}); const sendRes = r.data; assert.equal(sendRes.ok, true);                       // süresi geçmişse gönderirken yenilenir (14 gün)
  r = await adm(A, 'sales/quotes'); assert.ok(r.data.quotes.find(q => q.id === oldQ).validUntil > '2026-01-01');
  assert.equal((await adm(A, 'sales/quotes/withdraw', {id: oldQ})).status, 200); assert.equal((await call(A, 'sales/quote?t=' + tokenFromLink(sendRes.link, 'q'))).status, 404);   // geri çekilince bağlantı ölür
  assert.equal((await adm(A, 'sales/quotes/delete', {id: oldQ})).status, 200);

  // ---- sözleşme + basit e-imza ----
  r = await call(A, 'sales/contract?t=' + ctok); assert.equal(r.status, 200); assert.equal(r.data.status, 'sent'); assert.ok(r.data.body.includes('Mehmet Demir')); assert.ok(r.data.body.includes('1.350,00 USD'), r.data.body.slice(0, 600)); assert.ok(!/\{\{/.test(r.data.body), 'değişkenler doldurulmuş');
  assert.ok(r.data.body.includes('3 taksit: 1) 2030-01-10 — 500,00 USD; 2) 2030-02-09 — 425,00 USD; 3) 2030-03-11 — 425,00 USD'), r.data.body.slice(520, 760)); assert.equal(r.data.bodyHash, sha(r.data.title + '\n' + r.data.body), 'belge özeti SHA-256(başlık + \\n + metin)'); const bodyHash = r.data.bodyHash;
  assert.equal((await call(B, 'sales/contract?t=' + ctok)).status, 404);
  assert.equal((await call(A, 'sales/contract/sign', {t: ctok, name: 'Mehmet Demir'})).status, 400);                                            // onay şart
  assert.equal((await call(A, 'sales/contract/sign', {t: ctok, name: 'Me', consent: true})).status, 400);
  assert.equal((await call(A, 'sales/contract/sign', {t: ctok, name: 'Mehmet Demir', consent: true, method: 'drawn', image: 'data:image/png;base64,AAAA'})).status, 400);   // geçersiz çizim
  // metin imzadan önce oynanırsa imza reddedilir (bütünlük)
  const cid = ctok.split('.')[0], row = await acme.db.prepare('SELECT data FROM items WHERE id=?').bind(cid).first(), cd = JSON.parse(row.data);
  await acme.db.prepare('UPDATE items SET data=? WHERE id=?').bind(JSON.stringify({...cd, body: cd.body + '\nGİZLİ EK MADDE'}), cid).run();
  assert.equal((await call(A, 'sales/contract/sign', {t: ctok, name: 'Mehmet Demir', consent: true})).status, 409);
  await acme.db.prepare('UPDATE items SET data=? WHERE id=?').bind(row.data, cid).run();
  r = await call(A, 'sales/contract/sign', {t: ctok, name: 'Mehmet Demir', consent: true, method: 'drawn', image: 'data:image/png;base64,' + 'A'.repeat(200)}); assert.equal(r.status, 200); assert.equal(r.data.seal.length, 64);
  assert.equal((await call(A, 'sales/contract/sign', {t: ctok, name: 'Mehmet Demir', consent: true})).status, 409);                             // iki kez imzalanmaz
  r = await call(A, 'sales/contract?t=' + ctok); assert.equal(r.data.status, 'signed'); assert.equal(r.data.signature.name, 'Mehmet Demir'); assert.equal(r.data.signature.method, 'drawn'); assert.equal(r.data.bodyHash, bodyHash);
  r = await adm(A, 'sales/contracts/get?id=' + cid); const ev = r.data.contract.signature; assert.equal(ev.ip, 'unknown'); assert.equal(ev.ua, 'TestAgent/1.0'); assert.ok(ev.consent.includes('elektronik')); assert.equal(ev.seal.length, 64); assert.equal(r.data.contract.token, undefined);
  assert.equal((await adm(A, 'sales/contracts/void', {id: cid})).status, 400); assert.equal((await adm(A, 'sales/contracts/delete', {id: cid})).status, 400); assert.equal((await adm(A, 'sales/contracts/update', {id: cid, body: 'x'.repeat(80)})).status, 400);
  r = await adm(A, 'sales/contracts'); assert.equal(r.data.contracts[0].status, 'signed'); assert.equal(r.data.contracts[0].signature.image, undefined);
  r = await adm(A, 'sales/quotes'); assert.ok(r.data.quotes[0].contractSigned);

  // elle sözleşme: doldurulmamış alan varken gönderilemez
  r = await adm(A, 'sales/contract-templates', {name: 'Kısa', body: 'Sayın {{ad}}, {{bilinmeyen_alan}} hakkında bu metin en az elli karakterden uzun olmalıdır, tamam.'}); assert.equal(r.status, 200); const tplId = r.data.id;
  r = await adm(A, 'sales/contracts/create', {templateId: tplId, name: 'Veli Can', email: 'veli@test.com'}); assert.equal(r.status, 200); assert.deepEqual(r.data.unresolved, ['{{bilinmeyen_alan}}']); const dc = r.data.id;
  assert.equal((await adm(A, 'sales/contracts/send', {id: dc})).status, 400);
  assert.equal((await adm(A, 'sales/contracts/update', {id: dc, body: 'Sayın Veli Can, bu sözleşme metni en az elli karakterden uzun olacak şekilde düzenlendi.'})).status, 200);
  r = await adm(A, 'sales/contracts/send', {id: dc}); assert.equal(r.status, 200); assert.ok(r.data.link.includes('/teklif/?s=ctr-'));
  assert.equal((await adm(A, 'sales/contracts/update', {id: dc, body: 'x'.repeat(80)})).status, 400);                                          // gönderilmiş sözleşme değişmez
  assert.equal((await adm(A, 'sales/contracts/void', {id: dc, reason: 'Vazgeçti'})).status, 200);
  assert.equal((await call(A, 'sales/contract/sign', {t: tokenFromLink(r.data.link, 's'), name: 'Veli Can', consent: true})).status, 409);        // iptal edilmiş imzalanamaz
  assert.equal((await adm(A, 'sales/contract-templates/delete', {id: tplId})).status, 200);

  // ---- taksit planı ----
  assert.deepEqual(splitInstallments(100001, 3, 0, '2030-01-31', 'monthly').map(x => x.amount), [33333, 33333, 33335]);                        // kuruş farkı son taksitte
  assert.deepEqual(splitInstallments(100000, 3, 40000, '2030-01-31', 'monthly').map(x => [x.amount, x.due]), [[40000, '2030-01-31'], [30000, '2030-02-28'], [30000, '2030-03-31']]);   // peşinat + ay sonu
  assert.equal((await adm(A, 'sales/plans/create', {customerId: 'yok', total: 100, count: 2})).status, 400);
  assert.equal((await adm(A, 'sales/plans/create', {customerId: cust, total: 100, count: 3, down: 100})).status, 400);
  const dueBase = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
  r = await adm(A, 'sales/plans/create', {customerId: cust, title: 'Oturum izni bedeli', service: 'Oturum İzni', currency: 'USD', total: 1350, count: 3, down: 500, firstDue: dueBase, intervalDays: 30, notify: true, quoteId: qid, contractId: cid});
  assert.equal(r.status, 200); assert.equal(r.data.items.length, 3); assert.deepEqual(r.data.items.map(i => i.amount), [50000, 42500, 42500]); const planId = r.data.id;
  const invs = (await acme.db.prepare("SELECT id, data FROM items WHERE kind='invoice' AND owner=?").bind(cust).all()).results.map(x => ({id: x.id, ...JSON.parse(x.data)})); assert.equal(invs.length, 3);
  assert.ok(invs.every(i => i.planId === planId && i.status === 'Ödenmedi' && i.currency === 'USD' && i.createdBy === 'plan')); assert.equal(invs.reduce((n, i) => n + i.amount, 0), 135000); assert.ok(invs.some(i => i.title === 'Oturum izni bedeli · Taksit 2/3'));
  r = await adm(A, 'sales/plans'); let pl1 = r.data.plans[0]; assert.equal(pl1.status, 'active'); assert.equal(pl1.paid, 0); assert.equal(pl1.customer.name, 'Mehmet Demir'); assert.equal(pl1.items.length, 3);
  assert.equal((await adm(B, 'sales/plans')).data.plans.length, 0);
  // mevcut ödeme akışı: taksit faturası normal fatura gibi onaylanır
  const first = pl1.items[0]; assert.equal((await adm(A, 'invoices/status', {id: first.invoiceId, status: 'Ödendi', reference: 'Havale'})).status, 200);
  pl1 = (await adm(A, 'sales/plans')).data.plans[0]; assert.equal(pl1.paid, 50000); assert.equal(pl1.items[0].status, 'Ödendi');

  // hatırlatıcılar: yalnız plan faturaları, tekrarsız
  const day = 864e5, t0 = Date.parse(pl1.items[1].due + 'T09:00:00Z');
  const rem = ms => runWithTenant(acme, () => runSalesReminders(acme.db, ms));
  assert.equal(await rem(t0 - 10 * day), 0);                                                   // vadeye çok var
  assert.equal(await rem(t0 - 2 * day), 1);                                                    // 2. taksit: 2 gün kala
  assert.equal(await rem(t0 - 2 * day), 0);                                                    // aynı hatırlatma tekrar gitmez
  assert.equal(await rem(t0 + 2 * day), 1);                                                    // vadesi geçti
  assert.equal(await rem(t0 + 3 * day), 0);                                                    // 7 gün dolmadan tekrar yok
  assert.equal(await rem(t0 + 10 * day), 1);                                                   // 7 gün sonra ikinci uyarı
  const noticeCount = (await acme.db.prepare("SELECT COUNT(*) n FROM items WHERE kind='notice' AND owner='owner' AND json_extract(data,'$.link')='odemeplani'").first()).n; assert.equal(noticeCount, 1, 'sahibe ilk gecikmede tek bildirim');
  // plan dışı faturaya dokunmaz
  r = await adm(A, 'invoices/create', {owner: cust, title: 'Tek seferlik', lines: [{name: 'x', qty: 1, price: 10}], due: '2020-01-01', currency: 'USD'}); assert.equal(r.status, 200);
  const before = await acme.db.prepare("SELECT data FROM items WHERE id=?").bind(r.data.id).first(); await rem(t0 + 30 * day); assert.equal((await acme.db.prepare("SELECT data FROM items WHERE id=?").bind(r.data.id).first()).data, before.data);
  assert.equal((await adm(A, 'sales/settings', {reminders: false})).status, 200); assert.equal(await rem(t0 + 60 * day), 0); assert.equal((await adm(A, 'sales/plans')).data.settings.reminders, false);
  await adm(A, 'sales/settings', {reminders: true});
  // plan iptali: ödenmemiş taksitler iptal olur, ödenen korunur
  r = await adm(A, 'sales/plans/cancel', {id: planId}); assert.equal(r.status, 200); assert.equal(r.data.cancelled, 2);
  pl1 = (await adm(A, 'sales/plans')).data.plans[0]; assert.equal(pl1.status, 'cancelled'); assert.deepEqual(pl1.items.map(i => i.status), ['Ödendi', 'İptal', 'İptal']);

  // ---- firma izolasyonu: B'nin veritabanında hiçbir satış kaydı yok ----
  const beta = await resolveTenant(new Request('http://' + B + '/', {headers: {Host: B}}));
  const n = (await beta.db.prepare("SELECT COUNT(*) n FROM items WHERE kind IN ('lead','quote','contract','contract_tpl','pay_plan') AND id NOT LIKE 'cpl-%'").first()).n; assert.equal(n, 0);
  assert.equal((await adm(B, 'sales/quotes')).data.quotes.length, 0); assert.equal((await adm(B, 'sales/contracts')).data.contracts.length, 0);
  const codes = []; for (let i = 0; i < 4; i++) codes.push((await call(A, 'sales/lead', form)).status); assert.ok(codes.includes(429), 'IP başına saatlik başvuru sınırı: ' + codes);

  console.log('PASS: lead form (honeypot/speed/consent/dedupe), lead board + convert, quotes (totals/expiry/withdraw/accept→contract), contracts (variables/integrity/e-sign evidence), installment plans + reminders, tenant isolation');
} finally {
  rmSync(dir, {recursive: true, force: true});
}
process.exit(0);
