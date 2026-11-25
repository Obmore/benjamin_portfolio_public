import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { colourLiteralErrors, findColourLiterals } from './lib/colour-literals.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function project(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ob-colour-'))
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
    fs.writeFileSync(path.join(dir, name), text)
  }
  return dir
}

test('finds hex, rgb(a) and hsl(a) literals with their line', () => {
  const css = 'a { color: #fff; }\nb {\n  background: rgba(0, 0, 0, .5);\n  border-color: HSL(10 20% 30%);\n  fill: #1e3a5fcc;\n}'
  assert.deepEqual(findColourLiterals(css).map((x) => [x.line, x.literal]), [
    [1, '#fff'], [3, 'rgba('], [4, 'HSL('], [5, '#1e3a5fcc'],
  ])
})

const literals = (css) => findColourLiterals(css).map((x) => x.literal)

test('id selectors and strings are not colours', () => {
  assert.deepEqual(literals('#add-btn { margin: 0 }\n#face:hover, #kapcsolat { padding: 0 }\na::after { content: "#fab"; }'), [])
})

test('named colours and modern colour functions are flagged, keywords are not', () => {
  assert.deepEqual(literals('a { color: white; }'), ['white'])
  assert.deepEqual(literals('a { background: oklch(0.7 0.1 200); }'), ['oklch('])
  assert.deepEqual(literals('a { color: light-dark(var(--a), var(--b)); border-color: color(srgb 1 0 0); }'), ['light-dark(', 'color('])
  assert.deepEqual(literals('a { color: transparent; border-color: currentColor; outline: none; color: inherit; }'), [])
})

test('hex length: 3, 4, 6 and 8 digits count, other lengths do not; last declaration without semicolon is scanned', () => {
  assert.deepEqual(literals('a { x: #abc; y: #abcd; z: #aabbcc; w: #aabbccdd; v: #abcde; u: #abcdefa }'), ['#abc', '#abcd', '#aabbcc', '#aabbccdd'])
  assert.deepEqual(literals('a { color: red }'), ['red'])
})

test('regression: nesting, at-rules, unicode idents, system colours, unterminated declarations', () => {
  assert.deepEqual(literals('@media (min-width: 10px) { a:hover { color: red } @supports (color: red) { b::before { background: #FFF!important } } }'), ['red', '#FFF'])
  assert.deepEqual(literals('@layer x { @container (min-width:1px) { a { --c: Tomato } } }'), ['Tomato'])
  assert.deepEqual(literals('a { color: var(--x); &:hover { color: blue } color: navy }'), ['blue', 'navy'])
  assert.deepEqual(literals('x { background: color-mix(in srgb, red 10%, var(--a)) }'), ['red'])
  assert.deepEqual(findColourLiterals('a { border:\n 1px solid\n  RED; }'), [{ line: 3, literal: 'RED' }])
  assert.deepEqual(literals('a { grid-area: tanú; animation-name: pinkó; font: 500 0.75rem/1 var(--font-mono) }'), [])
  assert.deepEqual(literals('a { color: Canvas }'), ['Canvas'])
  assert.deepEqual(literals('a { color: red'), ['red'])
})

test('url data with parentheses is skipped', () => {
  assert.deepEqual(literals('a { background: url("data:image/svg+xml,%3Csvg fill=%23fff (x)%3E") no-repeat; mask: url(data:x;(a)#fff) }'), [])
})

test('tokens, color-mix on tokens, comments and url() fragments are fine', () => {
  const css = '/* #fff in a comment */\na { color: var(--accent); background: color-mix(in srgb, var(--foreground) 7%, transparent); mask: url(#m); }'
  assert.deepEqual(findColourLiterals(css), [])
})

test('the guard fails with file:line on a literal outside the token file', () => {
  const dir = project({ 'src/site/fooldal/jel-tokens.css': ':root { --papir: #f2f0e7; }', 'src/site/keret.css': 'a { color: var(--papir); }\nb { color: #ffffff; }', 'src/site/jogi.css': 'p { color: rgb(1, 2, 3); }' })
  try {
    const errors = colourLiteralErrors(dir)
    assert.equal(errors.length, 2)
    assert.ok(errors.some((e) => /^src\/site\/keret\.css:2: colour literal #ffffff/.test(e)))
    assert.ok(errors.some((e) => /^src\/site\/jogi\.css:1: colour literal rgb\(/.test(e)))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("the adventure world's own sheet (src/vilag) is guarded like the site's", () => {
  const dir = project({ 'src/site/fooldal/jel-tokens.css': ':root { --papir: #f2f0e7; }', 'src/vilag/vilag.css': '.vilag { background: var(--papir); }\n.x { color: #123456; }' })
  try {
    const errors = colourLiteralErrors(dir)
    assert.equal(errors.length, 1)
    assert.match(errors[0], /^src\/vilag\/vilag\.css:2: colour literal #123456/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the guard passes when only the token file holds literals', () => {
  const dir = project({ 'src/site/fooldal/jel-tokens.css': ':root { --papir: #f2f0e7; --x: rgb(1 2 3); }', 'src/site/keret.css': 'a { color: var(--papir); }' })
  try {
    assert.deepEqual(colourLiteralErrors(dir), [])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('the real site CSS holds no colour literal outside the token file', () => {
  assert.deepEqual(colourLiteralErrors(root), [])
})
