# WalletTrack

Application de suivi de portefeuille crypto multi-EVM. Connectez votre wallet via WalletConnect, visualisez vos actifs sur 17 blockchains EVM et analysez votre P&L reconstruit depuis l'historique on-chain.

## Démarrage rapide

```bash
cp .env.example .env.local
# Remplissez les clés dans .env.local
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

---

## Configuration des clés API

### 1. Reown / WalletConnect (obligatoire)

Créez un projet sur [cloud.reown.com](https://cloud.reown.com) et copiez votre Project ID.

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=votre_project_id
```

### 2. Alchemy (recommandé)

Une seule clé multi-réseaux suffit. Créez votre compte sur [dashboard.alchemy.com](https://dashboard.alchemy.com).

```
ALCHEMY_API_KEY=votre_cle_alchemy
```

Alchemy est utilisé pour :
- Les balances de tokens ERC-20 (`alchemy_getTokenBalances`)
- L'historique des transferts (`alchemy_getAssetTransfers`)
- Les RPC de chaque chaîne (optionnel, via `NEXT_PUBLIC_RPC_*`)

### 3. Prix (gratuit, sans clé)

Les prix sont fournis par deux services gratuits qui ne nécessitent aucune clé API :

- **[DefiLlama](https://defillama.com/docs/api)** — prix actuels et historiques par adresse de contrat (`coins.llama.fi`)
- **[Frankfurter](https://www.frankfurter.app/)** — taux de change USD → EUR (cache 1h côté serveur)

Aucune variable d'environnement à configurer pour les prix.

---

## Chaînes EVM supportées

| Chaîne | chainId | Variable RPC |
|--------|---------|--------------|
| Ethereum | 1 | `NEXT_PUBLIC_RPC_ETHEREUM` |
| Polygon | 137 | `NEXT_PUBLIC_RPC_POLYGON` |
| Arbitrum One | 42161 | `NEXT_PUBLIC_RPC_ARBITRUM` |
| Optimism | 10 | `NEXT_PUBLIC_RPC_OPTIMISM` |
| Base | 8453 | `NEXT_PUBLIC_RPC_BASE` |
| BNB Smart Chain | 56 | `NEXT_PUBLIC_RPC_BSC` |
| Avalanche C-Chain | 43114 | `NEXT_PUBLIC_RPC_AVALANCHE` |
| zkSync Era | 324 | `NEXT_PUBLIC_RPC_ZKSYNC` |
| Linea | 59144 | `NEXT_PUBLIC_RPC_LINEA` |
| Scroll | 534352 | `NEXT_PUBLIC_RPC_SCROLL` |
| Fantom | 250 | `NEXT_PUBLIC_RPC_FANTOM` |
| Gnosis | 100 | `NEXT_PUBLIC_RPC_GNOSIS` |
| Celo | 42220 | `NEXT_PUBLIC_RPC_CELO` |
| Moonbeam | 1284 | `NEXT_PUBLIC_RPC_MOONBEAM` |
| Cronos | 25 | `NEXT_PUBLIC_RPC_CRONOS` |
| Mantle | 5000 | `NEXT_PUBLIC_RPC_MANTLE` |
| Blast | 81457 | `NEXT_PUBLIC_RPC_BLAST` |

Si une variable `NEXT_PUBLIC_RPC_*` est vide, un RPC public de fallback est utilisé. Ces RPC publics sont souvent rate-limités — **utilisez vos propres endpoints Alchemy ou Infura en production**.

**Format Alchemy pour chaque réseau :**
```
https://<network>.g.alchemy.com/v2/<ALCHEMY_API_KEY>
```

Exemples de `<network>` : `eth-mainnet`, `polygon-mainnet`, `arb-mainnet`, `opt-mainnet`, `base-mainnet`, `bnb-mainnet`, `avax-mainnet`, `zksync-mainnet`, `linea-mainnet`.

---

## Limites importantes des données on-chain

### Le prix d'achat n'est pas stocké sur la blockchain

La blockchain enregistre uniquement les transferts de tokens — pas leur valeur en fiat au moment T. WalletTrack **reconstruit** le P&L en :

1. Récupérant tous les transferts entrants/sortants via Alchemy Asset Transfers.
2. Identifiant les "achats" (swaps DEX entrants) et les "ventes" (swaps DEX sortants).
3. Associant un prix fiat au timestamp de chaque transaction via **DefiLlama Historical** (gratuit).

En cas d'absence de donnée historique pour un timestamp précis (token peu connu, chaîne non indexée), le prix actuel est utilisé en approximation. Le P&L peut alors diverger légèrement de la réalité.

### Cas non couverts en v1

- **Airdrops** : reçus sans contrepartie, prix d'achat = 0 ou N/A
- **Staking rewards** : mêmes limitations que les airdrops
- **Positions DeFi complexes** : LP tokens, lending (Aave, Compound), etc.
- **NFTs** : non supportés
- **Chaînes non-EVM** : Solana, Bitcoin, etc.
- **Export fiscal** : pas de CSV ni rapport

### L'historique Alchemy

`alchemy_getAssetTransfers` ne couvre pas toutes les chaînes (voir tableau ci-dessus). Sur les chaînes non supportées par Alchemy (Fantom, Gnosis, Celo, Moonbeam, Cronos, Mantle, Blast, Scroll), l'historique ne sera pas disponible mais les balances actuelles restent accessibles via RPC.

---

## Architecture

```
app/
├── page.tsx                        # Landing page
├── layout.tsx                      # Root layout (providers + header + footer)
├── portfolio/
│   ├── page.tsx                    # Liste des actifs (wallet requis)
│   └── [chainId]/[tokenAddress]/   # Détail token + P&L
└── api/
    ├── prices/                     # Proxy CoinGecko (clé serveur)
    ├── history/                    # Proxy Alchemy Asset Transfers
    └── token-balances/             # Proxy Alchemy Token Balances

components/
├── home/        Hero, HowItWorks, Features
├── layout/      Header, Footer
├── wallet/      ConnectButton, ChainSelector, FiatToggle
└── portfolio/   TokenList, TokenRow, TokenSummaryTable, ConversionsTable

lib/
├── wagmi/config.ts                 # Config wagmi 17 chaînes
└── portfolio/
    ├── useTokenBalances.ts         # Hook balances + prix
    ├── useTokenDetail.ts           # Hook détail + historique + P&L
    ├── parseTransfers.ts           # Normalisation réponses Alchemy
    ├── costBasis.ts                # Calcul coût de revient
    ├── conversions.ts              # Enrichissement P&L par mouvement
    └── formatters.ts               # Formatage fiat, tokens, %, couleurs
```

## Stack

- **Next.js 16** (App Router)
- **Tailwind CSS 4**
- **Reown AppKit** (ex-WalletConnect) + **wagmi** + **viem**
- **@tanstack/react-query**
- **DefiLlama API** (prix fiat actuels et historiques, gratuit)
- **Frankfurter** (conversion USD → EUR, gratuit)
- **Alchemy API** (historique + token balances)
