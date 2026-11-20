/*
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

// ===== src/client/10-constants.js =====
/**
 * Constants, dictionaries and the one stylesheet this bundle owns.
 */

/** Module id; must equal the package name in package.json. */
const PLUGIN_ID = '@ceasarxuu/dsh-super-ui'
/** Host entry id of this plugin; the settings namespace carrying the interface scale. */
const ENTRY_ID = 'super-ui'
/** Host entry id of the shipped theme plugin; owns the chat/code/terminal typography. */
const THEME_ENTRY_ID = 'ui-theme'
/** Locale namespace owned by this plugin. */
const LOCALE_NS = 'superUi'
/**
 * Cell id of the shipped font-settings row this bundle replaces. List slots keep
 * one row per id and the lowest priority wins the cell, so registering the same
 * id with a negative priority shadows the shipped row instead of adding a second
 * one (see `settings.general.item`).
 */
const MERGED_ROW_ID = 'font-size'
/** Row position of the replaced shipped row in the General section. */
const MERGED_ROW_ORDER = 11
/** Shadowing priority: below the shipped entry's implicit 0, so this row wins the cell. */
const MERGED_ROW_PRIORITY = -1
/** Cell id used when the runtime rejects the shadowing registration (older slot core). */
const FALLBACK_ROW_ID = 'super-ui-font-settings'
/** Row position of the fallback row: right after where the shipped row sits. */
const FALLBACK_ROW_ORDER = 11.5

/** Settings field carrying the interface scale in percent. */
const SCALE_FIELD = 'fontScale'
/** Bounds/step/default of the interface scale; keep in sync with host/config.js (tested). */
const SCALE_MIN = 80
const SCALE_MAX = 150
const SCALE_STEP = 5
const SCALE_DEFAULT = 100

/** Custom property every rewritten length multiplies by. */
const SCALE_VARIABLE = '--dsh-super-ui-scale'
/** Attribute marking the surface that must keep the shipped sizes. */
const REGION_ATTRIBUTE = 'data-dsh-super-ui-region'
/** Region value used for the conversation column. */
const CHAT_REGION = 'chat'

/** Exactly the length forms the scale engine rewrites. em/%/keywords stay as-is. */
const LENGTH_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)(?:px|rem)$/i
/** Lengths inside a `font` shorthand. */
const FONT_LENGTH_PATTERN = /-?(?:\d+\.?\d*|\.\d+)(?:px|rem)\b/gi

/**
 * Accepted px range and default of each shipped font role, restated from the
 * theme package's FONT_SIZE_SPECS: the row clamps its steppers to the same range
 * the theme service validates.
 */
const FONT_SPECS = Object.freeze({
  text: Object.freeze({ min: 10, max: 22, default: 14 }),
  code: Object.freeze({ min: 10, max: 16, default: 11 }),
  terminal: Object.freeze({ min: 10, max: 20, default: 13 }),
})
/** Shipped font sizes before the theme service has answered. */
const DEFAULT_FONT_SIZES = Object.freeze({ text: 14, code: 11, terminal: 13 })
/** Shipped font lists (empty means the built-in stack). */
const DEFAULT_FONT_FAMILIES = Object.freeze({ text: '', code: '', terminal: '' })

