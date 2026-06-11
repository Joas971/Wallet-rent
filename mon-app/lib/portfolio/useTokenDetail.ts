'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { SUPPORTED_CHAINS, CHAIN_LABELS } from '@/lib/wagmi/config'
import { toLlamaCoinId } from '@/lib/prices/llama'
import { parseTransfers } from './parseTransfers'
import { computeCostBasis } from './costBasis'
import { enrichConversionsWithPnl } from './conversions'
import type { TokenDetail, TokenWithPrice, Conversion } from '@/types/portfolio'
import type { TransferEntry } from '@/app/api/history/route'
import { useFiat } from '@/providers/FiatProvider'

/**
 * Retourne les prix historiques dé-encapsulés par timestamp.
 * La réponse API brute est { ts: { coinId: { usd, eur } } }.
 * Cette fonction retourne { ts: { usd, eur } } pour un coinId donné.
 */
async function fetchHistoricalPrices(
  timestamps: number[],
  coinId: string,
): Promise<Record<string, { usd: number | null; eur: number | null }>> {
  if (!timestamps.length) return {}
  try {
    const res = await fetch(
      `/api/prices/historical?timestamps=${timestamps.join(',')}&coins=${coinId}`,
    )
    if (!res.ok) return {}
    const raw: Record<string, Record<string, { usd: number | null; eur: number | null }>> = await res.json()
    const result: Record<string, { usd: number | null; eur: number | null }> = {}
    for (const [ts, coinsAtTs] of Object.entries(raw)) {
      const prices = coinsAtTs[coinId] ?? coinsAtTs[coinId.toLowerCase()] ?? null
      result[ts] = prices ?? { usd: null, eur: null }
    }
    return result
  } catch {
    return {}
  }
}

