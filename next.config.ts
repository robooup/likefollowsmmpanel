import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The type check needs more memory than a 1 GB server has; deploy scripts set
  // SKIP_TYPECHECK=1 there. Types are still checked in development and on larger servers.
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === '1' },
  experimental: {
    optimizePackageImports: ['@/components', '@/hooks', '@/lib'],
  },

  images: {
    // Panel uploads are served per tenant from /api/files/...; the built-in
    // optimizer fetches them without the panel's host, gets nothing back and
    // answers 400. Serve images as they are (also closes the open image proxy
    // that the wildcard remote pattern below would otherwise allow).
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      if (process.env.USE_POLLING === 'true') {
        config.watchOptions = {
          poll: 2000,
          aggregateTimeout: 500,
        };
      } else {
        config.watchOptions = {
          ignored: ['**/node_modules .next/**'],
          aggregateTimeout: 300,
        };
      }

      config.resolve.symlinks = false;
    }

    return config;
  },

  turbopack: {},

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 60 * 1000,
      pagesBufferLength: 5,
    },
  }),

  async rewrites() {
    return [
      {
        source: '/blog/:slug',
        destination: '/blogs/:slug',
      },
    ];
  },
};

export default nextConfig;
