// Güncelleme merkezi: kurulu sürüm (build.json) ↔ GitHub'daki son sürüm, değişiklik listesi,
// zorunlu yedek kapısı (yedek indirilmeden güncelleme başlatılamaz) ve dağıtım bağlantısı (webhook) tetikleme.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const REPO = process.env.UPDATE_REPO || 'altasmust/brazil-migration';
const ITEM = 'config-update', GATE_MS = 60 * 60 * 1000, CACHE_MS = 10 * 60 * 1000;
const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };

async function read(db) { const r = await db.prepare('SELECT data FROM items WHERE id=?').bind(ITEM).first(); return parse(r?.data); }
async function write(db, d) { const t = Date.now(); await db.prepare("INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated").bind(ITEM, 'config', 'owner', JSON.stringify(d), t, t).run(); }

export function buildInfo() {
  try { const b = JSON.parse(readFileSync(join(process.cwd(), 'build.json'), 'utf8')); return {rev: String(b.rev || ''), builtAt: b.builtAt || null}; } catch { return {rev: '', builtAt: null}; }
}

// Yedek indirildiğinde çağrılır: güncelleme kapısını açar (60 dk geçerli).
export async function markBackupDownloaded(db, key, backupAt) {
  const d = await read(db); d.gate = {key, backupAt: backupAt || null, at: Date.now()}; await write(db, d);
}

const gh = async path => {
  const r = await fetch('https://api.github.com/repos/' + REPO + path, {headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'brazil-migration-updater'}, signal: AbortSignal.timeout(8000)});
  if (!r.ok) throw new Error(r.status === 403 ? 'GitHub sorgu sınırı doldu, biraz sonra tekrar deneyin.' : 'GitHub’a ulaşılamadı (' + r.status + ').');
  return r.json();
};
const line = c => ({sha: c.sha.slice(0, 7), title: String(c.commit?.message || '').split('\n')[0].slice(0, 220), at: c.commit?.committer?.date || c.commit?.author?.date || null});

export async function checkLatest(force = false) {
  const g = (globalThis.__bmUpd ||= {at: 0, data: null});
  const cur = buildInfo();
  if (!force && g.data && Date.now() - g.at < CACHE_MS && g.data.forRev === cur.rev) return g.data;
  const head = await gh('/commits/main');
  const out = {forRev: cur.rev, latest: line(head), latestSha: head.sha, commits: [], available: false, unknownBase: !cur.rev};
  if (cur.rev && cur.rev !== head.sha) {
    try { const cmp = await gh(`/compare/${cur.rev}...${head.sha}`); out.commits = (cmp.commits || []).map(line).reverse(); out.available = (cmp.ahead_by || out.commits.length) > 0; }
    catch { out.commits = [line(head)]; out.available = true; }
  } else if (!cur.rev) {
    out.commits = (await gh('/commits?sha=main&per_page=8')).map(line); out.available = false;
  }
  g.at = Date.now(); g.data = out; return out;
}

const hookInfo = d => { try { const u = new URL(d.hook); return {set: true, host: u.host}; } catch { return {set: false}; } };

export async function updatesAdmin(req, db, route, {audit, actor, sameOrigin} = {}) {
  if (!route.startsWith('updates')) return null;
  const d = await read(db);
  if (route === 'updates' && req.method === 'GET') {
    const force = new URL(req.url).searchParams.get('force') === '1';
    let latest = null, error = null;
    try { latest = await checkLatest(force); } catch (e) { error = e.message; }
    const gate = d.gate && Date.now() - d.gate.at < GATE_MS ? {ok: true, at: d.gate.at, expiresAt: d.gate.at + GATE_MS, key: d.gate.key} : {ok: false};
    return json({current: buildInfo(), latest, error, gate, hook: hookInfo(d), last: d.last || null, repo: REPO});
  }
  if (route === 'updates/hook' && req.method === 'POST') {
    const b = await req.json().catch(() => ({})); const url = String(b.url || '').trim();
    if (!url) { delete d.hook; await write(db, d); return json({ok: true, hook: {set: false}}); }
    let u; try { u = new URL(url); } catch { fail(400, 'Geçerli bir adres yazın.'); }
    if (u.protocol !== 'https:') fail(400, 'Adres https:// ile başlamalı.');
    d.hook = u.toString(); await write(db, d); await audit?.(db, actor, 'update.hook', u.host).run();
    return json({ok: true, hook: hookInfo(d)});
  }
  if (route === 'updates/apply' && req.method === 'POST') {
    if (!d.gate || Date.now() - d.gate.at >= GATE_MS) fail(409, 'Güncellemeden önce yedeği indirmeniz gerekir. Yedeği indirin ve tekrar deneyin.');
    if (!hookInfo(d).set) fail(400, 'Dağıtım bağlantısı tanımlı değil. Önce aşağıdan Hostinger dağıtım (webhook) adresini kaydedin.');
    let status = 0, result = 'ok';
    try { const r = await fetch(d.hook, {method: 'POST', signal: AbortSignal.timeout(20000), redirect: 'manual'}); status = r.status; if (status >= 400) result = 'hata ' + status; }
    catch (e) { result = 'hata: ' + (e.message || 'bağlantı kurulamadı'); }
    d.last = {at: Date.now(), result, backupKey: d.gate.key, toRev: globalThis.__bmUpd?.data?.latestSha || null};
    if (result === 'ok') delete d.gate;
    await write(db, d); await audit?.(db, actor, 'update.apply', result).run();
    if (result !== 'ok') fail(502, 'Güncelleme tetiklenemedi (' + result + '). Dağıtım adresini kontrol edin.');
    return json({ok: true, last: d.last});
  }
  return null;
}
