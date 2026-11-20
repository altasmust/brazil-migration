// Faz 5 · Güvenlik: iki aşamalı doğrulama (TOTP, RFC 6238), oturum yönetimi (cihaz listesi/kapatma), belge şifreleme (isteğe bağlı), firma bazlı yedek geri yükleme (backup.mjs).
//  • TOTP: kullanıcı kendi hesabı için açar (yönetici dâhil). Etkinleştirmek için kodu doğrulaması şart; 8 tek kullanımlık kurtarma kodu gösterilir (yalnız özeti saklanır).
//    Girişte parola doğrulandıktan sonra kod istenir; hatalı kodlar parola hatalarıyla aynı kilit sayacına işler (8 hata → 15 dk).
//  • Oturumlar: tarayıcı/cihaz özeti ve kaba konum (IP’nin yalnız ilk bölümü) saklanır; kullanıcı tek tek veya “diğer tümü” kapatabilir. Çerez değeri asla gösterilmez.
//  • Belge şifreleme: AES-256-GCM, firma başına rastgele anahtar. Varsayılan KAPALI. Yalnızca depolama sızıntısına (blob deposu) karşı korur; anahtar firma veritabanında durur,
//    yedeklerde (şifresiz) bulunur. Kapatılsa da şifreli eski dosyalar anahtarla okunmaya devam eder.
import {createHmac, createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual} from 'node:crypto';
import {fail, clean, now, sha, currentUser, readCookie, cookieName, checkPassword} from './auth.mjs';
import {cfgEnv} from './tenant-context.mjs';
import {json, parse, all, first, put, readBody} from './kit.mjs';
import {encryptionStatus, setDocEncryption, encryptExisting} from './storage.mjs';

// ---------------- TOTP ----------------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const b32 = buf => { let bits = 0, v = 0, o = ''; for (const b of buf) { v = (v << 8) | b; bits += 8; while (bits >= 5) { o += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) o += B32[(v << (5 - bits)) & 31]; return o; };
export const unb32 = s => { let bits = 0, v = 0; const out = []; for (const c of String(s).replace(/[\s=-]/g, '').toUpperCase()) { const i = B32.indexOf(c); if (i < 0) continue; v = (v << 5) | i; bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
export const totp = (secret, t = Date.now(), step = 30, digits = 6) => {
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / step)));
  const h = createHmac('sha1', unb32(secret)).update(ctr).digest(), o = h[h.length - 1] & 15, n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digits).padStart(digits, '0');
};
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
// Eşleşen zaman adımını döner (yoksa -1). Aynı adımın (ya da eskisinin) tekrar kullanılması reddedilir → kod çalınsa bile ikinci kez işe yaramaz.
export const totpStep = (secret, code, t = Date.now()) => { code = String(code || '').replace(/\s/g, ''); if (!/^\d{6}$/.test(code)) return -1; const cur = Math.floor(t / 30000); for (const w of [-1, 0, 1]) if (safeEq(totp(secret, (cur + w) * 30000), code)) return cur + w; return -1; };
export const totpOk = (secret, code, t = Date.now()) => totpStep(secret, code, t) >= 0;

// Sır istenirse TOTP_ENC_KEY ile şifreli saklanır (yapılandırılmışsa); yoksa düz (veritabanı zaten erişim kontrollü).
const encKey = () => { const k = cfgEnv('TOTP_ENC_KEY'); return k ? createHash('sha256').update(k).digest() : null; };
const sealSecret = s => { const k = encKey(); if (!k) return {s}; const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', k, iv), ct = Buffer.concat([c.update(s, 'utf8'), c.final()]); return {e: Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64')}; };
const openSecret = o => { if (o.s) return o.s; const k = encKey(); if (!k || !o.e) return ''; const b = Buffer.from(o.e, 'base64'), d = createDecipheriv('aes-256-gcm', k, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); };

const rec = async (db, uid) => { const r = await first(db, 'SELECT id, data FROM items WHERE id=?', 'totp:' + uid); return r ? {id: r.id, d: parse(r.data)} : null; };
export const twoFactorOn = async (db, uid) => !!(await rec(db, uid))?.d.enabled;
// Girişte çağrılır: kod TOTP ya da kurtarma kodu olabilir. Geçerliyse true.
export async function verifySecondFactor(db, uid, code) {
  const r = await rec(db, uid); if (!r?.d.enabled) return true;
  const c = String(code || '').trim(); if (!c) return false;
  try { const st = totpStep(openSecret(r.d.secret || {}), c); if (st >= 0) { if (st <= (r.d.last ?? -1)) return false; await put(db, r.id, 'totp', uid, {...r.d, last: st}); return true; } } catch {}
  const h = sha('rc:' + c.toLowerCase().replace(/\s/g, '')); const i = (r.d.recovery || []).indexOf(h);
  if (i >= 0) { const left = [...r.d.recovery]; left.splice(i, 1); await put(db, r.id, 'totp', uid, {...r.d, recovery: left}); return true; }
  return false;
}
const newRecovery = () => Array.from({length: 8}, () => { const h = randomBytes(5).toString('hex'); return h.slice(0, 5) + '-' + h.slice(5); });

