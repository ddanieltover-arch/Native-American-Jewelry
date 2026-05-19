const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { optimizePackageImports: ['lucide-react', 'recharts'] },
  webpack: (config) => {
    config.resolve.alias['@naj/emails'] = path.join(__dirname, '..', 'naj-email-templates', 'src');
    // App node_modules first — Vercel only installs deps for this package (resend lives here)
    config.resolve.modules = [
      path.join(__dirname, 'node_modules'),
      ...(config.resolve.modules ?? []),
    ];
    return config;
  },
};
