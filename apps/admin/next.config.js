/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@ai-links/shared-types', '@ai-links/firebase-admin'],
};

module.exports = nextConfig;
