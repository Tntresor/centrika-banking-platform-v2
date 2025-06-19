/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // API proxy to backend server
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL ? `${process.env.API_URL}/:path*` : 'http://localhost:8000/api/:path*',
      },
    ];
  },

  // Environment variables
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000/api',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },

  // Image optimization
  images: {
    domains: [
      'localhost',
      's3.amazonaws.com',
      'centrika-kyc-documents.s3.amazonaws.com',
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Output configuration for deployment
  output: 'standalone',
  
  // Experimental features
  experimental: {
    serverActions: true,
    typedRoutes: true,
  },

  // Build optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ESLint configuration
  eslint: {
    dirs: ['pages', 'components', 'utils'],
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Bundle analyzer (uncomment to analyze bundle size)
  // bundleAnalyzer: {
  //   enabled: process.env.ANALYZE === 'true',
  // },
};

module.exports = nextConfig;
