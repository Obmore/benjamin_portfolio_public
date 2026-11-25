// The first screen's behaviour (the browser chunk): the four keys choose a pair (source, screen, trace); the overlay draws the subline's tap and node, the source's
// tap, the pair's trace with its sampled last stretch, the turn into the screen's terminal; run / stop holds the live pairs' samples. Texts come from the page's own DOM
// (data-* of the keys), never from a second copy. Motion: 20 1.4 (arrival within 1200 ms of the key); reduced motion: complete, a 150 to 200 ms cross-fade.
import { JL } from './core.ts'
import { CNC1_HOMERSEKLET, HOM_UTOLSO, fmt, homAblak, homIdo, homTrend, homU, nyomPontok, savPontok, utLeiras, type NyomFajta } from './jelalak.ts'

type Par = 'honlap' | 'rendeles' | 'gepkonyv' | 'gepadat'
const PAROK: Par[] = ['honlap', 'rendeles', 'gepkonyv', 'gepadat']
const JEL_FAJTA: Record<Par, NyomFajta> = { honlap: 'speech', rendeles: 'panel', gepkonyv: 'qr', gepadat: 'temp' }
const STEP = 12
const TICK_MS = 800

interface Pt { x: number; y: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const L: any = JL

export function nyitas(el: HTMLElement, opt: { laneX: () => number }) {
  const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = el) => r.querySelector<T>(s)
  const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = el) => [...r.querySelectorAll<T>(s)]
  const E = L.E
  const inn = $('.in')!
  const sub = $('.sub')!
  const sav = $('.sav')!
  const term = $('.term')!
  const keys = $$<HTMLButtonElement>('.key-gomb')
  const runbtn = $<HTMLButtonElement>('.runbtn')
  const runlbl = $('.runlbl')
  const ro = $('.readout')!
  const olv = $('.reading')!
  const fejOlv = $('.kij-olv')!
  const homCellak = $$('[data-hom]')
  const trend = $<SVGPathElement>('[data-trend]')
  const svg = L.mkEl('svg', { 'aria-hidden': 'true', class: 'opn-svg' }, inn) as SVGSVGElement
  const htmlEl = document.documentElement

  const S = { sweepE: null as number | null, par: 'honlap' as Par, run: true, vis: true, probe: false, win: null as { v: number[]; xa: number; p: number } | null, idx: HOM_UTOLSO, px: 0, arrived: true, loading: false, target: 'honlap' as Par, endY: 0, timer: 0 as number | undefined, busy: null as { stop: () => void } | null }
  const T = { clear: () => {} }
  let timers: number[] = []
  T.clear = () => { timers.forEach((id) => L.cancel(id)); timers = [] }
  const at = (ms: number, fn: () => void) => { timers.push(L.later(fn, ms)) }

  /** Layout numbers of the current width, read once per layout. */
  let G: ReturnType<typeof bandGeom> | null = null
  let pair: { g: SVGGElement; path: SVGPathElement; ticks: SVGPathElement; tap: SVGPathElement; ent: SVGRectElement } | null = null
  let fix: { tap: SVGPathElement; node: SVGCircleElement } | null = null
  let sw: { path: SVGPathElement; tb: unknown; heat: unknown } | null = null

  const rel = (r: DOMRect) => { const ir = inn.getBoundingClientRect(); return { l: r.left - ir.left, t: r.top - ir.top, r: r.right - ir.left, b: r.bottom - ir.top } }
  /** The first screen's durations and the ring easing are custom properties of the root (nyito.css); these are the numbers the sequence was approved with, used when a property is missing. */
  const DUR = { key: 60, pause: 120, swap: 180, trace: 480, term: 240, sweep: 900 }
  /** A duration property in ms (the build may write 120ms as .12s: both units are read). */
  const dur = (k: keyof typeof DUR): number => {
    const t = getComputedStyle(el).getPropertyValue('--t-' + k).trim()
    const v = parseFloat(t) * (/[0-9.]s$/.test(t) ? 1000 : 1)
    return Number.isFinite(v) ? v : DUR[k]
  }
  const RING = 'linear(0, 0.72 15%, 1.16 30%, 1.02 45%, 0.95 58%, 1.01 75%, 1)'
  const ring = () => getComputedStyle(el).getPropertyValue('--e-ring').trim() || RING
  const narrow = () => L.narrow()
  const red = () => L.reduced()

  /** The first letter of the subline: the node stands 12 px left of it (on the lane itself on a phone), on the first line's x-height. */
  function subNode(): Pt & { lane: number } {
    const ir = inn.getBoundingClientRect()
    const lane = opt.laneX() - ir.left
    const b = $('b', sub)!
    const tn = b.firstChild as Text
    const rg = document.createRange()
    rg.setStart(tn, 0)
    rg.setEnd(tn, 1)
    const r = rg.getBoundingClientRect()
    const x = narrow() ? lane : r.left - ir.left - 12 - 6
    return { x, y: r.top - ir.top + r.height * 0.58, lane }
  }

  /** The y (inner box coordinates) of the three nodes the lane carries in the first screen: the subline's, the source's, the band's baseline. */
  function taps(): number[] {
    if (!G) layout()
    const sn = subNode()
    const sp = $('.sp:not([hidden])') || $('.sp')!
    return [sn.y, srcY(sp), G!.low]
  }
  function srcY(sp: HTMLElement): number {
    const f = $('.adl-fej', sp)
    const r = rel((f ?? sp).getBoundingClientRect())
    if (f) return (r.t + r.b) / 2
    const q = rel(sp.getBoundingClientRect())
    return q.t + (narrow() ? 17 : 24)
  }

  function termPt(): Pt {
    const r = rel(term.getBoundingClientRect())
    return { x: (r.l + r.r) / 2, y: (r.t + r.b) / 2 }
  }

  const ns = 'http://www.w3.org/2000/svg'
  function mk(tag: string, attrs: Record<string, string | number>, parent: Element) {
    const e = document.createElementNS(ns, tag)
    for (const k in attrs) e.setAttribute(k, String(attrs[k]))
    parent.appendChild(e)
    return e
  }

  /** Number of held steps and the held stretch's start, from the layout. */
  function bandGeom() {
    const ir = inn.getBoundingClientRect()
    const br = sav.getBoundingClientRect()
    const H = br.height
    const low = br.top - ir.top + (H > 200 ? H - 30 : H - 14)
    const tp = termPt()
    const lane = opt.laneX() - ir.left
    const xa = lane + 24
    const x1 = tp.x
    const xs = x1 - Math.min(220, 0.3 * (x1 - xa))
    return { H, low, x0: -ir.left, xa, x1, xs, termY: tp.y, lane, narrow: narrow(), band: br }
  }

  /** The tallest feature of the pair's trace in px: the speech band is quiet (40 px at most, 32 on a phone), the others as they were. */
  function ampOf(par: Par, g: ReturnType<typeof bandGeom>) { return par === 'honlap' ? (g.H > 200 ? 40 : 32) : (g.H > 200 ? 56 : 44) + (par === 'gepadat' ? 28 : 0) }

  /** The trace of the pair up to the held stretch. The speech, order and QR traces are the works' own; the Gépadat trace is the first m samples of the band's one window, each at the middle of its slot (the first one from the lane's x), on the one mapping homY. */
  function shape(par: Par, g: ReturnType<typeof bandGeom>, gd: { m: number; N: number; p: number; win: number[] } | null): [number, number][] {
    if (gd) {
      const { m, N, p, win } = gd
      const t: [number, number][] = []
      if (m > 0) t.push([g.xa, homY(win[0]!, g)])
      for (let i = 0; i < m; i++) t.push([g.xa + (i + 0.5) * p, homY(win[i]!, g)])
      t.push([g.x1, homY(win[N - 1]!, g)])   // the end of the window (the held stretch's own steps are drawn by savPontok)
      return [[g.x0, g.low], [g.xa, g.low], ...t]
    }
    const amp = ampOf(par, g)
    const W = g.x1 - g.xa
    const n = nyomPontok(JEL_FAJTA[par], g.xa, W, g.H, { low: g.H > 200 ? g.H - 30 : g.H - 14, high: (g.H > 200 ? g.H - 30 : g.H - 14) - amp, ...(par === 'honlap' ? { mute: Math.round(0.23 * W) } : {}) })
    const dy = g.low - (g.H > 200 ? g.H - 30 : g.H - 14)
    const pts = n.pts.map(([x, y]) => [x, y + dy] as [number, number])
    return [[g.x0, g.low], [g.xa, g.low], ...pts]
  }

  /** The one scale of the temperature on the band: the hour's lowest sample (50,7 degC) on the lane's level, its highest (53,1 degC) ampOf px above it. The band, the probe and the reading all use it. */
  const homY = (t: number, g: ReturnType<typeof bandGeom>) => g.low - homU(t) * ampOf('gepadat', g)

  /** The path of the band with its turn: the trace up to the held stretch, the held stretch, a 6 px corner, the drop or rise to the terminal. The Gépadat band is one window of the demo's hour on one time base (homIdo): its first m samples are the trace, its last n the held steps, so it reads as one series that ends at the current sample. */
  function bandPath(par: Par, g: ReturnType<typeof bandGeom>) {
    let s: ReturnType<typeof savPontok>
    if (par === 'gepadat') {
      const b = homIdo(g.xa, g.x1, g.x1 - g.xs, STEP)
      const win = homAblak(S.idx, b.N)
      S.win = { v: win, xa: g.xa, p: b.p }
      s = savPontok(shape(par, g, { ...b, win }), b.xs, g.x1, b.p, undefined, (k) => homY(win[b.m + k]!, g))
    } else {
      // the held levels at rest: stepped, ending on the rest value (the last one is the reading); the levels are those of the pair's own trace, the page adds no noise
      s = savPontok(shape(par, g, null), g.xs, g.x1, STEP)
    }
    S.endY = s.endY
    const up = g.termY < s.endY
    const dir = up ? -1 : 1
    let d = utLeiras(s.pts)
    // the last held level runs on to x1; the corner turns toward the terminal
    d += `L${(g.x1 - 6).toFixed(1)} ${s.endY.toFixed(1)}Q${g.x1.toFixed(1)} ${s.endY.toFixed(1)} ${g.x1.toFixed(1)} ${(s.endY + dir * 6).toFixed(1)}L${g.x1.toFixed(1)} ${g.termY.toFixed(1)}`
    // the ticks stand 8 px under the level they sample: under the held steps of the temperature trace, under the baseline on the others (whose levels are the baseline)
    const ticks = s.ticks.map((x, k) => `M${x.toFixed(1)} ${((par === 'gepadat' ? s.levels[k]! : g.low) + 8).toFixed(1)}v8`).join('')
    return { d, ticks, endY: s.endY }
  }

  function build(par: Par) {
    const g = G!
    const grp = mk('g', { 'data-p': par }, svg) as SVGGElement
    const sp = $(`.sp[data-p="${par}"]`)!
    // the source's tap: from the lane to the panel's (or the device's) left edge, level at the head row's centre
    const wasHidden = sp.hidden
    if (wasHidden) sp.hidden = false
    const q = rel(sp.getBoundingClientRect())
    const y = srcY(sp)
    const dev = par === 'gepadat'
    const xe = dev ? q.l : q.l - 9.5
    const ph = mk('path', { class: 'ln pen-r', d: `M${g.lane} ${y.toFixed(1)}H${xe.toFixed(1)}` }, grp) as SVGPathElement
    const ent = mk('rect', { class: dev ? 'ent' : 'ent ent-off', x: (xe - 8).toFixed(1), y: (y - 4).toFixed(1), width: 8, height: 8 }, grp) as SVGRectElement
    if (wasHidden) sp.hidden = true
    const b = bandPath(par, g)
    const path = mk('path', { class: 'ln pen-r band-ut', d: b.d }, grp) as SVGPathElement
    const ticks = mk('path', { class: 'tk', d: b.ticks }, grp) as SVGPathElement
    return { g: grp, path, ticks, tap: ph, ent }
  }

  function layout() {
    const g = bandGeom()
    G = g
    while (svg.firstChild) svg.removeChild(svg.firstChild)
    probeEls = null
    S.win = null   // rebuilt by the next bandPath
    svg.setAttribute('width', String(inn.clientWidth))
    svg.setAttribute('height', String(inn.clientHeight))
    const sn = subNode()
    const tap = mk('path', { class: 'ln pen-r', d: `M${sn.lane.toFixed(1)} ${sn.y.toFixed(1)}H${sn.x.toFixed(1)}` }, svg) as SVGPathElement
    const node = mk('circle', { class: 'sn', cx: sn.x.toFixed(1), cy: sn.y.toFixed(1), r: 6 }, svg) as SVGCircleElement
    fix = { tap, node }
    pair = build(S.par)
    sw = null
    htmlEl.classList.add('jel-hullam')   // the drawn band stands in for the frozen one of the page without script
    if (S.probe) { S.probe = false }
    paintValue()
    setArrived(S.arrived, true)
    if (S.sweepE !== null) applySweep(S.sweepE)   // a relayout during the load sweep carries on from where the trace was
  }

  /** The load sweep's state on the current path: the drawn part and the hot head behind its end (a quarter of the band's width, 240 px at most). */
  function applySweep(e: number) {
    if (!pair || !G) return
    if (!sw || sw.path !== pair.path) sw = { path: pair.path, tb: L.table(pair.path, 'x'), heat: L.heat(svg, pair.path) }
    const tb = sw.tb as { L: number }
    sav.style.setProperty('--sweep', e.toFixed(4))   // the band's progress, for anything that wants to follow the sweep
    L.setDash(pair.path, tb, tb.L * e)
    L.heatSet(sw.heat, tb.L, tb.L * e, Math.min(240, G.band.width * 0.25), e)
  }

  /** The pair at rest: the trace whole and unscaled, the ticks shown, one group in the drawing, the terminal lit and at its size. */
  function settle() {
    if (pair) {
      pair.path.style.transform = ''
      pair.ticks.style.opacity = '1'
      pair.g.style.opacity = ''
      pair.g.style.transition = ''
      for (const g of [...svg.children]) if (g.tagName === 'g' && g !== pair.g) g.parentNode?.removeChild(g)
    }
    term.style.transform = ''
    setArrived(true, true)
  }

  /** The end state of the load sequence, in one place: the trace whole (dashes and hot head done), the taps shown, the terminal on, the clock running, html.jel-vege. The sweep's own end, a key pressed during it and a runtime motion change all come here. */
  function finishLoad() {
    if (!S.loading) return
    S.loading = false
    if (S.sweepE !== null) { applySweep(1); S.sweepE = null }
    sav.style.setProperty('--sweep', '1')
    if (pair) {
      const p = pair.path
      p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.opacity = ''
      for (const e of [pair.tap, pair.ent, fix?.tap, fix?.node]) if (e) { e.style.opacity = ''; e.style.transition = '' }
    }
    settle()
    startClock()
    htmlEl.classList.add('jel-vege')
  }

  function setArrived(on: boolean, instant?: boolean) {
    S.arrived = on
    term.classList.toggle('on', on)
    if (!instant) term.getBoundingClientRect()
  }

  /** The live value of the Gépadat pair: the demo's own sample at the clock's index (51,6 at rest), the same number in the screen's head, the readout row, the card's cell and the trend. */
  function homerseklet(): number { return CNC1_HOMERSEKLET[S.idx]! }
  function paintValue() {
    if (S.par !== 'gepadat') return
    const txt = fmt(homerseklet()) + ' °C'
    fejOlv.textContent = txt
    if (!S.probe) olv.textContent = txt   // the pointer's reading is not overwritten by a sample
    homCellak.forEach((c) => { c.textContent = txt })
    el.dispatchEvent(new CustomEvent('rt:olv', { detail: { idx: S.idx, txt } }))   // the stacks' Szabály head and samples follow the same sample
    if (trend) trend.setAttribute('d', homTrend(homAblak(S.idx, 24)))
  }

  /** The probe (Gépadat only: the one trace whose points are values with a unit): a vertical cursor, a dot and the value of the sample under the pointer in the reading. The pointer snaps to the middle of the nearest sample's slot, so the probe only ever reads one of the demo's own values. `x` is in the first screen's inner box (it stays right when the page scrolls). */
  let probeEls: { line: SVGPathElement; dot: SVGCircleElement } | null = null
  function probeAt(x: number) {
    if (!G || !pair || !S.win || S.par !== 'gepadat') return
    const { v, xa, p } = S.win
    const j = Math.max(0, Math.min(v.length - 1, Math.floor((x - xa) / p)))
    const cx = xa + (j + 0.5) * p
    const y = homY(v[j]!, G)
    if (!probeEls) {
      const line = mk('path', { class: 'probe-l', d: '' }, svg) as SVGPathElement
      const dot = mk('circle', { class: 'probe-d', r: 5 }, svg) as SVGCircleElement
      probeEls = { line, dot }
    }
    probeEls.line.setAttribute('d', `M${cx.toFixed(1)} ${(G.low - 110).toFixed(1)}V${(G.low + 22).toFixed(1)}`)
    probeEls.dot.setAttribute('cx', cx.toFixed(1))
    probeEls.dot.setAttribute('cy', y.toFixed(1))
    probeEls.line.style.opacity = probeEls.dot.style.opacity = '1'
    S.probe = true
    S.px = x
    olv.textContent = fmt(v[j]!) + ' °C'
  }
  function probeOff() {
    if (probeEls) probeEls.line.style.opacity = probeEls.dot.style.opacity = '0'
    if (!S.probe) return
    S.probe = false
    paintValue()
  }
  sav.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch' && !red()) probeAt(e.clientX - inn.getBoundingClientRect().left) }, { passive: true, signal: L.sig })
  sav.addEventListener('pointerleave', () => probeOff(), { signal: L.sig })
  window.addEventListener('scroll', () => { if (S.probe) probeOff() }, { passive: true, signal: L.sig })   // the page moved under a resting pointer: it is no longer over the band
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { S.vis = es[0]!.isIntersecting })
    io.observe(sav)
    L.sig.addEventListener('abort', () => io.disconnect())
  }

  function rePath() {
    if (!G || !pair) return
    const b = bandPath(S.par, G)
    pair.path.setAttribute('d', b.d)
    pair.ticks.setAttribute('d', b.ticks)
    if (S.probe) probeAt(S.px)   // a resting pointer follows the moving trace: its dot and reading are of the new sample
  }

  /** One sample: the Gépadat window moves one slot (the only live pair). */
  function sample() {
    if (!S.run || !S.vis || red() || !G) return
    if (S.par !== 'gepadat') return   // only the Gépadat band moves: the other pairs hold their own true shapes
    S.idx = (S.idx + 1) % CNC1_HOMERSEKLET.length   // the demo's next value, no noise of the page's own
    rePath()
    paintValue()
  }
  function startClock() {
    stopClock()
    if (red()) return
    S.timer = window.setInterval(() => { if (!L.dead) sample() }, TICK_MS)
  }
  function stopClock() { if (S.timer) { clearInterval(S.timer); S.timer = undefined } }
  L.sig.addEventListener('abort', stopClock)

  function showPair(par: Par) {
    S.par = par
    S.target = par
    S.win = null   // the old pair's window is not read by a pointer before the rebuild
    S.probe = false   // the probe belongs to the pair it was drawn on
    if (probeEls) probeEls.line.style.opacity = probeEls.dot.style.opacity = '0'
    el.setAttribute('data-par', par)
    runLabel()
    for (const sp of $$('.sp')) sp.hidden = sp.getAttribute('data-p') !== par
    for (const kp of $$('.kp')) kp.hidden = kp.getAttribute('data-p') !== par
    for (const k of keys) {
      const on = k.getAttribute('data-p') === par
      k.setAttribute('aria-checked', on ? 'true' : 'false')
      k.tabIndex = on ? 0 : -1
    }
    const k = keys.find((q) => q.getAttribute('data-p') === par)!
    ro.textContent = k.getAttribute('data-ro')
    olv.textContent = k.getAttribute('data-olv')
    fejOlv.textContent = k.getAttribute('data-fej-olv')
    S.idx = HOM_UTOLSO   // a pair starts at its rest reading
    // the Gépadat device's lamps: the question first, the answer 120 ms later
    for (const l of $$('.lmp')) l.classList.remove('on')
    if (par === 'gepadat') {
      const kerd = $('.sp-gd .lmp[data-l="kerd"]', el) as Element | null
      const val = $('.sp-gd .lmp[data-l="val"]', el) as Element | null
      $$('.sp-gd .lmp').forEach((l) => { if (l === kerd || red()) l.classList.add('on') })
      if (!red() && val) at(120, () => { $$('.sp-gd .lmp[data-l="val"]').forEach((l) => l.classList.add('on')) })
    }
  }

  /** Choose a pair. Arrival (20 1.4): key 60 ms, pause 120 ms, source exchanged 180 ms, trace swap 480 ms rc, terminal settles 240 ms rc, screen redraws 240 ms steps(12): within 1200 ms of the key. */
  function select(par: Par, o: { instant?: boolean } = {}) {
    if (par === S.target && pair && !o.instant) { finishLoad(); return }   // already there (a key pressed during the load sweep still ends the load), or on its way (the queued swap is the target, not S.par)
    T.clear()
    if (S.busy) { S.busy.stop(); S.busy = null }
    finishLoad()   // a key pressed during the load sequence ends it: the end state is whole, then the key's own arrival runs
    for (const q of keys) q.style.transform = ''
    term.style.transform = ''
    if (par === S.par && pair && !o.instant) {
      // back to the pair on the screen while a swap to another one was queued or running: the queued swap is dropped, the pair stands whole
      S.target = par
      settle()
      if (par === 'gepadat') $$('.sp-gd .lmp').forEach((l) => l.classList.add('on'))
      startClock()
      return
    }
    S.target = par
    const prev = pair
    const r = red()
    if (!o.instant && !r) {
      const k = keys.find((q) => q.getAttribute('data-p') === par)!
      k.style.transform = 'translateY(2px)'
      at(dur('key'), () => { k.style.transform = '' })
    }
    const swap = () => {
      showPair(par)
      if (!G) G = bandGeom()
      pair = build(par)
      const cur = pair
      if (o.instant) { if (prev) prev.g.parentNode?.removeChild(prev.g); return }
      if (r) {
        if (prev) prev.g.parentNode?.removeChild(prev.g)
        // the new trace fades in on the sequence's own clock (a CSS transition would run on the browser's); the source and the screen below cross-fade on the Web Animations clock, which the reduced form's 150 to 200 ms does not need to be exact about
        cur.g.style.opacity = '0'
        const fade = L.anim(dur('swap'), E.sweep, (e: number) => { cur.g.style.opacity = String(e) }, () => { cur.g.style.opacity = ''; S.busy = null })
        S.busy = { stop: () => { fade.stop(); cur.g.style.opacity = '' } }
        paintValue()
        for (const e of [$('.sp:not([hidden])'), $('.kij-test')]) if (e && e.animate) e.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: dur('swap'), easing: 'linear' })
        return
      }
      const sp = $('.sp:not([hidden])')
      if (sp && sp.animate) sp.animate([{ transform: 'translateY(-14px)', opacity: 0.3 }, { transform: 'translateY(0)', opacity: 1 }], { duration: dur('swap'), easing: ring() })
      // the trace rises from the baseline (480 ms rc), the old one collapses onto it
      const low = G!.low
      paintValue()
      cur.path.style.transformOrigin = `0 ${low}px`
      cur.ticks.style.opacity = '0'
      setArrived(false, true)
      const stopA = L.anim(dur('trace'), E.rc, (e: number) => { cur.path.style.transform = `scaleY(${Math.max(0.001, e).toFixed(4)})`; if (prev) prev.g.style.opacity = String(1 - e) }, () => {
        cur.path.style.transform = 'none'
        cur.ticks.style.opacity = '1'
        if (prev) prev.g.parentNode?.removeChild(prev.g)
        // the terminal settles, and the screen shows its value whole
        const stopB = L.anim(dur('term'), E.rc, (e: number) => { term.style.transform = `scale(${(0.5 + 0.5 * e).toFixed(3)})` }, () => { term.style.transform = ''; })
        setArrived(true, true)
        S.busy = { stop: () => stopB.stop() }
      })
      S.busy = { stop: () => { stopA.stop(); if (prev) prev.g.parentNode?.removeChild(prev.g) } }
    }
    if (o.instant || r) swap(); else at(dur('key') + dur('pause'), () => { swap() })
    // the held samples run again from the new pair's start
    startClock()
  }

  function setRun(on: boolean) {
    S.run = on
    runLabel()
  }
  function runLabel() {
    const r = red()
    el.setAttribute('data-run', S.run && !r ? 'run' : 'stop')   // the run state is an attribute on the root, next to data-par
    if (!runbtn) return
    runbtn.hidden = r
    if (runlbl) runlbl.hidden = !r
    if (r) return
    // only the Gépadat band moves, so only there does the key do anything: on the other pairs it stays in its slot (no layout shift) but is not seen, not focusable and not announced
    const live = S.par === 'gepadat'
    runbtn.style.visibility = live ? '' : 'hidden'
    runbtn.inert = !live
    runbtn.setAttribute('aria-pressed', S.run ? 'true' : 'false')
    $('.rt', runbtn)!.textContent = S.run ? 'Fut' : 'Áll'
  }

  for (const k of keys) {
    k.addEventListener('click', () => select(k.getAttribute('data-p') as Par), { signal: L.sig })
    k.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.repeat) { e.preventDefault(); return }
      const i = PAROK.indexOf(k.getAttribute('data-p') as Par)
      const d = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key]
      if (!d) return
      e.preventDefault()
      const nk = PAROK[(i + d + PAROK.length) % PAROK.length]!
      select(nk)
      keys.find((q) => q.getAttribute('data-p') === nk)!.focus()
    }, { signal: L.sig })
  }
  if (runbtn) runbtn.addEventListener('click', () => { if (!red()) setRun(!S.run) }, { signal: L.sig })

  const O = {
    taps,
    relayout: () => layout(),
    /** Load sequence: the trace draws from the left to the terminal (with a hot head), the taps appear, the terminal turns on at arrival. Reduced: complete in 300 ms. */
    load() {
      T.clear()
      if (S.busy) { S.busy.stop(); S.busy = null }
      htmlEl.classList.remove('jel-var', 'jel-vege')
      S.loading = true
      S.target = S.par
      showPair(S.par)
      layout()
      const c = pair!
      if (red()) {
        setArrived(false, true)
        const all = [c.g, fix!.tap, fix!.node]
        for (const e of all) { (e as SVGElement).style.opacity = '0'; (e as SVGElement).style.transition = 'opacity 200ms linear' }
        void svg.getBoundingClientRect()
        for (const e of all) (e as SVGElement).style.opacity = '1'
        at(300, finishLoad)
        return 300
      }
      setArrived(false, true)
      S.sweepE = 0
      applySweep(0)
      c.ticks.style.opacity = '0'
      fix!.tap.style.opacity = '0'; fix!.node.style.opacity = '0'; c.tap.style.opacity = '0'; c.ent.style.opacity = '0'
      at(150, () => { fix!.tap.style.opacity = '1'; fix!.node.style.opacity = '1'; c.tap.style.opacity = '1'; c.ent.style.opacity = '1' })
      const a = L.anim(dur('sweep'), E.sweep, (e: number) => { S.sweepE = e; applySweep(e) }, () => { S.busy = null; finishLoad() }, 200)
      S.busy = { stop: () => a.stop() }
      return 1100
    },
    reset() {
      // the preference changed at runtime: the complete form (a queued swap is dropped, a running load or arrival ends whole)
      T.clear()
      if (S.busy) { S.busy.stop(); S.busy = null }
      S.target = S.par
      finishLoad()
      settle()
      runLabel()
      stopClock()
      showPair(S.par)
      layout()
      if (!red()) startClock()
    },
  }
  runLabel()
  return O
}
