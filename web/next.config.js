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
      // Exclude browser automation libraries from client bundle
      config.externals = [...(config.externals || []), 'puppeteer', 'playwright'];
    }
    return config;
  },
};

module.exports = nextConfig;
