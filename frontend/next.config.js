/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["localhost"],
  },
  // Performance optimizations
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    optimizePackageImports: [
      "framer-motion",
      "@react-three/fiber",
      "@react-three/drei",
    ],
  },
  // Reduce bundle size by disabling sourcemaps in production
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
