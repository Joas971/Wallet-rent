import type { Conversion } from '@/types/portfolio'

/**
 * Enrichit les conversions avec le P&L par jambe :
 * - Pour un sell : pnl = amountOut * priceAtTime - (amountOut / totalBought) * totalInvested
 * - Pour un buy  : pnl = null (on ne réalise pas de gain sur un achat)
 * Retourne les conversions enrichies.
 */
export function enrichConversionsWithPnl(
  conversions: Conversion[],
  averageCostBasis: number | null,
): Conversion[] {
  return conversions.map(c => {
    if ((c.type === 'sell' || c.type === 'transfer_out') && c.amountOut !== null && averageCostBasis !== null && c.priceAtTime !== null) {
      const proceeds = c.amountOut * c.priceAtTime
      const cost = c.amountOut * averageCostBasis
      const pnl = proceeds - cost
      return {
        ...c,
        valueFiat: proceeds,
        pnl,
        isProfit: pnl >= 0,
      }
    }
    if ((c.type === 'buy' || c.type === 'transfer_in') && c.amountIn !== null && c.priceAtTime !== null) {
      return {
        ...c,
        valueFiat: c.amountIn * c.priceAtTime,
        pnl: null,
        isProfit: null,
      }
    }
    return c
  })
}
