/**
 * The merged font-settings row and its pieces.
 *
 * One General-section row now owns both axes: 聊天字号 (the shipped conversation
 * content size, written through the theme service) and 界面字号 (this bundle's
 * interface scale). The shipped "more font settings" disclosure is preserved:
 * the chevron after the chat size opens the body/code/terminal font lists and
 * the code/terminal sizes.
 */

/**
 * Chevron used by the stepper arrows and the disclosure button.
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
 * Stable id for the disclosure region, with a React 17 fallback.
 * @returns the region id.
 */
function useRegionId() {
  if (typeof React.useId === 'function') return React.useId()
  const [id] = React.useState(() => `dsh-sui-region-${Math.random().toString(36).slice(2)}`)
  return id
}

/**
 * Stepper pill plus its unit label and one optional trailing control.
 * @param props - current value, accepted range, step, unit, labels and writer.
 * @returns the control element.
 */
function Stepper(props) {
  const { value, min, max, step, unit, increaseLabel, decreaseLabel, onStep, trailing } = props
  return h('div', { className: 'dsh-sui-control' },
    h('div', { className: 'dsh-sui-stepper' },
      h('span', { className: 'dsh-sui-value' }, String(value)),
      h('span', { className: 'dsh-sui-arrows' },
        h('button', {
          type: 'button',
          className: 'dsh-sui-arrow',
          'aria-label': increaseLabel,
          disabled: value >= max,
          onClick: () => { onStep(step) },
        }, chevron(true)),
        h('button', {
          type: 'button',
          className: 'dsh-sui-arrow',
          'aria-label': decreaseLabel,
          disabled: value <= min,
          onClick: () => { onStep(-step) },
        }, chevron(false)))),
    h('span', { className: 'dsh-sui-unit' }, unit),
    trailing ?? null)
}

/**
 * Font-list field: blur or Enter commits the list, an empty field restores the
 * built-in stack. The field remounts when the persisted list changes.
 * @param props - row copy, persisted value, placeholder and commit writer.
 * @returns the row element.
 */
function FontFamilyField(props) {
  return h('div', { className: 'dsh-sui-row' },
    h('div', { className: 'dsh-sui-text' },
      h('div', { className: 'dsh-sui-title' }, props.title),
      h('div', { className: 'dsh-sui-desc' }, props.description)),
    h('input', {
      key: props.value,
      className: 'dsh-sui-field',
      defaultValue: props.value,
      placeholder: props.placeholder,
      'aria-label': props.title,
      spellCheck: false,
      autoComplete: 'off',
      maxLength: 200,
      onBlur: (event) => { props.commit(event.currentTarget.value) },
      onKeyDown: (event) => {
        // Some IMEs report composition only through keyCode 229; never commit mid-composition.
        if (event.nativeEvent && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) return
        if (event.key === 'Enter') event.currentTarget.blur()
      },
    }))
}

/**
 * One code/terminal size row (the chat row is rendered inline in the merged row).
 * @param role - `code` or `terminal`.
 * @param pieces - resolved copy and writers shared by the merged row.
 * @returns the row element.
 */
function fontSizeRow(role, pieces) {
  const { t, sizes, stepSize } = pieces
  const spec = FONT_SPECS[role]
  const title = t(`fontSize.${role}.title`)
  return h('div', { key: `size-${role}`, className: 'dsh-sui-row' },
    h('div', { className: 'dsh-sui-text' },
      h('div', { className: 'dsh-sui-title' }, title),
      h('div', { className: 'dsh-sui-desc' }, t(`fontSize.${role}.description`))),
    h(Stepper, {
      value: sizes[role],
      min: spec.min,
      max: spec.max,
      step: 1,
      unit: t('fontSize.unit'),
      increaseLabel: t('step.increase') + title,
      decreaseLabel: t('step.decrease') + title,
      onStep: (delta) => { stepSize(role, delta) },
    }))
}

/**
 * The merged font-settings row registered into `settings.general.item`.
 * @param props - slot runtime props (`t`) plus the injected writing face.
 * @returns the merged row element tree.
 */
function MergedFontSettings(props) {
  const t = typeof props.t === 'function' ? props.t : (key) => key
  const scale = useObservedValue(props.subscribeScale, props.getScale)
  const typography = useObservedValue(props.subscribeTypography, props.getTypography)
  const [open, setOpen] = React.useState(false)
  const regionId = useRegionId()
  const sizes = (typography && typography.sizes) || DEFAULT_FONT_SIZES
  const families = (typography && typography.families) || DEFAULT_FONT_FAMILIES
  const textSpec = FONT_SPECS.text
  const chatTitle = t('row.chat.title')
  const pieces = { t, sizes, stepSize: props.stepSize }

  return h('div', { className: 'dsh-sui-item' },
    // Chat font size (the shipped conversation axis) with the preserved disclosure.
    h('div', { className: 'dsh-sui-row' },
      h('div', { className: 'dsh-sui-text' },
        h('div', { className: 'dsh-sui-title' }, chatTitle),
        h('div', { className: 'dsh-sui-desc' }, t('row.chat.description'))),
      h(Stepper, {
        value: sizes.text,
        min: textSpec.min,
        max: textSpec.max,
        step: 1,
        unit: t('fontSize.unit'),
        increaseLabel: t('step.increase') + chatTitle,
        decreaseLabel: t('step.decrease') + chatTitle,
        onStep: (delta) => { props.stepSize('text', delta) },
        trailing: h('button', {
          type: 'button',
          className: 'dsh-sui-expander',
          'aria-label': t('row.more'),
          title: t('row.more'),
          'aria-expanded': open,
          'aria-controls': regionId,
          onClick: () => { setOpen(value => !value) },
        }, chevron(false)),
      })),
    // Interface font size (this bundle's non-chat axis).
    h('div', { className: 'dsh-sui-row' },
      h('div', { className: 'dsh-sui-text' },
        h('div', { className: 'dsh-sui-title' }, t('row.ui.title')),
        h('div', { className: 'dsh-sui-desc' }, t('row.ui.description'))),
      h(Stepper, {
        value: scale,
        min: SCALE_MIN,
        max: SCALE_MAX,
        step: SCALE_STEP,
        unit: '%',
        increaseLabel: t('step.increase') + t('row.ui.title'),
        decreaseLabel: t('step.decrease') + t('row.ui.title'),
        onStep: (delta) => { props.setScale(scale + delta) },
        trailing: scale === SCALE_DEFAULT
          ? null
          : h('button', {
            type: 'button',
            className: 'dsh-sui-reset',
            onClick: () => { props.setScale(SCALE_DEFAULT) },
          }, t('row.reset')),
      })),
    // The shipped disclosure contents, unchanged in behavior.
    open
      ? h('div', { id: regionId },
        h(FontFamilyField, {
          title: t('fontFamily.text.title'),
          description: t('fontFamily.text.description'),
          value: families.text,
          placeholder: t('fontFamily.placeholder'),
          commit: (value) => { props.setFamily('text', value) },
        }),
        h(FontFamilyField, {
          title: t('fontFamily.code.title'),
          description: t('fontFamily.code.description'),
          value: families.code,
          placeholder: t('fontFamily.placeholder'),
          commit: (value) => { props.setFamily('code', value) },
        }),
        fontSizeRow('code', pieces),
        h(FontFamilyField, {
          title: t('fontFamily.terminal.title'),
          description: t('fontFamily.terminal.description'),
          value: families.terminal,
          placeholder: t('fontFamily.placeholder'),
          commit: (value) => { props.setFamily('terminal', value) },
        }),
        fontSizeRow('terminal', pieces))
      : null)
}
