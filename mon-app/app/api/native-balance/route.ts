import { NextRequest } from 'next/server'

// RPCs Alchemy par chaîne (server-side, clé privée)
const ALCHEMY_NETWORK: Record<number, string> = {
  1:      'eth-mainnet',
  137:    'polygon-mainnet',
  42161:  'arb-mainnet',
  10:     'opt-mainnet',
  8453:   'base-mainnet',
  56:     'bnb-mainnet',
  43114:  'avax-mainnet',
  324:    'zksync-mainnet',
  59144:  'linea-mainnet',
  534352: 'scroll-mainnet',
  81457:  'blast-mainnet',
  42220:  'celo-mainnet',
}

// RPCs publics Ankr en fallback (toutes les 17 chaînes)
const ANKR_RPC: Record<number, string> = {
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

function getRpcUrl(chainId: number): string {
  const apiKey = process.env.ALCHEMY_API_KEY
  const network = ALCHEMY_NETWORK[chainId]
  if (apiKey && network) {
    return `https://${network}.g.alchemy.com/v2/${apiKey}`
  }
  return ANKR_RPC[chainId] ?? ''
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  const chainId = Number(searchParams.get('chainId') ?? 1)

  if (!wallet) {
    return Response.json({ error: 'Missing wallet' }, { status: 400 })
  }

  const rpcUrl = getRpcUrl(chainId)
  if (!rpcUrl) {
    return Response.json({ error: 'Unsupported chain' }, { status: 400 })
  }

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [wallet, 'latest'],
        id: 1,
      }),
    })

    const data = await res.json()
    if (data?.error || !data?.result) {
      return Response.json({ error: 'RPC error', detail: data?.error }, { status: 502 })
    }

    // Retourner la balance en string décimal (compatible BigInt côté client)
    const balance = BigInt(data.result).toString()
    return Response.json({ balance })
  } catch {
    return Response.json({ error: 'Failed to fetch native balance' }, { status: 500 })
  }
}
