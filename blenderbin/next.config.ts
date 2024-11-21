import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  // If you're deploying to GitHub Pages, you might need:
  basePath: '/BlenderBin.com',
  images: {
    unoptimized: true,
  },
}

export default nextConfig