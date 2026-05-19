const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { optimizePackageImports: ['lucide-react', 'recharts'] },
  webpack: (config) => {
    config.resolve.alias['@naj/emails'] = path.join(__dirname, '..', 'naj-email-templates', 'src');
    config.resolve.modules = [
      path.join(__dirname, '..', 'naj-email-templates', 'node_modules'),
      ...(config.resolve.modules ?? ['node_modules']),
    ];
    return config;
  },
};
