import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test, { after, before } from 'node:test'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'

// The shared layer's fixes of PR A2: the header's current-page input (K4), the contact end's mail subject (K5), the print rules of the contact end (K6) and the section H2 in the
// shared sheet (K8). Rendered by the site's own render path (an embedded Vite server), the sheets read as text.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replaceAll('\r\n', '\n')
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
    fejlec: await server.ssrLoadModule('/src/site/fooldal/Fejlec.tsx'),
    cimmezo: await server.ssrLoadModule('/src/site/elemek/Cimmezo.tsx'),
    alap: await server.ssrLoadModule('/src/content/alapadatok.ts'),
    jel: await server.ssrLoadModule('/src/content/fooldal.ts'),
  }
})
after(async () => { await server?.close() })

const header = (keret) => renderToStaticMarkup(createElement(modules.fejlec.JelFejlec, keret ? { keret } : {}))
const links = (html) => [...html.matchAll(/<a class="lnk"([^>]*)>([^<]*)<\/a>/g)].map((m) => ({ attrs: m[1], label: m[2], href: /href="([^"]*)"/.exec(m[1])[1], current: /aria-current="page"/.test(m[1]) }))

test('K4: the header on the home page and on a subpage without input is unchanged: no page is current, "Kapcsolat" goes to /#kapcsolat from a subpage', () => {
  const home = links(header())
  assert.deepEqual(home.map((l) => l.href), ['#munkak', '/megrendeles/', '#kapcsolat'])
  assert.ok(home.every((l) => !l.current))
  const sub = links(header({ oldal: 'aloldal', nyelv: 'hu' }))
  assert.deepEqual(sub.map((l) => l.href), ['/munkaim/', '/megrendeles/', '/#kapcsolat'])
  assert.ok(sub.every((l) => !l.current))
})

test('K4: the current page is marked with aria-current="page" on its own link only; "Kapcsolat" goes to the page\'s own #kapcsolat when it has one, else to /#kapcsolat', () => {
  const offer = links(header({ oldal: 'aloldal', nyelv: 'hu', aktualis: 'csomagok', sajatKapcsolat: true }))
  assert.deepEqual(offer.map((l) => l.current), [false, true, false])
  assert.equal(offer[1].href, '/megrendeles/')
  assert.equal(offer[2].href, '#kapcsolat')
  const works = links(header({ oldal: 'aloldal', nyelv: 'hu', aktualis: 'munkak' }))
  assert.deepEqual(works.map((l) => l.current), [true, false, false])
  assert.equal(works[2].href, '/#kapcsolat', 'a page without its own contact section goes home')
})

// (the same underline also marks the home page's own aria-current="location" section, 08 5.1 "on / while that section is in view": e2e/fooldal.spec.ts, K4)
test('K4: below 727 px the current link carries the 2 px --jel underline in the hover underline\'s place, also under reduced motion; the desktop node stays', () => {
  const css = read('src/site/keret.css')
  const phone = css.slice(css.indexOf('@media (max-width: 726px) {\n'))
  assert.match(phone, /\.hdr nav a\.lnk\[aria-current\]:not\(\.tlnk\)::after \{ transform: scaleX\(1\); background: var\(--jel\); \}/)
  assert.match(css, /\.lnk::after \{[^}]*height: 2px/, 'the underline is the 2 px bar')
  // it must beat the reduced-motion rule that hides the hover underline (specificity 0,3,1 against 0,4,3)
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.lnk:not\(\.tlnk\):hover::after/)
  assert.match(css, /\.hdr nav a\[aria-current\]::before \{ display: block;/, 'the desktop node')
})

test('K5: the "Levelet írok" link takes an optional subject; without it the link is today\'s plain mailto, the field\'s own address link never changes', () => {
  const { VALLALKOZO } = modules.alap
  const K = modules.jel.JEL.kapcsolat
  const szoveg = { masolas: K.masolas, kimasolva: K.kimasolva, hiba: K.hiba, allapotHiba: K.allapotHiba, link: K.link, beszelgetes: K.beszelgetes }
  const render = (props) => renderToStaticMarkup(createElement(modules.cimmezo.Cimmezo, { szoveg, ...props }))
  const plain = render({})
  const hrefOf = (html, n) => [...html.matchAll(/<a [^>]*href="(mailto:[^"]*)"/g)].map((m) => m[1])[n]
  assert.equal(hrefOf(plain, 0), `mailto:${VALLALKOZO.email}`)
  assert.equal(hrefOf(plain, 1), `mailto:${VALLALKOZO.email}`, 'the home keeps today\'s link')
  const subject = render({ targy: 'Megrendelés' })
  assert.equal(hrefOf(subject, 0), `mailto:${VALLALKOZO.email}`, 'the address field stays plain')
  assert.equal(hrefOf(subject, 1), `mailto:${VALLALKOZO.email}?subject=${encodeURIComponent('Megrendelés')}`)
  assert.equal(subject.replace(/\?subject=[^"]*/, ''), plain, 'nothing else in the markup changes')
})

test('K6: print: the contact end keeps the address and the links as text; no line, no copy key, no lamp', () => {
  const css = read('src/site/elemek/cimmezo.css')
  const block = css.slice(css.indexOf('@media print'))
  assert.match(block, /\.cmz \.cmz-kc, \.cmz\[data-st\] \.cmz-lampa, \.cmz \.cmz-svg \{ display: none; \}/)
  assert.match(block, /\.cmz-mezo \{ background: none; \}/)
})

test('K8: the section H2 is in the shared sheet (keret.css), not copied in the home page\'s sheet; the home keeps the same sizes at 44/28, 36 (727-1199) and 26 (320-359)', () => {
  const keret = read('src/site/keret.css')
  const jel = read('src/site/fooldal/jel.css')
  assert.match(keret, /^\.h2 \{ font-stretch: 112%; font-weight: 700; font-size: 44px; line-height: 48px; \}/m)
  assert.match(keret, /@media \(max-width: 726px\) \{ \.h2 \{ font-size: 28px; line-height: 32px; \} \}/)
  assert.ok(!/^\.h2 \{/m.test(jel), 'no second base rule')
  assert.match(jel, /@media \(min-width: 727px\) and \(max-width: 1199px\) \{\s*\.h2 \{ font-size: 36px; line-height: 40px; \}/)
  assert.match(jel, /@media \(max-width: 359px\) \{[\s\S]*?\.in \.h2 \{ font-size: 26px; line-height: 30px; \}/)
  assert.match(jel, /@import "\.\.\/keret\.css";/, 'the home sheet pulls the shared layer in before its own rules, so its overrides still win')
  assert.ok(jel.indexOf('@import "../keret.css"') < jel.indexOf('.in .h2 { margin-bottom: 48px; }'))
})

test('K9: the subpages (.al) step the section H2 down under the page H1: 36/40 from 727 to 1279, never above the H1 below 360; the home page (no .al) is untouched', () => {
  const keret = read('src/site/keret.css')
  assert.match(keret, /@media \(min-width: 727px\) and \(max-width: 1279px\) \{ \.al \.h2 \{ font-size: 36px; line-height: 40px; \} \}/)
  assert.match(keret, /@media \(max-width: 359px\) \{ \.al \.h2 \{ font-size: min\(26px, calc\(10\.4vw - 7\.3px\)\); line-height: 30px; \} \}/)
  // The H1's own size under 727 px (jogi.css) is the clamp the H2 below 360 px follows.
  assert.match(read('src/site/jogi.css'), /\.ph-h1 \{ grid-column: 2; font-size: min\(32px, calc\(10\.4vw - 7\.3px\)\)/)
  // Every H2 rule of the shared sheet that carries `.al` is a subpage rule; the home page's sheet has none.
  assert.ok(!/\.al\b/.test(read('src/site/fooldal/jel.css')), 'the home sheet does not use .al')
})
