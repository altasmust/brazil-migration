// Faz 5 · PWA bildirimleri (Web Push / VAPID). Müşteri, danışman/personel ve yönetici cihazlarına uygulama bildirimi gönderir.
//  • Kaynak: panelde zaten üretilen `notice` kayıtları (yeni mesaj, belge, görüşme…). Tarayıcı bu kayıtları izler → her bildirim bir kez gönderilir; mevcut kod yollarına dokunulmaz.
//  • Gizlilik: varsayılan bildirim metni geneldir ("Yeni bildiriminiz var"); kullanıcı isterse ayrıntıyı (kilit ekranında) açar.
//  • Her firmanın kendi VAPID anahtarı vardır (firma veritabanında). Ücretsiz; Google/Firebase hesabı gerekmez. iPhone'da yalnız Ana Ekrana eklenmiş uygulamada çalışır (iOS 16.4+).
import webpush from 'web-push';
import {json, parse, all, first, put, readBody} from './kit.mjs';
import {fail, clean, sha, now, currentUser, readCookie, cookieName, OWNER_EMAIL} from './auth.mjs';
import {currentTenant, runWithTenant, cfgEnv} from './tenant-context.mjs';
import {langOf} from './comms.mjs';

const VAPID_ID = 'config-vapid', SCAN_ID = 'config-push-scan', MAX_SUBS = 10;
export const sender = {send: (sub, payload, opts) => webpush.sendNotification(sub, payload, opts)}; // testlerde değiştirilebilir
const GENERIC = {tr: 'Yeni bildiriminiz var.', en: 'You have a new notification.', pt: 'Você tem uma nova notificação.', es: 'Tienes una nueva notificación.', de: 'Sie haben eine neue Benachrichtigung.', fr: 'Vous avez une nouvelle notification.', ru: 'У вас новое уведомление.', ar: 'لديك إشعار جديد.', fa: 'اعلان جدید دارید.'};
const TEST = {tr: 'Bildirimler çalışıyor ✓', en: 'Notifications are working ✓', pt: 'As notificações estão funcionando ✓'};

async function vapid(db) {
  const r = await first(db, 'SELECT data FROM items WHERE id=?', VAPID_ID); let k = parse(r?.data);
  if (!k.publicKey) { k = webpush.generateVAPIDKeys(); await db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(VAPID_ID, 'config', 'system', JSON.stringify(k), now(), now()).run(); k = parse((await first(db, 'SELECT data FROM items WHERE id=?', VAPID_ID)).data); }
  return k;
}
const subjectOf = () => 'mailto:' + (cfgEnv('OWNER_EMAIL') || OWNER_EMAIL());
const brandOf = async db => { const r = await first(db, "SELECT data FROM items WHERE id='config-company'"); return clean(parse(r?.data).brand, 60) || currentTenant().name || 'Brazil Migration'; };

// Bir kullanıcıya ait abonelikleri bul: scope 'admin' → yönetici; 'site' → müşteri/danışman (people.uid).
// Yalnız oturumu hâlâ açık olan cihazlara gönderilir (abonelik, abone olurken kullanılan oturuma bağlıdır): çıkış yapılınca / oturum kapatılınca / süresi dolunca bildirim durur.
const subsFor = async (db, uid, scope) => (await all(db, "SELECT i.id, i.data FROM items i WHERE i.kind='push_sub' AND i.owner=? AND EXISTS (SELECT 1 FROM auth_sessions s WHERE s.token=json_extract(i.data,'$.sess') AND s.user=? AND s.expires>?)", uid, uid, now())).map(r => ({id: r.id, ...parse(r.data)})).filter(s => s.scope === scope);
async function deliver(db, sub, payload, ttl = 86400) {
  const k = await vapid(db);
  try { await sender.send({endpoint: sub.endpoint, keys: sub.keys}, JSON.stringify(payload), {TTL: ttl, urgency: 'normal', vapidDetails: {subject: subjectOf(), publicKey: k.publicKey, privateKey: k.privateKey}}); return true; }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await db.prepare('DELETE FROM items WHERE id=?').bind(sub.id).run(); return false; }
}

