import { describe, it, expect } from 'vitest'
import { computeCostBasis } from '../costBasis'
import type { Conversion } from '@/types/portfolio'

function makeConversion(overrides: Partial<Conversion>): Conversion {
  return {
    hash: '0xhash1',
    timestamp: '2024-01-01T00:00:00Z',
    type: 'transfer_in',
    tokenSymbol: 'ETH',
    tokenAddress: null,
    amountIn: null,
    amountOut: null,
    counterpartySymbol: null,
    counterpartyAmount: null,
    priceAtTime: null,
    valueFiat: null,
    pnl: null,
    isProfit: null,
    ...overrides,
  }
}

// ── Achats simples ────────────────────────────────────────────────────────────

describe('computeCostBasis — achats seuls', () => {
  it('un seul achat → lot créé, realizedPnl = 0', () => {
    const conversions = [
      makeConversion({ type: 'buy', amountIn: 2, priceAtTime: 1000, timestamp: '2024-01-01T00:00:00Z' }),
    ]
    const result = computeCostBasis(conversions)
    expect(result.lots).toHaveLength(1)
    expect(result.lots[0].amount).toBe(2)
    expect(result.lots[0].costPerUnit).toBe(1000)
    expect(result.totalInvested).toBe(2000)
    expect(result.averageCostBasis).toBe(1000)
    expect(result.realizedPnl).toBe(0)
  })

  it('deux achats → average cost basis pondéré', () => {
    const conversions = [
      makeConversion({ hash: '0x1', type: 'buy', amountIn: 1, priceAtTime: 1000, timestamp: '2024-01-01T00:00:00Z' }),
      makeConversion({ hash: '0x2', type: 'buy', amountIn: 1, priceAtTime: 3000, timestamp: '2024-02-01T00:00:00Z' }),
    ]
    const result = computeCostBasis(conversions)
    expect(result.averageCostBasis).toBe(2000)
    expect(result.totalInvested).toBe(4000)
  })
})

// ── Ventes (sell) — PnL réalisé ──────────────────────────────────────────────

describe('computeCostBasis — ventes FIFO', () => {
  it('achat à 1000 + vente à 2000 → PnL réalisé = +1000', () => {
    const conversions = [
      makeConversion({ hash: '0x1', type: 'buy',  amountIn: 1, priceAtTime: 1000, timestamp: '2024-01-01T00:00:00Z' }),
      makeConversion({ hash: '0x2', type: 'sell', amountOut: 1, priceAtTime: 2000, timestamp: '2024-06-01T00:00:00Z' }),
    ]
    const result = computeCostBasis(conversions)
    expect(result.realizedPnl).toBeCloseTo(1000)
    // Stock épuisé
    expect(result.lots).toHaveLength(0)
    expect(result.totalInvested).toBeNull()
  })

  it('vente partielle FIFO : 2 ETH achetés à 1000, 1 vendu à 1500 → PnL = +500', () => {
    const conversions = [
      makeConversion({ hash: '0x1', type: 'buy',  amountIn: 2, priceAtTime: 1000, timestamp: '2024-01-01T00:00:00Z' }),
      makeConversion({ hash: '0x2', type: 'sell', amountOut: 1, priceAtTime: 1500, timestamp: '2024-06-01T00:00:00Z' }),
    ]
    const result = computeCostBasis(conversions)
    expect(result.realizedPnl).toBeCloseTo(500)
    // 1 ETH restant au coût de 1000
    expect(result.lots).toHaveLength(1)
    expect(result.lots[0].amount).toBeCloseTo(1)
    expect(result.totalInvested).toBeCloseTo(1000)
  })

  it('deux lots FIFO : lot 1 à 500, lot 2 à 2000, vente de 1.5 → retire lot1 complet + 0.5 lot2', () => {
    const conversions = [
      makeConversion({ hash: '0x1', type: 'buy',  amountIn: 1,   priceAtTime: 500,  timestamp: '2024-01-01T00:00:00Z' }),
      makeConversion({ hash: '0x2', type: 'buy',  amountIn: 1,   priceAtTime: 2000, timestamp: '2024-03-01T00:00:00Z' }),
      makeConversion({ hash: '0x3', type: 'sell', amountOut: 1.5, priceAtTime: 1000, timestamp: '2024-06-01T00:00:00Z' }),
    ]
    // cost retired = 1*500 + 0.5*2000 = 1500
    // proceeds = 1.5 * 1000 = 1500
    // pnl = 0
    const result = computeCostBasis(conversions)
    expect(result.realizedPnl).toBeCloseTo(0)
    expect(result.lots).toHaveLength(1)
    expect(result.lots[0].amount).toBeCloseTo(0.5)
    expect(result.lots[0].costPerUnit).toBe(2000)
  })
})

