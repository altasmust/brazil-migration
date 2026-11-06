// Yönetici → Site Yönetimi → Diller: İngilizce taslak önizleme, yayınla/taslağa al, eksik çeviri raporu.
import {randomBytes} from 'node:crypto';
import {dict, reloadDict} from './i18n.mjs';
import {siteState, renderEn, invalidateSite, enPublished} from './site.mjs';

const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
const json = (data, status = 200, headers = {}) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', ...headers}});
async function getCfg(db) { const r = await db.prepare("SELECT data FROM items WHERE id='config-i18n'").first(); return {en: {published: false}, ...parse(r?.data)}; }
async function setCfg(db, d) { const t = Date.now(); await db.prepare("INSERT INTO items(id,kind,owner,data,created,updated) VALUES('config-i18n','config','system',?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated").bind(JSON.stringify(d), t, t).run(); invalidateSite(); }
const secure = req => !/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(new URL(req.url).host);
const cookie = (req, v, maxAge) => `bm_lang_prev=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure(req) ? '; Secure' : ''}`;

export async function i18nAdmin(req, db, route) {
  if (!route.startsWith('i18n')) return null;
  const cfg = await getCfg(db);
  const d = dict('en');
  if (route === 'i18n' && req.method === 'GET') {
    const has = (req.headers.get('cookie') || '').includes('bm_lang_prev=' + cfg.previewKey);
    return json({en: {published: !!cfg.en?.published, publishedAt: cfg.en?.publishedAt || null, preview: !!(cfg.previewKey && has), pages: [...d.toEn].map(([tr, en]) => ({tr, en})), strings: d.t.size, menu: cfg.menu || {}}});
  }
  if (route === 'i18n/missing') {
    reloadDict();
    const out = [];
    for (const [tr, en] of dict('en').toEn) {
      const miss = new Map();
      try { await renderEn(db, en, {draft: true, missing: miss}); } catch (e) { out.push({tr, en, error: e.message}); continue; }
      out.push({tr, en, missing: [...miss].map(([k, kind]) => ({k, kind}))});
    }
    return json({pages: out, total: out.reduce((a, p) => a + (p.missing?.length || 0), 0)});
  }
  if (req.method !== 'POST') return null;
  const b = await req.json().catch(() => ({}));
  if (route === 'i18n/preview') {
    if (b.on) { if (!cfg.previewKey) { cfg.previewKey = randomBytes(24).toString('base64url'); await setCfg(db, cfg); } return json({ok: true}, 200, {'Set-Cookie': cookie(req, cfg.previewKey, 12 * 3600)}); }
    return json({ok: true}, 200, {'Set-Cookie': cookie(req, '', 0)});
  }
  if (route === 'i18n/menu') {
    const clean = v => String(v || '').replace(/[<>"]/g, '').trim().slice(0, 30);
    cfg.menu = {labels: {tr: clean(b.labels?.tr) || 'Türkçe', en: clean(b.labels?.en) || 'English'}, format: ['code-label', 'label', 'code'].includes(b.format) ? b.format : 'code-label'};
    await setCfg(db, cfg); return json({ok: true, menu: cfg.menu});
  }
  if (route === 'i18n/publish') {
    cfg.en = {...cfg.en, published: !!b.published, publishedAt: b.published ? Date.now() : null};
    if (!b.published) cfg.previewKey = randomBytes(24).toString('base64url'); // taslağa alınınca eski önizleme bağlantıları geçersiz
    await setCfg(db, cfg); return json({ok: true, published: cfg.en.published});
  }
  return null;
}
