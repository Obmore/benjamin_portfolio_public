import assert from 'node:assert/strict'
import { test } from 'node:test'
import { typedAmount } from './lib/ar-szabaly.mjs'

test('minifier identifiers named Ft are not prices', () => {
  const code = ['function Ft(e){return e}', 'a=1,Ft=2', 'return Ft(e)', 'x=Ft.x', ' Ft.x', 'x1Ft', 'a2Ft(', 't1.Ft(', 'e2.Ft', 'f(a){}Ft(b)', 'Ft`x`', 'var a=1;Ft()']
  for (const c of code) assert.equal(typedAmount(c), null, c)
})

test('an amount followed by Ft is a typed price', () => {
  const cases = [
    ['"4 900 Ft"', '4 900 Ft'],
    ['4900Ft', '4900Ft'],
    ['4&nbsp;900&nbsp;Ft', '4&nbsp;900&nbsp;Ft'],
    ['4 900 Ft', '4 900 Ft'],
    ['4 900 Ft', '4 900 Ft'],
    ['x="49 000 Ft/hó"', '49 000 Ft'],
    ['"4\\xa0900\\xa0Ft"', '4\\xa0900\\xa0Ft'],
    ['"4\\u00a0900\\u202fFt"', '4\\u00a0900\\u202fFt'],
    ['4&#160;900&#160;Ft', '4&#160;900&#160;Ft'],
    ['4.900 Ft', '4.900 Ft'],
  ]
  for (const [code, match] of cases) assert.equal(typedAmount(code), match, code)
})

test('a run-time formatted price: a string or template fragment that starts with the currency', () => {
  const cases = [
    ["n.toLocaleString('hu')+' Ft'", "' Ft"],
    ['n+" Ft"', '" Ft'],
    ['n+"Ft"', '"Ft'],
    ['`${grouped} Ft`', '} Ft'],
    ['`${g}\\xa0Ft`', '}\\xa0Ft'],
    ['n+"\\u00a0Ft"', '"\\u00a0Ft'],
  ]
  for (const [code, match] of cases) assert.equal(typedAmount(code), match, code)
})

test('Ft must be a whole word', () => {
  assert.equal(typedAmount('4 900 Ftx'), null)
  assert.equal(typedAmount('"Ftx"'), null)
})
