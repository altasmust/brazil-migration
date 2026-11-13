// Güvence: günlük veritabanı yedeği (BUCKET → backups/, son 14 kopya), sağlık kontrolü.
import {gzipSync} from 'node:zlib';
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

export function ensureBackups(env) {
  if (!env?.DB || !env?.BUCKET) return;
  globalThis.__bmBkEnv = env;
  if (globalThis.__bmBk) return;
  const tick = async () => {
    const e = globalThis.__bmBkEnv; if (!e || globalThis.__bmBkRun) return;
    globalThis.__bmBkRun = true;
    try { const log = await readLog(e.DB); if (!log.last || Date.now() - log.last > DAY) await runBackup(e.DB, e.BUCKET); }
    catch (err) { console.error('[backup]', err.message); try { const log = await readLog(e.DB); log.error = String(err.message).slice(0, 300); log.errorAt = Date.now(); await writeLog(e.DB, log); } catch {} }
    finally { globalThis.__bmBkRun = false; }
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

export async function backupAdmin(req, env, route) {
  const db = env.DB, bucket = env.BUCKET;
  if (route === 'backups' && req.method === 'GET') {
    const log = await readLog(db);
    return json({backups: log.list || [], last: log.last || null, error: log.error || null, errorAt: log.errorAt || null, keep: KEEP});
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
  return null;
}
