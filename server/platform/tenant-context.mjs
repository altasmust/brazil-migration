// Çok firmalı (multi-tenant) bağlam: her istek, çözümlenen firmanın (tenant) içinde çalışır.
// Ana firma (Brazil Migration) = MAIN: davranış eskisiyle birebir aynıdır (process.env + ana veritabanı).
// Diğer firmalar: kendi ayrı veritabanı, kendi yapılandırma katmanı (cfg) ve kendi dosya öneki.
// Next geliştirme modunda modüller route başına ayrı yüklenebildiği için tekil nesneler globalThis'te tutulur.
import {AsyncLocalStorage} from 'node:async_hooks';

const G = globalThis;
const als = (G.__bmTenantAls ??= new AsyncLocalStorage());
export const MAIN = (G.__bmTenantMain ??= {id: 'main', slug: 'main', name: '', isDefault: true, cfg: new Map(), plan: 'enterprise', status: 'active', brand: {}});

export const currentTenant = () => als.getStore() || MAIN;
export const runWithTenant = (t, fn) => als.run(t, fn);
export const tenantId = () => currentTenant().id;

// Firma kendi değerini tanımlamamışsa platformdan devralabileceği anahtarlar (gönderici posta altyapısı gibi).
// SMTP_* bir bütündür: firma kendi SMTP_HOST'unu girdiyse hepsi yalnız firmadan okunur (platform parolası asla başka sunucuya gitmez).
const SMTP_GROUP = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS'];
const PLATFORM_SHARED = new Set(['NODE_ENV', 'VERCEL', 'DEMO_SEED', 'EMAIL_TEST_MODE', 'RESEND_API_KEY', 'EMAIL_FROM', 'EMAIL_REPLY_TO', 'MAX_UPLOAD_MB', 'IYZICO_BASE_URL', 'ASAAS_BASE_URL', 'WAF_ENABLED', 'WAF_TRUSTED_IPS', 'PLATFORM_DOMAIN', ...SMTP_GROUP]);

export function cfgEnv(key) {
  const t = currentTenant();
  if (t.isDefault) return process.env[key];
  if (SMTP_GROUP.includes(key)) return t.cfg.has('SMTP_HOST') ? t.cfg.get(key) : process.env[key];
  if (t.cfg.has(key)) return t.cfg.get(key);
  if (key === 'SITE_URL') return t.baseUrl || undefined;
  return PLATFORM_SHARED.has(key) ? process.env[key] : undefined;
}

// Handler'lara verilen env nesnesi: ana firmada eskisi gibi tüm process.env; diğerlerinde yalnız güvenli ortak anahtarlar + firma yapılandırması.
export function scopedEnv(extra = {}) {
  const t = currentTenant();
  if (t.isDefault) return {...process.env, ...extra};
  const out = {};
  for (const k of PLATFORM_SHARED) if (process.env[k] !== undefined) out[k] = process.env[k];
  if (t.cfg.has('SMTP_HOST')) for (const k of SMTP_GROUP) { if (t.cfg.has(k)) out[k] = t.cfg.get(k); else delete out[k]; }
  for (const [k, v] of t.cfg) out[k] = v;
  if (t.baseUrl) out.SITE_URL = t.baseUrl;
  return {...out, ...extra};
}

// Yazma: ana firmada process.env (eski davranış), diğer firmalarda yalnız o firmanın katmanı.
// target verilirse (veritabanı hazırlanırken, istek bağlamı dışında) doğrudan o hedefe yazar.
export function cfgSet(key, value, target) {
  if (target === 'main') { process.env[key] = String(value); return; }
  if (target) { target.set(key, String(value)); return; }
  const t = currentTenant();
  if (t.isDefault) process.env[key] = String(value); else t.cfg.set(key, String(value));
}
export function cfgDel(key, target) {
  if (target === 'main') { delete process.env[key]; return; }
  if (target) { target.delete(key); return; }
  const t = currentTenant();
  if (t.isDefault) delete process.env[key]; else t.cfg.delete(key);
}
