import { HIVAS_LEVEL, TERULET, VALLALKOZO } from './alapadatok'
import { altKell, ELO_FELIRAT, ROLLIN_KEP_ALT, teny, type MunkaId } from './munkak'
import { HOM_NYUGALOM, fmt } from '../site/fooldal/jelalak'

// A főoldal minden szövege. Források a blokkok felett; árak csak a src/data/pricing.ts-ből.
// Rövidítések: „megrendeles A/B/D/G” = megrendeles/index.html csomagkártyái (Benjámin jóváhagyott
// katalógusa, e2e/fixtures/catalog-approved.json); „demó” = public/demos/*/index.html és README.
// Pozicionálás, szegmenssorrend és felépítés: Benjámin jóváhagyása, 2026-11-04 este (ernyő-főoldal
// három „ajtóval”, szegmensenként fix terjedelmű, fizetős belépő csomag). A bemutatkozó oldal (2026-11-05)
// szándékosan nem ajtó és nincs átalakító példája: nem találunk ki negyedik előtte-utána példát.

export const META = {
  cim: 'Ott Benjámin – egyedi weboldal és műszaki szoftver',
  leiras:
    'Villamosmérnök és szoftverfejlesztő: egyedi weboldal és műszaki szoftver, a jeltől a böngészőig. Munkák és kipróbálható bemutatók.',
}

// ---------------------------------------------------------------------------------------------------------------------------------
// The home page, direction D "Egy jel útja" (owner decision 2026-11-16: copy direction 1 of the approved concept).
// Every string on the home page is here; the components render it, and the browser chunk takes its texts from the page's own DOM
// (never from a second copy). Facts: the owner's bio, src/content/munkak.ts (works, live links), public/demos (demos).

type MunkaJel = 'qr' | 'panel' | 'temp' | 'speech' | 'charge'

interface FooldalSzoveg {
  cim?: string
  mondat: string
  alt?: string
  jel: MunkaJel
}

/** The home's own wording per work, keyed by the work id (the facts: src/content/munkak.ts); the key order is the order of the keys on the controller. `jel`: which signal the cable carries (the work traces in src/site/fooldal/core.ts). */
const FOOLDAL_MUNKAK = {
  kezikonyv: {
    cim: 'QR-kódos gépkönyv (bemutató)',
    mondat: 'A gépen lévő QR-kódról megnyílik a gép saját kézikönyve, a gyári számához tartozó kiadásban.',
    alt: 'Bemutató: a QR-kódos gépkönyv, a Minta Gépgyár kezelési kézikönyve adattábla QR-kóddal.',
    jel: 'qr',
  },
  lapszabaszat: {
    cim: 'Lapszabászati megrendelőlap (bemutató)',
    mondat: 'A vevő megadja a tételeket, az összesítő azonnal számol, a kész lapot Excelben tölti le.',
    alt: 'Bemutató: lapszabászati megrendelőlap a tételek megadásával.',
    jel: 'panel',
  },
  adatgyujto: {
    cim: 'Gépadatok egy helyen (bemutató)',
    mondat: 'Három gép kártyáján egy helyen látszik a hőmérséklet, az áramfelvétel, a ciklusszám és a darabszám.',
    alt: 'Bemutató: gépadatok egy helyen, kártyákon állapottal, darabszámmal és utolsó hibával.',
    jel: 'temp',
  },
  rollin: {
    mondat: 'Szállodai roller- és kerékpárbérlés dokkoló- és töltőállomásokkal. Csapatban dolgoztam a webes felületen, a szerveren és az állomásszoftveren.',
    alt: ROLLIN_KEP_ALT,
    jel: 'charge',
  },
  'lelek-es-nyelv': {
    mondat: 'Bemutatkozó oldal egy mentálhigiénés segítő és angoltanár számára, a tervtől az üzemeltetésig.',
    alt: 'A Lélek & Nyelv bemutatkozó honlapja.',
    jel: 'speech',
  },
} satisfies Partial<Record<MunkaId, FooldalSzoveg>>

/** The detail picture is under /work/ (16:10: 1200 x 750, Rollin's 922 x 576); a work without one shows its title as text (none today: every work has one since PR 7). */
const JEL_MUNKAK = (Object.keys(FOOLDAL_MUNKAK) as (keyof typeof FOOLDAL_MUNKAK)[]).map((id) => {
  const t = teny(id)
  const m: FooldalSzoveg = FOOLDAL_MUNKAK[id]
  const kulso = t.href.startsWith('http')
  return {
    id,
    cim: m.cim ?? t.nev,
    mondat: m.mondat,
    kep: t.kep && { fajl: `${t.kep.alap.replace('/work/', '')}${t.kep.egyfajl ? '' : '-1200'}.webp`, alt: altKell(t, m.alt) },
    jel: m.jel,
    link: { felirat: kulso ? ELO_FELIRAT : 'Próbálja ki', href: t.href, kulso },
  }
})

