// The chapter timeline and the progress state. The visitor's only navigation is depth (wheel, touch, keys, the slider, the route lane all set the same number), and depth is time:
// 0 is the opening, 1 is the end of the route. Pure: no DOM, no GL (the node tests import it).
import { korl, sm } from './matek.ts'

export type FejezetId = 'gepadat' | 'honlap' | 'evek' | 'palyazat' | 'kapcsolat'

export interface Fejezet {
  id: FejezetId
  /** The route position where the chapter takes over (the readout, the active mark of the route lane, the twin's chapter). */
  tol: number
  /** Where the route lane's key takes the visitor: the place where the chapter reads best (its end state), not its first frame. */
  nyugalom: number
  /** The scene that draws it (src/vilag/index.ts holds the scenes by id). Several chapters may share a scene. */
  jelenet: string
}

/**
 * The route is one number, 0 to 1, and five chapters on it. A SCENE draws one or two chapters; the scenes follow each other with a hand-over: while the visitor passes a boundary the old scene
 * thins out and the new one forms (both are drawn, each with its own camera, added together; `gain` below is each one's weight).
 *
 * The first scene is chapters 1 and 2 (the particle scene of V2 and V3): it runs over the first `ELSO_SZAKASZ` of the route as its own 0..1, so every number written for it (the picture forms from
 * 0.55, is complete at 0.97, the camera's flight is over at 0.22) is still true in its own progress. `ATMENET_KOZEP` are the centres of the three hand-overs, `ATMENET_FEL` their half width.
 */
export const ELSO_SZAKASZ = 0.4
export const ATMENET_KOZEP = [0.43, 0.64, 0.84] as const
export const ATMENET_FEL = 0.035

/**
 * The route. Chapter 1 "Gépadat": the camera opens wide on the trace and flies back along the ribbon. Chapter 2 "Honlap": the same particles settle into the client page's block means.
 * (In the first scene's own progress the picture starts to form at 0.55 and is complete at 0.97; the chapter takes over at 0.9, where M0b switched its readout, so the readout names what is on screen. Its route key sits a hair before the
 * first hand-over begins, so at the key nothing of the next scene is drawn yet.)
 * Chapter 3 "Évek" is the timing diagram of the years, chapter 4 "Pályázat" the dossier's sheets, chapter 5 "Kapcsolat" the address the particles write. Each has a scene of its own (a formation scene, kepzes.ts).
 */
export const FEJEZETEK: readonly Fejezet[] = [
  { id: 'gepadat', tol: 0, nyugalom: 0, jelenet: 'reszecskek' },
  { id: 'honlap', tol: 0.9 * ELSO_SZAKASZ, nyugalom: ELSO_SZAKASZ - 0.01, jelenet: 'reszecskek' },
  { id: 'evek', tol: ATMENET_KOZEP[0], nyugalom: 0.56, jelenet: 'evek' },
  { id: 'palyazat', tol: ATMENET_KOZEP[1], nyugalom: 0.76, jelenet: 'palyazat' },
  { id: 'kapcsolat', tol: ATMENET_KOZEP[2], nyugalom: 1, jelenet: 'kapcsolat' },
]

/** A scene's stretch of the route: its own progress `pl` runs 0..1 from `tol` to `ig`. */
export interface Szakasz {
  jelenet: string
  tol: number
  ig: number
}

const SZINTEK = ['reszecskek', 'evek', 'palyazat', 'kapcsolat'] as const
export const SZAKASZOK: readonly Szakasz[] = SZINTEK.map((jelenet, i) => ({
  jelenet,
  tol: i === 0 ? 0 : ATMENET_KOZEP[i - 1] - ATMENET_FEL,
  ig: i === 0 ? ELSO_SZAKASZ : i < ATMENET_KOZEP.length ? ATMENET_KOZEP[i] + ATMENET_FEL : 1,
}))

/** A scene that is on screen at route position `p`: its own progress and its weight (1 inside its chapter, 0 beyond the hand-over). */
export interface LathatoJelenet {
  jelenet: string
  pl: number
  gain: number
}

/** The weight of scene `i` at route position `p`: it comes in over the hand-over before it and goes out over the one after it. */
function szakaszSuly(i: number, p: number): number {
  const be = i === 0 ? 1 : sm(ATMENET_KOZEP[i - 1] - ATMENET_FEL, ATMENET_KOZEP[i - 1] + ATMENET_FEL, p)
  const ki = i >= ATMENET_KOZEP.length ? 1 : 1 - sm(ATMENET_KOZEP[i] - ATMENET_FEL, ATMENET_KOZEP[i] + ATMENET_FEL, p)
  return be * ki
}

