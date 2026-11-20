/**
 * Behaviour tests for the interface scale engine.
 *
 * jsdom stores CSS custom properties and `calc()` values but never computes
 * them, so these tests assert the rewritten declarations and the document
 * state (variable, region marker, subscription, disposal). The computed
 * browser semantics — including the conversation reset — are covered by
 * `dev/verify-browser.mjs`, which drives headless Chromium.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { JSDOM } from 'jsdom'

const CLIENT_SOURCE = readFileSync(new URL('../client.js', import.meta.url), 'utf8')

const FIXTURE = `<!doctype html><html><head><meta charset="utf-8">
<style>
  .chrome { font-size: 14px; line-height: 22px; }
  .important { font-size: 13px !important; }
  .height-only { height: 20px; line-height: 20px; }
  .relative { font-size: 1.2em; }
  @media (min-width: 10px) { .nested { font-size: 12px; } }
</style></head><body>
<div id="frame">
  <div id="sidebar" class="chrome">sidebar</div>
  <div id="center"><div id="conversation"><span id="chatText">chat</span></div></div>
  <div id="rightbar" data-rightbar-col></div>
  <div data-shell-bottom></div>
  <div data-shell-overlay></div>
</div>
</body></html>`

/** Minimal React surface: the row component is never rendered in these tests. */
const REACT_STUB = {
  createElement: () => null,
  useState: () => [null, () => {}],
  useEffect: () => {},
}

/**
 * Boot the real browser bundle inside jsdom with a fake client context.
 * @param t - node:test context; the jsdom window is closed when the test ends.
 * @returns handles for the document, the registered row and the fake context.
 */
function boot(t) {
  const dom = new JSDOM(FIXTURE, { runScripts: 'dangerously', url: 'http://localhost/' })
  const { window } = dom
  t.after(() => { window.close() })
  window.__ModuleLoader__ = { load(entry) { window.__superUiEntry = entry } }
  const script = window.document.createElement('script')
  script.textContent = CLIENT_SOURCE
  window.document.head.append(script)

  const entry = window.__superUiEntry
  assert.ok(entry, 'the bundle registers a module-loader entry')
  assert.equal(entry.id, '@ceasarxuu/dsh-super-ui')

  const disposers = []
  const row = {}
  let durable = 100
  let revision = 0
  const subscribers = new Set()
  const form = {
    getSnapshot: () => ({ status: 'ready', value: { fontScale: durable }, base: {}, user: {}, revision, writable: true }),
    subscribe: (listener) => { subscribers.add(listener); return () => { subscribers.delete(listener) } },
    set: (field, value) => {
      assert.equal(field, 'fontScale')
      durable = value
      revision += 1
      for (const listener of subscribers) listener()
      return Promise.resolve(true)
    },
  }
  const locales = {}
  const ctx = {
    effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose) },
    slots: {
      inject(_name, register) { register() },
      register(options, Component) { row.options = options; row.Component = Component; return () => {} },
    },
    locale: { register(namespace, dictionaries) { locales[namespace] = dictionaries; return () => {} } },
    configForms: { get: (entryId) => { assert.equal(entryId, 'super-ui'); return form } },
  }

  const plugin = entry.factory((name) => {
    if (name === 'react') return REACT_STUB
    throw new Error(`unexpected module ${name}`)
  })
  assert.deepEqual(Array.from(plugin.inject), ['slots', 'locale', 'configForms', 'remote'])
  plugin.apply(ctx)

  return {
    window,
    document: window.document,
    row,
    locales,
    disposers,
    form,
    setDurable: (next) => { durable = next; revision += 1; for (const listener of subscribers) listener() },
  }
}

/**
 * Read one declaration from the first style rule that matches a selector text.
 * @param document - test document.
 * @param selector - the fixture rule's selector (exact text match).
 * @param property - declaration name.
 * @returns the declaration value and priority.
 */
function declaration(document, selector, property) {
  for (const sheet of document.styleSheets) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (rule.selectorText !== selector) continue
      return { value: rule.style.getPropertyValue(property), priority: rule.style.getPropertyPriority(property) }
    }
  }
  return undefined
}

const WRAPPED = 'calc(14px * var(--dsh-super-ui-scale, 1))'

test('scales literal font sizes and paired line heights in place', (t) => {
  const { document } = boot(t)
  const fontSize = declaration(document, '.chrome', 'font-size')
  assert.deepEqual(fontSize, { value: WRAPPED, priority: '' })
  assert.deepEqual(declaration(document, '.chrome', 'line-height'), { value: 'calc(22px * var(--dsh-super-ui-scale, 1))', priority: '' })
})

