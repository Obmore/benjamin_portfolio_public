// What a "formation" scene is made of (kepzes.ts draws it): a list of TARGETS the particles settle into and a list of static LINES, both built from true data by pure functions (evek.ts,
// palyazat.ts, kapcsolat.ts), so the node tests can check every number. Pure: no DOM, no GL.
//
// A target is a short segment (or a point): the particles that belong to it spread along it, stream along it when it has a flow, and arrive from far away along the scene's arrival direction when
// the scene forms. Four RGBA32F texels per target (the shader reads them with texelFetch, 1024 texels a row):
//   0  x y z of the segment's start, gain (brightness of its particles)
//   1  the segment (dx dy dz, 0 = a point), formation delay (0..1 on the scene's formation clock)
//   2  hot mix (0 data pen, 1 hot pen), sprite size factor, flow (fraction of the segment per second, 0 = still), spread (radius around the segment)
//   3  group (0..7, the scene moves and dims groups as a whole), ring (1 = a reticle ring instead of a particle), 0, 0
import type { Felirat } from './feliratok.ts'
import type { V3 } from './matek.ts'
import type { Kamera } from './nezet.ts'

/** Texels per target record, floats per record, and the texture's row width in texels. */
export const CEL_TEXEL = 4
export const CEL_FLOAT = CEL_TEXEL * 4
export const CEL_SZEL = 1024
/** How many groups a scene can move and dim as wholes (the shader's uniform array). */
export const CSOPORT_MAX = 8

export interface Cel {
  a: V3
  /** The segment's direction and length; left out or zero: a point. */
  d?: V3
  gain?: number
  /** Formation delay, 0..1: the target starts to form when the scene's formation clock passes it. */
  kes?: number
  /** 0 data pen, 1 hot pen. */
  hot?: number
  /** Sprite size factor. */
  meret?: number
  /** Fraction of the segment a particle travels per second (0: still). */
  folyas?: number
  /** Radius of the strand around the segment. */
  szoras?: number
  csoport?: number
  /** A reticle ring (a measuring mark) instead of particles. */
  gyuru?: boolean
  /** How many copies of the record (a longer segment gets more, so the density along it stays even): at least 1. */
  ismet?: number
}

/** The records packed for the texture, copies expanded. */
export function celTomb(lista: readonly Cel[]): { adat: Float32Array; db: number } {
  let db = 0
  for (const c of lista) db += Math.max(1, Math.round(c.ismet ?? 1))
  const adat = new Float32Array(db * CEL_FLOAT)
  let i = 0
  for (const c of lista) {
    const n = Math.max(1, Math.round(c.ismet ?? 1))
    const d = c.d ?? [0, 0, 0]
    const rec = [c.a[0], c.a[1], c.a[2], c.gain ?? 1, d[0], d[1], d[2], c.kes ?? 0, c.hot ?? 0, c.meret ?? 1, c.folyas ?? 0, c.szoras ?? 0.1, c.csoport ?? 0, c.gyuru ? 1 : 0, 0, 0]
    for (let k = 0; k < n; k++) adat.set(rec, i++ * CEL_FLOAT)
  }
  return { adat, db }
}

/** The layers of the static lines, in the order the look's gains apply: the floor (`gr`), guides and drop lines (`gr2`), frames and crop marks (`fr`), the thread (the look's thread gain). */
export const VONAL_RETEG = { padlo: 0, vezeto: 1, keret: 2, szal: 3 } as const
/** The colour class of a line: 0 the neutral structure token, 1 the data pen, 2 the hot pen. */
export const VONAL_SZIN = { tinta: 0, toll: 1, forro: 2 } as const
/** Floats per line vertex: x y z, layer, colour class, gain. */
export const VONAL_KULCS = 6

export interface Vonalak {
  adat: Float32Array
  /** First vertex and vertex count of each layer (0..3); the segments are sorted by layer. */
  tol: readonly number[]
  db: readonly number[]
}

/** Collects line segments and hands them back sorted by layer. */
export class VonalEpito {
  private readonly rt: number[][] = [[], [], [], []]

  /** One segment from a to b: both ends carry the same colour class; the gain may differ at the two ends (a ramp). */
  seg(a: V3, b: V3, reteg: number, szin: number, gain: number, gainB: number = gain): void {
    this.rt[reteg].push(a[0], a[1], a[2], reteg, szin, gain, b[0], b[1], b[2], reteg, szin, gainB)
  }

  /** A polyline through the points (consecutive pairs become segments); `gain(i)` is the gain at point i. */
  vonal(pontok: readonly V3[], reteg: number, szin: number, gain: (i: number) => number): void {
    for (let i = 0; i + 1 < pontok.length; i++) this.seg(pontok[i], pontok[i + 1], reteg, szin, gain(i), gain(i + 1))
  }

  epit(): Vonalak {
    const all: number[] = []
    const tol: number[] = []
    const db: number[] = []
    for (const r of this.rt) {
      tol.push(all.length / VONAL_KULCS)
      db.push(r.length / VONAL_KULCS)
      for (const x of r) all.push(x)
    }
    return { adat: new Float32Array(all), tol, db }
  }
}

/** A deterministic [0, 1) from integers (the same integer hash idea as the shaders: no Math.random anywhere in the world). */
export function hash01(a: number, b = 0, c = 0): number {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0
  h = (h ^ (h >>> 15)) >>> 0
  return h / 4294967296
}

/** What a formation scene is: its data (targets, lines, labels) and how the camera moves, written in the scene's own progress `pl` (0..1 over its window of the route, idovonal.ts). */
export interface KepzesAdat {
  id: string
  celok: readonly Cel[]
  vonalak: Vonalak
  feliratok: readonly Felirat[]
  /** The share of the engine's particle count this scene draws (the tier's budget times this). */
  resz: number
  /** The floor's height (the mirror folds about it) and half width (the floor's lines fade toward its edges). */
  padlo: number
  padloSzel: number
  /** The way the particles TRAVEL when they arrive (a unit vector: they start upstream of their target, against it), how far upstream they start, and the radius of the unformed cloud. */
  erkezes: V3
  tavolsag: number
  szoras: number
  /** How long (on the formation clock) a target takes to settle: a target with delay `kes` is settled when the clock is `kes + idotartam`. */
  idotartam: number
  /** The scene's exposure: a factor on every particle's brightness (the scene's own calibration, since the number of targets sets how many particles share the picture). */
  ero: number
  /** The camera at progress `pl` for a viewport aspect, and how far the scene has formed (0..1: the post stack calms its bloom as it does). `kam` is the look's camera, which a formation scene does not use. */
  poz(pl: number, asp: number, kam: Kamera): { eye: V3; tgt: V3; fov: number; shift?: number; forma: number }
  /** The formation clock at progress `pl`, from 0 to `1 + idotartam` (a target with delay `kes` begins when it passes `kes`); the lines and the labels come in with it. */
  ora(pl: number): number
  /** The movement and brightness of each group at `pl`: dx, dy, dz, alpha (CSOPORT_MAX rows of 4). */
  csoportok(pl: number): Float32Array
  /** The sample under the camera at `pl` (the readout and the twin name it), or null. */
  minta(pl: number, asp: number): number | null
  /** The value under the camera between 0 and 1 (the sound sings it), or null. */
  ertek(pl: number, asp: number): number | null
  /** A world point the light shafts start from at `pl`, or null (no light); and where the scene's light lands on the floor (a world point on the floor and its strength 0..1), or null. */
  feny(pl: number): V3 | null
  padloFeny(pl: number): { pont: V3; ero: number } | null
}