/** Row styles plus the one document-level rule the engine relies on. */
const RUNTIME_STYLE_TEXT = `
.dsh-sui-item{display:flex;flex-direction:column}
.dsh-sui-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
.dsh-sui-item > :last-child,.dsh-sui-item > :last-child > .dsh-sui-row:last-child{border-bottom:0}
.dsh-sui-text{flex:1;min-width:180px;display:flex;flex-direction:column;gap:4px;padding-right:16px}
.dsh-sui-title{font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}
.dsh-sui-desc{font-size:12px;font-weight:400;line-height:18px;color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}
.dsh-sui-control{display:inline-flex;align-items:center;gap:8px;flex:none}
.dsh-sui-stepper{position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:100px;height:36px;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-module-platform)}
.dsh-sui-value{min-width:34px;text-align:center;font-size:14px;line-height:22px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary)}
.dsh-sui-unit{font-size:14px;line-height:22px;color:var(--dsw-alias-label-secondary)}
.dsh-sui-arrows{position:absolute;right:8px;display:flex;flex-direction:column;gap:2px;opacity:0}
@media (hover:hover){.dsh-sui-stepper:hover .dsh-sui-arrows{opacity:1}}
.dsh-sui-stepper:focus-within .dsh-sui-arrows{opacity:1}
@media (hover:none){.dsh-sui-arrows{opacity:1}}
.dsh-sui-arrow{display:inline-flex;align-items:center;justify-content:center;width:17px;height:12px;padding:0;border:none;border-radius:var(--dsw-radius-xs);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 75%,transparent);color:var(--dsw-alias-label-primary);cursor:pointer}
@media (hover:hover){.dsh-sui-arrow:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1)}}
.dsh-sui-arrow:disabled{color:var(--dsw-alias-label-caption);cursor:default}
.dsh-sui-reset{border:none;background:transparent;padding:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);cursor:pointer;white-space:nowrap}
@media (hover:hover){.dsh-sui-reset:hover{color:var(--dsw-alias-label-secondary)}}
.dsh-sui-expander{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:var(--dsw-radius-xs);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
@media (hover:hover){.dsh-sui-expander:hover{background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-sui-expander svg{transition:transform var(--ds-transition-duration-fast) var(--ds-ease-in-out)}
.dsh-sui-expander[aria-expanded='true'] svg{transform:rotate(180deg)}
.dsh-sui-field{flex:0 1 240px;min-width:0;height:32px;padding:0 10px;border:0.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);font-size:14px;line-height:20px;font-family:inherit;box-sizing:border-box}
.dsh-sui-field:focus{outline:none;border-color:var(--dsw-alias-border-l4)}
@media (pointer:coarse){.dsh-sui-field{font-size:16px}}
@media (max-width:767px){.dsh-sui-text{padding-right:0}.dsh-sui-field{flex-basis:100%}}
[${REGION_ATTRIBUTE}='${CHAT_REGION}']{${SCALE_VARIABLE}:1}
`

/** Row copy: zh and en are the required baselines, other locales fall back to en. */
const DICTIONARIES = {
  zh: {
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
  },
  en: {
    'row.chat.title': 'Chat font size',
    'row.chat.description': 'Only affects conversation content',
    'row.ui.title': 'Interface font size',
    'row.ui.description': 'Only affects interface text outside the chat: sidebars, settings pages, menus and dialogs',
    'row.more': 'More font settings',
    'row.reset': 'Reset',
    'step.increase': 'Increase ',
    'step.decrease': 'Decrease ',
    'fontSize.unit': 'px',
    'fontSize.code.title': 'Code font size',
    'fontSize.code.description': 'Used for code blocks, inline code and tool output',
    'fontSize.terminal.title': 'Terminal font size',
    'fontSize.terminal.description': 'Used for the sidebar terminal',
    'fontFamily.text.title': 'Body font',
    'fontFamily.text.description': 'Used for the interface and conversation text. Comma-separated; empty keeps the default',
    'fontFamily.code.title': 'Code font',
    'fontFamily.code.description': 'Used for code blocks, inline code and tool output. Comma-separated; empty keeps the default',
    'fontFamily.terminal.title': 'Terminal font',
    'fontFamily.terminal.description': 'Used for the sidebar terminal. Comma-separated; empty keeps the default',
    'fontFamily.placeholder': 'Default',
  },
}

// ===== src/client/20-helpers.js =====
/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Clamp a stored scale to the accepted range.
 * @param value - candidate percentage.
 * @returns an integer inside {@link SCALE_MIN}..{@link SCALE_MAX}.
 */
function clampPercent(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return SCALE_DEFAULT
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(value)))
}

/**
 * Tiny framework-free observable for the settings row: the scale engine
 * owns the value, the row renders it through `useSyncExternalStore`.
 * @param initial - initial snapshot.
 * @returns snapshot/subscribe/set face.
 */
function createObservable(initial) {
  let snapshot = initial
  const listeners = new Set()
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    set: (next) => {
      if (next === snapshot) return
      snapshot = next
      for (const listener of Array.from(listeners)) {
        try { listener() } catch (_listenerFailed) { /* one bad subscriber must not stop the rest */ }
      }
    },
  }
}

/**
 * Subscribe with `useSyncExternalStore` when React provides it, otherwise
 * with the React 17-compatible effect fallback.
 * @param subscribe - registration returning its disposer.
 * @param getSnapshot - current value reader.
 * @returns the rendered value.
 */
function useObservedValue(subscribe, getSnapshot) {
  if (typeof React.useSyncExternalStore === 'function') {
    return React.useSyncExternalStore(subscribe, getSnapshot)
  }
  const [value, setValue] = React.useState(getSnapshot)
  React.useEffect(() => {
    setValue(getSnapshot())
    return subscribe(() => { setValue(getSnapshot()) })
  }, [subscribe, getSnapshot])
  return value
}

