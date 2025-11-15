/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize package imports for faster compilation
  transpilePackages: ['recharts'],
  
  // Enable SWC minification (default in Next.js 15, but explicit is good)
  swcMinify: true,
  
  // Optimize module resolution
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Reduce bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;

