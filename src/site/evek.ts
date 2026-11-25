// The geometry of "Évek" (the timing diagram of /munkaim/): which year cells the axis has and, per period, the cell edges between which its channel is high.
// Pure data: no DOM, no pixel. The page lays the cells out (src/site/pages/Munkaim.tsx, munkaim.css) as a grid of equal cells after a fixed lead-in, so every edge is exact at any width and without a script.
import type { Idoszak } from '../content/tapasztalat.ts'

export interface Csatorna {
  /** The index of the cell where the channel goes high: its left edge is the rising edge. */
  kezd: number
  /** The index of the cell edge where the channel goes low again: one past the last cell of the period; for a running period it is the cell count, the "now" edge. */
  vege: number
  /** The period has no end year: it stays high to the "now" edge and ends in one node. */
  tart: boolean
}

export interface Evek {
  /** The years of the axis cells, in order: from the first start year to the build year. */
  cellak: number[]
  /** One channel per period, in the order of the data. */
  csatornak: Csatorna[]
}

/**
 * The axis runs from the earliest start year to `epitesEv` (the year of the build: a build fact, so a build in 2027 adds a cell and moves no start index).
 * A period is high across its whole year cells (the end year's cell included); a period without an end year stays high to the last cell's right edge.
 * An impossible period (it ends before it starts, starts after the build year or ends after it) is an error, so a data slip fails the build instead of drawing a wrong cell.
 */
export function evek(idoszakok: readonly Idoszak[], epitesEv: number): Evek {
  if (idoszakok.length === 0) throw new Error('evek: no periods')
  const elso = Math.min(...idoszakok.map((i) => i.kezdet))
  const utolso = Math.max(epitesEv, ...idoszakok.map((i) => i.veg ?? i.kezdet))
  const cellak = Array.from({ length: utolso - elso + 1 }, (_, i) => elso + i)
  const csatornak = idoszakok.map((i): Csatorna => {
    if (!Number.isInteger(i.kezdet) || (i.veg !== undefined && (!Number.isInteger(i.veg) || i.veg < i.kezdet))) throw new Error(`evek: bad period ${i.kezdet}-${i.veg ?? ''}`)
    if (i.kezdet > epitesEv || (i.veg !== undefined && i.veg > epitesEv)) throw new Error(`evek: the period ${i.kezdet}-${i.veg ?? ''} is after the build year ${epitesEv}`)
    return { kezd: i.kezdet - elso, vege: i.veg === undefined ? cellak.length : i.veg - elso + 1, tart: i.veg === undefined }
  })
  return { cellak, csatornak }
}
