// Firma açma (kayıt sihirbazının arka ucu): /api/auth/tenant/*
import {createTenant, validateSlug, RESERVED, SLUG_RE, listTenants} from './tenant.mjs';
import {getMainDatabase} from './db.mjs';
import {runWithTenant, currentTenant} from './tenant-context.mjs';
import {createToken} from './auth.mjs';
import {sendMail} from './mail.mjs';

const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});
const hits = (globalThis.__bmTenantHits ??= new Map());
const limited = ip => { const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 36e5); if (a.length >= 5) return true; a.push(now); hits.set(ip, a); if (hits.size > 2000) hits.clear(); return false; };
const ipOf = req => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';

export async function handleTenantApi(req, env, route) {
  if (!currentTenant().isDefault) return json({error: 'Bulunamadı.'}, 404);   // firma açma yalnız platform adresinde
  const url = new URL(req.url);
  if (route === 'tenant/check' && req.method === 'GET') {
    const slug = String(url.searchParams.get('slug') || '').trim().toLowerCase();
    if (!SLUG_RE.test(slug)) return json({ok: false, reason: 'Adres 3–30 karakter olmalı; harf, rakam ve tire kullanın.'});
    if (RESERVED.has(slug)) return json({ok: false, reason: 'Bu adres ayrılmış.'});
    const row = await getMainDatabase().prepare('SELECT id FROM tenants WHERE slug=?').bind(slug).first();
    return json({ok: !row, reason: row ? 'Bu adres kullanımda.' : ''});
  }
  if (route === 'tenant/create' && req.method === 'POST') {
    if (limited(ipOf(req))) return json({error: 'Çok fazla deneme. Bir saat sonra tekrar deneyin.'}, 429);
    const b = await req.json().catch(() => ({}));
    if (b.website) return json({ok: true});                                   // bot tuzağı (gizli alan)
    validateSlug(b.slug);
    const t = await createTenant({name: b.name, slug: b.slug, ownerEmail: b.email, lang: b.lang, country: b.country});
    const base = t.baseUrl || `${url.protocol}//${t.slug}.localhost${url.port ? ':' + url.port : ''}`;
    let devLink;
    await runWithTenant(t, async () => {
      const u = await t.db.prepare('SELECT id FROM auth_users WHERE email=?').bind(t.ownerEmail).first();
      const token = await createToken(t.db, u.id, 'invite', 72);
      const m = await sendMail({to: t.ownerEmail, subject: `${t.name} — yönetim panelinizi açın`, title: 'Hoş geldiniz!', text: `${t.name} için çalışma alanınız hazır. Aşağıdaki bağlantıdan parolanızı belirleyip yönetim paneline girebilirsiniz. Bağlantı 72 saat geçerlidir.`, link: `${base}/admin/giris/?sifre=${token}`, button: 'Parolamı belirle'});
      devLink = m.devLink;
    });
    return json({ok: true, url: base + '/admin/giris/', devLink});
  }
  if (route === 'tenant/list' && req.method === 'GET') return json({error: 'Bulunamadı.'}, 404);
  return json({error: 'Bulunamadı.'}, 404);
}
