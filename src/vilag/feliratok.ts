// The labels of the particle scene: real times and real values of the run, placed in the scene's own space and drawn as DOM text (the site's own type; the canvas has no text), `aria-hidden`.
// Every fact in a label is also in the text twin (hud.ts builds the twin from the same strings), and a label carries no value that is not a sample of the series.
// Pure: no DOM, no GL (the node tests import it). The strings come in from outside (src/content/kaland.ts), so this file holds geometry and rules only.
import type { Vetites } from './jelenet.ts'
import { korl, sm, type V3 } from './matek.ts'
import { AMPY, GX, PADLO, PICW, ZP, cx, type Palya } from './palya.ts'
import { KERET } from './racs.ts'

/**
 * What a label is: `ora` an hour on the floor (and the end of the run), `ertek` the value at an hour, `cs` the maximum (above the thread) and `csle` the minimum (below it);
 * `meret` and `meretf` the picture's dimension lines (the count of blocks across, above it, and down, beside it, set upright from the bottom up).
 */
export type FeliratTip = 'ora' | 'ertek' | 'cs' | 'csle' | 'meret' | 'meretf'

export interface Felirat {
  szoveg: string
  /** Where it hangs, in the scene's world space. */
  pont: V3
  tip: FeliratTip
}

/** The words of the labels (src/content/kaland.ts holds them: the clock and the numbers are functions of the series). */
export interface FeliratSzovegek {
  /** The clock of minute `i`: "6:00". */
  ora(i: number): string
  /** The value of minute `i`: "48,3 °C". */
  ertek(i: number): string
  /** The maximum's label: "csúcs 61,2 °C · 11:42". */
  csucs(i: number): string
  /** The minimum's label. */
  melypont(i: number): string
  /** The label at the end of the run, where the shift changes: "14:00 műszakváltás". */
  muszakvaltas: string
  /** The picture's dimension lines: the blocks across ("40 blokk") and down ("48 blokk"). */
  szeles: string
  magas: string
}

/** The labels of a run: the full hours on the floor beside the ribbon, the value at each hour above the thread, the maximum and the minimum, and the end of the run. */
export function feliratok(p: Palya, n: number, sz: FeliratSzovegek): Felirat[] {
  const ki: Felirat[] = []
  for (const i of p.oraIdx) {
    const u = p.uIdx(i)
    const z = p.zIdx(i)
    ki.push({ szoveg: i === n - 1 ? sz.muszakvaltas : sz.ora(i), pont: [GX + 0.6, PADLO, z], tip: 'ora' })
    if (i < n - 1) ki.push({ szoveg: sz.ertek(i), pont: [cx(u), (p.vnAt(u) - 0.5) * AMPY + 0.45, z], tip: 'ertek' })
  }
  ki.push({ szoveg: sz.csucs(p.iMax), pont: [cx(p.uIdx(p.iMax)), AMPY / 2 + 0.6, p.zIdx(p.iMax)], tip: 'cs' })
  ki.push({ szoveg: sz.melypont(p.iMin), pont: [cx(p.uIdx(p.iMin)), -AMPY / 2 - 0.6, p.zIdx(p.iMin)], tip: 'csle' })
  ki.push({ szoveg: sz.szeles, pont: [0, p.picY + p.hp / 2 + KERET.tav + KERET.meret, ZP], tip: 'meret' })
  ki.push({ szoveg: sz.magas, pont: [-(PICW / 2 + KERET.tav + KERET.meret), p.picY, ZP], tip: 'meretf' })
  return ki
}

/** Where a label is on the canvas and how visible it is: `o` 0 (hidden) .. 0.9, `x` and `y` in CSS pixels from the top left. */
export interface Helyzet {
  o: number
  x: number
  y: number
  /** The label's size factor: a label belongs to the space, so it shrinks with distance (and grows a little when near). 1 = its CSS size. */
  s: number
}

const REJTETT: Helyzet = { o: 0, x: 0, y: 0, s: 1 }

