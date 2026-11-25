import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test, { after, before } from 'node:test'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { walk } from './lib/walk.mjs'

// The record panel with a rating plate (checks P1 to P6), rendered by the site's own render path (the same embedded Vite server the build uses for the pages)
// with the first package's real data (Termékleírás-próbakör: src/content/szegmensek/termekleiras.ts, the price from src/data/pricing.ts).

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = fs.readFileSync(path.join(root, 'src/site/elemek/adatlap.css'), 'utf8')
let server
let modules

before(async () => {
  server = await createServer({
    configFile: false,
    root,
    logLevel: 'warn',
    appType: 'custom',
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(root, 'src') } },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  modules = {
    panel: await server.ssrLoadModule('/src/site/elemek/Adatlap.tsx'),
    util: await server.ssrLoadModule('/src/site/util.tsx'),
    pricing: await server.ssrLoadModule('/src/data/pricing.ts'),
    seg: await server.ssrLoadModule('/src/content/szegmensek/termekleiras.ts'),
  }
})
after(async () => { await server?.close() })

function firstPackage(extra = {}) {
  const { TERMEKLEIRAS } = modules.seg
  const { huf, AFA } = modules.util
  const b = TERMEKLEIRAS.belepo
  return {
    id: 'csomag-1',
    fej: 'Csomag',
    cim: b.nev,
    cimSzint: 'h3',
    sorok: [{ cimke: 'Tartalom', ertek: b.leiras }, { cimke: 'Határidő', ertek: b.ido }],
    ar: { osszeg: huf(b.ar.osszeg), utotag: b.ar.utotag, afa: AFA },
    gomb: { felirat: TERMEKLEIRAS.hos.gomb.felirat, href: '/megrendeles/#szolgaltatas-termekleiras', esemeny: 'fo-gomb' },
    garancia: TERMEKLEIRAS.hos.garancia,
    link: { felirat: 'Egy link', href: '/termekleiras/' },
    ...extra,
  }
}
const render = (props) => renderToStaticMarkup(createElement(modules.panel.Adatlap, props))
const text = (html, cls) => new RegExp(`class="${cls}"[^>]*>([^<]*)<`).exec(html)?.[1]

test('P1: the parts are in the order of the table: head row, entry, title, rows, plate, key button, guarantee line, text link', () => {
  const html = render(firstPackage())
  const at = ['adl-fej', 'adl-bel', 'adl-cim', 'adl-sorok', 'adl-ar', 'adl-gomb', 'adl-gar', 'adl-link'].map((c) => html.indexOf(c === 'adl-link' ? 'tlnk adl-link' : `class="${c}`))
  assert.ok(at.every((i) => i >= 0), `every part is there: ${at}`)
  assert.deepEqual([...at].sort((a, b) => a - b), at, 'in the order of the table')
  assert.match(html, /<h3 class="adl-cim" id="csomag-1-cim">/, 'the package title is an H3')
  assert.equal(html.split('class="adl-sor"').length - 1, 2, 'the two rows')
  assert.ok(html.indexOf('adl-cimke">Tartalom<') < html.indexOf('adl-ertek"'), 'a row is its label above its value')
})

test('P1: the amount string is the one pricing.ts gives, character by character; the legend is stored in natural case', () => {
  const { huf } = modules.util
  const b = modules.seg.TERMEKLEIRAS.belepo
  const html = render(firstPackage())
  assert.equal(text(html, 'adl-ossz'), huf(b.ar.osszeg))
  assert.equal(text(html, 'adl-ossz'), '49 000 Ft')
  assert.equal(text(html, 'adl-utotag'), b.ar.utotag)
  assert.equal(text(html, 'adl-afa'), modules.pricing.VAT_LABEL.hu)
  assert.equal(text(html, 'adl-leg'), 'Ár', 'stored "Ár"; the capitals come from the style')
  assert.match(css, /\.adl-leg \{[^}]*text-transform: uppercase/)
})

test('P1: a panel without a price in the data keeps the plate with "Egyedi ajánlat" and no third line; without a price part there is no plate; on the home page the title is no heading', () => {
  const none = render(firstPackage({ ar: null }))
  assert.equal(text(none, 'adl-sum adl-egyedi'), 'Egyedi ajánlat')
  assert.ok(!none.includes('adl-afa'), 'no VAT line')
  assert.ok(!none.includes('adl-ossz'), 'no amount')
  const bare = render(firstPackage({ ar: undefined, gomb: undefined, garancia: undefined, link: undefined, cimSzint: undefined, id: undefined }))
  assert.ok(!bare.includes('class="adl-ar"'), 'no plate part')
  assert.ok(!/<h[1-6]/.test(bare), 'no heading: it stands above the first H2')
  assert.match(bare, /<p class="adl-cim">/)
})