/**
 * The reading at the end of each work's trace (the cable run and the first screen show the same strings). The Gépadat reading at rest is the last sample of the demo's own CNC-1 hour
 * (CNC1_HOMERSEKLET: 51,6 °C at 7:00 after its 60-minute warm-up; public/demos/adatgyujto/app.js lines 21, 35-40, 112-113, 191; run, not estimated). Only true figures are shown: the speech
 * trace has no time base (a drawn figure, so no reading) and no document of the Rollin work gives a charge voltage (4,2 V was a generic cell value), so both are empty; the Honlap head cell shows the live address instead.
 */
const JEL_OLVASAT: Record<MunkaJel, string> = { qr: '29 bit', panel: '', temp: `${fmt(HOM_NYUGALOM)} °C`, speech: '', charge: '' }

/** The word before "élő weboldal" in the first screen's subline: "egy", the one live client site the page shows (owner, 2026-11-18). */
const ELO_WEBOLDAL_SZAM = 'egy'

/** The first screen's four pairs (source, screen, trace), in the order of the keys. HONLAP is selected at load and without script. The sentences are the works' own home sentences (FOOLDAL_MUNKAK above). */
const NYITO_PAROK = [
  { id: 'honlap', kulcs: 'Honlap', munka: 'lelek-es-nyelv', jel: 'speech', olvasat: JEL_OLVASAT.speech, fejOlvasat: teny('lelek-es-nyelv').href.replace(/^https?:\/\//, '').replace(/\/$/, '') },
  { id: 'rendeles', kulcs: 'Rendelés', munka: 'lapszabaszat', jel: 'panel', olvasat: '', fejOlvasat: teny('lapszabaszat').href },
  { id: 'gepkonyv', kulcs: 'Gépkönyv', munka: 'kezikonyv', jel: 'qr', olvasat: JEL_OLVASAT.qr, fejOlvasat: JEL_OLVASAT.qr },
  { id: 'gepadat', kulcs: 'Gépadat', munka: 'adatgyujto', jel: 'temp', olvasat: JEL_OLVASAT.temp, fejOlvasat: JEL_OLVASAT.temp },
] as const satisfies readonly { id: string; kulcs: string; munka: keyof typeof FOOLDAL_MUNKAK; jel: MunkaJel; olvasat: string; fejOlvasat: string }[]

export type ParId = (typeof NYITO_PAROK)[number]['id']

export const JEL = {
  /** The H1 in its three line boxes (the same for every pair). */
  h1: { sorok: ['Egyedi weboldal', 'és műszaki', 'szoftver.'] as const },
  /** The subline under the H1: the first sentence is bold, and the line ends in a node at it. */
  alcim: {
    elso: 'A jeltől a böngészőig.',
    tovabb: `Kipróbálható bemutatók gépkönyvre, lapszabászati rendelésre és gépadatokra, mellettük ${ELO_WEBOLDAL_SZAM} élő weboldal.`,
  },
  /** The two actions of the first screen: the website one is the key button, the technical-software one the text link. */
  akciok: {
    weboldal: { felirat: 'Weboldalt szeretnék', href: '/megrendeles/#szolgaltatas-bemutatkozo' },
    szoftver: { felirat: 'Műszaki szoftver kell', href: '#kapcsolat' },
  },
  nyito: {
    kulcsok: { nev: 'Válasszon példát' },
    /** The head label of the screen. */
    kijelzo: 'Böngésző',
    /** The sources and screens, one per pair. Values: the demos' own sample data (public/demos/*), the offer record of src/content/szegmensek/bemutatkozo.ts. */
    parok: NYITO_PAROK.map((p) => ({ ...p, mondat: FOOLDAL_MUNKAK[p.munka].mondat })),
    honlap: {
      fej: 'Csomag',
      cim: 'Bemutatkozó oldal',
      sorok: [
        ['Tartalom', 'Legfeljebb hat részből áll, az Ön szövegeiből és fotóiból, mobilon is jól olvasható.'],
        ['Határidő', 'Általában három héten belül kész, ha megkaptam a szövegeket és a fotókat.'],
      ] as const,
      kep: { fajl: 'lelek-es-nyelv-telefon.webp', szelesseg: 780, magassag: 928, alt: FOOLDAL_MUNKAK['lelek-es-nyelv'].alt },
    },
    /** public/demos/lapszabaszat: the sample's first item ("01. tétel": BL-01, Oldallap, 720 x 400, 2 pcs) under the demo's own field labels (public/demos/lapszabaszat/app.js, line 23). */
    rendeles: {
      fej: 'Megrendelőlap',
      cim: '01. tétel',
      sorok: [
        ['Bútorlap azonosító', 'BL-01'],
        ['Hosszúság, szálirány (mm)', '720'],
        ['Szélesség (mm)', '400'],
        ['Darab', '2'],
      ] as const,
      kep: { fajl: 'demo-lapszabaszat-kijelzo.webp', szelesseg: 1165, magassag: 960, alt: 'Bemutató: a lapszabászati megrendelőlap kitöltve, jobbra az összesítéssel.' },
    },
    /** public/demos/kezikonyv/app.js: MODEL (line 29), the first unit MV200-0001 with edition 1.2 of 2025. 02. 10. (lines 30 to 42), the plate's cell labels (plateHtml). */
    gepkonyv: {
      fej: 'Adattábla',
      cim: 'MV-200 szalagfűrész',
      sorok: [
        ['Gyári szám', 'MV200-0001'],
        ['Kézikönyv', 'v1.2'],
        ['Kiadva', '2025. 02. 10.'],
      ] as const,
      qrCimke: 'A gépen lévő kód',
      qrAlt: 'QR-kód: a gépkönyv bemutató címe.',
      kep: { fajl: 'demo-kezikonyv-telefon.webp', szelesseg: 780, magassag: 928, alt: 'Bemutató: a QR-kódos gépkönyv első képernyője telefonon.' },
    },
    /** public/demos/adatgyujto/app.js: the machine CNC-1 (name, type, spindle temperature label), the other cell labels (line 171 to 172), the values below are the demo's own CNC-1 state at its first screen (7:00 after its 60-minute warm-up: current 11,9 A, 25 cycles an hour, floor of the accumulated parts 23; the temperature is the last sample of CNC1_HOMERSEKLET, 51,6 °C): one moment for every number on the card, and the note under the card is the demo's own sentence (public/demos/adatgyujto/index.html, the notice). */
    gepadat: {
      eszkoz: { legenda: 'Gépadat', kerdes: 'Kérdés', valasz: 'Válasz', tipus: 'BUSZ-3' },
      gep: { nev: 'CNC-1', tipus: 'CNC megmunkálóközpont', allapot: 'Fut' },
      cellak: [
        ['Orsóhőmérséklet', 'temp', ''],
        ['Áramfelvétel', '', '11,9 A'],
        ['Ciklus / óra', '', '25'],
        ['Darab a műszakban', '', '23'],
      ] as const,
      szimulalt: 'Az adatok szimuláltak.',
      alt: 'A gépkártya hőmérsékletének alakulása.',
    },
    /** The first screen's band (the pair's trace with its sampled last stretch), described for assistive technology. */
    savAlt: 'A kiválasztott példa jele a vezetéken: a görbe a böngésző kijelzőjébe fut.',
  },
  futas: { fut: 'Fut', all: 'Áll', egyszeri: 'Egyszeri felvétel', nev: 'Fut / Áll: a jelalak futtatása' },
  nav: { munkak: 'Munkák', csomagok: 'Csomagok', kapcsolat: 'Kapcsolat' },
  temaKapcsolo: 'Sötét mód',
  munkak: {
    cim: 'Nyissa meg, kattintson, próbálja ki',
    reszlet: 'A részlet',
    skala: 'M 5:1',
    mind: { felirat: 'Minden munka', href: '/munkaim/' },
    kabelAlt: 'A kiválasztott munka jele a kábelen: a görbe a vezérlő alján lévő csatlakozóba fut.',
    /** The nameplate of the controller (the narrow view shows it as a list above the figure). */
    tipustabla: [
      ['Típus', VALLALKOZO.szakma],
      ['Terület', TERULET],
      ['Hely', VALLALKOZO.helyszin],
    ] as const,
    // The works come from src/content/munkak.ts (FOOLDAL_MUNKAK above); their order is the order of the keys on the controller. The first work shown is the third (index 2), as in the approved prototype.
    elso: 2,
    tetelek: JEL_MUNKAK,
    /** The reading at the end of each cable (the Gépadat reading follows the trace itself). */
    olvasat: JEL_OLVASAT,
    /** The planned slot, one more row after the last work: its row label and caption, the head label of its detail view, one text link to the contact end. */
    tervezett: { cim: 'A következő: az Öné.', fej: 'Tervezett', link: { felirat: 'Kapcsolat', href: '#kapcsolat' } },
  },
  partnerek: {
    cim: 'Akikkel dolgoztam',
    nevek: ['Voltrack', 'Rollin Technologies', 'DomInterior', 'Lélek & Nyelv'],
    ajanlat: 'Egy konkrét feladathoz fix áras csomagot is kínálok. A csomagok és az árak külön oldalon vannak.',
    link: { felirat: 'Csomagok és árak', href: '/megrendeles/' },
  },
  kapcsolat: {
    cim: 'Mi működjön, és mi kerüljön képernyőre?',
    /** The copy key's label ([copy: owner]: the word is pending). */
    masolas: 'Másolás',
    link: 'Levelet írok',
    /** The second text link: the talk request with its prefilled mail (label and mail are HIVAS_LEVEL's). */
    beszelgetes: HIVAS_LEVEL.felirat,
    /** The lamp's legend after a copy (also the status sentence announced with it), the failed copy's legend and its status sentence. */
    kimasolva: 'Kimásolva',
    hiba: 'Hiba',
    allapotHiba: 'A másolás nem sikerült, a cím ki van jelölve, másolja kézzel.',
  },
}