/** How tall the control strips are, in CSS pixels: the toggles above (to their bottom edge, plus a gap) and the caption, the slider and the readout below. On a narrow screen the toggles wrap to a second row and the caption runs longer. */
const UI_FENT = 56
const UI_LENT = 150
const UI_FENT_DAR = 116
const UI_LENT_DAR = 275
const DAR = 520
/** The width of one character of a label, in CSS pixels at scale 1 (0.75rem of the mono face plus its letter spacing): what a label's width is estimated from, so it can leave before it runs off the screen. */
const BETU_SZEL = 8.4

/** The distance at which a label of each kind has its CSS size. */
const REF_TAV: Readonly<Record<FeliratTip, number>> = { ora: 18, ertek: 15, cs: 17, csle: 17, meret: 20, meretf: 20 }

/**
 * Projects a label with the matrix and the eye of the frame that was drawn. `lb` is the look's label gain: 0 none, 1 hours and the extremes, 2 also the value at each hour (so a look that
 * goes from 2 to 1 fades the values out, continuously). A label is dim when the camera is very near it or far from it, behind the camera it is hidden, and all of them yield to the
 * picture as it forms. `fr` is the look's gain for the picture's frame: the picture's own labels (its dimension lines) are drawn only where its frame is.
 */
export function feliratHelyzet(f: Felirat, v: Vetites, lb: number, sw: number, sh: number, fr = 1): Helyzet {
  const kep = f.tip === 'meret' || f.tip === 'meretf'
  const nyer = (f.tip === 'ertek' ? korl(lb - 1, 0, 1) : korl(lb, 0, 1)) * (kep ? korl(fr, 0, 1) : 1)
  if (nyer <= 0) return REJTETT
  const { vp, eye } = v
  const [x, y, z] = f.pont
  const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]
  if (cw <= 0.5) return REJTETT
  const nx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw
  const ny = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw
  if (Math.abs(nx) >= 1.02 || Math.abs(ny) >= 1.02) return REJTETT
  const d = Math.hypot(x - eye[0], y - eye[1], z - eye[2])
  const er = f.tip === 'ertek'
  // the picture's own labels come in as the picture forms; the others yield to it
  const o = 0.9 * nyer * sm(3, 7, d) * (1 - sm(er ? 16 : 30, er ? 26 : 50, d)) * (kep ? sm(0.75, 0.97, v.forma) : 1 - sm(0.3, 0.7, v.forma))
  const sy = (0.5 - ny * 0.5) * sh
  const sx = (nx * 0.5 + 0.5) * sw
  const ss = korl((REF_TAV[f.tip] / d) ** 0.6, 0.8, 1.35)
  // The strips where the page's own controls stand (the toggles on top, the caption, the slider and the readout at the bottom) and the screen's own edges: a label fades out before it reaches
  // them, so it never prints over a control and is never cut off by the edge. The picture's own labels are composed with the picture, so they keep their place.
  let szel = 1
  let hx = sx
  if (!kep) {
    const dar = sw <= DAR
    const fent = dar ? UI_FENT_DAR : UI_FENT
    const lent = dar ? UI_LENT_DAR : UI_LENT
    const w = f.szoveg.length * BETU_SZEL * ss
    const ora = f.tip === 'ora'
    // a label that hangs centred on its point is slid back inside the screen (it stays near the point it names); one that would have to slide far fades out instead. The hours hang to the right of their point and fade.
    hx = ora ? sx : korl(sx, w / 2 + 8, Math.max(w / 2 + 8, sw - w / 2 - 8))
    const bal = ora ? sx : 0
    const jobb = ora ? sx + w + 4 : 0
    const szeli = ora ? sm(4, 28, bal) * (1 - sm(sw - 28, sw - 4, jobb)) : 1 - sm(40, 110, Math.abs(hx - sx))
    szel = sm(fent, fent + 46, sy) * (1 - sm(sh - lent - 50, sh - lent, sy)) * szeli
  }
  const oo = o * szel
  if (oo < 0.02) return REJTETT
  return { o: oo, x: hx, y: sy, s: ss }
}

