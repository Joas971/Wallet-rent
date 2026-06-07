import { NextRequest } from 'next/server'

// Chains où l'Enhanced API d'Alchemy (alchemy_getTokenBalances) est fiable.
const ALCHEMY_NETWORK: Record<number, string> = {
  1:      'eth-mainnet',
  137:    'polygon-mainnet',
  42161:  'arb-mainnet',
  10:     'opt-mainnet',
  8453:   'base-mainnet',
}

// Chains supportées par Ankr multichain (fallback gratuit sans clé)
const ANKR_CHAIN: Record<number, string> = {
  1:      'eth',
  137:    'polygon',
  42161:  'arbitrum',
  10:     'optimism',
  8453:   'base',
  56:     'bsc',
  43114:  'avalanche',
  324:    'zksync_era',
  59144:  'linea',
  534352: 'scroll',
  250:    'fantom',
  100:    'gnosis',
  42220:  'celo',
  1284:   'moonbeam',
  25:     'cronos',
  5000:   'mantle',
  81457:  'blast',
}

// Mapping chainId → chain slug Moralis (optionnel, pour les chaînes où Ankr est instable)
const MORALIS_CHAIN: Record<number, string> = {
  56:     '0x38',   // BNB Chain
  43114:  '0xa86a', // Avalanche
  250:    '0xfa',   // Fantom
  25:     '0x19',   // Cronos
  1284:   '0x504',  // Moonbeam
  5000:   '0x1388', // Mantle
}

export type TokenResult = {
  address: string
  balance: string
  symbol: string
  name: string
  decimals: number
  logo: string | null
}

interface AlchemyTokenBalance {
  contractAddress: string
  tokenBalance: string
}

interface AlchemyTokenMetadata {
  symbol: string | null
  name: string | null
  decimals: number | null
  logo: string | null
}

interface AnkrAsset {
  tokenType: string
  contractAddress: string
  balanceRawInteger: string
  tokenSymbol: string
  tokenName: string
  tokenDecimals: number
  thumbnail: string | null
}

interface MoralisToken {
  token_address: string
  balance: string
  symbol: string
  name: string
  decimals: number
  thumbnail: string | null
  logo: string | null
}

// ── Alchemy ──────────────────────────────────────────────────────────────────

async function fetchFromAlchemy(
  wallet: string,
  chainId: number,
  apiKey: string,
): Promise<TokenResult[] | null> {
  const network = ALCHEMY_NETWORK[chainId]
  if (!network) return null

  const url = `https://${network}.g.alchemy.com/v2/${apiKey}`

  const balancesRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1,
      method: 'alchemy_getTokenBalances',
      params: [wallet, 'erc20'],
    }),
  })
  const balancesData = await balancesRes.json()

  if (balancesData?.error || !balancesData?.result) return null

  const rawBalances: AlchemyTokenBalance[] = balancesData.result.tokenBalances ?? []
  const ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000'
  const nonZero = rawBalances.filter(t => t.tokenBalance !== ZERO)

  if (nonZero.length === 0) return []

  const metaRequests = nonZero.map((t, i) => ({
    jsonrpc: '2.0', id: i + 1,
    method: 'alchemy_getTokenMetadata',
    params: [t.contractAddress],
  }))

  const metaRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metaRequests),
  })
  const metaData: { id: number; result: AlchemyTokenMetadata }[] = await metaRes.json()

  return nonZero.map((t, i) => {
    const meta: AlchemyTokenMetadata = metaData.find(m => m.id === i + 1)?.result ?? {
      symbol: null, name: null, decimals: null, logo: null,
    }
    return {
      address: t.contractAddress,
      balance: BigInt(t.tokenBalance).toString(),
      symbol: meta.symbol ?? '???',
      name: meta.name ?? '???',
      decimals: meta.decimals ?? 18,
      logo: meta.logo ?? null,
    }
  })
}

// ── Ankr ─────────────────────────────────────────────────────────────────────

async function fetchFromAnkr(wallet: string, chainId: number): Promise<TokenResult[]> {
  const blockchain = ANKR_CHAIN[chainId]
  if (!blockchain) return []

  const res = await fetch('https://rpc.ankr.com/multichain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'ankr_getAccountBalance',
      params: {
        blockchain,          // string (non tableau) — plus stable sur le free tier
        walletAddress: wallet,
        onlyWhitelisted: false,
      },
      id: 1,
    }),
  })

  const data = await res.json()

  // Détecter les erreurs Ankr (rate-limit, etc.)
  if (data?.error || !data?.result) return []

  const assets: AnkrAsset[] = data.result.assets ?? []

  return assets
    // Exclure uniquement les tokens natifs — inclure tous les fungible tokens
    // (ERC20, BEP20, etc. selon le label Ankr)
    .filter(a => a.tokenType !== 'NATIVE' && BigInt(a.balanceRawInteger || '0') > 0n)
    .map(a => ({
      address: a.contractAddress,
      balance: a.balanceRawInteger,
      symbol: a.tokenSymbol,
      name: a.tokenName,
      decimals: a.tokenDecimals,
      logo: a.thumbnail ?? null,
    }))
}

// ── Moralis (optionnel, si MORALIS_API_KEY est configuré) ────────────────────

async function fetchFromMoralis(
  wallet: string,
  chainId: number,
  apiKey: string,
): Promise<TokenResult[]> {
  const chain = MORALIS_CHAIN[chainId]
  if (!chain) return []

  const res = await fetch(
    `https://deep-index.moralis.io/api/v2.2/${wallet}/erc20?chain=${chain}`,
    {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
    },
  )

  if (!res.ok) return []
  const tokens: MoralisToken[] = await res.json()

  return tokens
    .filter(t => BigInt(t.balance || '0') > 0n)
    .map(t => ({
      address: t.token_address,
      balance: t.balance,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logo: t.logo ?? t.thumbnail ?? null,
    }))
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  const chainId = Number(searchParams.get('chainId') ?? 1)

  if (!wallet) {
    return Response.json({ error: 'Missing wallet' }, { status: 400 })
  }

  try {
    const alchemyKey = process.env.ALCHEMY_API_KEY
    const moralisKey = process.env.MORALIS_API_KEY

    // 1. Alchemy — uniquement pour les 5 chaînes où l'Enhanced API est fiable
    if (alchemyKey && ALCHEMY_NETWORK[chainId]) {
      const result = await fetchFromAlchemy(wallet, chainId, alchemyKey)
      if (result && result.length > 0) return Response.json(result)
    }

    // 2. Moralis — si clé configurée et chaîne supportée (très fiable pour BSC, etc.)
    if (moralisKey && MORALIS_CHAIN[chainId]) {
      const result = await fetchFromMoralis(wallet, chainId, moralisKey)
      if (result.length > 0) return Response.json(result)
    }

    // 3. Ankr — fallback universel gratuit (17 chaînes)
    const result = await fetchFromAnkr(wallet, chainId)
    return Response.json(result)

  } catch {
    return Response.json([])
  }
}