// ===== src/client/30-scale-engine.js =====
/* ------------------------------------------------------------------ */
/* CSSOM scaling engine                                                */
/* ------------------------------------------------------------------ */

/**
 * Wrap one length so it follows the scale variable, e.g.
 * `14px` -> `calc(14px * var(--dsh-super-ui-scale, 1))`.
 * @param value - a single px or rem length.
 * @returns the wrapped declaration value.
 */
function wrapLength(value) {
  return `calc(${value} * var(${SCALE_VARIABLE}, 1))`
}

/**
 * Scale one length-valued declaration in place and keep a restore record.
 * Values already carrying a variable, a calc, or any other unit are skipped.
 * @param style - declaration block to mutate.
 * @param property - `font-size` or `line-height`.
 * @param records - restore records, appended when the write landed.
 * @returns whether the declaration was wrapped.
 */
function scaleLength(style, property, records) {
  let raw
  try { raw = style.getPropertyValue(property) } catch (_unreadable) { return false }
  const value = raw.trim()
  if (value === '' || value.includes('var(') || !LENGTH_PATTERN.test(value)) return false
  let priority = ''
  try { priority = style.getPropertyPriority(property) } catch (_unreadable) { priority = '' }
  try { style.setProperty(property, wrapLength(value), priority) } catch (_rejected) { return false }
  if (style.getPropertyValue(property) === value) return false
  records.push({ style, property, value, priority })
  return true
}

/**
 * Scale the size and line-height of a `font` shorthand when it carries
 * literal lengths; a value the browser refuses is put back untouched.
 * @param style - declaration block to mutate.
 * @param records - restore records, appended when the write landed.
 */
function scaleFontShorthand(style, records) {
  let raw
  try { raw = style.getPropertyValue('font') } catch (_unreadable) { return }
  const value = raw.trim()
  if (value === '' || value.includes('var(')) return
  const next = value.replace(FONT_LENGTH_PATTERN, (match) => wrapLength(match))
  if (next === value) return
  let priority = ''
  try { priority = style.getPropertyPriority('font') } catch (_unreadable) { priority = '' }
  try { style.setProperty('font', next, priority) } catch (_rejected) { return }
  if (style.getPropertyValue('font') === value) return
  records.push({ style, property: 'font', value, priority })
}

/**
 * Walk one rule list, scaling declarations and descending into grouping
 * rules (`@media`, `@supports`, `@container`, `@layer`, nested rules, `@import`).
 * @param rules - rule list of a stylesheet or grouping rule.
 * @param records - restore records shared by the whole pass.
 */
function scaleRuleList(rules, records) {
  for (let index = 0; index < rules.length; index += 1) {
    let rule
    try { rule = rules[index] } catch (_unreadable) { continue }
    if (rule === null || typeof rule !== 'object') continue
    let style = null
    try { style = rule.style } catch (_unreadable) { style = null }
    if (style) {
      const fontScaled = scaleLength(style, 'font-size', records)
      // `line-height` follows only a typography pair in the same rule:
      // height/centering rules keep their shipped geometry.
      if (fontScaled) scaleLength(style, 'line-height', records)
      scaleFontShorthand(style, records)
    }
    let nested = null
    try { nested = rule.cssRules } catch (_unreadable) { nested = null }
    if (nested && nested.length > 0) scaleRuleList(nested, records)
    let imported = null
    try { imported = rule.styleSheet } catch (_unreadable) { imported = null }
    if (imported) scaleStylesheet(imported, records)
  }
}

/**
 * Scale every rule of one same-origin stylesheet; cross-origin sheets stay
 * unreachable (the browser throws on `cssRules`) and are skipped.
 * @param sheet - stylesheet to mutate.
 * @param records - restore records shared by the whole pass.
 * @returns the number of rules seen, 0 when the sheet is unreadable or still loading.
 */
function scaleStylesheet(sheet, records) {
  let rules
  try { rules = sheet.cssRules } catch (_crossOrigin) { return 0 }
  if (!rules || rules.length === 0) return 0
  scaleRuleList(rules, records)
  return rules.length
}

