# Super UI — one font row, two sizes

A third-party plugin for DeepSeek Harness (DSH). Its first feature turns the shipped **Settings → General → Font size** row into a single font row with two options:

- **Chat font size** — the shipped conversation-content axis (10–22 px, the official setting, unchanged behavior);
- **Interface font size** — a new independent scale (80–150%) for everything outside the chat: left and right sidebars, the session header, settings pages, plugin pages, menus, dialogs and toasts.

The row also keeps the shipped **More font settings** disclosure: body/code/terminal font lists and the code/terminal sizes are still there and still written through the shipped theme service.

| | |
|---|---|
| Package | `@ceasarxuu/dsh-super-ui` |
| Host requirement | DSH `>=0.2.1-rc.0 <0.3.0` (tested on Desktop 0.2.2-rc.3) |
| UI location | **Settings → General →** the font row (replaces the shipped one): *Chat font size* + *Interface font size* |
| Also configurable | `Plugins → Super UI → Config` or the profile patch (`fontScale`, 80–150) |
| Dependencies | `@deepseek-ai/schemastery` (host schema); the browser half uses only the platform-provided `react` |
| License | [MIT](LICENSE) |

## Why it exists

The shipped *Font size* setting is explicitly conversation-content only — it drives `--dsh-content-font-size` and the chat's type ladder. Sidebar and settings text is written in component CSS with literal pixel sizes, so raising the chat font leaves the shell as small as it was, and DSH has no interface-wide text scale. This plugin adds the missing second axis **in the same row**, so users do not face two font settings with overlapping descriptions:

- the row keeps the shipped chat size control (same field, same theme service, same shortcuts) under the name **Chat font size**;
- next to it, **Interface font size** scales every literal interface font size outside the conversation;
- the conversation column is reset to the shipped sizes, so chat text, tool cards and the composer follow only their own setting;
- the shipped *More font settings* group is preserved under the chevron;
- the interface preference is durable per profile through the Host settings document and is also editable from the profile patch and the official plugin config surface.

## Usage

