import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
  zkSync,
  linea,
  scroll,
  fantom,
  gnosis,
  celo,
  moonbeam,
  cronos,
  mantle,
  blast,
} from 'viem/chains'

export const SUPPORTED_CHAINS = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  bsc,
  avalanche,
  zkSync,
  linea,
  scroll,
  fantom,
  gnosis,
  celo,
  moonbeam,
  cronos,
  mantle,
  blast,
] as const

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number]

export const CHAIN_LABELS: Record<number, { name: string; symbol: string }> = {
  1:      { name: 'Ethereum',     symbol: 'ETH'  },
  137:    { name: 'Polygon',      symbol: 'MATIC' },
  42161:  { name: 'Arbitrum One', symbol: 'ETH'  },
  10:     { name: 'Optimism',     symbol: 'ETH'  },
  8453:   { name: 'Base',         symbol: 'ETH'  },
  56:     { name: 'BNB Chain',    symbol: 'BNB'  },
  43114:  { name: 'Avalanche',    symbol: 'AVAX' },
  324:    { name: 'zkSync Era',   symbol: 'ETH'  },
  59144:  { name: 'Linea',        symbol: 'ETH'  },
  534352: { name: 'Scroll',       symbol: 'ETH'  },
  250:    { name: 'Fantom',       symbol: 'FTM'  },
  100:    { name: 'Gnosis',       symbol: 'xDAI' },
  42220:  { name: 'Celo',         symbol: 'CELO' },
  1284:   { name: 'Moonbeam',     symbol: 'GLMR' },
  25:     { name: 'Cronos',       symbol: 'CRO'  },
  5000:   { name: 'Mantle',       symbol: 'MNT'  },
  81457:  { name: 'Blast',        symbol: 'ETH'  },
}

// RPCs publics Ankr — gratuits, sans clé, CORS-friendly, 17 chaînes
// Utilisés côté client par le WagmiAdapter. Les routes API server-side
// utilisent Alchemy (ALCHEMY_API_KEY) ou Ankr en fallback automatiquement.
export const ANKR_TRANSPORTS: Record<number, string> = {
  1:      'https://rpc.ankr.com/eth',
  137:    'https://rpc.ankr.com/polygon',
  42161:  'https://rpc.ankr.com/arbitrum',
  10:     'https://rpc.ankr.com/optimism',
  8453:   'https://rpc.ankr.com/base',
  56:     'https://rpc.ankr.com/bsc',
  43114:  'https://rpc.ankr.com/avalanche',
  324:    'https://rpc.ankr.com/zksync_era',
  59144:  'https://rpc.ankr.com/linea',
  534352: 'https://rpc.ankr.com/scroll',
  250:    'https://rpc.ankr.com/fantom',
  100:    'https://rpc.ankr.com/gnosis',
  42220:  'https://rpc.ankr.com/celo',
  1284:   'https://rpc.ankr.com/moonbeam',
  25:     'https://rpc.ankr.com/cronos',
  5000:   'https://rpc.ankr.com/mantle',
  81457:  'https://rpc.ankr.com/blast',
}
