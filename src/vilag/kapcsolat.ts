// Chapter 5, "Kapcsolat": the particles write the address. The text is a bitmap of the address as the site's own mono face draws it (kapcsolat-raszter.ts rasterises it in the browser; this file takes the bitmap,
// so the node tests can hand it a synthetic one); each horizontal run of ink on a sampled row becomes one short TARGET, and the particles arrive as comets along the scene's arrival direction and settle
// into the runs, the address typing itself from the left (a line after a line). Pure: no DOM, no GL.
// What carries meaning: the address, and nothing else on the stage. The address is never only here: it is real text and a real link in the DOM (the contact line the world never hides) and in the twin.
// What is dressing: the arrival, the wires running back into the distance from each line, the floor.
import { CSOPORT_MAX, VONAL_RETEG, VONAL_SZIN, VonalEpito, hash01, type Cel, type KepzesAdat } from './cel.ts'
import { korl, sm, type V3 } from './matek.ts'

/** The text block's width in world units, the floor's height and the camera's field of view. */
export const KAPCS = { szeles: 8.4, padlo: -3.1, fov: (46 * Math.PI) / 180 } as const
/** At most this many targets (a run each): the texture and the particle share per target stay sensible. */
export const CEL_MAX = 1900

/** The address as a bitmap: `on` is one byte per pixel (0 off, anything else ink), row by row from the top; `sorok` text lines were drawn into it, one above the other. */
export interface Raszter {
  w: number
  h: number
  on: Uint8Array
  sorok: number
}

export interface Futas {
  /** The raster row and the columns [x0, x1) of one run of ink. */
  y: number
  x0: number
  x1: number
}

/** The runs of ink on every `lepes`-th row of the bitmap (rows at lepes/2, 3 lepes/2, ...). */
export function futasok(r: Raszter, lepes: number): Futas[] {
  const ki: Futas[] = []
  for (let y = Math.floor(lepes / 2); y < r.h; y += lepes) {
    let x = 0
    while (x < r.w) {
      if (!r.on[y * r.w + x]) {
        x++
        continue
      }
      const x0 = x
      while (x < r.w && r.on[y * r.w + x]) x++
      ki.push({ y, x0, x1: x })
    }
  }
  return ki
}

/** The smallest row step (from 2) for which the runs fit the budget. */
export function lepesValaszt(r: Raszter, max = CEL_MAX): number {
  let l = 2
  while (l < 12 && futasok(r, l).length > max) l++
  return l
}

/** The box of ink in the bitmap, or null if it is empty. */
function tinta(r: Raszter): { x0: number; x1: number; y0: number; y1: number } | null {
  let x0 = r.w
  let x1 = -1
  let y0 = r.h
  let y1 = -1
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (!r.on[y * r.w + x]) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return x1 < 0 ? null : { x0, x1: x1 + 1, y0, y1: y1 + 1 }
}

export interface KapcsolatAdat extends KepzesAdat {
  /** The world size of one raster pixel, and the box of ink in the world (centred on the origin of the text plane), for the tests and the camera. */
  pixel: number
  doboz: { x0: number; x1: number; y0: number; y1: number }
  /** The row step the runs were sampled with. */
  lepes: number
}