1. Install the bundle (local directory through **Plugins → Add plugin**, or list it in the profile's `cordis.patch.yml`).
2. Open **Settings → General**. The shipped *Font size* row is now:
   - **聊天字号 / Chat font size** — px stepper for the conversation content, with the **More font settings** chevron;
   - **界面字号 / Interface font size** — percent stepper (80–150% in 5% steps, 100% keeps the shipped sizes) with a **Reset** button.
3. The interface change applies immediately and survives restarts. `Plugins → Super UI → Config` exposes the same `fontScale` field; a manual profile override works too:

```yaml
- id: super-ui
  name: '@ceasarxuu/dsh-super-ui'
  config:
    fontScale: 120   # interface text 20% larger, chat untouched
```

Uninstalling or disabling the plugin restores the shipped row and interface sizes; no page refresh is needed for the scale, and nothing else in the profile is modified.

## Scope

| Controlled by the row | Follows the chat setting only |
|---|---|
| Interface scale: left sidebar (session tree, search, footer), right sidebar chrome, session header, settings/plugin pages, menus, dialogs, toasts, tooltips | Conversation messages, Markdown, code blocks, tool cards, trajectory |
| Chat font size: conversation content (the shipped axis, unchanged) | Composer, attachments, approval/question takeovers |
| More font settings: body/code/terminal font lists, code/terminal sizes | Sidebar terminal cell size (it keeps the shipped terminal font-size setting) |

Anything the conversation opens that is portaled to the page body — for example a dialog launched from a message — follows the interface scale rather than the chat reset. That is intentional: it is shell chrome, not content.

## How it works

1. **Row replacement.** The shipped theme plugin registers its font row into the `settings.general.item` list slot with the cell id `font-size`. List slots render one row per id cell, keeping the live entry with the lowest `priority` (then `order`). This bundle registers the same id with `priority: -1`, so the merged row *shadows* the shipped one instead of adding a second row; a slot core that rejects the priority option falls back to a separate row id.
2. **Typography via the service.** Chat/code/terminal sizes and font lists are read from `ctx.theme.getTheme()` and written through `ctx.theme.setFontSize()` / `setFontFamily()`; the shipped theme service keeps validation, normalization and the `Cmd/Ctrl +/-` shortcuts working, and the row follows `theme/change`.
3. **Interface scale via the CSSOM.** Every same-origin stylesheet is walked once and each literal `font-size: <length>` becomes `font-size: calc(<length> * var(--dsh-super-ui-scale, 1))`; a `line-height` in the same rule follows only when that rule also scales its own font size, so text rhythm grows while fixed-height geometry stays put. The live CSSOM is mutated in place, so selector specificity, `!important`, `@media` nesting and rule order stay exactly what the shipped stylesheets define.
4. The scale is one inherited custom property on `<html>`; the conversation grid cell carries `--dsh-super-ui-scale: 1`, which neutralises every calc() in its subtree.
5. A MutationObserver scales stylesheets that arrive later (lazy client modules, plugin HMR); disposing the plugin restores every declaration it changed.

## Known limitations

- Only literal `px`/`rem` font sizes are rewritten. `em`, `%` and keywords scale through inheritance, as before. Inline `font-size` styles written by components and cross-origin stylesheets are not touched.
- Layout geometry (icons, paddings, control heights, sidebar width) is not scaled — this is a text-size setting, not a zoom. At the top of the range a few fixed-height controls can look tight; the 80–150% range is deliberately conservative.
- The `font` shorthand is scaled only where the browser accepts `calc()` inside it (current Chromium does); otherwise the shorthand is left untouched.
- The chat reset depends on the shell frame's structure (the center grid cell before the rightbar column). If a future DSH release restructures the frame, the marker falls back to "everything scales"; the plugin degrades visually, never throws.
- Row shadowing depends on the shipped row keeping the cell id `font-size`. If a future release renames it, the plugin's merged row disappears and the shipped row returns; the interface scale keeps working whenever the row is reachable through the fallback registration.

## Development

```sh
npm install                     # dev-only: jsdom, React, puppeteer-core
npm run build                   # rebuild client.js from src/client/*.js
npm run verify                  # rebuild + syntax check + node --test (21 tests)
npm run verify:browser          # headless Chromium: computed sizes, chat reset, late sheets, disposal (29 checks)
npm run verify:row              # headless Chromium: merged-row geometry, disclosure, stepping (116 checks)
```

`client.js` is generated: the DSH client loader gives a plugin factory no imports of its own, so the readable sources live as fragments under `src/client/` (constants, helpers, scale engine, typography model, row components, plugin body) and `dev/build-client.mjs` concatenates them into the module-loader envelope. Edit `src/client/*.js`, never `client.js`.

The unit tests cover the CSSOM rewrites, the registration/shadowing decision, typography writes through the theme service and disposal in jsdom. Both browser probes drive real Chromium through `puppeteer-core` (`CHROME=/path/to/chrome` overrides the default lookup): the engine probe covers what jsdom cannot compute, the row probe renders the real component with real React and fails when a stepper arrow covers a value, a row overflows, or the disclosure loses the shipped font settings.

## Publishing

`@ceasarxuu/dsh-super-ui` is published by [`.github/workflows/publish.yml`](.github/workflows/publish.yml) on a GitHub release (or a manual workflow dispatch):

1. It runs `npm run verify` (syntax check + jsdom tests) on Node 24.
2. It authenticates through npm **trusted publishing** (OIDC via `id-token: write`): GitHub presents a short-lived identity token, npm checks the trusted-publisher connection configured for this repository and workflow, and no repository secret is needed. Provenance is generated for every release.
   A 90-day granular token (2FA bypass) is kept in the `NPM_TOKEN` secret only as an explicit fallback: set the repository variable `NPM_TOKEN_PUBLISH=true` to use it instead. The first version (0.1.0) was bootstrapped with that token before the trusted-publisher connection existed.

Release flow: bump `version` in `package.json`, commit, `git tag v<version>`, push the tag, then publish a GitHub Release for it. The workflow refuses to publish when the release tag and the package version disagree, and skips versions that already exist on the registry.
