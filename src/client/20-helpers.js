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
