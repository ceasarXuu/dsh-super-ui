#!/usr/bin/env node
/**
 * Layout probe for the General settings row.
 *
 * jsdom cannot lay out, and the headless-browser probe used for the engine
 * asserts computed font sizes only. This probe renders the real row component
 * with real React in headless Chromium, at every accepted scale and at narrow
 * and wide settings-panel widths, and checks the two defects a pure CSS review
 * misses: the stepper arrows must never cover the value, and the row must not
 * overflow its column.
 *
 * Usage:
 *   node dev/verify-row-layout.mjs
 *   node dev/verify-row-layout.mjs --screenshot [--scale=1.2] [--width=614]
 *
 * Exit code 0 means every check passed; the report is printed on failure. The
 * screenshot mode writes a PNG and prints its path for a visual review.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const CHROME_CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const args = process.argv.slice(2)
const screenshotMode = args.includes('--screenshot')
const shotScale = (args.find((value) => value.startsWith('--scale=')) ?? '--scale=1.2').slice('--scale='.length)
const shotWidth = (args.find((value) => value.startsWith('--width=')) ?? '--width=614').slice('--width='.length)

/** Design tokens the row consumes; geometry only needs the names to resolve. */
const TOKENS = `
:root{
  --dsw-radius-xs:4px;--dsw-radius-md:12px;
  --dsw-alias-label-primary:#f5f7fa;--dsw-alias-label-secondary:#c6cbd2;--dsw-alias-label-tertiary:#9aa1aa;
  --dsw-alias-label-caption:#7d848d;--dsw-alias-border-l2:rgba(255,255,255,.14);
  --dsw-alias-bg-module-platform:#2a2d33;--dsw-alias-bg-layer-1:#3a3e45;--dsw-alias-bg-layer-2:#24272c;
}
html,body{margin:0;background:#15171a;color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#general{padding:0 16px}
`

