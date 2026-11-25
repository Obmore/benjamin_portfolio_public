import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { amountProblems, appendedScripts, foundAmounts, FORBIDDEN_HOURLY, grouped, scriptReferences, typedPriceLiteral } from './lib/megrendeles-szabaly.mjs'

const NB = ' '

test('built page: the rendered grouping passes and counts per value', () => {
  const html = `<p>149${NB}000${NB}Ft</p><p>149${NB}000${NB}Ft</p><p>59${NB}000${NB}Ft</p>`
  assert.deepEqual(amountProblems(html, { 149000: 2, 59000: 1 }, 'x'), [])
})

test('built page: a wrongly grouped amount is caught, whatever the grouping', () => {
  const wrong = [
    '149 000 Ft', // plain spaces
    `149${NB}000 Ft`, // NBSP then a plain space before Ft
    '149 000 Ft', // narrow no-break space
    '149 000 Ft', // thin space
    '149&nbsp;000&nbsp;Ft', // entities
    '149&#160;000&#160;Ft',
    '149.000 Ft', // dot
    '149,000 Ft', // comma
    '149000 Ft', // none
    `149${NB}00${NB}Ft`, // wrong group size
  ]
  for (const text of wrong) {
    const problems = amountProblems(`<p>${text}</p>`, { 149000: 1 }, 'x')
    assert.ok(problems.length > 0, `${JSON.stringify(text)} must fail`)
  }
})

test('built page: an extra or a missing amount anywhere is caught', () => {
  assert.ok(amountProblems(`<p>149${NB}000${NB}Ft</p><p>149${NB}000${NB}Ft</p>`, { 149000: 1 }, 'x').length > 0)
  assert.ok(amountProblems(`<p>149${NB}000${NB}Ft</p>`, { 149000: 1, 59000: 1 }, 'x').length > 0)
  assert.ok(amountProblems(`<p>1${NB}Ft</p>`, {}, 'x').length > 0)
})

test('built page: found amounts carry their value and whether they are canonical', () => {
  assert.deepEqual(foundAmounts(`<p>4${NB}900${NB}Ft</p><p>4 900 Ft</p>`).map((a) => [a.value, a.canonical]), [[4900, true], [4900, false]])
  assert.equal(grouped(149000), `149${NB}000${NB}Ft`)
})

test('built page: the forbidden hourly price in any space-like grouping', () => {
  for (const s of [`4${NB}900${NB}Ft/hó`, '4 900 Ft/hó', '4 900 Ft/hó', '4.900 Ft/hó', '4900Ft/hó', '4&nbsp;900&nbsp;Ft/hó']) assert.ok(FORBIDDEN_HOURLY.test(s), s)
  assert.ok(!FORBIDDEN_HOURLY.test('havi 4 900 Ft egyszeri'))
})

test('source: a typed amount in any form is a literal, a placeholder is not', () => {
  const typed = [
    'ára 149 000 Ft',
    `ára 149${NB}000${NB}Ft`,
    'ára 149\\u00a0000\\u00a0Ft',
    'ára 149\\xa0000\\xa0Ft',
    'ára 149\\u202f000 Ft',
    'ára 149&#160;000&#160;Ft',
    'ára 149&nbsp;000&nbsp;Ft',
    'ára 149,000 Ft',
    'ára 149.000 Ft',
    'ára 149000Ft',
    'ára 149\\u0020000 Ft',
  ]
  for (const s of typed) assert.ok(typedPriceLiteral(s), `${JSON.stringify(s)} must be caught`)
  for (const s of ['ára {ar:orderForm}', 'a {kuszob:depositFrom}-os csomag', 'x1Ft', 'a hiba kódja 5']) assert.equal(typedPriceLiteral(s), null, s)
})

const BS = String.fromCharCode(92) // one backslash, so that the escapes below stay text in this file

test('built page: padded and hex space entities, an old-style ",-" tail, letter case and line breaks are caught', () => {
  const wrong = [
    '149&#x202f;000&#x202f;Ft',
    '149&#x00a0;000&#x00a0;Ft',
    '149&#32;000&#32;Ft',
    '149&#x20;000&#x20;Ft',
    '149&thinsp;000&thinsp;Ft',
    '149 000,- Ft',
    '149.000,- Ft',
    `149${NB}000,-${NB}Ft`,
    '149 000 ft',
    '149 000 FT',
    '149\n000\nFt',
    '149  000 Ft', // two plain spaces
  ]
  for (const text of wrong) assert.ok(amountProblems(`<p>${text}</p>`, { 149000: 1 }, 'x').length > 0, `${JSON.stringify(text)} must fail`)
  assert.deepEqual(foundAmounts('<p>149&#x202f;000&#x202f;Ft</p>').map((a) => [a.value, a.canonical]), [[149000, false]], 'the digits of an entity are not part of the value')
  // The same text must not count as the one expected amount: an extra copy next to the real one is an extra amount.
  for (const text of wrong) assert.ok(amountProblems(`<p>149${NB}000${NB}Ft</p><p>${text}</p>`, { 149000: 1 }, 'x').length > 0, `${JSON.stringify(text)} next to the real one must fail`)
})

