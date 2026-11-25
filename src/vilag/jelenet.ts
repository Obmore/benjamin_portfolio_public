// What a scene is. The world is ONE persistent canvas and a list of scenes; a chapter names the scene that draws it (idovonal.ts). A scene knows its own geometry, so it gives the camera pose for a
// route position and draws itself; the engine (index.ts) owns the context, the post stack, the clock and the ladder, and hands every frame to the scene as a `Kocka`.
import type { V3 } from './matek.ts'
import type { Felirat } from './feliratok.ts'
import type { Kamera, Nezet } from './nezet.ts'
import type { Szint } from './tipusok.ts'

/** The colours of the world, read once from the site's own tokens (the dark set; the world is a night scene), as linear-light RGB triples. No colour literal lives in the world. */
export interface Szinek {
  /** The data pen (--jel). */
  toll: V3
  /** The hot pen (--jel-forro). */
  forro: V3
  /** The ground (--papir). */
  hatter: V3
  /** The neutral structure colour (--tinta-halk): the floor's rails and rungs. Light stays one hue; structure is neutral. */
  tinta: V3
}

export interface Mutato {
  /** Pointer in normalised device coordinates, eased. */
  x: number
  y: number
  /** 0..1: how much the pointer is a force right now (it is 1 for a moment after the last move, then eases to 0; never idle motion). */
  er: number
}

export interface Poz {
  eye: V3
  tgt: V3
  /** The camera's field of view in radians. */
  fov: number
  /** A lens shift (the picture moves up by this much in normalised device coordinates; 0 or left out: none). */
  shift?: number
}

/** What a frame leaves behind for the layers drawn in the DOM and for the post stack: the matrix and the eye the picture was drawn with, how far the picture has formed, and where the light is. */
export interface Vetites {
  vp: Float32Array
  eye: V3
  forma: number
  /** The light the shafts start from, in uv (0..1, 0 = left / bottom), or null when it is behind the camera. */
  feny: readonly [number, number] | null
  /** Where the picture's light lands on the floor, in uv, with the picture's own mean colour (linear light) times its strength, or null when that place is behind the camera. */
  kep: { u: number; v: number; szin: V3 } | null
  /** A formation scene's clock, in the unit of its targets' delays: a label with a formation delay `kes` comes in as the clock passes it. Left out: every label is in. */
  ora?: number
}

/** Everything a scene needs to draw one frame. */
export interface Kocka {
  gl: WebGL2RenderingContext
  /** The canvas size in device pixels (after the render scale). */
  w: number
  h: number
  /** Pixels per world unit at distance 1: h / (2 tan(fov / 2)). */
  k: number
  /** Seconds of idle animation (0 and frozen under reduced motion). */
  t: number
  kocka: number
  /** Viewport aspect (CSS pixels). */
  asp: number
  /** The scene's own progress, 0..1 over its stretch of the route (idovonal.ts `SZAKASZOK`): the first scene's own numbers are written in it, a formation scene's camera and clock too. */
  p: number
  /** The scene's weight, 0..1: 1 inside its chapter, less while it hands over to the next scene. The scene adds its light with this weight, so the engine can cross-fade two scenes. */
  gain: number
  mutato: Mutato
  szinek: Szinek
  szint: Szint
  /** Particles to draw (the tier's budget; 150,000 with the `sok` effect on, 60,000 without it, 30,000 on the light tier). */
  db: number
  /** The particle count the brightness is calibrated for (the density compensation keeps the picture the same whatever `db` is). */
  dbRef: number
  /** The look at this place on the route with the switches applied (nezet.ts `hatasos`): a pass or a layer that is off has strength 0. */
  nezet: Nezet
  /** The largest point size this GPU draws, in pixels. */
  maxPont: number
  /** 0..1: the atmosphere (strands, dust, the thread's halo) coming in after the world opens; 1 once it is in and for a still world. */
  giris: number
}

export interface Jelenet {
  readonly id: string
  /** The camera for a route position under a look's camera (the pointer's parallax is added by the engine) and how far the scene's picture has formed (0..1: the post stack calms its bloom as it does). */
  poz(p: number, asp: number, kam: Kamera): Poz & { forma: number }
  /** Draws into the currently bound scene target, ADDING its light (the engine has cleared it once for all the scenes of the frame; a scene never clears). Returns what the DOM layers and the post stack need. */
  rajz(k: Kocka, poz: Poz): Vetites
  /** The labels of the scene: real times and real values of its samples, placed in the scene's own space (feliratok.ts). Drawn by the DOM layer, never by GL. */
  readonly feliratok: readonly Felirat[]
  /** The index of the sample under the camera at a route position (the readout and the twin name it), or null when no sample is under it. */
  minta(p: number, asp: number): number | null
  /** The value under the camera between 0 and 1 (the sound sings it), or null when the scene has none here. */
  ertek(p: number, asp: number): number | null
  /** The sample nearest to the pointer on the screen (the probe names it), or null when none is near. Optional: a scene without samples under a pointer leaves it out. */
  szonda?(v: Vetites, sw: number, sh: number, px: number, py: number): { i: number; x: number; y: number } | null
  dispose(): void
}
