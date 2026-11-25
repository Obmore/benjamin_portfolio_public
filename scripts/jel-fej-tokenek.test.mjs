import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { temaErtekek } from '../src/site/jel-fej.ts'

const real = fs.readFileSync(new URL('../src/site/fooldal/jel-tokens.css', import.meta.url), 'utf8')

const LIGHT = ':root:not([data-tema="sotet"]),:root [data-tema="vilagos"]'
const DARK = ':root[data-tema="sotet"],:root [data-tema="sotet"]'
const rule = (sel, v) => `${sel}{--papir:${v[0]};--lap:${v[1]};--tinta:${v[2]};--kezel:${v[3]};--jel:#D92320}`
const LV = ['#F2F0E7', '#FBFAF6', '#0E141D', '#1C3CB2']
const DV = ['#0B0F14', '#1E242A', '#E8EBF1', '#8DAFFE']
const want = {
  vilagos: { papir: LV[0], lap: LV[1], tinta: LV[2], kezel: LV[3] },
  sotet: { papir: DV[0], lap: DV[1], tinta: DV[2], kezel: DV[3] },
}

test('the real token file gives the four hex values per theme', () => {
  assert.deepEqual(temaErtekek(real), want)
})

test('a pretty-printed file reads the same', () => {
  const pretty = real
    .replace(/\{/g, ' {\n    ')
    .replace(/;/g, ';\n    ')
    .replace(/\}/g, '\n}\n')
    .replace(/,:root/g, ',\n  :root')
    .replace(/:\s*(#|oklch)/g, ': $1')
  assert.deepEqual(temaErtekek(pretty), want)
  const hand = `/* c */\n${LIGHT.replace(',', ' ,\n  ')}   {\n  --papir :  ${LV[0]} ;\n  --lap: ${LV[1]};\n--tinta:${LV[2]}\n;--kezel: ${LV[3]}\n}\n\n${DARK.replace(',', ',\n')}{\n  --papir: ${DV[0]};  --lap: ${DV[1]};\n  --tinta: ${DV[2]}; --kezel: ${DV[3]};\n}`
  assert.deepEqual(temaErtekek(hand), want)
})

test('a minified file reads the same', () => {
  const min = real.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{};,])\s*/g, '$1').replace(/\n/g, '')
  assert.deepEqual(temaErtekek(min), want)
})

test('rules beside and inside at-rules are found', () => {
  const beside = `@media (prefers-color-scheme: dark){:root:not([data-tema]){--papir:#000000}}\n${rule(LIGHT, LV)}\n${rule(DARK, DV)}\n@media (color-gamut: p3){@supports (color: oklch(0.5 0.1 100)){${LIGHT}{--jel:oklch(0.6 0.2 29)}${DARK}{--jel:oklch(0.7 0.2 32)}}}`
  assert.deepEqual(temaErtekek(beside), want)
  const inside = `@layer tokens{@media all{${rule(LIGHT, LV)}${rule(DARK, DV)}}}`
  assert.deepEqual(temaErtekek(inside), want)
})

test('a missing rule throws and names the theme', () => {
  assert.throws(() => temaErtekek(rule(LIGHT, LV)), /sotet token rule was not found/)
  assert.throws(() => temaErtekek(rule(DARK, DV)), /vilagos token rule was not found/)
})

test('a missing or non-hex token throws and names the theme and token', () => {
  const noLap = `${rule(LIGHT, LV)}${rule(DARK, DV).replace(`--lap:${DV[1]};`, '')}`
  assert.throws(() => temaErtekek(noLap), /--lap \(sotet\)/)
  const oklch = `${rule(LIGHT, LV).replace(`--tinta:${LV[2]}`, '--tinta:oklch(0.2 0.02 200)')}${rule(DARK, DV)}`
  assert.throws(() => temaErtekek(oklch), /--tinta \(vilagos\)/)
})

test('a value is never picked silently: a different hex in an earlier at-rule block or twice in one block throws; a nested rule is not the block', () => {
  const dark = rule(DARK, DV)
  const earlier = `@media (min-width:1px){${LIGHT}{--papir:#AAAAAA}}${rule(LIGHT, LV)}${dark}`
  assert.throws(() => temaErtekek(earlier), /--papir \(vilagos\).*#AAAAAA, #F2F0E7/)
  const nested = `${LIGHT}{&:hover{--papir:#AAAAAA} --papir:${LV[0]};--lap:${LV[1]};--tinta:${LV[2]};--kezel:${LV[3]}}${dark}`
  assert.deepEqual(temaErtekek(nested), want)
  const twice = `${LIGHT}{--papir:${LV[0]};--papir:#AAAAAA;--lap:${LV[1]};--tinta:${LV[2]};--kezel:${LV[3]}}${dark}`
  assert.throws(() => temaErtekek(twice), /--papir \(vilagos\).*#F2F0E7, #AAAAAA/)
})

test('an identical restatement passes', () => {
  assert.deepEqual(temaErtekek(`${rule(LIGHT, LV)}${rule(DARK, DV)}@media all{${LIGHT}{--papir:#f2f0e7}}`), want)
})

test('strings are text: braces, comment openers and escaped quotes inside them do not break the scan', () => {
  const grain = ':root{--g:url("data:image/svg+xml;utf8,<svg>{ /* }</svg>");--h:"a\\"}b"}'
  assert.deepEqual(temaErtekek(`${grain}${rule(LIGHT, LV)}${rule(DARK, DV)}`), want)
})

test('an unquoted url() with a quote or brace is opaque text', () => {
  const css = `:root{--u:url(a"b{c.png)}${rule(LIGHT, LV)}${rule(DARK, DV)}`
  assert.deepEqual(temaErtekek(css), want)
})

test('selector spacing and quote style do not matter', () => {
  const l = ":root:not( [data-tema='sotet'] ) , :root [ data-tema = 'vilagos' ]"
  assert.deepEqual(temaErtekek(`${rule(l, LV)}${rule(DARK, DV)}`), want)
})
