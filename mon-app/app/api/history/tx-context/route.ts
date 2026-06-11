import { NextRequest } from 'next/server'
import type { TransferEntry } from '@/app/api/history/route'

const ALCHEMY_NETWORK: Record<number, string> = {
  1:      'eth-mainnet',
  137:    'polygon-mainnet',
  42161:  'arb-mainnet',
  10:     'opt-mainnet',
  8453:   'base-mainnet',
  56:     'bnb-mainnet',
  43114:  'avax-mainnet',
  324:    'zksync-mainnet',
  59144:  'linea-mainnet',
  534352: 'scroll-mainnet',
}

type RawTransfer = {
  blockNum: string
  hash: string
  from: string
  to: string
  value: number | null
  asset: string
  rawContract: { address?: string } | null
  category: string
  metadata: { blockTimestamp?: string } | null
}

function mapTransfer(t: RawTransfer): TransferEntry {
  return {
    blockNum: t.blockNum,
    hash: t.hash,
    from: t.from,
    to: t.to,
    value: t.value ?? null,
    asset: t.asset ?? '',
    contractAddress: t.rawContract?.address ?? null,
    category: t.category ?? '',
    timestamp: t.metadata?.blockTimestamp,
  }
}

/**
 * Récupère tous les transferts wallet impliqués dans une liste de tx hashes,
 * sans filtre sur l'actif ni la direction. Retourne un Record<hash, TransferEntry[]>
 * qui contient toutes les jambes du wallet (in et out, tous tokens).
 *
 * Utilisé par parseTransfers pour détecter les swaps cross-actifs :
 * si un hash sortant ETH a aussi un entrant USDC → c'est un swap, pas une vente.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chainId = Number(searchParams.get('chainId') ?? 1)
  const wallet = searchParams.get('wallet')
  const hashesParam = searchParams.get('hashes') // CSV

  if (!wallet) {
    return Response.json({ error: 'Missing wallet' }, { status: 400 })
  }
  if (!hashesParam) {
    return Response.json({})
  }

  const apiKey = process.env.ALCHEMY_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Alchemy API key not configured' }, { status: 503 })
  }

  const network = ALCHEMY_NETWORK[chainId]
  if (!network) {
    return Response.json({ error: `Chain ${chainId} not supported` }, { status: 400 })
  }

  const url = `https://${network}.g.alchemy.com/v2/${apiKey}`
  const hashes = hashesParam.split(',').filter(Boolean).slice(0, 100)

  try {
    // Deux requêtes parallèles : entrées et sorties du wallet, sans filtre contract
    const buildParams = (direction: 'from' | 'to') => ({
      jsonrpc: '2.0',
      id: direction === 'from' ? 1 : 2,
      method: 'alchemy_getAssetTransfers',
      params: [{
        [direction === 'from' ? 'fromAddress' : 'toAddress']: wallet,
        category: ['erc20', 'external', 'internal'],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: '0x3e8',
        order: 'desc',
      }],
    })

    const [inRes, outRes] = await Promise.all([
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildParams('to')) }),
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildParams('from')) }),
    ])

    const [inData, outData] = await Promise.all([inRes.json(), outRes.json()])

    const allTransfers: TransferEntry[] = [
      ...(inData?.result?.transfers ?? []).map(mapTransfer),
      ...(outData?.result?.transfers ?? []).map(mapTransfer),
    ]

    const hashSet = new Set(hashes)

    // Grouper par hash, en ne gardant que les hashes demandés
    const result: Record<string, TransferEntry[]> = {}
    for (const t of allTransfers) {
      if (!hashSet.has(t.hash)) continue
      if (!result[t.hash]) result[t.hash] = []
      // Éviter les doublons (même hash peut apparaître dans in ET out)
      if (!result[t.hash].some(existing => existing.hash === t.hash && existing.category === t.category && existing.from === t.from && existing.to === t.to && existing.asset === t.asset)) {
        result[t.hash].push(t)
      }
    }

    return Response.json(result)
  } catch {
    return Response.json({ error: 'Failed to fetch tx context' }, { status: 500 })
  }
}
