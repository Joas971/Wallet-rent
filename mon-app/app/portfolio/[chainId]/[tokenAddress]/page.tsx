'use client'

import { use } from 'react'
import Link from 'next/link'
import { useAppKitAccount } from '@reown/appkit/react'
import { useTokenDetail } from '@/lib/portfolio/useTokenDetail'
import { TokenSummaryTable } from '@/components/portfolio/TokenSummaryTable'
import { ConversionsTable } from '@/components/portfolio/ConversionsTable'
import { FiatToggle } from '@/components/wallet/FiatToggle'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { CHAIN_LABELS } from '@/lib/wagmi/config'
import { pnlColor, formatPercent } from '@/lib/portfolio/formatters'

interface Props {
  params: Promise<{ chainId: string; tokenAddress: string }>
}

export default function TokenDetailPage({ params }: Props) {
  const { chainId: chainIdStr, tokenAddress } = use(params)
  const chainId = Number(chainIdStr)
  const { isConnected } = useAppKitAccount()
  const { data: detail, isLoading, isError } = useTokenDetail(chainId, tokenAddress)

  const chainLabel = CHAIN_LABELS[chainId]

  if (!isConnected) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <h2 className="text-xl font-semibold text-white">Connectez votre wallet</h2>
        <p className="text-sm text-white/50">Le détail d'un token n'est accessible qu'une fois votre wallet connecté.</p>
        <ConnectButton />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-white/30">
        <Link href="/portfolio" className="hover:text-white/60 transition">Portefeuille</Link>
        <span>/</span>
        <span className="text-white/50">{chainLabel?.name ?? `Chain ${chainId}`}</span>
        <span>/</span>
        <span className="text-white">{detail?.token.symbol ?? tokenAddress.slice(0, 8) + '…'}</span>
      </nav>

      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
              <div className="h-4 w-48 animate-pulse rounded bg-white/5" />
            </div>
          ) : detail ? (
            <>
              <h1 className="text-3xl font-bold text-white">{detail.token.symbol}</h1>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-white/50">{detail.token.name}</p>
                {detail.pnlPercent !== null && (
                  <span className={`text-sm font-medium ${pnlColor(detail.pnlPercent)}`}>
                    {formatPercent(detail.pnlPercent)}
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>
        <FiatToggle />
      </div>

      {/* Summary table */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      ) : isError ? (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-400">
          Impossible de charger les données. Vérifiez vos clés API et votre connexion.
        </p>
      ) : detail ? (
        <>
          <TokenSummaryTable detail={detail} />
          <ConversionsTable conversions={detail.conversions} symbol={detail.token.symbol} />
        </>
      ) : null}
    </div>
  )
}
