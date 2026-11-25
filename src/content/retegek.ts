// "Rétegek": what the sheets of a stack hold (the Adat sheet = the record behind a screen, the Szabály sheet = the rule or the samples behind its reading) and the names around them.
// True-fact rule: every number and reading here is a demo's own data or computation (file and line named at the value), an existing content string,
// or a fact of the built site. A pair with no series has none: HONLAP's curve is drawn and says so, RENDELÉS's Szabály has the demo's totals and no samples.
// The values were taken by running the demos' own code (public/demos/*/app.js), not by estimating; scripts/retegek-adatok.test.mjs checks every string against the demos' sources.
import { CNC1_HOMERSEKLET, QR_SOR0, SOROZATOK } from './sorozatok.ts'
import { fmt, HOM_NYUGALOM } from '../site/fooldal/jelalak.ts'

export { SOROZATOK }

export type RetegPar = 'honlap' | 'rendeles' | 'gepkonyv' | 'gepadat'
export type LapNev = 'adat' | 'szabaly' | 'felulet'

export const RETEG = {
  kulcs: 'Szétszedve',
  /** The section's label (the owner's own word, 2026-11-19). */
  szakasz: 'Rétegek',
  nevek: { adat: 'Adat', szabaly: 'Szabály', felulet: 'Felület' } satisfies Record<LapNev, string>,
  /** Szabály rows (owner-approved, 2026-11-19). */
  jel: 'Jel',
  mintavetel: 'Mintavétel',
  minta: 'Minták',
  /** HONLAP's curve is drawn, not measured: the long line (owner, 2026-11-19, "Rajzolt görbe, nincs mögötte mérés. (Recommended)"). */
  rajzolt: 'Rajzolt görbe, nincs mögötte mérés.',
  /** The earned mail link in Felület's foot row (owner-approved). */
  erdeklodes: 'Erről kérdezek',
  /** The 404's Adat row label (owner, 2026-11-18, "Mind jó (Recommended)") and its Felület sentence (approved 2026-11-18). */
  kertCim: 'Kért cím',
  nincsFelulet: 'Ehhez a címhez nincs felület.',
} as const

/** The headings the offer page itself renders for the package's lists (src/site/pages/Csomagok.tsx, from CSOMAGOK_OLDAL.tenyek in src/content/csomagok.ts: "Mit tartalmaz", "Mit nem tartalmaz", "Mi kell Öntől"): no new label. */
export const BELEPO_CIMEK = { tartalmaz: 'Mit tartalmaz', nem: 'Mit nem tartalmaz', kell: 'Mi kell Öntől' } as const

// ---- block model of a sheet's body ----
/** `e`: the order in which an element goes when the body does not fit (1 first); no `e`: it stays. */
interface Sor {
  cimke: string
  ertek: string
  e?: number
  /** A second, quieter part after the value (a limit). */
  halk?: { s: string; e?: number }
  /** The value is the live reading of the first screen's clock (GÉPADAT): the script keeps it equal to the head, the card and the band. */
  elo?: true
}
export type Blokk =
  | { t: 'sorok'; sorok: Sor[]; e?: number }
  | { t: 'cim'; s: string; e?: number }
  | { t: 'lista'; elemek: { s: string; e?: number; mono?: boolean }[] }
  | { t: 'szoveg'; s: string; halk?: boolean; mono?: boolean; e?: number }
  /** A heading line followed by its big number and a caption ("Összesítés", 5, "darab alkatrész"). */
  | { t: 'osszes'; cimke: string; szam: string; felirat: string }
  | { t: 'oszlopok'; oszlopok: Blokk[][] }
  /** The 29 modules of the QR code's row 0 as filled / empty squares. */
  | { t: 'qr' }
  /** The sample values that fit one line, led by "…", the last in bold (GÉPADAT). */
  | { t: 'mintak' }
