/** @type {import('next').NextConfig} */
const nextConfig = {
  ignoreDuringBuilds: true,
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^cloudflare:sockets$/,
      })
    );

    return config;
  },
};

module.exports = nextConfig;
