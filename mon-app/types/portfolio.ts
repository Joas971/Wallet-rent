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
  type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out'
  tokenSymbol: string
  tokenAddress: string | null
  amountIn: number | null
  amountOut: number | null
  priceAtTime: number | null   // USD price at time of tx
  valueFiat: number | null
  pnl: number | null           // in USD, null if not enough data
  isProfit: boolean | null
}

export interface CostBasis {
  firstBuyTimestamp: string | null
  firstBuyPrice: number | null    // USD
  firstBuyAmount: number | null
  totalInvested: number | null    // weighted average cost basis in USD
  averageCostBasis: number | null // per token in USD
}

export interface TokenDetail {
  token: TokenWithPrice
  costBasis: CostBasis
  currentValue: number | null      // USD
  pnl: number | null               // USD
  pnlPercent: number | null
  conversions: Conversion[]
}
