// The behaviour of the contact end (Cimmezo.tsx). It belongs to the component, not to a page: any page that has the shared header and loads this module
// gets the whole station. It draws the line itself (one level tap from a node on the lane to the terminal on the field's left edge; answered: a green terminal and a red
// underline under the address up to the key cell), copies the address on a press, shows the lamp with its legend, and takes the answer back after four seconds.
// The strings are read from the component's own markup. One delegated click listener, so markup put back by another script's fallback still works.
// Reduced motion draws and takes back the answer whole in 150 to 200 ms, nothing moving, nothing orange.

import { anim, rc, type Anim } from './anim.ts'

const NS = 'http://www.w3.org/2000/svg'
const HOLD_MS = 4000
const HEAD_PX = 36
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const linear = (t: number) => t

function mk<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const k in attrs) e.setAttribute(k, String(attrs[k]))
  parent?.appendChild(e)
  return e
}

/** The x of the lane (the centre of the header's mark column), or null on a page without the shared header. */
function laneX(): number | null {
  const l = document.querySelector('.hdr .lane')
  if (!l) return null
  const r = l.getBoundingClientRect()
  return r.left + r.width / 2
}

interface Geo { w: number; h: number; lane: number; x0: number; y: number; end: number }
type Allapot = 'nyugalom' | 'kesz' | 'hiba'

interface Allapotgep {
  root: HTMLElement
  svg: SVGSVGElement
  st: Allapot
  /** The underline's progress 0..1, its opacity (the reduced form fades it) and the hot head's strength 0..1. */
  k: number
  op: number
  heat: number
  tok: number
  /** Taking the answer back has begun (a press then starts over). */
  aus: boolean
  anims: Anim[]
  timers: number[]
  hold: number
  raf: number
  g: Geo | null
}

const gepek = new WeakMap<HTMLElement, Allapotgep>()
const q = <T extends Element>(root: ParentNode, sel: string) => root.querySelector<T>(sel)

function geometria(root: HTMLElement): Geo | null {
  const mezo = q<HTMLElement>(root, '.cmz-mezo')
  const kc = q<HTMLElement>(root, '.cmz-kc')
  const alap = q<HTMLElement>(root, '.cmz-alap')
  if (!mezo || !kc || !alap) return null
  const rr = root.getBoundingClientRect()
  const fr = mezo.getBoundingClientRect()
  const kr = kc.getBoundingClientRect()
  const cr = (q<HTMLElement>(root, '.cmz-cim') ?? mezo).getBoundingClientRect()
  // address baseline (the bottom edge of the zero-size box at the end of the text) plus 8 px
  const y = alap.getBoundingClientRect().bottom - rr.top + 8
  // the key cell is beside the address, or a second row of the field: beside shares the address cell's row, a second row starts at the address cell's bottom (told by the layout, not by a pixel difference)
  const beside = kr.width > 0 && kr.top < cr.bottom - 1
  return { w: root.clientWidth, h: root.clientHeight, lane: (laneX() ?? fr.left - 24) - rr.left, x0: fr.left - rr.left, y, end: beside ? kr.left - rr.left - 8 : fr.right - rr.left - 12 }
}

