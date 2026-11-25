import type { AmountKey } from '../data/pricing'

export interface Link {
  felirat: string
  href: string
}

export interface Ar {
  /** Az összeg mindig a src/data/pricing.ts-ből jön. */
  osszeg: AmountKey
  /** Az összeg utáni szöveg, pl. „-tól, egyszeri díj” vagy „/ 20 termék, próbakör”. */
  utotag: string
}

export interface Level {
  targy: string
  torzs: string
}

export interface KapcsolatSzoveg {
  cim: string
  szoveg: string
  gomb: string
  level: Level
}

/** Upper-cases the first letter (a sentence that starts with a legal-act name stored in lower case). */
export const nagybetuvel = (s: string) => s[0].toUpperCase() + s.slice(1)

/** The risk-reversal promise on every entry package (owner's decision, 2026-11-10). The package's own "Első rész: …" clause comes from its segment file (`hos.garancia`). */
export const GARANCIA_MONDAT = 'Ha az első rész nem válik be, nem fizet.'
