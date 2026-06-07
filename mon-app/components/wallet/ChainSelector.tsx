'use client'

import { useAppKitNetwork } from '@reown/appkit/react'
import { SUPPORTED_CHAINS, CHAIN_LABELS } from '@/lib/wagmi/config'
import { useState, useRef, useEffect } from 'react'

export function ChainSelector() {
  const { caipNetwork, switchNetwork } = useAppKitNetwork()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentChainId = caipNetwork ? Number(caipNetwork.id) : 1
  const currentLabel = CHAIN_LABELS[currentChainId]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-white transition hover:border-cyan-400/40 hover:bg-white/10"
      >
        <span>{currentLabel?.name ?? 'Réseau'}</span>
        <svg className={`h-4 w-4 text-cyan-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-white/10 bg-[#0a1628] py-1 shadow-xl shadow-black/40">
          {SUPPORTED_CHAINS.map(chain => (
            <button
              key={chain.id}
              onClick={() => {
                switchNetwork(chain as Parameters<typeof switchNetwork>[0])
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition hover:bg-white/5 ${
                chain.id === currentChainId ? 'text-cyan-400' : 'text-white/70'
              }`}
            >
              <span className="flex-1">{CHAIN_LABELS[chain.id]?.name ?? chain.name}</span>
              <span className="text-xs text-white/30">{CHAIN_LABELS[chain.id]?.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
