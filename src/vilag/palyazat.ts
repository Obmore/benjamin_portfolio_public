// Chapter 4, "Pályázat": the dossier's sheets, one per thing the owner said he does (the copy file kaland-szovegek.md 4.6): the sheets stand on a stage floor in a gentle arc, each made of particles (a
// heading bar and rows of "text" streaming slowly along them), with a hairline frame and crop marks, a path line along their feet joining them in the order of the sentence ("megírom, beadom, a műszaki
// részt és a dokumentációt végigviszem") and a light that moves from sheet to sheet. Pure: no DOM, no GL.
// What carries meaning: the number of the sheets, their order and their words (they come from src/content/kaland.ts, nothing is typed here). What is dressing: the rows of "text" (a fixed hash of the sheet
// and the row: they say nothing, they are what a page looks like), the pile the sheets start in, the light, the floor. No sheet exists for anything the owner did not name.
import { CSOPORT_MAX, VONAL_RETEG, VONAL_SZIN, VonalEpito, hash01, type Cel, type KepzesAdat } from './cel.ts'
import type { Felirat } from './feliratok.ts'
import { korl, kevP, sm, type V3 } from './matek.ts'

/** A sheet's size (the A-series ratio), the gap between the sheets across the arc, how far it floats above the floor, and the camera's field of view. */
export const LAP = { sz: 3.1, mag: 4.38, kozt: 3.9, emel: 0.25, fov: (46 * Math.PI) / 180 } as const

export interface LapSzoveg {
  cim: string
  mondat: string
}

export interface PalyazatAdat extends KepzesAdat {
  /** The sheets: where each stands (centre of its foot) and its turn about the vertical axis. */
  lapok: readonly { x: number; z: number; forgas: number; szoveg: LapSzoveg }[]
  /** The sheet the light is on at progress `pl` (a real number between 0 and the last index); the readout names the nearest. */
  fokusz(pl: number): number
}

/** A sheet's local point (`u` across from the centre, `v` up from the floor) in world space. */
function lapPont(x: number, z: number, th: number, u: number, v: number): V3 {
  return [x + u * Math.cos(th), v, z - u * Math.sin(th)]
}

const normal = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

