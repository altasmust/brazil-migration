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
        const r = await renderPage(db, path);
        return new Response(req.method === 'HEAD' ? null : r.html, {status: r.status, headers: htmlHeaders});
      }
      if (route.startsWith('media/')) {
        const id = route.slice(6); if (!/^[a-f0-9-]{8,40}\.(png|jpe?g|webp|gif|svg)$/i.test(id)) return new Response('Not found', {status: 404});
        const obj = await getBucket().get('site-media/' + id); if (!obj) return new Response('Not found', {status: 404});
        const ext = id.split('.').pop().toLowerCase();
        const type = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml'}[ext];
        return new Response(obj.body, {headers: {'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', ...(ext === 'svg' ? {'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"} : {})}});
      }
      if (route === 'sitemap') return new Response(await sitemapXML(db), {headers: {'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600'}});
      if (route === 'robots') { const base = (process.env.SITE_URL || url.origin).replace(/\/$/, ''); return new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /panel/\nDisallow: /partner/\nDisallow: /avukat/\nDisallow: /kyc/\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`, {headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600'}}); }
      return new Response('Not found', {status: 404});
    } catch (e) {
      console.error('[site]', e);
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
