'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type FiatCurrency = 'eur' | 'usd'

interface FiatContextValue {
  currency: FiatCurrency
  toggle: () => void
  symbol: string
}

const FiatContext = createContext<FiatContextValue>({
  currency: 'eur',
  toggle: () => {},
  symbol: '€',
})

export function FiatProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<FiatCurrency>('eur')

  useEffect(() => {
    const saved = localStorage.getItem('fiat_currency') as FiatCurrency | null
    if (saved === 'eur' || saved === 'usd') setCurrency(saved)
  }, [])

  const toggle = () => {
    const next: FiatCurrency = currency === 'eur' ? 'usd' : 'eur'
    setCurrency(next)
    localStorage.setItem('fiat_currency', next)
  }

  return (
    <FiatContext.Provider value={{ currency, toggle, symbol: currency === 'eur' ? '€' : '$' }}>
      {children}
    </FiatContext.Provider>
  )
}

export const useFiat = () => useContext(FiatContext)
