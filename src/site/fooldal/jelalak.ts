// The home page's pure signal functions, shared by the build (the first-screen band that is in the HTML at rest) and the browser (the first screen's live band and the work traces):
// the works' traces (QR, panel, temperature, speech), the sampled last stretch of the first screen's band, and the QR modules. Ported from the approved
// direction-D prototype (core.js); the numbers are pinned by scripts/jel-geometria.test.mjs.

/** The phone layout is up to this width (the css breakpoint is max-width 726 px); from 727 px the wide form is used (folded below 1024 px). 727 is the smallest width where the 248 px card column and a 300 px controller figure both fit beside each other. */
export const KESKENY_PX = 726

// The numbers behind the traces (the QR modules, CNC-1's 60 samples, the cut order's lengths) are content: src/content/sorozatok.ts, with their units and sampling steps.
import { CNC1_HOMERSEKLET, PANEL_HOSSZAK, QR_MODULOK, QR_SOR0 } from '../../content/sorozatok.ts'
export { CNC1_HOMERSEKLET, PANEL_HOSSZAK, QR_MODULOK, QR_SOR0 }

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Decimal comma and a real minus sign, one decimal by default. */
export function fmt(x: number, d = 1): string {
  return x.toFixed(d).replace('.', ',').replace('-', '−')
}

export function sm(x: number): number {
  x = clamp(x, 0, 1)
  return x * x * (3 - 2 * x)
}




/** The hour's lowest and highest sample (50,7 and 53,1 degC): the scale of every drawing of the temperature, so the whole height is the demo's own hour. */
export const HOM_MIN = Math.min(...CNC1_HOMERSEKLET)
export const HOM_MAX = Math.max(...CNC1_HOMERSEKLET)
/** The index of the reading at rest (the last sample, 51,6 degC at 7:00) and the reading itself. */
export const HOM_UTOLSO = CNC1_HOMERSEKLET.length - 1
export const HOM_NYUGALOM: number = CNC1_HOMERSEKLET[HOM_UTOLSO]!
/** Where a temperature stands on the scale: 0 at the hour's lowest sample, 1 at its highest. */
export const homU = (t: number): number => (t - HOM_MIN) / (HOM_MAX - HOM_MIN)

/** The `n` samples that end at index `idx`, oldest first; after the last sample comes the first again (a live sample is the demo's next value, cyclically). */
export function homAblak(idx: number, n: number): number[] {
  const len = CNC1_HOMERSEKLET.length
  return Array.from({ length: n }, (_, k) => CNC1_HOMERSEKLET[(((idx - (n - 1 - k)) % len) + len) % len]!)
}

/**
 * The Gépadat band's one time base: the whole band is one window of N samples of the hour, one slot of `p` px each (the hour over the width when the slots stay at least `minStep` wide,
 * otherwise as many as fit), ending at the current sample. The last `n` slots are the held stretch (about `tail` px), the first `m` the trace; `xs` is where the held stretch starts.
 */
export function homIdo(xa: number, x1: number, tail: number, minStep: number): { p: number; N: number; n: number; m: number; xs: number } {
  const W = Math.max(1, x1 - xa)   // a band of no width still has slots
  const N = W / CNC1_HOMERSEKLET.length >= minStep ? CNC1_HOMERSEKLET.length : Math.max(2, Math.floor(W / minStep))
  const p = W / N
  const n = Math.min(N, Math.max(1, Math.round(tail / p)))
  return { p, N, n, m: N - n, xs: x1 - n * p }
}

