#!/usr/bin/env node
/**
 * Layout probe for the merged General-settings row.
 *
 * Renders the real merged row component with real React in headless Chromium at
 * every accepted interface scale and at narrow and wide settings-panel widths,
 * and checks what CSS review and jsdom cannot: three-digit values must never be
 * covered by the stepper arrows, the two size rows must not overflow their
 * column, the disclosure must open the preserved font settings, and stepping a
 * value must not resize the pill.
 *
 * Usage:
 *   node dev/verify-row-layout.mjs
 *   node dev/verify-row-layout.mjs --screenshot [--scale=1.2] [--width=614] [--expanded=1]
 *
 * Exit code 0 means every check passed; the report is printed on failure. The
 * screenshot mode writes a PNG and prints its path for a visual review.
 */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import puppeteer from 'puppeteer-core'

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
const flag = (name, fallback) => (args.find((value) => value.startsWith(`--${name}=`)) ?? `--${name}=${fallback}`).slice(name.length + 3)
const shotScale = flag('scale', '1.2')
const shotWidth = flag('width', '614')
const shotExpanded = flag('expanded', '1')

/** Design tokens the row consumes; geometry only needs the names to resolve. */
const TOKENS = `
:root{
  --ds-transition-duration-fast:0.1s;--ds-ease-in-out:cubic-bezier(.4,0,.2,1);
  --dsw-radius-xs:4px;--dsw-radius-sm:8px;--dsw-radius-md:12px;
  --dsw-alias-label-primary:#f5f7fa;--dsw-alias-label-secondary:#c6cbd2;--dsw-alias-label-tertiary:#9aa1aa;
  --dsw-alias-label-caption:#7d848d;--dsw-alias-border-l2:rgba(255,255,255,.14);--dsw-alias-border-l4:rgba(255,255,255,.26);
  --dsw-alias-bg-module-platform:#2a2d33;--dsw-alias-bg-layer-1:#3a3e45;--dsw-alias-interactive-bg-hover:rgba(255,255,255,.08);
}
html,body{margin:0;background:#15171a;color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#general{padding:0 16px}
`

/** Production copy (locale/zh in client.js): the row must fit these strings. */
const ZH = {
  'row.chat.title': '聊天字号',
  'row.chat.description': '仅影响会话内容的字号',
  'row.ui.title': '界面字号',
  'row.ui.description': '仅影响聊天界面以外的界面文字：侧边栏、设置页、菜单与对话框',
  'row.more': '更多字体设置',
  'row.reset': '重置',
  'step.increase': '增大',
  'step.decrease': '减小',
  'fontSize.unit': 'px',
  'fontSize.code.title': '代码字号',
  'fontSize.code.description': '用于代码块、行内代码与工具输出',
  'fontSize.terminal.title': '终端字号',
  'fontSize.terminal.description': '用于侧栏终端',
  'fontFamily.text.title': '正文字体',
  'fontFamily.text.description': '用于界面与会话正文。多个字体用逗号分隔，留空使用默认字体',
  'fontFamily.code.title': '代码字体',
  'fontFamily.code.description': '用于代码块、行内代码与工具输出。多个字体用逗号分隔，留空使用默认字体',
  'fontFamily.terminal.title': '终端字体',
  'fontFamily.terminal.description': '用于侧栏终端。多个字体用逗号分隔，留空使用默认字体',
  'fontFamily.placeholder': '默认',
}

