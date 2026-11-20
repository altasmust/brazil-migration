// Firma (tenant) kayıt defteri, host çözümleme ve veritabanı oluşturma.
// Kayıt defteri ana veritabanındaki `tenants` tablosudur. Her firmanın verisi ayrı bir veritabanındadır
// (canlıda Turso veritabanı, yerelde dosya); ana firma (Brazil Migration) bu yapının dışında, olduğu gibi çalışır.
import {createCipheriv, createDecipheriv, createHash, randomBytes} from 'node:crypto';
import {getMainDatabase, openTenantDatabase} from './db.mjs';
import {MAIN, runWithTenant} from './tenant-context.mjs';

const G = globalThis;
const TENANTS = (G.__bmTenantObjs ??= new Map());   // id -> tenant nesnesi (db + cfg korunur)
const HOSTS = (G.__bmTenantHosts ??= new Map());    // host -> {t, at}
const HOST_TTL = 30e3;

export const RESERVED = new Set(['www', 'app', 'api', 'admin', 'panel', 'partner', 'mail', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'blog', 'help', 'support', 'status', 'billing', 'login', 'giris', 'ponte', 'main', 'test', 'demo', 'staging', 'dev', 'platform', 'brazilmigration', 'brazil-migration']);
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
export const PLANS = ['free', 'pro', 'office', 'enterprise'];

const platformDomains = () => (process.env.PLATFORM_DOMAIN || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean).concat(process.env.NODE_ENV === 'production' ? [] : ['localhost']);
export const hostOf = req => (req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host).split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');