// ── Swaps (swap_out) ──────────────────────────────────────────────────────────

describe('computeCostBasis — swaps', () => {
  it('swap_out traité comme une vente réalisée', () => {
    const conversions = [
      makeConversion({ hash: '0x1', type: 'buy',      amountIn: 1,  priceAtTime: 1000, timestamp: '2024-01-01T00:00:00Z' }),
      makeConversion({ hash: '0x2', type: 'swap_out', amountOut: 1, priceAtTime: 1500, timestamp: '2024-06-01T00:00:00Z', counterpartySymbol: 'USDC', counterpartyAmount: 1500 }),
    ]
    const result = computeCostBasis(conversions)
    expect(result.realizedPnl).toBeCloseTo(500)
    expect(result.lots).toHaveLength(0)
  })
})

// ── Envoi simple (transfer_out) — PAS de PnL ────────────────────────────────

describe('computeCostBasis — envoi simple', () => {
  it('transfer_out ne génère pas de PnL réalisé', () => {
    const conversions = [
      makeConversion({ hash: '0x1', type: 'buy',          amountIn: 1,  priceAtTime: 1000, timestamp: '2024-01-01T00:00:00Z' }),
      makeConversion({ hash: '0x2', type: 'transfer_out', amountOut: 0.5, priceAtTime: 2000, timestamp: '2024-06-01T00:00:00Z' }),
    ]
    const result = computeCostBasis(conversions)
    // Pas de PnL réalisé malgré le mouvement
    expect(result.realizedPnl).toBe(0)
    // Stock réduit de 0.5 ETH
    expect(result.lots[0].amount).toBeCloseTo(0.5)
  })
})

// ── Réception (transfer_in) — augmente le stock ──────────────────────────────

describe('computeCostBasis — réception', () => {
  it('transfer_in augmente le stock au prix courant', () => {
    const conversions = [
      makeConversion({ hash: '0x1', type: 'transfer_in', amountIn: 2, priceAtTime: 800, timestamp: '2024-01-01T00:00:00Z' }),
    ]
    const result = computeCostBasis(conversions)
    expect(result.lots).toHaveLength(1)
    expect(result.lots[0].amount).toBe(2)
    expect(result.totalInvested).toBe(1600)
    expect(result.realizedPnl).toBe(0)
  })
})

// ── PnL non réalisé ──────────────────────────────────────────────────────────

describe('PnL non réalisé', () => {
  it('stock restant valorisé au prix actuel', () => {
    const conversions = [
      makeConversion({ hash: '0x1', type: 'buy', amountIn: 1, priceAtTime: 1000, timestamp: '2024-01-01T00:00:00Z' }),
    ]
    const result = computeCostBasis(conversions, 1, 2000)
    // unrealizedPnl = 1 * 2000 - 1000 = 1000 (calculé en dehors de costBasis, par useTokenDetail)
    // Ici on vérifie que les lots sont corrects pour permettre ce calcul
    expect(result.totalInvested).toBe(1000)
    expect(result.averageCostBasis).toBe(1000)
  })
})
