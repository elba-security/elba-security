/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['@elba-security/design-system'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
