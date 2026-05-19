const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  webpack: (config) => {
    config.resolve.alias['@naj/emails'] = path.join(__dirname, '..', 'naj-email-templates', 'src');
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules ?? []),
    ];
    return config;
  },
};

module.exports = nextConfig;