/** The box a placed label covers on the screen (its text is estimated from its length: no DOM here), by how it hangs. */
function felirDoboz(f: Felirat, h: Helyzet): { x0: number; x1: number; y0: number; y1: number } {
  const w = f.szoveg.length * BETU_SZEL * h.s
  const m = 12 * h.s
  switch (f.tip) {
    case 'ora':
      return { x0: h.x, x1: h.x + w + 4, y0: h.y - m / 2, y1: h.y + m / 2 }
    case 'csle':
      return { x0: h.x - w / 2, x1: h.x + w / 2, y0: h.y, y1: h.y + m }
    case 'meret':
      return { x0: h.x - w / 2, x1: h.x + w / 2, y0: h.y - m / 2, y1: h.y + m / 2 }
    case 'meretf':
      return { x0: h.x - m / 2, x1: h.x + m / 2, y0: h.y - w / 2, y1: h.y + w / 2 }
    default:
      return { x0: h.x - w / 2, x1: h.x + w / 2, y0: h.y - m, y1: h.y }
  }
}

/**
 * Two labels never print over each other: the nearer one (the larger, then the stronger) keeps its place and the other fades by how much of it the first covers (continuously, so a label
 * that a moving camera brings under another does not pop). Returns the positions with the opacity changed; `lista` and `h` correspond by index.
 */
export function feliratUtkozes(lista: readonly Felirat[], h: readonly Helyzet[]): Helyzet[] {
  const ki = h.map((p) => ({ ...p }))
  const sor = ki.map((_, i) => i).filter((i) => ki[i].o > 0).sort((a, b) => ki[b].s * ki[b].o - ki[a].s * ki[a].o)
  const tart: { x0: number; x1: number; y0: number; y1: number }[] = []
  for (const i of sor) {
    const d = felirDoboz(lista[i], ki[i])
    const terulet = Math.max(1e-6, (d.x1 - d.x0) * (d.y1 - d.y0))
    let fed = 0
    for (const t of tart) {
      const ix = Math.max(0, Math.min(d.x1, t.x1) - Math.max(d.x0, t.x0))
      const iy = Math.max(0, Math.min(d.y1, t.y1) - Math.max(d.y0, t.y0))
      fed = Math.max(fed, (ix * iy) / terulet)
    }
    ki[i].o *= 1 - sm(0.05, 0.4, fed)
    if (ki[i].o < 0.02) ki[i] = { ...REJTETT }
    else tart.push(d)
  }
  return ki
}

/** How a label hangs on its point (the CSS transform after the translation to the point): hours to the right of it, the minimum below, the rest above. */
export const FELIRAT_HORGONY: Readonly<Record<FeliratTip, string>> = {
  ora: 'translate(0, -50%)',
  csle: 'translate(-50%, 0)',
  cs: 'translate(-50%, -100%)',
  ertek: 'translate(-50%, -100%)',
  meret: 'translate(-50%, -50%)',
  meretf: 'translate(-50%, -50%) rotate(-90deg)',
}

/** How near the pointer must be to a sample, in CSS pixels, for the probe to name it. */
export const SZONDA_TAV = 44

/**
 * The probe: the sample of the series nearest to the pointer on the screen (the thread's own points, projected with the matrix of the frame that was drawn), or null when none is within `tav`
 * pixels. A visual aid only: what it names (the time and the value of sample `i`) is the twin's own sentence for that sample, so it adds no fact. Pure.
 */
export function szondaMinta(p: Palya, n: number, v: Vetites, sw: number, sh: number, px: number, py: number, tav = SZONDA_TAV): { i: number; x: number; y: number } | null {
  const vp = v.vp
  let jo = -1
  let jx = 0
  let jy = 0
  let jd = tav * tav
  for (let i = 0; i < n; i++) {
    const u = p.uIdx(i)
    const x = cx(u)
    const y = (p.vnAt(u) - 0.5) * AMPY
    const z = p.zIdx(i)
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15]
    if (cw <= 0.5) continue
    const sx = ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw * 0.5 + 0.5) * sw
    const sy = (0.5 - (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw * 0.5) * sh
    const d = (sx - px) * (sx - px) + (sy - py) * (sy - py)
    if (d < jd) {
      jd = d
      jo = i
      jx = sx
      jy = sy
    }
  }
  return jo < 0 ? null : { i: jo, x: jx, y: jy }
}