test('P2: the two screws are decoration: no accessible name, no focus, the legend line is taller than a screw so removing them moves nothing; the slots are 15 degrees off vertical and 35 degrees off level', () => {
  const html = render(firstPackage())
  const screws = [...html.matchAll(/<svg class="adl-skr"[^>]*>([\s\S]*?)<\/svg>/g)]
  assert.equal(screws.length, 2)
  for (const s of screws) {
    assert.match(s[0], /aria-hidden="true"/)
    assert.match(s[0], /focusable="false"/)
    assert.ok(!/tabindex|role=|aria-label|<title/.test(s[0]), 'no name, no role, no focus')
  }
  assert.deepEqual(screws.map((s) => /rotate\((\d+) /.exec(s[1])[1]), ['75', '35'], '75 = 15 degrees off vertical; 35 degrees off level')
  const screw = /\.adl-skr \{[^}]*width: (\d+)px; height: (\d+)px/.exec(css)
  const leg = /\.adl-leg \{[^}]*line-height: (\d+)px/.exec(css)
  assert.ok(Number(screw[2]) <= Number(leg[1]), `a ${screw[2]} px screw in a ${leg[1]} px line`)
})

// the rules of the sheet: [selector, declarations, inside the phone media query]
function rules(source) {
  const flat = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const out = []
  const phone = flat.indexOf('@media (max-width: 726px)')
  const next = phone >= 0 ? flat.indexOf('@media print', phone) : -1   // the phone blocks (726 px, then 359 px) end where the print block starts
  assert.ok(phone >= 0 && next > phone, 'the phone and print blocks are both in the sheet')
  const end = next < 0 ? Infinity : next
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) out.push([m[1].trim(), m[2], phone >= 0 && m.index > phone && m.index < end])
  return out.filter(([sel]) => !sel.startsWith('@'))
}

test('P3: no pen colour on the plate: its face, outline, screws and text use --papir-2, --tinta, --tinta-halk and --oldal only', () => {
  const plate = rules(css).filter(([sel]) => /^\.adl-(ar|ar1|skr|leg|ar-ter|sum|ossz|utotag|egyedi|afa)\b/.test(sel))
  assert.ok(plate.length >= 8)
  const used = new Set()
  for (const [, body] of plate) for (const m of body.matchAll(/var\(--([a-z0-9-]+)\)/g)) used.add(m[1])
  assert.deepEqual([...used].sort(), ['oldal', 'papir-2', 'tinta', 'tinta-halk'])
})