// ---------------- Kullanıcı uçları (handleAuth; site ve admin kapsamı) ----------------
export async function pushPublic(req, db, route) {
  if (!route.startsWith('push/')) return null;
  const u = await currentUser(db, req); if (!u) fail(401, 'Giriş gerekli.');
  const scope = u.email === OWNER_EMAIL() ? 'admin' : 'site', body = async () => (req.method === 'GET' ? {} : await readBody(req, 10000));
  if (route === 'push/key' && req.method === 'GET') return json({publicKey: (await vapid(db)).publicKey, me: sha('pm:' + u.id).slice(0, 16)}); // me: istemcinin "bu cihazı bu hesap mı açtı" kontrolü için
  if (route === 'push/status' && req.method === 'GET') { const s = await subsFor(db, u.id, scope), ep = clean(new URL(req.url).searchParams.get('endpoint'), 600); return json({devices: s.length, thisDevice: ep ? s.some(x => x.endpoint === ep) : false, detail: ep ? !!s.find(x => x.endpoint === ep)?.detail : false}); }
  if (route === 'push/subscribe' && req.method === 'POST') {
    const b = await body(), s = b.subscription || {}, endpoint = clean(s.endpoint, 600), p256dh = clean(s.keys?.p256dh, 200), auth = clean(s.keys?.auth, 100);
    if (!/^https:\/\/[^\s]{10,}$/.test(endpoint) || !/^[A-Za-z0-9_-]{60,100}$/.test(p256dh) || !/^[A-Za-z0-9_-]{16,40}$/.test(auth)) fail(400, 'Geçersiz bildirim aboneliği.');
    const id = 'ps-' + sha(endpoint).slice(0, 32), old = await first(db, 'SELECT owner, data FROM items WHERE id=?', id), sess = sha(readCookie(req, cookieName(req)) || '');
    if (old && old.owner !== u.id) await db.prepare('DELETE FROM items WHERE id=?').bind(id).run(); // aynı cihaz başka hesaba geçti: eski sahibin aboneliği düşer
    const mine = await subsFor(db, u.id, scope); if (!old && mine.length >= MAX_SUBS) await db.prepare('DELETE FROM items WHERE id=?').bind(mine.sort((a, c) => (a.at || 0) - (c.at || 0))[0].id).run();
    if (!Number((await first(db, "SELECT COUNT(*) AS n FROM items WHERE kind='push_sub'"))?.n || 0)) await put(db, SCAN_ID, 'config', 'system', {at: now(), floor: now()}); // geçmiş bildirimler gönderilmesin
    await put(db, id, 'push_sub', u.id, {scope, endpoint, keys: {p256dh, auth}, detail: !!b.detail, ua: clean(req.headers.get('user-agent'), 120), sess, at: old && old.owner === u.id ? parse(old.data).at || now() : now(), updated: now()});
    return json({ok: true});
  }
  if (route === 'push/unsubscribe' && req.method === 'POST') { const b = await body(); await db.prepare("DELETE FROM items WHERE kind='push_sub' AND owner=? AND id=?").bind(u.id, 'ps-' + sha(clean(b.endpoint, 600)).slice(0, 32)).run(); return json({ok: true}); }
  if (route === 'push/test' && req.method === 'POST') {
    const subs = await subsFor(db, u.id, scope); if (!subs.length) fail(400, 'Bu hesapta bildirim açık cihaz yok.');
    const lang = await langOf(db, u.email), brand = await brandOf(db); let n = 0;
    for (const s of subs) if (await deliver(db, s, {title: brand, body: TEST[lang] || TEST.en, url: scope === 'admin' ? '/admin/' : '/panel/', tag: 'bm-test'}, 600)) n++;
    return json({ok: n > 0, sent: n, devices: subs.length});
  }
  return null;
}

// ---------------- Bildirim tarayıcısı ----------------
const homeOf = (role, scope) => (scope === 'admin' ? '/admin/' : role === 'customer' ? '/panel/' : '/partner/');
export async function scanNotices(db) {
  if (!Number((await first(db, "SELECT COUNT(*) AS n FROM items WHERE kind='push_sub'"))?.n || 0)) return 0;
  const st = await first(db, 'SELECT data FROM items WHERE id=?', SCAN_ID), S = parse(st?.data), start = now();
  if (!S.at) { await put(db, SCAN_ID, 'config', 'system', {at: start, floor: start}); return 0; }
  if (!S.pruned || start - S.pruned > 36e5) { await db.prepare("DELETE FROM items WHERE kind='push_sub' AND updated<? AND NOT EXISTS (SELECT 1 FROM auth_sessions s WHERE s.token=json_extract(items.data,'$.sess') AND s.expires>?)").bind(start - 30 * 864e5, start).run(); S.pruned = start; } // oturumu ölmüş eski abonelikler
  const rows = await all(db, "SELECT id, owner, data FROM items WHERE kind='notice' AND created>=? AND json_extract(data,'$.pushed') IS NULL ORDER BY created LIMIT 200", S.at), brand = rows.length ? await brandOf(db) : '';
  let sent = 0;
  for (const r of rows) {
    const d = parse(r.data); await db.prepare("UPDATE items SET data=json_set(data,'$.pushed',1) WHERE id=?").bind(r.id).run(); // önce işaretle: çift gönderim olmasın
    let uid, scope, person = null;
    if (r.owner === 'owner') { const o = await first(db, 'SELECT id FROM auth_users WHERE email=?', OWNER_EMAIL()); uid = o?.id; scope = 'admin'; }
    else { person = await first(db, 'SELECT id, uid, email, role FROM people WHERE id=?', r.owner); uid = person?.uid; scope = 'site'; }
    if (!uid) continue; const subs = await subsFor(db, uid, scope); if (!subs.length) continue;
    const lang = person ? await langOf(db, person.email) : 'tr', link = clean(d.link, 40).replace(/[^\w-]/g, ''), url = homeOf(person?.role, scope) + (link ? '#' + link : '');
    for (const s of subs) if (await deliver(db, s, {title: brand, body: s.detail ? clean(d.title, 140) : (GENERIC[lang] || GENERIC.en), url, tag: 'bm-' + r.id.slice(0, 24)})) sent++;
  }
  await put(db, SCAN_ID, 'config', 'system', {at: rows.length >= 200 ? S.at : Math.max(start - 5000, S.floor || 0), floor: S.floor || 0, pruned: S.pruned});
  return sent;
}
export function ensurePush(env) {
  if (!env?.DB) return; const T = currentTenant(); (globalThis.__bmPushEnvs ??= new Map()).set(T.id, {t: T, env});
  if (globalThis.__bmPush) return;
  const tick = async () => {
    if (globalThis.__bmPushRun) return; globalThis.__bmPushRun = true;
    try { for (const {t, env: e} of [...globalThis.__bmPushEnvs.values()]) await runWithTenant(t, async () => { try { await scanNotices(e.DB); } catch (err) { console.error('[push]', err.message); } }); }
    finally { globalThis.__bmPushRun = false; }
  };
  globalThis.__bmPush = setInterval(tick, 20e3); if (globalThis.__bmPush.unref) globalThis.__bmPush.unref();
}
