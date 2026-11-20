/**
 * Interface font-scale bounds shared by the host schema and the browser half.
 *
 * The browser bundle is a standalone module-loader artifact and cannot import
 * this file, so `client.js` restates the same numbers; `test/scale.test.mjs`
 * asserts the two stay equal.
 */

/** Accepted interface font scale in percent. */
export const SCALE = Object.freeze({
  /** Smallest accepted value: 80%. */
  min: 80,
  /** Largest accepted value: 150%. */
  max: 150,
  /** Stepper increment. */
  step: 5,
  /** Value used when the settings document has no override: the shipped sizes. */
  default: 100,
})

/** Settings field carrying the interface font scale. */
export const SCALE_FIELD = 'fontScale'
