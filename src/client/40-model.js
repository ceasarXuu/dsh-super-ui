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
