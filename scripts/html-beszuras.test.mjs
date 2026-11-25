import assert from 'node:assert/strict'
import test from 'node:test'
import { insertAt } from '../src/site/html-beszuras.ts'

test('inserted text with replacement patterns comes out literally', () => {
  const text = "<p>$& and $' and $` and $1 and $$</p>"
  assert.equal(insertAt('<body><!--x--></body>', '<!--x-->', text), `<body>${text}</body>`)
})

test('only the first marker is replaced', () => {
  assert.equal(insertAt('<!--x-->|<!--x-->', '<!--x-->', 'a'), 'a|<!--x-->')
})

test('a missing marker throws', () => {
  assert.throws(() => insertAt('<p></p>', '<!--x-->', 'a'), /marker <!--x--> not found/)
})
