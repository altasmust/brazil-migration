// R2-compatible adapter: env.BUCKET.put(key, data, opts) / get(key) -> {body} / delete(key)
// Production: private Vercel Blob store. Development: files under .data/blobs.
import {mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import {dirname, join, normalize} from 'node:path';

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

export function getBucket() { return useBlob() ? blobBucket : fileBucket; }
export function memoryBucket() {
  const m = new Map();
  return {async put(k, b) { m.set(k, b); }, async get(k) { if (!m.has(k)) return null; const b = m.get(k); return {body: b, async arrayBuffer() { return b instanceof ArrayBuffer ? b : new Uint8Array(b).buffer; }}; }, async delete(k) { m.delete(k); }};
}
