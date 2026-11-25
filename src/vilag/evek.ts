// Chapter 3, "Évek": the live page's timing diagram (src/site/evek.ts: a grid of equal year cells and, per period, the cell edges between which its channel is high) built as a scene. Pure: no DOM, no GL.
// Everything that carries meaning is the page's own data: the cells are the years of the axis (the earliest start year to the build year), each period is a lane (the newest start in front, as the page lists
// them) whose channel is high exactly between its rising and its falling edge (a running period stays high to the "now" edge and ends in one ring), and each lane is named with the area as written in
// `IDOVONAL`. The particles are the dressing: they stream along the high parts in the direction time runs, and the diagram builds itself with a cursor that moves from the earliest year to now.
import { evek, type Evek } from '../site/evek.ts'
import type { Idoszak } from '../content/tapasztalat.ts'
import { CSOPORT_MAX, VONAL_RETEG, VONAL_SZIN, VonalEpito, type Cel, type KepzesAdat } from './cel.ts'
import type { Felirat } from './feliratok.ts'
import { korl, kevP, sm, type V3 } from './matek.ts'

/** The size of a cell and of a lane, the height of a high channel, and the floor (the channels' low state) in world units. */
export const EV = { cella: 2.8, sav: 2.2, mag: 1.3, padlo: 0, fov: (46 * Math.PI) / 180 } as const

/** The camera keys of the chapter, as a function of the diagram's size (a build in a later year adds a cell). */
function kulcsok(n: number, lanes: number): { p0: [V3, V3]; p1: [V3, V3]; p2: [V3, V3] } {
  const w = n * EV.cella
  const zm = -((lanes - 1) * EV.sav) / 2
  // the whole content is the diagram and the column of lane names to its left: the overview keeps both in view (a build in a later year adds a cell and stands the camera further back)
  const tartalom = w + 5.8
  const tav = Math.max(17.2, tartalom * 1.04)
  const kozep = w * 0.5 - 2.3
  const cel: V3 = [kozep, -0.6, zm + 1.5]
  return {
    // the first moment: close, on the earliest year, looking across the lanes
    p0: [[-0.8, 4.2, 7.2], [1.2, 0.4, zm + 0.8]],
    // the cursor has reached now: the same close view at the newest year
    p1: [[w - 1.8, 4.4, 7.4], [w - 0.6, 0.4, zm + 0.8]],
    // the whole diagram, and its lanes' names, in one view (looking down at about 39 degrees, a little from the right)
    p2: [[cel[0] + 0.11 * tav, cel[1] + 0.63 * tav, cel[2] + 0.77 * tav], cel],
  }
}

export interface EvekAdat extends KepzesAdat {
  /** The axis the diagram was built from (the page's own `evek()`). */
  tengely: Evek
  /** The lanes in order (front first): the period and the world position of its channel's edges. */
  savok: readonly { idoszak: Idoszak; z: number; xA: number; xB: number; tart: boolean }[]
  /** How many periods are high in year cell `c` (the readout names it). */
  futnak(c: number): number
  /** The year cell under the camera while the cursor sweeps, or null once the whole diagram is in view. */
  cella(pl: number): number | null
}

