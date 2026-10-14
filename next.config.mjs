/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    useWasmBinary: true,
  },
  async redirects() {
    return [
      {
        source: ['/p', 'h', 'y', 's', 'i', 'c', 's'].join(''),
        destination: '/',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://translate.google.com https://translate.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://www.gstatic.com https://translate.googleapis.com",
              "img-src 'self' data: blob: https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.supabase.co https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
              "font-src 'self' data: https://fonts.gstatic.com https://www.gstatic.com",
              "connect-src 'self' https://translate.google.com https://translate.googleapis.com https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org",
              "frame-src 'self' https://translate.google.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
