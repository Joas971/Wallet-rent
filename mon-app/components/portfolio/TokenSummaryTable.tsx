'use client'

import type { TokenDetail } from '@/types/portfolio'
import { useFiat } from '@/providers/FiatProvider'
import { formatFiat, formatPrice, formatTokenAmount, formatPercent, pnlColor } from '@/lib/portfolio/formatters'

interface Props {
  detail: TokenDetail
}

/** Séparateur de section avec label */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
        {children}
      </span>
      <div className="flex-1 border-t border-white/[0.06]" />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  subColor,
  highlight,
  badge,
}: {
  icon: React.ReactNode
  label: string
  value: string | React.ReactNode
  sub?: string
  subColor?: string
  highlight?: boolean
  badge?: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl px-4 py-4 ${highlight ? 'bg-cyan-500/10 ring-1 ring-cyan-500/20' : 'bg-white/[0.025]'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${highlight ? 'text-cyan-400' : 'text-white/40'}`}>{icon}</span>
          <span className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</span>
        </div>
        {badge}
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

/** Carte P&L colorée selon profit / perte */
function PnlCard({
  label,
  sublabel,
  value,
  percent,
  large,
}: {
  label: string
  sublabel?: string
  value: number | null
  percent?: number | null
  large?: boolean
}) {
  const isProfit = value !== null ? value >= 0 : null
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl px-4 py-4 ring-1 ${
      isProfit === null
        ? 'bg-white/[0.025] ring-white/10'
        : isProfit
        ? 'bg-emerald-500/10 ring-emerald-500/20'
        : 'bg-rose-500/10 ring-rose-500/20'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm ${isProfit === null ? 'text-white/40' : isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isProfit === null ? '—' : isProfit ? '▲' : '▼'}
        </span>
        <span className="text-xs font-medium uppercase tracking-widest text-white/40">{label}</span>
      </div>
      <p className={`tabular-nums font-bold leading-tight ${pnlColor(value)} ${large ? 'text-xl' : 'text-lg'}`}>
        {value !== null
          ? `${value >= 0 ? '+' : ''}${formatFiat(value, 'usd')}`
          : <span className="font-normal text-white/30">N/A</span>}
      </p>
      {percent !== undefined && percent !== null && (
        <p className={`text-xs font-medium ${pnlColor(percent)}`}>{formatPercent(percent)}</p>
      )}
      {sublabel && (
        <p className="text-[11px] text-white/25 leading-relaxed">{sublabel}</p>
      )}
    </div>
  )
}

export function TokenSummaryTable({ detail }: Props) {
  const { currency } = useFiat()
  const { token, costBasis, currentValue, pnl, pnlPercent, unrealizedPnl } = detail

  const price = currency === 'eur' ? token.priceEur : token.priceUsd
  const value = currency === 'eur' ? token.valueEur : token.valueUsd

  const realizedPnl = costBasis.realizedPnl

  return (
    <div className="space-y-3">

      {/* ── Section 1 : Votre position ────────────────────────────────── */}
      <SectionLabel>Votre position</SectionLabel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* 1ère acquisition */}
        <StatCard
          icon="📅"
          label="1ère acquisition"
          value={costBasis.firstBuyPrice !== null ? formatPrice(costBasis.firstBuyPrice, currency) : 'N/A'}
          sub={costBasis.firstBuyTimestamp
            ? `le ${new Date(costBasis.firstBuyTimestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`
            : 'Aucun achat détecté'}
        />

        {/* Solde */}
        <StatCard
          icon="💼"
          label="Solde détenu"
          value={formatTokenAmount(token.balanceFormatted)}
          sub={token.symbol}
        />

        {/* Prix actuel */}
        <StatCard
          icon="💱"
          label="Prix actuel"
          value={formatPrice(price, currency)}
          sub={token.priceChange24h !== null
            ? `${token.priceChange24h >= 0 ? '▲ +' : '▼ '}${token.priceChange24h.toFixed(2)}% aujourd'hui`
            : undefined}
          subColor={token.priceChange24h !== null
            ? token.priceChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            : undefined}
        />
      </div>

      {/* Valeur actuelle — mise en avant */}
      <StatCard
        icon="💎"
        label="Valeur actuelle du solde"
        value={formatFiat(value, currency)}
        sub={currentValue !== null && costBasis.totalInvested !== null
          ? `Capital investi dans le stock : ${formatFiat(costBasis.totalInvested, currency)}`
          : undefined}
        highlight
      />

      {/* ── Section 2 : Prix de référence ─────────────────────────────── */}
      <SectionLabel>Prix de référence (base du calcul)</SectionLabel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* PRU — Prix de Revient Unitaire */}
        <div className="flex flex-col gap-1 rounded-xl bg-white/[0.025] px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/40">📊</span>
            <span className="text-xs font-medium uppercase tracking-widest text-white/40">
              Prix moyen d&apos;achat <span className="normal-case text-white/20">(PA)</span>
            </span>
          </div>
          <p className="text-lg font-bold tabular-nums text-white leading-tight">
            {costBasis.averageCostBasis !== null ? formatPrice(costBasis.averageCostBasis, currency) : 'N/A'}
          </p>
          <p className="text-[11px] text-white/25 leading-relaxed">
            Moyenne pondérée de tous vos achats encore en stock.
            {costBasis.totalInvested !== null && (
              <> Capital investi restant : <span className="text-white/40">{formatFiat(costBasis.totalInvested, currency)}</span>.</>
            )}
          </p>
        </div>

        {/* P&L total */}
        <PnlCard
          label="Gain / Perte total"
          sublabel="Réalisé + latent sur la position complète"
          value={pnl}
          percent={pnlPercent}
          large
        />
      </div>

      {/* ── Section 3 : Détail des gains/pertes ───────────────────────── */}
      <SectionLabel>Détail des gains / pertes</SectionLabel>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* PnL réalisé */}
        <div className={`flex flex-col gap-1.5 rounded-xl px-4 py-4 ring-1 ${
          realizedPnl === 0 ? 'bg-white/[0.025] ring-white/10'
          : realizedPnl > 0 ? 'bg-emerald-500/10 ring-emerald-500/20'
          : 'bg-rose-500/10 ring-rose-500/20'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${realizedPnl === 0 ? 'text-white/30' : realizedPnl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ✓
            </span>
            <span className="text-xs font-medium uppercase tracking-widest text-white/40">Gains réalisés</span>
          </div>
          <p className={`text-lg font-bold tabular-nums leading-tight ${realizedPnl === 0 ? 'text-white/30' : pnlColor(realizedPnl)}`}>
            {realizedPnl !== 0
              ? `${realizedPnl >= 0 ? '+' : ''}${formatFiat(realizedPnl, currency)}`
              : '—'}
          </p>
          <p className="text-[11px] text-white/25 leading-relaxed">
            Sur les ventes et swaps déjà clôturés.
            {realizedPnl === 0 && ' Aucune vente ou échange détecté.'}
          </p>
        </div>

        {/* PnL non réalisé */}
        <div className={`flex flex-col gap-1.5 rounded-xl px-4 py-4 ring-1 ${
          unrealizedPnl === null ? 'bg-white/[0.025] ring-white/10'
          : unrealizedPnl >= 0 ? 'bg-emerald-500/10 ring-emerald-500/20'
          : 'bg-rose-500/10 ring-rose-500/20'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${unrealizedPnl === null ? 'text-white/30' : unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ◷
            </span>
            <span className="text-xs font-medium uppercase tracking-widest text-white/40">Gains latents</span>
          </div>
          <p className={`text-lg font-bold tabular-nums leading-tight ${pnlColor(unrealizedPnl)}`}>
            {unrealizedPnl !== null
              ? `${unrealizedPnl >= 0 ? '+' : ''}${formatFiat(unrealizedPnl, currency)}`
              : 'N/A'}
          </p>
          <p className="text-[11px] text-white/25 leading-relaxed">
            Si vous vendiez votre stock au prix actuel.
          </p>
        </div>
      </div>

      {/* Note */}
      <p className="rounded-lg bg-white/[0.015] px-4 py-3 text-[11px] leading-relaxed text-white/20">
        Les prix historiques proviennent de DefiLlama (timestamp exact de chaque transaction).
        En l&apos;absence de donnée historique, le prix actuel est utilisé.
        Le calcul est basé sur la méthode FIFO (First In, First Out).
      </p>
    </div>
  )
}
