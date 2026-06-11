'use client'

import { useState } from 'react'
import type { Conversion } from '@/types/portfolio'
import { useFiat } from '@/providers/FiatProvider'
import { formatFiat, formatTokenAmount, pnlColor } from '@/lib/portfolio/formatters'

/** URL de l'explorateur de transactions par chainId */
const EXPLORER: Record<number, string> = {
  1:      'https://etherscan.io',
  137:    'https://polygonscan.com',
  42161:  'https://arbiscan.io',
  10:     'https://optimistic.etherscan.io',
  8453:   'https://basescan.org',
  56:     'https://bscscan.com',
  43114:  'https://snowtrace.io',
  324:    'https://explorer.zksync.io',
  59144:  'https://lineascan.build',
  534352: 'https://scrollscan.com',
  250:    'https://ftmscan.com',
  100:    'https://gnosisscan.io',
  42220:  'https://celoscan.io',
  1284:   'https://moonbeam.moonscan.io',
  25:     'https://cronoscan.com',
  5000:   'https://explorer.mantle.xyz',
  81457:  'https://blastscan.io',
}

const TYPE_CONFIG: Record<string, { label: string; pill: string; row: string; dot: string }> = {
  buy: {
    label: 'Achat',
    pill: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    row: 'border-l-emerald-500/50',
    dot: 'bg-emerald-400',
  },
  sell: {
    label: 'Vente',
    pill: 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30',
    row: 'border-l-rose-500/50',
    dot: 'bg-rose-400',
  },
  swap_in: {
    label: 'Swap reçu',
    pill: 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30',
    row: 'border-l-violet-500/50',
    dot: 'bg-violet-400',
  },
  swap_out: {
    label: 'Swap envoyé',
    pill: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30',
    row: 'border-l-violet-400/40',
    dot: 'bg-violet-300',
  },
  transfer_in: {
    label: 'Réception',
    pill: 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30',
    row: 'border-l-cyan-500/50',
    dot: 'bg-cyan-400',
  },
  transfer_out: {
    label: 'Envoi',
    pill: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
    row: 'border-l-amber-500/50',
    dot: 'bg-amber-400',
  },
}

const FALLBACK_CONFIG = {
  label: 'Autre',
  pill: 'bg-white/10 text-white/50 ring-1 ring-white/10',
  row: 'border-l-white/10',
  dot: 'bg-white/30',
}

interface Props {
  conversions: Conversion[]
  symbol: string
  chainId?: number
}

function SummaryChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white/[0.025] px-4 py-2.5 min-w-[80px]">
      <span className={`text-base font-bold tabular-nums ${accent ?? 'text-white'}`}>{value}</span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">{label}</span>
    </div>
  )
}