export function palyazatAdat(lapok: readonly LapSzoveg[]): PalyazatAdat {
  const S = lapok.length
  const kozep = (S - 1) / 2
  const pos = lapok.map((szoveg, k) => ({ x: (k - kozep) * LAP.kozt, z: -Math.abs(k - kozep) * 0.7, forgas: -(k - kozep) * 0.16, szoveg }))
  const celok: Cel[] = []
  const vonalak = new VonalEpito()
  const feliratok: Felirat[] = []
  const sorok = 10
  const be = 0.3 // the margin inside the sheet
  const szeles = LAP.sz - 2 * be
  pos.forEach((l, k) => {
    const cs = Math.min(k, CSOPORT_MAX - 1)
    const kes0 = 0.2 * k
    const alja = LAP.emel
    const tetej = LAP.emel + LAP.mag
    // the heading bar (hot, thick) and the rows, painted from the top down; every fifth row is left out (a paragraph break) and the last row of a paragraph is short
    celok.push({ a: lapPont(l.x, l.z, l.forgas, -LAP.sz / 2 + be, tetej - 0.6), d: [szeles * 0.55 * Math.cos(l.forgas), 0, -szeles * 0.55 * Math.sin(l.forgas)], gain: 0.7, kes: kes0, hot: 0.75, meret: 1.2, folyas: 0.04, szoras: 0.03, csoport: cs, ismet: 5 })
    for (let sor = 0; sor < sorok; sor++) {
      if (sor % 5 === 4) continue
      const rovid = sor % 5 === 3
      const hossz = (rovid ? 0.42 : 0.74 + 0.26 * hash01(k + 1, sor)) * szeles
      const v = tetej - 1.25 - sor * 0.3
      celok.push({
        a: lapPont(l.x, l.z, l.forgas, -LAP.sz / 2 + be, v),
        d: [hossz * Math.cos(l.forgas), 0, -hossz * Math.sin(l.forgas)],
        gain: 0.75,
        kes: kes0 + 0.1 + 0.1 * (sor / sorok),
        hot: 0.15,
        meret: 0.55,
        folyas: 0.05,
        szoras: 0.025,
        csoport: cs,
        ismet: Math.max(1, Math.round(hossz / 0.5)),
      })
    }
    // the sheet's frame (the outline, with crop marks standing off its corners) moves with the sheet's group
    const sz = VONAL_SZIN.toll + 4 * cs
    const sarok: V3[] = [lapPont(l.x, l.z, l.forgas, -LAP.sz / 2, alja), lapPont(l.x, l.z, l.forgas, LAP.sz / 2, alja), lapPont(l.x, l.z, l.forgas, LAP.sz / 2, tetej), lapPont(l.x, l.z, l.forgas, -LAP.sz / 2, tetej)]
    vonalak.vonal([...sarok, sarok[0]], VONAL_RETEG.keret, sz, () => 0.9)
    for (const [i, c] of sarok.entries()) {
      const ux = i === 0 || i === 3 ? -1 : 1
      const vy = i < 2 ? -1 : 1
      const k1 = lapPont(l.x, l.z, l.forgas, ux * (LAP.sz / 2 + 0.28), c[1])
      const k2: V3 = [c[0], c[1] + vy * 0.28, c[2]]
      vonalak.seg(c, k1, VONAL_RETEG.keret, VONAL_SZIN.tinta + 4 * cs, 0.7, 0.1)
      vonalak.seg(c, k2, VONAL_RETEG.keret, VONAL_SZIN.tinta + 4 * cs, 0.7, 0.1)
    }
    // the foot of the sheet on the path line: a ring (the stop on the way)
    celok.push({ a: [l.x, 0, 1.3], gain: 1, kes: kes0 + 0.15, hot: 0.6, meret: 0.9, gyuru: true, csoport: cs })
    // the sheet's title above it and its sentence below, as the copy file words them; they come in once the sheets have settled apart
    feliratok.push({ szoveg: l.szoveg.cim, pont: [l.x, tetej + 0.5, l.z], tip: 'lapcim', kes: 1.0 + 0.04 * k })
    feliratok.push({ szoveg: l.szoveg.mondat, pont: [l.x, 0.5, l.z + 0.5], tip: 'lapszoveg', sor: 26, kes: 1.02 + 0.04 * k })
  })
  // the path along the sheets' feet, in the order of the sentence (the thread) and the stage floor (rails along the depth, rungs across)
  const xa = pos[0].x - 1.6
  const xb = pos[S - 1].x + 1.6
  vonalak.seg([xa, 0, 1.3], [xb, 0, 1.3], VONAL_RETEG.szal, VONAL_SZIN.toll, 0.8)
  for (let x = Math.ceil(xa / 3) * 3; x <= xb; x += 3) vonalak.seg([x, 0, 4], [x, 0, -9], VONAL_RETEG.padlo, VONAL_SZIN.tinta, 0.5)
  for (let z = 4; z >= -9; z -= 2) vonalak.seg([xa - 1.5, 0, z], [xb + 1.5, 0, z], VONAL_RETEG.padlo, VONAL_SZIN.tinta, z === 4 ? 0.7 : 0.3)
  // guides: from each sheet's foot to the path
  for (const l of pos) vonalak.seg([l.x, 0, l.z], [l.x, 0, 1.3], VONAL_RETEG.vezeto, VONAL_SZIN.toll, 0.35, 0.8)

  const dur = 0.35
  const ora = (pl: number): number => (1 + dur) * sm(0.02, 0.5, pl)
  /** How far sheet `k` has moved from the pile it starts in to its place (0 in the pile, 1 in place). */
  const hely = (k: number, pl: number): number => sm(0.2 + 0.03 * k, 0.45 + 0.03 * k, pl)
  const fokusz = (pl: number): number => (S - 1) * sm(0.35, 0.7, pl)
  const csoportok = (pl: number): Float32Array => {
    const o = new Float32Array(CSOPORT_MAX * 4)
    for (let i = 0; i < CSOPORT_MAX; i++) o[i * 4 + 3] = 1
    const f = fokusz(pl)
    pos.forEach((l, k) => {
      const t = 1 - hely(k, pl)
      // the pile: every sheet at the middle, one behind the other
      o[k * 4] = -l.x * t
      o[k * 4 + 1] = 0
      o[k * 4 + 2] = (-0.45 * k - l.z) * t
      o[k * 4 + 3] = 0.5 + 0.5 * Math.exp(-((f - k) * (f - k)) / (2 * 0.38 * 0.38))
    })
    return o
  }
  const poz = (pl: number, asp: number): { eye: V3; tgt: V3 } => {
    const w = sm(0.02, 0.46, pl)
    const f = fokusz(pl)
    const lit = pos[korl(Math.round(f), 0, S - 1)]
    const tgt: V3 = [lit.x * 0.2 * w, 1.6, -0.8 * w]
    // wide enough for the whole row of sheets (the half width of the arc plus a sheet), whatever the screen's shape
    const tan = Math.tan(LAP.fov / 2)
    const poolWidth = (S - 1) * LAP.kozt * 0.5 + LAP.sz * 0.75
    const dist = Math.max(15.8, poolWidth / (tan * Math.max(asp, 0.3)) + 1)
    const eyeA: V3 = [0.8, 3.2, 9.5]
    const eyeB: V3 = [lit.x * 0.2, 3.4 + dist * 0.04, dist - 0.8]
    return { eye: kevP(eyeA, eyeB, w), tgt }
  }
  const erkezes = normal([-0.25, -0.35, 0.9])
  return {
    id: 'palyazat',
    lapok: pos,
    fokusz,
    celok,
    vonalak: vonalak.epit(),
    feliratok,
    resz: 0.45,
    padlo: 0,
    padloSzel: xb + 3,
    erkezes,
    tavolsag: 22,
    szoras: 4,
    idotartam: dur,
    ero: 1,
    poz(pl, asp) {
      const { eye, tgt } = poz(pl, asp)
      return { eye, tgt, fov: LAP.fov, forma: 0.7 * korl(ora(pl) / (1 + dur), 0, 1) }
    },
    ora,
    csoportok,
    minta: (pl) => korl(Math.round(fokusz(pl)), 0, S - 1),
    ertek: (pl) => (S <= 1 ? 0.5 : korl(fokusz(pl) / (S - 1), 0, 1)),
    feny(pl) {
      const l = pos[korl(Math.round(fokusz(pl)), 0, S - 1)]
      return [l.x, 7, l.z - 3]
    },
    padloFeny(pl) {
      const f = fokusz(pl)
      const k0 = korl(Math.floor(f), 0, S - 1)
      const k1 = korl(k0 + 1, 0, S - 1)
      const t = f - k0
      const x = pos[k0].x + (pos[k1].x - pos[k0].x) * t
      return { pont: [x, 0, 2.2], ero: 2.5 * sm(0.3, 0.55, pl) }
    },
  }
}