/** The page: React UMD + the real bundle factory + the real merged row. */
function buildPage() {
  const client = readFileSync(join(ROOT, 'client.js'), 'utf8')
  const react = readFileSync(join(ROOT, 'node_modules/react/umd/react.production.min.js'), 'utf8')
  const reactDom = readFileSync(join(ROOT, 'node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8')
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>super-ui merged row probe</title>
<style>${TOKENS}</style></head>
<body>
<div id="panel"><div id="general"></div></div>
<pre id="out">pending</pre>
<script>window.__ModuleLoader__ = { load(entry) { window.__superUiEntry = entry } }</script>
<script>${react}</script>
<script>${reactDom}</script>
<script>${client}</script>
<script>
window.onerror = (message, source, line, column) => {
  document.querySelector('#out').textContent = JSON.stringify({ passed: 0, failed: 1, failures: [{ name: 'page error', detail: String(message) + ' @' + line + ':' + column }] })
}
window.addEventListener('unhandledrejection', (event) => {
  document.querySelector('#out').textContent = JSON.stringify({ passed: 0, failed: 1, failures: [{ name: 'page rejection', detail: String(event.reason && event.reason.stack || event.reason) }] })
});
(async () => {
  const ZH = ${JSON.stringify(ZH)}
  const results = {}
  const check = (name, ok, detail) => { results[name] = { ok: Boolean(ok), detail } }
  const params = new URLSearchParams(location.search)
  const shotMode = params.get('shot') === '1'
  const shotScale = Number(params.get('scale') ?? '1.2')
  const shotWidth = Number(params.get('width') ?? '614')
  const shotExpanded = params.get('expanded') !== '0'

  // A minimal client context: the row registration and the injected face are
  // real, only the surrounding DSH services are stubbed.
  let percent = Math.round(shotScale * 100)
  const scaleListeners = new Set()
  const fontListeners = new Set()
  let themeSnapshot = {
    fontSizes: { text: 19, code: 11, terminal: 13 },
    fontFamilies: { text: 'PingFang SC', code: '', terminal: '' },
    revision: 0,
  }
  const themeListeners = new Set()
  const notify = (set) => { for (const listener of set) listener() }
  let durableScale = percent
  const scaleForm = {
    getSnapshot: () => ({ status: 'ready', value: { fontScale: durableScale }, base: {}, user: {}, revision: 0, writable: true }),
    subscribe: (listener) => { scaleListeners.add(listener); return () => scaleListeners.delete(listener) },
    set: (field, value) => { durableScale = value; return Promise.resolve(true) },
  }
  // A stable typography snapshot: useSyncExternalStore requires getSnapshot to
  // return the same reference until the state actually changes.
  let typographySnapshot = Object.freeze({
    sizes: Object.freeze({ ...themeSnapshot.fontSizes }),
    families: Object.freeze({ ...themeSnapshot.fontFamilies }),
  })
  const refreshTypography = () => {
    typographySnapshot = Object.freeze({
      sizes: Object.freeze({ ...themeSnapshot.fontSizes }),
      families: Object.freeze({ ...themeSnapshot.fontFamilies }),
    })
    notify(fontListeners)
  }
  const theme = {
    getTheme: () => themeSnapshot,
    setFontSize(role, px) {
      themeSnapshot = { ...themeSnapshot, fontSizes: { ...themeSnapshot.fontSizes, [role]: px }, revision: themeSnapshot.revision + 1 }
      for (const listener of themeListeners) listener()
      refreshTypography()
    },
    setFontFamily(role, value) {
      themeSnapshot = { ...themeSnapshot, fontFamilies: { ...themeSnapshot.fontFamilies, [role]: value }, revision: themeSnapshot.revision + 1 }
      for (const listener of themeListeners) listener()
      refreshTypography()
    },
  }
  const ctx = {
    effect(fn) { fn() },
    on(event, listener) { if (event !== 'theme/change') return () => {}; themeListeners.add(listener); return () => themeListeners.delete(listener) },
    theme,
    slots: {
      inject(_name, register) { register() },
      register(options, Component) { window.__row = { options, Component }; return () => {} },
    },
    locale: { register: () => () => {} },
    configForms: { get: () => scaleForm },
  }
  const React = window.React
  const entry = window.__superUiEntry
  const plugin = entry.factory((name) => { if (name === 'react') return React; throw new Error(name) })
  plugin.apply(ctx)

  const mount = window.__row.Component
  const root = window.ReactDOM.createRoot(document.getElementById('general'))
  const render = () => {
    root.render(React.createElement(mount, {
      t: (key) => ZH[key] ?? key,
      subscribeScale: (listener) => { scaleListeners.add(listener); return () => scaleListeners.delete(listener) },
      getScale: () => percent,
      setScale: (next) => { percent = Math.min(150, Math.max(80, next)); notify(scaleListeners); render() },
      subscribeTypography: (listener) => { fontListeners.add(listener); return () => fontListeners.delete(listener) },
      getTypography: () => typographySnapshot,
      stepSize: (role, delta) => {
        const spec = role === 'text' ? { min: 10, max: 22 } : role === 'code' ? { min: 10, max: 16 } : { min: 10, max: 20 }
        const next = Math.min(spec.max, Math.max(spec.min, themeSnapshot.fontSizes[role] + delta))
        if (next !== themeSnapshot.fontSizes[role]) theme.setFontSize(role, next)
        notify(fontListeners)
        render()
      },
      setFamily: (role, value) => { theme.setFontFamily(role, value); notify(fontListeners); render() },
    }))
  }

  const panel = document.getElementById('panel')
  panel.style.width = (shotMode ? shotWidth : 614) + 'px'
  render()
  await new Promise((resolve) => requestAnimationFrame(resolve))

  const rect = (element) => element.getBoundingClientRect()
  const overlaps = (a, b) => a.right > b.left + 0.5 && b.right > a.left + 0.5 && a.bottom > b.top + 0.5 && b.bottom > a.top + 0.5
  const applyScale = (factor) => { document.documentElement.style.setProperty('--dsh-super-ui-scale', String(factor)) }
  const rows = () => Array.from(document.querySelectorAll('.dsh-sui-item .dsh-sui-row'))

  if (shotMode) {
    applyScale(shotScale)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    for (const button of document.querySelectorAll('.dsh-sui-arrow')) button.focus()
    if (shotExpanded) {
      const expander = document.querySelector('.dsh-sui-expander')
      if (expander) expander.click()
    }
    await new Promise((resolve) => setTimeout(resolve, 60))
    document.querySelector('#out').textContent = JSON.stringify({ shot: true })
    return
  }

  // Collapsed geometry at every accepted scale and panel width.
  for (const width of [614, 900, 420]) {
    panel.style.width = width + 'px'
    for (const percentValue of [80, 100, 120, 150]) {
      percent = percentValue
      render()
      applyScale(percentValue / 100)
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const label = width + '@' + percentValue
      const visible = rows()
      check('collapsed row count ' + label, visible.length === 2, String(visible.length))
      const steppers = Array.from(document.querySelectorAll('.dsh-sui-stepper'))
      check('two steppers ' + label, steppers.length === 2, String(steppers.length))
      for (const stepper of steppers) {
        const value = stepper.querySelector('.dsh-sui-value')
        const arrows = stepper.querySelector('.dsh-sui-arrows')
        for (const button of stepper.querySelectorAll('.dsh-sui-arrow')) button.focus()
        const valueBox = rect(value)
        const arrowBox = rect(arrows)
        check('arrows clear of value ' + label + ' ' + value.textContent, !overlaps(arrowBox, valueBox),
          JSON.stringify(valueBox) + ' vs ' + JSON.stringify(arrowBox))
        check('value inside pill ' + label + ' ' + value.textContent,
          valueBox.left >= rect(stepper).left - 0.5 && valueBox.right <= rect(stepper).right + 0.5,
          JSON.stringify(valueBox) + ' vs ' + JSON.stringify(rect(stepper)))
        const control = stepper.parentElement
        check('control inside row ' + label + ' ' + value.textContent, rect(control).right <= rect(control.parentElement).right + 0.5,
          rect(control).right + ' vs ' + rect(control.parentElement).right)
      }
      check('no page overflow ' + label, document.documentElement.scrollWidth <= Math.max(width, window.innerWidth) + 1,
        document.documentElement.scrollWidth + ' / ' + window.innerWidth)
    }
  }

  // The disclosure opens the preserved shipped font settings.
  panel.style.width = '614px'
  percent = 120
  applyScale(1.2)
  render()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const expander = document.querySelector('.dsh-sui-expander')
  check('expander present', expander !== null, String(expander))
  check('disclosure starts collapsed', expander.getAttribute('aria-expanded') === 'false', expander.getAttribute('aria-expanded'))
  expander.click()
  await new Promise((resolve) => setTimeout(resolve, 80))
  check('disclosure expands to seven rows', rows().length === 7, String(rows().length))
  check('three font fields visible', document.querySelectorAll('.dsh-sui-field').length === 3,
    String(document.querySelectorAll('.dsh-sui-field').length))
  check('expander reports expanded', document.querySelector('.dsh-sui-expander').getAttribute('aria-expanded') === 'true', 'aria-expanded')

  // Stepping across digit counts must not resize the pill (no jitter).
  const chatBefore = themeSnapshot.fontSizes.text
  const chatPill = () => rect(document.querySelectorAll('.dsh-sui-stepper')[0]).width
  const chatWidth = chatPill()
  percent = 95
  render()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const twoDigit = rect(document.querySelectorAll('.dsh-sui-stepper')[1]).width
  percent = 120
  render()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const threeDigit = rect(document.querySelectorAll('.dsh-sui-stepper')[1]).width
  check('interface pill width stable across digit counts', Math.abs(twoDigit - threeDigit) <= 0.5, twoDigit + ' / ' + threeDigit)
  check('chat pill width stable while stepping', Math.abs(chatWidth - chatPill()) <= 0.5, chatWidth + ' / ' + chatPill())
  check('chat size unchanged by interface steps', themeSnapshot.fontSizes.text === chatBefore, String(themeSnapshot.fontSizes.text))

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
  for (const candidate of CHROME_CANDIDATES) if (candidate && existsSync(candidate)) return candidate
  throw new Error('Chrome not found; set CHROME to a Chromium-based executable')
}

async function main() {
  const directory = mkdtempSync(join(tmpdir(), 'super-ui-row-'))
  const pagePath = join(directory, 'row.html')
  writeFileSync(pagePath, buildPage())
  if (process.env.KEEP === '1') console.error('page:', pagePath)
  const chrome = findChrome()
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  })
  try {
    const page = await browser.newPage()
    page.on('pageerror', (error) => console.error('page error:', error && error.stack ? error.stack : String(error)))
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') console.error(`console.${message.type()}:`, message.text())
    })
    await page.setViewport({ width: 980, height: 900 })
    const query = screenshotMode
      ? `?shot=1&scale=${shotScale}&width=${shotWidth}&expanded=${shotExpanded}`
      : ''
    await page.goto(`file://${pagePath}${query}`, { waitUntil: 'load', timeout: 60_000 })
    if (screenshotMode) {
      await page.waitForFunction(() => document.querySelector('#out').textContent !== 'pending', { timeout: 30_000 })
      await new Promise((resolve) => setTimeout(resolve, 250))
      const shot = join(directory, `row-${shotWidth}-${shotScale}-${shotExpanded}.png`)
      await page.screenshot({ path: shot, fullPage: true })
      console.log(shot)
      return
    }
    await page.waitForFunction(() => {
      const text = document.querySelector('#out').textContent
      return text !== 'pending'
    }, { timeout: 60_000 })
    const reportText = await page.$eval('#out', (element) => element.textContent)
    const report = JSON.parse(reportText)
    if (report.failed > 0) {
      console.error(`row layout verification failed (${report.failed}):`)
      for (const failure of report.failures) console.error(`- ${failure.name}: ${failure.detail}`)
      process.exitCode = 1
      return
    }
    console.log(`row layout verification passed (${report.passed} checks)`)
  } finally {
    await browser.close()
  }
}

main()
