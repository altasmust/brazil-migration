// Firma vitrini: ana firmanın (Brazil Migration) sayfaları yerine, her firmaya kendi markasıyla üretilen sade ana sayfa.
import {readStatic} from './site.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const color = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#1b5e20';
const TX = {
  tr: {login: 'Müşteri girişi', admin: 'Firma paneli', start: 'Danışmanlık ve göç işlemleri için dosyanızı çevrim içi takip edin.', cta: 'Giriş yap'},
  en: {login: 'Client login', admin: 'Firm panel', start: 'Track your immigration case and documents online.', cta: 'Sign in'},
  pt: {login: 'Acesso do cliente', admin: 'Painel da empresa', start: 'Acompanhe seu processo e seus documentos on-line.', cta: 'Entrar'},
  fa: {login: 'ورود مشتری', admin: 'پنل شرکت', start: 'پرونده و مدارک خود را آنلاین پیگیری کنید.', cta: 'ورود'},
  th: {login: 'เข้าสู่ระบบลูกค้า', admin: 'แผงควบคุมบริษัท', start: 'ติดตามเรื่องและเอกสารของคุณออนไลน์', cta: 'เข้าสู่ระบบ'},
};

export function landingHTML(t0, company = {}) {
  const t = {...t0, name: company.brand || t0.name, brand: {...t0.brand, color: company.brandColor || t0.brand?.color, tagline: company.tagline || t0.brand?.tagline, logo: company.logoUrl || t0.brand?.logo}};
  const tx = TX[t.lang] || TX.tr, c = color(t.brand?.color), tag = t.brand?.tagline || tx.start, rtl = t.lang === 'fa';
  return `<!doctype html><html lang="${esc(t.lang)}" dir="${rtl ? 'rtl' : 'ltr'}" translate="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.name)}</title><meta name="description" content="${esc(tag)}"><meta name="theme-color" content="${c}"><meta property="og:title" content="${esc(t.name)}"><meta property="og:description" content="${esc(tag)}">
<style>:root{--c:${c}}*{box-sizing:border-box}body{margin:0;font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c2b22;background:#f6f7f2;min-height:100vh;display:flex;flex-direction:column}
header{background:var(--c);color:#fff;padding:18px 5%;display:flex;align-items:center;gap:14px}header img{height:40px;width:auto;border-radius:6px;background:#fff;padding:3px}header b{font-size:19px}
main{flex:1;display:grid;place-items:center;padding:48px 5%;text-align:center}h1{font-size:clamp(28px,5vw,44px);margin:0 0 12px;color:var(--c)}p{max-width:560px;margin:0 auto 28px;color:#4a5a50}
.btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}a.b{display:inline-block;padding:13px 26px;border-radius:9px;text-decoration:none;font-weight:600;border:2px solid var(--c);color:var(--c)}a.b.p{background:var(--c);color:#fff}
footer{padding:18px 5%;font-size:13px;color:#6a7a70;text-align:center}</style></head><body>
<header>${t.brand?.logo ? `<img src="${esc(t.brand.logo)}" alt="${esc(t.name)}">` : ''}<b>${esc(t.name)}</b></header>
<main><div><h1>${esc(t.name)}</h1><p>${esc(tag)}</p><div class="btns"><a class="b p" href="/giris/">${esc(tx.cta)}</a><a class="b" href="/admin/">${esc(tx.admin)}</a></div></div></main>
<footer>© ${new Date().getFullYear()} ${esc(t.name)}</footer></body></html>`;
}

// Dönüş: {status, html} | null
export async function tenantPage(t, path, db) {
  if (path === '/') { const row = await db.prepare("SELECT data FROM items WHERE id='config-company'").first(); let c = {}; try { c = JSON.parse(row?.data || '{}'); } catch {} return {status: 200, html: landingHTML(t, c)}; }
  if (path === '/giris/') { const html = await readStatic('/giris/'); return html ? {status: 200, html} : null; }
  return null;
}
export const tenantRobots = t => `User-agent: *\nAllow: /$\nDisallow: /admin/\nDisallow: /panel/\nDisallow: /partner/\nDisallow: /avukat/\nDisallow: /kyc/\nDisallow: /api/\n${t.baseUrl ? 'Sitemap: ' + t.baseUrl + '/sitemap.xml\n' : ''}`;
export const tenantSitemap = t => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(t.baseUrl || '')}/</loc></url></urlset>`;
