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
