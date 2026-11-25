// The looks of the world (the private plan kaland-v2 4.1). A look is DATA: a handful of numbers (light, camera, layers, effects). The three looks the owner approved keeping, Mérőműszer, Színpad
// and Áramlás, are rows of numbers; the route holds keyframes on the depth slider (`KULCSKOCKAK`) and the look at a place on the route is the interpolation of its two neighbours, so a
// chapter takes a look and the change from one to the next is a cross-fade of numbers. The discrete switches of the prototype (comets, grid, mirror, labels) are GAINS (0..1) so they can cross-fade
// too. Pure: no DOM, no GL (the node tests import it). Every colour stays a token (one hue); a look carries no colour.
//
// The numbers (the prototype's M0b.4 names, so the art rounds can speak of them):
//   sp strand spread, hz haze spread, ex data exposure, sz sprite size, fl and pw brightness floor and power (height -> brightness), hm hot-mix power, th thread gain,
//   pe picture exposure, bl bloom and blE its fall at the picture, vg vignette, xp overall exposure, szeg colour fringe, szem grain,
//   sh light shafts, ap depth-of-field aperture and bok its size cap, du dust gain,
//   ln comets gain (0 = points, 1 = hairline comets along the flow; both are drawn while it is between), len a comet's length (fraction of the ribbon), tail its tail's brightness,
//   gr floor grid gain, gr2 drop lines gain, mk markers on the true extremes, rf mirror gain, lb labels (1: hours and extremes, 2: also the value at each hour), gl glow behind the focus, hl thread tube,
//   cu curtain (the hairlines from the thread to the floor, a sheet of light made of the true samples), fr the picture's frame (crop marks, ticks, dimension lines), fe the picture's light spilling on the floor.
// The camera's offsets belong to the look: `kamera` = the offset sideways, up and the look-ahead at the wide opening, then the same three in the flight.
import { korl, sm } from './matek.ts'
import type { HatasKapcsolo, HatasNev, RetegNev } from './hatasok.ts'
import { ELSO_SZAKASZ } from './idovonal.ts'

export type NezetId = 'muszer' | 'szinpad' | 'aramlas'

/** x, y offset of the camera from the thread and how far ahead it looks: at the wide opening (first three), then in the flight (last three). */
export type Kamera = readonly [number, number, number, number, number, number]

export const NEZET_SZAMOK = [
  'sp', 'hz', 'ex', 'sz', 'fl', 'pw', 'hm', 'th', 'pe', 'bl', 'blE', 'vg', 'xp', 'szeg', 'szem', 'sh', 'ap', 'bok', 'du', 'ln', 'len', 'tail', 'gr', 'gr2', 'mk', 'rf', 'lb', 'gl', 'hl', 'cu', 'fr', 'fe',
] as const
export type NezetSzam = (typeof NEZET_SZAMOK)[number]

export type Nezet = Readonly<Record<NezetSzam, number>> & { readonly kamera: Kamera }

/** The camera of the first look: wide three-quarter view, then the flight beside the strands (the V2 engine's own numbers). */
export const KAMERA_NYITAS: Kamera = [-9, 3.6, 26, -1.9, 1.1, 11]

/** Mérőműszer, an instrument: a readable 3D line chart wrapped by sparks (tight strands, the floor with real hours, value labels at every hour, a faint mirror). */
const MUSZER: Nezet = {
  sp: 0.5, hz: 1.8, ex: 0.4, sz: 0.85, fl: 0.08, pw: 1.6, hm: 2.5, th: 2.0, pe: 0.75, bl: 0.5, blE: 0.85, vg: 0.75, xp: 1, szeg: 0.006, szem: 0.03,
  sh: 0, ap: 0.04, bok: 0.02, du: 0.012, ln: 0, len: 0, tail: 0.1,
  gr: 1, gr2: 1, mk: 1, rf: 0.25, lb: 2, gl: 0.25, hl: 0.4, cu: 1, fr: 0, fe: 0,
  kamera: KAMERA_NYITAS,
}

