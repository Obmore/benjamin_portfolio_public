// The home page's entry script. The page's HTML is built by src/site/render.tsx; this adds what needs a browser: the old-anchor redirects, the home page's
// behaviour (a lazy chunk) and the small standalone scripts a page may need.
// Why `?worker&url`: it bundles each *-futtat.ts on its own, so no chunk is shared with another page entry and no new head tag appears. The files must not rely on worker globals.
import masoloUrl from './elemek/masolo-futtat.ts?worker&url'
import meresUrl from './meres-futtat.ts?worker&url'
import retegekUrl from './retegek-futtat.ts?worker&url'

const root = document.documentElement

// Old home-page anchors (sections of earlier pages) to the section that replaced them.
const REGI_HORGONYOK: Record<string, string> = {
  munkaim: 'munkak',
  projektek: 'munkak',
  kompetenciak: 'munkak',
  demok: 'munkak',
  munka: 'munkak',
  naplo: 'munkak',
  muhely: 'munkak',
}

// Old home anchors that now belong to a separate page (a hash cannot express a page change).
const REGI_OLDALAK: Record<string, string> = {
  csomagok: '/megrendeles/',
  arjegyzek: '/megrendeles/',
  megoldasok: '/megrendeles/',
  tapasztalat: '/munkaim/#evek',
  oneletrajz: '/munkaim/#evek',
  rolam: '/munkaim/#evek',
}

function regiHorgony() {
  let id = location.hash.slice(1)
  try { id = decodeURIComponent(id) } catch { /* malformed %-encoding: the raw hash stays */ }
  const oldal = REGI_OLDALAK[id]
  // This redirect deliberately wins over any element with the same id.
  if (oldal && /^\/(index\.html)?$/.test(location.pathname)) {
    location.replace(oldal)
    return
  }
  const uj = REGI_HORGONYOK[id]
  if (!uj) return
  const cel = document.getElementById(uj)
  if (!cel) return
  history.replaceState(history.state, '', `#${uj}`)
  cel.scrollIntoView()
  // Make the target the sequential-focus starting point, so the next Tab continues from it (keret.css hides the focus ring of section[tabindex="-1"]).
  if (!cel.hasAttribute('tabindex')) cel.tabIndex = -1
  cel.focus({ preventScroll: true })
}

/**
 * The home page's behaviour is one lazy chunk (src/site/fooldal/jel.ts): the page is complete without it (text, links, drawings, the frozen
 * capture of the band), and with it the line is drawn and the instruments work. It starts at once, because its load sequence is the first
 * screen. The head snippet of index.html sets `jel-var` (waiting for the chunk): the pieces that the sequence reveals are hidden until it
 * runs; a failed import takes the class off again, so a missing chunk never leaves a hidden page.
 */
function jel() {
  if (!document.querySelector('[data-fejlec].hdr')) return
  // Any failure (the import, or an exception in indit) takes the waiting classes off again: the page then shows its complete static form.
  import('./fooldal/jel.ts')
    .then((m) => m.indit())
    .catch(() => root.classList.remove('jel-var', 'jel-kesz', 'jel-hullam', 'jel-vege'))
}

/** Appends a standalone module script (a `*-futtat.ts` entry, built on its own). */
function onalloModul(url: string) {
  const s = document.createElement('script')
  s.type = 'module' // the dev server serves it with ES imports; the built file is a self-contained IIFE that also runs as a module
  s.src = url
  document.head.append(s)
}
// The contact end (src/site/elemek/masolo-futtat.ts): appended only on a page that carries the component; it does not wait for or depend on the home chunk.
function cimmezoBetoltes() {
  if (document.querySelector('[data-cimmezo]')) onalloModul(masoloUrl)
}
// The analytics (src/site/meres-futtat.ts): needed where a [data-esemeny] element reports clicks, or on a non-local host (the page-view script; meres.ts checks the production hosts itself).
function meresBetoltes() {
  if (document.querySelector('[data-esemeny]') || !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) onalloModul(meresUrl)
}
// The "Rétegek" stacks (src/site/retegek-futtat.ts): its own script, which also loads the stacks' own stylesheet; appended only on a page that carries a stack.
function retegekBetoltes() {
  if (document.querySelector('[data-kij], [data-rt]')) onalloModul(retegekUrl)
}

// Each init on its own: one that throws must not keep the home page's script (jel) or the rest from starting, and the waiting class never outlives a failed init.
for (const init of [cimmezoBetoltes, jel, regiHorgony, meresBetoltes, retegekBetoltes]) {
  try { init() } catch { if (init === jel) root.classList.remove('jel-var', 'jel-kesz', 'jel-hullam', 'jel-vege') }
}
window.addEventListener('hashchange', regiHorgony)
// Smooth scrolling between in-page anchors (keret.css) starts only after the load and the first frame, so a jump to a fragment at page load stays instant; the same lines are in keret.ts.
const sima = () => requestAnimationFrame(() => { root.dataset.sima = '' })
if (document.readyState === 'complete') sima()
else window.addEventListener('load', sima, { once: true })