export function useTokenDetail(chainId: number, tokenAddress: string) {
  const { address } = useAccount()
  const { currency } = useFiat()
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
  const chainLabel = CHAIN_LABELS[chainId]
  const isNative = tokenAddress === 'native'
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['tokenDetail', chainId, tokenAddress, address, currency],
    enabled: !!address && !!chain,
    staleTime: 60_000,
    queryFn: async (): Promise<TokenDetail | null> => {
      if (!address || !chain) return null

      let balance: bigint = 0n
      let decimals = 18
      let symbol = chainLabel?.symbol ?? 'ETH'
      let name = chainLabel?.name ?? chain.name
      let logo: string | undefined = undefined

      // 1. Chercher les données du token dans le cache React Query
      const cachedBalances = queryClient.getQueryData<TokenWithPrice[]>(
        ['tokenBalances', chainId, address, currency],
      )
      const cachedToken = cachedBalances?.find(
        t => t.address.toLowerCase() === tokenAddress.toLowerCase(),
      )

      if (cachedToken) {
        balance = cachedToken.balance
        decimals = cachedToken.decimals
        symbol = cachedToken.symbol
        name = cachedToken.name
        logo = cachedToken.logo
      } else if (isNative) {
        try {
          const res = await fetch(`/api/native-balance?wallet=${address}&chainId=${chainId}`)
          if (res.ok) {
            const data = await res.json()
            balance = BigInt(data.balance ?? '0')
          }
        } catch { /* solde reste à 0n */ }
      } else {
        try {
          const res = await fetch(`/api/token-balances?wallet=${address}&chainId=${chainId}`)
          if (res.ok) {
            const tokens: { address: string; symbol: string; name: string; decimals: number; balance: string; logo: string | null }[] = await res.json()
            const found = tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase())
            if (found) {
              balance = BigInt(found.balance)
              decimals = found.decimals ?? 18
              symbol = found.symbol ?? symbol
              name = found.name ?? name
              logo = found.logo ?? undefined
            }
          }
        } catch { /* garde les valeurs par défaut */ }
      }

      const balanceFormatted = parseFloat(formatUnits(balance, decimals))
      const coinId = toLlamaCoinId(chainId, isNative ? 'native' : tokenAddress)

      // 2. Historique des transferts (scopé sur l'actif cible)
      const historyRes = await fetch(
        `/api/history?chainId=${chainId}&wallet=${address}${!isNative ? `&token=${tokenAddress}` : ''}`,
      )
      const { incoming = [], outgoing = [] }: { incoming: TransferEntry[]; outgoing: TransferEntry[] } =
        historyRes.ok ? await historyRes.json() : {}

      // 3. Contexte multi-actifs pour les hashes uniques (détection swap)
      const uniqueHashes = [...new Set([
        ...incoming.map(t => t.hash),
        ...outgoing.map(t => t.hash),
      ])]

      let txContext: Record<string, TransferEntry[]> = {}
      if (uniqueHashes.length > 0) {
        try {
          const ctxRes = await fetch(
            `/api/history/tx-context?chainId=${chainId}&wallet=${address}&hashes=${uniqueHashes.join(',')}`,
          )
          if (ctxRes.ok) txContext = await ctxRes.json()
        } catch { /* contexte indisponible, parseTransfers sans swap detection */ }
      }

      // 4. Parse conversions avec contexte cross-actifs
      const targetToken = {
        address: isNative ? null : tokenAddress,
        isNative,
      }
      const rawConversions = parseTransfers(incoming, outgoing, address, txContext, targetToken)

      // 5. Prix actuel
      const priceRes = await fetch(`/api/prices?coins=${coinId}&vs_currency=${currency}`)
      const priceData = priceRes.ok ? await priceRes.json() : {}
      const coinData = priceData[coinId] ?? {}
      const currentPrice: number | null = coinData[currency as 'eur' | 'usd'] ?? null
      const priceChange24h: number | null = coinData[`${currency}_24h_change`] ?? null

      // 6. Prix historiques pour les conversions
      const uniqueTimestamps = [...new Set(
        rawConversions
          .filter(c => c.timestamp !== null)
          .map(c => Math.floor(new Date(c.timestamp!).getTime() / 1000)),
      )]

      const historicalPrices = await fetchHistoricalPrices(uniqueTimestamps, coinId)

      // 7. Enrichissement des conversions avec le prix au moment T
      const enrichedConversions: Conversion[] = rawConversions.map(c => {
        if (c.timestamp === null) return { ...c, priceAtTime: currentPrice }
        const ts = String(Math.floor(new Date(c.timestamp).getTime() / 1000))
        const hist = historicalPrices[ts]
        const priceAtTime = hist
          ? (hist[currency as 'eur' | 'usd'] ?? currentPrice)
          : currentPrice
        return { ...c, priceAtTime }
      })

      // 8. Cost basis FIFO
      const costBasis = computeCostBasis(enrichedConversions, balanceFormatted, currentPrice)

      // 9. PnL par mouvement (sell/swap_out uniquement)
      const conversions = enrichConversionsWithPnl(enrichedConversions, costBasis.averageCostBasis)

      // 10. PnL global = réalisé + non réalisé
      const currentValue = currentPrice !== null ? balanceFormatted * currentPrice : null
      const unrealizedPnl = currentValue !== null && costBasis.totalInvested !== null
        ? currentValue - costBasis.totalInvested
        : null
      const pnl = unrealizedPnl !== null
        ? costBasis.realizedPnl + unrealizedPnl
        : costBasis.realizedPnl > 0
          ? costBasis.realizedPnl
          : null
      const totalInvestedAll = costBasis.totalInvested
      const pnlPercent = pnl !== null && totalInvestedAll !== null && totalInvestedAll > 0
        ? (pnl / totalInvestedAll) * 100
        : null

      const token: TokenWithPrice = {
        address: tokenAddress,
        symbol,
        name,
        decimals,
        balance,
        balanceFormatted,
        logo,
        priceCoinId: coinId,
        priceUsd: coinData.usd ?? null,
        priceEur: coinData.eur ?? null,
        priceChange24h,
        valueUsd: coinData.usd != null ? balanceFormatted * coinData.usd : null,
        valueEur: coinData.eur != null ? balanceFormatted * coinData.eur : null,
      }

      return { token, costBasis, currentValue, pnl, pnlPercent, unrealizedPnl, conversions }
    },
  })
}
