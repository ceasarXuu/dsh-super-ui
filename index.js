/**
 * Super UI — host half.
 *
 * The feature is browser work: `client.js` rewrites the interface's literal
 * font sizes to `calc(px * var(--dsh-super-ui-scale))` and publishes the scale
 * on the document root, so every surface outside the conversation column
 * follows one preference. The Host half owns the two things only the Host can:
 *
 *   1. **The durable preference.** `Config` below is the plugin row's
 *      configuration and therefore the settings namespace
 *      (`ctx.configForms.get('super-ui')`) the browser reads. Every field is
 *      volatile, so the settings service serves it to authenticated browsers and
 *      persists writes through the active profile's Cordis patch.
 *   2. **Owning the settings surface.** The General section row is registered by
 *      the browser half, so the schema-built form is switched off with
 *      `settings.configure({ auto: false })` — the same policy the shipped
 *      theme package uses for its own rows.
 *
 * No host service is required for the feature to work: a composition without
 * Settings still loads the row, and the browser falls back to 100%.
 */
import Schema from '@deepseek-ai/schemastery'

import { SCALE, SCALE_FIELD } from './host/config.js'

/** Cordis plugin name; also the `id` of the row the bundle patch inserts. */
export const name = 'super-ui'

/** No host service is required; `settings` is the only optional dependency. */
export const inject = []

/**
 * Interface preferences. `fontScale` is an integer percentage applied to every
 * literal interface font size outside the chat surface; the chat keeps its own
 * conversation-content setting.
 */
export const Config = Schema.object({
  [SCALE_FIELD]: Schema.number()
    .min(SCALE.min)
    .max(SCALE.max)
    .step(SCALE.step)
    .default(SCALE.default)
    .volatile()
    .description('Interface font scale outside the chat surface, in percent (80–150). 100 keeps the shipped sizes; the conversation content has its own font-size setting under General.'),
})

/**
 * Keep the schema-built settings form off while the browser half ships its own
 * General row, and leave every runtime read/write untouched.
 * @param ctx - host plugin context.
 */
export function apply(ctx) {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
}
