// The behaviour of the "Rétegek" stacks (a standalone script: src/site/retegek-futtat.ts). It loads its own stylesheet, then moves what the page rendered: the first screen's flat cascade, the section's
// stack in perspective and the 404's stack. State is attributes (data-allapot, data-elol on a stack, data-retegek on the root); nothing persists across documents except the found trace (session storage).
// Texts come from the markup (the sheets, the header key's label), never from a second copy. Every control works by keyboard; reduced motion: one 200 ms cross-fade between the finished poses.

type Lap = 'adat' | 'szabaly' | 'felulet'
const SORREND: Lap[] = ['adat', 'szabaly', 'felulet']
const NYOM_KULCS = 'retegek-nyom'
const html = document.documentElement
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)]
const csokkentett = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const szeles = () => matchMedia('(min-width: 1024px)').matches

interface Verem {
  fajta: 'nyito' | 'szakasz' | '404'
  gyoker: HTMLElement
  /** The box the strip and the overlay are drawn in (a positioned ancestor of the stack). */
  doboz: HTMLElement
  nyitva: boolean
  elol: Lap
  zarhato: boolean
  par: string
  csik?: HTMLButtonElement
  ov?: SVGSVGElement
  figyel: number
}

const veremek: Verem[] = []
const nyom: Record<Lap, boolean> = { adat: false, szabaly: false, felulet: false }
try { Object.assign(nyom, JSON.parse(sessionStorage.getItem(NYOM_KULCS) || '{}')) } catch { /* blocked storage is not an error */ }
const mentNyom = () => { try { sessionStorage.setItem(NYOM_KULCS, JSON.stringify(nyom)) } catch { /* blocked storage is not an error */ } }
const kesz = () => SORREND.every((k) => nyom[k])

/** The sheets of a stack (the first screen has one pair of back sheets per pair: the current pair's). */
function lapok(v: Verem): Record<Lap, HTMLElement> {
  if (v.fajta === 'nyito') {
    const par = v.gyoker.getAttribute('data-par') || 'honlap'
    return { adat: $(`.rt-lap[data-s="adat"][data-p="${par}"]`, v.gyoker)!, szabaly: $(`.rt-lap[data-s="szabaly"][data-p="${par}"]`, v.gyoker)!, felulet: $('.kij', v.gyoker)! }
  }
  return { adat: $('.rt-lap[data-s="adat"]', v.gyoker)!, szabaly: $('.rt-lap[data-s="szabaly"]', v.gyoker)!, felulet: $('.rt-lap[data-s="felulet"]', v.gyoker)! }
}
/** Levels behind the front: the front 0, the two others keep their order (the earlier one is farther back). */
function szintek(elol: Lap): Record<Lap, number> {
  const t = SORREND.filter((k) => k !== elol)
  return { [elol]: 0, [t[0]!]: 2, [t[1]!]: 1 } as Record<Lap, number>
}

// ---- fitting the bodies: rows go in the ruled order (the `data-e` numbers, 1 first) until nothing is cut; each drop is logged on the sheet (data-dropped) ----
function mintakSor(p: HTMLElement, vege: number) {
  const vals = (p.dataset.mintak || '').split(' ')
  p.style.whiteSpace = 'nowrap'
  const ablak = (n: number) => Array.from({ length: n }, (_, k) => vals[(((vege - (n - 1 - k)) % vals.length) + vals.length) % vals.length]!)
  const szoveg = (n: number) => (n < vals.length ? '… ' : '') + ablak(n).map((v, i, a) => (i === a.length - 1 ? `<b>${v}</b>` : v)).join(' ')
  let n = Math.min(vals.length, 30)
  for (; n > 1; n--) { p.innerHTML = szoveg(n); if (p.scrollWidth <= p.clientWidth) break }
  p.innerHTML = szoveg(n)
  p.dataset.mutat = String(n)
}
let mintaVege = 59
/**
 * Fits one back sheet's body: rows go in the ruled order until nothing is cut, each drop is logged on the sheet (data-dropped, data-cut). A sheet that is not drawn at its full size now
 * (a head row of the flat cascade) is measured in a clone at full size, off screen, so the measuring never touches a running transition; the drops are then applied to the real sheet.
 */
