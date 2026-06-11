import type { Conversion } from '@/types/portfolio'

/**
 * Enrichit les conversions avec le P&L par jambe.
 *
 * PnL calculé uniquement sur les sorties réalisées (sell, swap_out).
 * Les transfer_out (envois simples) et les entrées n'ont pas de PnL.
 */
export function enrichConversionsWithPnl(
  conversions: Conversion[],
  averageCostBasis: number | null,
): Conversion[] {
  return conversions.map(c => {
    // Vente directe ou sortie swap : PnL = proceeds - coût
    if ((c.type === 'sell' || c.type === 'swap_out') && c.amountOut !== null && averageCostBasis !== null && c.priceAtTime !== null) {
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

    // Entrées : valeur fiat, pas de PnL
    if ((c.type === 'buy' || c.type === 'transfer_in' || c.type === 'swap_in') && c.amountIn !== null && c.priceAtTime !== null) {
      return {
        ...c,
        valueFiat: c.amountIn * c.priceAtTime,
        pnl: null,
        isProfit: null,
      }
    }

    // transfer_out : valeur fiat affichée, aucun PnL
    if (c.type === 'transfer_out' && c.amountOut !== null && c.priceAtTime !== null) {
      return {
        ...c,
        valueFiat: c.amountOut * c.priceAtTime,
        pnl: null,
        isProfit: null,
      }
    }

    return c
  })
}
