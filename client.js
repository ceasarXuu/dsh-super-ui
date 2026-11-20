/*
 * Super UI — browser half.
 *
 * First feature: an independent font-size scale for the interface *outside* the
 * chat surface. The shipped font-size setting owns the conversation content
 * only (`--dsh-content-font-size`); this bundle adds a second axis,
 * `--dsh-super-ui-scale`, for the shell: left and right sidebars, the session
 * header, settings pages, plugin pages, menus, dialogs and toasts.
 *
 * How it works
 * ------------
 * 1. Every same-origin stylesheet is walked once and each literal
 *    `font-size: <length>` declaration becomes
 *    `font-size: calc(<length> * var(--dsh-super-ui-scale, 1))`. A `line-height`
 *    in the same rule is wrapped the same way only when that rule also scales
 *    its font size (a typography pair); centering/height rules are left alone.
 *    The walk mutates the live CSSOM instead of injecting override copies, so
 *    selector specificity, `!important`, `@media` nesting and rule order stay
 *    exactly what the shipped stylesheets define.
 * 2. The scale itself is one inherited custom property set on `<html>`. The
 *    conversation column carries `--dsh-super-ui-scale: 1`, which turns every
 *    calc() in its subtree back into the shipped value: chat, tool cards and
 *    the composer keep their own font-size settings untouched.
 * 3. New plugin stylesheets arrive over the page lifetime (lazy modules, HMR),
 *    so a MutationObserver scales every `<style>`/`<link>` inserted later.
 *    Unloading restores every declaration and removes the observer.
 *
 * The scale setting lives in the Host settings document under the entry id
 * `super-ui`; the General row registered here writes it through
 * `ctx.configForms`, and the profile patch/`Plugins` page keeps working too.
 */
