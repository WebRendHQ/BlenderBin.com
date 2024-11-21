import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config) => {  // Remove { isServer } if we're not using it
    // Exclude the functions directory from webpack compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [...(config.watchOptions?.ignored ?? []), '**/functions/**']
    };
    return config;
  }
}

export default nextConfig