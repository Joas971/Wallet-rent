import type { TransferEntry } from '@/app/api/history/route'
import type { Conversion } from '@/types/portfolio'

/**
 * Normalise la réponse Alchemy en liste de Conversion utilisables par costBasis.
 * Le prix fiat au moment T n'est pas fourni par Alchemy — il sera enrichi
 * ultérieurement via /api/prices/historical (DefiLlama historical).
 */
export function parseTransfers(
  incoming: TransferEntry[],
  outgoing: TransferEntry[],
  walletAddress: string,
): Conversion[] {
  const addr = walletAddress.toLowerCase()

  const mapEntry = (t: TransferEntry, direction: 'in' | 'out'): Conversion => ({
    hash: t.hash,
    timestamp: t.timestamp ?? null,
    type: direction === 'in' ? 'transfer_in' : 'transfer_out',
    tokenSymbol: t.asset ?? '',
    tokenAddress: t.contractAddress,
    amountIn: direction === 'in' ? (t.value ?? null) : null,
    amountOut: direction === 'out' ? (t.value ?? null) : null,
    priceAtTime: null,
    valueFiat: null,
    pnl: null,
    isProfit: null,
  })

  const inConversions = incoming
    .filter(t => t.to?.toLowerCase() === addr)
    .map(t => mapEntry(t, 'in'))

  const outConversions = outgoing
    .filter(t => t.from?.toLowerCase() === addr)
    .map(t => mapEntry(t, 'out'))

  // Merge and sort by timestamp desc, treat same-hash pairs as swaps
  const all = [...inConversions, ...outConversions]

  // Pair swaps: if a hash appears in both in and out, mark them as buy/sell
  const hashCounts = new Map<string, number>()
  all.forEach(c => hashCounts.set(c.hash, (hashCounts.get(c.hash) ?? 0) + 1))

  return all
    .map(c => {
      if (hashCounts.get(c.hash) === 2) {
        return { ...c, type: c.type === 'transfer_in' ? 'buy' as const : 'sell' as const }
      }
      return c
    })
    .sort((a, b) => {
      if (!a.timestamp) return 1
      if (!b.timestamp) return -1
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
}
