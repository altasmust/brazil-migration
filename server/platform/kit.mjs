// Faz 4–5 modülleri için ortak küçük yardımcılar (items tablosu, JSON yanıtı, gövde okuma).
import {fail, now, uuid} from './auth.mjs';

export const json = (data, status = 200, headers = {}) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...headers}});
export const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
export const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
export const first = (db, sql, ...a) => db.prepare(sql).bind(...a).first();
export const stmt = (db, id, kind, owner, data) => db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').bind(id, kind, owner, JSON.stringify(data), now(), now());
export const put = (db, id, kind, owner, data) => stmt(db, id, kind, owner, data).run();
export const del = (db, id) => db.prepare('DELETE FROM items WHERE id=?').bind(id).run();
export const get = async (db, id, kind) => { const r = await first(db, 'SELECT * FROM items WHERE id=?', id); return r && (!kind || r.kind === kind) ? {...r, d: parse(r.data)} : null; };
export const readBody = async (req, max = 300000) => { const t = await req.text(); if (t.length > max) fail(413, 'İstek çok büyük.'); try { return JSON.parse(t || '{}') || {}; } catch { fail(400, 'Geçersiz istek.'); } };
export const notice = (db, owner, title, link) => put(db, uuid(), 'notice', owner, {title, link, read: false});
export const DAY = 864e5;
export const dayStr = ms => new Date(ms).toISOString().slice(0, 10);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
// CSV (Excel uyumlu: UTF-8 BOM, formül enjeksiyonuna karşı = + - @ ile başlayan hücreler önlenir)
export const csvCell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",;\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const csv = (head, rows) => '﻿' + [head, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n');
export const csvResponse = (name, head, rows) => new Response(csv(head, rows), {headers: {'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});

// Bellekte basit hız sınırı (sunucu örneği başına). true dönerse sınır aşıldı.
const rl = (globalThis.__bmKitRl ??= new Map());
export function rateLimited(key, max, windowMs) {
  const t = now(), e = rl.get(key);
  if (!e || t - e.t > windowMs) { rl.set(key, {t, n: 1}); if (rl.size > 5000) for (const [k, v] of rl) if (t - v.t > windowMs) rl.delete(k); return false; }
  e.n++; return e.n > max;
}
