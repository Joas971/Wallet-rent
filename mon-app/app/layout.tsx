import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/providers/Web3Provider'
import { FiatProvider } from '@/providers/FiatProvider'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'WalletTrack — Suivi de portefeuille multi-EVM',
  description: 'Suivez vos actifs crypto sur 17 blockchains EVM. Visualisez vos gains et pertes en temps réel.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#050810] text-white">
        <Web3Provider>
          <FiatProvider>
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
          </FiatProvider>
        </Web3Provider>
      </body>
    </html>
  )
}
