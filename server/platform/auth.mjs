// Session/password primitives for the unified login.
import {scrypt as _scrypt, randomBytes, createHash, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt = promisify(_scrypt);

export const OWNER_EMAIL = () => (process.env.OWNER_EMAIL || 'admin@brazilmigration.com').toLowerCase();
export const now = () => Date.now();
export const uuid = () => crypto.randomUUID();
export const fail = (status, message, extra) => { throw Object.assign(new Error(message), {status, extra}); };
export const clean = (v, n = 200) => String(v ?? '').trim().slice(0, n);
export const validEmail = e => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);
export const sha = s => createHash('sha256').update(s).digest('hex');

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, {N: 16384, r: 8, p: 1});
  return {salt, hash: key.toString('hex')};
}
export async function checkPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const key = await scrypt(password, salt, 64, {N: 16384, r: 8, p: 1});
  const want = Buffer.from(hash, 'hex');
  return want.length === key.length && timingSafeEqual(want, key);
}
export const passwordOk = p => typeof p === 'string' && p.length >= 8 && p.length <= 128 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(p) && /\d/.test(p);
export const PASSWORD_RULE = 'Şifre en az 8 karakter olmalı ve harf ile rakam içermelidir.';

// ---- hosts & cookies ------------------------------------------------------
const hostOf = req => (req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host).split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
export const adminHosts = () => (process.env.ADMIN_HOST || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
export const onAdminHost = req => adminHosts().includes(hostOf(req));
export function isAdminRequest(req) {
  const p = new URL(req.url).pathname;
  if (adminHosts().length) return onAdminHost(req);
  return p.startsWith('/api/admin') || p.startsWith('/api/platform/admin') || p.startsWith('/api/auth/admin');
}
const secure = req => !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostOf(req));
export const cookieName = req => isAdminRequest(req) ? 'bm_admin' : 'bm_session';
export function readCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
export async function createImpersonationSession(db, req, userId, byEmail) {
  const token = randomBytes(32).toString('base64url'), ttl = 2 * 36e5;
  await db.batch([
    db.prepare('INSERT INTO auth_sessions VALUES(?,?,?,?,?)').bind(sha(token), userId, 'site', now() + ttl, now()),
    db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind('imp-' + sha(token), 'impersonation', userId, JSON.stringify({by: byEmail}), now(), now()),
  ]);
  return sessionCookie(req, token, ttl / 1000);
}
export async function isImpersonated(db, req) {
  const token = readCookie(req, cookieName(req)); if (!token) return false;
  return !!(await db.prepare('SELECT id FROM items WHERE id=?').bind('imp-' + sha(token)).first());
}
export function sessionCookie(req, token, maxAge) {
  return `${cookieName(req)}=${token ? encodeURIComponent(token) : ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? maxAge : 0}${secure(req) ? '; Secure' : ''}`;
}
export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const u = new URL(req.url); const h = req.headers.get('x-forwarded-host') || req.headers.get('host') || u.host;
  return `${req.headers.get('x-forwarded-proto') || u.protocol.replace(':', '')}://${h}`;
}
export function adminUrl(req) {
  if (process.env.ADMIN_URL) return process.env.ADMIN_URL.replace(/\/$/, '');
  const h = adminHosts()[0]; return h ? 'https://' + h : siteUrl(req);
}

// ---- sessions --------------------------------------------------------------
const SESSION_DAYS = 14;
export async function createSession(db, req, userId) {
  const token = randomBytes(32).toString('base64url');
  const scope = isAdminRequest(req) ? 'admin' : 'site';
  await db.prepare('INSERT INTO auth_sessions VALUES(?,?,?,?,?)').bind(sha(token), userId, scope, now() + SESSION_DAYS * 864e5, now()).run();
  return sessionCookie(req, token, SESSION_DAYS * 86400);
}
export async function currentUser(db, req) {
  const token = readCookie(req, cookieName(req));
  if (!token) return null;
  const scope = isAdminRequest(req) ? 'admin' : 'site';
  const s = await db.prepare('SELECT * FROM auth_sessions WHERE token=? AND scope=?').bind(sha(token), scope).first();
  if (!s || s.expires < now()) return null;
  const u = await db.prepare('SELECT * FROM auth_users WHERE id=?').bind(s.user).first();
  if (!u) return null;
  if (!u.verified && !(scope === 'site' && await db.prepare('SELECT id FROM items WHERE id=?').bind('imp-' + sha(token)).first())) return null;
  if (scope === 'admin' && u.email !== OWNER_EMAIL()) return null;
  if (scope === 'site' && u.email === OWNER_EMAIL()) return null;
  return u;
}
export async function destroySession(db, req) {
  const token = readCookie(req, cookieName(req));
  if (token) await db.prepare('DELETE FROM auth_sessions WHERE token=?').bind(sha(token)).run();
  return sessionCookie(req, null, 0);
}

// ---- one-time tokens -------------------------------------------------------
export async function createToken(db, userId, purpose, hours) {
  const token = randomBytes(24).toString('base64url');
  await db.prepare('INSERT INTO auth_tokens VALUES(?,?,?,?,?,?)').bind(sha(token), userId, purpose, now() + hours * 36e5, 0, now()).run();
  return token;
}
export async function useToken(db, token, purposes) {
  const t = await db.prepare('SELECT * FROM auth_tokens WHERE token=?').bind(sha(clean(token, 200))).first();
  if (!t || t.used || t.expires < now() || !purposes.includes(t.purpose)) fail(400, 'Bağlantı geçersiz veya süresi dolmuş.');
  const r = await db.prepare('UPDATE auth_tokens SET used=1 WHERE token=? AND used=0').bind(t.token).run();
  if (r.meta.changes !== 1) fail(400, 'Bu bağlantı zaten kullanılmış.');
  return t;
}

// Rebuilds the request with trusted identity headers (anything sent by the browser is removed).
export async function withIdentity(db, req) {
  const h = new Headers(req.headers);
  for (const k of [...h.keys()]) if (k.startsWith('oai-authenticated-')) h.delete(k);
  const u = await currentUser(db, req);
  if (u) { h.set('oai-authenticated-user-id', u.id); h.set('oai-authenticated-user-email', u.email); }
  const init = {method: req.method, headers: h};
  if (!['GET', 'HEAD'].includes(req.method)) { init.body = req.body; init.duplex = 'half'; }
  // Rebuild the URL from the public host so the legacy same-origin checks match the browser's Origin.
  const url = new URL(req.url);
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host).split(',')[0].trim();
  const proto = (req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')).split(',')[0].trim();
  return {req: new Request(`${proto}://${host}${url.pathname}${url.search}`, init), user: u};
}
