import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config) => {
    return {
      ...config,
      watchOptions: {
        ...config.watchOptions,
        ignored: [
          // Ensure we have a default array if config.watchOptions?.ignored doesn't exist
          ...(Array.isArray(config.watchOptions?.ignored) 
            ? config.watchOptions.ignored 
            : ['/node_modules/']),
          '**/functions/**'
        ]
      }
    }
  }
}

export default nextConfig