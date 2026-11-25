// The types of the world's public face (src/vilag/index.ts) and the pieces the modules pass around.

/** The quality tier: the full world, or the light one (half the particles, a cheaper post stack). Below the light tier there is no tier: the world closes and the page is the twin. */
export type Szint = 'teljes' | 'konnyu'

/** Why the world closed itself or was closed. */
export type BezarOk = 'kulcs' | 'esc' | 'letra' | 'kontextus' | 'hiba' | 'api'

/**
 * The CI hook. The page never sets it; the e2e spec and the review build do. It changes only what the world ADMITS or MEASURES, never what it draws.
 * - szoftveres: admit a software renderer (SwiftShader in CI) and a context with a performance caveat. Software frames are void for judging speed or look.
 * - leptek: run the quality ladder even on a software renderer (the gate would otherwise skip it).
 * - ablak: the ladder's window in frames (default 45), so a test can close windows quickly.
 * - koltsegMax: the synchronous GPU cost in ms above which a slow interval is blamed on the GPU (default 14).
 * - koltseg: replaces the measured GPU cost (a number, in ms), so a test can drive the ladder deterministically.
 */
export interface Proba {
  szoftveres?: boolean
  leptek?: boolean
  ablak?: number
  koltsegMax?: number
  koltseg?: number
}

import type { HatasKapcsolo, HatasNev, RetegNev } from './hatasok.ts'
import type { NezetId } from './nezet.ts'
export type { HatasKapcsolo, HatasNev, RetegNev } from './hatasok.ts'
export type { NezetId } from './nezet.ts'

export interface Beallitas {
  /** Where the world's root element is added (default: the end of the body). */
  hely?: HTMLElement
  /**
   * The page the world covers, if it runs over one: made `inert` while the world is open (no focus, no assistive-technology tree), because the world's own text twin is the accessible
   * copy of what it shows, and restored when the world closes. The ordinary page, complete as it is, is what the visitor has the moment the world closes.
   */
  lap?: HTMLElement | null
  /** The element that opened the world: it gets the focus back when the world closes. */
  nyito?: HTMLElement | null
  /** Called once each time the world closes, whoever closed it. */
  bezarva?: (ok: BezarOk) => void
  /** Show the diagnostic line (renderer, compile time, frame times, ladder steps) and the "Mérés" and "Minőség" keys. Off for visitors; the review build turns it on. */
  diagnosztika?: boolean
  proba?: Proba
  /** Switches and factors of the post-stack passes and the effects, over the defaults (ALAP_HATASOK: all on, factor 1 = as the look says). Not decided; nothing is locked in. */
  hatasok?: Partial<Record<HatasNev, Partial<HatasKapcsolo>>>
  /** The layers (floor grid, mirror, labels, glow), over the defaults (all on). A phone and the light tier start without the mirror and the effects whatever this says about the defaults. */
  retegek?: Partial<Record<RetegNev, boolean>>
}

/** A loading stage the loader scene counts. */
export interface Lepes {
  nev: string
  kesz: boolean
}

export interface Allapot {
  /** uj: made; keszul: preparing; kesz: prepared, closed; nyitva: showing; hiba: failed for good (the page is the twin). */
  fazis: 'uj' | 'keszul' | 'kesz' | 'nyitva' | 'hiba'
  hiba: string | null
  lepesek: { kesz: number; osszes: number; nevek: readonly string[] }
  renderer: string
  szint: Szint
  skala: number
  p: number
  fejezet: string
  kepkockak: number
  fordit: number | null
  median: number | null
  ort: number | null
  p95: number | null
  gpu: number | null
  kap: boolean
  rogzitve: boolean
  ablak: number
  megjegyzesek: readonly string[]
  hang: boolean
  nyugodt: boolean
  nyitott: boolean
  hatasok: Readonly<Record<HatasNev, HatasKapcsolo>>
  retegek: Readonly<Record<RetegNev, boolean>>
  /** The look that weighs most at the camera's place (or the pinned one), and the pinned look if the review build pinned one. */
  nezet: NezetId
  nezetRogzitett: NezetId | null
  /** The particles the scene draws now. */
  db: number
  /** The size the canvas really has, in device pixels. */
  vaszon: { w: number; h: number }
}

export interface Vilag {
  /** Stage two: the GL context, the parallel shader compile, the textures. Idempotent. Rejects with the reason when the gate refuses; the page then stays as it is. */
  elokeszit(): Promise<void>
  /** Shows the world. If it is not prepared yet the loader scene counts the real stages until it is. Rejects when preparing failed. */
  megnyit(): Promise<void>
  /** Hides the world and gives the focus back; the prepared state stays, so opening again is instant. */
  bezar(ok?: BezarOk): void
  /** Closes and frees everything (GL resources, audio, the root element). */
  megsemmisit(): void
  /** Moves the camera to a place on the route (0 to 1); the smoothing still applies unless `azonnal` is set or the visitor prefers reduced motion. */
  allit(p: number, azonnal?: boolean): void
  /** Switches a post-stack pass or an effect on or off and, if given, sets its factor on the look's own strength; takes effect on the next frame. */
  hatas(nev: HatasNev, be: boolean, ero?: number): void
  /** Switches a layer (floor grid, mirror, labels, glow) on or off; takes effect on the next frame. */
  reteg(nev: RetegNev, be: boolean): void
  /** Pins a look for every place on the route (the review build's keys), or `null` to let the route's keyframes choose. The light tier always takes Mérőműszer. */
  nezet(id: NezetId | null): void
  /** Draws the loader scene at a fixed progress (0 to 1 of the run) instead of the world, or `null` to let the world be drawn again. A test and the review build use it to look at the loader without waiting for one. */
  toltesKep(arany: number | null): void
  /** A copy of the current state (the CI reads it; nothing is global). */
  allapot(): Allapot
  /** The "Mérés" key: the median synchronous GPU cost of one frame for eight fixed configurations, as printed lines. A few seconds; the review build calls it, the visitor never does. */
  merj(n?: number): Promise<string[]>
}