/** The card's trend as an SVG path in its 200 x 40 box: the hour's highest sample on y = 1, its lowest on y = 39, the same scale as the band. */
export function homTrend(vals: readonly number[]): string {
  return vals.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, vals.length - 1)) * 200).toFixed(1)} ${(39 - homU(v) * 38).toFixed(1)}`).join('')
}

/** The demo's temperature at u (0 to 1) along its last hour, between its samples straight (the trace, the cable run's reading, the trend). */
export function tempAt(u: number): number {
  const h = CNC1_HOMERSEKLET
  const x = clamp(u, 0, 1) * (h.length - 1)
  const i = Math.min(h.length - 2, Math.floor(x))
  return lerp(h[i]!, h[i + 1]!, x - i)
}


/** Speech: five word bursts as a smooth envelope (widths in units of an eighth of the trace, amplitudes per syllable). */
const BURSTS: readonly (readonly [number, readonly number[]])[] = [
  [0.9, [0.55, 0.9, 0.4]],
  [1.6, [0.6, 1.0, 0.7, 0.45, 0.85]],
  [0.7, [0.5, 0.8, 0.35]],
  [1.3, [0.7, 0.4, 0.95, 0.6]],
  [2.0, [0.5, 0.85, 0.4, 1.0, 0.65, 0.35]],
]

export type NyomFajta = 'qr' | 'panel' | 'temp' | 'speech'

interface Nyom {
  pts: [number, number][]
  labels: { x: number; y: number; t: string; i: number }[]
  startY: number
}

/** Optional vertical limits of a trace: `low` is its baseline, `high` the level of its tallest feature (the first screen's band sets both; the works' cable runs use the built values). */
interface NyomHatar {
  low?: number
  high?: number
  /** Speech only: the silence at the start of the trace in px; the five bursts then share the rest of the width (the first screen's band is quiet until about a quarter of its width). */
  mute?: number
}

/**
 * The works' own traces as polylines, from x = cx over a width W in a box of height H: row 0 of the demo's QR code (qr), three blocks of a cut order (panel),
 * the warm-up curve (temp), five word bursts (speech). One definition for the cable run under the controller and for the first screen's band.
 */
export function nyomPontok(kind: NyomFajta, cx: number, W: number, H: number, hatar: NyomHatar = {}): Nyom {
  const big = H > 80
  const low = hatar.low ?? (big ? H - 30 : H - 14)
  const high = hatar.high ?? (big ? 36 : 14)
  const N: Nyom = { pts: [], labels: [], startY: low }
  const x1 = cx + W
  let i: number
  if (kind === 'qr') {
    const bw = W / QR_SOR0.length
    let prev: number | null = null
    let x = cx
    for (i = 0; i < QR_SOR0.length; i++) {
      const y = QR_SOR0[i] === '1' ? high : low
      x = cx + i * bw
      if (prev === null) N.pts.push([x, y])
      else if (y !== prev) N.pts.push([x, prev], [x, y])
      prev = y
    }
    N.pts.push([x1, prev!])
    N.startY = N.pts[0]![1]
  } else if (kind === 'panel') {
    // the two blocks are the lengths of the lapszabászat demo's own two parts (public/demos/lapszabaszat/app.js line 23: 720 x 400 and 564 x 380 mm); the labels are those numbers. The 400 mm is a width, not a length, so it is not a third block
    const ws = PANEL_HOSSZAK
    const sc = W / (360 + ws.reduce((x, y) => x + y, 0)) // 80 + 720 + 100 + 564 + 100 + 80
    let xx = cx + 80 * sc
    N.pts.push([cx, low])
    for (i = 0; i < ws.length; i++) {
      const a = xx
      const b = xx + ws[i]! * sc
      N.pts.push([a, low], [a, high], [b, high], [b, low])
      N.labels.push({ x: (a + b) / 2, y: high - (big ? 12 : 7), t: ws[i] + ' mm', i })
      xx = b + 100 * sc
    }
    N.pts.push([x1, low])
    N.startY = low
  } else if (kind === 'temp') {
    const yL = hatar.low ?? (big ? H - 26 : H - 12)
    const yH = hatar.high ?? (big ? 22 : 12)
    // one vertex per sample of the hour, so the lowest sample is exactly on yL and the highest exactly on yH
    for (i = 0; i < CNC1_HOMERSEKLET.length; i++) N.pts.push([cx + (i / HOM_UTOLSO) * W, lerp(yL, yH, homU(CNC1_HOMERSEKLET[i]!))])
    N.startY = N.pts[0]![1]
  } else {
    const base = hatar.low ?? (big ? H - 8 : H - 6)
    const amp = hatar.low !== undefined && hatar.high !== undefined ? hatar.low - hatar.high : big ? H - 16 : H - 14
    const unit = hatar.mute === undefined ? W / 8 : (W - hatar.mute) / 7.75
    let pos = hatar.mute === undefined ? 0.25 : hatar.mute / unit
    N.pts.push([cx, base], [cx + pos * unit, base])
    for (const [bw, amps] of BURSTS) {
      const x0 = cx + pos * unit
      const w = bw * unit
      const n = amps.length
      for (let px = 0; px <= w; px += 3) {
        const uu = px / w
        const kk = Math.min(n - 1, Math.floor(uu * n))
        const vv = uu * n - kk
        const ramp = sm(uu / 0.12) * sm((1 - uu) / 0.12)
        N.pts.push([x0 + px, base - ramp * amps[kk]! * (0.12 + 0.88 * Math.sin(Math.PI * vv)) * amp])
      }
      N.pts.push([x0 + w, base])
      pos += bw + 0.25
    }
    N.pts.push([x1, base])
    N.startY = base
  }
  return N
}

/** The level (y) of a polyline at x; at a vertical edge the later point wins. */
export function yAt(pts: readonly (readonly [number, number])[], x: number): number {
  let y = pts[0]![1]
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1]!
    const b = pts[k]!
    if (x < a[0]) break
    if (x >= b[0]) {
      y = b[1]
      continue
    }
    y = b[0] === a[0] ? b[1] : a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])
    break
  }
  return y
}

/**
 * The first screen's band: the pair's trace up to `xs` as built, then its last stretch held in steps of `step` px (a sample every step, the level the trace has
 * there), ending at x1; `jitter(k)` (px, default none) moves the k-th held level, which is how a live reading moves; `level(k)`, when given, is the k-th held level itself (the temperature's own samples). Returns the points of one polyline.
 */
export function savPontok(nyom: readonly [number, number][], xs: number, x1: number, step: number, jitter: (k: number) => number = () => 0, level?: (k: number) => number): { pts: [number, number][]; ticks: number[]; levels: number[]; endY: number } {
  const pts: [number, number][] = []
  for (const p of nyom) if (p[0] < xs) pts.push([p[0], p[1]])
  const n = Math.max(1, Math.round((x1 - xs) / step))
  const w = (x1 - xs) / n
  const ticks: number[] = []
  const levels: number[] = []
  let endY = yAt(nyom, xs)
  for (let k = 0; k < n; k++) {
    const a = xs + k * w
    const y = level ? level(k) : yAt(nyom, a + w / 2) + jitter(k)
    const prevY = pts.length ? pts[pts.length - 1]![1] : y
    pts.push([a, prevY], [a, y], [a + w, y])
    ticks.push(a + w / 2)
    levels.push(y)
    endY = y
  }
  return { pts, ticks, levels, endY }
}

/** A polyline as an SVG path (one decimal). */
export function utLeiras(pts: readonly (readonly [number, number])[]): string {
  let d = ''
  for (let k = 0; k < pts.length; k++) d += (k ? 'L' : 'M') + pts[k]![0].toFixed(1) + ' ' + pts[k]![1].toFixed(1)
  return d
}
