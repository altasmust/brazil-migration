import {NextResponse, type NextRequest} from 'next/server';

// Host routing: the admin panel lives on its own (sub)domain (ADMIN_HOST),
// everything else (site + customer/advisor/lawyer/staff panels) on the main domain.
// Also maps "/folder/" to "/folder/index.html" for the static pages in /public.
const adminHosts = () => (process.env.ADMIN_HOST || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const SHARED = /^\/(brazil-migration-logo\.png|theme\.js|style\.css|page-visuals\.css|favicon\.ico|robots\.txt|bm\/|images\/|illustrations\/|kyc\/)/;

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  let path = url.pathname;
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/r/')) return NextResponse.next();
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0].toLowerCase();
  const hosts = adminHosts();
  const onAdmin = hosts.includes(host);
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
  const last = path.split('/').pop() || '';
  if (!last.includes('.')) {
    if (!path.endsWith('/')) return NextResponse.redirect(new URL(path + '/' + url.search, url), 308);
    const r = url.clone(); r.pathname = path + 'index.html';
    return NextResponse.rewrite(r);
  }
  return NextResponse.next();
}

export const config = {matcher: ['/((?!_next/static|_next/image).*)']};
