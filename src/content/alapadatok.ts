import type { Ertek } from './kerdes'

// A vállalkozó adatai. Forrás: impresszum/index.html (Ekertv. 4. §, 2026-10-14) és
// a projekt törzsdokumentuma (EV_alapadatok.md, „Ki és mi”, 2026-11-04).
export const VALLALKOZO = {
  nev: 'Ott Benjámin',
  /** Impresszum: „Ott Benjámin egyéni vállalkozó”. */
  jogiNev: 'Ott Benjámin egyéni vállalkozó',
  /** Evtv. 16. § (4): az egyéni vállalkozó nevében az „e.v.” megjelölés (a levelezési lábléc is így). */
  rovidNev: 'Ott Benjámin e.v.',
  szakma: 'villamosmérnök, szoftverfejlesztő',
  /** Where the work is done: the country (Benjámin, 2026-11-17). The seat is `szekhely` below. */
  helyszin: 'Magyarország',
  /** The inflected form ("in Hungary"), stored as data: no Hungarian suffix is built in code. */
  helyszinOn: 'Magyarországon',
  /** Impresszum: nyilvántartási szám (egyéni vállalkozók nyilvántartása). */
  nyilvantartasiSzam: '59492319',
  /** Impresszum: adószám. */
  adoszam: '90312599-1-40',
  email: 'ott.benjamin.ev@ottbenjamin.hu',
  /** Csak a strukturált adat sameAs mezőjében; az oldalon nem jelenik meg (Benjámin, 2026-11-04). */
  linkedin: 'https://www.linkedin.com/in/benjaminottee',
  /** Székhely az impresszum szerint. */
  szekhely: { utca: 'Kossuth utca 32.', iranyitoszam: '8944', telepules: 'Sárhida' },
} as const

/** The area line of the home page's type table, also drawn on the controller's nameplate: one source (no "távfelügyelet", 2026-11-18). */
export const TERULET = 'adatgyűjtés, kommunikáció'

export const SITE_URL = 'https://ottbenjamin.hu'

// Ekertv. 4. §: a nyilvántartást vezető szerv. Benjámin döntése, 2026-11-05: a NAV (az egyéni vállalkozók
// nyilvántartását a sajtó szerint 2027-01-01-től az MKIK veszi át – akkor frissíteni kell).
export const NYILVANTARTO: Ertek = 'Nemzeti Adó- és Vámhivatal'

// Benjámin döntése, 2026-11-05: telefonszám nincs az oldalon (a kapcsolat írásban; a levél láblécében ott van).
export const TELEFON: Ertek<{ kijelzett: string; href: string }> = null

// Benjámin döntése, 2026-11-05: a levelező bot fix visszaigazolásával egyezően.
export const VALASZIDO: Ertek = 'A következő munkanap végéig válaszolok.'

// 2026-11-05 konverziós gyorsjavítás, Benjámin jóváhagyta, 2026-11-05: a hősök „15 perces beszélgetést kérek” linkje előre kitöltött levelet nyit
// (a tárgy oldalanként: `${HIVAS_LEVEL.targy} – <téma>`; a főoldalon csak a `targy`). A mondat az ügyfél szavaival szól, két időpontot kér.
export const HIVAS_LEVEL = {
  felirat: '15 perces beszélgetést kérek',
  targy: '15 perces beszélgetés',
  torzs: 'Jó napot kívánok!\n\nEgy 15 perces beszélgetést kérnék. Kérem, küldjön két időpontot.\n\nCégünk és honlapunk:\n',
} as const

/** Előre kitöltött levél a látogató saját levelezőjében (mailto). */
export function levelCim(level: { targy: string; torzs?: string }): string {
  const body = level.torzs === undefined ? '' : `&body=${encodeURIComponent(level.torzs)}`
  return `mailto:${VALLALKOZO.email}?subject=${encodeURIComponent(level.targy)}${body}`
}
