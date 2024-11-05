/** @type {import('next').NextConfig} */
const { elbaNextConfig } = require('@elba-security/config/next');

const nextConfig = {
  ...elbaNextConfig,
  transpilePackages: ['@elba-security/sdk'],
  env: {
    NANGO_INTEGRATION_ID: process.env.NANGO_INTEGRATION_ID,
    NANGO_PUBLIC_KEY: process.env.NANGO_PUBLIC_KEY,
  },
};

module.exports = nextConfig;
