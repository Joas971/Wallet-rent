export interface TokenBalance {
  address: string          // contract address, 'native' for ETH/MATIC etc.
  symbol: string
  name: string
  decimals: number
  balance: bigint
  balanceFormatted: number
  priceCoinId?: string     // DefiLlama coin ID : "chain:0x..." or "chain:0x000...000" for native
  logo?: string
}

export interface TokenWithPrice extends TokenBalance {
  priceUsd: number | null
  priceEur: number | null
  priceChange24h: number | null
  valueUsd: number | null
  valueEur: number | null
}

export interface Conversion {
  hash: string
  timestamp: string | null
  type: 'buy' | 'sell' | 'swap_in' | 'swap_out' | 'transfer_in' | 'transfer_out'
  tokenSymbol: string
  tokenAddress: string | null
  amountIn: number | null
  amountOut: number | null
  /** Symbole de l'actif reçu en échange (pour swap_out) ou envoyé (pour swap_in) */
  counterpartySymbol: string | null
  /** Montant de l'actif contrepartie */
  counterpartyAmount: number | null
  priceAtTime: number | null
  valueFiat: number | null
  pnl: number | null
  isProfit: boolean | null
}

export interface InventoryLot {
  amount: number
  costPerUnit: number
  timestamp: string
}

export interface CostBasis {
  firstBuyTimestamp: string | null
  firstBuyPrice: number | null
  firstBuyAmount: number | null
  /** Coût total du stock restant (lots non encore vendus) */
  totalInvested: number | null
  /** Prix moyen d'achat du stock restant */
  averageCostBasis: number | null
  /** PnL réalisé cumulé sur les sorties (ventes/swaps) */
  realizedPnl: number
  /** Lots FIFO restants (stock) */
  lots: InventoryLot[]
}

export interface TokenDetail {
  token: TokenWithPrice
  costBasis: CostBasis
  currentValue: number | null
  /** PnL total = réalisé + non réalisé */
  pnl: number | null
  pnlPercent: number | null
  /** PnL non réalisé = valeur actuelle - coût du stock restant */
  unrealizedPnl: number | null
  conversions: Conversion[]
}
