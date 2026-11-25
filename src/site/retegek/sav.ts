// The lane of a sheet: the stretch of the pair's own signal that the red line carries across the sheet. Adat is the continuous one, Szabály the stepped one.
// Never the server-rendered or another pair's band: HONLAP's curve is the speech band's second word and its held levels (drawn, and the Jel line says so), RENDELÉS's Adat is its cut order's
// trace scaled and its Szabály is straight (no series exists), GÉPKÖNYV's are the QR row's trace and its 29 bits, GÉPADAT's the 60 samples of CNC-1 and the same 60 stepped.
import type { RetegPar } from '../../content/retegek.ts'
import { SOROZATOK } from '../../content/retegek.ts'
import { nyomPontok, savPontok } from '../fooldal/jelalak.ts'

export type SavFajta = 'adat' | 'szabaly'
/** Lane-local px: x from `GUT` to the sheet's width, y around the lane's centre line. */
export const GUT = 20

type Pt = [number, number]

/** Fits a polyline's own extent to the lane: x over [GUT, W], y to +-amp around the centre line (the lowest value below, the highest above). */
function illeszt(p: Pt[], W: number, LB: number, amp: number): Pt[] {
  const xs = p.map((q) => q[0])
  const ys = p.map((q) => q[1])
  const a = Math.min(...xs)
  const b = Math.max(...xs)
  const lo = Math.min(...ys)
  const hi = Math.max(...ys)
  const cy = LB / 2
  return p.map(([x, y]) => [GUT + ((x - a) / (b - a || 1)) * (W - GUT), cy + ((y - (lo + hi) / 2) / ((hi - lo) / 2 || 1)) * amp])
}

/** Held levels of a series as steps over [GUT, W]: one slot per value. `vals` high = up on the lane. */
function lepcso(vals: readonly number[], W: number, LB: number, amp: number): Pt[] {
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const cy = LB / 2
  const w = (W - GUT) / vals.length
  const out: Pt[] = []
  vals.forEach((v, i) => {
    const y = cy - ((v - (hi + lo) / 2) / ((hi - lo) / 2 || 1)) * amp
    out.push([GUT + i * w, y], [GUT + (i + 1) * w, y])
  })
  return out
}

/** The speech band as the page without script draws it (src/site/fooldal/rajz.ts fagyottSav at the design width), the word bursts as runs above the baseline. */
function beszed() {
  const W = 971
  const H = 228
  const low = H - 30
  const n = nyomPontok('speech', 0, W, H, { low, high: low - 40, mute: Math.round(0.23 * W) })
  const runs: Pt[][] = []
  let cur: Pt[] = []
  for (const p of n.pts) {
    if (p[1] < low - 0.5) cur.push(p)
    else if (cur.length) { runs.push(cur); cur = [] }
  }
  return { runs, trace: n.pts, W, H, low }
}

/** The lane's polyline in lane-local px for a pair and kind: both ends join the centre line, so the red line always enters and leaves at the middle of the lane. */
export function savPts(par: RetegPar | 'hiba', fajta: SavFajta, W: number, LB: number, amp = 14): Pt[] {
  const cy = LB / 2
  let p: Pt[] | null = null
  if (fajta === 'adat') {
    if (par === 'honlap') p = illeszt(beszed().runs[1]!, W, LB, amp)
    else if (par === 'rendeles') p = illeszt(nyomPontok('panel', 0, 1000, 228).pts, W, LB, amp)
    else if (par === 'gepkonyv') p = illeszt(nyomPontok('qr', 0, 1000, 228).pts, W, LB, amp)
    else if (par === 'gepadat') p = illeszt((SOROZATOK.gepadat!.ertekek).map((v, i) => [i, -v] as Pt), W, LB, amp)
  } else if (par === 'honlap') {
    // the held levels of the speech band's last stretch (the same step the band uses: 12 px), the "Jel" line says the curve is drawn
    const b = beszed()
    const s = savPontok(b.trace, b.W - Math.min(220, 0.3 * b.W), b.W, 12)
    p = lepcso(s.levels.map((y) => -y).filter((_, i) => i % 3 === 0), W, LB, amp)
  } else if (par === 'gepkonyv') p = lepcso(SOROZATOK.gepkonyv!.ertekek, W, LB, amp)
  else if (par === 'gepadat') p = lepcso(SOROZATOK.gepadat!.ertekek, W, LB, amp)
  if (!p) return [[GUT, cy], [W, cy]]   // no series: straight
  return [[GUT, cy], ...p, [W, cy]]
}

/** The lane as a path string (Adat is drawn from its right end: the signal arrives on the right). */
export function savUt(par: RetegPar | 'hiba', fajta: SavFajta, W: number, LB: number): string {
  const p = savPts(par, fajta, W, LB)
  const q = fajta === 'adat' ? [...p].reverse() : p
  return q.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('')
}
