// The strings of the adventure world ("Kaland", the private plan kaland-v2; the copy and its claims are the private plan kaland-szovegek, section numbers below).
//
// Two kinds of string live here, marked as in that file:
//   J  approved wording of the live site: IMPORTED from where it lives, never retyped, so the world and the page cannot drift apart.
//   Ú  a proposal, [copy: owner]: the owner has not approved it. The world's bundle: the home page's entry (V7a) links it; the Ú strings are proposals the owner approves
//      before the site's production switch.
// A number that is data is never typed in a sentence: the readouts, the shift's clock times and the twin's range sentence are functions of src/content/mintak.ts.
import { HIVAS_LEVEL, VALASZIDO, VALLALKOZO, levelCim } from './alapadatok.ts'
import { szolgaltatasLevel } from './csomagok.ts'
import { JEL } from './fooldal.ts'
import { GEPADAT_MAX, GEPADAT_MIN, MINTAK, gepadatIdo } from './mintak.ts'
import { EVEK } from './munkaim.ts'
import { IDOVONAL, evSzoveg } from './tapasztalat.ts'

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

if (typeof VALASZIDO !== 'string') throw new Error('kaland: the response time is no longer a plain sentence')

/**
 * The one sentence of chapter 4 that can be swapped (kaland-szovegek.md 4.6, D2): he writes and submits the application and carries the technical part and the documentation through the whole path.
 * If his EV's registered activities turn out not to cover writing and submitting, the narrow sentence below takes its place, and the sheets "Megírás" and "Beadás" go with it.
 */
export const PALYAZAT_VALLALAS = 'Pályázatnál az egész utat vállalom: megírom a pályázatot, beadom, és a műszaki részt meg a dokumentációt végigviszem.'
export const PALYAZAT_VALLALAS_SZUK = 'Pályázatnál a műszaki részt és a dokumentációt viszem végig az egész úton. A pályázatot nem én írom, és nem én adom be.'

const { gepadat, honlap } = MINTAK
const EGYSEG = `${NBSP}${gepadat.egyseg}`
/** The shift as the demo labels it: from the first reading to the demo's own shift-change announcement. */
const MUSZAK = `${ora(gepadat.kezdetPerc)}\u{2013}${ora(gepadat.muszakValtas.perc)}`

export const KALAND = {
  /** Ú: the entry button on the home page (section 4.1). */
  belepes: { gomb: 'Bejárom az oldalt' },
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
  /**
   * The contact line the world never hides (the link at the foot of every chapter), and chapter 5, "Kapcsolat" (section 4.7). J: "Levelet írok", the address, the response time, the talk request and the
   * heading question are the live page's own, imported; the chapter's name is the page's own nav word. The address is real text and a real link here and in the twin: the particles of chapter 5 only draw it.
   */
  kapcsolat: {
    felirat: JEL.kapcsolat.link,
    href: `mailto:${VALLALKOZO.email}`,
    cim: JEL.nav.kapcsolat,
    /** The address (J). */
    adat: VALLALKOZO.email,
    /** The page's own heading question for its contact end (J). */
    mondat: JEL.kapcsolat.cim,
    valaszido: VALASZIDO,
    beszelgetes: { felirat: HIVAS_LEVEL.felirat, href: levelCim(HIVAS_LEVEL) },
  },
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
  /**
   * Chapter 3, "Évek" (section 4.5): the live page's timing diagram as a scene. The title, the table heads, the rows and the closing sentence are J (imported: the page's own words and data);
   * the sentence under the title and the readout formats are Ú. A number in a readout is data (the years of the axis, how many periods run in a year), never typed.
   */
  evek: {
    cim: EVEK.cim,
    /** Ú: what the picture is (each lane is one row of the page's table; the newest start is in front; time runs from left to right). */
    mondat: 'Minden sáv egy időszak, elöl a legutóbbi. Az évek balról jobbra telnek.',
    tablazat: EVEK.tablazat,
    /** The twin's table: the year text and the area, row for row as the page has them (J, import). */
    sorok: IDOVONAL.map((i) => ({ ev: evSzoveg(i), terulet: i.terulet })),
    /** The closing sentence of the page's "Évek" section (J, import): the world keeps it where the page has it. */
    zaro: EVEK.zaro,
    /** The readout while the camera follows the years: the year under it and how many periods run in it (Ú format). */
    olvasat: (ev: number, futnak: number): string => `${ev} \u{b7} ${futnak}${NBSP}időszak`,
    /** The readout once the whole diagram is in view: the span of the axis and the number of periods (Ú format). */
    osszkep: (elso: number, utolso: number, db: number): string => `${elso}\u{2013}${utolso} \u{b7} ${db}${NBSP}időszak`,
  },
  /**
   * Chapter 4, "Pályázat" (section 4.6). All Ú: it is released only when the owner has checked his EV's activities and approved these strings (D9). One sentence is the swap (`PALYAZAT_VALLALAS`);
   * the narrow fallback is `PALYAZAT_VALLALAS_SZUK`. The sheets follow the sentence's own order (writing, submitting, the technical part, the documentation); there is no sheet for anything he did not name,
   * no call, no sum, no odds, no fee, no price, nothing about outside help.
   */
  palyazat: {
    cim: 'Pályázat',
    vallalas: PALYAZAT_VALLALAS,
    lapok: [
      { cim: 'Megírás', mondat: 'Megírom a pályázatot.' },
      { cim: 'Beadás', mondat: 'Beadom a pályázatot.' },
      { cim: 'Műszaki rész', mondat: 'A műszaki részt elkészítem.' },
      { cim: 'Dokumentáció', mondat: 'A műszaki dokumentációt az egész úton elkészítem.' },
    ],
    hatar: 'Hogy a pályázat nyer-e, azt a kiíró dönti. Nyerést nem ígérek.',
    /** The mail link of the chapter: the page's "Levelet írok" with the subject pattern of the service cards ("Érdeklődés: …"). */
    level: { felirat: JEL.kapcsolat.link, nev: 'Levelet írok a pályázatról', href: levelCim(szolgaltatasLevel('pályázat')) },
    /** The twin's heading of the list of sheets. */
    ikerCim: 'A pályázat lapjai',
  },
} as const