/** Színpad, a stage: dark, deep, a glossy floor, light shafts, a low camera looking far down the ribbon. */
const SZINPAD: Nezet = {
  sp: 0.8, hz: 2.0, ex: 0.4, sz: 1, fl: 0.1, pw: 1.4, hm: 2, th: 1.8, pe: 0.75, bl: 0.6, blE: 0.85, vg: 0.85, xp: 1, szeg: 0.006, szem: 0.03,
  sh: 1.3, ap: 0.07, bok: 0.03, du: 0.012, ln: 0, len: 0, tail: 0.1,
  gr: 0.7, gr2: 0.3, mk: 0.6, rf: 0.9, lb: 1, gl: 0.3, hl: 0.4, cu: 0.4, fr: 1, fe: 1,
  kamera: [-5.5, 0.4, 34, -1.6, 0.2, 14],
}

/** Áramlás, the flow: the strands as hairline comets along the time direction, a close camera beside the stream. */
const ARAMLAS: Nezet = {
  sp: 0.7, hz: 2.0, ex: 0.22, sz: 1, fl: 0.15, pw: 1.4, hm: 2, th: 1.8, pe: 0.75, bl: 0.7, blE: 0.85, vg: 0.75, xp: 1, szeg: 0.006, szem: 0.03,
  sh: 0, ap: 0, bok: 0.02, du: 0.012, ln: 1, len: 0.012, tail: 0.04,
  gr: 0.5, gr2: 0, mk: 0.6, rf: 0.4, lb: 1, gl: 0.3, hl: 0.4, cu: 0.6, fr: 0, fe: 0,
  kamera: [-3.5, 1.6, 20, -1.2, 0.6, 9],
}

export const NEZETEK: Readonly<Record<NezetId, Nezet>> = { muszer: MUSZER, szinpad: SZINPAD, aramlas: ARAMLAS }

/** The look's name as the review build prints it. */
export const NEZET_NEV: Readonly<Record<NezetId, string>> = { muszer: 'Mérőműszer', szinpad: 'Színpad', aramlas: 'Áramlás' }

export interface Kulcskocka {
  /** The route position (0..1) where the look is exactly this one. */
  p: number
  nezet: NezetId
}

/**
 * The keyframes on the route (`p`, 0..1 over ALL five chapters, in order). The first scene (chapters 1 and 2) runs over the first `ELSO_SZAKASZ` of the route as its own 0..1, so its keyframes
 * are written in that progress and scaled: the wide opening is Mérőműszer (a readable chart, real hours, real extremes) and, as the camera goes into the flight (its own move is over by 0.22),
 * it cross-fades to Áramlás (hairline comets); chapter 2 "Képernyő" is Színpad, which is complete before the picture is (the picture forms 0.55 to 0.97 of the first scene).
 * Then the chapters of the formation scenes, as the owner approved the mapping (the private plan kaland-v2 4.1): Évek is the Mérőműszer idiom again (a labelled axis, a grid, a faint mirror),
 * Pályázat is Színpad (the sheets are objects: depth, a floor, light) and Kapcsolat is Áramlás (the signal arrives: comets converge and settle into the address). The keyframes between
 * the chapters sit inside the hand-overs (idovonal.ts `ATMENET_KOZEP`), so a look changes while one scene thins out and the next forms.
 */
export const KULCSKOCKAK: readonly Kulcskocka[] = [
  { p: 0, nezet: 'muszer' },
  { p: 0.22 * ELSO_SZAKASZ, nezet: 'aramlas' },
  { p: 0.5 * ELSO_SZAKASZ, nezet: 'aramlas' },
  { p: 0.85 * ELSO_SZAKASZ, nezet: 'szinpad' },
  { p: ELSO_SZAKASZ, nezet: 'szinpad' },
  { p: 0.46, nezet: 'muszer' },
  { p: 0.6, nezet: 'muszer' },
  { p: 0.69, nezet: 'szinpad' },
  { p: 0.8, nezet: 'szinpad' },
  { p: 0.88, nezet: 'aramlas' },
  { p: 1, nezet: 'aramlas' },
]

