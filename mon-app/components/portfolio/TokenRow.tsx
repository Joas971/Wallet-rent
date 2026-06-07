'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { TokenWithPrice } from '@/types/portfolio'
import { useFiat } from '@/providers/FiatProvider'
import { formatFiat, formatPrice, formatTokenAmount } from '@/lib/portfolio/formatters'

interface Props {
  token: TokenWithPrice
  chainId: number
}

function TokenIcon({ symbol, logo }: { symbol: string; logo?: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const initials = symbol.slice(0, 2).toUpperCase()

  if (logo && !imgFailed) {
    return (
      <img
        src={logo}
        alt={symbol}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10"
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-indigo-500/30 text-sm font-bold text-cyan-300 ring-1 ring-cyan-500/20">
      {initials}
    </div>
  )
}

export function TokenRow({ token, chainId }: Props) {
  const { currency } = useFiat()
  const price = currency === 'eur' ? token.priceEur : token.priceUsd
  const value = currency === 'eur' ? token.valueEur : token.valueUsd
  const change = token.priceChange24h

  const tokenPath = `/portfolio/${chainId}/${token.address}`

  const changePositive = change !== null && change >= 0

  return (
    <Link
      href={tokenPath}
      className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] px-5 py-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-white/[0.05] hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.15)]"
    >
      {/* Accent bar gauche au hover */}
      <span className="absolute inset-y-0 left-0 w-0.5 rounded-r bg-gradient-to-b from-cyan-400 to-indigo-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <TokenIcon symbol={token.symbol} logo={token.logo} />

      {/* Nom + symbole */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-white">{token.symbol}</p>
        <p className="truncate text-xs text-white/40">{token.name}</p>
      </div>

      {/* Quantité */}
      <div className="hidden text-right sm:block min-w-[90px]">
        <p className="text-sm tabular-nums text-white/70">{formatTokenAmount(token.balanceFormatted)}</p>
        <p className="text-xs text-white/30">{token.symbol}</p>
      </div>

      {/* Prix + variation 24h */}
      <div className="hidden text-right md:block min-w-[110px]">
        <p className="text-sm tabular-nums text-white/80">{formatPrice(price, currency)}</p>
        {change !== null ? (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${changePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {changePositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        ) : (
          <span className="text-xs text-white/20">—</span>
        )}
      </div>

      {/* Valeur totale */}
      <div className="min-w-[90px] text-right">
        <p className="font-bold tabular-nums text-white">{formatFiat(value, currency)}</p>
        {change !== null && (
          <p className={`text-xs md:hidden ${changePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {changePositive ? '+' : ''}{change.toFixed(2)}%
          </p>
        )}
      </div>

      {/* Flèche */}
      <svg
        className="h-4 w-4 shrink-0 text-white/20 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-cyan-400"
        viewBox="0 0 20 20" fill="currentColor"
      >
        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      </svg>
    </Link>
  )
}
