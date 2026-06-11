import type { Conversion, CostBasis, InventoryLot } from '@/types/portfolio'

/**
 * Calcule le cost basis en mode FIFO chronologique.
 *
 * Entrées (augmentent le stock) :
 *   buy, transfer_in, swap_in → ajout d'un lot { amount, costPerUnit: priceAtTime }
 *
 * Sorties réalisées (réduisent le stock + génèrent du PnL) :
 *   sell  → proceeds = amountOut × priceAtTime
 *   swap_out → proceeds = counterpartyAmount × priceAtTime de la contrepartie
 *              (si indisponible : amountOut × priceAtTime de l'actif vendu)
 *
 * Sorties non réalisées (réduisent le stock, sans PnL) :
 *   transfer_out → décrément stock FIFO, aucun PnL réalisé
 *
 * Les prix fiat au moment T doivent avoir été enrichis avant d'appeler cette fonction.
 */
export function computeCostBasis(
  conversions: Conversion[],
  currentBalance: number = 0,
  currentPrice: number | null = null,
): CostBasis {
  const sorted = [...conversions].sort((a, b) => {
    if (!a.timestamp) return 1
    if (!b.timestamp) return -1
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })

  const lots: InventoryLot[] = []
  let realizedPnl = 0

  const firstBuyEntry = sorted.find(
    c => (c.type === 'buy' || c.type === 'transfer_in' || c.type === 'swap_in') &&
         (c.amountIn ?? 0) > 0,
  )

  for (const c of sorted) {
    if (c.type === 'buy' || c.type === 'transfer_in' || c.type === 'swap_in') {
      const amount = c.amountIn ?? 0
      const price = c.priceAtTime ?? 0
      if (amount > 0 && price > 0) {
        lots.push({ amount, costPerUnit: price, timestamp: c.timestamp ?? '' })
      }
    } else if (c.type === 'sell' || c.type === 'swap_out' || c.type === 'transfer_out') {
      const amountOut = c.amountOut ?? 0
      if (amountOut <= 0) continue

      const isRealized = c.type === 'sell' || c.type === 'swap_out'

      // Pour un swap_out, les proceeds sont la valeur de l'actif reçu.
      // On ne l'a pas directement, donc on utilise amountOut × priceAtTime comme approximation.
      const proceeds = isRealized && c.priceAtTime !== null
        ? amountOut * c.priceAtTime
        : 0

      realizedPnl += retireFromLots(lots, amountOut, proceeds, isRealized)
    }
  }

  // Calculer les métriques du stock restant
  const totalTokensRemaining = lots.reduce((s, l) => s + l.amount, 0)
  const totalInvested = lots.reduce((s, l) => s + l.amount * l.costPerUnit, 0)
  const averageCostBasis = totalTokensRemaining > 0 ? totalInvested / totalTokensRemaining : null

  return {
    firstBuyTimestamp: firstBuyEntry?.timestamp ?? null,
    firstBuyPrice: firstBuyEntry?.priceAtTime ?? null,
    firstBuyAmount: firstBuyEntry?.amountIn ?? null,
    totalInvested: totalInvested > 0 ? totalInvested : null,
    averageCostBasis,
    realizedPnl,
    lots,
  }
}

/**
 * Retire `amount` tokens des lots selon FIFO.
 * Retourne le PnL réalisé sur cette sortie (0 si transfer_out).
 */
function retireFromLots(
  lots: InventoryLot[],
  amount: number,
  proceeds: number,
  isRealized: boolean,
): number {
  let remaining = amount
  let costRetired = 0

  while (remaining > 0 && lots.length > 0) {
    const lot = lots[0]
    if (lot.amount <= remaining) {
      costRetired += lot.amount * lot.costPerUnit
      remaining -= lot.amount
      lots.shift()
    } else {
      costRetired += remaining * lot.costPerUnit
      lot.amount -= remaining
      remaining = 0
    }
  }

  if (!isRealized) return 0
  // proceeds peut être nul si pas de prix → pas de PnL calculable
  if (proceeds === 0) return 0
  return proceeds - costRetired
}
