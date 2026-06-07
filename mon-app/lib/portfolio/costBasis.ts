import type { Conversion, CostBasis } from '@/types/portfolio'

/**
 * Calcule le coût de revient (FIFO simplifié) à partir de la liste de conversions.
 * Les prix fiat au moment T doivent avoir été enrichis avant d'appeler cette fonction.
 * Si priceAtTime est null, la conversion est ignorée dans le calcul.
 */
export function computeCostBasis(conversions: Conversion[]): CostBasis {
  // Sort ascending to process chronologically
  const sorted = [...conversions].sort((a, b) => {
    if (!a.timestamp) return 1
    if (!b.timestamp) return -1
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })

  const buys = sorted.filter(c => c.type === 'buy' || c.type === 'transfer_in')

  const firstBuy = buys[0] ?? null

  let totalTokensBought = 0
  let totalFiatSpent = 0

  for (const c of buys) {
    const amount = c.amountIn ?? 0
    const price = c.priceAtTime ?? 0
    if (amount > 0 && price > 0) {
      totalTokensBought += amount
      totalFiatSpent += amount * price
    }
  }

  return {
    firstBuyTimestamp: firstBuy?.timestamp ?? null,
    firstBuyPrice: firstBuy?.priceAtTime ?? null,
    firstBuyAmount: firstBuy?.amountIn ?? null,
    totalInvested: totalFiatSpent > 0 ? totalFiatSpent : null,
    averageCostBasis: totalTokensBought > 0 ? totalFiatSpent / totalTokensBought : null,
  }
}