export interface LapTartalom {
  /** The head's right cell (mono); '' where the sheet shows none. */
  fej: string
  blokkok: Blokk[]
  /** The text link in the foot row (Adat only). */
  labl?: { felirat: string; href: string }
}

/** public/demos/lapszabaszat/app.js line 23 (the `sample` handler) and its field labels (index.html lines 9 to 20): the demo's own sample, the labels as the demo renders them. */
const RENDELES_TETELEK = [
  { azon: 'BL-01', megn: 'Oldallap', hossz: '720', szel: '400', db: '2', forg: false, vekony: [1, 0, 'MINTA-FEHÉR'] as const, vastag: [0, 0, ''] as const },
  { azon: 'BL-02', megn: 'Polc', hossz: '564', szel: '380', db: '3', forg: true, vekony: [0, 0, ''] as const, vastag: [1, 0, 'MINTA-FEHÉR'] as const },
]
function tetel(i: number): Blokk[] {
  const t = RENDELES_TETELEK[i]!
  const el = (cim: string, v: readonly [number, number, string], e: number): Blokk[] =>
    v[0] || v[1] || v[2]
      ? [
          { t: 'szoveg', s: cim, halk: true },
          {
            t: 'sorok',
            sorok: [
              ...(v[0] ? [{ cimke: 'Hosszanti élek', ertek: `${v[0]} él` }] : []),
              ...(v[1] ? [{ cimke: 'Szélességi élek', ertek: `${v[1]} él` }] : []),
              ...(v[2] ? [{ cimke: 'Élzáró színkódja', ertek: v[2], e }] : []),
            ],
          },
        ]
      : []
  return [
    { t: 'cim', s: `${String(i + 1).padStart(2, '0')}. tétel` },
    {
      t: 'sorok',
      sorok: [
        { cimke: 'Bútorlap azonosító', ertek: t.azon },
        { cimke: 'Megnevezés, megmunkálás', ertek: t.megn, e: 2 },
        { cimke: 'Hosszúság, szálirány (mm)', ertek: t.hossz },
        { cimke: 'Szélesség (mm)', ertek: t.szel },
        { cimke: 'Darab', ertek: t.db },
      ],
    },
    ...(t.forg ? [{ t: 'sorok', sorok: [{ cimke: 'Forgatható a szálirány megváltoztatásával', ertek: '', e: 1 }] } satisfies Blokk] : []),
    ...el('0,4 vagy 0,8 mm élzárás', t.vekony, 3),
    ...el('2 mm ABS élzárás', t.vastag, 3),
  ]
}

/** public/demos/kezikonyv/app.js: MODEL (line 20), VERSIONS (line 21), UNITS (line 37), plateHtml (line 312), the status line (316); the manufacturer line is index.html line 19. */
const GK = {
  modell: 'MV-200 szalagfűrész',
  gyarto: ['Minta Gépgyár Kft.', 'Bemutató – kitalált gép és gyártó'],
  egysegek: { 'MV200-0001': { v: '1.2', gyartva: '2025. 03.' }, 'MV200-0002': { v: '1.3', gyartva: '2026. 10.' } },
  kiadasok: [
    { v: '1.3', datum: '2026. 09. 15.' },
    { v: '1.2', datum: '2025. 02. 10.' },
    { v: '1.1', datum: '2024. 06. 03.' },
    { v: '1.0', datum: '2024. 01. 15.' },
  ],
}

/** public/demos/adatgyujto/app.js: MACHINES (line 21), the labels (line 171), the render (line 191), the demo's own sentence about its data (index.html notice). CNC-1 at the demo's 7:00 state. */
const GD = {
  nev: 'CNC-1',
  tipus: 'CNC megmunkálóközpont',
  allapot: 'Fut',
  hom: { cimke: 'Orsóhőmérséklet', hatar: 'határ: 70 °C' },
  aram: { cimke: 'Áramfelvétel', ertek: '11,9 A', hatar: 'határ: 18 A' },
  ciklus: { cimke: 'Ciklus / óra', ertek: '25' },
  darab: { cimke: 'Darab a műszakban', ertek: '23' },
  szimulalt: 'Az adatok szimuláltak.',
}