test('P5: the sheet holds no colour, no theme selector and no stroke weight outside 1.5, 2.5 and 1 px (2 px only below 727 px)', () => {
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(|lch\(|lab\(|color\(|light-dark\(/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'no colour literal')
  assert.ok(!/data-tema|prefers-color-scheme|:root\[/.test(css), 'no theme selector')
  const weights = []
  for (const [sel, body, phone] of rules(css)) {
    for (const m of body.matchAll(/(?:^|;)\s*(border(?:-[a-z]+)*|stroke-width|outline(?:-width)?)\s*:\s*([^;]+)/g)) {
      if (m[1] === 'border-radius') continue
      for (const px of m[2].matchAll(/(\d*\.?\d+)px/g)) weights.push({ sel, prop: m[1], px: Number(px[1]), phone })
    }
  }
  assert.ok(weights.length >= 10)
  for (const w of weights) {
    const ok = [1, 1.5, 2.5].includes(w.px) || (w.px === 2 && w.phone)
    assert.ok(ok, `${w.sel} ${w.prop}: ${w.px} px${w.phone ? ' (phone)' : ''}`)
  }
})

test('P4: the phone title is the scale H3 (20/26 at 726 px and below), 18/24 with 16 px side padding at 359 px and below; the 359 block is a phone block', () => {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const block = (query) => new RegExp(`@media \\(max-width: ${query}px\\) \\{([\\s\\S]*?)\\n\\}`).exec(flat)?.[1] ?? ''
  const phone = block(726)
  const narrow = block(359)
  assert.match(phone, /\.adl-cim \{ font-size: 20px; line-height: 26px; \}/)
  assert.match(phone, /\.adl-test \{ padding: 40px 24px 20px; \}/, 'the side padding stays 24 at 726 px')
  assert.match(narrow, /\.adl-test \{ padding: 40px 16px 20px; \}/)
  assert.match(narrow, /\.adl-cim \{ font-size: 18px; line-height: 24px; \}/)
  const inPhone = rules(css).filter(([, , p]) => p).map(([sel]) => sel)
  assert.ok(inPhone.filter((sel) => sel === '.adl-cim').length === 2 && inPhone.filter((sel) => sel === '.adl-test').length === 2, 'both blocks count as phone rules')
})

test('P6: only the first screen of the home page (PR B), /megrendeles/ and /munkaim/ (the work screens; each its page component and its page sheet) load the panel and its stylesheet; the other pages and the legal pages do not', () => {
  const sources = walk(path.join(root, 'src'), (file) => /\.(ts|tsx|css)$/.test(file))
  const users = sources
    .filter((file) => {
      const rel = path.relative(root, file).replaceAll('\\', '/')
      if (rel.startsWith('src/site/elemek/')) return false
      return /adatlap\.css|elemek\/Adatlap/.test(fs.readFileSync(file, 'utf8'))
    })
    .map((f) => path.relative(root, f).replaceAll('\\', '/'))
    .sort()
  assert.deepEqual(users, ['src/site/csomagok.css', 'src/site/fooldal/Nyitas.tsx', 'src/site/fooldal/jel.css', 'src/site/munkaim.css', 'src/site/pages/Csomagok.tsx', 'src/site/pages/Munkaim.tsx'])
  for (const html of ['index.html', 'impresszum/index.html', 'aszf/index.html', 'adatkezeles/index.html', 'munkaim/index.html', '404.html']) assert.ok(!fs.readFileSync(path.join(root, html), 'utf8').includes('adatlap'), html)
  assert.match(fs.readFileSync(path.join(root, 'src/site/csomagok.css'), 'utf8'), /@import "\.\/elemek\/adatlap\.css"/)
})

// ---- the shared-layer fixes of PR A2 (K1, K2, K3, K6) ----
const decl = (sel) => rules(css).filter(([s, , phone]) => s === sel && !phone).map(([, body]) => body).join(';')

test('K1: the amount never breaks and the suffix is one box that drops whole under it; the longest real amount and suffix are the ones rendered', () => {
  assert.ok(!/white-space: nowrap/.test(decl('.adl-sum')), 'the whole line is no longer nowrap (it could not wrap the suffix)')
  assert.match(decl('.adl-ossz'), /white-space: nowrap/, 'the amount does not break')
  assert.match(decl('.adl-utotag'), /display: inline-block/, 'the suffix is one box')
  assert.ok(!/margin-left/.test(decl('.adl-utotag')))
  // the longest amount (pricing.ts AMOUNTS) with the longest "egyszeri díj" suffix of the entry packages (belepok.ts)
  const { huf } = modules.util
  const amount = huf(Math.max(...Object.values(modules.pricing.AMOUNTS)))
  const html = render(firstPackage({ ar: { osszeg: amount, utotag: ' egyszeri díj', afa: modules.pricing.VAT_LABEL.hu } }))
  assert.match(html, new RegExp(`class="adl-ossz">${amount}</span><span class="adl-utotag"> egyszeri díj</span>`), 'the suffix box follows the amount directly (an inline-block is its own break opportunity)')
  assert.ok(!html.includes('<wbr'))
  assert.match(decl('.adl-ossz:not(:last-child)'), /margin-right: 8px/, 'the gap exists only when a suffix follows, and belongs to the amount so a dropped suffix is not indented')
  const bare = render(firstPackage({ ar: { osszeg: amount, utotag: '', afa: modules.pricing.VAT_LABEL.hu } }))
  assert.ok(!bare.includes('adl-utotag'), 'no suffix span when there is no suffix')
})

test('K2: the text link underlines every line it wraps onto (the inline-link form of the legal pages), not one bar; its box stays 44 px high', () => {
  const body = decl('.adl .adl-link')
  assert.match(body, /text-decoration: underline/)
  assert.match(body, /text-decoration-thickness: 2px/)
  assert.match(body, /min-height: 44px/)
  assert.match(decl('.adl .adl-link::after'), /display: none/, 'the one-bar underline of .lnk::after is off (.lnk::before is off by default)')
  assert.match(decl('.adl .adl-link:hover, .adl .adl-link:focus-visible'), /text-decoration-thickness: 3px/, 'hover and keyboard focus show a change: the underline thickens')
})

test('K3: the key button has the hover face of 08 5.4 (12 % blue in the sheet face) and keeps growing with a two-line label', () => {
  assert.match(decl('.adl-gomb:hover'), /background: color-mix\(in oklch, var\(--kezel\) 12%, var\(--lap\)\)/)
  assert.match(decl('.adl-gomb'), /min-height: 48px/)
  assert.ok(!/(^|;)\s*height:/.test(decl('.adl-gomb')), 'min-height, never a fixed height')
})

test('K6: print: no entry square, no screws, no key button, no face', () => {
  const printAt = css.indexOf('@media print')
  assert.ok(printAt > 0)
  const block = css.slice(printAt)
  assert.match(block, /\.adl-bel, \.adl-skr, \.adl-gomb \{ display: none; \}/)
  assert.match(block, /\.adl, \.adl-ar \{ background: none; \}/)
  assert.match(block, /\.adl-ar1 \{ padding-left: 0; \}/, 'the screws are gone, so the legend line loses their 26 px')
  assert.ok(!rules(css).some(([sel, , phone]) => phone && /print/.test(sel)), 'the print block is not counted as phone rules')
  assert.ok(rules(css).filter(([sel]) => sel === '.adl-ar1').every(([, , phone]) => !phone), 'the print .adl-ar1 rule is not a phone rule')
})
