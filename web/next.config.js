/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent trailing slash redirects that can break POST requests (405 errors)
  trailingSlash: false,
  skipTrailingSlashRedirect: true,

  // Monorepo: Enable transpilation of shared package
  transpilePackages: ['@court-booker/shared'],

  // For Puppeteer/Playwright in serverless (Browserless.io via WebSocket)
  // Note: playwright-core is lightweight (API only, no browsers) and can be bundled
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude puppeteer (has native binaries) but allow playwright-core to be bundled
      config.externals = [...(config.externals || []), 'puppeteer'];
    }
    return config;
  },
};

module.exports = nextConfig;
