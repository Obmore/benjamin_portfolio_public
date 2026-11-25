import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// WCAG 2.x contrast of the colour pairs the site relies on, computed from src/site/fooldal/jel-tokens.css (the values are read, not copied).

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const channel = (hex, i) => {
  const value = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}
const luminance = (hex) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

test('the type token: Archivo only, no other family in the stack', () => {
  const fonts = fs.readFileSync(path.join(root, 'src/site/fonts.css'), 'utf8')
  assert.match(fonts, /--font-sans:\s*"Archivo", "Archivo Fallback"/)
  assert.doesNotMatch(fonts, /DM Sans|JetBrains|--font-mono/)
})

const jelCss = fs.readFileSync(path.join(root, 'src/site/fooldal/jel-tokens.css'), 'utf8')
const LIGHT = ':root:not([data-tema="sotet"]),:root [data-tema="vilagos"]{'
const DARK = ':root[data-tema="sotet"],:root [data-tema="sotet"]{'
function jelToken(theme, name) {
  const start = jelCss.indexOf(theme === 'light' ? LIGHT : DARK)
  assert.ok(start >= 0, `the ${theme} token block is in jel-tokens.css`)
  const block = jelCss.slice(start, jelCss.indexOf('}', start))
  const match = new RegExp(`--${name}:(#[0-9a-f]{6});`, 'i').exec(block)
  assert.ok(match, `--${name} is a #rrggbb token in the ${theme} block of jel-tokens.css`)
  return match[1].toLowerCase()
}

// [label, foreground, background, minimum]: 4.5 for text, 3 for graphics (the three pens are lines and markers, never text).
const JEL_PAIRS = [
  ['ink on paper', 'tinta', 'papir', 4.5],
  ['ink on the light sheet', 'tinta', 'lap', 4.5],
  ['soft ink on paper', 'tinta-halk', 'papir', 4.5],
  ['soft ink on the light sheet', 'tinta-halk', 'lap', 4.5],
  ['link blue as text on paper', 'kezel', 'papir', 4.5],
  ['link blue as text on the light sheet', 'kezel', 'lap', 4.5],
  ['red pen on paper', 'jel', 'papir', 3],
  ['red pen on the light sheet', 'jel', 'lap', 3],
  ['blue pen on paper', 'kezel', 'papir', 3],
  ['green pen on paper', 'be', 'papir', 3],
  ['green pen on the light sheet', 'be', 'lap', 3],
]
for (const theme of ['light', 'dark']) {
  for (const [label, fg, bg, min] of JEL_PAIRS) {
    test(`contrast (home, ${theme}): ${label} (--${fg} on --${bg}) is at least ${min}`, () => {
      const ratio = contrast(jelToken(theme, fg), jelToken(theme, bg))
      assert.ok(ratio >= min, `${jelToken(theme, fg)} on ${jelToken(theme, bg)} is ${ratio.toFixed(2)}`)
    })
  }
}