// ---- jeton şifreleme (TENANT_KEY varsa AES-256-GCM) ----
const key = () => process.env.TENANT_KEY ? createHash('sha256').update('bm-tenant:' + process.env.TENANT_KEY).digest() : null;
function seal(text) {
  if (!text) return null;
  const k = key(); if (!k) return 'p:' + text;
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', k, iv), enc = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return 'e:' + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
function open(text) {
  if (!text) return undefined;
  if (text.startsWith('p:')) return text.slice(2);
  const k = key(); if (!k) throw new Error('TENANT_KEY tanımlı değil; firma veritabanı jetonu çözülemedi.');
  const b = Buffer.from(text.slice(2), 'base64'), d = createDecipheriv('aes-256-gcm', k, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };

function baseUrlFor(row, reqOrigin) {
  if (row.domain) return 'https://' + row.domain;
  const pd = (process.env.PLATFORM_DOMAIN || '').split(',')[0]?.trim();
  if (pd) return `https://${row.slug}.${pd}`;
  return reqOrigin || '';
}

// Kayıt satırından çalışma nesnesi üretir (aynı id için önbellekteki nesne ve veritabanı yeniden kullanılır).
function buildTenant(row, reqOrigin) {
  let t = TENANTS.get(row.id);
  if (t && t.updated === row.updated) return t;
  const cfg = t?.cfg || new Map();
  const next = {
    id: row.id, slug: row.slug, name: row.name, isDefault: false, plan: row.plan, status: row.status, lang: row.lang, country: row.country,
    domain: row.domain || null, ownerEmail: row.owner_email, brand: parse(row.brand), cfg, updated: row.updated, baseUrl: baseUrlFor(row, reqOrigin),
    db: t?.db && t.dbUrl === row.db_url ? t.db : null, dbUrl: row.db_url,
  };
  if (!next.db) next.db = openTenantDatabase({url: row.db_url, authToken: open(row.db_token), ownerEmail: row.owner_email, cfgTarget: cfg});
  TENANTS.set(row.id, next);
  return next;
}

const cols = 'id,slug,name,owner_email,status,plan,domain,db_driver,db_url,db_token,lang,country,brand,created,updated';
async function bySlug(slug) { return getMainDatabase().prepare(`SELECT ${cols} FROM tenants WHERE slug=?`).bind(slug).first(); }
async function byDomain(domain) { return getMainDatabase().prepare(`SELECT ${cols} FROM tenants WHERE domain=?`).bind(domain).first(); }

// İsteğin hangi firmaya ait olduğunu bulur. Dönüş: MAIN | firma nesnesi | {missing: true}
export async function resolveTenant(req) {
  const host = hostOf(req);
  const hit = HOSTS.get(host);
  if (hit && Date.now() - hit.at < HOST_TTL) return hit.t;
  let t = MAIN, row = null;
  const dev = process.env.NODE_ENV !== 'production' ? req.headers.get('x-bm-tenant') : null;
  if (dev) { row = await bySlug(dev.toLowerCase()); t = row ? null : {missing: true, slug: dev}; }
  else {
    for (const d of platformDomains()) {
      if (host === d || host === 'www.' + d) break;
      if (host.endsWith('.' + d)) {
        const slug = host.slice(0, -(d.length + 1));
        if (slug.includes('.')) { t = {missing: true, slug}; break; }
        row = RESERVED.has(slug) ? null : await bySlug(slug);
        t = row ? null : {missing: true, slug};
        break;
      }
    }
    if (t === MAIN && !row) { row = await byDomain(host); if (row) t = null; }
  }
  if (row) t = row.status === 'deleted' ? {missing: true, slug: row.slug} : buildTenant(row, new URL(req.url).origin);
  if (HOSTS.size > 500) HOSTS.clear();
  HOSTS.set(host, {t, at: Date.now()});
  return t;
}

export const invalidateTenants = () => { HOSTS.clear(); };

// İstek işleyicisini firma bağlamında çalıştırır; bulunamayan/askıdaki firmalar için yanıt döner.
export async function withTenant(req, fn) {
  const t = await resolveTenant(req);
  if (t.missing) return gone(req, 404, 'Bu adreste bir firma bulunamadı.');
  if (!t.isDefault && t.status === 'suspended') return gone(req, 503, 'Bu firmanın hesabı geçici olarak durduruldu.');
  if (!t.isDefault) await t.db.ready();
  return runWithTenant(t, fn);
}
function gone(req, status, message) {
  const path = new URL(req.url).pathname;
  if (path.startsWith('/api/') || /json/.test(req.headers.get('accept') || '')) return Response.json({error: message}, {status, headers: {'Cache-Control': 'no-store'}});
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${message}</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;color:#203e32;background:#f6f7f2"><div style="text-align:center;padding:24px"><h1 style="font-size:22px">${message}</h1></div>`, {status, headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex'}});
}

// ---- firma oluşturma ----
export async function provisionDatabase(slug) {
  const org = process.env.TURSO_ORG, token = process.env.TURSO_API_TOKEN;
  if (org && token) {
    const name = `bm-${slug}-${randomBytes(2).toString('hex')}`.slice(0, 60), h = {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'};
    const r = await fetch(`https://api.turso.tech/v1/organizations/${encodeURIComponent(org)}/databases`, {method: 'POST', headers: h, body: JSON.stringify({name, group: process.env.TURSO_GROUP || 'default'})});
    if (!r.ok) throw Object.assign(new Error('Firma veritabanı oluşturulamadı (Turso ' + r.status + ').'), {status: 502});
    const host = (await r.json())?.database?.Hostname; if (!host) throw Object.assign(new Error('Turso veritabanı adresi alınamadı.'), {status: 502});
    const tk = await fetch(`https://api.turso.tech/v1/organizations/${encodeURIComponent(org)}/databases/${name}/auth/tokens?authorization=full-access`, {method: 'POST', headers: h});
    const jwt = tk.ok ? (await tk.json())?.jwt : null; if (!jwt) throw Object.assign(new Error('Firma veritabanı jetonu alınamadı.'), {status: 502});
    return {driver: 'turso', url: 'libsql://' + host, token: jwt};
  }
  if (process.env.NODE_ENV === 'production' && process.env.TENANT_FILE_DB !== 'on') throw Object.assign(new Error('Yeni firma açma henüz etkin değil: sunucuda TURSO_API_TOKEN ve TURSO_ORG tanımlı olmalı.'), {status: 503});
  return {driver: 'file', url: 'file:' + (process.env.TENANT_DB_DIR || '.data/tenants') + '/' + slug + '.db', token: null};
}

export function validateSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (!SLUG_RE.test(s)) throw Object.assign(new Error('Adres 3–30 karakter olmalı; yalnız harf, rakam ve tire içerebilir.'), {status: 400});
  if (RESERVED.has(s)) throw Object.assign(new Error('Bu adres ayrılmış, başka bir tane seçin.'), {status: 400});
  return s;
}

export async function createTenant({name, slug, ownerEmail, lang = 'tr', country = 'BR', plan = 'free'}) {
  const main = getMainDatabase(); await main.ready();
  const s = validateSlug(slug), email = String(ownerEmail || '').trim().toLowerCase(), nm = String(name || '').trim().slice(0, 80);
  if (nm.length < 2) throw Object.assign(new Error('Firma adı gerekli.'), {status: 400});
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(email)) throw Object.assign(new Error('Geçerli bir e-posta adresi girin.'), {status: 400});
  if (!['tr', 'en', 'pt', 'fa', 'th'].includes(lang)) lang = 'tr';
  if (!PLANS.includes(plan)) plan = 'free';
  if (await bySlug(s)) throw Object.assign(new Error('Bu adres kullanımda, başka bir tane seçin.'), {status: 409});
  const db = await provisionDatabase(s), id = 'tn_' + randomBytes(8).toString('hex'), now = Date.now();
  await main.prepare('INSERT INTO tenants (id,slug,name,owner_email,status,plan,domain,db_driver,db_url,db_token,lang,country,brand,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, s, nm, email, 'active', plan, null, db.driver, db.url, seal(db.token), lang, String(country || 'BR').toUpperCase().slice(0, 2), '{}', now, now).run();
  const row = await bySlug(s), t = buildTenant(row, '');
  await t.db.ready();
  invalidateTenants();
  return t;
}

export async function tenantById(id) {
  const row = await getMainDatabase().prepare(`SELECT ${cols} FROM tenants WHERE id=?`).bind(id).first();
  if (!row) throw Object.assign(new Error('Firma bulunamadı.'), {status: 404});
  const t = buildTenant(row, ''); await t.db.ready(); return t;
}

export async function listTenants() {
  const r = await getMainDatabase().prepare('SELECT id,slug,name,owner_email,status,plan,domain,db_driver,lang,country,created FROM tenants ORDER BY created DESC').all();
  return r.results;
}

export async function updateTenant(id, patch) {
  const main = getMainDatabase(), row = await main.prepare(`SELECT ${cols} FROM tenants WHERE id=?`).bind(id).first();
  if (!row) throw Object.assign(new Error('Firma bulunamadı.'), {status: 404});
  const sets = [], args = [];
  const put = (c, v) => { sets.push(c + '=?'); args.push(v); };
  if (patch.name !== undefined) put('name', String(patch.name).trim().slice(0, 80));
  if (patch.status !== undefined && ['active', 'suspended', 'deleted'].includes(patch.status)) put('status', patch.status);
  if (patch.plan !== undefined && PLANS.includes(patch.plan)) put('plan', patch.plan);
  if (patch.lang !== undefined) put('lang', patch.lang);
  if (patch.brand !== undefined) put('brand', JSON.stringify(patch.brand || {}));
  if (patch.domain !== undefined) put('domain', patch.domain ? String(patch.domain).trim().toLowerCase() : null);
  if (!sets.length) return buildTenant(row, '');
  put('updated', Date.now());
  await main.prepare(`UPDATE tenants SET ${sets.join(', ')} WHERE id=?`).bind(...args, id).run();
  invalidateTenants();
  return buildTenant(await main.prepare(`SELECT ${cols} FROM tenants WHERE id=?`).bind(id).first(), '');
}
