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
    ]}];
  },
};
export default nextConfig;
