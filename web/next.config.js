/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable serverless functions
  experimental: {
    serverActions: true,
  },
  // For Puppeteer/Chrome in serverless
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude Puppeteer from client bundle
      config.externals = [...(config.externals || []), 'puppeteer', 'playwright'];
    }
    return config;
  },
};

module.exports = nextConfig;
