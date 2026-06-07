'use client'

import type { TokenDetail } from '@/types/portfolio'
import { useFiat } from '@/providers/FiatProvider'
import { formatFiat, formatPrice, formatTokenAmount, formatPercent, pnlColor } from '@/lib/portfolio/formatters'

interface Props {
  detail: TokenDetail
}

function StatCard({
  icon,
  label,
  value,
  sub,
  subColor,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  subColor?: string
  highlight?: boolean
}) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl px-4 py-4 ${highlight ? 'bg-cyan-500/10 ring-1 ring-cyan-500/20' : 'bg-white/[0.025]'}`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${highlight ? 'text-cyan-400' : 'text-white/40'}`}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums leading-tight ${highlight ? 'text-cyan-300' : 'text-white'}`}>
        {value}
      </p>
      {sub && (
        <p className={`text-xs tabular-nums ${subColor ?? 'text-white/30'}`}>{sub}</p>
      )}
    </div>
  )
}

export function TokenSummaryTable({ detail }: Props) {
  const { currency } = useFiat()
  const { token, costBasis, currentValue, pnl, pnlPercent } = detail

  const price = currency === 'eur' ? token.priceEur : token.priceUsd
  const value = currency === 'eur' ? token.valueEur : token.valueUsd

  const isProfit = pnl !== null ? pnl >= 0 : null

  return (
    <div className="space-y-3">
      {/* Grille principale — 3 colonnes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon="📅"
          label="1ère acquisition"
          value={costBasis.firstBuyPrice !== null ? formatPrice(costBasis.firstBuyPrice, currency) : 'N/A'}
          sub={costBasis.firstBuyTimestamp
            ? new Date(costBasis.firstBuyTimestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            : undefined}
        />
        <StatCard
          icon="📦"
          label="Quantité totale"
          value={formatTokenAmount(token.balanceFormatted)}
          sub={token.symbol}
        />
        <StatCard
          icon="💱"
          label="Prix actuel"
          value={formatPrice(price, currency)}
          sub={token.priceChange24h !== null
            ? `${token.priceChange24h >= 0 ? '▲ +' : '▼ '}${token.priceChange24h.toFixed(2)}% (24h)`
            : undefined}
          subColor={token.priceChange24h !== null
            ? token.priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            : undefined}
        />
      </div>

      {/* Valeur actuelle — mise en avant */}
      <StatCard
        icon="💎"
        label="Valeur actuelle"
        value={formatFiat(value, currency)}
        highlight
      />

      {/* Coût de revient + P&L côte à côte */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon="📊"
          label="Coût de revient moyen"
          value={costBasis.averageCostBasis !== null ? formatPrice(costBasis.averageCostBasis, currency) : 'N/A'}
          sub={costBasis.totalInvested !== null ? `Total investi : ${formatFiat(costBasis.totalInvested, currency)}` : undefined}
        />

        {/* P&L — card colorée selon profit/perte */}
        <div className={`flex flex-col gap-1.5 rounded-xl px-4 py-4 ring-1 ${
          isProfit === null
            ? 'bg-white/[0.025] ring-white/10'
            : isProfit
            ? 'bg-emerald-500/10 ring-emerald-500/20'
            : 'bg-rose-500/10 ring-rose-500/20'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isProfit === null ? 'text-white/40' : isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfit === null ? '📈' : isProfit ? '📈' : '📉'}
            </span>
            <span className="text-xs font-medium uppercase tracking-widest text-white/40">Gain / Perte</span>
          </div>
          <p className={`text-lg font-bold tabular-nums leading-tight ${pnlColor(pnl)}`}>
            {pnl !== null ? `${pnl >= 0 ? '+' : ''}${formatFiat(pnl, currency)}` : 'N/A'}
          </p>
          <p className={`text-xs font-medium ${pnlColor(pnlPercent)}`}>
            {formatPercent(pnlPercent)}
          </p>
        </div>
      </div>

      {/* Note légale */}
      <p className="rounded-lg bg-white/[0.015] px-4 py-3 text-xs leading-relaxed text-white/20">
        Les prix historiques sont récupérés depuis DefiLlama au timestamp de chaque transaction.
        En cas d'absence de donnée, le prix actuel est utilisé en approximation.
        Les données sont reconstruites depuis la blockchain et peuvent être incomplètes pour les airdrops ou transferts sans contrepartie identifiable.
      </p>
    </div>
  )
}