window.__ModuleLoader__.load({
  id: '@ceasarxuu/dsh-super-ui',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /* ------------------------------------------------------------------ */
    /* Constants                                                           */
    /* ------------------------------------------------------------------ */

    /** Module id; must equal the package name in package.json. */
    const PLUGIN_ID = '@ceasarxuu/dsh-super-ui'
    /** Host entry id, and therefore the settings namespace read below. */
    const ENTRY_ID = 'super-ui'
    /** Locale namespace owned by this plugin. */
    const LOCALE_NS = 'superUi'
    /** General-section row key. */
    const ROW_ID = 'super-ui-font-scale'
    /** Row position: right after the shipped `font-size` row (order 11). */
    const ROW_ORDER = 12

    /** Settings field carrying the scale. */
    const SCALE_FIELD = 'fontScale'
    /** Bounds/step/default; keep in sync with host/config.js (tested). */
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

    /** Exactly the length forms this engine scales. Keywords, em, % are left as-is. */
    const LENGTH_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)(?:px|rem)$/i
    /** Lengths inside a `font` shorthand. */
    const FONT_LENGTH_PATTERN = /-?(?:\d+\.?\d*|\.\d+)(?:px|rem)\b/gi

    /** Row styles plus the one document-level rule the engine relies on. */
    const RUNTIME_STYLE_TEXT = `
.dsh-sui-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
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
@media (max-width:767px){.dsh-sui-text{padding-right:0}}
[${REGION_ATTRIBUTE}='${CHAT_REGION}']{${SCALE_VARIABLE}:1}
`

    /** General-row copy; zh and en are the required baselines, the rest fall back to en. */
    const DICTIONARIES = {
      zh: {
        'fontScale.title': '界面字号',
        'fontScale.description': '仅影响聊天界面以外的界面文字：侧边栏、设置页、菜单与对话框',
        'fontScale.increase': '增大界面字号',
        'fontScale.decrease': '减小界面字号',
        'fontScale.reset': '重置',
      },
      en: {
        'fontScale.title': 'Interface font size',
        'fontScale.description': 'Only affects interface text outside the chat: sidebars, settings pages, menus and dialogs',
        'fontScale.increase': 'Increase interface font size',
        'fontScale.decrease': 'Decrease interface font size',
        'fontScale.reset': 'Reset',
      },
    }

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

    /* ------------------------------------------------------------------ */
    /* General settings row                                                */
    /* ------------------------------------------------------------------ */

    /**
     * Chevron used by the stepper arrows.
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
     * General section row: title + description + stepper + unit + reset.
     * @param props - slot runtime props (`t` from the bound locale namespace) and the injected face.
     * @returns the row element tree.
     */
    function UiFontScaleRow(props) {
      const percent = useObservedValue(props.subscribe, props.getScale)
      // A missing `t` seat would blank the row; the key fallback keeps it usable.
      const t = typeof props.t === 'function' ? props.t : (key) => key
      return h('div', { className: 'dsh-sui-row' },
        h('div', { className: 'dsh-sui-text' },
          h('div', { className: 'dsh-sui-title' }, t('fontScale.title')),
          h('div', { className: 'dsh-sui-desc' }, t('fontScale.description'))),
        h('div', { className: 'dsh-sui-control' },
          h('div', { className: 'dsh-sui-stepper' },
            h('span', { className: 'dsh-sui-value' }, String(percent)),
            h('span', { className: 'dsh-sui-arrows' },
              h('button', {
                type: 'button',
                className: 'dsh-sui-arrow',
                'aria-label': t('fontScale.increase'),
                disabled: percent >= SCALE_MAX,
                onClick: () => { props.setScale(percent + SCALE_STEP) },
              }, chevron(true)),
              h('button', {
                type: 'button',
                className: 'dsh-sui-arrow',
                'aria-label': t('fontScale.decrease'),
                disabled: percent <= SCALE_MIN,
                onClick: () => { props.setScale(percent - SCALE_STEP) },
              }, chevron(false)))),
          h('span', { className: 'dsh-sui-unit' }, '%'),
          percent === SCALE_DEFAULT
            ? null
            : h('button', {
              type: 'button',
              className: 'dsh-sui-reset',
              onClick: () => { props.setScale(SCALE_DEFAULT) },
            }, t('fontScale.reset'))))
    }

    /* ------------------------------------------------------------------ */
    /* Plugin body                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Mount the scale engine and the General settings row.
     * @param ctx - client plugin context.
     */
    function apply(ctx) {
      const window = globalThis.window
      const engine = new InterfaceScale(window)
      const percent = createObservable(SCALE_DEFAULT)
      /** Last requested value while its settings write is still settling. */
      let pending = null
      /** Number of queued settings writes. */
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

      ctx.effect(() => ctx.locale.register(LOCALE_NS, DICTIONARIES), 'super-ui: settings row dictionaries')

      const form = ctx.configForms.get(ENTRY_ID)
      /** Adopt the durable value; an unsettled own write keeps the optimistic one. */
      const adopt = () => {
        let snapshot
        try { snapshot = form.getSnapshot() } catch (_unreadable) { return }
        const section = snapshot && snapshot.value
        if (!section || typeof section[SCALE_FIELD] !== 'number') return
        const durable = clampPercent(section[SCALE_FIELD])
        if (pending !== null && durable !== pending && inflight > 0) return
        pending = null
        percent.set(durable)
        engine.setFactor(durable / 100)
      }
      ctx.effect(() => {
        const dispose = form.subscribe(adopt)
        adopt()
        return dispose
      }, 'super-ui: durable scale subscription')

      /**
       * Publish a chosen scale immediately, then persist it in the Host
       * settings document; a refused write falls back to the durable value.
       * @param next - requested percentage.
       */
      const writeScale = (next) => {
        const chosen = clampPercent(next)
        pending = chosen
        percent.set(chosen)
        engine.setFactor(chosen / 100)
        inflight += 1
        let settled
        try { settled = form.set(SCALE_FIELD, chosen) } catch (_threw) { settled = Promise.reject(_threw) }
        Promise.resolve(settled).catch(() => false).then((accepted) => {
          inflight -= 1
          if (!accepted && inflight === 0) {
            pending = null
            adopt()
          }
        })
      }

      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: ROW_ID,
        order: ROW_ORDER,
        locale: LOCALE_NS,
        inject: () => ({
          subscribe: percent.subscribe,
          getScale: percent.getSnapshot,
          setScale: writeScale,
        }),
      }, UiFontScaleRow))
    }

    return {
      inject: ['slots', 'locale', 'configForms', 'remote'],
      apply,
    }
  },
})
