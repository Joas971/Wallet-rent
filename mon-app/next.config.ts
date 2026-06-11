import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Trust Wallet Assets (logos tokens natifs + ERC-20)
      { protocol: 'https', hostname: 'raw.githubusercontent.com', pathname: '/trustwallet/**' },
      // Logos provenant d'Alchemy (hébergés sur leur CDN ou IPFS)
      { protocol: 'https', hostname: '*.alchemyapi.io' },
      { protocol: 'https', hostname: '*.alchemy.com' },
      // Logos Ankr
      { protocol: 'https', hostname: 'multi-chain-defi.ankr.com' },
      { protocol: 'https', hostname: '*.ankr.com' },
      // Logos génériques (IPFS, etc.)
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default nextConfig