/** The page: React UMD + the real bundle factory + the real row component. */
function buildPage() {
  const client = readFileSync(join(ROOT, 'client.js'), 'utf8')
  const react = readFileSync(join(ROOT, 'node_modules/react/umd/react.production.min.js'), 'utf8')
  const reactDom = readFileSync(join(ROOT, 'node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8')
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>super-ui row probe</title>
<style>${TOKENS}</style></head>
<body>
<div id="panel"><div id="general"></div></div>
<pre id="out">pending</pre>
<script>window.__ModuleLoader__ = { load(entry) { window.__superUiEntry = entry } }</script>
<script>${react}</script>
<script>${reactDom}</script>
<script>${client}</script>
<script>
(() => {
  const results = {}
  const check = (name, ok, detail) => { results[name] = { ok: Boolean(ok), detail } }
  const params = new URLSearchParams(location.search)
  const shotMode = params.get('shot') === '1'
  const shotScale = Number(params.get('scale') ?? '1.2')
  const shotWidth = Number(params.get('width') ?? '614')

  // A minimal client context: the row registration and its inject face are real,
  // only the surrounding DSH services are stubbed.
  let percent = 100
  const listeners = new Set()
  percent = Math.round(shotScale * 100)
  const form = {
    getSnapshot: () => ({ status: 'ready', value: { fontScale: percent }, base: {}, user: {}, revision: 0, writable: true }),
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    set: () => Promise.resolve(true),
  }
  const ctx = {
    effect(fn) { fn() },
    slots: {
      inject(_name, register) { register() },
      register(options, Component) { window.__row = { options, Component }; return () => {} },
    },
    locale: { register: () => () => {} },
    configForms: { get: () => form },
  }
  const React = window.React
  const entry = window.__superUiEntry
  const plugin = entry.factory((name) => { if (name === 'react') return React; throw new Error(name) })
  plugin.apply(ctx)

  // Production copy (locale/zh in client.js): the row must fit these strings.
  const ZH = {
    'fontScale.title': '界面字号',
    'fontScale.description': '仅影响聊天界面以外的界面文字：侧边栏、设置页、菜单与对话框',
    'fontScale.increase': '增大界面字号',
    'fontScale.decrease': '减小界面字号',
    'fontScale.reset': '重置',
  }
  const face = window.__row.options.inject()
  const mount = window.__row.Component
  const root = window.ReactDOM.createRoot(document.getElementById('general'))
  const render = () => {
    root.render(React.createElement(mount, {
      t: (key) => ZH[key] ?? key,
      subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
      getScale: () => percent,
      setScale: (next) => {
        percent = Math.min(150, Math.max(80, next))
        for (const listener of listeners) listener()
        render()
      },
    }))
  }

  const panel = document.getElementById('panel')
  panel.style.width = (shotMode ? shotWidth : 614) + 'px'
  render()

  const measure = () => {
    const row = document.querySelector('.dsh-sui-row')
    const control = document.querySelector('.dsh-sui-control')
    const stepper = document.querySelector('.dsh-sui-stepper')
    const value = document.querySelector('.dsh-sui-value')
    const arrows = document.querySelector('.dsh-sui-arrows')
    const rect = (element) => element.getBoundingClientRect()
    return { row: rect(row), control: rect(control), stepper: rect(stepper), value: rect(value), arrows: rect(arrows) }
  }

  const overlaps = (a, b) => a.right > b.left + 0.5 && b.right > a.left + 0.5 && a.bottom > b.top + 0.5 && b.bottom > a.top + 0.5

  const applyScale = (factor) => {
    document.documentElement.style.setProperty('--dsh-super-ui-scale', String(factor))
  }

  // Scale the visible value through the real row's own click surface so the text
  // is the widest the user can reach (150) and the arrows are revealed.
  const focusArrows = () => {
    const up = document.querySelectorAll('.dsh-sui-arrow')[0]
    if (up) up.focus()
  }

  requestAnimationFrame(() => {
    if (shotMode) {
      percent = Math.round(shotScale * 100)
      panel.style.width = shotWidth + 'px'
      render()
      applyScale(shotScale)
      requestAnimationFrame(() => {
        focusArrows()
        document.querySelector('#out').textContent = JSON.stringify({ shot: true })
      })
      return
    }

    for (const width of [614, 900, 420]) {
      panel.style.width = width + 'px'
      for (const percentValue of [80, 100, 120, 150]) {
        percent = percentValue
        render()
        applyScale(percentValue / 100)
        focusArrows()
        const box = measure()
        const label = width + '@' + percentValue
        check('arrows clear of value ' + label, !overlaps(box.arrows, box.value), JSON.stringify(box.value) + ' vs ' + JSON.stringify(box.arrows))
        check('value inside stepper ' + label,
          box.value.left >= box.stepper.left - 0.5 && box.value.right <= box.stepper.right + 0.5
          && box.value.top >= box.stepper.top - 0.5 && box.value.bottom <= box.stepper.bottom + 0.5,
          JSON.stringify(box.value) + ' vs pill ' + JSON.stringify(box.stepper))
        check('stepper height holds the value ' + label, box.stepper.height >= box.value.height, box.stepper.height + ' / ' + box.value.height)
        check('control inside row ' + label, box.control.right <= box.row.right + 0.5, box.control.right + ' vs ' + box.row.right)
        check('no page overflow ' + label, document.documentElement.scrollWidth <= Math.max(width, window.innerWidth) + 1,
          document.documentElement.scrollWidth + ' / ' + window.innerWidth)
      }
    }

    // Switching 2 -> 3 digits must not resize the pill (no jitter while stepping).
    panel.style.width = '614px'
    applyScale(1.2)
    percent = 95
    render()
    const twoDigit = measure().stepper.width
    percent = 120
    render()
    const threeDigit = measure().stepper.width
    check('pill width stable across digit counts', Math.abs(twoDigit - threeDigit) <= 0.5, twoDigit + ' / ' + threeDigit)

    const failed = Object.entries(results).filter(([, value]) => !value.ok)
    document.querySelector('#out').textContent = JSON.stringify({
      passed: Object.keys(results).length - failed.length,
      failed: failed.length,
      failures: failed.map(([name, value]) => ({ name, detail: value.detail })),
    })
  })
})()
</script>
</body></html>`
}

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) if (candidate && existsSync(candidate)) return candidate
  throw new Error('Chrome not found; set CHROME to a Chromium-based executable')
}

function main() {
  const directory = mkdtempSync(join(tmpdir(), 'super-ui-row-'))
  const page = join(directory, 'row.html')
  writeFileSync(page, buildPage())
  const chrome = findChrome()
  if (screenshotMode) {
    const shot = join(directory, `row-${shotWidth}-${shotScale}.png`)
    const url = `file://${page}?shot=1&scale=${shotScale}&width=${shotWidth}`
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--window-size=980,320', '--virtual-time-budget=6000', `--screenshot=${shot}`, url,
    ], { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120_000 })
    console.log(shot)
    return
  }
  const dom = execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=8000', '--dump-dom', `file://${page}`,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 })
  const match = /<pre id="out">([\s\S]*?)<\/pre>/.exec(dom)
  if (!match) {
    console.error('row probe produced no report')
    process.exit(1)
  }
  const report = JSON.parse(match[1])
  if (report.failed > 0) {
    console.error(`row layout verification failed (${report.failed}):`)
    for (const failure of report.failures) console.error(`- ${failure.name}: ${failure.detail}`)
    process.exit(1)
  }
  console.log(`row layout verification passed (${report.passed} checks)`)
}

main()
