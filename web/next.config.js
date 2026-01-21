/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent trailing slash redirects that can break POST requests (405 errors)
  trailingSlash: false,
  skipTrailingSlashRedirect: true,

  // Monorepo: Enable transpilation of shared package
  transpilePackages: ['@court-booker/shared'],

  // For Puppeteer/Playwright in serverless (Browserless.io via WebSocket)
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark as external - Vercel will install these from package.json
      config.externals = [...(config.externals || []), 'puppeteer', 'playwright-core'];
    }
    return config;
  },
};

module.exports = nextConfig;
