#!/usr/bin/env node
// Retire la ligne `export { tempoWallet } from '@wagmi/core/tempo'` du fichier
// @wagmi/connectors 8.x embarqué dans @reown/appkit-adapter-wagmi.
// Ce sous-module n'existe que dans wagmi 3.x et n'est pas utilisé par AppKit.
const fs = require('fs')
const path = require('path')

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@reown',
  'appkit-adapter-wagmi',
  'node_modules',
  '@wagmi',
  'connectors',
  'dist',
  'esm',
  'exports',
  'index.js',
)

if (!fs.existsSync(target)) {
  // Pas de version nestée — rien à faire
  process.exit(0)
}

const original = fs.readFileSync(target, 'utf8')
const patched = original.replace(
  /export \{ tempoWallet \} from '@wagmi\/core\/tempo';\n?/g,
  '',
)

if (original !== patched) {
  fs.writeFileSync(target, patched, 'utf8')
  console.log('[patch-wagmi] Removed tempoWallet re-export from nested @wagmi/connectors.')
} else {
  console.log('[patch-wagmi] Already patched or line not found.')
}
