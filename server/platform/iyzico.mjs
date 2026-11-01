// iyzico Checkout Form (kartla ödeme). Admin → Ödeme Altyapıları → iyzico etkinse müşteri faturasını kartla öder.
// Akış: start → iyzico ödeme sayfası → iyzico tarayıcıyı callbackUrl'e (token ile) POST eder → sonuç sorgulanır → fatura "Ödendi".
import {createHmac, randomBytes, randomUUID} from 'node:crypto';
import {loadPayments} from './payments.mjs';

const BASE = mode => process.env.IYZICO_BASE_URL || (mode === 'live' ? 'https://api.iyzipay.com' : 'https://sandbox-api.iyzipay.com');
const parse = s => { try { return JSON.parse(s || '{}'); } catch { return {}; } };
const err = (status, message) => Object.assign(new Error(message), {status});
const price = cents => (Math.round(Number(cents) || 0) / 100).toFixed(2);
const CUR = ['TRY', 'USD', 'EUR', 'GBP'];
const siteUrl = req => (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
const trim = (v, n = 100, d = '') => (String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim() || d).slice(0, n);

export async function iyzicoConfig(db) {
  const c = (await loadPayments(db)).iyzico;
  if (!c?.enabled || !c.values?.apiKey || !c.values?.secretKey) return null;
  return {apiKey: c.values.apiKey, secretKey: c.values.secretKey, mode: c.mode === 'live' ? 'live' : 'test'};
}

// IYZWSv2: HMAC-SHA256(randomKey + uriPath + body, secretKey) hex → base64("apiKey:..&randomKey:..&signature:..")
export function authHeaders(cfg, path, body, rnd = Date.now() + randomBytes(4).toString('hex')) {
  const signature = createHmac('sha256', cfg.secretKey).update(rnd + path + body).digest('hex');
  return {Authorization: 'IYZWSv2 ' + Buffer.from(`apiKey:${cfg.apiKey}&randomKey:${rnd}&signature:${signature}`).toString('base64'), 'x-iyzi-rnd': rnd, 'Content-Type': 'application/json', Accept: 'application/json'};
}
async function call(cfg, path, payload) {
  const body = JSON.stringify(payload);
  let r;
  try { r = await fetch(BASE(cfg.mode) + path, {method: 'POST', headers: authHeaders(cfg, path, body), body, signal: AbortSignal.timeout(20000)}); }
  catch (e) { throw err(502, 'iyzico’ya bağlanılamadı. Birkaç dakika sonra tekrar deneyin.'); }
  const d = await r.json().catch(() => ({}));
  return d;
}

// Müşteri: fatura için iyzico ödeme sayfası oluştur.
export async function startCheckout({db, req, person, invoiceId, putItem, getItem, ip}) {
  if (!person || !['customer', 'advisor'].includes(person.role)) throw err(403, 'Bu işlem için müşteri veya partner hesabıyla giriş yapın.');
  const cfg = await iyzicoConfig(db); if (!cfg) throw err(400, 'Kartla ödeme şu an kullanılamıyor.');
  const inv = await getItem(db, invoiceId);
  if (!inv || inv.kind !== 'invoice' || inv.owner !== person.id) throw err(404, 'Fatura bulunamadı.');
  const d = inv.data; if (d.status === 'Ödendi') throw err(400, 'Bu fatura zaten ödenmiş.');
  const amount = Math.round(Number(d.amount) || 0); if (amount < 100) throw err(400, 'Fatura tutarı geçersiz.');
  const profile = (await getItem(db, 'profile-' + person.id))?.data || {}, meta = (await getItem(db, 'meta-' + person.id))?.data || {};
  const parts = trim(person.name, 100, 'Müşteri').split(/\s+/), name = parts.slice(0, -1).join(' ') || parts[0], surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const city = trim(meta.city || profile.city, 50, 'São Paulo'), country = trim(meta.country || profile.country, 50, 'Turkey');
  const address = trim(profile.address || [meta.city, meta.country].filter(Boolean).join(', '), 200, city + ', ' + country);
  const conversationId = 'pay-' + randomUUID().slice(0, 18), currency = CUR.includes(d.currency) ? d.currency : 'USD';
  const payload = {
    locale: 'tr', conversationId, price: price(amount), paidPrice: price(amount), currency, basketId: inv.id, paymentGroup: 'PRODUCT',
    callbackUrl: siteUrl(req) + '/api/pay/iyzico/callback', enabledInstallments: [1, 2, 3, 6, 9],
    buyer: {id: person.id.slice(0, 50), name, surname, identityNumber: trim(profile.identityNumber || profile.tckn, 20, '11111111111'), email: trim(person.email, 100), gsmNumber: trim(meta.phone || profile.phone, 20, '+900000000000'), registrationAddress: address, city, country, ip: trim(ip, 45, '127.0.0.1')},
    billingAddress: {contactName: trim(person.name, 100, 'Müşteri'), city, country, address},
    basketItems: [{id: inv.id.slice(0, 50), name: trim(d.title, 100, 'Danışmanlık hizmeti'), category1: 'Danışmanlık', itemType: 'VIRTUAL', price: price(amount)}],
  };
  const r = await call(cfg, '/payment/iyzipos/checkoutform/initialize/auth/ecom', payload);
  if (r.status !== 'success' || !r.token || !r.paymentPageUrl) throw err(502, 'iyzico ödeme sayfası açılamadı' + (r.errorMessage ? ': ' + r.errorMessage : '.'));
  await putItem(db, 'payment-' + conversationId, 'payment', person.id, {provider: 'iyzico', mode: cfg.mode, invoice: inv.id, token: r.token, conversationId, amount, currency, status: 'pending', created: Date.now()}).run();
  return {url: r.paymentPageUrl};
}

// iyzico → callback (form POST, token). Sonucu iyzico'dan sorgular; tutar ve fatura eşleşirse faturayı kapatır.
export async function finishCheckout({db, token, q, putItem, getItem, notice, audit, rows}) {
  if (!/^[a-zA-Z0-9-]{10,200}$/.test(token || '')) return {ok: false, reason: 'Geçersiz ödeme dönüşü.'};
  const pr = (await rows(db, "SELECT id, owner, data FROM items WHERE kind='payment' AND json_extract(data,'$.token')=? LIMIT 1", token))[0];
  if (!pr) return {ok: false, reason: 'Ödeme kaydı bulunamadı.'};
  const p = parse(pr.data);
  if (p.status === 'success') return {ok: true, invoice: p.invoice};
  const cfg = await iyzicoConfig(db); if (!cfg) return {ok: false, reason: 'iyzico ayarları kapalı.'};
  const r = await call(cfg, '/payment/iyzipos/checkoutform/auth/ecom/detail', {locale: 'tr', conversationId: p.conversationId, token});
  const paid = r.status === 'success' && r.paymentStatus === 'SUCCESS' && r.basketId === p.invoice && Math.round(Number(r.price) * 100) === p.amount;
  if (!paid) {
    await putItem(db, pr.id, 'payment', pr.owner, {...p, status: 'failed', error: String(r.errorMessage || r.paymentStatus || 'Ödeme tamamlanmadı').slice(0, 300), updated: Date.now()}).run();
    return {ok: false, reason: r.errorMessage || 'Ödeme tamamlanmadı.'};
  }
  const inv = await getItem(db, p.invoice);
  const ops = [putItem(db, pr.id, 'payment', pr.owner, {...p, status: 'success', paymentId: r.paymentId, paidPrice: r.paidPrice, installment: r.installment, cardAssociation: r.cardAssociation, lastFour: r.lastFourDigits, updated: Date.now()})];
  if (inv && inv.data.status !== 'Ödendi') {
    const d = inv.data;
    ops.push(putItem(db, inv.id, 'invoice', inv.owner, {...d, status: 'Ödendi', reference: 'iyzico ' + r.paymentId, method: 'iyzico', paidAt: Date.now(), confirmedBy: 'iyzico'}));
    if (d.advisor) ops.push(q(db, 'INSERT OR IGNORE INTO ledger VALUES(?,?,?,?,?,?,?)', randomUUID(), inv.id, inv.owner, d.advisor, d.amount, Math.round(d.amount * (d.rate || 0) / 100), Date.now()));
    ops.push(notice(db, inv.owner, 'Kartla ödemeniz alındı. Teşekkür ederiz.', 'finance'), notice(db, 'owner', `iyzico ile fatura ödendi: ${d.title || inv.id}`, '#invoices'), audit(db, 'iyzico', 'invoice.paid.card', inv.id));
    if (d.advisor) ops.push(notice(db, d.advisor, 'Satış kazancınız kaydedildi.', 'finance'));
  }
  await db.batch(ops);
  return {ok: true, invoice: p.invoice};
}
