/** @type {import('next').NextConfig} */
const nextConfig = {
  ignoreDuringBuilds: true,
  transpilePackages: ['elba-sdk', 'elba-msw', 'elba-schema'],
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^postgres$|^cloudflare:sockets$/,
      })
    );

    return config;
  },
};

module.exports = nextConfig;
