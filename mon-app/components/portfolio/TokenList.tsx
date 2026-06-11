'use client'

import { useState } from 'react'
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { useTokenBalances } from '@/lib/portfolio/useTokenBalances'
import type { TokenWithPrice } from '@/types/portfolio'
import { TokenRow } from './TokenRow'
import { TokenListSkeleton } from './TokenListSkeleton'
import { ChainSelector } from '@/components/wallet/ChainSelector'
import { FiatToggle } from '@/components/wallet/FiatToggle'
import { useFiat } from '@/providers/FiatProvider'
import { formatFiat } from '@/lib/portfolio/formatters'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { isUnwanted } from '@/lib/portfolio/spamFilter'

export function TokenList() {
  const { isConnected } = useAppKitAccount()
  const { caipNetwork } = useAppKitNetwork()
  const chainId = caipNetwork ? Number(caipNetwork.id) : 1
  const { currency } = useFiat()
  const [showHidden, setShowHidden] = useState(false)

  const { data: tokens, isLoading, isError } = useTokenBalances(chainId)

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-24 text-center">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
          </svg>
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400 ring-2 ring-black" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Connectez votre wallet</h2>
          <p className="mt-2 max-w-xs text-sm text-white/50">
            Vos actifs apparaîtront ici une fois votre wallet connecté.
          </p>
        </div>
        <ConnectButton />
      </div>
    )
  }

  const sortedTokens = tokens
    ? [...tokens].sort((a, b) => {
        const va = (currency === 'eur' ? a.valueEur : a.valueUsd) ?? 0
        const vb = (currency === 'eur' ? b.valueEur : b.valueUsd) ?? 0
        return vb - va
      })
    : []

  const visibleTokens = sortedTokens.filter(t => !isUnwanted(t, currency))
  const hiddenTokens  = sortedTokens.filter(t =>  isUnwanted(t, currency))

  // La valeur totale ne compte que les tokens visibles (les spam/dust n'ont pas de valeur réelle)
  const totalValue = visibleTokens.reduce((sum, t) => {
    return sum + ((currency === 'eur' ? t.valueEur : t.valueUsd) ?? 0)
  }, 0)

  const displayedTokens = showHidden ? sortedTokens : visibleTokens

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/40 uppercase tracking-widest">Portefeuille</p>
          {isLoading ? (
            <div className="mt-1 h-8 w-36 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <p className="mt-0.5 text-3xl font-bold tracking-tight text-white">
              {formatFiat(totalValue, currency)}
            </p>
          )}
          {!isLoading && visibleTokens.length > 0 && (
            <p className="mt-0.5 text-xs text-white/30">
              {visibleTokens.length} actif{visibleTokens.length > 1 ? 's' : ''}
              {hiddenTokens.length > 0 && (
                <span className="text-white/20">
                  {' '}· {hiddenTokens.length} masqué{hiddenTokens.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FiatToggle />
          <ChainSelector />
        </div>
      </div>

      {/* Token list */}
      {isLoading ? (
        <TokenListSkeleton />
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-5 py-4">
          <svg className="h-5 w-5 shrink-0 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-rose-400">Impossible de récupérer vos actifs. Vérifiez votre connexion ou vos clés API.</p>
        </div>
      ) : !visibleTokens.length && !hiddenTokens.length ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-5 py-12 text-center">
          <p className="text-sm text-white/30">Aucun actif trouvé sur ce réseau.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            {/* En-tête colonnes */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_16px] items-center gap-4 border-b border-white/[0.06] bg-white/[0.015] px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white/25">
              <span>Actif</span>
              <span className="hidden text-right sm:block min-w-[90px]">Quantité</span>
              <span className="hidden text-right md:block min-w-[110px]">Prix</span>
              <span className="text-right min-w-[90px]">Valeur</span>
              <span />
            </div>

            {/* Lignes tokens visibles (+ hidden si toggle actif) */}
            <div className="divide-y divide-white/[0.04]">
              {displayedTokens.map(token => (
                <TokenRow
                  key={token.address}
                  token={token}
                  chainId={chainId}
                  dimmed={showHidden && isUnwanted(token, currency)}
                />
              ))}
            </div>
          </div>

          {/* Bouton toggle tokens masqués */}
          {hiddenTokens.length > 0 && (
            <button
              onClick={() => setShowHidden(v => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 text-xs font-medium text-white/35 transition hover:bg-white/[0.03] hover:text-white/60"
            >
              {showHidden ? (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                    <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                  </svg>
                  Masquer les tokens indésirables
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z" clipRule="evenodd" />
                  </svg>
                  Afficher {hiddenTokens.length} token{hiddenTokens.length > 1 ? 's' : ''} masqué{hiddenTokens.length > 1 ? 's' : ''}
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/25">
                    spam / dust
                  </span>
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}
