import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  serverExternalPackages: ['@libsql/client'],
  async redirects() {
    return [
      {source: '/lgbt-brezilya-oturum-izni/:path*', destination: '/brezilya-oturum-izni/', permanent: true},
      {source: '/brezilya-evlilik-oturum-izni/:path*', destination: '/brezilya-oturum-izni/', permanent: true},
    ];
  },
  async headers() {
    return [{source: '/:path*', headers: [
      {key: 'X-Content-Type-Options', value: 'nosniff'},
      {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
      {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
    ]},
    // static assets: images/fonts cached for a week, scripts/styles for an hour (they are versioned with ?v=)
    {source: '/:all*(png|jpg|jpeg|webp|svg|ico|woff2)', headers: [{key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400'}]},
    {source: '/:all*(js|css)', headers: [{key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400'}]},
    ];
  },
};
export default nextConfig;
