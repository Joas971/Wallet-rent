import type { TokenWithPrice } from '@/types/portfolio'

export const DUST_THRESHOLD = 0.5

/** Symboles de tokens légitimes bien connus — ne jamais masquer même si heuristiques déclenchées */
export const WHITELIST_SYMBOLS = new Set([
  'BTC','ETH','BNB','USDT','USDC','BUSD','DAI','WBTC','WETH','WBNB',
  'MATIC','AVAX','FTM','CRO','GLMR','CELO','GNO','MNT','BLAST','xDAI',
  'ARB','OP','LINK','UNI','AAVE','CAKE','SUSHI','CRV','SNX','MKR',
])

const NON_ASCII_RE = /[^\u0000-\u007F]/
const URL_RE = /(\.|https?:|www\.|\.com|\.io|\.net|\.org|\.xyz|\.app)/i

/**
 * Heuristiques de détection spam.
 * Retourne la raison si spam, null si token a priori légitime.
 */
export function spamReason(t: Pick<TokenWithPrice, 'symbol' | 'name'>): string | null {
  const sym  = t.symbol ?? ''
  const name = t.name   ?? ''

  if (WHITELIST_SYMBOLS.has(sym.toUpperCase())) return null

  if (NON_ASCII_RE.test(sym) || NON_ASCII_RE.test(name)) return 'non-ascii'
  if (URL_RE.test(sym) || URL_RE.test(name))              return 'url'
  if (sym.length > 12 || sym.includes(' '))               return 'long-symbol'

  return null
}

/**
 * Détermine si un token doit être masqué par défaut.
 * - Natif (address === 'native') : toujours visible
 * - Heuristiques spam (non-ASCII, URL dans le nom/symbole, symbole suspect) : masqué
 * - Pas de prix DefiLlama : probable spam/airdrop non reconnu → masqué
 * - Valeur < DUST_THRESHOLD : dust négligeable → masqué
 */
export function isUnwanted(t: TokenWithPrice, currency: string): boolean {
  if (t.address === 'native') return false
  if (spamReason(t) !== null) return true

  const value = currency === 'eur' ? t.valueEur : t.valueUsd
  if (t.priceUsd === null && t.priceEur === null) return true
  if (value !== null && value < DUST_THRESHOLD)   return true

  return false
}
