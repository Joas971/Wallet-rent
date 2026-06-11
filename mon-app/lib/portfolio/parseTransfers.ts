import type { TransferEntry } from '@/app/api/history/route'
import type { Conversion } from '@/types/portfolio'

/**
 * Normalise la réponse Alchemy en liste de Conversion classifiées.
 *
 * Règles de classification par hash :
 *  - external + internal même hash, actif natif → fusionner en un seul mouvement net.
 *    Si montant net ≈ 0 (refund quasi-total) → exclure de l'historique.
 *  - Sortie actif cible + entrée autre actif dans txContext → swap_out
 *  - Entrée actif cible + sortie autre actif dans txContext → swap_in
 *  - Sortie seule (aucune contrepartie trouvée) → transfer_out (pas de PnL)
 *  - Entrée seule → transfer_in
 *
 * @param incoming    Transferts entrants du wallet pour l'actif cible
 * @param outgoing    Transferts sortants du wallet pour l'actif cible
 * @param walletAddress
 * @param txContext   Record<hash, tous les transferts wallet pour cette tx> (multi-actifs)
 * @param targetToken Actif courant visualisé
 */
export function parseTransfers(
  incoming: TransferEntry[],
  outgoing: TransferEntry[],
  walletAddress: string,
  txContext: Record<string, TransferEntry[]> = {},
  targetToken: { address: string | null; isNative: boolean } = { address: null, isNative: true },
): Conversion[] {
  const addr = walletAddress.toLowerCase()

  // ── 1. Filtrer strict par direction wallet ─────────────────────────────────
  const inEntries = incoming.filter(t => t.to?.toLowerCase() === addr)
  const outEntries = outgoing.filter(t => t.from?.toLowerCase() === addr)

  // ── 2. Pour l'actif natif : fusionner external+internal par hash ──────────
  // Un swap DEX typique produit external (ETH sortant) + internal (ETH refund entrant)
  // sur le même hash. On les remplace par un seul mouvement net pour éviter
  // les fausses paires buy/sell.
  const { inFiltered, outFiltered } = mergeNativeInternalExternal(
    inEntries,
    outEntries,
    targetToken.isNative,
  )

  // ── 3. Construire les Conversion de base ─────────────────────────────────
  const inConversions = inFiltered.map(t => baseConversion(t, 'in'))
  const outConversions = outFiltered.map(t => baseConversion(t, 'out'))

  // ── 4. Classifier selon le contexte cross-actifs ─────────────────────────
  const classified = classifyWithContext(
    inConversions,
    outConversions,
    txContext,
    addr,
    targetToken,
  )

  return classified.sort((a, b) => {
    if (!a.timestamp) return 1
    if (!b.timestamp) return -1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function baseConversion(t: TransferEntry, direction: 'in' | 'out'): Conversion {
  return {
    hash: t.hash,
    timestamp: t.timestamp ?? null,
    type: direction === 'in' ? 'transfer_in' : 'transfer_out',
    tokenSymbol: t.asset ?? '',
    tokenAddress: t.contractAddress,
    amountIn: direction === 'in' ? (t.value ?? null) : null,
    amountOut: direction === 'out' ? (t.value ?? null) : null,
    counterpartySymbol: null,
    counterpartyAmount: null,
    priceAtTime: null,
    valueFiat: null,
    pnl: null,
    isProfit: null,
  }
}

/**
 * Pour l'actif natif, regroupe par hash les transferts external et internal.
 * Si un hash a à la fois une sortie external et une entrée internal (refund DEX),
 * on calcule le montant net. Si le net est quasi-nul (≤ 5 % du gross), on supprime
 * les deux (mouvement interne sans intérêt). Sinon on remplace par le net.
 */
function mergeNativeInternalExternal(
  inEntries: TransferEntry[],
  outEntries: TransferEntry[],
  isNative: boolean,
): { inFiltered: TransferEntry[]; outFiltered: TransferEntry[] } {
  if (!isNative) return { inFiltered: inEntries, outFiltered: outEntries }

  // Regrouper par hash
  const inByHash = groupBy(inEntries, t => t.hash)
  const outByHash = groupBy(outEntries, t => t.hash)

  const allHashes = new Set([...Object.keys(inByHash), ...Object.keys(outByHash)])

  const inFiltered: TransferEntry[] = []
  const outFiltered: TransferEntry[] = []

  for (const hash of allHashes) {
    const ins = inByHash[hash] ?? []
    const outs = outByHash[hash] ?? []

    const sumIn = ins.reduce((s, t) => s + (t.value ?? 0), 0)
    const sumOut = outs.reduce((s, t) => s + (t.value ?? 0), 0)

    // Pas de contrepartie native dans la même tx → garder tel quel
    if (ins.length === 0) { outFiltered.push(...outs); continue }
    if (outs.length === 0) { inFiltered.push(...ins); continue }

    const gross = Math.max(sumIn, sumOut)
    const net = sumOut - sumIn // positif = sortie nette

    // Refund quasi-total (≤ 5 % de différence) → exclure
    if (gross > 0 && Math.abs(net) / gross <= 0.05) continue

    // Sinon : conserver uniquement le mouvement net
    if (net > 0) {
      // Sortie nette : on garde le premier `out` en ajustant la valeur
      const representative = { ...outs[0], value: net }
      outFiltered.push(representative)
    } else {
      // Entrée nette
      const representative = { ...ins[0], value: Math.abs(net) }
      inFiltered.push(representative)
    }
  }

  return { inFiltered, outFiltered }
}

/**
 * Analyse le contexte cross-actifs (txContext) pour reclasser les mouvements.
 * Un `transfer_out` de l'actif cible dont la tx contient aussi un `transfer_in`
 * d'un autre actif vers le wallet → swap_out.
 * L'inverse → swap_in.
 */
function classifyWithContext(
  inConversions: Conversion[],
  outConversions: Conversion[],
  txContext: Record<string, TransferEntry[]>,
  addr: string,
  targetToken: { address: string | null; isNative: boolean },
): Conversion[] {
  const result: Conversion[] = []

  for (const c of outConversions) {
    const ctx = txContext[c.hash]
    if (!ctx) { result.push(c); continue }

    // Chercher dans le contexte une jambe entrante d'un autre actif
    const counterpartyIn = ctx.find(t =>
      t.to?.toLowerCase() === addr &&
      !isSameToken(t, targetToken),
    )

    if (counterpartyIn) {
      result.push({
        ...c,
        type: 'swap_out',
        counterpartySymbol: counterpartyIn.asset ?? null,
        counterpartyAmount: counterpartyIn.value ?? null,
      })
    } else {
      result.push(c)
    }
  }

  for (const c of inConversions) {
    const ctx = txContext[c.hash]
    if (!ctx) { result.push(c); continue }

    // Chercher une jambe sortante d'un autre actif
    const counterpartyOut = ctx.find(t =>
      t.from?.toLowerCase() === addr &&
      !isSameToken(t, targetToken),
    )

    if (counterpartyOut) {
      result.push({
        ...c,
        type: 'swap_in',
        counterpartySymbol: counterpartyOut.asset ?? null,
        counterpartyAmount: counterpartyOut.value ?? null,
      })
    } else {
      result.push(c)
    }
  }

  return result
}

function isSameToken(
  t: TransferEntry,
  targetToken: { address: string | null; isNative: boolean },
): boolean {
  if (targetToken.isNative) {
    return t.category === 'external' || t.category === 'internal'
  }
  return t.contractAddress?.toLowerCase() === targetToken.address?.toLowerCase()
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of arr) {
    const k = key(item)
    if (!result[k]) result[k] = []
    result[k].push(item)
  }
  return result
}
