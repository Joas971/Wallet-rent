import { describe, it, expect } from 'vitest'
import { parseTransfers } from '../parseTransfers'
import type { TransferEntry } from '@/app/api/history/route'

const WALLET = '0xabc000000000000000000000000000000000000a'
const OTHER  = '0xdef000000000000000000000000000000000000b'

function makeEntry(overrides: Partial<TransferEntry>): TransferEntry {
  return {
    blockNum: '0x1',
    hash: '0xhash1',
    from: OTHER,
    to: WALLET,
    value: 1,
    asset: 'ETH',
    contractAddress: null,
    category: 'external',
    timestamp: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── parseTransfers — cas de base ─────────────────────────────────────────────

describe('parseTransfers — sans contexte', () => {
  it('entrée simple → transfer_in', () => {
    const inc = [makeEntry({ to: WALLET })]
    const result = parseTransfers(inc, [], WALLET)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('transfer_in')
    expect(result[0].amountIn).toBe(1)
    expect(result[0].pnl).toBeNull()
  })

  it('sortie simple → transfer_out (pas de PnL)', () => {
    const out = [makeEntry({ from: WALLET, to: OTHER })]
    const result = parseTransfers([], out, WALLET)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('transfer_out')
    expect(result[0].amountOut).toBe(1)
    expect(result[0].pnl).toBeNull()
  })

  it('filtre les entrees dont le destinataire nest pas le wallet', () => {
    const inc = [makeEntry({ to: OTHER })]
    const result = parseTransfers(inc, [], WALLET)
    expect(result).toHaveLength(0)
  })
})

// ── Fusion external + internal (actif natif ETH) ─────────────────────────────

describe('parseTransfers — fusion internal/external natif', () => {
  it('external out + internal in quasi-total (refund DEX) → exclu', () => {
    const hash = '0xswaphash'
    // Sortie ETH externe : 1.0 ETH
    const out = [makeEntry({ hash, from: WALLET, to: OTHER, value: 1.0, category: 'external' })]
    // Retour internal : 0.98 ETH (2% de slippage → ≤5% donc refund total)
    const inc = [makeEntry({ hash, from: OTHER, to: WALLET, value: 0.98, category: 'internal' })]

    const result = parseTransfers(inc, out, WALLET, {}, { address: null, isNative: true })
    // Différence = 0.02 / 1.0 = 2% → doit être exclu
    expect(result).toHaveLength(0)
  })

  it('external out + internal in partiel (vrai swap) → sortie nette conservée', () => {
    const hash = '0xswaphash2'
    // Sortie : 1.0 ETH, retour partiel : 0.3 ETH → net = 0.7 ETH sortant (70% > 5%)
    const out = [makeEntry({ hash, from: WALLET, to: OTHER, value: 1.0, category: 'external' })]
    const inc = [makeEntry({ hash, from: OTHER, to: WALLET, value: 0.3, category: 'internal' })]

    const result = parseTransfers(inc, out, WALLET, {}, { address: null, isNative: true })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('transfer_out')
    expect(result[0].amountOut).toBeCloseTo(0.7)
  })
})

// ── Détection swap via txContext ─────────────────────────────────────────────

describe('parseTransfers — détection swap avec txContext', () => {
  it('sortie ETH + entrée USDC dans le contexte → swap_out avec contrepartie', () => {
    const hash = '0xswaptx'
    const outgoing = [makeEntry({ hash, from: WALLET, to: OTHER, value: 0.5, asset: 'ETH', category: 'external' })]

    const txContext: Record<string, TransferEntry[]> = {
      [hash]: [
        // Jambe USDC reçue lors du swap
        makeEntry({
          hash,
          from: '0xuniswap',
          to: WALLET,
          value: 1200,
          asset: 'USDC',
          contractAddress: '0xusdc',
          category: 'erc20',
        }),
      ],
    }

    const result = parseTransfers([], outgoing, WALLET, txContext, { address: null, isNative: true })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('swap_out')
    expect(result[0].counterpartySymbol).toBe('USDC')
    expect(result[0].counterpartyAmount).toBe(1200)
  })

  it('entrée ETH + sortie USDC dans le contexte → swap_in', () => {
    const hash = '0xswaptx2'
    const incoming = [makeEntry({ hash, from: OTHER, to: WALLET, value: 0.5, asset: 'ETH', category: 'external' })]

    const txContext: Record<string, TransferEntry[]> = {
      [hash]: [
        makeEntry({
          hash,
          from: WALLET,
          to: '0xuniswap',
          value: 1200,
          asset: 'USDC',
          contractAddress: '0xusdc',
          category: 'erc20',
        }),
      ],
    }

    const result = parseTransfers(incoming, [], WALLET, txContext, { address: null, isNative: true })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('swap_in')
    expect(result[0].counterpartySymbol).toBe('USDC')
  })

  it('sortie sans contrepartie dans le contexte → reste transfer_out', () => {
    const hash = '0xsendhash'
    const outgoing = [makeEntry({ hash, from: WALLET, to: OTHER, value: 0.1, category: 'external' })]
    const txContext: Record<string, TransferEntry[]> = { [hash]: [] }

    const result = parseTransfers([], outgoing, WALLET, txContext, { address: null, isNative: true })
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('transfer_out')
  })
})