/** Interface scale engine: owns the rewritten declarations and the document variable. */
class InterfaceScale {
  /**
   * @param window - browser window owning the document.
   */
  constructor(window) {
    this.window = window
    this.document = window.document
    this.factor = 1
    this.started = false
    this.records = []
    this.rewrittenSheets = new WeakSet()
    this.listeners = []
    this.observers = []
    this.watchedLinks = new WeakSet()
    this.region = null
    this.styleElement = null
  }

  /** Start rewriting, observe later stylesheets, and publish the current factor. */
  start() {
    if (this.started) return
    this.started = true
    this.installRuntimeStyles()
    this.observe()
    this.rescanStyles()
    this.ensureRegion()
    this.syncFactor()
  }

  /** Create the one stylesheet this plugin owns (row styles + the chat reset rule). */
  installRuntimeStyles() {
    const element = this.document.createElement('style')
    element.setAttribute('data-plugin', PLUGIN_ID)
    element.setAttribute('data-plugin-css', `${PLUGIN_ID}/runtime`)
    element.textContent = RUNTIME_STYLE_TEXT
    this.document.head.append(element)
    this.styleElement = element
  }

  /** Scale every readable stylesheet that has not been processed yet. */
  rescanStyles() {
    const sheets = []
    try { sheets.push(...this.document.styleSheets) } catch (_unreadable) { /* no document */ }
    if (Array.isArray(this.document.adoptedStyleSheets)) sheets.push(...this.document.adoptedStyleSheets)
    for (const sheet of sheets) {
      if (!sheet || this.rewrittenSheets.has(sheet)) continue
      if (scaleStylesheet(sheet, this.records) > 0) { this.rewrittenSheets.add(sheet); continue }
      this.watchPendingLink(sheet)
    }
  }

  /**
   * A `<link>` stylesheet may still be loading when it is first seen; scan
   * it once more when the load event lands instead of silently skipping it.
   * @param sheet - stylesheet whose rules were not readable yet.
   */
  watchPendingLink(sheet) {
    const owner = sheet.ownerNode
    if (!owner || owner.tagName !== 'LINK' || this.watchedLinks.has(owner)) return
    this.watchedLinks.add(owner)
    owner.addEventListener('load', () => { this.rescanStyles() }, { once: true })
  }