function illeszt(v: Verem, lap: HTMLElement | undefined) {
  const valos = lap && $('.rt-test', lap)
  if (!lap || !valos) return
  const kozvetlen = v.fajta === 'szakasz' || (v.fajta === '404' && szeles())
  let wrap: HTMLElement | null = null
  let mer = lap
  if (!kozvetlen) {
    wrap = document.createElement('div')
    if (v.fajta === 'nyito') {
      wrap.className = 'opening'
      wrap.setAttribute('data-par', v.gyoker.getAttribute('data-par') || '')
      wrap.setAttribute('data-allapot', 'nyitva')
      wrap.style.cssText = 'position:fixed;left:-10000px;top:0;display:block;pointer-events:none'
    } else {
      wrap.className = 'rt-404'
      wrap.style.cssText = `position:fixed;left:-10000px;top:0;display:block;width:${lap.offsetWidth}px;pointer-events:none`
    }
    mer = lap.cloneNode(true) as HTMLElement
    mer.removeAttribute('inert')
    mer.removeAttribute('hidden')
    mer.setAttribute('data-rang', '2')
    for (const x of $$('[data-x]', mer)) x.removeAttribute('data-x')
    if (v.fajta === '404') wrap.appendChild(document.createElement('div')).appendChild(mer)
    else wrap.appendChild(mer)
    document.body.append(wrap)
  }
  try {
    const test = $('.rt-test', mer)!
    for (const x of $$('[data-x]', test)) x.removeAttribute('data-x')
    for (const x of $$('[data-x]', valos)) x.removeAttribute('data-x')
    for (const p of $$('[data-mintak]', valos)) mintakSor(p, mintaVege)
    if (wrap) for (const p of $$('[data-mintak]', test)) mintakSor(p, mintaVege)
    const naplo: string[] = []
    let ors = 40
    if (test.clientHeight) {
      while (test.scrollHeight > test.clientHeight + 0.5 && ors--) {
        const jel = $$('[data-e]', test).filter((e) => !e.closest('[data-x]'))
        if (!jel.length) break
        const n = Math.min(...jel.map((e) => Number(e.getAttribute('data-e'))))
        for (const e of jel.filter((q) => Number(q.getAttribute('data-e')) === n)) { naplo.push((e.textContent || '').trim().slice(0, 40)); e.setAttribute('data-x', '') }
        for (const ul of $$('ul', test)) {
          if (ul.hasAttribute('data-x') || $$('li', ul).some((l) => !l.hasAttribute('data-x'))) continue
          ul.setAttribute('data-x', '')
          const c = ul.previousElementSibling
          if (c && c.classList.contains('rt-c')) c.setAttribute('data-x', '')
        }
      }
    }
    if (wrap) {
      const m = $$('*', test)
      const r = $$('*', valos)
      m.forEach((e, i) => { if (e.hasAttribute('data-x') && r[i]) r[i]!.setAttribute('data-x', '') })
    }
    lap.dataset.dropped = naplo.join(' | ')
    lap.dataset.cut = test.clientHeight && test.scrollHeight > test.clientHeight + 0.5 ? '1' : '0'
  } finally {
    wrap?.remove()
  }
}
function illesztMind(v: Verem) {
  const L = lapok(v)
  illeszt(v, L.adat)
  illeszt(v, L.szabaly)
}

