// The chapter timeline and the progress state. The visitor's only navigation is depth (wheel, touch, keys, the slider, the route lane all set the same number), and depth is time:
// 0 is the opening, 1 is the end of the route. Pure: no DOM, no GL (the node tests import it).
import { korl } from './matek.ts'

export type FejezetId = 'gepadat' | 'honlap'

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
 * The route. Chapter 1 "Gépadat": the camera opens wide on the trace and flies back along the ribbon. Chapter 2 "Honlap": the same particles settle into the client page's block means.
 * (The picture starts to form at 0.55 and is complete at 0.97; the chapter takes over at 0.9, where M0b switched its readout, so the readout names what is on screen.)
 * V4 "Évek", V5 "Kapcsolat" and V6 "Pályázat" add entries here, a scene each (a scene is an object with a camera pose and a draw call; see jelenet.ts), and move the numbers.
 */
export const FEJEZETEK: readonly Fejezet[] = [
  { id: 'gepadat', tol: 0, nyugalom: 0, jelenet: 'reszecskek' },
  { id: 'honlap', tol: 0.9, nyugalom: 1, jelenet: 'reszecskek' },
]

/** The chapter that is on screen at route position `p`: the last one that has taken over. */
export function fejezetAt(p: number, lista: readonly Fejezet[] = FEJEZETEK): Fejezet {
  let ki = lista[0]
  for (const f of lista) if (p >= f.tol) ki = f
  return ki
}

/** The progress along the route: a target the visitor sets and a smoothed value the camera follows. */
export class Halado {
  /** Where the visitor wants to be (0..1). */
  cel: number
  /** Where the camera is (0..1): eases toward `cel`, or equals it when the visitor prefers reduced motion. */
  sima: number
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
    this.mozgas = 0
  }

  /** One step of `dt` seconds. `mozdulatlan`: no easing, the camera is where the visitor put it (reduced motion, the calm key). Returns true while the camera is still moving. */
  lep(dt: number, mozdulatlan: boolean): boolean {
    const elozo = this.sima
    this.sima = mozdulatlan ? this.cel : this.sima + (this.cel - this.sima) * (1 - Math.exp(-dt * 5))
    if (Math.abs(this.cel - this.sima) < 1e-4) this.sima = this.cel
    this.mozgas += (Math.abs(this.sima - elozo) / Math.max(dt, 1e-3) - this.mozgas) * Math.min(1, dt * 8)
    return this.sima !== this.cel
  }
}