const kev = (a: number, b: number, t: number): number => a + (b - a) * t

/** The blend of two looks, `t` 0 (a) to 1 (b). Every number moves linearly in `t`, the camera too. */
export function nezetKever(a: Nezet, b: Nezet, t: number): Nezet {
  const k = korl(t, 0, 1)
  const ki = {} as Record<NezetSzam, number>
  for (const n of NEZET_SZAMOK) ki[n] = kev(a[n], b[n], k)
  const kamera = a.kamera.map((x, i) => kev(x, b.kamera[i], k)) as unknown as Kamera
  return { ...ki, kamera }
}

/** Which two keyframes surround route position `p`, and how far between them (eased with a smoothstep, so a change starts and ends gently). */
function szakasz(p: number, kulcs: readonly Kulcskocka[]): { a: Kulcskocka; b: Kulcskocka; t: number } {
  const x = korl(p, 0, 1)
  let i = 0
  while (i < kulcs.length - 2 && x >= kulcs[i + 1].p) i++
  const a = kulcs[i]
  const b = kulcs[Math.min(i + 1, kulcs.length - 1)]
  const t = b.p > a.p ? sm(a.p, b.p, x) : 0
  return { a, b, t }
}

/** The look at route position `p`: before the first keyframe and after the last it is that keyframe's look. */
export function nezetAt(p: number, kulcs: readonly Kulcskocka[] = KULCSKOCKAK): Nezet {
  const { a, b, t } = szakasz(p, kulcs)
  if (a.nezet === b.nezet || t <= 0) return NEZETEK[a.nezet]
  if (t >= 1) return NEZETEK[b.nezet]
  return nezetKever(NEZETEK[a.nezet], NEZETEK[b.nezet], t)
}

/** The look that weighs most at `p` (the review line and the CI name it). */
export function nezetNev(p: number, kulcs: readonly Kulcskocka[] = KULCSKOCKAK): NezetId {
  const { a, b, t } = szakasz(p, kulcs)
  return t < 0.5 ? a.nezet : b.nezet
}

/** The camera's offset from the thread and its look-ahead at `ko` (0 = the wide opening, 1 = the flight). */
export function kameraAt(k: Kamera, ko: number): readonly [number, number, number] {
  return [kev(k[0], k[3], ko), kev(k[1], k[4], ko), kev(k[2], k[5], ko)]
}

/**
 * The look as it is drawn: the switches (hatasok.ts) turn a number into 0, or scale it. A pass or a layer that is off has strength 0 and costs nothing (the draw is skipped when its strength is 0).
 * The particle count (`sok`) is not a number of the look: the engine picks it.
 */
export function hatasos(n: Nezet, h: Readonly<Record<HatasNev, HatasKapcsolo>>, r: Readonly<Record<RetegNev, boolean>>): Nezet {
  const g = (nev: HatasNev): number => (h[nev].be ? Math.max(0, h[nev].ero) : 0)
  return {
    ...n,
    bl: n.bl * g('bloom'),
    szeg: n.szeg * g('szegely'),
    vg: n.vg * g('vignetta'),
    szem: n.szem * g('szemcse'),
    ap: n.ap * g('melyseg'),
    sh: n.sh * g('fenycsova'),
    du: n.du * g('por'),
    gr: r.racs ? n.gr : 0,
    gr2: r.racs ? n.gr2 : 0,
    mk: r.racs ? n.mk : 0,
    rf: r.tukor ? n.rf : 0,
    lb: r.felirat ? n.lb : 0,
    gl: r.ragyogas ? n.gl : 0,
    cu: r.racs ? n.cu : 0,
    fr: r.racs ? n.fr : 0,
    fe: r.ragyogas ? n.fe : 0,
  }
}
