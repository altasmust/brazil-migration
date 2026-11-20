// R2-compatible adapter: env.BUCKET.put(key, data, opts) / get(key) -> {body} / delete(key)
// Production: private Vercel Blob store. Development: files under .data/blobs.
import {mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {dirname, join, normalize} from 'node:path';
import {currentTenant} from './tenant-context.mjs';
import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';

const useBlob = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || process.env.VERCEL);

function safeKey(key) {
  const k = normalize(String(key)).replace(/^([/\\])+/, '');
  if (!k || k.includes('..')) throw Object.assign(new Error('Geçersiz dosya anahtarı.'), {status: 400});
  return k;
}

const blobBucket = {
  async put(key, data, opts = {}) {
    const {put} = await import('@vercel/blob');
    const body = data instanceof ArrayBuffer ? Buffer.from(data) : data instanceof Uint8Array ? Buffer.from(data) : data;
    await put(safeKey(key), body, {access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: opts.httpMetadata?.contentType});
  },
  async get(key) {
    const {get} = await import('@vercel/blob');
    try {
      const r = await get(safeKey(key), {access: 'private'});
      if (!r || r.statusCode !== 200) return null;
      return {body: r.stream, httpMetadata: {contentType: r.blob.contentType}, async arrayBuffer() { return new Response(r.stream).arrayBuffer(); }};
    } catch (e) { if (/not.?found/i.test(e?.message || '') || e?.name === 'BlobNotFoundError') return null; throw e; }
  },
  async delete(key) { const {del} = await import('@vercel/blob'); try { await del(safeKey(key)); } catch {} },
};

const root = () => join(/* turbopackIgnore: true */ process.cwd(), process.env.LOCAL_BLOB_DIR || '.data/blobs');
const fileBucket = {
  async put(key, data) { const p = join(/* turbopackIgnore: true */ root(), safeKey(key)); await mkdir(dirname(p), {recursive: true}); await writeFile(p, Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data)); },
  async get(key) { try { const buf = await readFile(join(/* turbopackIgnore: true */ root(), safeKey(key))); return {body: buf, async arrayBuffer() { return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength); }}; } catch { return null; } },
  async delete(key) { await rm(join(/* turbopackIgnore: true */ root(), safeKey(key)), {force: true}); },
};