/** The scene's own progress at route position `p` (0 before its stretch begins, 1 after it ends). */
export function jelenetPl(jelenet: string, p: number): number {
  const s = SZAKASZOK.find((x) => x.jelenet === jelenet)
  return s ? korl((p - s.tol) / (s.ig - s.tol), 0, 1) : 0
}

/** Every scene with a weight above zero at `p`, with its own progress, in the order they are drawn. At most two overlap, and their weights add up to 1 in a hand-over. */
export function lathatok(p: number): LathatoJelenet[] {
  const ki: LathatoJelenet[] = []
  SZAKASZOK.forEach((s, i) => {
    const gain = szakaszSuly(i, p)
    if (gain <= 0.003) return
    ki.push({ jelenet: s.jelenet, pl: korl((p - s.tol) / (s.ig - s.tol), 0, 1), gain })
  })
  return ki
}

/** How visible each chapter's caption is at route position `p` (0..1): the first two as they were (the first scene's own progress), the others from the hand-over before them until the one after (a caption starts only once the one before it has gone, so two never print over each other). */
export function cimLathato(id: FejezetId, p: number): number {
  const pl1 = p / ELSO_SZAKASZ
  switch (id) {
    case 'gepadat':
      return 1 - sm(0.3, 0.55, pl1)
    case 'honlap':
      return sm(0.72, 0.92, pl1) * szakaszSuly(0, p)
    case 'evek':
      return sm(ATMENET_KOZEP[0] + 0.5 * ATMENET_FEL, ATMENET_KOZEP[0] + 3 * ATMENET_FEL, p) * (1 - sm(ATMENET_KOZEP[1] - 2 * ATMENET_FEL, ATMENET_KOZEP[1], p))
    case 'palyazat':
      return sm(ATMENET_KOZEP[1] + 0.5 * ATMENET_FEL, ATMENET_KOZEP[1] + 3 * ATMENET_FEL, p) * (1 - sm(ATMENET_KOZEP[2] - 2 * ATMENET_FEL, ATMENET_KOZEP[2], p))
    case 'kapcsolat':
      return sm(ATMENET_KOZEP[2] + 0.5 * ATMENET_FEL, ATMENET_KOZEP[2] + 3 * ATMENET_FEL, p)
  }
}

/** The chapter that is on screen at route position `p`: the last one that has taken over. */
export function fejezetAt(p: number, lista: readonly Fejezet[] = FEJEZETEK): Fejezet {
  let ki = lista[0]
  for (const f of lista) if (p >= f.tol) ki = f
  return ki
}

/** Characteristic smoothing time (seconds) of the critically damped camera spring. */
const SIMA_IDO = 0.35

/** The progress along the route: a target the visitor sets and a critically damped spring value the camera follows. */
export class Halado {
  /** Where the visitor wants to be (0..1). */
  cel: number
  /** Where the camera is (0..1): follows `cel` with a critically damped spring, or equals it when the visitor prefers reduced motion. */
  sima: number
  /** Current velocity of `sima` along the route (route units per second) for the SmoothDamp spring. */
  seb = 0
  /** How fast the camera is moving, smoothed (route units per second): the sound's loudness follows it. */
  mozgas = 0

  constructor(kezdet = 0) {
    this.cel = this.sima = korl(kezdet, 0, 1)
  }

  allit(v: number): void {
    this.cel = korl(v, 0, 1)
  }

  /** Jump without easing (a test, the first frame of a reduced-motion world). */
  ugrik(v: number): void {
    this.cel = this.sima = korl(v, 0, 1)
    this.seb = 0
    this.mozgas = 0
  }

  /** One step of `dt` seconds using a critically damped SmoothDamp spring. `mozdulatlan`: no easing, the camera is where the visitor put it (reduced motion, the calm key). Returns true while the camera is still moving. */
  lep(dt: number, mozdulatlan: boolean): boolean {
    const elozo = this.sima
    if (mozdulatlan) {
      this.sima = this.cel
      this.seb = 0
    } else {
      const omega = 2 / SIMA_IDO
      const x = omega * dt
      const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
      const valt = this.sima - this.cel
      const tmp = (this.seb + omega * valt) * dt
      this.seb = (this.seb - omega * tmp) * e
      this.sima = this.cel + (valt + tmp) * e
      // Clamp to the route bounds [0, 1]; no target-overshoot clamp so a reversal never stops the camera dead.
      if (this.sima < 0) {
        this.sima = 0
        this.seb = 0
      } else if (this.sima > 1) {
        this.sima = 1
        this.seb = 0
      }
      if (Math.abs(this.cel - this.sima) < 1e-4 && Math.abs(this.seb) < 1e-3) {
        this.sima = this.cel
        this.seb = 0
      }
    }
    this.mozgas += (Math.abs(this.sima - elozo) / Math.max(dt, 1e-3) - this.mozgas) * Math.min(1, dt * 8)
    return this.sima !== this.cel || this.seb !== 0
  }
}