  /** Observe inserted stylesheets and the shell structure the region marker needs. */
  observe() {
    const MutationObserver = this.window.MutationObserver
    if (typeof MutationObserver !== 'function') return
    const root = this.document.documentElement
    if (!root) return
    const observer = new MutationObserver((mutations) => {
      let styles = false
      let structure = false
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') { structure = true; continue }
        if (this.touchesShell(mutation.addedNodes) || this.touchesShell(mutation.removedNodes)) structure = true
        if (this.touchesStylesheet(mutation.addedNodes)) styles = true
        // A stylesheet whose text was replaced in place has no new element.
        const target = mutation.target
        if (target && target.nodeType === 1 && target.tagName === 'STYLE') styles = true
      }
      if (styles) this.rescanStyles()
      if (structure) this.ensureRegion()
    })
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-global-panel'],
    })
    this.observers.push(observer)
  }

  /**
   * Whether a mutation batch added a stylesheet or a subtree holding one.
   * @param nodes - added node list.
   * @returns true when a rescan is needed.
   */
  touchesStylesheet(nodes) {
    for (const node of nodes) {
      if (node.nodeType !== 1) continue
      if (node.tagName === 'STYLE' || node.tagName === 'LINK') return true
      if (typeof node.querySelector === 'function' && node.querySelector('style, link[rel="stylesheet"]') !== null) return true
    }
    return false
  }

  /**
   * Whether a mutation batch added or removed shell frame nodes (the region
   * marker must be re-resolved after a frame or global-panel change).
   * @param nodes - added or removed node list.
   * @returns true when the region needs re-checking.
   */
  touchesShell(nodes) {
    for (const node of nodes) {
      if (node.nodeType !== 1) continue
      if (node.hasAttribute(REGION_ATTRIBUTE)) return true
      if (typeof node.querySelector === 'function'
        && node.querySelector(`[data-shell-overlay], [data-rightbar-col], [${REGION_ATTRIBUTE}]`) !== null) return true
    }
    return false
  }

  /**
   * Resolve the conversation column: the center grid cell of the shell frame
   * (the sibling before the rightbar column). It is found structurally
   * because the frame publishes attributes only for its side columns.
   * @returns the center column element, or null while the shell is absent.
   */
  findConversationSurface() {
    const overlay = this.document.querySelector('[data-shell-overlay]')
    if (!overlay) return null
    const frame = overlay.parentElement
    if (!frame) return null
    const rightbar = frame.querySelector('[data-rightbar-col]')
    if (!rightbar) return null
    const center = rightbar.previousElementSibling
    return center && center.nodeType === 1 ? center : null
  }

  /**
   * Mark the conversation column, unless it currently hosts a global panel
   * (settings/management surfaces open in the center cell and must scale).
   */
  ensureRegion() {
    const surface = this.findConversationSurface()
    if (surface !== this.region) {
      if (this.region && this.region.isConnected) this.region.removeAttribute(REGION_ATTRIBUTE)
      this.region = surface
    }
    if (!surface) return
    let globalPanel = null
    try { globalPanel = surface.querySelector('[data-global-panel]') } catch (_unreadable) { globalPanel = null }
    if (globalPanel) surface.removeAttribute(REGION_ATTRIBUTE)
    else surface.setAttribute(REGION_ATTRIBUTE, CHAT_REGION)
  }

  /** Publish the current factor on the document root (the property inherits everywhere). */
  syncFactor() {
    try { this.document.documentElement.style.setProperty(SCALE_VARIABLE, String(this.factor)) } catch (_unreadable) { /* document gone */ }
    this.ensureRegion()
  }

  /**
   * Set the scale factor; 1 is the shipped size.
   * @param factor - positive finite multiplier.
   */
  setFactor(factor) {
    if (typeof factor !== 'number' || !Number.isFinite(factor) || factor <= 0) return
    this.factor = factor
    if (this.started) this.syncFactor()
  }

  /** Restore every rewritten declaration, drop the marker and remove observers. */
  dispose() {
    if (!this.started) return
    this.started = false
    for (const observer of this.observers) {
      try { observer.disconnect() } catch (_alreadyGone) { /* detached document */ }
    }
    this.observers.length = 0
    for (let index = this.records.length - 1; index >= 0; index -= 1) {
      const record = this.records[index]
      try { record.style.setProperty(record.property, record.value, record.priority) } catch (_detachedSheet) { /* sheet gone */ }
    }
    this.records.length = 0
    try { this.document.documentElement.style.removeProperty(SCALE_VARIABLE) } catch (_unreadable) { /* document gone */ }
    if (this.region) {
      try { this.region.removeAttribute(REGION_ATTRIBUTE) } catch (_unreadable) { /* element gone */ }
      this.region = null
    }
    if (this.styleElement) {
      try { this.styleElement.remove() } catch (_unreadable) { /* already gone */ }
      this.styleElement = null
    }
    for (const dispose of this.listeners) {
      try { dispose() } catch (_unreadable) { /* already disposed */ }
    }
    this.listeners.length = 0
    this.rewrittenSheets = new WeakSet()
  }
}

// ===== src/client/40-model.js =====
/**
 * Mirror of the shipped typography owned by the theme service.
 *
 * The merged font row edits chat/code/terminal sizes and font lists through the
 * theme service (`ctx.theme`), which owns validation and normalization, so this
 * bundle never writes those settings fields itself. The model keeps a tiny
 * observable the row renders and stays in sync through `theme/change`.
 */

/**
 * Create the read/write face over the shipped typography.
 * @param theme - the client `theme` service (`getTheme`/`setFontSize`/`setFontFamily`).
 * @returns observable snapshot plus validated write helpers.
 */
function createTypographyModel(theme) {
  const observable = createObservable(Object.freeze({
    sizes: { ...DEFAULT_FONT_SIZES },
    families: { ...DEFAULT_FONT_FAMILIES },
  }))

  /** Adopt the service snapshot; skips equal values so the row does not re-render. */
  const adopt = () => {
    let snapshot
    try { snapshot = theme.getTheme() } catch (_unreadable) { return }
    if (!snapshot || !snapshot.fontSizes || !snapshot.fontFamilies) return
    const sizes = { ...DEFAULT_FONT_SIZES, ...snapshot.fontSizes }
    const families = { ...DEFAULT_FONT_FAMILIES, ...snapshot.fontFamilies }
    const previous = observable.getSnapshot()
    const unchanged = ['text', 'code', 'terminal'].every(role =>
      sizes[role] === previous.sizes[role] && families[role] === previous.families[role])
    if (unchanged) return
    observable.set(Object.freeze({ sizes: Object.freeze(sizes), families: Object.freeze(families) }))
  }

  return {
    observable,
    adopt,
    /**
     * Step one role's size by `delta` px within its accepted range. The theme
     * service validates the value and publishes the change.
     * @param role - `text`, `code` or `terminal`.
     * @param delta - signed px step.
     */
    stepSize(role, delta) {
      const spec = FONT_SPECS[role]
      const current = observable.getSnapshot().sizes[role]
      if (!spec || typeof current !== 'number') return
      const next = Math.min(spec.max, Math.max(spec.min, Math.round(current + delta)))
      if (next === current) return
      try {
        theme.setFontSize(role, next)
      } catch (error) {
        console.warn('[super-ui] theme refused a font size:', error)
      }
      adopt()
    },
    /**
     * Commit one role's font list; the theme service normalizes and applies it.
     * @param role - `text`, `code` or `terminal`.
     * @param value - comma-separated family names; empty keeps the built-in stack.
     */
    setFamily(role, value) {
      try {
        theme.setFontFamily(role, value)
      } catch (error) {
        console.warn('[super-ui] theme refused a font list:', error)
      }
      adopt()
    },
  }
}

