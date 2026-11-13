// D1-compatible adapter over libSQL (Turso in production, a local file in development).
// The existing server modules call db.prepare(sql).bind(...).first()/all()/run() and db.batch([...]),
// so this adapter keeps that exact surface.
import {createClient} from '@libsql/client';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {MIGRATIONS} from './migrations.mjs';
import {seedDemo, migrateOwner} from './seed.mjs';
import {seedBlog, migrateMenuV2, migrateMenuV3, migrateMenuV4, migrateMenuV5} from './blog-seed.mjs';
import {cleanPost} from './blog.mjs';
import {seedBlog2} from './blog-seed-2.mjs';
import {seedBlog3, migrateBlogSeo} from './blog-seed-3.mjs';
import {loadConfig} from './config.mjs';

const toObject = (rs, row) => {
  if (!row) return null;
  const o = {};
  rs.columns.forEach((c, i) => { const v = row[i]; o[c] = typeof v === 'bigint' ? Number(v) : v; });
  return o;
};
const norm = v => v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v;

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.args = []; }
  bind(...a) { const s = new Statement(this.db, this.sql); s.args = a.map(norm); return s; }
  async first(col) { await this.db.ready(); const rs = await this.db.client.execute({sql: this.sql, args: this.args}); const o = toObject(rs, rs.rows[0]); return col ? (o ? o[col] : null) : o; }
  async all() { await this.db.ready(); const rs = await this.db.client.execute({sql: this.sql, args: this.args}); return {results: rs.rows.map(r => toObject(rs, r)), success: true}; }
  async run() { await this.db.ready(); const rs = await this.db.client.execute({sql: this.sql, args: this.args}); return {success: true, meta: {changes: rs.rowsAffected, last_row_id: rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : null}}; }
}

class Database {
  constructor(client, remote) { this.client = client; this.remote = remote || null; this.mode = remote ? 'replica' : 'direct'; this._ready = null; }
  // Embedded replica: a local copy of the Turso database that reads come from (no network round trip);
  // writes still go to Turso and the copy re-syncs every TURSO_SYNC_SECONDS. If the first sync fails, Turso is used directly.
  async connect() {
    if (!this.remote) return;
    try { await Promise.race([this.client.sync(), new Promise((_, no) => setTimeout(() => no(new Error('sync timeout')), 20000))]); }
    catch (e) { console.error('[db] replica sync failed, using Turso directly:', e.message); try { this.client.close(); } catch {} this.client = this.remote(); this.remote = null; this.mode = 'direct (replica failed)'; }
  }
  prepare(sql) { return new Statement(this, sql); }
  async batch(stmts) {
    await this.ready();
    if (!stmts.length) return [];
    const rs = await this.client.batch(stmts.map(s => ({sql: s.sql, args: s.args})), 'write');
    return rs.map(r => ({success: true, meta: {changes: r.rowsAffected}, results: r.rows.map(row => toObject(r, row))}));
  }
  async exec(sql) { await this.ready(); return this.client.executeMultiple(sql); }
  ready() { return this._ready ??= this.connect().then(() => migrate(this.client)).then(() => migrateOwner(this.client)).then(() => seedBlog(this.client, cleanPost)).then(() => seedBlog2(this.client, cleanPost)).then(() => seedBlog3(this.client, cleanPost)).then(() => migrateBlogSeo(this.client)).then(() => migrateMenuV2(this.client)).then(() => migrateMenuV3(this.client)).then(() => migrateMenuV4(this.client)).then(() => migrateMenuV5(this.client)).then(() => loadConfig(this.client)).then(() => seedDemo(this.client)).catch(e => { this._ready = null; throw e; }); }
}

async function migrate(client) {
  await client.execute('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied INTEGER NOT NULL)');
  const done = new Set((await client.execute('SELECT name FROM _migrations')).rows.map(r => r[0]));
  for (const [name, sql] of MIGRATIONS) {
    if (done.has(name)) continue;
    const parts = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
    await client.batch([...parts.map(s => ({sql: s, args: []})), {sql: 'INSERT OR IGNORE INTO _migrations VALUES (?, ?)', args: [name, Date.now()]}], 'write');
  }
}

let shared;
// Vercel's Turso integration names variables after the chosen prefix (TURSO_DATABASE_URL, STORAGE_URL, …),
// so look for the libsql:// URL under any name and the matching *_AUTH_TOKEN.
export function findTurso(env) {
  const named = ['TURSO_DATABASE_URL', 'LIBSQL_URL', 'DATABASE_URL'].find(k => env[k]);
  let key = named || Object.keys(env).find(k => /^(libsql|https?):\/\/.+turso\.io/.test(String(env[k])) || String(env[k]).startsWith('libsql://'));
  if (!key) return {};
  const base = key.replace(/(_DATABASE)?_URL$/, '');
  const tokenKey = [base + '_AUTH_TOKEN', base + '_DATABASE_AUTH_TOKEN', base + '_TOKEN', 'TURSO_AUTH_TOKEN', 'LIBSQL_AUTH_TOKEN'].find(k => env[k]) || Object.keys(env).find(k => k.endsWith('AUTH_TOKEN') && k.startsWith(base));
  return {url: env[key], authToken: tokenKey ? env[tokenKey] : undefined};
}
export function getDatabase() {
  if (shared) return shared;
  const {url, authToken} = findTurso(process.env);
  let client, remote = null;
  const replica = url && /^(1|on|true|yes)$/i.test(process.env.TURSO_REPLICA || '') && !process.env.VERCEL;
  if (replica) {
    try {
      const file = process.env.TURSO_REPLICA_FILE || '.data/replica.db';
      mkdirSync(dirname(file), {recursive: true});
      client = createClient({url: 'file:' + file, syncUrl: url, authToken, syncInterval: Math.max(5, Number(process.env.TURSO_SYNC_SECONDS) || 15)});
      remote = () => createClient({url, authToken});
    } catch (e) { console.error('[db] replica unavailable, using Turso directly:', e.message); client = createClient({url, authToken}); remote = null; }
  } else if (url) client = createClient({url, authToken});
  else {
    if (process.env.VERCEL) throw Object.assign(new Error('TURSO_DATABASE_URL tanımlı değil.'), {status: 503});
    const file = process.env.LOCAL_DB_FILE || '.data/local.db';
    mkdirSync(dirname(file), {recursive: true});
    client = createClient({url: 'file:' + file});
  }
  shared = new Database(client, remote);
  return shared;
}
export function createMemoryDatabase() { return new Database(createClient({url: ':memory:'})); }