interface ParLap {
  /** Adat's head cell, the pair's second head cell (Szabály), and the two sheets' contents. */
  adat: LapTartalom
  szabaly: LapTartalom
  /** Portrait or landscape sheet (the screen's own orientation). */
  alak: 'p' | 'l'
}

/**
 * The record and the rule behind each pair's screen. HONLAP's lists come from the package's own content (src/content/szegmensek/bemutatkozo.ts, read by the component through `honlapLapok`):
 * only its non-list rows are here. Foot links: the work's existing link label and address.
 */
export const PAROK_LAPOK: Record<Exclude<RetegPar, 'honlap'>, ParLap> & { honlap: Omit<ParLap, 'adat' | 'szabaly'> & { adatFej: string; labl: { felirat: string; href: string } } } = {
  honlap: { alak: 'p', adatFej: '/megrendeles/', labl: { felirat: 'Csomagok és árak', href: '/megrendeles/' } },
  rendeles: {
    alak: 'l',
    adat: {
      fej: '',
      labl: { felirat: 'Próbálja ki', href: '/demos/lapszabaszat/' },
      blokkok: [
        { t: 'sorok', sorok: [{ cimke: 'Rendelés neve vagy kódja', ertek: 'Előszobaszekrény – próba' }, { cimke: 'Anyag színkódja, elnevezése', ertek: 'Fehér bútorlap – MINTA' }] },
        { t: 'oszlopok', oszlopok: [tetel(0), tetel(1)] },
      ],
    },
    szabaly: {
      // demoEngine.totals() of that sample, formatted by summary() (app.js lines 11 and 12): 5 pcs, 1,219 m2, 1,44 m, 1,692 m; the head is the demo's own "2 tétel".
      fej: '2 tétel',
      blokkok: [
        { t: 'osszes', cimke: 'Összesítés', szam: '5', felirat: 'darab alkatrész' },
        { t: 'sorok', sorok: [{ cimke: 'Nettó kész felület', ertek: '1,219 m²' }, { cimke: '0,4 / 0,8 mm élzárás', ertek: '1,44 m' }, { cimke: '2 mm ABS élzárás', ertek: '1,692 m' }] },
        { t: 'szoveg', s: 'Kész méretekből számolva, vágási veszteség és ráhagyás nélkül. Ez nem árajánlat.', halk: true, e: 1 },
      ],
    },
  },
  gepkonyv: {
    alak: 'p',
    adat: {
      fej: '/demos/kezikonyv/',
      labl: { felirat: 'Próbálja ki', href: '/demos/kezikonyv/' },
      blokkok: [
        { t: 'szoveg', s: `${GK.gyarto[0]}\n${GK.gyarto[1]}`, halk: true },
        { t: 'cim', s: GK.modell },
        {
          t: 'sorok',
          sorok: [
            { cimke: 'Gyári szám', ertek: 'MV200-0001' },
            { cimke: 'Kézikönyv', ertek: `v${GK.egysegek['MV200-0001'].v}` },
            { cimke: 'Kiadva', ertek: GK.kiadasok[1]!.datum },
            { cimke: 'Gyártva', ertek: GK.egysegek['MV200-0001'].gyartva },
          ],
        },
        { t: 'cim', s: 'MV200-0002', e: 1 },
        { t: 'sorok', e: 1, sorok: [{ cimke: 'Kézikönyv', ertek: `v${GK.egysegek['MV200-0002'].v}` }, { cimke: 'Gyártva', ertek: GK.egysegek['MV200-0002'].gyartva }] },
        { t: 'cim', s: 'Kiadva' },
        // editions oldest first go first: v1.0 (2), v1.1 (3), v1.2 (4); v1.3 stays
        { t: 'lista', elemek: GK.kiadasok.map((k, i) => ({ s: `v${k.v}  ${k.datum}`, mono: true, ...(i > 0 ? { e: 5 - i } : {}) })) },
      ],
    },
    szabaly: {
      // "29 bit" = the count (not a last value); the rule is the demo's own sentence (plateHtml line 317).
      fej: '29 bit',
      blokkok: [
        { t: 'sorok', sorok: [{ cimke: RETEG.mintavetel, ertek: '1 modul' }, { cimke: RETEG.minta, ertek: String(QR_SOR0.length) }] },
        { t: 'qr' },
        { t: 'cim', s: 'Ez a kiadás tartozik ehhez a gyári számhoz.' },
        { t: 'szoveg', s: `MV200-0001 → v${GK.egysegek['MV200-0001'].v}`, mono: true, e: 1 },
      ],
    },
  },
  gepadat: {
    alak: 'l',
    adat: {
      fej: '/demos/adatgyujto/',
      labl: { felirat: 'Próbálja ki', href: '/demos/adatgyujto/' },
      blokkok: [
        { t: 'osszes', cimke: GD.nev, szam: GD.tipus, felirat: GD.allapot },
        {
          t: 'sorok',
          sorok: [
            { cimke: GD.hom.cimke, ertek: `${fmt(HOM_NYUGALOM)} °C`, halk: { s: ` / ${GD.hom.hatar}` }, elo: true },
            { cimke: GD.aram.cimke, ertek: GD.aram.ertek, halk: { s: ` / ${GD.aram.hatar}` } },
            { cimke: GD.ciklus.cimke, ertek: GD.ciklus.ertek },
            { cimke: GD.darab.cimke, ertek: GD.darab.ertek },
          ],
        },
        { t: 'szoveg', s: GD.szimulalt, halk: true },
      ],
    },
    szabaly: {
      fej: `${fmt(HOM_NYUGALOM)} °C`,
      blokkok: [
        { t: 'sorok', sorok: [{ cimke: RETEG.mintavetel, ertek: '1 perc' }, { cimke: RETEG.minta, ertek: String(CNC1_HOMERSEKLET.length) }] },
        { t: 'mintak' },
        { t: 'szoveg', s: GD.szimulalt, halk: true },
      ],
    },
  },
}

