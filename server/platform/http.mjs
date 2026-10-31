// Glue between Next.js route handlers and the existing (Cloudflare-style) server modules.
import {getDatabase} from './db.mjs';
import {getBucket} from './storage.mjs';
import {withIdentity, isAdminRequest, onAdminHost, adminHosts} from './auth.mjs';
import {handleAuth, handlePlatform, handlePlatformAdmin, partnerGate, maybeVerifyCustomerUpload} from './api.mjs';

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
      await getDatabase().ready(); const env = getEnv();
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
      await getDatabase().ready(); const env = getEnv();
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
