// Asaas (Brezilya) — Pix, boleto ve kartla tahsilat. Admin → Ödeme Altyapıları → Asaas etkinse
// müşteri BRL faturasını Asaas ödeme sayfasında (invoiceUrl) Pix / boleto / kartla öder.
// Akış: start → Asaas müşteri + cobrança (billingType UNDEFINED: müşteri yöntemi seçer) → invoiceUrl'e yönlendirme
//       → Asaas webhook'u (asaas-access-token başlığı) veya dönüş adresi → durum Asaas API'den doğrulanır → fatura "Ödendi".
import {randomUUID, createHash, timingSafeEqual} from 'node:crypto';
import {loadPayments} from './payments.mjs';

const BASE = mode => process.env.ASAAS_BASE_URL || (mode === 'live' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3');
const parse = s => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
const err = (status, message, extra = {}) => Object.assign(new Error(message), {status, ...extra});
const siteUrl = req => (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
const trim = (v, n = 100, d = '') => (String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim() || d).slice(0, n);
const PAID = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);

export async function asaasConfig(db) {
  const c = (await loadPayments(db)).asaas;
  if (!c?.enabled || !c.values?.apiKey) return null;
  return {apiKey: c.values.apiKey, webhookToken: c.values.webhookToken || '', mode: c.mode === 'live' ? 'live' : 'test', days: Math.min(30, Math.max(1, parseInt(c.values.dueDays, 10) || 3))};
}

async function call(cfg, method, path, payload) {
  let r;
  try {
    r = await fetch(BASE(cfg.mode) + path, {method, headers: {access_token: cfg.apiKey, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'BrazilMigration/1.0'}, body: payload ? JSON.stringify(payload) : undefined, signal: AbortSignal.timeout(20000)});
  } catch { throw err(502, 'Asaas’a bağlanılamadı. Birkaç dakika sonra tekrar deneyin.'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const m = (d.errors || []).map(e => e.description).filter(Boolean).join(' ') || ('HTTP ' + r.status);
    throw err(r.status === 401 ? 502 : 400, 'Asaas: ' + m, {asaas: d.errors || []});
  }
  return d;
}

// CPF (11) / CNPJ (14) doğrulama — Asaas tahsilat için zorunlu.
export function validDoc(v) {
  const s = String(v || '').replace(/\D/g, '');
  const dv = (base, w) => { const t = base.split('').reduce((a, c, i) => a + +c * w[i], 0) % 11; return t < 2 ? 0 : 11 - t; };
  if (s.length === 11) {
    if (/^(\d)\1+$/.test(s)) return '';
    const d1 = dv(s.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]), d2 = dv(s.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === +s[9] && d2 === +s[10] ? s : '';
  }
  if (s.length === 14) {
    if (/^(\d)\1+$/.test(s)) return '';
    const d1 = dv(s.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]), d2 = dv(s.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return d1 === +s[12] && d2 === +s[13] ? s : '';
  }
  return '';
}

// Müşteri: BRL faturası için Asaas ödeme sayfası oluştur (aynı fatura için bekleyen ödeme varsa onu yeniden kullanır).
export async function startAsaas({db, req, person, invoiceId, cpf, putItem, getItem, rows}) {
  if (!person || !['customer', 'advisor'].includes(person.role)) throw err(403, 'Bu işlem için müşteri veya partner hesabıyla giriş yapın.');
  const cfg = await asaasConfig(db); if (!cfg) throw err(400, 'Pix / boleto ile ödeme şu an kullanılamıyor.');
  const inv = await getItem(db, invoiceId);
  if (!inv || inv.kind !== 'invoice' || inv.owner !== person.id) throw err(404, 'Fatura bulunamadı.');
  const d = inv.data; if (d.status === 'Ödendi') throw err(400, 'Bu fatura zaten ödenmiş.');
  if ((d.currency || 'USD') !== 'BRL') throw err(400, 'Asaas ile yalnız Brezilya reali (BRL) faturaları ödenebilir.');
  const amount = Math.round(Number(d.amount) || 0); if (amount < 500) throw err(400, 'Asaas için fatura tutarı en az R$ 5,00 olmalı.');

  // Aynı fatura için hâlâ geçerli bir Asaas ödemesi varsa yeni tahsilat açma
  const old = (await rows(db, "SELECT id, data FROM items WHERE kind='payment' AND json_extract(data,'$.provider')='asaas' AND json_extract(data,'$.invoice')=? AND json_extract(data,'$.status')='pending' ORDER BY created DESC LIMIT 1", inv.id))[0];
  if (old) { const p = parse(old.data); if (p.mode === cfg.mode && p.amount === amount && p.url && Date.now() - p.created < 20 * 864e5) return {url: p.url}; }

  // Asaas müşterisi (kişi başına bir kez; mod ayrı)
  const profileItem = await getItem(db, 'profile-' + person.id), profile = profileItem?.data || {}, meta = (await getItem(db, 'meta-' + person.id))?.data || {};
  const cusKey = 'asaas-cus-' + cfg.mode + '-' + person.id;
  let cus = (await getItem(db, cusKey))?.data?.id || '';
  if (!cus) {
    const doc = validDoc(cpf) || validDoc(profile.cpf) || validDoc(profile.cnpj);
    if (!doc) throw err(409, 'Pix / boleto ile ödeme için CPF (veya CNPJ) numaranız gerekli.', {needCpf: true});
    const c = await call(cfg, 'POST', '/customers', {name: trim(person.name, 100, 'Cliente'), cpfCnpj: doc, email: trim(person.email, 100) || undefined, mobilePhone: trim(meta.phone || profile.phone, 20).replace(/[^\d]/g, '').slice(-11) || undefined, externalReference: person.id, notificationDisabled: true});
    cus = c.id; if (!cus) throw err(502, 'Asaas müşteri kaydı oluşturulamadı.');
    const ops = [putItem(db, cusKey, 'asaas_customer', person.id, {id: cus, mode: cfg.mode, created: Date.now()})];
    if (validDoc(cpf) && !profile.cpf) ops.push(putItem(db, 'profile-' + person.id, 'profile', person.id, {...profile, cpf: validDoc(cpf)}));
    await db.batch(ops);
  }

  const key = 'pay-' + randomUUID().slice(0, 18);
  const due = new Date(Date.now() + cfg.days * 864e5).toISOString().slice(0, 10);
  const payload = {customer: cus, billingType: 'UNDEFINED', value: +(amount / 100).toFixed(2), dueDate: due, description: trim(d.title, 480, 'Serviço de consultoria'), externalReference: 'inv:' + inv.id + ':' + key,
    callback: {successUrl: siteUrl(req) + '/api/pay/asaas/return?ref=' + key, autoRedirect: true}};
  let r;
  try { r = await call(cfg, 'POST', '/payments', payload); }
  catch (e) {
    // Dönüş adresi Asaas hesabındaki site alan adıyla uyuşmazsa yönlendirmesiz dene
    if (/callback|successUrl|dom[ií]nio/i.test(e.message)) { delete payload.callback; r = await call(cfg, 'POST', '/payments', payload); }
    else throw e;
  }
  if (!r.id || !r.invoiceUrl) throw err(502, 'Asaas ödeme sayfası oluşturulamadı.');
  await putItem(db, 'payment-' + key, 'payment', person.id, {provider: 'asaas', mode: cfg.mode, invoice: inv.id, asaasId: r.id, key, url: r.invoiceUrl, amount, currency: 'BRL', status: 'pending', created: Date.now()}).run();
  return {url: r.invoiceUrl};
}

// Ödemeyi Asaas'tan doğrula; ödendiyse faturayı kapat (webhook ve dönüş ikisi de buradan geçer; tekrar güvenli).
async function settle({db, pr, cfg, q, putItem, getItem, notice, audit}) {
  const p = parse(pr.data);
  if (p.status === 'success') return {ok: true, invoice: p.invoice, paid: true};
  const r = await call(cfg, 'GET', '/payments/' + encodeURIComponent(p.asaasId));
  const paid = PAID.has(r.status) && Math.round(Number(r.value) * 100) === p.amount && String(r.externalReference || '').startsWith('inv:' + p.invoice + ':');
  if (!paid) {
    const st = ['OVERDUE', 'REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'DUNNING_REQUESTED'].includes(r.status) ? 'failed' : 'pending';
    if (st !== p.status || r.status !== p.asaasStatus) await putItem(db, pr.id, 'payment', pr.owner, {...p, status: st, asaasStatus: r.status, billingType: r.billingType, updated: Date.now()}).run();
    return {ok: true, invoice: p.invoice, paid: false, pending: st === 'pending', billingType: r.billingType};
  }
  const inv = await getItem(db, p.invoice);
  const method = {PIX: 'Pix', BOLETO: 'Boleto', CREDIT_CARD: 'Kart', DEBIT_CARD: 'Kart'}[r.billingType] || 'Asaas';
  const ops = [putItem(db, pr.id, 'payment', pr.owner, {...p, status: 'success', asaasStatus: r.status, billingType: r.billingType, netValue: r.netValue, paidAt: Date.now(), updated: Date.now()})];
  if (inv && inv.data.status !== 'Ödendi') {
    const d = inv.data;
    ops.push(putItem(db, inv.id, 'invoice', inv.owner, {...d, status: 'Ödendi', reference: 'Asaas ' + r.id + ' · ' + method, method: 'asaas', paidAt: Date.now(), confirmedBy: 'asaas'}));
    if (d.advisor) ops.push(q(db, 'INSERT OR IGNORE INTO ledger VALUES(?,?,?,?,?,?,?)', randomUUID(), inv.id, inv.owner, d.advisor, d.amount, Math.round(d.amount * (d.rate || 0) / 100), Date.now()));
    ops.push(notice(db, inv.owner, `${method} ödemeniz alındı. Teşekkür ederiz.`, 'finance'), notice(db, 'owner', `Asaas (${method}) ile fatura ödendi: ${d.title || inv.id}`, '#invoices'), audit(db, 'asaas', 'invoice.paid.asaas', inv.id + ':' + r.id));
    if (d.advisor) ops.push(notice(db, d.advisor, 'Satış kazancınız kaydedildi.', 'finance'));
  }
  await db.batch(ops);
  return {ok: true, invoice: p.invoice, paid: true};
}

// Müşteri ödeme sayfasından dönünce (successUrl): durumu Asaas'tan sorgula.
export async function asaasReturn({db, ref, q, putItem, getItem, notice, audit, rows}) {
  if (!/^pay-[a-f0-9-]{10,30}$/.test(ref || '')) return {ok: false, reason: 'Geçersiz ödeme dönüşü.'};
  const pr = (await rows(db, "SELECT id, owner, data FROM items WHERE id=? AND kind='payment' LIMIT 1", 'payment-' + ref))[0];
  if (!pr) return {ok: false, reason: 'Ödeme kaydı bulunamadı.'};
  const cfg = await asaasConfig(db); if (!cfg) return {ok: false, reason: 'Asaas ayarları kapalı.'};
  return settle({db, pr, cfg, q, putItem, getItem, notice, audit});
}

const same = (a, b) => { const x = createHash('sha256').update(String(a)).digest(), y = createHash('sha256').update(String(b)).digest(); return timingSafeEqual(x, y); };
// Asaas webhook'u: başlıktaki asaas-access-token, panelde girilen Webhook doğrulama anahtarıyla aynı olmalı.
export async function asaasWebhook({db, token, event, q, putItem, getItem, notice, audit, rows}) {
  const cfg = await asaasConfig(db); if (!cfg) return {status: 200, body: {ignored: 'disabled'}};
  if (!cfg.webhookToken || !token || !same(token, cfg.webhookToken)) return {status: 401, body: {error: 'invalid token'}};
  const pay = event?.payment; if (!pay?.id) return {status: 200, body: {ignored: 'no payment'}};
  const pr = (await rows(db, "SELECT id, owner, data FROM items WHERE kind='payment' AND json_extract(data,'$.asaasId')=? LIMIT 1", String(pay.id)))[0];
  if (!pr) return {status: 200, body: {ignored: 'unknown payment'}};
  if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED_IN_CASH', 'PAYMENT_OVERDUE', 'PAYMENT_UPDATED'].includes(event.event)) {
    const r = await settle({db, pr, cfg, q, putItem, getItem, notice, audit});
    return {status: 200, body: {ok: true, paid: r.paid}};
  }
  if (['PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE'].includes(event.event)) {
    const p = parse(pr.data);
    await db.batch([putItem(db, pr.id, 'payment', pr.owner, {...p, asaasStatus: event.event, updated: Date.now()}), notice(db, 'owner', `Asaas uyarısı (${event.event === 'PAYMENT_REFUNDED' ? 'iade' : 'itiraz'}): fatura ${p.invoice}. Asaas panelini kontrol edin.`, '#invoices'), audit(db, 'asaas', 'payment.' + event.event.toLowerCase(), p.invoice + ':' + pay.id)]);
  }
  return {status: 200, body: {ok: true}};
}
