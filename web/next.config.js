/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions are enabled by default in Next.js 14+

  // Monorepo: Enable transpilation of shared package
  transpilePackages: ['@court-booker/shared'],

  // For Puppeteer/Playwright in serverless (Browserless.io via WebSocket)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude browser automation libraries from client bundle
      config.externals = [...(config.externals || []), 'puppeteer', 'playwright'];
    }
    return config;
  },
};

module.exports = nextConfig;
