import { NextRequest } from 'next/server'
import { fetchLlamaHistorical, fetchEurRate } from '@/lib/prices/llama'

/**
 * GET /api/prices/historical?timestamps=1700000000,1701000000&coins=ethereum:0x...&vs_currency=eur
 *
 * Retourne : { "1700000000": { "ethereum:0x...": { "usd": 3200, "eur": 2940 } } }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const timestampsParam = searchParams.get('timestamps')
  const coinsParam = searchParams.get('coins')

  if (!timestampsParam || !coinsParam) {
    return Response.json({ error: 'Missing timestamps or coins parameter' }, { status: 400 })
  }

  const timestamps = [...new Set(
    timestampsParam.split(',').map(Number).filter(t => t > 0)
  )]
  const coinIds = coinsParam.split(',').map(s => s.trim()).filter(Boolean)

  if (!timestamps.length || !coinIds.length) {
    return Response.json({})
  }

  try {
    const eurRate = await fetchEurRate()

    // Batch : appels en parallèle pour chaque timestamp unique
    // DefiLlama historical ne supporte qu'un timestamp par requête
    const entries = await Promise.all(
      timestamps.map(async (ts) => {
        const coins = await fetchLlamaHistorical(ts, coinIds)
        const pricesAtTs: Record<string, { usd: number | null; eur: number | null }> = {}
        for (const coinId of coinIds) {
          const coin = coins[coinId]
          if (coin) {
            pricesAtTs[coinId] = {
              usd: coin.price,
              eur: coin.price * eurRate,
            }
          } else {
            pricesAtTs[coinId] = { usd: null, eur: null }
          }
        }
        return [String(ts), pricesAtTs] as const
      }),
    )

    return Response.json(Object.fromEntries(entries))
  } catch {
    return Response.json({ error: 'Failed to fetch historical prices' }, { status: 500 })
  }
}
