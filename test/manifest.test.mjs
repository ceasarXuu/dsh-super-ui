/**
 * Packaging and metadata tests: the values the Host and the browser bundle must
 * agree on, and the resources Plugin Manager reads without activating the
 * plugin (bundle patch, locale metadata, detail document, icon).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const ROOT = new URL('../', import.meta.url)
const read = (relative) => readFileSync(new URL(relative, ROOT), 'utf8')

const PACKAGE = JSON.parse(read('package.json'))
const CLIENT = read('client.js')

/**
 * Extract a numeric constant from the browser bundle source.
 * @param name - constant name.
 * @returns the parsed number.
 */
function clientConstant(name) {
  const match = new RegExp(`const ${name} = (-?\\d+)`).exec(CLIENT)
  assert.ok(match, `client.js defines ${name}`)
  return Number(match[1])
}

test('the browser bundle restates the host scale bounds exactly', async () => {
  const { SCALE, SCALE_FIELD } = await import('../host/config.js')
  assert.deepEqual(
    { min: clientConstant('SCALE_MIN'), max: clientConstant('SCALE_MAX'), step: clientConstant('SCALE_STEP'), default: clientConstant('SCALE_DEFAULT') },
    { min: SCALE.min, max: SCALE.max, step: SCALE.step, default: SCALE.default },
  )
  assert.match(CLIENT, new RegExp(`const SCALE_FIELD = '${SCALE_FIELD}'`))
})

test('bundle manifest points at real resources', () => {
  assert.equal(PACKAGE.name, '@ceasarxuu/dsh-super-ui')
  assert.equal(PACKAGE.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(PACKAGE.dsh.client.platform, 'web')
  assert.equal(PACKAGE.dsh.client.immediately, true)
  assert.equal(PACKAGE.exports['./client'], './client.js')
  assert.equal(PACKAGE.type, 'module')
  for (const file of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg']) {
    assert.doesNotThrow(() => read(file), `${file} ships`)
  }
  assert.match(PACKAGE.files.join(','), /locale\/\*\.json/)
})

test('the bundle patch inserts the settings entry the browser reads', () => {
  const patch = read('cordis.patch.yml')
  assert.match(patch, /- insert:/)
  assert.match(patch, /- id: super-ui/)
  assert.match(patch, new RegExp(PACKAGE.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('locale metadata carries a title and description for every shipped locale', () => {
  for (const locale of ['zh', 'en', 'ja', 'es', 'fr', 'de', 'ru', 'pt']) {
    const meta = JSON.parse(read(`locale/${locale}.json`)).meta
    assert.equal(typeof meta.title, 'string')
    assert.ok(meta.title.length > 0, `${locale} title`)
    assert.equal(typeof meta.description, 'string')
    assert.ok(meta.description.length > 0, `${locale} description`)
    // The README is the detail surface: no single-image detail document ships.
    assert.equal(meta.detail, undefined)
  }
})

test('the icon is a self-contained SVG inside the size limit', () => {
  const icon = read('icon.svg')
  assert.match(icon, /^<svg [^>]*viewBox="0 0 64 64"/)
  assert.match(icon, /role="img"/)
  assert.match(icon, /aria-label="Super UI"/)
  assert.ok(Buffer.byteLength(icon) < 256 * 1024)
  assert.doesNotMatch(icon, /href="http/)
})
