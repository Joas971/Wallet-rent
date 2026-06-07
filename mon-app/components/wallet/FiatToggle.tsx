'use client'

import { useFiat } from '@/providers/FiatProvider'

export function FiatToggle() {
  const { currency, toggle } = useFiat()

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-cyan-300 transition hover:border-cyan-400/40 hover:bg-white/10"
      aria-label="Changer la devise d'affichage"
    >
      <span className={currency === 'eur' ? 'opacity-100' : 'opacity-40'}>€ EUR</span>
      <span className="mx-1 opacity-30">/</span>
      <span className={currency === 'usd' ? 'opacity-100' : 'opacity-40'}>$ USD</span>
    </button>
  )
}
