// Mapping chainId EVM → slug DefiLlama coins API
export const CHAIN_ID_TO_LLAMA: Record<number, string> = {
  1:      'ethereum',
  137:    'polygon',
  42161:  'arbitrum',
  10:     'optimism',
  8453:   'base',
  56:     'bsc',
  43114:  'avax',
  324:    'era',
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

// Constante zéro pour l'actif natif
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/**
 * Construit l'identifiant DefiLlama pour un token.
 * Fonction pure, utilisable côté client.
 */
export function toLlamaCoinId(chainId: number, address: string): string {
  const chain = CHAIN_ID_TO_LLAMA[chainId]
  if (!chain) return ''
  const addr = address === 'native' ? ZERO_ADDRESS : address.toLowerCase()
  return `${chain}:${addr}`
}

// ── Types réponse DefiLlama ──────────────────────────────────────────────────

interface LlamaCoin {
  price: number
  symbol: string
  timestamp: number
  confidence?: number
}

interface LlamaCurrentResponse {
  coins: Record<string, LlamaCoin>
}

interface LlamaHistoricalResponse {
  coins: Record<string, LlamaCoin>
}

// ── Fetch DefiLlama ──────────────────────────────────────────────────────────

const LLAMA_BASE = 'https://coins.llama.fi'

export async function fetchLlamaPrices(coinIds: string[]): Promise<Record<string, LlamaCoin>> {
  if (!coinIds.length) return {}
  // Ne pas encoder les ':' et ',' — DefiLlama attend le format brut : "chain:0x...,chain:0x..."
  const joined = coinIds.join(',')
  const res = await fetch(`${LLAMA_BASE}/prices/current/${joined}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) return {}
  const data: LlamaCurrentResponse = await res.json()
  // Normaliser les clés en minuscules pour une comparaison fiable côté client
  const coins: Record<string, LlamaCoin> = {}
  for (const [key, val] of Object.entries(data.coins ?? {})) {
    coins[key.toLowerCase()] = val
  }
  return coins
}

export async function fetchLlamaHistorical(
  timestamp: number,
  coinIds: string[],
): Promise<Record<string, LlamaCoin>> {
  if (!coinIds.length) return {}
  const joined = coinIds.join(',')
  const res = await fetch(
    `${LLAMA_BASE}/prices/historical/${timestamp}/${joined}`,
    { next: { revalidate: 3600 } },
  )
  if (!res.ok) return {}
  const data: LlamaHistoricalResponse = await res.json()
  const coins: Record<string, LlamaCoin> = {}
  for (const [key, val] of Object.entries(data.coins ?? {})) {
    coins[key.toLowerCase()] = val
  }
  return coins
}

// ── Taux de change EUR via Frankfurter ───────────────────────────────────────

// Cache module-level pour éviter d'appeler Frankfurter trop souvent (1h)
let eurRateCache: { value: number; fetchedAt: number } | null = null
const EUR_CACHE_TTL = 3_600_000 // 1h en ms

export async function fetchEurRate(): Promise<number> {
  const now = Date.now()
  if (eurRateCache && now - eurRateCache.fetchedAt < EUR_CACHE_TTL) {
    return eurRateCache.value
  }
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return eurRateCache?.value ?? 0.92
    const data = await res.json()
    const rate: number = data?.rates?.EUR ?? 0.92
    eurRateCache = { value: rate, fetchedAt: now }
    return rate
  } catch {
    return eurRateCache?.value ?? 0.92
  }
}

// ── Format normalisé attendu par /api/prices ─────────────────────────────────

export interface NormalizedPrice {
  usd: number | null
  eur: number | null
  usd_24h_change: number | null
  eur_24h_change: number | null
}

/**
 * Convertit les réponses DefiLlama + variation 24h + taux EUR en format
 * attendu par les hooks client.
 */
export function buildNormalizedPrices(
  current: Record<string, LlamaCoin>,
  past: Record<string, LlamaCoin>,
  eurRate: number,
): Record<string, NormalizedPrice> {
  const result: Record<string, NormalizedPrice> = {}

  for (const [coinId, coin] of Object.entries(current)) {
    const priceUsd = coin.price
    const priceEur = priceUsd * eurRate

    const pastCoin = past[coinId]
    let usdChange: number | null = null
    let eurChange: number | null = null
    if (pastCoin && pastCoin.price > 0) {
      usdChange = ((priceUsd - pastCoin.price) / pastCoin.price) * 100
      eurChange = usdChange // variation % identique peu importe la devise
    }

    result[coinId] = {
      usd: priceUsd,
      eur: priceEur,
      usd_24h_change: usdChange,
      eur_24h_change: eurChange,
    }
  }

  return result
}

// ── Fallback DexScreener pour tokens non indexés par DefiLlama ───────────────

interface DexScreenerPair {
  priceUsd: string | null
  priceChange?: { h24?: number }
  liquidity?: { usd?: number }
}

interface DexScreenerResponse {
  pairs: DexScreenerPair[] | null
}

export async function fetchDexScreenerPrice(
  tokenAddress: string,
): Promise<{ priceUsd: number | null; change24h: number | null }> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return { priceUsd: null, change24h: null }
    const data: DexScreenerResponse = await res.json()
    const pairs = data?.pairs ?? []
    // Prendre la paire la plus liquide en USD
    const best = pairs
      .filter(p => p.priceUsd !== null)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0]
    if (!best) return { priceUsd: null, change24h: null }
    return {
      priceUsd: best.priceUsd ? parseFloat(best.priceUsd) : null,
      change24h: best.priceChange?.h24 ?? null,
    }
  } catch {
    return { priceUsd: null, change24h: null }
  }
}
