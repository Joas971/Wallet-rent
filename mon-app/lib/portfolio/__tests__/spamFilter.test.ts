import { describe, it, expect } from 'vitest'
import { spamReason, isUnwanted, DUST_THRESHOLD } from '../spamFilter'
import type { TokenWithPrice } from '@/types/portfolio'

function makeToken(overrides: Partial<TokenWithPrice>): TokenWithPrice {
  return {
    address: '0xabc',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
    balance: 1000000000000000000n,
    balanceFormatted: 1,
    priceUsd: 10,
    priceEur: 9,
    priceChange24h: null,
    valueUsd: 10,
    valueEur: 9,
    ...overrides,
  }
}

// ── spamReason ────────────────────────────────────────────────────────────────

describe('spamReason', () => {
  it('token légitime connu → null', () => {
    expect(spamReason({ symbol: 'ETH',  name: 'Ethereum' })).toBeNull()
    expect(spamReason({ symbol: 'BNB',  name: 'BNB' })).toBeNull()
    expect(spamReason({ symbol: 'USDT', name: 'Tether' })).toBeNull()
  })

  it('symbole en caractères chinois (比特币) → non-ascii', () => {
    expect(spamReason({ symbol: '比特币', name: 'Bitcoin CN' })).toBe('non-ascii')
  })

  it('nom en caractères non-ASCII → non-ascii', () => {
    expect(spamReason({ symbol: 'FAKE', name: '比特币 BTC' })).toBe('non-ascii')
  })

  it('caractères cyrilliques → non-ascii', () => {
    expect(spamReason({ symbol: 'КРИПТО', name: 'Crypto RU' })).toBe('non-ascii')
  })

  it('URL dans le nom → url', () => {
    expect(spamReason({ symbol: 'FREE', name: 'Visit freecoin.io to claim' })).toBe('url')
  })

  it('URL dans le symbole → url', () => {
    expect(spamReason({ symbol: 'FREE.IO', name: 'Free Token' })).toBe('url')
  })

  it('www. dans le nom → url', () => {
    expect(spamReason({ symbol: 'AIRDROP', name: 'Claim at www.airdrop.com' })).toBe('url')
  })

  it('symbole trop long (> 12 chars) → long-symbol', () => {
    expect(spamReason({ symbol: 'AVERYLONGSYMBOL', name: 'Some Token' })).toBe('long-symbol')
  })

  it('symbole avec espace → long-symbol', () => {
    expect(spamReason({ symbol: 'FREE TOKEN', name: 'Free Token' })).toBe('long-symbol')
  })

  it('token légitime inconnu mais valide → null', () => {
    expect(spamReason({ symbol: 'PEPE', name: 'Pepe' })).toBeNull()
    expect(spamReason({ symbol: 'SHIB', name: 'Shiba Inu' })).toBeNull()
  })
})

// ── isUnwanted ────────────────────────────────────────────────────────────────

describe('isUnwanted', () => {
  it('token natif (address=native) → jamais indésirable', () => {
    const t = makeToken({ address: 'native', symbol: 'ETH', priceUsd: null, priceEur: null })
    expect(isUnwanted(t, 'usd')).toBe(false)
  })

  it('token avec caractères chinois → indésirable même avec prix', () => {
    const t = makeToken({ symbol: '比特币', name: 'Bitcoin CN', priceUsd: 50000, valueUsd: 5000 })
    expect(isUnwanted(t, 'usd')).toBe(true)
  })

  it('token sans prix DefiLlama → indésirable', () => {
    const t = makeToken({ priceUsd: null, priceEur: null, valueUsd: null, valueEur: null })
    expect(isUnwanted(t, 'usd')).toBe(true)
  })

  it(`valeur < ${DUST_THRESHOLD} USD → dust`, () => {
    const t = makeToken({ priceUsd: 0.001, valueUsd: 0.001 })
    expect(isUnwanted(t, 'usd')).toBe(true)
  })

  it('token légitime avec prix et valeur correcte → visible', () => {
    const t = makeToken({ symbol: 'CAKE', name: 'PancakeSwap', priceUsd: 2, valueUsd: 20 })
    expect(isUnwanted(t, 'usd')).toBe(false)
  })

  it('token URL spam → indésirable même avec valeur élevée', () => {
    const t = makeToken({ symbol: 'CLAIM', name: 'Go to claim.io', priceUsd: 1000, valueUsd: 10000 })
    expect(isUnwanted(t, 'usd')).toBe(true)
  })
})