/** Légende des types de mouvements */
function Legend() {
  const items = [
    { dot: 'bg-emerald-400', label: 'Achat' },
    { dot: 'bg-rose-400',    label: 'Vente' },
    { dot: 'bg-violet-400',  label: 'Swap (échange)' },
    { dot: 'bg-cyan-400',    label: 'Réception' },
    { dot: 'bg-amber-400',   label: 'Envoi' },
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/[0.04] px-5 py-2.5">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1.5 text-[11px] text-white/30">
          <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

export function ConversionsTable({ conversions, symbol, chainId = 1 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const { currency } = useFiat()

  const explorerBase = EXPLORER[chainId] ?? 'https://etherscan.io'
  const displayed = expanded ? conversions : conversions.slice(0, 8)

  const totalPnl = conversions.reduce((acc, c) => acc + (c.pnl ?? 0), 0)
  const buys  = conversions.filter(c => c.type === 'buy').length
  const sells = conversions.filter(c => c.type === 'sell').length
  const swaps = conversions.filter(c => c.type === 'swap_in' || c.type === 'swap_out').length
  const ins   = conversions.filter(c => c.type === 'transfer_in').length
  const outs  = conversions.filter(c => c.type === 'transfer_out').length

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015]">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
            <svg className="h-5 w-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Historique des mouvements</h3>
            <p className="text-xs text-white/40">
              {conversions.length} opération{conversions.length !== 1 ? 's' : ''} détectée{conversions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Bouton légende */}
          <button
            onClick={() => setShowLegend(v => !v)}
            title="Afficher la légende"
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs transition ${showLegend ? 'bg-white/10 text-white/60' : 'text-white/20 hover:bg-white/[0.04] hover:text-white/40'}`}
          >
            ?
          </button>

          <button
            onClick={() => setExpanded(v => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/[0.04]"
          >
            <svg
              className={`h-5 w-5 text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Légende (masquée par défaut) */}
      {showLegend && <Legend />}

      {conversions.length === 0 && (
        <p className="border-t border-white/[0.06] px-5 py-8 text-center text-sm text-white/30">
          Aucun historique trouvé pour ce token sur ce réseau.
        </p>
      )}

      {conversions.length > 0 && (
        <>
          {/* ── Statistiques rapides ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-5 py-3">
            {buys  > 0 && <SummaryChip label="Achats"   value={String(buys)}  accent="text-emerald-400" />}
            {sells > 0 && <SummaryChip label="Ventes"   value={String(sells)} accent="text-rose-400" />}
            {swaps > 0 && <SummaryChip label="Swaps"    value={String(swaps)} accent="text-violet-400" />}
            {ins   > 0 && <SummaryChip label="Reçus"    value={String(ins)}   accent="text-cyan-400" />}
            {outs  > 0 && <SummaryChip label="Envoyés"  value={String(outs)}  accent="text-amber-400" />}

            {/* P&L réalisé des mouvements visibles */}
            <div className="ml-auto flex flex-col items-end rounded-xl bg-white/[0.025] px-4 py-2.5">
              <span className={`text-base font-bold tabular-nums ${pnlColor(totalPnl)}`}>
                {totalPnl !== 0 ? `${totalPnl >= 0 ? '+' : ''}${formatFiat(totalPnl, currency)}` : '—'}
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-white/30">P&amp;L réalisé</span>
            </div>
          </div>

          {/* ── Table ─────────────────────────────────────────────────── */}
          <div className="overflow-x-auto border-t border-white/[0.06]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.015]">
                  <th className="w-1" />
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-white/25">Date</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-white/25">Type</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-white/25">Quantité</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-white/25">Valeur</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-white/25">
                    P&amp;L <span className="normal-case text-white/15">(réalisé)</span>
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-widest text-white/25">Tx</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((c, i) => {
                  const cfg = TYPE_CONFIG[c.type] ?? FALLBACK_CONFIG
                  const amount = c.amountIn ?? c.amountOut

                  return (
                    <tr
                      key={`${c.hash}-${i}`}
                      className={`border-l-2 transition-colors duration-100 hover:bg-white/[0.025] ${cfg.row} ${
                        i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'
                      }`}
                    >
                      {/* Point de couleur */}
                      <td className="pl-3 pr-0">
                        <span className={`block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      </td>

                      {/* Date */}
                      <td className="whitespace-nowrap px-4 py-3 text-white/50">
                        {c.timestamp
                          ? new Date(c.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                          : <span className="text-white/20">N/A</span>}
                      </td>

                      {/* Badge de type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.pill}`}>
                          {cfg.label}
                        </span>
                      </td>

                      {/* Quantité + contrepartie swap */}
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className="font-medium text-white">
                          {amount !== null ? formatTokenAmount(amount) : <span className="text-white/20">N/A</span>}
                        </span>
                        <span className="ml-1 text-xs text-white/30">{symbol}</span>
                        {(c.type === 'swap_out' || c.type === 'swap_in') && c.counterpartySymbol && c.counterpartyAmount !== null && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] text-violet-400/70">
                            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06l-2.25 2.25a.75.75 0 0 1-1.06-1.06L9.69 8 8.22 6.53a.75.75 0 0 1 0-1.06ZM4.97 5.22a.75.75 0 0 1 1.06 0l2.25 2.25a.75.75 0 0 1 0 1.06L6.03 9.78a.75.75 0 0 1-1.06-1.06L6.44 8 4.97 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            </svg>
                            {formatTokenAmount(c.counterpartyAmount)} {c.counterpartySymbol}
                          </span>
                        )}
                      </td>

                      {/* Valeur fiat */}
                      <td className="px-4 py-3 text-right tabular-nums text-white/60">
                        {c.valueFiat !== null ? formatFiat(c.valueFiat, currency) : <span className="text-white/20">—</span>}
                      </td>

                      {/* P&L (uniquement sur sell/swap_out) */}
                      <td className={`px-4 py-3 text-right tabular-nums font-semibold ${pnlColor(c.pnl)}`}>
                        {c.pnl !== null
                          ? `${c.pnl >= 0 ? '+' : ''}${formatFiat(c.pnl, currency)}`
                          : <span className="font-normal text-white/15">—</span>}
                      </td>

                      {/* Lien explorateur (adapté à la chaîne) */}
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`${explorerBase}/tx/${c.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-white/40 transition hover:bg-cyan-500/10 hover:text-cyan-400"
                          title={`Voir sur l'explorateur : ${c.hash}`}
                          onClick={e => e.stopPropagation()}
                        >
                          {c.hash.slice(0, 6)}…
                          <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.829.75.75 0 0 1 0-1.06Zm-3.828 3.95a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.829.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Bouton voir plus/moins ────────────────────────────────── */}
          {conversions.length > 8 && (
            <div className="flex items-center justify-center border-t border-white/[0.06] px-5 py-3">
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-4 py-1.5 text-sm font-medium text-white/60 transition hover:bg-cyan-500/10 hover:text-cyan-400"
              >
                {expanded ? (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 0 1-1.06-.02L10 8.832l-3.71 3.938a.75.75 0 0 1-1.08-1.04l4.25-4.5a.75.75 0 0 1 1.08 0l4.25 4.5a.75.75 0 0 1-.02 1.06Z" clipRule="evenodd" />
                    </svg>
                    Afficher moins
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                    Voir {conversions.length - 8} opération{conversions.length - 8 > 1 ? 's' : ''} de plus
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