export function kapcsolatAdat(r: Raszter): KapcsolatAdat {
  const t = tinta(r)
  if (!t) throw new Error('kapcsolat: the address bitmap has no ink')
  const pixel = KAPCS.szeles / (t.x1 - t.x0)
  const lepes = lepesValaszt(r)
  const cx = (t.x0 + t.x1) / 2
  const cy = (t.y0 + t.y1) / 2
  const X = (px: number): number => (px - cx) * pixel
  const Y = (py: number): number => (cy - py) * pixel
  const doboz = { x0: X(t.x0), x1: X(t.x1), y0: Y(t.y1), y1: Y(t.y0) }
  const fut = futasok(r, lepes)
  const sorMag = (r.h / Math.max(1, r.sorok))
  const celok: Cel[] = fut.map((f) => {
    const sor = Math.floor(f.y / sorMag)
    const xk = (f.x0 + f.x1) / 2
    // typed from the left: the first line over the first half of the clock, the next after it
    const kes = (sor / Math.max(1, r.sorok)) * 0.55 + 0.4 * ((xk - t.x0) / (t.x1 - t.x0)) + 0.02 * hash01(f.y, f.x0)
    const hossz = (f.x1 - f.x0) * pixel
    return { a: [X(f.x0), Y(f.y), 0], d: [hossz, 0, 0], gain: 1, kes, hot: 0.2, meret: 0.6, folyas: 0, szoras: 0.02, csoport: 0, ismet: Math.max(1, Math.round(hossz / (pixel * lepes * 1.5))) }
  })
  // the cursor after the last glyph: one bar, hot, the last thing to arrive
  const alsoSor = r.sorok - 1
  const savY0 = Math.floor(alsoSor * sorMag)
  const savY1 = Math.min(r.h, Math.floor((alsoSor + 1) * sorMag))
  let jobb = t.x0
  for (let y = savY0; y < savY1; y++) {
    for (let x = r.w - 1; x >= jobb; x--) {
      if (r.on[y * r.w + x]) {
        jobb = x + 1
        break
      }
    }
  }
  const kurzorX = X(jobb) + 0.18 * sorMag * pixel
  const kurzorFent = Y(alsoSor * sorMag + sorMag * 0.2)
  const kurzorLent = Y(alsoSor * sorMag + sorMag * 0.8)
  celok.push({ a: [kurzorX, kurzorFent, 0], d: [0, kurzorLent - kurzorFent, 0], gain: 1.2, kes: 0.98, hot: 1, meret: 1.1, szoras: 0.015, csoport: 0, ismet: 8 })

  // the wires: a hairline under each text line (the data pen) and, from its left end, a line running back along the way the particles come in (the signal's route); and the floor
  const vonalak = new VonalEpito()
  const erkezes = normalize([0.3, 0.06, 1])
  const tav = 40
  for (let s = 0; s < r.sorok; s++) {
    const yb = Y((s + 0.86) * sorMag)
    vonalak.seg([doboz.x0, yb, 0], [doboz.x1, yb, 0], VONAL_RETEG.szal, VONAL_SZIN.toll, 0.8)
    vonalak.seg([doboz.x0, yb, 0], [doboz.x0 - erkezes[0] * tav, yb - erkezes[1] * tav, -erkezes[2] * tav], VONAL_RETEG.szal, VONAL_SZIN.toll, 0.8, 0)
  }
  // the guides: the box of the text as its frame's crop marks (drawn where the look asks for a frame)
  const m = 0.7
  for (const [x, y, sx, sy] of [[doboz.x0 - m, doboz.y1 + m, 1, -1], [doboz.x1 + m, doboz.y1 + m, -1, -1], [doboz.x0 - m, doboz.y0 - m, 1, 1], [doboz.x1 + m, doboz.y0 - m, -1, 1]] as const) {
    vonalak.seg([x, y, 0], [x + 0.6 * sx, y, 0], VONAL_RETEG.keret, VONAL_SZIN.tinta, 0.8)
    vonalak.seg([x, y, 0], [x, y + 0.6 * sy, 0], VONAL_RETEG.keret, VONAL_SZIN.tinta, 0.8)
  }
  // the floor: rails into the distance and rungs across
  for (let x = -12; x <= 12; x += 1.5) vonalak.seg([x, KAPCS.padlo, 4], [x, KAPCS.padlo, -34], VONAL_RETEG.padlo, VONAL_SZIN.tinta, 0.7)
  for (let z = 4; z >= -34; z -= 2.5) vonalak.seg([-12, KAPCS.padlo, z], [12, KAPCS.padlo, z], VONAL_RETEG.padlo, VONAL_SZIN.tinta, z === 4 ? 0.7 : 0.5)

  const dur = 0.25
  const ora = (pl: number): number => (1 + dur) * sm(0.03, 0.65, pl)
  const csoportok = new Float32Array(CSOPORT_MAX * 4)
  for (let i = 0; i < CSOPORT_MAX; i++) csoportok[i * 4 + 3] = 1
  const tan = Math.tan(KAPCS.fov / 2)
  const szel = doboz.x1 - doboz.x0
  const poz = (pl: number, asp: number): { eye: V3; tgt: V3 } => {
    const e = sm(0, 0.75, pl)
    // the final distance fits the block (with margin) into the screen's width, whatever its shape; the text rides above the middle of the screen (the caption and the controls are below)
    const vege = Math.max(9, (szel * 0.5) / (0.84 * tan * Math.max(asp, 0.3)))
    const tgt: V3 = [0, (doboz.y0 + doboz.y1) / 2 - 0.9, 0]
    const tav2 = vege * (1 + 1.1 * (1 - e))
    const oldal = 5.5 * (1 - e)
    const fent = 3.2 * (1 - e)
    return { eye: [tgt[0] + oldal, tgt[1] + 0.6 + fent, tav2], tgt }
  }
  return {
    id: 'kapcsolat',
    pixel,
    doboz,
    lepes,
    celok,
    vonalak: vonalak.epit(),
    feliratok: [],
    resz: 0.55,
    padlo: KAPCS.padlo,
    padloSzel: 12,
    erkezes,
    tavolsag: 34,
    szoras: 4.5,
    idotartam: dur,
    ero: 1,
    poz(pl, asp) {
      const { eye, tgt } = poz(pl, asp)
      return { eye, tgt, fov: KAPCS.fov, forma: korl(ora(pl) / (1 + dur), 0, 1) }
    },
    ora,
    csoportok: () => csoportok,
    minta: () => null,
    ertek: (pl) => korl(ora(pl) / (1 + dur), 0, 1),
    feny: () => null,
    padloFeny: () => null,
  }
}

function normalize(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
