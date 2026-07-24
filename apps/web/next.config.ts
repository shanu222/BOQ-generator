import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@boq/engine', '@boq/shared', '@boq/geometry'],
  // Keep report libs out of the server bundle — they are dynamically imported client-side only
  serverExternalPackages: ['exceljs', 'docx', 'jspdf', 'jspdf-autotable'],
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      './dist/cpexcel.js': false,
    };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
        buffer: false,
        util: false,
        zlib: false,
      };
    }
    return config;
  },
};

export default nextConfig;
