import { NextRequest } from 'next/server'
import {
  fetchLlamaPrices,
  fetchLlamaHistorical,
  fetchEurRate,
  fetchDexScreenerPrice,
  buildNormalizedPrices,
  type NormalizedPrice,
} from '@/lib/prices/llama'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const coinsParam = searchParams.get('coins')
  const vs = (searchParams.get('vs_currency') ?? 'eur') as 'eur' | 'usd'

  if (!coinsParam) {
    return Response.json({ error: 'Missing coins parameter' }, { status: 400 })
  }

  const coinIds = coinsParam.split(',').map(s => s.trim()).filter(Boolean)

  try {
    const nowTs = Math.floor(Date.now() / 1000)
    const pastTs = nowTs - 86400

    // Prix actuels + prix J-1 (pour variation 24h) en parallèle
    const [current, past, eurRate] = await Promise.all([
      fetchLlamaPrices(coinIds),
      fetchLlamaHistorical(pastTs, coinIds),
      fetchEurRate(),
    ])

    const normalized = buildNormalizedPrices(current, past, eurRate)

    // Fallback DexScreener pour les coins que DefiLlama ne connaît pas
    const missing = coinIds.filter(id => !normalized[id])
    if (missing.length > 0) {
      await Promise.all(
        missing.map(async (coinId) => {
          // Extraire l'adresse du format "chain:0x..."
          const parts = coinId.split(':')
          const address = parts[1]
          if (!address) return
          const { priceUsd, change24h } = await fetchDexScreenerPrice(address)
          if (priceUsd !== null) {
            normalized[coinId] = {
              usd: priceUsd,
              eur: priceUsd * eurRate,
              usd_24h_change: change24h,
              eur_24h_change: change24h,
            }
          }
        }),
      )
    }

    // Construire la réponse dans le format attendu par les hooks :
    // { [coinId]: { usd, eur, usd_24h_change, eur_24h_change } }
    const response: Record<string, Partial<NormalizedPrice>> = {}
    for (const [coinId, prices] of Object.entries(normalized)) {
      response[coinId] = vs === 'eur'
        ? { eur: prices.eur, usd: prices.usd, eur_24h_change: prices.eur_24h_change, usd_24h_change: prices.usd_24h_change }
        : prices
    }

    return Response.json(response)
  } catch {
    return Response.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}