// ---- geometry helpers: a marker is a zero-size point inside a sheet; its projected position gives the route and the strip ----
const jel = (lap: HTMLElement, n: string, doboz: DOMRect): [number, number] => {
  const m = $(`:scope > .mk[data-m="${n}"]`, lap)
  if (!m) { const r = lap.getBoundingClientRect(); return [r.left - doboz.left, r.top - doboz.top] }
  const b = m.getBoundingClientRect()
  return [b.x + b.width / 2 - doboz.x, b.y + b.height / 2 - doboz.y]
}
const sp = (a: [number, number][]) => a.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('')
const NS = 'http://www.w3.org/2000/svg'

function hanyadik(v: Verem) { return v.gyoker.offsetParent !== null || v.fajta === 'nyito' }

/** The edge strip: drawn 8 px left of the rearmost sheet, the full height of the stack; its squares show the found trace. */
function csikHelye(v: Verem) {
  if (!v.csik) return
  v.csik.hidden = !hanyadik(v) || v.gyoker.hidden
  if (v.csik.hidden) return
  const d = v.doboz.getBoundingClientRect()
  const L = lapok(v)
  let tl: [number, number], bl: [number, number]
  if (v.fajta === 'nyito') {
    const kor = SORREND.map((k) => L[k]).filter((e) => e && e.getClientRects().length)
    const ts = kor.map((e) => e.getBoundingClientRect())
    const top = Math.min(...ts.map((r) => r.top)), bottom = Math.max(...ts.map((r) => r.bottom)), left = Math.min(...ts.map((r) => r.left))
    tl = [left - d.left, top - d.top]
    bl = [left - d.left, bottom - d.top]
  } else {
    const hatul = SORREND.find((k) => szintek(v.elol)[k] === (v.nyitva ? 2 : 0))!
    const elol = v.elol
    tl = jel(L[hatul], 'tl', d)
    bl = jel(L[elol], 'bl', d)
  }
  v.csik.style.left = `${tl[0] - 8 - 28}px`
  v.csik.style.top = `${tl[1]}px`
  v.csik.style.height = `${Math.max(0, bl[1] - tl[1])}px`
}

/** The red line through the sheets (3D form): from the page spine at the stack's base, right along 12 px under the front sheet, up one riser 4 px inside the stage edge, across Adat's lane right to left, through the blank gutters, across Szabály's lane left to right, a jog right of the sheets to the one green node in Felület's head. Leaders join the corners of neighbouring levels. */
function vonal(v: Verem) {
  const ov = v.ov
  if (!ov || v.gyoker.hidden) return   // the overlay is shared by the section's four stacks: only the shown one draws
  ov.replaceChildren()
  const harmas = v.fajta !== 'nyito' && (v.fajta === 'szakasz' || szeles())
  if (!v.nyitva || !harmas || !hanyadik(v)) return
  const d = v.doboz.getBoundingClientRect()
  if (!d.width) return
  const L = lapok(v)
  const lv = szintek(v.elol)
  const P = (k: Lap, n: string) => jel(L[k], n, d)
  const elol = v.elol
  const fbl = P(elol, 'bl'), fbr = P(elol, 'br'), ftr = P(elol, 'tr')
  const yh = Math.max(fbl[1], fbr[1]) + 12
  const XR = d.width - 4
  const A = { l: P('adat', 'l'), r: P('adat', 'r') }, Sz = { l: P('szabaly', 'l'), r: P('szabaly', 'r') }, F = P('felulet', 'nd')
  const hibaOldal = v.fajta === '404'
  const lane = $('.hdr .lane')
  const x0 = v.fajta === 'szakasz' && lane ? lane.getBoundingClientRect().left + lane.getBoundingClientRect().width / 2 - d.left : XR - 24
  const xj = ftr[0] + 8
  const sarok: [number, number] = lv.szabaly < lv.adat ? [A.l[0], Sz.l[1]] : [Sz.l[0], A.l[1]]
  const utak: [number, number][][] = [
    [[x0, yh], [XR, yh], [XR, A.r[1]], A.r],
    [A.l, sarok, Sz.l],
    ...(hibaOldal ? [] : [[Sz.r, [xj, Sz.r[1]], [xj, F[1]], F] as [number, number][]]),
  ]
  const rajz = (cls: string, pts: [number, number][]) => {
    const p = document.createElementNS(NS, 'path')
    p.setAttribute('class', cls + (cls.includes('dr') && v.gyoker.hasAttribute('data-rajz') ? ' go' : ''))
    p.setAttribute('d', sp(pts))
    p.setAttribute('pathLength', '1')
    ov.append(p)
  }
  for (const u of utak) rajz('rp dr', u)
  const by = SORREND.slice().sort((a, b) => lv[a] - lv[b])
  for (let n = 0; n < 2; n++) for (const m of ['tr', 'bl']) rajz('ld dr', [P(by[n]!, m), P(by[n + 1]!, m)])
}

