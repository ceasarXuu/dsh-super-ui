# Super UI — interface font size

A third-party plugin for DeepSeek Harness (DSH) that adds an **independent font-size scale for the interface outside the chat**: left and right sidebars, the session header, settings pages, plugin pages, menus, dialogs and toasts. The conversation keeps its own shipped font-size setting, so reading long answers and fitting the shell into your screen are two separate decisions.

| | |
|---|---|
| Package | `@ceasarxuu/dsh-super-ui` |
| Host requirement | DSH `>=0.2.1-rc.0 <0.3.0` (tested on Desktop 0.2.2-rc.3) |
| UI location | **Settings → General → Interface font size** (row right after the shipped *Font size* row) |
| Also configurable | `Plugins → Super UI → Config` or the profile patch (`fontScale`, 80–150) |
| Dependencies | None at runtime; the browser half uses only the platform-provided `react` |
| License | [MIT](LICENSE) |

## Why it exists

The shipped *Font size* setting is explicitly conversation-content only — it drives `--dsh-content-font-size` and the chat's type ladder. Sidebar and settings text is set in component CSS with literal pixel sizes, so raising the chat font leaves the shell as small as it was. This plugin adds the missing second axis instead of touching the shipped one:

- `fontScale` (percent, default 100) scales every literal interface font size outside the conversation;
- the conversation column is reset to the shipped sizes, so chat text, tool cards and the composer are untouched;
- the preference is durable per browser through the Host settings document, and the same value is editable from the profile patch and the official plugin config surface.

## Usage

1. Install the bundle (local directory through **Plugins → Add plugin**, or list it in the profile's `cordis.patch.yml`).
2. Open **Settings → General** and use the **Interface font size** stepper: 80–150% in 5% steps, 100% keeps the shipped sizes, **Reset** returns to it.
3. The change applies immediately and survives restarts. **Plugins → Super UI → Config** exposes the same `fontScale` field; a manual profile override works too:

```yaml
- id: super-ui
  name: '@ceasarxuu/dsh-super-ui'
  config:
    fontScale: 120   # interface text 20% larger, chat untouched
```

Uninstalling or disabling the plugin restores the shipped interface sizes; no page refresh is needed for the scale itself, and nothing else in the profile is modified.

## Scope

| Scales with `fontScale` | Does not scale |
|---|---|
| Left sidebar (session tree, search, footer), right sidebar chrome | Conversation messages, Markdown, code blocks, tool cards, trajectory |
| Session header, job list and header actions | Composer, attachments, approval/question takeovers |
| Settings pages, plugin manager/market, schedule and other management pages | The shipped content/code/terminal font-size settings |
| Menus, context menus, dialogs, toasts, tooltips | Sidebar terminal cell size (it keeps the shipped terminal font-size setting) |

Anything the conversation opens that is portaled to the page body — for example a dialog launched from a message — follows the interface scale rather than the chat reset. That is intentional: it is shell chrome, not content.

## How it works

1. Every same-origin stylesheet is walked once and each literal `font-size: <length>` becomes `font-size: calc(<length> * var(--dsh-super-ui-scale, 1))`. A `line-height` in the same rule follows only when that rule also scales its own font size, so text rhythm grows while fixed-height/centering geometry stays put.
2. The live CSSOM is mutated in place instead of injecting override copies, so selector specificity, `!important`, `@media` nesting and rule order remain exactly what the shipped stylesheets define.
3. The scale is one inherited custom property on `<html>`; the conversation grid cell carries `--dsh-super-ui-scale: 1`, which neutralises every calc() in its subtree.
4. A MutationObserver scales stylesheets that arrive later (lazy client modules, plugin HMR); disposing the plugin restores every declaration it changed.

## Known limitations

- Only literal `px`/`rem` font sizes are rewritten. `em`, `%` and keywords scale through inheritance, as before. Inline `font-size` styles written by components and cross-origin stylesheets are not touched.
- Layout geometry (icons, paddings, control heights, sidebar width) is not scaled — this is a text-size setting, not a zoom. At the top of the range a few fixed-height controls can look tight; the 80–150% range is deliberately conservative.
- The `font` shorthand is scaled only where the browser accepts `calc()` inside it (current Chromium does); otherwise the shorthand is left untouched.
- The chat reset depends on the shell frame's structure (the center grid cell before the rightbar column). If a future DSH release restructures the frame, the marker falls back to "everything scales"; the plugin degrades visually, never throws.

## Development

```sh
npm install            # jsdom for the unit tests (dev only)
npm run verify         # syntax check + node --test test/*.test.mjs
node dev/verify-browser.mjs   # renders client.js in headless Chrome and asserts computed sizes
```

The unit tests cover the CSSOM rewrites, persistence subscription and disposal in jsdom. `dev/verify-browser.mjs` covers what jsdom cannot compute (real `calc()`/custom-property resolution, the conversation reset, late stylesheets) and needs a Chromium-based browser (`CHROME=/path/to/chrome` to override the default lookup).

The row layout has its own probe: it renders the real component with real React in
headless Chromium at 80/100/120/150% and at 420/614/900 px panel widths, and fails
when the stepper arrows cover the value or the row overflows its column.

```sh
npm run verify:row                                  # geometry assertions
node dev/verify-row-layout.mjs --screenshot --scale=1.2 --width=614
```

React and React DOM are dev-only dependencies for that probe.

