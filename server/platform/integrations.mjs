// Faz 5 · Açık API ve webhook.
//  • API anahtarı: yönetici oluşturur (yalnız bir kez gösterilir; veritabanında yalnız SHA-256 özeti). `Authorization: Bearer bmk_…`, kapsam (scope) bazlı, firma hostuna bağlı (başka firmanın verisine erişemez).
//  • /api/v1: leads (oku/oluştur), customers, invoices, cases (salt okunur). Sayfalama: ?limit=&cursor= (değişiklik sırasıyla → artımlı senkron için uygun). Dakikada 120 istek.
//  • Webhook: HTTPS adresi (SSRF korumalı: özel/yerel adresler reddedilir), HMAC-SHA256 imza (X-BM-Signature: t=<unix>,v1=<hex>), yeniden deneme (1dk, 5dk, 30dk, 2sa, 6sa), art arda 15 hata → otomatik pasif.
//    Olaylar veritabanı değişimlerinden tarayıcı ile üretilir (her olay her kayıt için bir kez): kaçırılan kod yolu olmaz, geçmiş kayıtlar webhook oluşturulunca gönderilmez.
import {createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {json, parse, all, first, put, readBody, rateLimited} from './kit.mjs';
import {fail, clean, sha, validEmail, uuid, now, siteUrl} from './auth.mjs';
import {cfgEnv, currentTenant, runWithTenant} from './tenant-context.mjs';
import {upsertLead, LEAD_STAGES} from './sales.mjs';
import {recordConsent} from './privacy.mjs';

export const SCOPES = {'leads:read': 'Adayları okuma', 'leads:write': 'Aday oluşturma', 'customers:read': 'Müşterileri okuma', 'invoices:read': 'Faturaları okuma', 'cases:read': 'Dosyaları okuma'};
export const EVENTS = {'lead.created': 'Yeni aday', 'lead.won': 'Aday kazanıldı', 'customer.created': 'Yeni müşteri', 'invoice.paid': 'Fatura ödendi', 'case.completed': 'Dosya tamamlandı'};
const RETRY = [60e3, 300e3, 1800e3, 7200e3, 21600e3], MAX_FAILS = 15, KEEP_LOG = 50, SCAN_ID = 'config-webhook-scan';
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const ipOf = req => (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || req.headers.get('x-real-ip') || 'x').trim();
const jerr = (status, error, headers = {}) => json({error}, status, headers);

// ======================= Genel API (/api/v1) =======================
const STATUS_CODE = {'Ödenmedi': 'unpaid', 'Ödendi': 'paid', 'İptal': 'cancelled'};
const STAGE_IDS = LEAD_STAGES.map(s => s[0]);
async function keyset(db, {select, from, where = '1=1', args = [], ts, id = 'id'}, url) {
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit')) || 50)), c = /^(\d{1,16})\.([\w-]{1,80})$/.exec(url.searchParams.get('cursor') || '');
  const rows = await all(db, `${select} FROM ${from} WHERE ${where}${c ? ` AND (${ts} > ? OR (${ts} = ? AND ${id} > ?))` : ''} ORDER BY ${ts}, ${id} LIMIT ?`, ...args, ...(c ? [Number(c[1]), Number(c[1]), c[2]] : []), limit);
  const last = rows[rows.length - 1], tsKey = ts.split('.').pop();
  return {rows, next: rows.length === limit && last ? `${last[tsKey]}.${last[id.split('.').pop()]}` : null};
}
const out = (rows, next, map) => json({data: rows.map(map), next});

export async function apiV1(req, env, route) {
  const db = env.DB, T = currentTenant().id, url = new URL(req.url);
  const bad = () => (rateLimited('api-bad:' + T + ':' + ipOf(req), 30, 60000) ? jerr(429, 'Çok fazla hatalı deneme.', {'Retry-After': '60'}) : null);
  const m = /^Bearer\s+(bmk_[A-Za-z0-9_-]{20,80})$/.exec(req.headers.get('authorization') || '');
  if (!m) return bad() || jerr(401, 'Authorization: Bearer <API anahtarı> başlığı gerekli.', {'WWW-Authenticate': 'Bearer'});
  const hash = sha(m[1]), rec = await first(db, "SELECT id, data FROM items WHERE id=? AND kind='api_key'", 'ak-' + hash.slice(0, 32)), k = rec && parse(rec.data);
  if (!k || k.revoked || !safeEq(k.hash, hash)) return bad() || jerr(401, 'Geçersiz veya iptal edilmiş API anahtarı.', {'WWW-Authenticate': 'Bearer'});
  if (rateLimited('api:' + T + ':' + rec.id, 120, 60000)) return jerr(429, 'Hız sınırı: dakikada en fazla 120 istek.', {'Retry-After': '30'});
  if (!k.lastUsed || now() - k.lastUsed > 300e3) { try { await put(db, rec.id, 'api_key', 'system', {...k, lastUsed: now()}); } catch {} }
  const need = s => { if (!(k.scopes || []).includes(s)) throw Object.assign(new Error('Bu anahtarın "' + s + '" yetkisi yok.'), {status: 403}); };
  try {
    if (route === 'me' && req.method === 'GET') return json({key: {name: k.name, prefix: k.prefix, scopes: k.scopes}, firm: currentTenant().name || null});
    if (route === 'leads' && req.method === 'GET') {
      need('leads:read'); const st = url.searchParams.get('stage'); if (st && !STAGE_IDS.includes(st)) fail(400, 'Geçersiz aşama. Değerler: ' + STAGE_IDS.join(', '));
      const {rows, next} = await keyset(db, {select: 'SELECT id, data, created, updated', from: 'items', where: "kind='lead'" + (st ? " AND json_extract(data,'$.stage')=?" : ''), args: st ? [st] : [], ts: 'updated'}, url);
      return out(rows, next, r => { const d = parse(r.data); return {id: r.id, name: d.name || '', email: d.email || '', phone: d.phone || '', service: d.service || '', country: d.country || '', source: d.source || '', stage: STAGE_IDS.includes(d.stage) ? d.stage : 'new', value: d.value || 0, currency: d.currency || null, created: r.created, updated: r.updated}; });
    }
    if (route === 'leads' && req.method === 'POST') {
      need('leads:write'); const b = await readBody(req, 20000), name = clean(b.name, 100), email = clean(b.email, 254).toLowerCase(), phone = clean(b.phone, 40);
      if (name.length < 2) fail(400, 'name gerekli.'); if (!email && !phone) fail(400, 'email veya phone gerekli.'); if (email && !validEmail(email)) fail(400, 'email geçersiz.');
      if (b.consent !== true) fail(400, 'consent: true gerekli. Adayın aydınlatma metnini onayladığından emin olun.');
      const r = await upsertLead(db, {name, email, phone, service: b.service, country: b.country, note: b.message, source: clean(b.source, 40) || 'API', consent: true, consentText: clean(b.consentText, 300), historyText: 'API anahtarı ile eklendi (' + k.name + ').'}, 'API');
      try { await recordConsent(db, {email, type: 'privacy-notice', source: 'api', text: clean(b.consentText, 300) || 'API üzerinden iletilen onay'}); } catch {}
      return json({id: r.id, created: r.created}, r.created ? 201 : 200);
    }
    if (route === 'customers' && req.method === 'GET') {
      need('customers:read'); const {rows, next} = await keyset(db, {select: 'SELECT id, name, email, status, advisor, created', from: 'people', where: "role='customer'", ts: 'created'}, url);
      return out(rows, next, r => ({id: r.id, name: r.name, email: r.email, status: r.status, advisorId: r.advisor && r.advisor !== 'owner' ? r.advisor : null, created: r.created}));
    }
    if (route === 'invoices' && req.method === 'GET') {
      need('invoices:read'); const st = url.searchParams.get('status'), tr = st && Object.entries(STATUS_CODE).find(([, c]) => c === st)?.[0]; if (st && !tr) fail(400, 'Geçersiz status. Değerler: paid, unpaid, cancelled');
      const {rows, next} = await keyset(db, {select: 'SELECT id, owner, data, created, updated', from: 'items', where: "kind='invoice'" + (tr ? " AND json_extract(data,'$.status')=?" : ''), args: tr ? [tr] : [], ts: 'updated'}, url);
      return out(rows, next, r => { const d = parse(r.data); return {id: r.id, number: d.number || '', title: d.title || '', customerId: r.owner, amount: d.amount || 0, currency: d.currency || 'USD', status: STATUS_CODE[d.status] || 'unpaid', issued: d.issued || null, due: d.due || null, paidAt: d.paidAt || null, service: d.service || null, created: r.created, updated: r.updated}; });
    }
    if (route === 'cases' && req.method === 'GET') {
      need('cases:read'); const {rows, next} = await keyset(db, {select: 'SELECT id, owner, data, created, updated', from: 'items', where: "kind='application'", ts: 'updated'}, url);
      const st = new Map(); for (const r of rows) { const s = await first(db, "SELECT data FROM items WHERE id=? AND kind='case_state'", 'cs-' + r.id); if (s) st.set(r.id, parse(s.data)); }
      return out(rows, next, r => { const d = parse(r.data), s = st.get(r.id); return {id: r.id, customerId: r.owner, service: d.service || '', status: d.status || '', stage: s?.stages?.[s.stage] || null, created: r.created, updated: r.updated}; });
    }
    return jerr(404, 'Bulunamadı.');
  } catch (e) { if (e.status) return jerr(e.status, e.message); throw e; }
}

// ======================= Webhook: hedef doğrulama (SSRF) =======================
const privateV4 = ip => { const [a, b] = ip.split('.').map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224 || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)); };
export const privateIp = ip => { ip = String(ip).toLowerCase(); const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip); if (v4) return privateV4(v4[1]); if (isIP(ip) === 4) return privateV4(ip); return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^ff/.test(ip); };
export async function checkTarget(raw) {
  let u; try { u = new URL(String(raw || '').trim()); } catch { fail(400, 'Webhook adresi geçersiz.'); }
  const allowHttp = cfgEnv('WEBHOOK_ALLOW_HTTP') === '1', allowPrivate = cfgEnv('WEBHOOK_ALLOW_PRIVATE') === '1';
  if (u.protocol !== 'https:' && !(allowHttp && u.protocol === 'http:')) fail(400, 'Webhook adresi https:// ile başlamalı.');
  if (u.username || u.password) fail(400, 'Adreste kullanıcı adı/parola olamaz.'); if (u.href.length > 500) fail(400, 'Adres çok uzun.');
  if (!allowPrivate) {
    const host = u.hostname.replace(/^\[|\]$/g, ''); if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) fail(400, 'Yerel adreslere webhook gönderilemez.');
    let addrs; try { addrs = isIP(host) ? [{address: host}] : await lookup(host, {all: true}); } catch { fail(400, 'Adres çözümlenemedi (DNS).'); }
    if (!addrs.length || addrs.some(a => privateIp(a.address))) fail(400, 'Özel/yerel ağ adreslerine webhook gönderilemez.');
  }
  return u.href;
}

