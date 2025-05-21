/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['espcgyteztrqzfarqafq.supabase.co'],
  },
  webpack: (config) => {
    // This is to handle the canvas dependency in jsbarcode
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
}

module.exports = nextConfig