let raf = 0
let ameddig = 0
function kovet(ms: number) {
  ameddig = performance.now() + ms
  if (raf) return
  const lepes = () => {
    for (const v of veremek) { csikHelye(v); vonal(v) }
    raf = performance.now() < ameddig ? requestAnimationFrame(lepes) : 0
  }
  raf = requestAnimationFrame(lepes)
}
const ujra = (v?: Verem) => { for (const q of v ? [v] : veremek) { csikHelye(q); vonal(q) } }

// ---- state ----
const huzal = (a: HTMLAnchorElement) => {
  const h = a.getAttribute('data-cel')
  if (h && !a.getAttribute('href')) a.setAttribute('href', h)
  if (a.hasAttribute('data-rt-erdeklodes') || a.closest('.kij')) a.setAttribute('data-esemeny', 'email')   // the earned mail link reports like the other mail links, once it exists
}
function csikFrissit() {
  for (const v of veremek) {
    if (!v.csik) continue
    $$('b', v.csik).forEach((b, i) => { if (nyom[SORREND[i]!]) b.setAttribute('data-f', ''); else b.removeAttribute('data-f') })
  }
  for (const v of veremek) {
    for (const a of $$<HTMLAnchorElement>('[data-rt-erdeklodes]', v.gyoker)) { a.hidden = !kesz(); if (kesz()) huzal(a) }
    if (v.fajta === 'nyito') { const a = $<HTMLAnchorElement>('.kij .rt-lab a', v.gyoker); if (a) { a.hidden = !kesz(); if (kesz()) huzal(a) } }
  }
}

