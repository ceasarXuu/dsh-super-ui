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