// ---------------- Oturumlu kullanıcı uçları (handleAuth) ----------------
export async function securityPublic(req, db, route) {
  if (!route.startsWith('security/')) return null;
  const u = await currentUser(db, req); if (!u) fail(401, 'Giriş gerekli.');
  const body = async () => (req.method === 'GET' ? {} : await readBody(req, 10000)), cur = sha(readCookie(req, cookieName(req)) || '');
  if (route === 'security/me' && req.method === 'GET') {
    const r = await rec(db, u.id), rows = await all(db, 'SELECT token, created, expires, scope FROM auth_sessions WHERE user=? AND expires>? ORDER BY created DESC LIMIT 50', u.id, now());
    const meta = new Map((await all(db, "SELECT id, data FROM items WHERE kind='sessmeta' AND owner=?", u.id)).map(m => [m.id, parse(m.data)]));
    return json({email: u.email, twofa: {enabled: !!r?.d.enabled, recovery: (r?.d.recovery || []).length, pending: !!r && !r.d.enabled}, sessions: rows.map(s => { const m = meta.get('sm-' + s.token) || {}; return {id: s.token, current: s.token === cur, created: s.created, expires: s.expires, scope: s.scope, agent: m.agent || 'Bilinmeyen cihaz', ip: m.ip || '', country: m.country || ''}; })});
  }
  if (route === 'security/2fa/setup' && req.method === 'POST') {
    const ex = await rec(db, u.id); if (ex?.d.enabled) fail(409, 'İki aşamalı doğrulama zaten açık.');
    const secret = b32(randomBytes(20)), issuer = cfgEnv('SITE_NAME') || 'Brazil Migration';
    await put(db, 'totp:' + u.id, 'totp', u.id, {enabled: false, secret: sealSecret(secret), recovery: [], at: now()});
    return json({secret, uri: `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(u.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`});
  }
  if (route === 'security/2fa/enable' && req.method === 'POST') {
    const b = await body(), r = await rec(db, u.id); if (!r || r.d.enabled) fail(400, 'Önce kurulumu başlatın.');
    const st = totpStep(openSecret(r.d.secret), b.code); if (st < 0) fail(400, 'Kod doğru değil. Uygulamadaki güncel 6 haneli kodu girin.');
    const codes = newRecovery(); await put(db, r.id, 'totp', u.id, {...r.d, enabled: true, last: st, recovery: codes.map(c => sha('rc:' + c)), enabledAt: now()});
    return json({ok: true, recoveryCodes: codes}); // yalnız bir kez gösterilir
  }
  if (route === 'security/2fa/disable' && req.method === 'POST') {
    const b = await body(), r = await rec(db, u.id); if (!r) return json({ok: true});
    const row = await first(db, 'SELECT salt, hash FROM auth_users WHERE id=?', u.id);
    if (!row || !(await checkPassword(String(b.password || ''), row.salt, row.hash))) fail(403, 'Parola doğru değil.');
    if (r.d.enabled && !(await verifySecondFactor(db, u.id, b.code))) fail(403, 'Doğrulama kodu doğru değil.');
    await db.prepare('DELETE FROM items WHERE id=?').bind(r.id).run(); return json({ok: true});
  }
  if (route === 'security/sessions/revoke' && req.method === 'POST') {
    const b = await body(), id = clean(b.id, 80); if (id === cur) fail(400, 'Bu oturumu kapatmak için “Çıkış yap”ı kullanın.');
    await db.batch([db.prepare('DELETE FROM auth_sessions WHERE token=? AND user=?').bind(id, u.id), db.prepare('DELETE FROM items WHERE id=? AND owner=?').bind('sm-' + id, u.id)]); return json({ok: true});
  }
  if (route === 'security/sessions/revoke-all' && req.method === 'POST') {
    const others = (await all(db, 'SELECT token FROM auth_sessions WHERE user=? AND token<>?', u.id, cur)).map(r => r.token);
    await db.batch([db.prepare('DELETE FROM auth_sessions WHERE user=? AND token<>?').bind(u.id, cur), ...others.map(t => db.prepare('DELETE FROM items WHERE id=?').bind('sm-' + t))].filter(Boolean)); return json({ok: true, closed: others.length});
  }
  return null;
}

// ---------------- Yönetici: belge şifreleme ----------------
export async function securityAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('security/')) return null;
  const {audit, actor} = ctx, log = async (a, t) => { try { if (audit) await audit(db, actor, a, t).run(); } catch {} };
  const body = async () => (req.method === 'GET' ? {} : await readBody(req, 10000));
  if (route === 'security/docenc' && req.method === 'GET') return json(await encryptionStatus(db));
  if (route === 'security/docenc' && req.method === 'POST') {
    const b = await body(); if (b.enabled && b.confirm !== true) fail(400, 'Şifrelemeyi açmak için uyarıyı onaylayın.');
    await setDocEncryption(db, !!b.enabled); await log('security.docenc', b.enabled ? 'on' : 'off'); return json({ok: true, ...(await encryptionStatus(db))});
  }
  if (route === 'security/docenc/migrate' && req.method === 'POST') {
    const b = await body(), r = await encryptExisting(db, ctx.bucket, Math.max(1, Math.min(200, Number(b.limit) || 50))); await log('security.docenc.migrate', String(r.done)); return json({ok: true, ...r});
  }
  return null;
}
