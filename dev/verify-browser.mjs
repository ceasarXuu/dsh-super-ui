#!/usr/bin/env node
/**
 * Browser-level verification for the interface scale engine.
 *
 * The unit tests run in jsdom, which stores CSS custom properties and `calc()`
 * but never computes them. This probe renders the real `client.js` in headless
 * Chromium and asserts the computed font sizes: the shell follows the scale,
 * the conversation column keeps the shipped value, nested `@media` rules,
 * `!important`, `font` shorthand, late stylesheets and disposal all behave.
 *
 * Usage:
 *   node dev/verify-browser.mjs
 *   CHROME=/path/to/chrome node dev/verify-browser.mjs
 *
 * Exit code 0 means every assertion passed; the page's raw report is printed on
 * failure. Chrome is located from CHROME or the usual macOS/Linux install paths.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const CLIENT = join(ROOT, 'client.js')

/** Candidate Chrome/Chromium executables, first existing wins. */
const CHROME_CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

/** The page under test: shipped-style rules, the shell frame shape, and the assertions. */
function buildPage() {
  const client = readFileSync(CLIENT, 'utf8')
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>super-ui probe</title>
<style>
  .chrome { font-size: 14px; line-height: 22px; }
  .nested { font-size: 16px; }
  @media (min-width: 10px) { .nested { font-size: 12px; } }
  .important { font-size: 13px !important; }
  .relative { font-size: 1.2em; }
  .rem { font-size: 0.875rem; }
  .height-only { height: 20px; line-height: 20px; }
  .shorthand { font: 600 14px/20px sans-serif; }
</style></head>
<body>
<div id="frame">
  <div id="sidebar" class="chrome">sidebar</div>
  <div id="center"><div id="conversation"><span id="chatText" class="chrome">chat</span></div></div>
  <div id="rightbar" data-rightbar-col></div>
  <div data-shell-bottom></div>
  <div data-shell-overlay></div>
</div>
<div id="probes">
  <span class="nested">nested</span>
  <span class="important">important</span>
  <span class="relative">relative</span>
  <span class="rem">rem</span>
  <span class="height-only">height-only</span>
  <span class="shorthand">shorthand</span>
</div>
<pre id="out">pending</pre>
<script>window.__ModuleLoader__ = { load(entry) { window.__superUiEntry = entry } };</script>
<script>${client}</script>
<script>
(async () => {
  const results = {}
  const check = (name, ok, detail) => { results[name] = { ok: Boolean(ok), detail } }
  const size = (selector) => getComputedStyle(document.querySelector(selector)).fontSize
  const lineHeight = (selector) => getComputedStyle(document.querySelector(selector)).lineHeight
  const tick = () => new Promise((resolve) => setTimeout(resolve, 30))

  let revision = 0
  let durable = 100
  const subscribers = new Set()
  const form = {
    getSnapshot: () => ({ status: 'ready', value: { fontScale: durable }, base: {}, user: {}, revision, writable: true }),
    subscribe: (listener) => { subscribers.add(listener); return () => subscribers.delete(listener) },
    set: (field, value) => { durable = value; revision += 1; for (const listener of subscribers) listener(); return Promise.resolve(true) },
  }
  const ctx = {
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') window.__disposers.push(dispose) },
    slots: {
      inject(_name, register) { register() },
      register(options, Component) { window.__row = { options, Component }; return () => {} },
    },
    locale: { register() { return () => {} } },
    configForms: { get: () => form },
  }
  window.__disposers = []

  const React = {
    createElement: () => null,
    useState: () => [null, () => {}],
    useEffect: () => {},
    useSyncExternalStore: () => null,
  }
  const entry = window.__superUiEntry
  const plugin = entry.factory((name) => {
    if (name === 'react') return React
    throw new Error('unexpected module ' + name)
  })
  plugin.apply(ctx)
  await tick()

  check('row registered', window.__row && window.__row.options.name === 'settings.general.item'
    && window.__row.options.id === 'super-ui-font-scale' && window.__row.options.order === 12, JSON.stringify(window.__row && window.__row.options))

  const face = window.__row.options.inject()
  check('initial variable', document.documentElement.style.getPropertyValue('--dsh-super-ui-scale') === '1', document.documentElement.style.getPropertyValue('--dsh-super-ui-scale'))
  check('initial chrome size', size('#sidebar') === '14px', size('#sidebar'))
  check('initial conversation size', size('#chatText') === '14px', size('#chatText'))
  check('chat region marked', document.querySelector('#center').getAttribute('data-dsh-super-ui-region') === 'chat', document.querySelector('#center').getAttribute('data-dsh-super-ui-region'))
  check('sidebar not marked', !document.querySelector('#sidebar').hasAttribute('data-dsh-super-ui-region'), 'sidebar kept')

  face.setScale(120)
  await tick()
  check('scale write', durable === 120, String(durable))
  check('scaled variable', document.documentElement.style.getPropertyValue('--dsh-super-ui-scale') === '1.2', document.documentElement.style.getPropertyValue('--dsh-super-ui-scale'))
  check('scaled chrome size', size('#sidebar') === '16.8px', size('#sidebar'))
  check('conversation untouched', size('#chatText') === '14px', size('#chatText'))
  check('conversation line-height untouched', lineHeight('#chatText') === '22px', lineHeight('#chatText'))
  check('chrome line-height follows', lineHeight('#sidebar') === '26.4px', lineHeight('#sidebar'))
  check('nested media rule scaled', size('.nested') === '14.4px', size('.nested'))
  check('important kept and scaled', size('.important') === '15.6px', size('.important'))
  check('relative em untouched', size('.relative') === '19.2px', size('.relative'))
  check('rem scaled', size('.rem') === '16.8px', size('.rem'))
  check('centering line-height untouched', lineHeight('.height-only') === '20px', lineHeight('.height-only'))
  check('font shorthand scaled', size('.shorthand') === '16.8px', size('.shorthand') + ' / ' + lineHeight('.shorthand'))
  check('stepper shows fresh value', face.getScale() === 120, String(face.getScale()))

  // A global panel opening in the center cell must scale with the shell.
  document.querySelector('#conversation').setAttribute('data-global-panel', '')
  await tick()
  check('panel clears chat marker', !document.querySelector('#center').hasAttribute('data-dsh-super-ui-region'), 'center attr')

  document.querySelector('#conversation').removeAttribute('data-global-panel')
  await tick()
  check('marker restored', document.querySelector('#center').getAttribute('data-dsh-super-ui-region') === 'chat', 'center attr')

  // A stylesheet inserted after startup must be scaled too.
  const late = document.createElement('style')
  late.textContent = '.late { font-size: 10px; line-height: 12px; }'
  document.head.append(late)
  await tick()
  const lateElement = document.createElement('div')
  lateElement.className = 'late'
  document.body.append(lateElement)
  check('late stylesheet scaled', getComputedStyle(lateElement).fontSize === '12px', getComputedStyle(lateElement).fontSize)

  // Refused writes must fall back to the durable value.
  form.set = () => Promise.resolve(false)
  face.setScale(150)
  await tick()
  check('refused write falls back', face.getScale() === 120, String(face.getScale()))

  // Disposal restores every rewritten declaration and the marker.
  for (const dispose of window.__disposers) dispose()
  await tick()
  check('dispose restores variable', document.documentElement.style.getPropertyValue('--dsh-super-ui-scale') === '', document.documentElement.style.getPropertyValue('--dsh-super-ui-scale'))
  check('dispose restores size', size('#sidebar') === '14px', size('#sidebar'))
  check('dispose restores line-height', lineHeight('#sidebar') === '22px', lineHeight('#sidebar'))
  check('dispose restores important', size('.important') === '13px', size('.important'))
  check('dispose restores shorthand', size('.shorthand') === '14px', size('.shorthand'))
  check('dispose clears marker', !document.querySelector('#center').hasAttribute('data-dsh-super-ui-region'), 'center attr')

  const failed = Object.entries(results).filter(([, value]) => !value.ok)
  document.querySelector('#out').textContent = JSON.stringify({
    passed: Object.keys(results).length - failed.length,
    failed: failed.length,
    failures: failed.map(([name, value]) => ({ name, detail: value.detail })),
  })
})().catch((error) => {
  document.querySelector('#out').textContent = JSON.stringify({ passed: 0, failed: 1, failures: [{ name: 'probe threw', detail: String(error && error.stack || error) }] })
})
</script>
</body></html>`
}

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && existsSync(candidate)) return candidate
  }
  throw new Error('Chrome not found; set CHROME to a Chromium-based executable')
}

function main() {
  const directory = mkdtempSync(join(tmpdir(), 'super-ui-probe-'))
  const page = join(directory, 'probe.html')
  writeFileSync(page, buildPage())
  const chrome = findChrome()
  const dom = execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--virtual-time-budget=8000',
    '--dump-dom',
    `file://${page}`,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 })
  const match = /<pre id="out">([\s\S]*?)<\/pre>/.exec(dom)
  if (!match) {
    console.error('probe produced no report')
    console.error(dom.slice(0, 2000))
    process.exit(1)
  }
  const report = JSON.parse(match[1])
  if (report.failed > 0) {
    console.error(`browser verification failed (${report.failed}):`)
    for (const failure of report.failures) console.error(`- ${failure.name}: ${failure.detail}`)
    process.exit(1)
  }
  console.log(`browser verification passed (${report.passed} checks)`)
}

main()