function alkalmaz(v: Verem, o: { azonnal?: boolean } = {}) {
  const L = lapok(v)
  const lv = szintek(v.elol)
  const r = csokkentett()
  if (r && !o.azonnal) { v.gyoker.classList.add('rm'); setTimeout(() => v.gyoker.classList.remove('rm'), 260) }
  if (o.azonnal) v.gyoker.classList.add('rt-nt')
  if (v.fajta === 'nyito' && v.nyitva) v.gyoker.setAttribute('data-vz', '')
  v.gyoker.setAttribute('data-allapot', v.nyitva ? 'nyitva' : 'zart')
  v.gyoker.setAttribute('data-elol', v.elol)
  if (v.fajta === 'nyito') { v.gyoker.setAttribute('data-par', v.par = v.gyoker.getAttribute('data-par') || 'honlap'); html.setAttribute('data-retegek', v.nyitva ? 'nyitva' : 'zart') }
  const ranges = SORREND.filter((k) => k !== v.elol)
  for (const k of SORREND) {
    const e = L[k]
    if (!e) continue
    e.style.setProperty('--n', v.nyitva ? String(lv[k]) : '0')
    if (v.nyitva) e.setAttribute('data-rang', String(k === v.elol ? 2 : ranges.indexOf(k)))
    else e.removeAttribute('data-rang')
    if (k !== 'felulet') e.toggleAttribute('inert', !v.nyitva)
    const nev = $<HTMLButtonElement>('[data-rt-nev]', e)
    if (nev) { nev.disabled = !v.nyitva || k === v.elol; nev.tabIndex = nev.disabled ? -1 : 0 }
    if (k === 'felulet' && v.fajta === 'nyito') {
      if (v.nyitva) { e.setAttribute('role', 'group'); e.setAttribute('aria-label', $('.rt-nev', e)?.textContent || 'Felület') } else { e.removeAttribute('role'); e.removeAttribute('aria-label') }
    }
    const a = $('.rt-lab a', e)
    if (a && k === 'adat') (a as HTMLElement).tabIndex = v.nyitva ? 0 : -1
  }
  if (v.csik) {
    v.csik.setAttribute('aria-expanded', String(v.nyitva))
    const ae = document.activeElement
    if (!v.nyitva && ae && (L.adat?.contains(ae) || L.szabaly?.contains(ae))) v.csik.focus()
  }
  if (v.fajta === 'nyito') { const k = $<HTMLButtonElement>('[data-rt-kulcs]'); if (k) k.setAttribute('aria-checked', String(v.nyitva)) }
  if (v.nyitva) { v.gyoker.setAttribute('data-rajz', ''); illesztMind(v) } else v.gyoker.removeAttribute('data-rajz')
  for (const a of $$<HTMLAnchorElement>('.rt-lab a[data-cel]:not([data-rt-erdeklodes])', v.gyoker)) { if (v.nyitva && v.elol === 'adat') huzal(a); else a.removeAttribute('href') }
  csikFrissit()
  ujra(v)
  kovet(o.azonnal ? 80 : 1200)
  if (o.azonnal) requestAnimationFrame(() => requestAnimationFrame(() => v.gyoker.classList.remove('rt-nt')))
}

function nyit(v: Verem, nyitva: boolean, o: { azonnal?: boolean } = {}) {
  if (v.nyitva === nyitva) return
  if (!nyitva && !v.zarhato) return
  if (v.fajta === 'nyito') megjelen(v, nyitva)
  v.nyitva = nyitva
  if (!nyitva) v.elol = 'felulet'
  alkalmaz(v, o)
}

/** The first screen's back sheets are not rendered while it is closed: they are shown a frame before the open state turns (so the travel runs) and taken away when the close has ended. */
let elrejt = 0
function megjelen(v: Verem, nyitva: boolean) {
  clearTimeout(elrejt)
  if (nyitva) { v.gyoker.setAttribute('data-vz', ''); void v.gyoker.offsetHeight }
  else elrejt = window.setTimeout(() => { if (!v.nyitva) v.gyoker.removeAttribute('data-vz') }, 500)
}

function elore(v: Verem, k: Lap, felhasznalo: boolean) {
  if (!v.nyitva || v.elol === k) return
  const volt = v.elol
  v.elol = k
  if (felhasznalo) { nyom[k] = true; mentNyom() }
  void volt
  alkalmaz(v)
}

function csikot(v: Verem, szoveg: string) {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'rt-sz'
  b.setAttribute('aria-expanded', 'false')
  if (!v.gyoker.id) v.gyoker.id = 'rt-' + veremek.length
  b.setAttribute('aria-controls', v.gyoker.id)
  b.setAttribute('aria-label', szoveg)
  b.innerHTML = '<i></i><i></i><i></i><b></b><b></b><b></b>'
  b.addEventListener('click', () => nyit(v, !v.nyitva))
  v.doboz.append(b)
  v.csik = b
}

function inditVerem(gyoker: HTMLElement, fajta: Verem['fajta']): Verem {
  const doboz = fajta === 'nyito' ? $('.in', gyoker)! : (gyoker.closest('[data-rt-st]') as HTMLElement) || gyoker.parentElement!
  const v: Verem = { fajta, gyoker, doboz, nyitva: fajta === '404', elol: 'felulet', zarhato: fajta !== '404', par: gyoker.getAttribute('data-par') || '', figyel: 0 }
  veremek.push(v)
  if (v.zarhato) {
    const cimke = $('.kij-cimke', gyoker)?.textContent || $('[data-rt-par][aria-checked="true"]')?.textContent || ''
    const elojel = $('[data-rt-kulcs] .tk-l')?.textContent || 'Szétszedve'
    csikot(v, `${elojel}: ${cimke}`.trim())
  }
  v.ov = fajta === 'nyito' ? undefined : ((gyoker.closest('[data-rt-st]')?.querySelector('.rt-ov') as SVGSVGElement | null) ?? undefined)
  return v
}