// ---- Grafit (owner decision 2026-11-18): exactly these ten values per theme, in both dark rules; the P3 block and the pens are untouched.
// The dark --lap is #1E242A (not the first draft's #1E232A) so that the separation test below keeps its bound. ----
const GRAFIT = {
  light: { papir: '#f2f0e7', 'papir-2': '#e8e7db', lap: '#fbfaf6', oldal: '#d5d6c7', tinta: '#0e141d', 'tinta-halk': '#495360', jel: '#d92320', 'jel-forro': '#dd4c00', kezel: '#1c3cb2', be: '#1f7c4b' },
  dark: { papir: '#0b0f14', 'papir-2': '#13181d', lap: '#1e242a', oldal: '#2e353d', tinta: '#e8ebf1', 'tinta-halk': '#afb8c4', jel: '#f76046', 'jel-forro': '#ff9b52', kezel: '#8daffe', be: '#69d98d' },
}
for (const theme of ['light', 'dark']) {
  test(`B1: the ${theme} block of jel-tokens.css holds exactly the Grafit palette`, () => {
    for (const [name, hex] of Object.entries(GRAFIT[theme])) assert.equal(jelToken(theme, name), hex, `--${name}`)
  })
}
test('B1: the system-dark media rule carries the same dark values as the stored-choice rule', () => {
  const at = jelCss.indexOf('@media (prefers-color-scheme: dark){:root:not([data-tema]){')
  const media = jelCss.slice(at, jelCss.indexOf('}}', at))
  for (const [name, hex] of Object.entries(GRAFIT.dark)) assert.ok(new RegExp(`--${name}:${hex};`, 'i').test(media), `--${name} ${hex} in the media rule`)
})
test('B1: neither dark rule carries a grain tile (a display has no fibre)', () => {
  const dark = jelCss.slice(jelCss.indexOf(DARK), jelCss.indexOf('}', jelCss.indexOf(DARK)))
  const at = jelCss.indexOf('@media (prefers-color-scheme: dark){:root:not([data-tema]){')
  const media = jelCss.slice(at, jelCss.indexOf('}}', at))
  for (const [where, rule] of [['stored-choice rule', dark], ['system-dark rule', media]]) {
    assert.match(rule, /--grain:none;/, `${where}: --grain is none`)
    assert.ok(!/grain-d|data:image/.test(rule), `${where}: no tile`)
  }
  assert.ok(!jelCss.includes('--grain-d'), 'the dark tile is not defined at all')
})
// The price plate of the record panel stands on --papir-2: ink and soft ink read on it in both themes.
for (const theme of ['light', 'dark']) {
  for (const fg of ['tinta', 'tinta-halk']) {
    test(`B2 (${theme}): the price plate's --${fg} on --papir-2 is at least 4.5`, () => {
      const ratio = contrast(jelToken(theme, fg), jelToken(theme, 'papir-2'))
      assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}`)
    })
  }
}
test('B1: the P3 pens are untouched', () => {
  assert.ok(jelCss.includes('--jel:oklch(0.60 0.245 29);--jel-forro:oklch(0.64 0.23 42);'))
  assert.ok(jelCss.includes('--jel:oklch(0.70 0.22 32);--jel-forro:oklch(0.80 0.19 55);'))
})

// B2: the pairs of 08 1.2 on the faces the home page draws (the four tight ones first); text 4.5, lines and controls 3
const PAIRS_12 = [
  ['dark', 'jel', 'oldal', 3], ['dark', 'kezel', 'oldal', 4.5], ['light', 'tinta-halk', 'oldal', 4.5], ['light', 'jel', 'oldal', 3],
  ['light', 'tinta', 'papir-2', 4.5], ['dark', 'tinta', 'oldal', 4.5], ['light', 'tinta-halk', 'papir-2', 4.5], ['dark', 'tinta-halk', 'oldal', 4.5],
  ['light', 'kezel', 'oldal', 4.5], ['dark', 'kezel', 'papir-2', 4.5], ['dark', 'be', 'oldal', 3], ['dark', 'jel-forro', 'lap', 3], ['light', 'jel-forro', 'lap', 3],
]
for (const [theme, fg, bg, min] of PAIRS_12) {
  test(`B2 (${theme}): --${fg} on --${bg} is at least ${min}`, () => {
    const ratio = contrast(jelToken(theme, fg), jelToken(theme, bg))
    assert.ok(ratio >= min, `${ratio.toFixed(2)}`)
  })
}
test('B2: dark faces keep their separation (lap on papir, oldal on lap: not below the live green)', () => {
  assert.ok(contrast(jelToken('dark', 'lap'), jelToken('dark', 'papir')) >= 1.22)
  assert.ok(contrast(jelToken('dark', 'oldal'), jelToken('dark', 'lap')) >= 1.22)
})

// S11 (Rétegek): the depth face of a sheet n levels behind the front is color-mix(in oklab, --lap (100% - n * step), target): the target is --papir in the dark theme (30 % a level) and --tinta in the light (9 %), declared in
// src/site/retegek/retegek.css. --tinta-halk reads on both faces (n = 1, 2) in both themes at 4.5 or more.
const retegekCss = fs.readFileSync(path.join(root, 'src/site/retegek/retegek.css'), 'utf8')
const srgb = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const unsrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const toOklab = (hex) => {
  const [r, g, b] = [0, 1, 2].map((i) => srgb(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
const fromOklab = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, unsrgb(c))) * 255).toString(16).padStart(2, '0')).join('')
}
const mixOklab = (a, b, pa) => { const A = toOklab(a), B = toOklab(b); return fromOklab(A.map((v, i) => v * pa + B[i] * (1 - pa))) }
const DEPTH = { light: { target: 'tinta', step: 0.09 }, dark: { target: 'papir', step: 0.3 } }
test('S11: the depth mix declared in retegek.css is the ruled one (dark: --papir, 30 %; light: --tinta, 9 %)', () => {
  assert.match(retegekCss, /:root \{[^}]*--mixt: var\(--tinta\); --mixp: 9%;/)
  assert.match(retegekCss, /:root\[data-tema="sotet"\] \{ --mixt: var\(--papir\); --mixp: 30%; \}/)
  assert.match(retegekCss, /color-mix\(in oklab, var\(--lap\) calc\(100% - var\(--n\) \* var\(--mixp\)\), var\(--mixt\)\)/)
})
for (const theme of ['light', 'dark']) {
  for (const n of [1, 2]) {
    test(`S11 (${theme}): --tinta-halk on the depth face of level ${n} is at least 4.5`, () => {
      const face = mixOklab(jelToken(theme, 'lap'), jelToken(theme, DEPTH[theme].target), 1 - n * DEPTH[theme].step)
      const ratio = contrast(jelToken(theme, 'tinta-halk'), face)
      assert.ok(ratio >= 4.5, `${face}: ${ratio.toFixed(2)}`)
    })
  }
}

// UI PR 1: the halo behind the /munkaim/ headline (src/site/munkaim.css, --halop) is the red pen at that strength over the paper, in the dark theme only (the light page stays flat).
// The soft ink, the ink and the accent word (the pen as large type, 3:1) stay legible on the strongest face of the wash, which is the colour at full strength over the dark paper.
const munkaimCss = fs.readFileSync(path.join(root, 'src/site/munkaim.css'), 'utf8')
const halo = {
  light: /:root \{ --halop: (\d+)%; \}/.exec(munkaimCss)?.[1],
  dark: /:root\[data-tema="sotet"\] \{ --halop: (\d+)%; \}/.exec(munkaimCss)?.[1],
  media: /@media \(prefers-color-scheme: dark\) \{ :root:not\(\[data-tema\]\) \{ --halop: (\d+)%; \} \}/.exec(munkaimCss)?.[1],
}
const over = (fg, bg, alpha) => '#' + [0, 1, 2].map((i) => Math.round(parseInt(fg.slice(1 + i * 2, 3 + i * 2), 16) * alpha + parseInt(bg.slice(1 + i * 2, 3 + i * 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('')
test('UI 1: the halo is 0 in the light theme and the same strength in both dark rules (stored choice and system)', () => {
  assert.equal(halo.light, '0')
  assert.ok(halo.dark && Number(halo.dark) > 0 && Number(halo.dark) <= 20, `dark strength ${halo.dark}`)
  assert.equal(halo.media, halo.dark)
})
for (const [label, fg, min] of [['soft ink', 'tinta-halk', 4.5], ['ink', 'tinta', 4.5], ['the red pen (the accent word, large type)', 'jel', 3]]) {
  test(`UI 1 (dark): ${label} on the strongest face of the halo is at least ${min}`, () => {
    const face = over(jelToken('dark', 'jel'), jelToken('dark', 'papir'), Number(halo.dark) / 100)
    const ratio = contrast(jelToken('dark', fg), face)
    assert.ok(ratio >= min, `${face}: ${ratio.toFixed(2)}`)
  })
}
test('UI 1: the solid link pill is the sheet colour on the blue pen (the same pair as link blue on the sheet), in both themes', () => {
  for (const theme of ['light', 'dark']) assert.ok(contrast(jelToken(theme, 'lap'), jelToken(theme, 'kezel')) >= 4.5, theme)
  assert.match(munkaimCss, /\.mb-cta-teli \{ background: var\(--kezel\); color: var\(--lap\); \}/)
})