// ===== src/client/50-rows.js =====
/**
 * The merged font-settings row and its pieces.
 *
 * One General-section row now owns both axes: 聊天字号 (the shipped conversation
 * content size, written through the theme service) and 界面字号 (this bundle's
 * interface scale). The shipped "more font settings" disclosure is preserved:
 * the chevron after the chat size opens the body/code/terminal font lists and
 * the code/terminal sizes.
 */

/**
 * Chevron used by the stepper arrows and the disclosure button.
 * @param up - true for the increase arrow.
 * @returns the SVG element.
 */
function chevron(up) {
  return h('svg', { width: 9, height: 9, viewBox: '0 0 10 10', 'aria-hidden': true },
    h('path', {
      d: up ? 'M1 7 L5 3 L9 7' : 'M1 3 L5 7 L9 3',
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
    }))
}

/**
 * Stable id for the disclosure region, with a React 17 fallback.
 * @returns the region id.
 */
function useRegionId() {
  if (typeof React.useId === 'function') return React.useId()
  const [id] = React.useState(() => `dsh-sui-region-${Math.random().toString(36).slice(2)}`)
  return id
}

/**
 * Stepper pill plus its unit label and one optional trailing control.
 * @param props - current value, accepted range, step, unit, labels and writer.
 * @returns the control element.
 */
function Stepper(props) {
  const { value, min, max, step, unit, increaseLabel, decreaseLabel, onStep, trailing } = props
  return h('div', { className: 'dsh-sui-control' },
    h('div', { className: 'dsh-sui-stepper' },
      h('span', { className: 'dsh-sui-value' }, String(value)),
      h('span', { className: 'dsh-sui-arrows' },
        h('button', {
          type: 'button',
          className: 'dsh-sui-arrow',
          'aria-label': increaseLabel,
          disabled: value >= max,
          onClick: () => { onStep(step) },
        }, chevron(true)),
        h('button', {
          type: 'button',
          className: 'dsh-sui-arrow',
          'aria-label': decreaseLabel,
          disabled: value <= min,
          onClick: () => { onStep(-step) },
        }, chevron(false)))),
    h('span', { className: 'dsh-sui-unit' }, unit),
    trailing ?? null)
}

/**
 * Font-list field: blur or Enter commits the list, an empty field restores the
 * built-in stack. The field remounts when the persisted list changes.
 * @param props - row copy, persisted value, placeholder and commit writer.
 * @returns the row element.
 */
function FontFamilyField(props) {
  return h('div', { className: 'dsh-sui-row' },
    h('div', { className: 'dsh-sui-text' },
      h('div', { className: 'dsh-sui-title' }, props.title),
      h('div', { className: 'dsh-sui-desc' }, props.description)),
    h('input', {
      key: props.value,
      className: 'dsh-sui-field',
      defaultValue: props.value,
      placeholder: props.placeholder,
      'aria-label': props.title,
      spellCheck: false,
      autoComplete: 'off',
      maxLength: 200,
      onBlur: (event) => { props.commit(event.currentTarget.value) },
      onKeyDown: (event) => {
        // Some IMEs report composition only through keyCode 229; never commit mid-composition.
        if (event.nativeEvent && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) return
        if (event.key === 'Enter') event.currentTarget.blur()
      },
    }))
}

/**
 * One code/terminal size row (the chat row is rendered inline in the merged row).
 * @param role - `code` or `terminal`.
 * @param pieces - resolved copy and writers shared by the merged row.
 * @returns the row element.
 */
