'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import type { TokenWithPrice } from '@/types/portfolio'
import { CHAIN_LABELS, SUPPORTED_CHAINS } from '@/lib/wagmi/config'
import { toLlamaCoinId } from '@/lib/prices/llama'
import { useFiat } from '@/providers/FiatProvider'

async function fetchNativeBalance(wallet: string, chainId: number): Promise<bigint> {
  try {
    const res = await fetch(`/api/native-balance?wallet=${wallet}&chainId=${chainId}`)
    if (!res.ok) return 0n
    const data = await res.json()
    return BigInt(data.balance ?? '0')
  } catch {
    return 0n
  }
}

async function fetchERC20Balances(
  wallet: string,
  chainId: number,
): Promise<{ address: string; symbol: string; name: string; decimals: number; balance: string; logo: string | null }[]> {
  try {
    const res = await fetch(`/api/token-balances?wallet=${wallet}&chainId=${chainId}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchPrices(
  coinIds: string[],
  currency: string,
): Promise<Record<string, { usd: number | null; eur: number | null; usd_24h_change: number | null; eur_24h_change: number | null }>> {
  if (!coinIds.length) return {}
  try {
    const res = await fetch(`/api/prices?coins=${coinIds.join(',')}&vs_currency=${currency}`)
    if (!res.ok) return {}
    return res.json()
  } catch {
    return {}
  }
}

export function useTokenBalances(chainId: number) {
  const { address } = useAccount()
  const { currency } = useFiat()
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
  const chainLabel = CHAIN_LABELS[chainId]

  return useQuery({
    queryKey: ['tokenBalances', chainId, address, currency],
    enabled: !!address && !!chain,
    staleTime: 30_000,
    queryFn: async (): Promise<TokenWithPrice[]> => {
      if (!address || !chain) return []

      // Native balance — via route API server-side (évite les erreurs CORS des RPCs publics)
      const nativeBalance = await fetchNativeBalance(address, chainId)
      const nativeFormatted = parseFloat(formatUnits(nativeBalance, 18))
      const nativeCoinId = toLlamaCoinId(chainId, 'native')

      // ERC-20 balances
      const erc20List = await fetchERC20Balances(address, chainId)

      // Build DefiLlama coin IDs — utilise directement l'adresse de contrat
      const erc20WithId = erc20List.map(t => ({
        ...t,
        priceCoinId: toLlamaCoinId(chainId, t.address),
      }))

      const allCoinIds = [nativeCoinId, ...erc20WithId.map(t => t.priceCoinId).filter(Boolean)]
      const prices = await fetchPrices(allCoinIds, currency)

      const nativePriceData = prices[nativeCoinId] ?? {}
      const nativePrice = nativePriceData[currency as 'eur' | 'usd'] ?? null
      const nativeChange = nativePriceData[`${currency}_24h_change` as keyof typeof nativePriceData] ?? null

      const nativeToken: TokenWithPrice = {
        address: 'native',
        symbol: chainLabel?.symbol ?? 'ETH',
        name: chainLabel?.name ?? chain.name,
        decimals: 18,
        balance: nativeBalance,
        balanceFormatted: nativeFormatted,
        priceCoinId: nativeCoinId,
        priceUsd: nativePriceData.usd ?? null,
        priceEur: nativePriceData.eur ?? null,
        priceChange24h: typeof nativeChange === 'number' ? nativeChange : null,
        valueUsd: nativePriceData.usd != null ? nativeFormatted * nativePriceData.usd : null,
        valueEur: nativePriceData.eur != null ? nativeFormatted * nativePriceData.eur : null,
      }

      const erc20Tokens: TokenWithPrice[] = erc20WithId
        .filter(t => BigInt(t.balance) > BigInt(0))
        .map(t => {
          const decimals = t.decimals ?? 18
          const balanceBig = BigInt(t.balance)
          const balanceFormatted = parseFloat(formatUnits(balanceBig, decimals))
          const priceData = prices[t.priceCoinId] ?? {}
          const change = priceData[`${currency}_24h_change` as keyof typeof priceData]

          return {
            address: t.address,
            symbol: t.symbol,
            name: t.name,
            decimals,
            balance: balanceBig,
            balanceFormatted,
            logo: t.logo ?? undefined,
            priceCoinId: t.priceCoinId,
            priceUsd: priceData.usd ?? null,
            priceEur: priceData.eur ?? null,
            priceChange24h: typeof change === 'number' ? change : null,
            valueUsd: priceData.usd != null ? balanceFormatted * priceData.usd : null,
            valueEur: priceData.eur != null ? balanceFormatted * priceData.eur : null,
          }
        })

      return [nativeToken, ...erc20Tokens].filter(t => t.balanceFormatted > 0)
    },
  })
}
