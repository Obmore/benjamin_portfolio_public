import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// Smooth in-page scrolling starts after the load: keret.css has it only under html[data-sima] (reduced motion excluded), and the two loaders (keret.ts for the
// legal pages and 404, main.ts for the home page) set that attribute the same way. The loaders repeat the same lines on purpose (a shared module would become a shared chunk),
// so this guard keeps the copies and the stylesheet from drifting apart.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const css = read('src/site/keret.css').replace(/\/\*[\s\S]*?\*\//g, '')
const strip = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((line) => !line.trim().startsWith('//')).join('\n')
const loaders = { 'keret.ts': strip(read('src/site/keret.ts')), 'main.ts': strip(read('src/site/main.ts')) }

test('data-sima: the stylesheet and both loaders use the same attribute name, and smooth scrolling is only under it', () => {
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{ html\[data-sima\] \{ scroll-behavior: smooth; \} \}/)
  assert.ok(!/(^|[{;\s])scroll-behavior:\s*smooth/.test(css.replace(/@media \(prefers-reduced-motion: no-preference\) \{ html\[data-sima\] \{ scroll-behavior: smooth; \} \}/, '')), 'no other smooth scroll rule in keret.css')
  for (const [name, source] of Object.entries(loaders)) {
    assert.match(source, /root\.dataset\.sima = ''/, `${name} sets the attribute (dataset.sima is data-sima)`)
    assert.ok(!/jel-sima|classList\.add\('sima'\)/.test(source), `${name} sets no class for it`)
  }
})

test('data-sima: keret.ts and main.ts set it the same way (after the load and one frame)', () => {
  const lines = (source) => /const sima = \(\) => requestAnimationFrame\(\(\) => \{ root\.dataset\.sima = '' \}\)\s*\n\s*if \(document\.readyState === 'complete'\) sima\(\)\s*\n\s*else window\.addEventListener\('load', sima, \{ once: true \}\)/.exec(source)
  assert.ok(lines(loaders['keret.ts']), 'keret.ts: rAF after the load, at once when the load is over')
  assert.ok(lines(loaders['main.ts']), 'main.ts: the same lines')
})