/** Draws the static line and the current state; called on every change of size and on every frame of the underline. */
function zeichne(s: Allapotgep, relayout: boolean): void {
  if (relayout) s.g = geometria(s.root)
  const g = s.g
  const svg = s.svg
  while (svg.firstChild) svg.removeChild(svg.firstChild)
  if (!g) return
  svg.setAttribute('width', String(g.w))
  svg.setAttribute('height', String(g.h))
  const [lane, x0, y] = [g.lane.toFixed(1), g.x0.toFixed(1), g.y.toFixed(1)]
  const t0 = g.x0 - 8
  if (g.lane < t0) mk('path', { d: `M${lane} ${y}H${t0.toFixed(1)}`, class: 'ln pen-r' }, svg)
  mk('circle', { cx: lane, cy: y, r: 5, class: 'cmz-nod' }, svg)
  if (s.st === 'kesz') mk('circle', { cx: x0, cy: y, r: 6, class: 'cmz-ter-be' }, svg)
  else mk('rect', { x: t0.toFixed(1), y: (g.y - 4).toFixed(1), width: 8, height: 8, class: 'cmz-ter' }, svg)
  if (s.st !== 'kesz' || s.k <= 0 || g.end <= g.x0) return
  const L = g.end - g.x0
  const d = `M${x0} ${y}H${g.end.toFixed(1)}`
  const ul = mk('path', { d, class: 'cmz-ul' }, svg)
  ul.style.strokeDasharray = `${L} ${L + 2}`
  ul.style.strokeDashoffset = String(L * (1 - s.k))
  ul.style.opacity = String(s.op)
  if (s.heat > 0.01) {
    // the hot head: the last stretch of the drawn line is orange while it is drawn, and cools 400 ms after the last movement
    const head = mk('path', { d, class: 'cmz-hev' }, svg)
    head.style.strokeDasharray = `${HEAD_PX} ${L + HEAD_PX}`
    head.style.strokeDashoffset = String(-(s.k * L - HEAD_PX))
    head.style.opacity = String(s.heat * s.op)
  }
}

function stopAll(s: Allapotgep): void {
  s.anims.forEach((a) => a.stop())
  s.anims = []
  s.timers.forEach((t) => clearTimeout(t))
  s.timers = []
  cancelAnimationFrame(s.raf)
}

function anlegen(root: HTMLElement): Allapotgep | null {
  const known = gepek.get(root)
  if (known) return known
  const key = q<HTMLButtonElement>(root, '.cmz-gomb')
  if (!key) return null
  const svg = q<SVGSVGElement>(root, ':scope > .cmz-svg') ?? mk('svg', { class: 'cmz-svg', 'aria-hidden': 'true', focusable: 'false' }, root)
  const s: Allapotgep = { root, svg, st: 'nyugalom', k: 0, op: 1, heat: 0, tok: 0, aus: false, anims: [], timers: [], hold: 0, raf: 0, g: null }
  gepek.set(root, s)
  key.disabled = false
  root.removeAttribute('data-st')
  root.removeAttribute('data-aus')
  zeichne(s, true)
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => zeichne(s, true))
    ro.observe(root)
    const mezo = q(root, '.cmz-mezo')
    if (mezo) ro.observe(mezo)
  }
  void document.fonts?.ready.then(() => zeichne(s, true))
  return s
}

/** Copies the text: the clipboard API, else a selected off-screen textarea. Rejects when neither works. */
function masol(txt: string, key: HTMLElement, current: () => boolean): Promise<void> {
  const fallback = () => {
    const prev = document.activeElement as HTMLElement | null
    const ta = document.createElement('textarea')
    ta.value = txt
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try { ok = document.execCommand('copy') } catch { /* no copy */ }
    ta.remove()
    // the textarea took the focus: give it back (to the key only when nothing else had it, and only for a current result)
    if (prev && prev !== document.body && prev.isConnected) prev.focus({ preventScroll: true })
    else if (current()) key.focus({ preventScroll: true })
    if (!ok) throw new Error('copy')
  }
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(txt).catch(fallback)
  try { fallback(); return Promise.resolve() } catch (e) { return Promise.reject(e instanceof Error ? e : new Error('copy')) }
}

function allapotSzoveg(s: Allapotgep, szoveg: string): void {
  const el = q(s.root, '.cmz-allapot')
  if (!el) return
  el.textContent = ''
  // an empty region first, the sentence in the next frame: the same sentence announced twice is read twice
  if (szoveg) s.raf = requestAnimationFrame(() => { el.textContent = szoveg })
}

/** A failed copy leaves the address selected, so the visitor finishes it by hand (the status sentence says so); the selection stays until the visitor clicks elsewhere. */
function kijelol(root: HTMLElement): void {
  const cim = q<HTMLElement>(root, '.cmz-cim')
  const sel = window.getSelection()
  if (!cim || !sel) return
  const tartomany = document.createRange()
  tartomany.selectNodeContents(cim)
  sel.removeAllRanges()
  sel.addRange(tartomany)
}

