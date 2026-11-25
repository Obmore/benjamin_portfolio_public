// The script of the pages that have no home-page chunk (the legal pages, 404; /megrendeles/ and /munkaim/ load it from their own entry): the "Sötét mód" key. The head snippet
// (src/site/jel-fej.ts) has set `data-tema` on <html> before the first paint; this makes the key work: it shows the current theme, turns it, and
// remembers the visitor's choice in the browser (the key of src/site/tema-tar.ts, the key the home page's key uses, so the choice holds on every page).
// The page's sections turn together (the colours fade in the 160 ms of .tsec); the home page's section-by-section turn is its own (src/site/fooldal/tema.ts).
// Without script the key stays hidden (html:not(.jel-kesz) .tkey) and the page follows the system theme.

import { bongeszoSzin, kapcsoloAllapot, kovesdARendszert, tarolTema, type Tema } from './tema-tar.ts'
// Why `?worker&url`: it bundles horgony-futtat.ts on its own, so no chunk is shared with another page entry and no new head tag appears.
// The file must not rely on worker globals.
import horgonyUrl from './horgony-futtat.ts?worker&url'
// The stack's script (src/site/retegek-futtat.ts), appended only on a page that carries a stack. main.ts imports it too: the `&keret` query keeps this URL module out of main.ts's chunk.
import retegekUrl from './retegek-futtat.ts?worker&url&keret'
const root = document.documentElement

function indit() {
  const gomb = document.querySelector<HTMLButtonElement>('.tkey')
  if (!gomb) return
  const sotet = () => root.getAttribute('data-tema') === 'sotet'
  const allit = (t: Tema) => {
    root.setAttribute('data-tema', t)
    kapcsoloAllapot(gomb, sotet())
    bongeszoSzin()
  }
  kapcsoloAllapot(gomb, sotet())
  gomb.disabled = false
  root.classList.add('jel-kesz')
  gomb.addEventListener('click', () => {
    const t = sotet() ? 'vilagos' : 'sotet'
    tarolTema(t)
    allit(t)
  })
  kovesdARendszert(allit)
}

try { indit() } catch { /* the page stays as it is: the system theme, no key */ }
try {
  if (document.querySelector('[data-rt]')) {
    const s = document.createElement('script')
    s.type = 'module' // the dev server serves it with ES imports; the built file is a self-contained IIFE that also runs as a module
    s.src = retegekUrl
    document.head.append(s)
  }
} catch { /* the page stays without its stack */ }
// Smooth in-page scrolling (keret.css) starts after the load and the first frame, so the page-load jump to a fragment stays instant (the same lines are in main.ts for the home page: a shared module would become a shared chunk).
const sima = () => requestAnimationFrame(() => { root.dataset.sima = '' })
if (document.readyState === 'complete') sima()
else window.addEventListener('load', sima, { once: true })
// A shared link to a heading (e.g. /aszf/#elso-resz) is re-aligned once after the late web-font swap: a script of its own (src/site/horgony-futtat.ts), added only when there is a hash.
try {
  if (location.hash.length > 1) {
    // The visitor's own input counts even before the script has run: flag it now (read, then removed, by horgony.ts).
    for (const e of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.addEventListener(e, () => { root.dataset.horgonyMozdult = '' }, { passive: true, once: true })
    const s = document.createElement('script')
    s.type = 'module' // the dev server serves it with ES imports; the built file is a self-contained IIFE that also runs as a module
    s.src = horgonyUrl
    document.head.append(s)
  }
} catch { /* the browser's own scroll stays */ }
