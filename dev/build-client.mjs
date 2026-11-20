#!/usr/bin/env node
/**
 * Build the browser bundle.
 *
 * `client.js` is the one artifact the DSH client loader fetches, and the loader
 * gives a plugin factory no module imports of its own. The readable sources
 * therefore live as fragments under `src/client/`: each file is plain code that
 * the factory executes in one shared scope, and this script concatenates them
 * in file-name order into the module-loader envelope.
 *
 * Usage: node dev/build-client.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SOURCE_DIR = join(ROOT, 'src/client')
const OUTPUT = join(ROOT, 'client.js')

const fragments = readdirSync(SOURCE_DIR)
  .filter((file) => file.endsWith('.js'))
  .sort()

if (fragments.length === 0) {
  console.error('build-client: no fragments under src/client')
  process.exit(1)
}

const body = fragments
  .map((file) => `// ===== src/client/${file} =====\n${readFileSync(join(SOURCE_DIR, file), 'utf8').trimEnd()}`)
  .join('\n\n')

const output = `/*
 * dsh-super-ui — generated browser bundle. DO NOT EDIT.
 *
 * Source:  src/client/*.js (concatenated in file-name order)
 * Rebuild: node dev/build-client.mjs
 */
window.__ModuleLoader__.load({
  id: '@ceasarxuu/dsh-super-ui',
  factory(require) {
    const React = require('react')
    const h = React.createElement

${body}
  },
})
`

writeFileSync(OUTPUT, output)
console.log(`build-client: wrote client.js (${fragments.length} fragments, ${Buffer.byteLength(output)} bytes)`)