/** The key answered: show the state (ok or failed) and start the four seconds. */
function valasz(s: Allapotgep, ok: boolean): void {
  const root = s.root
  if (!ok) kijelol(root)
  const volt = s.st
  const legend = q(root, '.cmz-lampa-t')
  const szoveg = (ok ? root.dataset.kimasolva : root.dataset.allapotHiba) ?? ''
  clearTimeout(s.hold)
  if (ok && volt === 'kesz' && !s.aus) {
    // pressed again while the answer is up (also while the line is still being drawn): the drawing goes on, the four seconds start over
    allapotSzoveg(s, szoveg)
  } else {
    stopAll(s)
    s.aus = false
    root.removeAttribute('data-aus')
    s.st = ok ? 'kesz' : 'hiba'
    root.setAttribute('data-st', s.st)
    if (legend) legend.textContent = (ok ? root.dataset.kimasolva : root.dataset.hiba) ?? ''
    allapotSzoveg(s, szoveg)
    s.k = 0
    s.op = 1
    s.heat = 0
    if (ok && reduced()) {
      s.k = 1
      s.op = 0
      s.anims.push(anim(180, linear, (e) => { s.op = e; zeichne(s, false) }))
    } else if (ok) {
      s.heat = 1
      s.anims.push(anim(300, rc, (e) => { s.k = e; zeichne(s, false) }, () => {
        s.k = 1
        zeichne(s, false)
        // cool: 400 ms after the last movement, over 300 ms
        s.timers.push(window.setTimeout(() => {
          s.anims.push(anim(300, rc, (e) => { s.heat = 1 - e; zeichne(s, false) }, () => { s.heat = 0; zeichne(s, false) }))
        }, 400))
      }))
    }
    zeichne(s, true)
  }
  s.hold = window.setTimeout(() => felold(s), HOLD_MS)
}

/** Four seconds after the last press: the underline withdraws, the lamp goes off, the terminal is the hollow square again. */
function felold(s: Allapotgep): void {
  const root = s.root
  stopAll(s)
  s.aus = true
  root.setAttribute('data-aus', '')
  allapotSzoveg(s, '')
  const vege = () => {
    s.st = 'nyugalom'
    s.k = 0
    s.op = 1
    s.heat = 0
    s.aus = false
    root.removeAttribute('data-st')
    root.removeAttribute('data-aus')
    zeichne(s, true)
  }
  s.heat = 0
  if (s.st === 'kesz' && s.k > 0) {
    if (reduced()) s.anims.push(anim(160, linear, (e) => { s.op = 1 - e; zeichne(s, false) }, vege))
    else {
      const k0 = s.k
      s.anims.push(anim(300, rc, (e) => { s.k = k0 * (1 - e); zeichne(s, false) }, vege))
    }
  } else {
    s.timers.push(window.setTimeout(vege, 160))
  }
}

function onClick(e: MouseEvent): void {
  const t = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('.cmz-gomb') : null
  if (!t || t.disabled) return
  const root = t.closest<HTMLElement>('[data-cimmezo]')
  const s = root && anlegen(root)
  if (!root || !s) return
  const tok = ++s.tok
  const adr = q<HTMLAnchorElement>(root, '.cmz-cim')?.getAttribute('href')?.replace(/^mailto:/, '') ?? ''
  masol(adr, t, () => tok === s.tok).then(
    () => { if (tok === s.tok) valasz(s, true) },
    () => { if (tok === s.tok) valasz(s, false) },
  )
}

let beindult = false

/** Starts every contact end of the page: enables its key and draws its line. Safe to call more than once. */
export function cimmezoIndit(): void {
  const roots = document.querySelectorAll<HTMLElement>('[data-cimmezo]')
  if (roots.length === 0) return
  if (!beindult) {
    beindult = true
    document.addEventListener('click', onClick)
  }
  for (const root of roots) anlegen(root)
}
