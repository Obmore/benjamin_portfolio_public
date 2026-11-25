// The "Sötét mód" key of the home page: light and dark, section by section from the top (160 ms colour per section, 120 ms apart; the reduced
// form turns everything at once in 200 ms). The visitor's own choice is remembered in the browser (src/site/tema-tar.ts; the head
// snippet of index.html applies it before the first paint); a blocked storage only means that the choice is not kept. Without a stored
// choice the page follows the system (prefers-color-scheme). Ported from the approved prototype (parts.js).

import { JL } from './core.ts'
import { bongeszoSzin, kapcsoloAllapot, kovesdARendszert, tarolTema, type Tema } from '../tema-tar.ts'

const $ = <T extends Element = HTMLElement>(s: string): T | null => document.querySelector<T>(s)
const $$ = <T extends Element = HTMLElement>(s: string): T[] => [...document.querySelectorAll<T>(s)]
const reduced = () => JL.reduced()
function timers() {
  let l: number[] = []
  return { at: (ms: number, fn: () => void) => { l.push(JL.later(fn, ms)) }, clear: () => { l.forEach(clearTimeout); l = [] } }
}

const root = document.documentElement
const themeT = timers()

function elteroTema(): Tema {
  const t = root.getAttribute('data-tema')
  if (t === 'sotet' || t === 'vilagos') return t
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'sotet' : 'vilagos'
}

/** Sets the theme. `instant` skips the section-by-section turn (used at start); `remember` stores the visitor's choice. */
function setTheme(dark: boolean, opt: { instant?: boolean; remember?: boolean } = {}) {
  const next: Tema = dark ? 'sotet' : 'vilagos'
  const secs = $$<HTMLElement>('.tsec')
  for (const b of $$('.tkey')) kapcsoloAllapot(b, dark)
  if (opt.remember) tarolTema(next)
  themeT.clear()
  const fin = () => {
    root.setAttribute('data-tema', next)
    for (const s of secs) s.removeAttribute('data-tema')
    for (const c of $$('.tclone')) c.remove()
    bongeszoSzin() // the browser's theme-color follows the manual switch (both metas, whichever media query the browser picks)
  }
  if (opt.instant) { fin(); return }
  const red = reduced()
  const sp = $<SVGElement>('.spine-svg')
  const pg = $('.page')
  let clone: SVGElement | null = null
  if (sp && pg) {
    clone = sp.cloneNode(true) as SVGElement
    clone.setAttribute('data-tema', next)
    clone.classList.add('tclone')
    if (!red) clone.style.clipPath = 'inset(0 0 100% 0)'
    sp.parentNode!.appendChild(clone)
  }
  secs.forEach((s, i) => {
    const step = () => {
      s.setAttribute('data-tema', next)
      if (clone && !red && pg) {
        const pr = pg.getBoundingClientRect()
        const bt = s.getBoundingClientRect().bottom - pr.top
        clone.style.clipPath = `inset(0 0 ${Math.max(0, pg.offsetHeight - bt)}px 0)`
      }
    }
    if (red) step()
    else themeT.at(i * 120, step)
  })
  const end = red ? 0 : (secs.length - 1) * 120
  themeT.at(end + 380, () => clone?.parentNode?.removeChild(clone))
  themeT.at(end + 400, fin)
}

/** Reflects the current theme on the switch and makes it work. */
export function mountSwitch(btn: HTMLElement) {
  const dark = elteroTema() === 'sotet'
  kovesdARendszert((t) => setTheme(t === 'sotet', { instant: true }), JL.sig)
  kapcsoloAllapot(btn, dark)
  btn.addEventListener('click', () => setTheme(btn.getAttribute('aria-checked') !== 'true', { remember: true }))
}