// ---- Belge şifreleme (isteğe bağlı; firma başına AES-256-GCM) ----
// Biçim: "BMENC1" + iv(12) + tag(16) + şifreli veri. Şifresiz (eski) dosyalar olduğu gibi okunur. `backups/` şifrelenmez (anahtar yedeğin içindedir).
const MAGIC = Buffer.from('BMENC1'), ENC_ID = 'config-docenc';
const keyCache = (globalThis.__bmEncKeys ??= new Map());
const toBuf = async d => (d instanceof ArrayBuffer ? Buffer.from(d) : ArrayBuffer.isView(d) ? Buffer.from(d.buffer, d.byteOffset, d.byteLength) : typeof d?.arrayBuffer === 'function' ? Buffer.from(await d.arrayBuffer()) : Buffer.from(String(d)));
async function encConfig() {
  const t = currentTenant(), c = keyCache.get(t.id); if (c && Date.now() - c.at < 30000) return c;
  let v = {at: Date.now(), enabled: false, key: null};
  try { const {getDatabase} = await import('./db.mjs'); const r = await getDatabase().prepare('SELECT data FROM items WHERE id=?').bind(ENC_ID).first(); const d = r ? JSON.parse(r.data) : {}; v = {at: Date.now(), enabled: !!d.enabled && !!d.key, key: d.key ? Buffer.from(d.key, 'base64') : null}; } catch {}
  keyCache.set(t.id, v); return v;
}
export const dropEncCache = () => keyCache.delete(currentTenant().id);
export const sealBytes = async (key, data) => { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv), ct = Buffer.concat([c.update(await toBuf(data)), c.final()]); return Buffer.concat([MAGIC, iv, c.getAuthTag(), ct]); };
export const isSealed = b => Buffer.isBuffer(b) && b.length > 34 && b.subarray(0, 6).equals(MAGIC);
export const openBytes = (key, b) => { const d = createDecipheriv('aes-256-gcm', key, b.subarray(6, 18)); d.setAuthTag(b.subarray(18, 34)); return Buffer.concat([d.update(b.subarray(34)), d.final()]); };
const skipEnc = k => /^backups\//.test(String(k));
function encrypting(b) {
  return {
    async put(key, data, opts) { if (skipEnc(key)) return b.put(key, data, opts); const c = await encConfig(); return b.put(key, c.enabled ? await sealBytes(c.key, data) : data, opts); },
    async get(key) {
      const o = await b.get(key); if (!o || skipEnc(key)) return o;
      const raw = o.body && !Buffer.isBuffer(o.body) && typeof o.body.getReader === 'function' ? Buffer.from(await new Response(o.body).arrayBuffer()) : Buffer.isBuffer(o.body) ? o.body : Buffer.from(await o.arrayBuffer());
      if (!isSealed(raw)) return {...o, body: raw, async arrayBuffer() { return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength); }};
      const c = await encConfig(); if (!c.key) throw Object.assign(new Error('Belge anahtarı bulunamadı; şifreli dosya okunamadı.'), {status: 500});
      const plain = openBytes(c.key, raw); return {...o, body: plain, async arrayBuffer() { return plain.buffer.slice(plain.byteOffset, plain.byteOffset + plain.byteLength); }};
    },
    delete: k => b.delete(k),
  };
}
export async function encryptionStatus(db) {
  const r = await db.prepare('SELECT data FROM items WHERE id=?').bind(ENC_ID).first(); const d = r ? JSON.parse(r.data) : {};
  const docs = Number((await db.prepare("SELECT COUNT(*) AS n FROM items WHERE kind='document' AND json_extract(data,'$.key') IS NOT NULL").first())?.n || 0), sealed = Number((await db.prepare("SELECT COUNT(*) AS n FROM items WHERE kind='document' AND json_extract(data,'$.enc')=1").first())?.n || 0);
  return {enabled: !!d.enabled, hasKey: !!d.key, since: d.since || null, documents: docs, encrypted: sealed};
}
export async function setDocEncryption(db, on) {
  const r = await db.prepare('SELECT data FROM items WHERE id=?').bind(ENC_ID).first(); const d = r ? JSON.parse(r.data) : {};
  if (on && !d.key) { d.key = randomBytes(32).toString('base64'); d.since = Date.now(); } d.enabled = !!on;
  await db.prepare("INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated").bind(ENC_ID, 'config', 'system', JSON.stringify(d), Date.now(), Date.now()).run(); dropEncCache();
}
// Var olan belgeleri şifreler (parça parça; kalan sayı döner). `bucket` şifreleyen sarmalayıcıdır → put zaten şifreler.
export async function encryptExisting(db, bucket, limit = 50) {
  const c = await encConfig(); if (!c.enabled) throw Object.assign(new Error('Önce belge şifrelemeyi açın.'), {status: 400});
  const rows = (await db.prepare("SELECT id, data FROM items WHERE kind='document' AND json_extract(data,'$.key') IS NOT NULL AND COALESCE(json_extract(data,'$.enc'),0)<>1 LIMIT ?").bind(limit).all()).results || [];
  let done = 0, failed = 0;
  for (const r of rows) {
    const d = JSON.parse(r.data);
    try { const o = await bucket.get(d.key); if (!o) { failed++; d.enc = 1; d.encMissing = 1; } else { await bucket.put(d.key, Buffer.from(await o.arrayBuffer()), {httpMetadata: {contentType: d.mime}}); d.enc = 1; done++; } await db.prepare('UPDATE items SET data=?, updated=? WHERE id=?').bind(JSON.stringify(d), Date.now(), r.id).run(); } catch { failed++; }
  }
  const rest = Number((await db.prepare("SELECT COUNT(*) AS n FROM items WHERE kind='document' AND json_extract(data,'$.key') IS NOT NULL AND COALESCE(json_extract(data,'$.enc'),0)<>1").first())?.n || 0);
  return {done, failed, remaining: rest};
}

// Firma dosyaları ana firmanınkilerden ve birbirlerinden ayrı öneklerde tutulur (t/<firma-id>/...).
const prefixed = (b, p) => ({put: (k, d, o) => b.put(p + safeKey(k), d, o), get: k => b.get(p + safeKey(k)), delete: k => b.delete(p + safeKey(k))});
export function getBucket() {
  const base = useBlob() ? blobBucket : fileBucket, t = currentTenant();
  return encrypting(t.isDefault ? base : prefixed(base, 't/' + t.id + '/'));
}
export function memoryBucket() {
  const m = new Map();
  return {async put(k, b) { m.set(k, b); }, async get(k) { if (!m.has(k)) return null; const b = m.get(k); return {body: b, async arrayBuffer() { return b instanceof ArrayBuffer ? b : new Uint8Array(b).buffer; }}; }, async delete(k) { m.delete(k); }};
}