/** HONLAP's sheets from the offer's own content (the package record of src/content/szegmensek/bemutatkozo.ts): the lists verbatim, the headings the offer page renders. */
export function honlapLapok(belepo: { tartalmaz: readonly (string | null | { kerdes: string })[]; kell: readonly string[]; nemTartalmaz: readonly string[] }): { adat: LapTartalom; szabaly: LapTartalom } {
  const sz = belepo.tartalmaz.filter((p): p is string => typeof p === 'string')
  // the first line repeats the source slot (goes first), then the photo line; contact, the search setup and the revision stay
  const e = [1, 2, 0, 0, 0]
  const n = belepo.nemTartalmaz.length
  return {
    adat: {
      fej: PAROK_LAPOK.honlap.adatFej,
      labl: PAROK_LAPOK.honlap.labl,
      blokkok: [{ t: 'cim', s: BELEPO_CIMEK.tartalmaz }, { t: 'lista', elemek: sz.map((s, i) => ({ s, ...(e[i] ? { e: e[i]! } : {}) })) }],
    },
    szabaly: {
      fej: '',
      blokkok: [
        { t: 'sorok', sorok: [{ cimke: RETEG.jel, ertek: RETEG.rajzolt }] },
        { t: 'cim', s: BELEPO_CIMEK.kell },
        { t: 'lista', elemek: belepo.kell.map((s) => ({ s })) },
        { t: 'cim', s: BELEPO_CIMEK.nem },
        // "Mit nem tartalmaz" drops last line first
        { t: 'lista', elemek: belepo.nemTartalmaz.map((s, i) => ({ s, e: n - i })) },
      ],
    },
  }
}
