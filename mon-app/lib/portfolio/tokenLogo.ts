import { getAddress } from 'viem'

/**
 * Résolution des logos de tokens via plusieurs sources en cascade :
 * 1. Logo fourni par le provider (Alchemy/Ankr)
 * 2. Trust Wallet Assets CDN (fiable pour la majorité des tokens listés)
 * 3. Initiales affichées par le composant TokenIcon (fallback final)
 */

/** Slugs blockchain Trust Wallet par chainId */
const TRUST_WALLET_CHAIN: Record<number, string> = {
  1:      'ethereum',
  56:     'smartchain',
  137:    'polygon',
  42161:  'arbitrum',
  10:     'optimism',
  8453:   'base',
  43114:  'avalanchec',
  324:    'zksync',
  59144:  'linea',
  534352: 'scroll',
  250:    'fantom',
  100:    'xdai',
  42220:  'celo',
  1284:   'moonbeam',
  25:     'cronos',
  5000:   'mantle',
  81457:  'blast',
}

/**
 * URL Trust Wallet CDN pour un token.
 * - Token natif : logo de la chaîne (`/info/logo.png`)
 * - ERC-20 : logo via l'adresse checksummée EIP-55 (`/assets/{addr}/logo.png`)
 */
export function getTrustWalletLogoUrl(chainId: number, address: string): string | null {
  const blockchain = TRUST_WALLET_CHAIN[chainId]
  if (!blockchain) return null

  if (address === 'native') {
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${blockchain}/info/logo.png`
  }

  try {
    const checksummed = getAddress(address)
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${blockchain}/assets/${checksummed}/logo.png`
  } catch {
    return null
  }
}

/**
 * Retourne la liste ordonnée des URLs à tenter pour afficher le logo d'un token.
 * Le composant essaie chaque URL dans l'ordre et tombe sur les initiales en dernier recours.
 */
export function getLogoSources(
  chainId: number,
  address: string,
  providerLogo: string | null | undefined,
): string[] {
  const sources: string[] = []
  if (providerLogo) sources.push(providerLogo)
  const tw = getTrustWalletLogoUrl(chainId, address)
  if (tw) sources.push(tw)
  return sources
}