// ======================= Webhook: gönderim =======================
const hooks = async db => (await all(db, "SELECT id, data FROM items WHERE kind='webhook' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data)}));
const dropPending = (db, id) => db.prepare("UPDATE items SET data=json_set(data,'$.status','failed','$.last.error','Webhook pasif/silindi') WHERE kind='wh_out' AND owner=? AND json_extract(data,'$.status')='pending'").bind(id).run();
const saveHook = (db, h) => { const {id, ...d} = h; return put(db, id, 'webhook', 'system', d); };
async function deliver(db, h, row, d) {
  const body = JSON.stringify({id: row.id, type: d.event, created: d.created, data: d.payload}), t = Math.floor(Date.now() / 1000), t0 = Date.now();
  let code = 0, error = '';
  try {
    await checkTarget(h.url);
    const res = await fetch(h.url, {method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(8000), headers: {'Content-Type': 'application/json', 'User-Agent': 'BrazilMigration-Webhook/1', 'X-BM-Event': d.event, 'X-BM-Delivery': row.id, 'X-BM-Signature': `t=${t},v1=${createHmac('sha256', h.secret).update(t + '.' + body).digest('hex')}`}, body});
    code = res.status; try { await res.arrayBuffer(); } catch {}
    if (code < 200 || code >= 300) error = code >= 300 && code < 400 ? 'Yönlendirme (redirect) desteklenmez.' : 'HTTP ' + code;
  } catch (e) { error = String(e.message || e).slice(0, 160); }
  return {ok: !error, code, error, ms: Date.now() - t0};
}
async function sendRow(db, row) {
  const d = parse(row.data), h = (await hooks(db)).find(x => x.id === row.owner);
  if (!h) { await db.prepare('DELETE FROM items WHERE id=?').bind(row.id).run(); return; }
  const r = await deliver(db, h, row, d), attempts = (d.attempts || 0) + 1, last = {at: now(), code: r.code, error: r.error, ms: r.ms};
  const slim = {...d, payload: {ref: d.payload?.id || null}}; // teslim sonrası kişisel veri tutulmaz
  if (r.ok) { await put(db, row.id, 'wh_out', h.id, {...slim, attempts, status: 'done', last}); if (h.fails) await saveHook(db, {...h, fails: 0, lastOk: now()}); else if (!h.lastOk || now() - h.lastOk > 60e3) await saveHook(db, {...h, lastOk: now()}); return; }
  const fails = (h.fails || 0) + 1, retry = attempts <= RETRY.length;
  await put(db, row.id, 'wh_out', h.id, {...(retry ? d : slim), attempts, status: retry ? 'pending' : 'failed', next: retry ? now() + RETRY[attempts - 1] : null, last});
  const patch = {...h, fails, lastError: {at: now(), error: r.error}}; if (fails >= MAX_FAILS && h.active) { patch.active = false; patch.disabledReason = 'Art arda ' + MAX_FAILS + ' başarısız gönderim — otomatik durduruldu.'; }
  await saveHook(db, patch); if (patch.active === false && h.active) await dropPending(db, h.id);
}
async function trim(db, hookId) { await db.prepare("DELETE FROM items WHERE kind='wh_out' AND owner=? AND json_extract(data,'$.status')<>'pending' AND id NOT IN (SELECT id FROM items WHERE kind='wh_out' AND owner=? AND json_extract(data,'$.status')<>'pending' ORDER BY created DESC, rowid DESC LIMIT ?)").bind(hookId, hookId, KEEP_LOG).run(); }
export async function flushOutbox(db, only) {
  if (globalThis.__bmWhFlush?.[currentTenant().id]) return 0; (globalThis.__bmWhFlush ??= {})[currentTenant().id] = 1;
  try {
    const rows = only ? [await first(db, "SELECT * FROM items WHERE id=? AND kind='wh_out'", only)].filter(Boolean) : await all(db, "SELECT * FROM items WHERE kind='wh_out' AND json_extract(data,'$.status')='pending' AND json_extract(data,'$.next')<=? ORDER BY created LIMIT 25", now());
    for (const r of rows) { const h = (await hooks(db)).find(x => x.id === r.owner); if (!only && h && !h.active) continue; await sendRow(db, r); }
    for (const h of new Set(rows.map(r => r.owner))) await trim(db, h);
    return rows.length;
  } finally { delete globalThis.__bmWhFlush[currentTenant().id]; }
}
const enqueue = async (db, event, payload, onlyHook) => {
  let n = 0; for (const h of await hooks(db)) { if (!h.active || (onlyHook ? h.id !== onlyHook : !(h.events || []).includes(event))) continue; const id = 'wo-' + uuid(); await put(db, id, 'wh_out', h.id, {event, payload, created: now(), attempts: 0, status: 'pending', next: now()}); n++; if (onlyHook) return id; }
  return n;
};

// ======================= Webhook: olay tarayıcı =======================
const mark = async (db, event, id) => (await db.prepare("INSERT OR IGNORE INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)").bind('whm-' + event + '-' + id, 'wh_mark', 'system', '{}', now(), now()).run()).meta?.changes === 1;
export async function scanEvents(db) {
  const hs = (await hooks(db)).filter(h => h.active); if (!hs.length) return 0;
  const want = new Set(hs.flatMap(h => h.events || [])), st = await first(db, 'SELECT data FROM items WHERE id=?', SCAN_ID), S = parse(st?.data), at = S.at, floor = S.floor || 0, start = now();
  if (!at) { await put(db, SCAN_ID, 'config', 'system', {at: start, floor: start}); return 0; }
  // imleç her taramada 5 sn geriden saklanır (saat/yazma gecikmesi payı); işaretçiler çift gönderimi engeller
  const since = at, CAP = 500; let capped = false, n = 0;
  const run = async (event, sql, args, shape) => { if (!want.has(event)) return; const rows = await all(db, sql + ' LIMIT ' + CAP, ...args); if (rows.length >= CAP) capped = true; for (const r of rows) if (await mark(db, event, r.id)) n += await enqueue(db, event, shape(r, parse(r.data))); };
  await run('lead.created', "SELECT id, data, created FROM items WHERE kind='lead' AND created>=? ORDER BY created", [since], (r, d) => ({id: r.id, name: d.name || '', email: d.email || '', phone: d.phone || '', service: d.service || '', country: d.country || '', source: d.source || '', created: r.created}));
  await run('lead.won', "SELECT id, data, updated FROM items WHERE kind='lead' AND updated>=? AND json_extract(data,'$.stage')='won' ORDER BY updated", [since], (r, d) => ({id: r.id, name: d.name || '', email: d.email || '', service: d.service || '', value: d.value || 0, currency: d.currency || null}));
  await run('customer.created', "SELECT id, name, email, created, '{}' AS data FROM people WHERE role='customer' AND created>=? ORDER BY created", [since], r => ({id: r.id, name: r.name, email: r.email, created: r.created}));
  await run('invoice.paid', "SELECT id, owner, data FROM items WHERE kind='invoice' AND updated>=? AND json_extract(data,'$.status')='Ödendi' ORDER BY updated", [since], (r, d) => ({id: r.id, number: d.number || '', customerId: r.owner, amount: d.amount || 0, currency: d.currency || 'USD', paidAt: d.paidAt || null, service: d.service || null}));
  await run('case.completed', "SELECT id, owner, data, updated FROM items WHERE kind='application' AND updated>=? AND json_extract(data,'$.status')='Tamamlandı' ORDER BY updated", [since], (r, d) => ({id: r.id, customerId: r.owner, service: d.service || '', completedAt: r.updated}));
  const pruned = st && parse(st.data).pruned && start - parse(st.data).pruned < 864e5 ? parse(st.data).pruned : start;
  if (pruned === start) await db.prepare("DELETE FROM items WHERE kind='wh_mark' AND created<?").bind(start - 30 * 864e5).run(); // tarama penceresinin çok dışındaki işaretçiler
  await put(db, SCAN_ID, 'config', 'system', {at: capped ? at : Math.max(start - 5000, floor), floor, pruned});
  return n;
}

export function ensureWebhooks(env) {
  if (!env?.DB) return; const T = currentTenant(); (globalThis.__bmWhEnvs ??= new Map()).set(T.id, {t: T, env});
  if (globalThis.__bmWh) return;
  const tick = async () => {
    if (globalThis.__bmWhRun) return; globalThis.__bmWhRun = true;
    try { for (const {t, env: e} of [...globalThis.__bmWhEnvs.values()]) await runWithTenant(t, async () => { try { await scanEvents(e.DB); await flushOutbox(e.DB); } catch (err) { console.error('[webhook]', err.message); } }); }
    finally { globalThis.__bmWhRun = false; }
  };
  globalThis.__bmWh = setInterval(tick, 30e3); if (globalThis.__bmWh.unref) globalThis.__bmWh.unref();
}

// ======================= Yönetici uçları =======================
const hookOut = (h, pending = 0) => ({id: h.id, url: h.url, events: h.events, description: h.description || '', active: !!h.active, secretHint: '…' + String(h.secret || '').slice(-4), fails: h.fails || 0, lastOk: h.lastOk || null, lastError: h.lastError || null, disabledReason: h.disabledReason || null, created: h.created, pending});
export async function integrationsAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('integrations/')) return null;
  const {audit, actor} = ctx, log = async (a, t) => { try { if (audit) await audit(db, actor, a, t).run(); } catch {} }, body = async () => (req.method === 'GET' ? {} : await readBody(req, 20000));
  if (route === 'integrations/meta' && req.method === 'GET') return json({base: siteUrl(req) + '/api/v1', scopes: SCOPES, events: EVENTS, stages: STAGE_IDS, retry: RETRY.map(x => x / 1000), maxFails: MAX_FAILS});
  if (route === 'integrations/keys' && req.method === 'GET') return json({keys: (await all(db, "SELECT id, data, created FROM items WHERE kind='api_key' ORDER BY created DESC")).map(r => { const d = parse(r.data); return {id: r.id, name: d.name, prefix: d.prefix, scopes: d.scopes, created: r.created, lastUsed: d.lastUsed || null, revoked: !!d.revoked}; })});
  if (route === 'integrations/keys' && req.method === 'POST') {
    const b = await body(), name = clean(b.name, 60), scopes = [...new Set((Array.isArray(b.scopes) ? b.scopes : []).filter(s => SCOPES[s]))];
    if (name.length < 2) fail(400, 'Anahtar için bir ad yazın (örn. “Muhasebe programı”).'); if (!scopes.length) fail(400, 'En az bir yetki seçin.');
    if (Number((await first(db, "SELECT COUNT(*) AS n FROM items WHERE kind='api_key' AND COALESCE(json_extract(data,'$.revoked'),0)=0"))?.n || 0) >= 10) fail(409, 'En fazla 10 etkin anahtar olabilir. Kullanılmayanı iptal edin.');
    const key = 'bmk_' + randomBytes(32).toString('base64url'), hash = sha(key), id = 'ak-' + hash.slice(0, 32);
    await put(db, id, 'api_key', 'system', {name, hash, prefix: key.slice(0, 12), scopes}); await log('api.key.create', name + ' [' + scopes.join(',') + ']');
    return json({ok: true, id, key, prefix: key.slice(0, 12), note: 'Anahtar yalnızca şimdi gösterilir; güvenli bir yerde saklayın.'}, 201);
  }
  if (route === 'integrations/keys/revoke' && req.method === 'POST') {
    const b = await body(), r = await first(db, "SELECT id, data FROM items WHERE id=? AND kind='api_key'", clean(b.id, 80)); if (!r) fail(404, 'Anahtar bulunamadı.');
    await put(db, r.id, 'api_key', 'system', {...parse(r.data), revoked: true, revokedAt: now()}); await log('api.key.revoke', parse(r.data).name); return json({ok: true});
  }
  if (route === 'integrations/webhooks' && req.method === 'GET') {
    const pend = new Map((await all(db, "SELECT owner, COUNT(*) AS n FROM items WHERE kind='wh_out' AND json_extract(data,'$.status')='pending' GROUP BY owner")).map(r => [r.owner, r.n]));
    return json({webhooks: (await hooks(db)).map(h => hookOut(h, pend.get(h.id) || 0))});
  }
  if (route === 'integrations/webhooks' && req.method === 'POST') {
    const b = await body(), events = [...new Set((Array.isArray(b.events) ? b.events : []).filter(e => EVENTS[e]))]; if (!events.length) fail(400, 'En az bir olay seçin.');
    const url = await checkTarget(b.url), all_ = await hooks(db); if (all_.length >= 10) fail(409, 'En fazla 10 webhook tanımlanabilir.');
    if (!all_.some(h => h.active)) await put(db, SCAN_ID, 'config', 'system', {at: now(), floor: now()}); // geçmiş olaylar gönderilmesin
    const id = 'wh-' + uuid().slice(0, 16), secret = 'whsec_' + randomBytes(24).toString('base64url');
    await saveHook(db, {id, url, events, description: clean(b.description, 120), active: true, secret, created: now(), fails: 0}); await log('webhook.create', url);
    return json({ok: true, id, secret, note: 'İmza anahtarı yalnızca şimdi gösterilir.'}, 201);
  }
  if (route === 'integrations/webhooks/update' && req.method === 'POST') {
    const b = await body(), h = (await hooks(db)).find(x => x.id === clean(b.id, 40)); if (!h) fail(404, 'Webhook bulunamadı.');
    if (b.events !== undefined) { const ev = [...new Set((Array.isArray(b.events) ? b.events : []).filter(e => EVENTS[e]))]; if (!ev.length) fail(400, 'En az bir olay seçin.'); h.events = ev; }
    if (b.url !== undefined) h.url = await checkTarget(b.url); if (b.description !== undefined) h.description = clean(b.description, 120);
    if (b.active !== undefined) { const on = !!b.active; if (on && !h.active) { if (!(await hooks(db)).some(x => x.active)) await put(db, SCAN_ID, 'config', 'system', {at: now(), floor: now()}); h.fails = 0; delete h.disabledReason; } h.active = on; }
    await saveHook(db, h); if (b.active !== undefined && !h.active) await dropPending(db, h.id); await log('webhook.update', h.url); return json({ok: true});
  }
  if (route === 'integrations/webhooks/delete' && req.method === 'POST') {
    const b = await body(), h = (await hooks(db)).find(x => x.id === clean(b.id, 40)); if (!h) fail(404, 'Webhook bulunamadı.');
    await db.batch([db.prepare('DELETE FROM items WHERE id=?').bind(h.id), db.prepare("DELETE FROM items WHERE kind='wh_out' AND owner=?").bind(h.id)]); await log('webhook.delete', h.url); return json({ok: true});
  }
  if (route === 'integrations/webhooks/test' && req.method === 'POST') {
    const b = await body(), h = (await hooks(db)).find(x => x.id === clean(b.id, 40)); if (!h) fail(404, 'Webhook bulunamadı.');
    const id = 'wo-' + uuid(); await put(db, id, 'wh_out', h.id, {event: 'ping', payload: {message: 'Brazil Migration test bildirimi'}, created: now(), attempts: 0, status: 'pending', next: now() + 3600e3});
    await sendRow(db, await first(db, 'SELECT * FROM items WHERE id=?', id)); const r = parse((await first(db, 'SELECT data FROM items WHERE id=?', id)).data);
    await db.prepare('DELETE FROM items WHERE id=?').bind(id).run(); return json({ok: r.status === 'done', status: r.last?.code || 0, error: r.last?.error || '', ms: r.last?.ms});
  }
  if (route === 'integrations/webhooks/deliveries' && req.method === 'GET') {
    const id = clean(new URL(req.url).searchParams.get('id'), 40);
    return json({deliveries: (await all(db, "SELECT id, data, created FROM items WHERE kind='wh_out' AND owner=? ORDER BY created DESC, rowid DESC LIMIT 50", id)).map(r => { const d = parse(r.data); return {id: r.id, event: d.event, status: d.status, attempts: d.attempts, next: d.next || null, created: r.created, code: d.last?.code ?? null, error: d.last?.error || '', ms: d.last?.ms ?? null}; })});
  }
  if (route === 'integrations/webhooks/retry' && req.method === 'POST') {
    const b = await body(), r = await first(db, "SELECT * FROM items WHERE id=? AND kind='wh_out'", clean(b.id, 60)); if (!r) fail(404, 'Gönderim bulunamadı.');
    await sendRow(db, {...r, data: JSON.stringify({...parse(r.data), attempts: Math.min(parse(r.data).attempts || 0, RETRY.length - 1)})}); return json({ok: true});
  }
  return null;
}
