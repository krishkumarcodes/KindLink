// Polyfill process.versions.webcontainer on Android/Termux so Next.js uses @next/swc-wasm-nodejs
if (process.platform === 'android' && !process.versions.webcontainer) {
  process.versions.webcontainer = '1';
}

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
    serverComponentsExternalPackages: ['maplibre-gl'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'maplibre-gl'];
    } else {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        constants: false,
      };
    }
    return config;
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
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://fonts.googleapis.com https://fonts.gstatic.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://fonts.googleapis.com https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://*.supabase.co https://api.maptiler.com https://*.maptiler.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://tiles.openfreemap.org https://*.openfreemap.org",
              "font-src 'self' data: https://fonts.gstatic.com https://www.gstatic.com https://fonts.googleapis.com",
              "connect-src 'self' https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.supabase.co wss://*.supabase.co https://api.maptiler.com https://*.maptiler.com https://tiles.openfreemap.org https://*.openfreemap.org https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
              "frame-src 'self' https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://fonts.googleapis.com https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
