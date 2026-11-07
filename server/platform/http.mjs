import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
// Glue between Next.js route handlers and the existing (Cloudflare-style) server modules.
import {getDatabase} from './db.mjs';
import {refreshConfig} from './config.mjs';
import {renderPage, readStatic, sitemapXML} from './site.mjs';
import {getBucket} from './storage.mjs';
import {withIdentity, isAdminRequest, onAdminHost, adminHosts} from './auth.mjs';
import {handleAuth, handlePlatform, handlePlatformAdmin, partnerGate, maybeVerifyCustomerUpload, iyzicoCallback} from './api.mjs';

export function getEnv() {
  return {...process.env, DB: getDatabase(), BUCKET: getBucket()};
}

const errorResponse = e => {
  if (!e.status) console.error('[api]', e);
  return Response.json({error: e.status ? e.message : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.', ...(e.extra || {})}, {status: e.status || 500, headers: {'Cache-Control': 'no-store'}});
};
const notFound = () => Response.json({error: 'Bulunamadı.'}, {status: 404});

// area: workspace | advisor | kyc | lawyer | admin | visitors | referral
export function legacy(area, handler, opts = {}) {
  return async (req, ctx) => {
    try {
      const adminArea = area === 'admin';
      if (adminHosts().length) {
        if (adminArea && !onAdminHost(req)) return notFound();
        if (!adminArea && onAdminHost(req) && !opts.adminHostToo) return notFound();
      }
      await getDatabase().ready(); await refreshConfig(getDatabase().client, 30000); const env = getEnv();
      const {req: r, user} = await withIdentity(env.DB, req);
      const route = new URL(req.url).pathname.replace(new RegExp('^/api/' + area + '/?'), '').replace(/\/$/, '');
      if (['workspace', 'advisor', 'kyc'].includes(area)) await partnerGate(env.DB, r, user, area, route);
      const params = ctx?.params ? await ctx.params : {};
      const res = await handler(r, env, params);
      if (area === 'workspace' && route === 'upload' && res.ok && opts.after) {
        const copy = res.clone();
        opts.after(async () => { try { const d = await copy.json(); if (d.id) await maybeVerifyCustomerUpload(env, d.id); } catch (e) { console.error('[verify-after]', e.message); } });
      }
      return res;
    } catch (e) { return errorResponse(e); }
  };
}

export function platform(kind, after) {
  return async (req, ctx) => {
    try {
      await getDatabase().ready(); await refreshConfig(getDatabase().client, 30000); const env = getEnv();
      const params = ctx?.params ? await ctx.params : {};
      const route = (params.path || []).join('/');
      if (kind === 'auth') return await handleAuth(req, env, route);
      if (kind === 'admin') {
        if (adminHosts().length && !onAdminHost(req)) return notFound();
        return await handlePlatformAdmin(req, env, route, {after});
      }
      if (adminHosts().length && onAdminHost(req)) return notFound();
      const {req: r, user} = await withIdentity(env.DB, req);
      return await handlePlatform(r, env, route, {after, user});
    } catch (e) { return errorResponse(e); }
  };
}
export {isAdminRequest};
const LANGSW_PREVIEW_CSS = '<style>.bm-langsw{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:7px 11px;border:1px dashed #8a6d1a;border-radius:6px;font-size:13px;font-weight:600;color:var(--ink,#183b2c);text-decoration:none}.bm-langsw img{border-radius:2px}@media(max-width:760px){.bm-langsw{min-height:36px;padding:6px 9px}.bm-langsw span{display:none}}</style>';
// HTML yanıtlarını sıkıştır (Next, route handler yanıtlarını sıkıştırmıyor): brotli > gzip. Küçük önbellek: aynı sayfa tekrar sıkıştırılmaz.
const zc = new Map();
function htmlOut(req, html, init) {
  const headers = {...(init.headers || {}), 'Vary': 'Accept-Encoding'};
  if (req.method === 'HEAD' || html == null) return new Response(null, {...init, headers});
  const ae = req.headers.get('accept-encoding') || '', enc = /\bbr\b/.test(ae) ? 'br' : /\bgzip\b/.test(ae) ? 'gzip' : '';
  if (!enc || html.length < 1024) return new Response(html, {...init, headers});
  const key = enc + ':' + createHash('sha1').update(html).digest('base64');
  let buf = zc.get(key);
  if (!buf) {
    const b = Buffer.from(html);
    buf = enc === 'br' ? zlib.brotliCompressSync(b, {params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 5, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: b.length}}) : zlib.gzipSync(b, {level: 6});
    if (zc.size > 300) zc.clear(); zc.set(key, buf);
  }
  return new Response(buf, {...init, headers: {...headers, 'Content-Encoding': enc}});
}
const readCookieRaw = (req, name) => { const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : ''; };

// Public site pages (rewritten here by proxy.ts), uploaded site media, sitemap and robots.
export function site() {
  return async (req, ctx) => {
    const params = ctx?.params ? await ctx.params : {};
    const route = (params.path || []).join('/');
    const url = new URL(req.url);
    const htmlHeaders = {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate'};
    try {
      await getDatabase().ready(); await refreshConfig(getDatabase().client, 30000);
      const db = getDatabase();
      if (route === 'page') {
        const path = req.headers.get('x-bm-path') || url.searchParams.get('p') || '/';
        if (/^\/en(\/|$)/.test(path)) {
          // İngilizce: yayında değilse yalnız yönetici önizleme anahtarıyla; aksi halde 404 (Google'a hiç görünmez)
          const {siteState, enPublished, renderEn} = await import('./site.mjs');
          const st = await siteState(db), key = st.i18n?.previewKey;
          const pub = enPublished(st), prev = !pub && key && readCookieRaw(req, 'bm_lang_prev') === key;
          const r = (pub || prev) ? await renderEn(db, path === '/en' ? '/en/' : path, {draft: prev}) : null;
          if (!r) { const nf = await renderPage(db, '/__yok__/'); return htmlOut(req, nf.html, {status: 404, headers: {...htmlHeaders, 'X-Robots-Tag': 'noindex'}}); }
          return htmlOut(req, r.html, {status: 200, headers: prev ? {...htmlHeaders, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow'} : htmlHeaders});
        }
        const r = await renderPage(db, path);
        // Taslak önizleme açık yönetici: Türkçe sayfada da "English" düğmesi (yalnız bu yanıtta, önbelleğe girmez)
        if (r.status === 200 && (req.headers.get('cookie') || '').includes('bm_lang_prev=')) {
          const {siteState, enPublished, langMenuHTML, LANG_CSS} = await import('./site.mjs');
          const st = await siteState(db), key = st.i18n?.previewKey;
          if (!enPublished(st) && key && readCookieRaw(req, 'bm_lang_prev') === key) {
            const sw = langMenuHTML('tr', path, st, {preview: true});
            if (sw) return htmlOut(req, r.html.replace('<button type="button" class="theme-toggle"', sw + '<button type="button" class="theme-toggle"').replace('</head>', LANG_CSS + '</head>'), {status: 200, headers: {...htmlHeaders, 'Cache-Control': 'private, no-store'}});
          }
        }
        return htmlOut(req, r.html, {status: r.status, headers: htmlHeaders});
      }
      if (route === 'i18n/en.js') {
        const {siteState, enPublished} = await import('./site.mjs'); const {dict} = await import('./i18n.mjs');
        const st = await siteState(db), key = st.i18n?.previewKey;
        if (!enPublished(st) && !(key && readCookieRaw(req, 'bm_lang_prev') === key)) return new Response('', {status: 404});
        const d = dict('en'), rt = new Set(d.raw.rt || []), t = {}; for (const k of rt) { const v = d.t.get(k); if (v != null) t[k] = v; }
        const {readFile} = await import('node:fs/promises'); const {join} = await import('node:path');
        const code = await readFile(join(process.cwd(), 'server', 'platform', 'i18n', 'runtime.js'), 'utf8');
        return htmlOut(req, 'window.BM_I18N=' + JSON.stringify({lang: 'en', t, slugs: d.raw.slugs}).replace(/</g, '\\u003c') + ';\n' + code, {headers: {'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': enPublished(st) ? 'public, max-age=3600' : 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
      }
      if (route.startsWith('media/')) {
        const id = route.slice(6); if (!/^[a-f0-9-]{8,40}\.(png|jpe?g|webp|gif|svg)$/i.test(id)) return new Response('Not found', {status: 404});
        const obj = await getBucket().get('site-media/' + id); if (!obj) return new Response('Not found', {status: 404});
        const ext = id.split('.').pop().toLowerCase();
        const type = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml'}[ext];
        return new Response(obj.body, {headers: {'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', ...(ext === 'svg' ? {'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"} : {})}});
      }
      if (route === 'sitemap') return new Response(await sitemapXML(db), {headers: {'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600'}});
      if (route === 'robots') { const su = (process.env.SITE_URL || '').replace(/\/$/, ''); const base = !su || /chatgpt\.site/.test(su) ? 'https://brazilmigration.com' : su; const {siteState, robotsTXT} = await import('./site.mjs'); let g = {}; try { g = (await siteState(db)).seo || {}; } catch {} return new Response(robotsTXT(base, g), {headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600'}}); }
      return new Response('Not found', {status: 404});
    } catch (e) {
      console.error('[site]', e);
      if (route === 'page' && /^\/en(\/|$)/.test(req.headers.get('x-bm-path') || '')) return new Response('Not found', {status: 404});
      if (route === 'page') { const html = await readStatic(req.headers.get('x-bm-path') || url.searchParams.get('p') || '/'); if (html) return new Response(html, {headers: htmlHeaders}); }
      return new Response('Hata', {status: 500});
    }
  };
}

// /api/pay/iyzico/callback — iyzico'nun ödeme sonrası yönlendirmesi.
export function pay() {
  return async (req, ctx) => {
    const params = ctx?.params ? await ctx.params : {};
    const route = (params.path || []).join('/');
    const back = (ok, msg) => new Response(null, {status: 303, headers: {Location: '/panel/?odeme=' + (ok ? 'basarili' : 'hata') + (msg ? '&mesaj=' + encodeURIComponent(String(msg).slice(0, 160)) : '') + '#finance', 'Cache-Control': 'no-store'}});
    if (route !== 'iyzico/callback') return new Response('Not found', {status: 404});
    try {
      await getDatabase().ready(); await refreshConfig(getDatabase().client, 30000);
      let token = '';
      if (req.method === 'POST') { const ct = req.headers.get('content-type') || ''; if (/json/.test(ct)) token = (await req.json().catch(() => ({}))).token; else token = (await req.formData().catch(() => null))?.get('token'); }
      else token = new URL(req.url).searchParams.get('token');
      const r = await iyzicoCallback(getEnv(), String(token || ''));
      return back(r.ok, r.ok ? '' : r.reason);
    } catch (e) { console.error('[iyzico]', e); return back(false, 'Ödeme doğrulanamadı.'); }
  };
}
