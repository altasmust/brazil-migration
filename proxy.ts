import {NextResponse, type NextRequest} from 'next/server';
// @ts-ignore - plain JS module
import {inspect} from './server/waf.mjs';

// Host routing: the admin panel lives on its own (sub)domain (ADMIN_HOST),
// everything else (site + customer/advisor/lawyer/staff panels) on the main domain.
// Also maps "/folder/" to "/folder/index.html" for the static pages in /public.
const adminHosts = () => (process.env.ADMIN_HOST || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const PANEL = /^\/(admin|panel|partner|avukat|kyc|gorusme)(\/|$)/;
const SHARED = /^\/(brazil-migration-logo\.png|theme\.js|style\.css|page-visuals\.css|favicon\.ico|robots\.txt|bm\/|images\/|illustrations\/|kyc\/)/;

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  let path = url.pathname;
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase();
  const hosts = adminHosts();
  const onAdmin = hosts.includes(host);
  const block = inspect({method: req.method, pathname: path, search: url.search, headers: req.headers, adminHost: onAdmin});
  if (block) return new NextResponse(block.status === 429 ? 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' : block.status === 404 ? 'Not found' : 'Erişim engellendi.', {status: block.status, headers: {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...(block.retry ? {'retry-after': String(block.retry)} : {})}});
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/r/')) return NextResponse.next();
  const isAdminPath = path === '/admin' || path.startsWith('/admin/');

  if (hosts.length) {
    if (onAdmin) {
      if (path === '/') return NextResponse.redirect(new URL('/admin/', url));
      if (!isAdminPath && !SHARED.test(path)) {
        const main = process.env.SITE_URL;
        return main ? NextResponse.redirect(main.replace(/\/$/, '') + path) : new NextResponse('Not found', {status: 404});
      }
    } else if (isAdminPath) {
      return new NextResponse('Not found', {status: 404});
    }
  }
  if (path === '/sitemap.xml' || path === '/robots.txt') { const r = url.clone(); r.pathname = path === '/sitemap.xml' ? '/api/site/sitemap' : '/api/site/robots'; r.search = ''; return NextResponse.rewrite(r); }
  const last = path.split('/').pop() || '';
  if (!last.includes('.')) {
    if (!path.endsWith('/')) return NextResponse.redirect(new URL(path + '/' + url.search, url), 308);
    const r = url.clone();
    if (PANEL.test(path) || !['GET', 'HEAD'].includes(req.method)) r.pathname = path + 'index.html';
    else { // site pages: rendered with admin edits (menu, texts, SEO, new pages)
      r.pathname = '/api/site/page';
      const h = new Headers(req.headers); h.set('x-bm-path', path);
      return NextResponse.rewrite(r, {request: {headers: h}});
    }
    return NextResponse.rewrite(r);
  }
  return NextResponse.next();
}

export const config = {matcher: ['/((?!_next/static|_next/image).*)']};
