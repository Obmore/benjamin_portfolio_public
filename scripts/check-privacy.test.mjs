import assert from 'node:assert/strict'
import test from 'node:test'
import { scriptAttrsAllowed } from './lib/privacy-script-attrs.mjs'

test('the head snippet marker alone passes', () => {
  assert.ok(scriptAttrsAllowed('data-jel-fej'))
  assert.ok(scriptAttrsAllowed(' data-jel-fej '))
})

test('the module tag passes in any attribute order', () => {
  assert.ok(scriptAttrsAllowed('type="module" crossorigin src="/assets/keret-Ab1_x.js"'))
  assert.ok(scriptAttrsAllowed('crossorigin type="module" src="/assets/keret.js"'))
  assert.ok(scriptAttrsAllowed('src="/assets/a-b.c.js"\n  crossorigin\n  type="module"'))
})

test('forms that must fail', () => {
  for (const bad of [
    '', // an inline script without the marker
    'async', // an inline script with another attribute only
    'data-jel-fej async', // marker plus an extra attribute
    'data-jel-fej="x"', // marker with a value
    'type="module" crossorigin src="/assets/a.js" async', // extra attribute
    'type="module" src="/assets/a.js"', // crossorigin missing
    'crossorigin src="/assets/a.js"', // type missing
    'type="module" crossorigin', // src missing
    'type="module" crossorigin src="https://example.com/a.js"', // another src
    'type="module" crossorigin src="/other/a.js"',
    'type="module" crossorigin src="/assets/a.css"',
    'type="module" crossorigin src="/assets/a.js" src="/assets/b.js"', // repeated
    'type="text/javascript" crossorigin src="/assets/a.js"', // other type
    'type="module" crossorigin="anonymous" src="/assets/a.js"', // crossorigin with a value
    'type="module"crossorigin src="/assets/a.js"', // no separator
    'TYPE="module" crossorigin src="/assets/a.js"', // attribute names are case-sensitive here
    "type='module' crossorigin src='/assets/a.js'", // single quotes
    'data-jel-fej/', // stray slash
  ]) assert.equal(scriptAttrsAllowed(bad), false, JSON.stringify(bad))
})
