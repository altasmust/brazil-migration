import type {NextConfig} from 'next';

const CSP = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.clarity.ms https://*.clarity.ms", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com", "img-src 'self' data: blob: https:", "media-src 'self' blob: https:",
  "connect-src 'self' https: wss://0.peerjs.com", "frame-src 'self' https:", "frame-ancestors 'self'", "form-action 'self' https:",
  "base-uri 'self'", "object-src 'none'", "worker-src 'self' blob:",
].join('; ');

// Başvuru formu (/basvuru/) firmaların kendi sitesine iframe ile gömülebilir; yalnız bu sayfa için çerçevelemeye https sitelerden izin verilir.
const baseHeaders = (csp: string, frame: boolean) => [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  ...(frame ? [{key: 'X-Frame-Options', value: 'SAMEORIGIN'}] : []),
  {key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains'},
  {key: 'Content-Security-Policy', value: csp},
  {key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=(self), payment=(self), usb=(), interest-cohort=()'},
  {key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups'},
  {key: 'X-Permitted-Cross-Domain-Policies', value: 'none'},
  {key: 'X-DNS-Prefetch-Control', value: 'on'},
];

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  serverExternalPackages: ['@libsql/client'],
  async redirects() {
    return [
      {source: '/index.html', destination: '/', permanent: true},
      {source: '/:path*/index.html', destination: '/:path*/', permanent: true},
      {source: '/favicon.ico', destination: '/bm/pwa/icon-192.png', permanent: true},
      {source: '/icerik-plani/:path*', destination: '/blog/', permanent: true},
      {source: '/lgbt-brezilya-oturum-izni/:path*', destination: '/brezilya-oturum-izni/', permanent: true},
      {source: '/brezilya-evlilik-oturum-izni/:path*', destination: '/brezilya-oturum-izni/', permanent: true},
    ];
  },
  async rewrites() {
    return [{source: '/api/health', destination: '/api/auth/health'}];
  },
  async headers() {
    return [{source: '/((?!basvuru(?:/|$)).*)', headers: baseHeaders(CSP, true)},
    {source: '/basvuru/:path*', headers: baseHeaders(CSP.replace("frame-ancestors 'self'", 'frame-ancestors https:'), false)},
    // static assets: images/fonts cached for a week, scripts/styles for an hour (they are versioned with ?v=)
    {source: '/:all*(png|jpg|jpeg|webp|svg|ico|woff2)', headers: [{key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400'}]},
    {source: '/:all*(js|css)', headers: [{key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400'}]},
    {source: '/sw.js', headers: [{key: 'Cache-Control', value: 'no-cache'}, {key: 'Service-Worker-Allowed', value: '/'}]},
    {source: '/manifest.webmanifest', headers: [{key: 'Cache-Control', value: 'public, max-age=86400'}, {key: 'Content-Type', value: 'application/manifest+json'}]},
    ];
  },
};
export default nextConfig;
