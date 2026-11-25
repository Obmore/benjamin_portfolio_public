// The switches of the world: the post-stack passes and the effects (HatasNev) and the layers (RetegNev). (The prototype's anamorphic lens streak is not ported: none of the three looks uses it, their strength is 0.) Pure: no DOM, no GL (the node tests import it).
// A switch is NOT a strength: the strengths are the look's numbers (nezet.ts). A switch only says whether a pass or a layer runs, and `ero` scales the look's own number (1 = as the look says).
// The defaults are all on; the page, the review build and the e2e set a switch through `Vilag.hatas` / `Vilag.reteg` or `Beallitas.hatasok`. Nothing is locked in: the owner has not picked
// which effects stay (the private plan kaland-v2 6), and the real GPU decides what a weak machine keeps (the quality ladder drops the costly ones first, letra.ts).

/** The post-stack passes (bloom, colour fringe, vignette, grain) and the costly effects (depth of field, light shafts, dust, 150,000 particles instead of 60,000). */
export type HatasNev = 'bloom' | 'szegely' | 'vignetta' | 'szemcse' | 'melyseg' | 'fenycsova' | 'por' | 'sok'

export interface HatasKapcsolo {
  /** The pass runs (a switched-off pass costs nothing: bloom off skips the whole bloom chain when no other pass needs it). */
  be: boolean
  /** A factor on the look's own strength of this pass (1 = as the look says). */
  ero: number
}

export const HATASOK: readonly HatasNev[] = ['bloom', 'szegely', 'vignetta', 'szemcse', 'melyseg', 'fenycsova', 'por', 'sok']

/** The effects with a real cost: a phone and the light tier start without them, and the quality ladder switches them off first (before it lowers the render scale and the particle count). */
export const GAZDAG_HATASOK: readonly HatasNev[] = ['melyseg', 'fenycsova', 'por', 'sok']

export const ALAP_HATASOK: Readonly<Record<HatasNev, HatasKapcsolo>> = {
  bloom: { be: true, ero: 1 },
  szegely: { be: true, ero: 1 },
  vignetta: { be: true, ero: 1 },
  szemcse: { be: true, ero: 1 },
  melyseg: { be: true, ero: 1 },
  fenycsova: { be: true, ero: 1 },
  por: { be: true, ero: 1 },
  sok: { be: true, ero: 1 },
}

/** The layers of the scene: the floor grid with its hour rungs, drop lines and markers; the mirror on the floor; the labels; the glow behind the focus. */
export type RetegNev = 'racs' | 'tukor' | 'felirat' | 'ragyogas'

export const RETEGEK: readonly RetegNev[] = ['racs', 'tukor', 'felirat', 'ragyogas']

/** The mirror is the one layer with a real cost (it draws the strands again); a phone and the light tier start without it and the ladder drops it with the effects. */
export const ALAP_RETEGEK: Readonly<Record<RetegNev, boolean>> = { racs: true, tukor: true, felirat: true, ragyogas: true }

/** A fresh, editable copy of the defaults (the caller may change it at any time). */
export function hatasokMasolat(felulir?: Partial<Record<HatasNev, Partial<HatasKapcsolo>>>): Record<HatasNev, HatasKapcsolo> {
  const ki = {} as Record<HatasNev, HatasKapcsolo>
  for (const n of HATASOK) ki[n] = { ...ALAP_HATASOK[n], ...felulir?.[n] }
  return ki
}
