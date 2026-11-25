// Build-time drawings of the home page: the Gépadat pair's one device, the QR label of the Gépkönyv pair, the first screen's frozen band and the controller figure (two sizes).
// Everything here is a string made once when the page is rendered; the browser chunk only moves what is drawn.

import { Art } from './art.ts'
import { figure } from './regulo/figure.ts'
import { QR_MODULOK, nyomPontok, savPontok, utLeiras } from './jelalak.ts'
import { JEL } from '@/content/fooldal'

/** The BUSZ-3 bus module (the first screen's one device) at module width M: 168 px high at M = 33.6 (the wide form), 104 px at M = 20.8 (phone, `bare`: without the lamp legends and the type, which are too small to read there). */
export function gepadatEszkoz(M: number, bare = false): { w: number; h: number; svg: string } {
  return Art.devGep(M, JEL.nyito.gepadat.eszkoz, bare)
}

/** The demo's QR code as a printed label: dark modules on a light patch, quiet zone of 4 modules, drawn from the modules the demo's own library makes (QR_MODULOK). Runs of dark modules are one path piece each. */
export function qrAbra(alt: string): string {
  const n = QR_MODULOK.length
  const m = 4
  const size = n + 2 * m
  let d = ''
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (QR_MODULOK[r]![c] !== '1') continue
      let e = c
      while (e + 1 < n && QR_MODULOK[r]![e + 1] === '1') e++
      d += `M${c + m} ${r + m}h${e - c + 1}v1h-${e - c + 1}z`
      c = e
    }
  }
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${alt}" shape-rendering="crispEdges"><rect width="${size}" height="${size}"/><path d="${d}"/></svg>`
}

/**
 * The first screen's resting band as the page without script shows it: the HONLAP pair's trace in the box the script's drawing uses, only the part between the lane
 * and the terminal (the stub left of it, the lane and the turn are plain boxes in nyito.css). It is the same drawing as the script's at rest: the speech band silent
 * for the first quarter, its bursts at most 40 px (32 on a phone) above the baseline, the last stretch held in 12 px steps with a tick 8 px under each level.
 * W is the trace's width in px at the design width, H the band's height (228 wide, 170 stacked, 120 on a phone: the viewBox height is the real one, so the stretch is only horizontal).
 */
export function fagyottSav(W: number, H: number, osztaly: string): string {
  const low = H > 200 ? H - 30 : H - 14
  const amp = H > 200 ? 40 : 32
  const nyom = nyomPontok('speech', 0, W, H, { low, high: low - amp, mute: Math.round(0.23 * W) })
  const s = savPontok(nyom.pts, W - Math.min(220, 0.3 * W), W, 12)
  const ticks = s.ticks.map((x) => `M${x.toFixed(1)} ${(low + 8).toFixed(1)}v8`).join('')
  return `<svg class="${osztaly}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${utLeiras(s.pts)}" class="ln pen-r"/><path d="${ticks}" class="tk"/></svg>`
}

/** The controller figure in both sizes: markup, pixel box and the geometry the browser chunk needs. */
export function reguloAbra() {
  const w = figure('wide')
  const n = figure('narrow')
  return { szeles: w, keskeny: n }
}
