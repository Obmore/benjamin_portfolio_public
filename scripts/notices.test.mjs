import assert from 'node:assert/strict'
import test from 'node:test'
import { noticeErrors, shippedVersion } from './lib/notices.mjs'

const packageJson = { dependencies: { zdog: '1.1.3', react: '^19.2.7' } }
const lock = { packages: { 'node_modules/zdog': { version: '1.1.3' }, 'node_modules/react': { version: '19.2.8' } } }
const text = 'Zdog v1.1.3\n...\nOGL v1.0.11\n...\ndm-sans-400.woff2 jetbrains-mono-500.woff2'
const fontFiles = ['dm-sans-400.woff2', 'jetbrains-mono-500.woff2']

test('a notices file in step with the pins and the fonts has no errors', () => {
  assert.deepEqual(noticeErrors({ text, packageJson, lock, fontFiles }), [])
})

test('an exact pin wins; a range falls back to the locked version', () => {
  assert.equal(shippedVersion('zdog', packageJson, lock), '1.1.3')
  assert.equal(shippedVersion('react', packageJson, lock), '19.2.8')
  assert.equal(shippedVersion('missing', packageJson, lock), null)
})

test('a stale library version is reported', () => {
  const errors = noticeErrors({ text: text.replace('v1.1.3', 'v1.1.2'), packageJson, lock, fontFiles })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /Zdog v1\.1\.3/)
})

test('a missing font file is reported', () => {
  const errors = noticeErrors({ text, packageJson, lock, fontFiles: [...fontFiles, 'dm-sans-700.woff2'] })
  assert.equal(errors.length, 1)
  assert.match(errors[0], /dm-sans-700\.woff2/)
})
