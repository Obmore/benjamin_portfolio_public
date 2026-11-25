// The strings of the adventure world ("Kaland", the private plan kaland-v2; the copy and its claims are the private plan kaland-szovegek, section numbers below).
//
// Two kinds of string live here, marked as in that file:
//   J  approved wording of the live site: IMPORTED from where it lives, never retyped, so the world and the page cannot drift apart.
//   Ú  a proposal, [copy: owner]: the owner has not approved it. The world's bundle is not linked from any page until the entry (thread V7) exists, and V7 must not link it
//      before the Ú strings below are approved. Nothing here ships to a visitor today.
// A number that is data is never typed in a sentence: the readouts, the shift's clock times and the twin's range sentence are functions of src/content/mintak.ts.
import { VALLALKOZO } from './alapadatok.ts'
import { JEL } from './fooldal.ts'
import { GEPADAT_MAX, GEPADAT_MIN, MINTAK, gepadatIdo } from './mintak.ts'

const NBSP = '\u{a0}'
/** The decimal comma and the true minus sign of the site's numbers (the demo prints "51,5"). */
const szam = (x: number): string => x.toFixed(1).replace('.', ',').replace('-', '\u{2212}')
/** A demo minute counted from midnight as the demo's own clock prints it ("6:00"). */
const ora = (perc: number): string => `${Math.floor(perc / 60) % 24}:${String(perc % 60).padStart(2, '0')}`

const HONLAP_PAR = JEL.nyito.parok.find((p) => p.id === 'honlap')
const GEPADAT_PAR = JEL.nyito.parok.find((p) => p.id === 'gepadat')
const GEPADAT_MUNKA = JEL.munkak.tetelek.find((m) => m.id === 'adatgyujto')
const HONLAP_MUNKA = JEL.munkak.tetelek.find((m) => m.id === 'lelek-es-nyelv')
if (!HONLAP_PAR || !GEPADAT_PAR || !GEPADAT_MUNKA || !HONLAP_MUNKA) throw new Error('kaland: the first screen no longer has the Honlap or the Gépadat pair')

const { gepadat, honlap } = MINTAK
const EGYSEG = `${NBSP}${gepadat.egyseg}`
/** The shift as the demo labels it: from the first reading to the demo's own shift-change announcement. */
const MUSZAK = `${ora(gepadat.kezdetPerc)}\u{2013}${ora(gepadat.muszakValtas.perc)}`

export const KALAND = {
  /** Controls and states (section 4.1). All Ú. */
  vezerlok: {
    /** The world's region name; the canvas itself is aria-hidden and the twin is the accessible copy. */
    nev: 'Térbeli nézet',
    kilepes: { felirat: 'Sima oldal', nev: 'Vissza a sima oldalra' },
    hang: 'Hang',
    nyugodt: { felirat: 'Nyugodt', nev: 'Nyugodt nézet' },
    ut: 'Az út',
    csuszka: 'Mélység (idő)',
    betoltes: 'Betöltés',
    hiba: 'A térbeli nézet most nem indult el. Az oldal így is teljes.',
  },
  /** The contact line the world never hides. J: "Levelet írok" and the address are the home page's own. */
  kapcsolat: { felirat: JEL.kapcsolat.link, cim: VALLALKOZO.email, href: `mailto:${VALLALKOZO.email}` },
  /** Chapter 1, "Gépadat" (section 4.3). The title, the simulated notice and the link are J; the sentence and the readout format are Ú. */
  gepadat: {
    cim: GEPADAT_PAR.kulcs,
    szimulalt: JEL.nyito.gepadat.szimulalt,
    mondat: `A bemutató ${gepadat.gep} gépének orsóhőmérséklete a délelőtti műszakban (${MUSZAK}), percenként.`,
    /** The live readout under the camera, "7:42 · 52,3 °C": the clock and the number come from the series. */
    olvasat: (i: number): string => `${gepadatIdo(i)} \u{b7} ${szam(gepadat.ertekek[i])}${EGYSEG}`,
    /**
     * The labels hung in the scene (all Ú): the clock of an hour, the value at an hour, the maximum and the minimum with their times, and the end of the run where the demo announces the
     * shift change. Every one is a function of the series; the twin lists the same strings (`ikerCim` and the lines hud.ts builds from these), so a label's fact is never only in the picture.
     */
    feliratok: {
      ora: (i: number): string => gepadatIdo(i),
      ertek: (i: number): string => `${szam(gepadat.ertekek[i])}${EGYSEG}`,
      csucs: (i: number): string => `csúcs ${szam(gepadat.ertekek[i])}${EGYSEG} \u{b7} ${gepadatIdo(i)}`,
      melypont: (i: number): string => `mélypont ${szam(gepadat.ertekek[i])}${EGYSEG} \u{b7} ${gepadatIdo(i)}`,
      muszakvaltas: `${ora(gepadat.muszakValtas.perc)} műszakváltás`,
      /** The picture's dimension lines (they are the chapter 2 labels, kept with the others because they hang in the same scene): the blocks across and down. */
      szeles: `${honlap.racs.oszlop}${NBSP}blokk`,
      magas: `${honlap.racs.sor}${NBSP}blokk`,
    },
    /** The heading of the twin's list of those facts (Ú). */
    ikerCim: 'Az óránkénti mérések és a szélsőértékek',
    /** The twin's range sentence; both numbers are computed from the series. */
    ikerOsszegzes: `Az orsóhőmérséklet ${MUSZAK.replace('\u{2013}', ' és ')} között ${szam(GEPADAT_MIN)} és ${szam(GEPADAT_MAX)}${EGYSEG} között mozgott. ${JEL.nyito.gepadat.szimulalt}`,
    link: GEPADAT_MUNKA.link,
  },
  /** Chapter 2, "Honlap" (section 4.4). The title, the sentence, the alt text and the link are J; the sample note and the readout are Ú. */
  honlap: {
    cim: HONLAP_PAR.kulcs,
    mondat: HONLAP_PAR.mondat,
    alt: JEL.nyito.honlap.kep.alt,
    minta: 'A kép mintákból áll: mindegyik az oldalkép egy kis részének átlagszíne.',
    /** The twin's sentence for the two dimension lines drawn beside the picture (the same two strings as their labels) (Ú). */
    meretek: `A kép ${honlap.racs.oszlop}${NBSP}blokk széles és ${honlap.racs.sor}${NBSP}blokk magas.`,
    olvasat: `A kliens honlapja \u{b7} ${honlap.racs.oszlop} \u{d7} ${honlap.racs.sor} blokk \u{b7} ${honlap.racs.oszlop * honlap.racs.sor} minta`,
    link: HONLAP_MUNKA.link,
  },
} as const