function fontSizeRow(role, pieces) {
  const { t, sizes, stepSize } = pieces
  const spec = FONT_SPECS[role]
  const title = t(`fontSize.${role}.title`)
  return h('div', { key: `size-${role}`, className: 'dsh-sui-row' },
    h('div', { className: 'dsh-sui-text' },
      h('div', { className: 'dsh-sui-title' }, title),
      h('div', { className: 'dsh-sui-desc' }, t(`fontSize.${role}.description`))),
    h(Stepper, {
      value: sizes[role],
      min: spec.min,
      max: spec.max,
      step: 1,
      unit: t('fontSize.unit'),
      increaseLabel: t('step.increase') + title,
      decreaseLabel: t('step.decrease') + title,
      onStep: (delta) => { stepSize(role, delta) },
    }))
}

/**
 * The merged font-settings row registered into `settings.general.item`.
 * @param props - slot runtime props (`t`) plus the injected writing face.
 * @returns the merged row element tree.
 */
function MergedFontSettings(props) {
  const t = typeof props.t === 'function' ? props.t : (key) => key
  const scale = useObservedValue(props.subscribeScale, props.getScale)
  const typography = useObservedValue(props.subscribeTypography, props.getTypography)
  const [open, setOpen] = React.useState(false)
  const regionId = useRegionId()
  const sizes = (typography && typography.sizes) || DEFAULT_FONT_SIZES
  const families = (typography && typography.families) || DEFAULT_FONT_FAMILIES
  const textSpec = FONT_SPECS.text
  const chatTitle = t('row.chat.title')
  const pieces = { t, sizes, stepSize: props.stepSize }

  return h('div', { className: 'dsh-sui-item' },
    // Chat font size (the shipped conversation axis) with the preserved disclosure.
    h('div', { className: 'dsh-sui-row' },
      h('div', { className: 'dsh-sui-text' },
        h('div', { className: 'dsh-sui-title' }, chatTitle),
        h('div', { className: 'dsh-sui-desc' }, t('row.chat.description'))),
      h(Stepper, {
        value: sizes.text,
        min: textSpec.min,
        max: textSpec.max,
        step: 1,
        unit: t('fontSize.unit'),
        increaseLabel: t('step.increase') + chatTitle,
        decreaseLabel: t('step.decrease') + chatTitle,
        onStep: (delta) => { props.stepSize('text', delta) },
        trailing: h('button', {
          type: 'button',
          className: 'dsh-sui-expander',
          'aria-label': t('row.more'),
          title: t('row.more'),
          'aria-expanded': open,
          'aria-controls': regionId,
          onClick: () => { setOpen(value => !value) },
        }, chevron(false)),
      })),
    // Interface font size (this bundle's non-chat axis).
    h('div', { className: 'dsh-sui-row' },
      h('div', { className: 'dsh-sui-text' },
        h('div', { className: 'dsh-sui-title' }, t('row.ui.title')),
        h('div', { className: 'dsh-sui-desc' }, t('row.ui.description'))),
      h(Stepper, {
        value: scale,
        min: SCALE_MIN,
        max: SCALE_MAX,
        step: SCALE_STEP,
        unit: '%',
        increaseLabel: t('step.increase') + t('row.ui.title'),
        decreaseLabel: t('step.decrease') + t('row.ui.title'),
        onStep: (delta) => { props.setScale(scale + delta) },
        trailing: scale === SCALE_DEFAULT
          ? null
          : h('button', {
            type: 'button',
            className: 'dsh-sui-reset',
            onClick: () => { props.setScale(SCALE_DEFAULT) },
          }, t('row.reset')),
      })),
    // The shipped disclosure contents, unchanged in behavior.
    open
      ? h('div', { id: regionId },
        h(FontFamilyField, {
          title: t('fontFamily.text.title'),
          description: t('fontFamily.text.description'),
          value: families.text,
          placeholder: t('fontFamily.placeholder'),
          commit: (value) => { props.setFamily('text', value) },
        }),
        h(FontFamilyField, {
          title: t('fontFamily.code.title'),
          description: t('fontFamily.code.description'),
          value: families.code,
          placeholder: t('fontFamily.placeholder'),
          commit: (value) => { props.setFamily('code', value) },
        }),
        fontSizeRow('code', pieces),
        h(FontFamilyField, {
          title: t('fontFamily.terminal.title'),
          description: t('fontFamily.terminal.description'),
          value: families.terminal,
          placeholder: t('fontFamily.placeholder'),
          commit: (value) => { props.setFamily('terminal', value) },
        }),
        fontSizeRow('terminal', pieces))
      : null)
}

