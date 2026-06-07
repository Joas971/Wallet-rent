'use client'

import Link from 'next/link'
import { ConnectButton } from '@/components/wallet/ConnectButton'

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-32 pt-24 sm:px-6">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 glow-cyan" />
      <div className="pointer-events-none absolute inset-0 bg-grid" />

      {/* Floating orbs */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-xs font-medium text-cyan-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
          </span>
          Multi-EVM · 17 blockchains supportées
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
          Votre portefeuille{' '}
          <span className="gradient-text">crypto</span>
          <br />
          sous contrôle total
        </h1>

        {/* Subline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50">
          Connectez votre wallet, choisissez votre blockchain et visualisez instantanément la valeur de vos actifs, vos gains, vos pertes et l'intégralité de vos mouvements — en EUR ou USD.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <ConnectButton />
          <Link
            href="/portfolio"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10"
          >
            Voir le portefeuille
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        {/* Stats row */}
        <div className="mt-16 grid grid-cols-3 divide-x divide-white/5 rounded-2xl border border-white/5 bg-white/[0.02]">
          {[
            { value: '17', label: 'Blockchains EVM' },
            { value: '100%', label: 'Données on-chain' },
            { value: 'Temps réel', label: 'Prix actualisés' },
          ].map(stat => (
            <div key={stat.label} className="px-6 py-5">
              <p className="text-2xl font-bold text-cyan-300">{stat.value}</p>
              <p className="mt-1 text-xs text-white/40">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
