/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Set to false for Electron to avoid double rendering
  // Remove swcMinify as it's deprecated in Next.js 15
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: true
  },
  // Ensure Next.js assets work in Electron
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  // Output as a standalone app
  output: 'standalone',
  // Disable static indicators (lightning bolt icon)
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  // Force dynamic rendering
  experimental: {
    disableOptimizedLoading: true,
    optimizeCss: true,
  },
  // Disable image optimization for Electron
  images: {
    disableStaticImages: true,
  },
};

module.exports = nextConfig; 