import {currentTenant, runWithTenant} from './tenant-context.mjs';
// Güvence: günlük veritabanı yedeği (BUCKET → backups/, son 14 kopya), sağlık kontrolü.
import {gzipSync, gunzipSync} from 'node:zlib';
import {dropEncCache} from './storage.mjs';
import {markBackupDownloaded} from './updates.mjs';

const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
const KEEP = 14, DAY = 864e5, LOG = 'config-backups';
const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});

async function readLog(db) { const r = await db.prepare('SELECT data FROM items WHERE id=?').bind(LOG).first(); return {list: [], ...parse(r?.data)}; }
async function writeLog(db, d) { const t = Date.now(); await db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').bind(LOG, 'config', 'system', JSON.stringify(d), t, t).run(); }

export async function runBackup(db, bucket, by = 'otomatik') {
  const tables = ((await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('_migrations','_cf_KV','d1_migrations')").all()).results || []).map(r => r.name);
  const dump = {format: 'brazil-migration-backup', version: 1, at: new Date().toISOString(), tables: {}};
  let rows = 0;
  for (const t of tables) {
    if (!/^[A-Za-z0-9_]+$/.test(t)) continue;
    const r = (await db.prepare(`SELECT * FROM "${t}"`).all()).results || [];
    dump.tables[t] = r; rows += r.length;
  }
  // yedeğin kendi kaydı yedeğe girmesin (sonsuz büyüme olmasın)
  if (dump.tables.items) dump.tables.items = dump.tables.items.filter(r => r.id !== LOG && r.kind !== 'errlog');
  const buf = gzipSync(Buffer.from(JSON.stringify(dump)));
  const key = `backups/bm-${dump.at.replace(/[:.]/g, '-')}.json.gz`;
  await bucket.put(key, buf, {httpMetadata: {contentType: 'application/gzip'}});
  const log = await readLog(db);
  log.list = [{key, at: Date.now(), size: buf.length, rows, tables: Object.keys(dump.tables).length, by}, ...(log.list || [])];
  for (const old of log.list.slice(KEEP)) { try { await bucket.delete(old.key); } catch {} }
  log.list = log.list.slice(0, KEEP); log.last = Date.now(); log.error = null;
  await writeLog(db, log);
  return log.list[0];
}


// ---- Firma bazında geri yükleme ----
// Seçilen yedekteki tüm tabloları bu firmanın veritabanına yazar. Dokunulmayanlar: açık oturumlar/tek kullanımlık bağlantılar (yönetici atılmasın),
// yedek günlüğü, hata günlüğü, oturum cihaz kayıtları ve (varsa) güncel belge şifreleme anahtarı (aksi halde şifreli dosyalar okunamaz olurdu).
// Önce "geri yükleme öncesi" yedeği alınır. Dosyalar (blob) bu işlemde geri yüklenmez — yalnız veritabanı kayıtları.
const SKIP_TABLES = new Set(['auth_sessions', 'auth_tokens', '_migrations', '_cf_KV', 'd1_migrations']);
const ENC = 'config-docenc';
export async function restoreBackup(db, bucket, key, by = 'yönetici') {
  const o = await bucket.get(key); if (!o) throw Object.assign(new Error('Yedek dosyası bulunamadı.'), {status: 404});
  let dump; try { dump = JSON.parse(gunzipSync(Buffer.from(await o.arrayBuffer())).toString('utf8')); } catch { throw Object.assign(new Error('Yedek dosyası okunamadı (bozuk olabilir).'), {status: 400}); }
  if (dump?.format !== 'brazil-migration-backup' || !dump.tables || typeof dump.tables !== 'object') throw Object.assign(new Error('Bu dosya geçerli bir yedek değil.'), {status: 400});
  const cur = ((await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()).results || []).map(r => r.name);
  const keepEnc = !!(await db.prepare('SELECT 1 AS x FROM items WHERE id=?').bind(ENC).first());
  const snapshot = await runBackup(db, bucket, 'geri yükleme öncesi'); // şimdiki hâl güvence altında
  const out = {tables: 0, rows: 0, skipped: []};
  for (const [t, rowsIn] of Object.entries(dump.tables)) {
    if (!/^[A-Za-z0-9_]+$/.test(t) || SKIP_TABLES.has(t)) continue;
    if (!cur.includes(t)) { out.skipped.push(t); continue; }
    const cols = ((await db.prepare(`SELECT name FROM pragma_table_info('${t}')`).all()).results || []).map(r => r.name);
    let rows = Array.isArray(rowsIn) ? rowsIn : [];
    const isItems = t === 'items';
    if (isItems) rows = rows.filter(r => r.id !== LOG && r.kind !== 'errlog' && r.kind !== 'sessmeta' && !(r.id === ENC && keepEnc));
    const use = cols.filter(c => rows.length ? rows.some(r => c in r) : true), ph = use.map(() => '?').join(',');
    const ins = r => db.prepare(`INSERT OR REPLACE INTO "${t}"(${use.map(c => '"' + c + '"').join(',')}) VALUES(${ph})`).bind(...use.map(c => (r[c] === undefined ? null : r[c])));
    const wipe = isItems ? db.prepare(`DELETE FROM items WHERE id<>? AND kind NOT IN ('errlog','sessmeta')${keepEnc ? ' AND id<>?' : ''}`).bind(...(keepEnc ? [LOG, ENC] : [LOG])) : db.prepare(`DELETE FROM "${t}"`);
    const CH = 400;
    for (let i = 0; i === 0 || i < rows.length; i += CH) await db.batch([...(i === 0 ? [wipe] : []), ...rows.slice(i, i + CH).map(ins)]);
    out.tables++; out.rows += rows.length;
  }
  dropEncCache();
  const log = await readLog(db); log.restored = {at: Date.now(), from: key, by, snapshot: snapshot.key, rows: out.rows}; await writeLog(db, log);
  return {...out, snapshot};
}

export function ensureBackups(env) {
  if (!env?.DB || !env?.BUCKET) return;
  const T = currentTenant(); (globalThis.__bmBkEnvs ??= new Map()).set(T.id, {t: T, env});
  if (globalThis.__bmBk) return;
  const tick = async () => {
    if (globalThis.__bmBkRun) return;
    globalThis.__bmBkRun = true;
    try {
      for (const {t, env: e} of [...globalThis.__bmBkEnvs.values()]) {
        await runWithTenant(t, async () => {
          try { const log = await readLog(e.DB); if (!log.last || Date.now() - log.last > DAY) await runBackup(e.DB, e.BUCKET); }
          catch (err) { console.error('[backup]', err.message); try { const log = await readLog(e.DB); log.error = String(err.message).slice(0, 300); log.errorAt = Date.now(); await writeLog(e.DB, log); } catch {} }
        });
      }
    } finally { globalThis.__bmBkRun = false; }
  };
  globalThis.__bmBk = setInterval(tick, 3600e3); if (globalThis.__bmBk.unref) globalThis.__bmBk.unref();
  setTimeout(tick, 60e3);
}

// /api/auth/health — dış izleme (UptimeRobot vb.) için: veritabanına ulaşılabiliyor mu?
export async function health(db) {
  const t0 = Date.now(); let ok = true;
  try { await db.prepare('SELECT 1 AS ok').first(); } catch { ok = false; }
  return Response.json({ok, db: ok ? 'ok' : 'down', ms: Date.now() - t0, uptime: Math.round(process.uptime()), time: new Date().toISOString()}, {status: ok ? 200 : 503, headers: {'Cache-Control': 'no-store'}});
}

export async function backupAdmin(req, env, route, ctx = {}) {
  const db = env.DB, bucket = env.BUCKET;
  if (route === 'backups' && req.method === 'GET') {
    const log = await readLog(db);
    return json({backups: log.list || [], last: log.last || null, error: log.error || null, errorAt: log.errorAt || null, keep: KEEP, restored: log.restored || null});
  }
  if (route === 'backups/run' && req.method === 'POST') {
    if (globalThis.__bmBkRun) return json({error: 'Bir yedekleme zaten çalışıyor.'}, 409);
    globalThis.__bmBkRun = true;
    try { const b = await runBackup(db, bucket, 'yönetici'); return json({ok: true, backup: b}); } finally { globalThis.__bmBkRun = false; }
  }
  if (route === 'backups/download' && req.method === 'GET') {
    const key = new URL(req.url).searchParams.get('key') || '';
    const log = await readLog(db);
    if (!(log.list || []).some(b => b.key === key)) return json({error: 'Yedek bulunamadı.'}, 404);
    const o = await bucket.get(key); if (!o) return json({error: 'Yedek dosyası bulunamadı.'}, 404);
    try { await markBackupDownloaded(db, key, (log.list || []).find(b => b.key === key)?.at); } catch {}
    return new Response(o.body, {headers: {'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${key.split('/').pop()}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
  }
  if (route === 'backups/restore' && req.method === 'POST') {
    let b; try { b = await req.json(); } catch { b = {}; }
    const key = String(b.key || ''), log = await readLog(db);
    if (!(log.list || []).some(x => x.key === key)) return json({error: 'Yedek bulunamadı.'}, 404);
    if (String(b.confirm || '').trim().toLocaleUpperCase('tr-TR') !== 'GERİ YÜKLE') return json({error: 'Onay için “GERİ YÜKLE” yazın.'}, 400);
    if (globalThis.__bmBkRun) return json({error: 'Bir yedekleme zaten çalışıyor.'}, 409);
    globalThis.__bmBkRun = true;
    try {
      const r = await restoreBackup(db, bucket, key);
      try { if (ctx.audit) await ctx.audit(db, ctx.actor, 'backup.restore', key).run(); } catch {}
      return json({ok: true, ...r});
    } catch (e) { return json({error: e.message || 'Geri yükleme tamamlanamadı.'}, e.status || 500); }
    finally { globalThis.__bmBkRun = false; }
  }
  return null;
}
