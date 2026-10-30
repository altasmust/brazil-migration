// D1-compatible adapter over libSQL (Turso in production, a local file in development).
// The existing server modules call db.prepare(sql).bind(...).first()/all()/run() and db.batch([...]),
// so this adapter keeps that exact surface.
import {createClient} from '@libsql/client';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {MIGRATIONS} from './migrations.mjs';

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
  constructor(client) { this.client = client; this._ready = null; }
  prepare(sql) { return new Statement(this, sql); }
  async batch(stmts) {
    await this.ready();
    if (!stmts.length) return [];
    const rs = await this.client.batch(stmts.map(s => ({sql: s.sql, args: s.args})), 'write');
    return rs.map(r => ({success: true, meta: {changes: r.rowsAffected}, results: r.rows.map(row => toObject(r, row))}));
  }
  async exec(sql) { await this.ready(); return this.client.executeMultiple(sql); }
  ready() { return this._ready ??= migrate(this.client).catch(e => { this._ready = null; throw e; }); }
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
export function getDatabase() {
  if (shared) return shared;
  const url = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
  let client;
  if (url) client = createClient({url, authToken});
  else {
    if (process.env.VERCEL) throw Object.assign(new Error('TURSO_DATABASE_URL tanımlı değil.'), {status: 503});
    const file = process.env.LOCAL_DB_FILE || '.data/local.db';
    mkdirSync(dirname(file), {recursive: true});
    client = createClient({url: 'file:' + file});
  }
  shared = new Database(client);
  return shared;
}
export function createMemoryDatabase() { return new Database(createClient({url: ':memory:'})); }