test('keeps !important, nested media rules and non-length values intact', (t) => {
  const { document } = boot(t)
  assert.deepEqual(declaration(document, '.important', 'font-size'), { value: 'calc(13px * var(--dsh-super-ui-scale, 1))', priority: 'important' })
  assert.deepEqual(declaration(document, '.relative', 'font-size'), { value: '1.2em', priority: '' })
  const media = Array.from(document.styleSheets[0].cssRules).find((rule) => rule.media !== undefined)
  assert.ok(media, 'the fixture keeps its media rule')
  assert.equal(media.cssRules[0].style.getPropertyValue('font-size'), 'calc(12px * var(--dsh-super-ui-scale, 1))')
})

test('leaves a height/centering line height alone', (t) => {
  const { document } = boot(t)
  assert.deepEqual(declaration(document, '.height-only', 'line-height'), { value: '20px', priority: '' })
})

test('publishes the scale on the document root and marks the conversation column', (t) => {
  const { document } = boot(t)
  assert.equal(document.documentElement.style.getPropertyValue('--dsh-super-ui-scale'), '1')
  assert.equal(document.querySelector('#center').getAttribute('data-dsh-super-ui-region'), 'chat')
  assert.equal(document.querySelector('#sidebar').hasAttribute('data-dsh-super-ui-region'), false)
  assert.equal(document.querySelector('#rightbar').hasAttribute('data-dsh-super-ui-region'), false)
})

test('a global panel in the center cell clears the conversation marker', async (t) => {
  const { document } = boot(t)
  document.querySelector('#conversation').setAttribute('data-global-panel', '')
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(document.querySelector('#center').hasAttribute('data-dsh-super-ui-region'), false)
  document.querySelector('#conversation').removeAttribute('data-global-panel')
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(document.querySelector('#center').getAttribute('data-dsh-super-ui-region'), 'chat')
})

test('applies the durable value, writes the setting and clamps the range', async (t) => {
  const { form, row, document } = boot(t)
  const face = row.options.inject()
  assert.equal(face.getScale(), 100)

  face.setScale(120)
  assert.equal(face.getScale(), 120, 'the row shows the chosen value immediately')
  assert.equal(document.documentElement.style.getPropertyValue('--dsh-super-ui-scale'), '1.2')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(form.getSnapshot().value.fontScale, 120)

  face.setScale(999)
  assert.equal(face.getScale(), 150)
  face.setScale(-10)
  assert.equal(face.getScale(), 80)
})

test('a durable change from another editor updates the scale and the row', (t) => {
  const { setDurable, row, document } = boot(t)
  const face = row.options.inject()
  setDurable(90)
  assert.equal(face.getScale(), 90)
  assert.equal(document.documentElement.style.getPropertyValue('--dsh-super-ui-scale'), '0.9')
})

test('a refused write falls back to the durable value', async (t) => {
  const { form, row } = boot(t)
  const face = row.options.inject()
  form.set = () => Promise.resolve(false)
  face.setScale(140)
  assert.equal(face.getScale(), 140)
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(face.getScale(), 100, 'the refused value is not kept')
})

test('scales stylesheets inserted after startup', async (t) => {
  const { document } = boot(t)
  const late = document.createElement('style')
  late.textContent = '.late { font-size: 10px; }'
  document.head.append(late)
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(late.sheet.cssRules[0].style.getPropertyValue('font-size'), 'calc(10px * var(--dsh-super-ui-scale, 1))')
})

test('disposal restores every declaration and removes the plugin stylesheet', (t) => {
  const { document, disposers } = boot(t)
  const runtime = document.querySelector('style[data-plugin-css="@ceasarxuu/dsh-super-ui/runtime"]')
  assert.ok(runtime, 'the plugin owns one runtime stylesheet')

  for (const dispose of disposers) dispose()

  assert.deepEqual(declaration(document, '.chrome', 'font-size'), { value: '14px', priority: '' })
  assert.deepEqual(declaration(document, '.chrome', 'line-height'), { value: '22px', priority: '' })
  assert.deepEqual(declaration(document, '.important', 'font-size'), { value: '13px', priority: 'important' })
  assert.equal(document.documentElement.style.getPropertyValue('--dsh-super-ui-scale'), '')
  assert.equal(document.querySelector('#center').hasAttribute('data-dsh-super-ui-region'), false)
  assert.equal(document.querySelector('style[data-plugin-css="@ceasarxuu/dsh-super-ui/runtime"]'), null)
})

test('registers the General row and bilingual dictionaries', (t) => {
  const { row, locales } = boot(t)
  assert.deepEqual(
    { name: row.options.name, id: row.options.id, order: row.options.order, locale: row.options.locale },
    { name: 'settings.general.item', id: 'super-ui-font-scale', order: 12, locale: 'superUi' },
  )
  assert.equal(typeof row.Component, 'function')
  assert.deepEqual(Array.from(Object.keys(locales.superUi)).sort(), ['en', 'zh'])
  for (const dictionary of Object.values(locales.superUi)) {
    assert.deepEqual(Array.from(Object.keys(dictionary)).sort(), [
      'fontScale.decrease', 'fontScale.description', 'fontScale.increase',
      'fontScale.reset', 'fontScale.title',
    ])
  }
})
