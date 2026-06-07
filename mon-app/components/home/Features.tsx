const features = [
  {
    title: 'P&L reconstruit',
    description: "Le prix d'achat est calculé depuis l'historique on-chain de vos transactions. Chaque achat, vente et swap est analysé pour estimer votre coût de revient réel.",
    color: 'from-cyan-500/20 to-cyan-500/0',
    accent: 'text-cyan-400',
  },
  {
    title: 'Données décentralisées',
    description: "Toutes les informations proviennent directement de la blockchain via des RPC publics ou Alchemy. Aucune donnée personnelle n'est stockée.",
    color: 'from-indigo-500/20 to-indigo-500/0',
    accent: 'text-indigo-400',
  },
  {
    title: 'EUR & USD',
    description: "Basculez instantanément entre euro et dollar. Les prix sont actualisés depuis DefiLlama (gratuit, sans clé) et le taux EUR/USD depuis Frankfurter.",
    color: 'from-amber-500/20 to-amber-500/0',
    accent: 'text-amber-400',
  },
  {
    title: 'Multi-chaînes',
    description: "17 blockchains EVM supportées dont Ethereum, Arbitrum, Base, Polygon, zkSync, Optimism, Blast et bien d'autres — avec fallback RPC public.",
    color: 'from-violet-500/20 to-violet-500/0',
    accent: 'text-violet-400',
  },
]

export function Features() {
  return (
    <section className="relative px-4 py-16 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white">Conçu pour la transparence</h2>
          <p className="mt-4 text-white/40">Comprendre ses investissements, pas juste les surveiller.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {features.map(feat => (
            <div key={feat.title} className={`glass relative overflow-hidden rounded-2xl p-6`}>
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feat.color}`} />
              <div className="relative">
                <h3 className={`mb-2 font-semibold ${feat.accent}`}>{feat.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-xl border border-amber-500/10 bg-amber-500/5 px-5 py-4 text-sm text-amber-300/60">
          <strong className="text-amber-300/80">Note :</strong>{' '}
          Les données de P&amp;L sont reconstruites et peuvent être incomplètes pour les airdrops, les staking rewards ou les protocoles DeFi complexes. Cet outil n&apos;est pas un conseil financier.
        </div>
      </div>
    </section>
  )
}