/** The scene for the periods and the build year. */
export function evekAdat(idoszakok: readonly Idoszak[], epitesEv: number): EvekAdat {
  const g = evek(idoszakok, epitesEv)
  const n = g.cellak.length
  const lanes = idoszakok.length
  const w = n * EV.cella
  const zOf = (i: number): number => -i * EV.sav
  const zSzel = (lanes - 1) * EV.sav
  const celok: Cel[] = []
  const vonalak = new VonalEpito()
  const feliratok: Felirat[] = []
  /** The formation delay of the diagram's time position `x` (in cells, 0..n): the cursor builds from the earliest year to now. */
  const kesAt = (x: number): number => korl(x / n, 0, 1)
  const savok: { idoszak: Idoszak; z: number; xA: number; xB: number; tart: boolean }[] = []

  idoszakok.forEach((per, i) => {
    const k = g.csatornak[i]
    const z = zOf(i)
    const xA = k.kezd * EV.cella
    const xB = k.vege * EV.cella
    const cs = Math.min(i, CSOPORT_MAX - 1)
    const hot = k.tart ? 0.9 : 0.25
    savok.push({ idoszak: per, z, xA, xB, tart: k.tart })
    // the high part: one segment per year cell, so the cursor builds it cell by cell and every cell's particles stream in the direction time runs
    for (let c = k.kezd; c < k.vege; c++) {
      celok.push({ a: [c * EV.cella, EV.mag, z], d: [EV.cella, 0, 0], gain: 1, kes: kesAt(c), hot, folyas: 0.1, szoras: 0.07, csoport: cs, ismet: Math.max(1, Math.round(EV.cella / 0.45)) })
    }
    // the rising edge, and the falling one (a running period has none: it ends in the "now" ring)
    celok.push({ a: [xA, 0, z], d: [0, EV.mag, 0], gain: 1, kes: kesAt(k.kezd), hot, folyas: 0.35, szoras: 0.06, csoport: cs, ismet: 3 })
    if (k.tart) celok.push({ a: [xB, EV.mag, z], gain: 1, kes: kesAt(n), hot: 1, meret: 1, gyuru: true, csoport: cs })
    else celok.push({ a: [xB, EV.mag, z], d: [0, -EV.mag, 0], gain: 1, kes: kesAt(k.vege), hot, folyas: 0.35, szoras: 0.06, csoport: cs, ismet: 3 })

    // the channel itself, a hairline: low, up at the rising edge, high, down at the falling edge, low again (the data, drawn sharp under the particles)
    const pts: V3[] = [[-0.5, EV.padlo, z], [xA, EV.padlo, z], [xA, EV.mag, z], [xB, EV.mag, z]]
    if (!k.tart) pts.push([xB, EV.padlo, z], [w, EV.padlo, z])
    vonalak.vonal(pts, VONAL_RETEG.szal, k.tart ? VONAL_SZIN.forro : VONAL_SZIN.toll, () => (k.tart ? 0.9 : 0.6))
    // the low state: the lane's baseline over the whole axis (dim), and the drop line of each edge to the year axis in front
    vonalak.seg([-0.5, EV.padlo, z], [w + 0.5, EV.padlo, z], VONAL_RETEG.padlo, VONAL_SZIN.tinta, 0.5)
    vonalak.seg([xA, EV.padlo, z], [xA, EV.padlo, 1.0], VONAL_RETEG.vezeto, VONAL_SZIN.toll, 0.7, 0.1)
    if (!k.tart) vonalak.seg([xB, EV.padlo, z], [xB, EV.padlo, 1.0], VONAL_RETEG.vezeto, VONAL_SZIN.toll, 0.7, 0.1)

    // the lane's name, as the page writes it, ending at the axis' start
    feliratok.push({ szoveg: per.terulet, pont: [-0.55, 0.45, z], tip: 'terulet', sor: 36, kes: Math.max(0, kesAt(k.kezd) - 0.08) })
  })
  // the year cells: a rung of the floor at every cell edge across all the lanes (the "now" edge in the data pen), and the year of each cell on the floor in front
  for (let b = 0; b <= n; b++) {
    const x = b * EV.cella
    vonalak.seg([x, EV.padlo, 1.0], [x, EV.padlo, -zSzel - 0.9], VONAL_RETEG.padlo, b === n ? VONAL_SZIN.toll : VONAL_SZIN.tinta, b === n ? 0.9 : 0.75)
  }
  g.cellak.forEach((ev, c) => feliratok.push({ szoveg: String(ev), pont: [(c + 0.5) * EV.cella, EV.padlo, 1.25], tip: 'ev', kes: kesAt(c) }))
  // crop marks around the diagram (the look's frame: drawn where the look asks for one)
  for (const [x, zz, sx, sz] of [[-0.7, 1.2, 1, -1], [w + 0.7, 1.2, -1, -1], [-0.7, -zSzel - 1.1, 1, 1], [w + 0.7, -zSzel - 1.1, -1, 1]] as const) {
    vonalak.seg([x, EV.padlo, zz], [x + 0.6 * sx, EV.padlo, zz], VONAL_RETEG.keret, VONAL_SZIN.tinta, 0.8)
    vonalak.seg([x, EV.padlo, zz], [x, EV.padlo, zz + 0.6 * sz], VONAL_RETEG.keret, VONAL_SZIN.tinta, 0.8)
  }

  const K = kulcsok(n, lanes)
  const dur = 0.3
  const csoportok = new Float32Array(CSOPORT_MAX * 4)
  for (let i = 0; i < CSOPORT_MAX; i++) csoportok[i * 4 + 3] = 1
  const cellaAt = (x: number): number => korl(Math.floor(x / EV.cella), 0, n - 1)
  const futnak = (c: number): number => g.csatornak.filter((k) => c >= k.kezd && c < k.vege).length
  const ora = (pl: number): number => (1 + dur) * sm(0.02, 0.5, pl)
  const pose = (pl: number, asp: number): { eye: V3; tgt: V3 } => {
    const a = sm(0, 0.3, pl)
    const b = sm(0.34, 0.54, pl)
    const eye = kevP(kevP(K.p0[0], K.p1[0], a), K.p2[0], b)
    const tgt = kevP(kevP(K.p0[1], K.p1[1], a), K.p2[1], b)
    // a narrow screen sees less of the width: stand further back (along the line of sight) until the whole diagram fits
    const fit = Math.max(1, 1.6 / Math.max(asp, 0.45))
    return { eye: kevP(tgt, eye, 1 + (fit - 1) * b), tgt }
  }
  return {
    id: 'evek',
    tengely: g,
    savok,
    futnak,
    cella: (pl) => (pl < 0.36 ? cellaAt(pose(pl, 1.6).tgt[0]) : null),
    celok,
    vonalak: vonalak.epit(),
    feliratok,
    resz: 0.4,
    padlo: EV.padlo,
    padloSzel: w / 2 + 1,
    erkezes: normal([1, -0.1, 0.15]),
    tavolsag: 16,
    szoras: 3.5,
    idotartam: dur,
    ero: 1,
    poz(pl, asp) {
      const { eye, tgt } = pose(pl, asp)
      return { eye, tgt, fov: EV.fov, forma: korl(ora(pl) / (1 + dur), 0, 1) }
    },
    ora,
    csoportok: () => csoportok,
    minta: (pl) => (pl < 0.36 ? cellaAt(pose(pl, 1.6).tgt[0]) : null),
    ertek: (pl) => (pl < 0.36 ? futnak(cellaAt(pose(pl, 1.6).tgt[0])) / Math.max(1, lanes) : 0.5),
    feny: () => null,
    padloFeny: () => null,
  }
}

function normal(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}
