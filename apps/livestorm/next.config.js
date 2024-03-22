/** @type {import('next').NextConfig} */
const { elbaNextConfig } = require("@elba-security/config/next");

const nextConfig = {
  ...elbaNextConfig,
  transpilePackages: ['@elba-security/sdk'],
};

module.exports = nextConfig;
