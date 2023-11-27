/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['elba-sdk', 'elba-msw', 'elba-schema'],
};

module.exports = nextConfig;