test('built page: an amount in a comment, a script or a style is not shown; one in an attribute is', () => {
  const real = `<p>149${NB}000${NB}Ft</p>`
  const hidden = '<!-- 149 000 Ft --><script>var a = "149 000 Ft"</script><style>/* 149 000 Ft */</style>'
  assert.deepEqual(amountProblems(hidden + real, { 149000: 1 }, 'x'), [])
  assert.ok(amountProblems(`<img alt="149${NB}000${NB}Ft">` + real, { 149000: 1 }, 'x').length > 0, 'an alt text is read out, so it counts')
})

test('built page: the forbidden hourly price with its space and "hó" written as entities, in any letter case', () => {
  for (const s of ['4 900 Ft&#160;/hó', '4 900 Ft&nbsp;/hó', '4 900 Ft/h&#243;', '4 900 Ft/h&oacute;', '4 900 Ft/H&#xF3;', '4 900 ft / hó', '4&#32;900&#32;Ft/hó']) assert.ok(FORBIDDEN_HOURLY.test(s), s)
})

test('source: escapes in braces, entities with padding or hex, an underscore, a ",-" tail, braces around the number, letter case and line breaks are caught', () => {
  const typed = [
    `ára 149${BS}u{00a0}000${BS}u{00a0}Ft`,
    `ára 149${BS}u{a0}000${BS}u{A0}Ft`,
    `ára 149${BS}u{202F}000 Ft`,
    'ára 149&#x202f;000&#x202f;Ft',
    'ára 149&#x00a0;000&#x00a0;Ft',
    'ára 149&#32;000&#32;Ft',
    'ára 149&#x20;000&#x20;Ft',
    'ára 149&thinsp;000&thinsp;Ft',
    'ára 149_000 Ft',
    'ára 149 000,- Ft',
    'ára 149.000,- Ft',
    'ára 149 000 ft',
    'ára 149 000 FT',
    'ára {149000} Ft',
    'ára ${149000} Ft',
    'ára `${149000} Ft`',
    'ára 149\n000\nFt',
    `ára 149${BS}n000${BS}nFt`,
    `ára 149${BS}t000 Ft`,
  ]
  for (const s of typed) assert.ok(typedPriceLiteral(s), `${JSON.stringify(s)} must be caught`)
  for (const s of ['ára {ar:orderForm} Ft', 'a {kuszob:depositFrom}-os csomag', '{ar:x} {ar:y}', 'x1Ft', 'ft 5', 'kód: 5, Ft', "[149, 'Ft']", 'a 3 foot']) assert.equal(typedPriceLiteral(s), null, s)
})

test('built JS: absolute, relative and dynamic references resolve against the importing file and count once', () => {
  const dist = path.resolve('/site/dist')
  const entry = path.join(dist, 'assets/entry-1.js')
  const text = 'var a=`/assets/abs-2.js`;import"./rel-3.js";import("../assets/dyn-4.js");import x from"./rel-3.js";var u="./not-js.css"'
  const refs = scriptReferences(text, entry, dist)
  assert.deepEqual(refs, [path.join(dist, 'assets/abs-2.js'), path.join(dist, 'assets/rel-3.js'), path.join(dist, 'assets/dyn-4.js'), path.join(dist, 'assets/rel-3.js')])
  const files = {
    [entry]: text,
    [path.join(dist, 'assets/abs-2.js')]: 'import"./dyn-4.js"',
    [path.join(dist, 'assets/rel-3.js')]: '',
    [path.join(dist, 'assets/dyn-4.js')]: 'var e="/assets/entry-1.js"', // refers back to the entry: never counted as appended
  }
  const found = appendedScripts([entry], dist, { read: (f) => files[f], exists: (f) => f in files })
  assert.deepEqual(found.sort(), [path.join(dist, 'assets/abs-2.js'), path.join(dist, 'assets/dyn-4.js'), path.join(dist, 'assets/rel-3.js')].sort())
})

test('built JS: a reference to a file that is not in the build fails loudly', () => {
  const dist = path.resolve('/site/dist')
  const entry = path.join(dist, 'assets/entry-1.js')
  assert.throws(() => appendedScripts([entry], dist, { read: () => 'import("./gone-9.js")', exists: (f) => f === entry }), /not in the build/)
})
