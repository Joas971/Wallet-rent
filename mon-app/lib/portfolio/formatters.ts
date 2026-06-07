/**
 * Formate un montant total en devise (EUR ou USD) — toujours 2 décimales.
 * Utiliser pour les valeurs de portefeuille, P&L, totaux.
 */
export function formatFiat(value: number | null, currency: 'eur' | 'usd', compact = false): string {
  if (value === null) return 'N/A'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    notation: compact ? 'compact' : 'standard',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formate le PRIX d'un token (par unité) en devise — décimales adaptatives.
 * Évite d'afficher "0,00 €" pour les tokens à micro-prix (PEPE, SHIB, etc.).
 *
 * Exemples :
 *   1 234,56 €       → abs >= 1      → 2 décimales
 *   0,0042 €         → abs >= 0.001  → 4 décimales
 *   0,000002800 €    → abs < 0.0001  → 9 décimales
 */
export function formatPrice(value: number | null, currency: 'eur' | 'usd'): string {
  if (value === null) return 'N/A'
  if (value === 0) return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(0)

  const abs = Math.abs(value)
  // Calcule le nombre de décimales pour voir au moins 2 chiffres significatifs
  const decimals = abs >= 1
    ? 2
    : Math.min(Math.ceil(-Math.log10(abs)) + 2, 20)

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formate une quantité de token avec le nombre de décimales adapté.
 */
export function formatTokenAmount(value: number | null, decimals = 6): string {
  if (value === null) return 'N/A'
  if (value === 0) return '0'
  if (value < 0.000001) return '< 0.000001'
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  })
}

/**
 * Formate un pourcentage de P&L.
 */
export function formatPercent(value: number | null): string {
  if (value === null) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)} %`
}

/**
 * Classe CSS Tailwind selon si un gain ou une perte.
 */
export function pnlColor(value: number | null): string {
  if (value === null) return 'text-white/50'
  return value >= 0 ? 'text-emerald-400' : 'text-rose-400'
}
