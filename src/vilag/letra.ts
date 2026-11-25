// The quality ladder: a pure state machine that reads frame intervals and decides when the world steps down. The browser never enters this file (the node tests drive it with synthetic
// frame streams); index.ts feeds it real intervals and carries out the step.
//
// Rules (the private plan kaland-v2 6 and the M0b.2 prototype, kept):
//  - The decision uses the trimmed mean of a window of frames (default 45, the first 5 dropped as warm-up, the 2 slowest dropped as outliers). A median alone hides a 60 Hz display that
//    misses every third frame; the median and the p95 are only reported.
//  - A slow window is NOT blamed on the GPU by itself: a frame rate capped or throttled by the host looks the same in the interval and costs the GPU nothing (it happened on the owner's PC,
//    ~32 fps, unchanged after 28 % fewer pixels). The synchronous GPU cost of a frame decides: over `gpuMax` the GPU is the limit and the ladder steps; below it the frame rate is "capped" and
//    nothing changes. A capped state is re-checked every 10th window.
//  - Steps, in order: first the mirror and the effects off (they are the only layers with a real cost, the private plan kaland-v2 4.1 rule 3: that is the world as the V2 ladder was measured), then
//    the render scale down by 15 % (floor 0.55), then the light tier (half the particles, scale back to 0.8), then, if the GPU cost is over `gpuIker`, the DOM twin (the world closes and the
//    page, which is always complete, is what the visitor has). A phone and the light tier start with the mirror and the effects already off, so they never see the first step.
//  - The ladder only goes down in a session. Freezing it ("Minőség: rögzítve") stops the steps (the review build's key).
import type { Szint } from './tipusok.ts'

export const ORT_MAX = 20.5
export const GPU_MAX = 14
export const GPU_IKER = 26
export const SKALA_MIN = 0.55
export const ABLAK = 45
export const ELDOBOTT_ELEJE = 5
export const ELDOBOTT_LASSU = 2

export type LetraLepes =
  /** A fast window: nothing to do. */
  | { tipus: 'rendben'; ort: number }
  /** Slow, but the GPU is not the limit: the host caps or throttles the frame rate. Nothing changes. */
  | { tipus: 'kap'; ort: number; gpu: number }
  /** Slow while the ladder is frozen (the review build's key): nothing changes. */
  | { tipus: 'rogzitve'; ort: number }
  /** Slow and over budget, but already at the bottom tier and not bad enough for the twin: it stays. */
  | { tipus: 'marad'; ort: number; gpu: number }
  /** Slow and over budget: the mirror and the effects go off (the first step; the particle count falls back to the base 60,000 with them). */
  | { tipus: 'hatasKi'; ort: number; gpu: number }
  | { tipus: 'skala'; ort: number; gpu: number; skala: number }
  | { tipus: 'konnyu'; ort: number; gpu: number; skala: number }
  | { tipus: 'iker'; ort: number; gpu: number }

export interface LetraBeallitas {
  /** Starting tier (a phone starts light). */
  szint: Szint
  /** The mirror and the effects are on at the start (the ladder's first step switches them off). Default false: a ladder without that rung, as in V2. */
  hatasok?: boolean
  ablak?: number
  gpuMax?: number
  gpuIker?: number
  skalaMin?: number
}

export interface Ablakmeres {
  median: number
  ort: number
  p95: number
}

/** The statistics of a closed window of intervals in ms: the first `ELDOBOTT_ELEJE` are warm-up and dropped, the mean also drops the `ELDOBOTT_LASSU` slowest. */
export function ablakStat(dts: readonly number[]): Ablakmeres {
  const s = dts.slice(ELDOBOTT_ELEJE).sort((a, b) => a - b)
  const n = s.length
  const levagott = s.slice(0, Math.max(1, n - ELDOBOTT_LASSU))
  return { median: s[n >> 1], p95: s[Math.floor(n * 0.95)], ort: levagott.reduce((a, b) => a + b, 0) / levagott.length }
}

export class Letra {
  szint: Szint
  /** The mirror and the effects are still on (the ladder's first step has not happened). */
  hatasok: boolean
  skala = 1
  kap = false
  rogzitve = false
  /** Closed windows so far. */
  ablak = 0
  utolso: Ablakmeres | null = null
  utolsoGpu: number | null = null
  private readonly meret: number
  private readonly gpuMax: number
  private readonly gpuIker: number
  private readonly skalaMin: number
  private dts: number[] = []

  constructor(b: LetraBeallitas) {
    this.szint = b.szint
    this.hatasok = b.hatasok ?? false
    this.meret = b.ablak ?? ABLAK
    this.gpuMax = b.gpuMax ?? GPU_MAX
    this.gpuIker = b.gpuIker ?? GPU_IKER
    this.skalaMin = b.skalaMin ?? SKALA_MIN
  }

  /** Forget the open window (after the tab was hidden or a measurement ran: those frames say nothing about the load). */
  nullaz(): void {
    this.dts = []
  }

  /**
   * Feeds one frame interval in ms. Returns null while a window is open; when it closes, what the ladder decided.
   * `koltseg` measures the synchronous GPU cost of a frame in ms; it is called only when a slow window needs it (it stalls the GPU for a fraction of a second).
   */
  kocka(dtMs: number, koltseg: () => number): LetraLepes | null {
    this.dts.push(dtMs)
    if (this.dts.length < this.meret) return null
    const st = ablakStat(this.dts)
    this.dts = []
    this.utolso = st
    this.ablak++
    if (st.ort <= ORT_MAX) {
      this.kap = false
      return { tipus: 'rendben', ort: st.ort }
    }
    if (this.rogzitve) return { tipus: 'rogzitve', ort: st.ort }
    if (this.kap && this.ablak % 10 !== 0) return { tipus: 'kap', ort: st.ort, gpu: this.utolsoGpu ?? 0 }
    const gpu = koltseg()
    this.utolsoGpu = gpu
    if (gpu <= this.gpuMax) {
      this.kap = true
      return { tipus: 'kap', ort: st.ort, gpu }
    }
    this.kap = false
    if (this.hatasok) {
      this.hatasok = false
      return { tipus: 'hatasKi', ort: st.ort, gpu }
    }
    if (this.skala > this.skalaMin + 1e-6) {
      this.skala = Math.max(this.skalaMin, this.skala * 0.85)
      return { tipus: 'skala', ort: st.ort, gpu, skala: this.skala }
    }
    if (this.szint === 'teljes') {
      this.szint = 'konnyu'
      this.skala = 0.8
      return { tipus: 'konnyu', ort: st.ort, gpu, skala: this.skala }
    }
    if (gpu > this.gpuIker) return { tipus: 'iker', ort: st.ort, gpu }
    return { tipus: 'marad', ort: st.ort, gpu }
  }
}