export function start(cssUrl: string) {
  if (!$('.opening') && !$('[data-rt]')) return
  // The sheet is asked for at once (it is in before the page's own sequence ends, so its arrival moves nothing in the middle of it); the stacks start when the sheet is in and the page's own
  // chunk (the home chunk or the frame's script) has set jel-kesz: a page whose chunk failed is left exactly as the server rendered it.
  let loaded = false
  let started = false
  const go = () => {
    if (started || !loaded || !html.classList.contains('jel-kesz')) return
    started = true
    mo.disconnect()
    try { init($('.opening'), $$('[data-rt="szakasz"]'), $$('[data-rt="404"]')) } catch { html.classList.remove('rt-kesz') }
  }
  const mo = new MutationObserver(go)
  mo.observe(html, { attributes: true, attributeFilter: ['class'] })
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = cssUrl
  l.addEventListener('error', () => html.classList.add('rt-nincs'))
  l.addEventListener('load', () => { loaded = true; go() })
  document.head.append(l)
}

function init(nyito: HTMLElement | null, szakasz: HTMLElement[], hiba: HTMLElement[]) {
  html.classList.add('rt-kesz')
  const kulcs = $<HTMLButtonElement>('[data-rt-kulcs]')
  const n = nyito && $('[data-kij]', nyito) ? inditVerem(nyito, 'nyito') : null
  const sz = szakasz.map((g) => inditVerem(g, 'szakasz'))
  const h = hiba.map((g) => inditVerem(g, '404'))
  // the 404's Adat row: the requested path only (never the query or the hash), as text, at most 120 characters
  for (const g of hiba) {
    const sor = $('[data-rt-cim-sor]', g)
    const c = $('[data-rt-cim]', g)
    if (!sor || !c) continue
    const p = location.pathname
    c.textContent = p.length > 120 ? p.slice(0, 120) + '…' : p
    sor.hidden = false
  }
  // a lap's name is a button once the stack is open and the sheet is not in front
  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-rt-nev]')
    if (!b || b.disabled) return
    const g = b.closest('[data-rt], .opening')
    const v = veremek.find((q) => q.gyoker === g)
    if (v) elore(v, b.getAttribute('data-rt-nev') as Lap, true)
  })
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    const g = (e.target as Element).closest?.('[data-rt], .opening')
    const v = veremek.find((q) => q.gyoker === g)
    if (v && v.nyitva && v.zarhato) { nyit(v, false); v.csik?.focus() }
  })
  if (kulcs && n) {
    kulcs.disabled = false
    kulcs.addEventListener('click', () => nyit(n, !n.nyitva))
  }
  if (n) {
    n.gyoker.setAttribute('data-allapot', 'zart')
    // a pair change on the first screen keeps the open state and brings the screen to the front
    new MutationObserver(() => { if (n.gyoker.getAttribute('data-par') !== n.par) { n.elol = 'felulet'; alkalmaz(n, { azonnal: true }); kesleltetettHref(n) } }).observe(n.gyoker, { attributes: true, attributeFilter: ['data-par'] })
    kesleltetettHref(n)
    // the live Gépadat reading and samples (the first screen's clock): Adat's temperature row, Szabály's head and its row follow the same sample
    n.gyoker.addEventListener('rt:olv', (e) => {
      const d = (e as CustomEvent<{ idx: number; txt: string }>).detail
      mintaVege = d.idx
      for (const lap of $$('.rt-lap[data-p="gepadat"]', n.gyoker)) {
        for (const o of $$('[data-rt-olv]', lap)) o.textContent = d.txt
        for (const p of $$('[data-mintak]', lap)) mintakSor(p, mintaVege)
      }
    })
  }
  // the section: the pair keys, the caption, taking apart once when half in view
  const keys = $$<HTMLButtonElement>('[data-rt-par]')
  const leir = $('[data-rt-leir]')
  const mutat = (par: string) => {
    const regi = sz.find((q) => !q.gyoker.hidden)
    for (const q of sz) q.gyoker.hidden = q.gyoker.getAttribute('data-par') !== par
    const uj = sz.find((q) => q.gyoker.getAttribute('data-par') === par)!
    for (const k of keys) { const be = k.getAttribute('data-rt-par') === par; k.setAttribute('aria-checked', String(be)); k.tabIndex = be ? 0 : -1 }
    const k = keys.find((q) => q.getAttribute('data-rt-par') === par)
    if (leir && k) leir.textContent = k.getAttribute('data-ro')
    if (regi && regi !== uj) { uj.nyitva = regi.nyitva; uj.elol = 'felulet'; alkalmaz(uj, { azonnal: true }) }
  }
  for (const k of keys) {
    k.disabled = false
    k.addEventListener('click', () => mutat(k.getAttribute('data-rt-par')!))
    k.addEventListener('keydown', (e) => {
      const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key]
      if (!d) return
      e.preventDefault()
      const i = keys.indexOf(k)
      const nk = keys[(i + d + keys.length) % keys.length]!
      mutat(nk.getAttribute('data-rt-par')!)
      nk.focus()
    })
  }
  for (const q of sz) alkalmaz(q, { azonnal: true })
  for (const q of h) alkalmaz(q, { azonnal: true })
  if (n) alkalmaz(n, { azonnal: true })
  // once, when half of the stage is in view (reduced motion: it arrives apart)
  const stage = $('[data-rt-st]')
  if (stage && sz.length) {
    const aktiv = () => sz.find((q) => !q.gyoker.hidden)!
    if (csokkentett()) { for (const q of sz) nyit(q, true, { azonnal: true }) }
    else if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (!es[0]!.isIntersecting) return
        io.disconnect()
        for (const q of sz) if (q === aktiv()) nyit(q, true); else { q.nyitva = true; alkalmaz(q, { azonnal: true }) }
      }, { threshold: 0.5 })
      io.observe(stage)
    } else for (const q of sz) nyit(q, true, { azonnal: true })
  }
  const szel = new Map<Verem, number>()
  const ro2 = new ResizeObserver((es) => {
    for (const e of es) {
      const v = veremek.find((q) => (q.fajta === 'nyito' ? q.gyoker : q.doboz) === e.target)
      if (!v) continue
      const w = Math.round(e.contentRect.width)
      if (szel.get(v) === w) continue
      szel.set(v, w)
      illesztMind(v)
      ujra(v)
    }
  })
  for (const v of veremek) ro2.observe(v.fajta === 'nyito' ? v.gyoker : v.doboz)
  if (document.fonts?.ready) document.fonts.ready.then(() => { for (const v of veremek) { illesztMind(v); ujra(v) } })
  addEventListener('resize', () => ujra())
  csikFrissit()
}

/** The earned link of the first screen's Felület follows the pair (its mail names that work: data-rt-erd on the key). */
function kesleltetettHref(v: Verem) {
  const par = v.gyoker.getAttribute('data-par')
  const k = $(`.key-gomb[data-p="${par}"]`, v.gyoker)
  const a = $<HTMLAnchorElement>('.kij .rt-lab a', v.gyoker)
  const h = k?.getAttribute('data-rt-erd')
  if (a && h) { a.setAttribute('data-cel', h); if (a.getAttribute('href')) a.setAttribute('href', h) }
}
