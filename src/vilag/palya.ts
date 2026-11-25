// The route of the particle scene: the ribbon along which the shift's true temperature trace is drawn, the picture it ends in, and the camera that flies from one to the other.
// Pure geometry (no GL, no DOM): the same numbers feed the shaders (as uniforms), the readout under the camera, the sound and the node tests.
//
// World units: the ribbon runs from z = 0 (the newest minute) back to z = -LZ (the oldest); the centre line's height IS the data (value, normalised, times AMPY), its sideways
// wander (`cx`) is dressing. The picture hangs at z = ZP, behind the ribbon's far end.
import { korl, sm, type V3 } from './matek.ts'
import { KAMERA_NYITAS, kameraAt, type Kamera } from './nezet.ts'

export const FOV = (50 * Math.PI) / 180
/** The ribbon's length in world units. */
export const LZ = 60
/** The picture's z. */
export const ZP = -66
/** The picture's width in world units. */
export const PICW = 10
/** Particles per picture cell. */
export const PPC = 12
/** The height range of the ribbon's centre line. */
export const AMPY = 4
/** The camera's z at the start of the route. */
export const KAMERA_ELOL = 6
/** The floor under the ribbon: its height, and its half width. */
export const PADLO = -3.4
export const GX = 8
/** The picture stands on that floor: the gap between its bottom edge and the floor, so that the reflection starts a hair below it. */
export const PIC_RES = 0.35
/** How far below the picture's centre the camera's eye is when it stops in front of it (a stage view: the floor and the reflection come into the frame). */
export const PIC_SZEM = 0
/** The lens shift at the end (normalised device coordinates): the picture rides high in the frame so that the floor and its reflection come into view without tilting the camera. */
export const PIC_SHIFT = 0.2
/** The share of the view's height the picture fills at the end (the rest is the stage: floor, reflection, air). */
export const PIC_ARANY = 0.56
/** The route position where the camera's move from the wide opening into the flight is over. */
export const REPULES_VEGE = 0.22

/** The sideways wander of the ribbon: dressing, a fixed function of position (no randomness). */
export const cx = (u: number): number => 2.2 * Math.sin(u * 9) + 0.9 * Math.sin(u * 23 + 1.3)

export interface Palya {
  /** The series' own range. */
  min: number
  max: number
  /** The index of the series' maximum and minimum (the first one, as `indexOf` finds it). */
  iMax: number
  iMin: number
  /** The ribbon position of minute `i` (0 = the newest minute, 1 = the oldest) and its z. */
  uIdx(i: number): number
  zIdx(i: number): number
  /** The minutes that are a full hour of the demo's clock (`kezdetPerc` + i divisible by 60), then the last minute (the run ends where the shift changes). */
  oraIdx: readonly number[]
  /** The value at position u (0 = newest minute, 1 = oldest), interpolated like the shader does, normalised to 0..1 between the series' minimum and maximum. */
  vnAt(u: number): number
  /** A point of the centre line. */
  szalag(u: number): { x: number; y: number }
  /** The picture's height in world units, and the height of its centre (it stands on the floor). */
  hp: number
  picY: number
  /** How far in front of the picture the camera stops so that the picture fills the view (depends on the aspect). */
  endTav(asp: number): number
  /** The camera at route position p (without the pointer's parallax, which the engine adds) and how far the picture has formed (0..1). `kam` is the look's camera (the V2 numbers by default);
   * `elore` is how far ahead it looks right now (the light shafts start from there); `shift` is the lens shift. */
  poz(p: number, asp: number, kam?: Kamera): { eye: V3; tgt: V3; forma: number; zc: number; elore: number; shift: number }
  /** The index into the series of the sample under the camera at route position p. */
  index(p: number, asp: number): number
}

/** The route for a series and a picture grid (`oszlop` x `sor` blocks); `kezdetPerc` is the demo minute of the series' first value (for the hour marks). */
export function palya(ertekek: readonly number[], oszlop: number, sor: number, kezdetPerc = 0): Palya {
  const N = ertekek.length
  const min = Math.min(...ertekek)
  const max = Math.max(...ertekek)
  const uIdx = (i: number): number => 1 - i / (N - 1)
  const oraIdx: number[] = []
  for (let i = 0; i < N; i++) if ((kezdetPerc + i) % 60 === 0) oraIdx.push(i)
  oraIdx.push(N - 1)
  const vnAt = (u: number): number => {
    const f = (1 - korl(u, 0, 1)) * (N - 1)
    const i0 = Math.floor(f)
    const fr = f - i0
    const i1 = Math.min(i0 + 1, N - 1)
    return ((1 - fr) * ertekek[i0] + fr * ertekek[i1] - min) / (max - min)
  }
  const szalag = (u: number) => ({ x: cx(u), y: (vnAt(u) - 0.5) * AMPY })
  const hp = (PICW * sor) / oszlop
  const picY = PADLO + PIC_RES + hp / 2
  const endTav = (asp: number): number => Math.max(10, (hp * 0.5) / Math.tan(FOV / 2) / PIC_ARANY, (PICW * 0.5) / (Math.tan(FOV / 2) * asp) / 0.9)
  const zc = (p: number, asp: number): number => KAMERA_ELOL - p * (KAMERA_ELOL - (ZP + endTav(asp)))
  return {
    min,
    max,
    iMax: ertekek.indexOf(max),
    iMin: ertekek.indexOf(min),
    uIdx,
    zIdx: (i) => -uIdx(i) * LZ,
    oraIdx,
    vnAt,
    szalag,
    hp,
    picY,
    endTav,
    poz(p, asp, kam = KAMERA_NYITAS) {
      const w = sm(0.55, 0.95, p)
      const z = zc(p, asp)
      const c0 = szalag(korl(-z / LZ, 0, 1))
      const ko = sm(0, REPULES_VEGE, p) // from the wide three-quarter view that shows the trace to the flight beside the strands
      const [offX, offY, elore] = kameraAt(kam, ko)
      const cT = szalag(korl(-(z - elore) / LZ, 0, 1))
      return {
        eye: [(c0.x + offX) * (1 - w), (c0.y + offY) * (1 - w) + (picY + PIC_SZEM) * w, z],
        tgt: [cT.x * (1 - w), cT.y * (1 - w) + picY * w, (z - elore) * (1 - w) + ZP * w],
        forma: sm(0.55, 0.97, p),
        zc: z,
        elore,
        shift: PIC_SHIFT * w,
      }
    },
    index(p, asp) {
      const u0 = korl(-zc(p, asp) / LZ, 0, 1)
      return Math.round((1 - u0) * (N - 1))
    },
  }
}
