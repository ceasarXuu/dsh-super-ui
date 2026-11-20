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
