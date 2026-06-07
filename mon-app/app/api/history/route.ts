import { NextRequest } from 'next/server'

// Maps chainId → Alchemy network slug
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

export interface TransferEntry {
  blockNum: string
  hash: string
  from: string
  to: string
  value: number | null
  asset: string
  contractAddress: string | null
  category: string
  timestamp?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const chainId = Number(searchParams.get('chainId') ?? 1)
  const wallet = searchParams.get('wallet')
  const token = searchParams.get('token') // optional contract address

  if (!wallet) {
    return Response.json({ error: 'Missing wallet parameter' }, { status: 400 })
  }

  const apiKey = process.env.ALCHEMY_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'Alchemy API key not configured' }, { status: 503 })
  }

  const network = ALCHEMY_NETWORK[chainId]
  if (!network) {
    return Response.json({ error: `Chain ${chainId} not supported for history` }, { status: 400 })
  }

  const url = `https://${network}.g.alchemy.com/v2/${apiKey}`

  const buildParams = (direction: 'from' | 'to') => ({
    jsonrpc: '2.0',
    id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [{
      [direction === 'from' ? 'fromAddress' : 'toAddress']: wallet,
      ...(token ? { contractAddresses: [token] } : {}),
      // Pour un token ERC-20 : uniquement les transferts du contrat.
      // Pour le token natif : uniquement external (transactions ETH directes)
      // et internal (ETH reçu via contrat, ex: refund Uniswap).
      // Ne PAS inclure 'erc20' pour le natif — cela injecterait toutes les
      // transactions de tokens ERC-20 du wallet dans l'historique ETH.
      category: token ? ['erc20'] : ['external', 'internal'],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: '0x3e8',
      order: 'desc',
    }],
  })

  try {
    const [inRes, outRes] = await Promise.all([
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildParams('to')) }),
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildParams('from')) }),
    ])

    const [inData, outData] = await Promise.all([inRes.json(), outRes.json()])

    type RawTransfer = {
      blockNum: string; hash: string; from: string; to: string
      value: number | null; asset: string
      rawContract: { address?: string } | null
      category: string; metadata: { blockTimestamp?: string } | null
    }

    const mapTransfer = (t: RawTransfer): TransferEntry => ({
      blockNum: t.blockNum,
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value ?? null,
      asset: t.asset ?? '',
      contractAddress: t.rawContract?.address ?? null,
      category: t.category ?? '',
      timestamp: t.metadata?.blockTimestamp,
    })

    const incoming: TransferEntry[] = (inData?.result?.transfers ?? []).map(mapTransfer)
    const outgoing: TransferEntry[] = (outData?.result?.transfers ?? []).map(mapTransfer)

    return Response.json({ incoming, outgoing })
  } catch {
    return Response.json({ error: 'Failed to fetch transfer history' }, { status: 500 })
  }
}
