'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit-common'
import {
  mainnet, polygon, arbitrum, optimism, base, bsc, avalanche,
  zkSync, linea, scroll, fantom, gnosis, celo, moonbeam, cronos, mantle, blast,
} from '@reown/appkit/networks'
import { http } from 'viem'
import { ANKR_TRANSPORTS } from '@/lib/wagmi/config'
import { ReactNode } from 'react'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet, polygon, arbitrum, optimism, base, bsc, avalanche,
  zkSync, linea, scroll, fantom, gnosis, celo, moonbeam, cronos, mantle, blast,
]

// Transports CORS-friendly pour le WagmiAdapter côté client.
// Les routes API server-side utilisent Alchemy (ALCHEMY_API_KEY) automatiquement.
const transports = Object.fromEntries(
  Object.entries(ANKR_TRANSPORTS).map(([chainId, url]) => [Number(chainId), http(url)])
)

const wagmiAdapter = new WagmiAdapter({ networks, projectId, transports })

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  defaultNetwork: mainnet,
  features: {
    analytics: false,
    // Force la détection EIP-6963 (extensions comme Rabby, MetaMask, etc.)
    // sans passer par WalletConnect pour les wallets déjà installés
    email: false,
    socials: [],
  },
  // Affiche les wallets détectés via EIP-6963 en premier
  allWallets: 'SHOW',
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#22d3ee',
    '--w3m-border-radius-master': '8px',
  },
})

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