// ===== src/client/60-plugin.js =====
/**
 * Plugin body: mount the interface scale engine, the typography mirror and the
 * merged General-settings row.
 */

/** The General-section slot the row occupies. */
const ROW_SLOT = 'settings.general.item'

/** Required client services: slots/locale/forms for the row, theme for typography. */
const inject = ['slots', 'locale', 'configForms', 'remote', 'theme']

/**
 * Mount everything this bundle owns.
 * @param ctx - client plugin context.
 */
function apply(ctx) {
  const window = globalThis.window
  const engine = new InterfaceScale(window)
  const scale = createObservable(SCALE_DEFAULT)
  const typography = createTypographyModel(ctx.theme)
  /** Last requested interface scale while its settings write is still settling. */
  let pendingScale = null
  /** Number of queued interface-scale writes. */
  let inflight = 0

  ctx.effect(() => {
    try {
      engine.start()
    } catch (error) {
      // The row must survive a degraded document (no stylesheets, detached head).
      console.warn('[super-ui] interface scale engine failed to start:', error)
    }
    return () => { engine.dispose() }
  }, 'super-ui: interface scale engine')

  ctx.effect(() => ctx.locale.register(LOCALE_NS, DICTIONARIES), 'super-ui: settings dictionaries')

  // Keep the row in step with the shipped typography (including the Cmd/Ctrl +/- shortcuts).
  ctx.effect(() => ctx.on('theme/change', () => { typography.adopt() }), 'super-ui: typography mirror')
  typography.adopt()

  const form = ctx.configForms.get(ENTRY_ID)
  /** Adopt the durable interface scale; an unsettled own write keeps the optimistic one. */
  const adoptScale = () => {
    let snapshot
    try { snapshot = form.getSnapshot() } catch (_unreadable) { return }
    const section = snapshot && snapshot.value
    if (!section || typeof section[SCALE_FIELD] !== 'number') return
    const durable = clampPercent(section[SCALE_FIELD])
    if (pendingScale !== null && durable !== pendingScale && inflight > 0) return
    pendingScale = null
    scale.set(durable)
    engine.setFactor(durable / 100)
  }
  ctx.effect(() => {
    const dispose = form.subscribe(adoptScale)
    adoptScale()
    return dispose
  }, 'super-ui: durable scale subscription')

  /**
   * Publish a chosen interface scale immediately, then persist it; a refused
   * write falls back to the durable value.
   * @param next - requested percentage.
   */
  const writeScale = (next) => {
    const chosen = clampPercent(next)
    pendingScale = chosen
    scale.set(chosen)
    engine.setFactor(chosen / 100)
    inflight += 1
    let settled
    try { settled = form.set(SCALE_FIELD, chosen) } catch (thrown) { settled = Promise.reject(thrown) }
    Promise.resolve(settled).catch(() => false).then((accepted) => {
      inflight -= 1
      if (!accepted && inflight === 0) {
        pendingScale = null
        adoptScale()
      }
    })
  }

  const options = {
    name: ROW_SLOT,
    id: MERGED_ROW_ID,
    order: MERGED_ROW_ORDER,
    locale: LOCALE_NS,
    priority: MERGED_ROW_PRIORITY,
    inject: () => ({
      subscribeScale: scale.subscribe,
      getScale: scale.getSnapshot,
      setScale: writeScale,
      subscribeTypography: typography.observable.subscribe,
      getTypography: typography.observable.getSnapshot,
      stepSize: (role, delta) => { typography.stepSize(role, delta) },
      setFamily: (role, value) => { typography.setFamily(role, value) },
    }),
  }

  ctx.slots.inject(ROW_SLOT, () => {
    try {
      return ctx.slots.register(options, MergedFontSettings)
    } catch (error) {
      // An older slot core may reject the shadowing priority; keep the row usable
      // by registering it beside the shipped one instead of replacing it.
      console.warn('[super-ui] cannot shadow the shipped font row; adding a separate row instead:', error)
      const { priority: _priority, ...fallback } = options
      return ctx.slots.register({ ...fallback, id: FALLBACK_ROW_ID, order: FALLBACK_ROW_ORDER }, MergedFontSettings)
    }
  })
}

return { inject, apply }
  },
})
