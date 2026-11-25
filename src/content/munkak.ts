// Az elkészült munkák. Forrás: a korábbi főoldal tartalma (git: 21501e7, src/data/content.hu.ts, „projects”),
// kisvállalkozói szemmel átírva; a munkák neve, képe és élő linkje Benjámin jóváhagyása (2026-11-05).
// Nincs benne kitalált szám, idézet vagy logó, és a szöveg nem nevezi meg az ügyfelet mint személyt; a „Lélek & Nyelv” márkanév az ügyfél engedélyével szerepel. Az „Életrendező” (lelkiter) nem szerepel:
// Benjámin döntése, 2026-11-05. Egy korábbi munka kikerült (PR 7: a megrendelő hozzájárulása nincs rögzítve; a főoldali mondat is „egy élő weboldalt” ír, fooldal.ts ELO_WEBOLDAL_SZAM).
// Technikai felsorolás csak a /munkaim/ oldalon, soronként (értéket magyaráz); a főoldali sávban nincs.
//
// EGY forrás a tényeknek (TENYEK): minden munka és bemutató neve, fajtája, linkje, képfájlja és mérete itt van, egyszer. Az oldalak saját mondatai
// az oldal saját tartalom-moduljában vannak, egy-egy szövegtáblában, amelynek kulcsai a MunkaId-k és a kulcsok sorrendje az oldal sorrendje:
// főoldal: fooldal.ts (FOOLDAL_MUNKAK), /munkaim/: lent (MUNKAIM_SZOVEG; csak a /munkaim/ oldal importálja a MUNKAK-ot; a bemutatók szövegei is itt vannak, a külön demok.ts megszűnt).
// Új munka: egy bejegyzés a TENYEK-ben és egy-egy a szövegtáblákban, ahol megjelenik. Az elgépelt kulcsot a `satisfies Partial<Record<MunkaId, …>>`
// utasítja el (tsc); a hiányzó szöveg viszont csak azt jelenti, hogy a munka az adott oldalon nem szerepel, ezt a teszt nem ellenőrzi.
// A képes munkának alt kell: az altKell a buildben elbukik, ha hiányzik. A /munkaim/ oldalon minden munkának van képe, és a képnek 16:10 arányúnak kell lennie (ELERT_ARANY): a build elbukik másképp.

interface Forras {
  id: string
  nev: string // a munka neve (a főoldal a bemutatóknak saját címet adhat)
  /** A blokk fejlécének bal cellája (a spec 2.1 pontja; S2: „Ügyfélmunka” és „Csapatmunka”, a „Bemutató” a korábbi „(bemutató)” jelölés). */
  fajta: string
  href: string // élő oldal (https://…) vagy a bemutató útvonala (/demos/<id>/; a public/demos alatti mappa neve az azonosító)
  /** A kép a /work/ alatt; `egyfajl`: egyetlen `<alap>.webp`, különben `<alap>-640.webp` és `<alap>-1200.webp`. A méret rögzített, hogy a későbbi CSS ne mozgassa az elrendezést. */
  kep: { alap: string; szelesseg: number; magassag: number; egyfajl?: true } | null
}

export const ELO_FELIRAT = 'Megnézem az élő oldalt'

/** A /munkaim/ oldal képernyőinek aránya (a képterület 16:10): a build elbukik, ha egy kép nem ilyen. A tűrés fél százalék (a 922 × 576 kivágás aránya 1,6007). */
const KEP_ARANY = 1.6

/** A Rollin-fotó alt szövege: egy szöveg a /munkaim/ és a főoldal számára (S7, Benjámin jóváhagyta, 2026-11-24). */
export const ROLLIN_KEP_ALT = 'A Rollin töltőállomása öt dokkolt elektromos rollerrel.'

/** A sorrend itt nem számít: minden oldal a saját szövegtáblája sorrendjében listáz. */
export const TENYEK = [
  { id: 'kezikonyv', nev: 'QR-kódos gépkönyv', fajta: 'Bemutató', href: '/demos/kezikonyv/', kep: { alap: '/work/demo-kezikonyv', szelesseg: 1200, magassag: 750 } },
  { id: 'lapszabaszat', nev: 'Lapszabászati megrendelőlap', fajta: 'Bemutató', href: '/demos/lapszabaszat/', kep: { alap: '/work/demo-lapszabaszat', szelesseg: 1200, magassag: 750 } },
  { id: 'adatgyujto', nev: 'Gépadatok egy helyen', fajta: 'Bemutató', href: '/demos/adatgyujto/', kep: { alap: '/work/demo-adatgyujto', szelesseg: 1200, magassag: 750 } },
  // A Rollin-állomás fotója: a rollindocking.com oldalról, a tulajdonos jóváhagyásával (2026-11-17); 1280 × 576-ból x 170 és 1092 között, teljes magassággal kivágva (docs/THIRD_PARTY.md).
  { id: 'rollin', nev: 'Rollin Technologies', fajta: 'Csapatmunka', href: 'https://rollindocking.com/hotel', kep: { alap: '/work/rollin-allomas', szelesseg: 922, magassag: 576, egyfajl: true } },
  {
    id: 'lelek-es-nyelv',
    nev: 'Lélek & Nyelv',
    fajta: 'Ügyfélmunka',
    href: 'https://lelekesnyelv.hu/',
    // Ügyfélmunka (nem minta): az ügyfél beleegyezett, hogy a „Lélek & Nyelv” név, a képernyőkép és az élő link látszik
    // (Benjámin megerősítése, 2026-11-06). Benjámin: terv, fejlesztés, szövegek, domain és tárhely, üzemeltetés.
    // A szöveg az ügyfelet személyként nem nevezi meg. A képernyőkép az ügyfél oldalának saját fejlécét mutatja (ott a keresztnév és egy aláíró kezdőbetű látszik);
    // ezt is az ügyfél 2026-11-06-i engedélye fedi. Forrás: src/content/szegmensek/bemutatkozo.ts.
    kep: { alap: '/work/lelek-es-nyelv', szelesseg: 1280, magassag: 800, egyfajl: true },
  },
] as const satisfies readonly Forras[]

export type MunkaId = (typeof TENYEK)[number]['id']

export function teny(id: MunkaId): Forras {
  const t = (TENYEK as readonly Forras[]).find((x) => x.id === id)
  if (!t) throw new Error(`Ismeretlen munka: ${id}`)
  return t
}

/** A kép alt szövege; képes munkánál kötelező (a build elbukik, ha hiányzik), kép nélkülinél nincs rá szükség. */
export function altKell(t: Forras, alt: string | undefined): string {
  if (t.kep && !alt?.trim()) throw new Error(`Hiányzó alt szöveg: ${t.id}`)
  return alt ?? ''
}

/** A blokk fejlécének jobb cellája: a munka linkjéből. Külső cím: a gazdagép (a Lélek & Nyelv és a Rollin címe így fér ki 360 px-en; a Rollin /hotel útvonala nem fér), belső: az útvonal. */
export function cimke(href: string): string {
  if (!/^https?:\/\//.test(href)) return href
  return new URL(href).hostname
}

// --- A /munkaim/ oldal ---

interface MunkaimSzoveg {
  /** A fajta alatti sor(ok): kicsi, halk betű. */
  sorok: string[]
  /** A három sor; egy sor hiányozhat, de nem lehet üres. */
  feladat?: string
  amitCsinaltam?: string
  amitKap?: string
  technika?: string
  /** Az egy szöveges link felirata. */
  gomb: string
  alt: string
}

/**
 * A /munkaim/ oldal szövegei, a munkák azonosítója szerint; a kulcsok sorrendje az oldal sorrendje (S8, Benjámin jóváhagyta, 2026-11-24: a főoldali kulcsok sorrendje, utána a Rollin).
 * A bemutatóknak egyelőre csak az „Amit kap belőle” sora van (a korábbi, jóváhagyott leírásuk): az „A feladat” és az „Amit csináltam” sort (S3) és a „Technika:” sort (S4)
 * a szövegíró még nem írta meg, ezért nincsenek; a kulcs hozzáadásával megjelennek.
 */
const MUNKAIM_SZOVEG = {
  'lelek-es-nyelv': {
    sorok: ['Bemutatkozó oldal egy mentálhigiénés segítő és angoltanár számára'],
    // Az „Ilyen lehet a saját bemutatkozó oldala is” mondat szerkesztői következtetés: Benjámin jóváhagyása, 2026-11-05.
    feladat: 'Bemutatkozó oldalt készíteni egy mentálhigiénés segítő és angoltanár két szolgáltatásához.',
    amitCsinaltam: 'Megterveztem és elkészítettem az oldalt, megírtam a szövegeit, beállítottam a domaint és a tárhelyet, és azóta én üzemeltetem.',
    amitKap: 'A látogató megismeri a két szolgáltatási területet, a közös munka menetét és a kapcsolatfelvétel módját. Ilyen lehet a saját bemutatkozó oldala is.',
    technika: 'React, Tailwind CSS, Vite.',
    gomb: ELO_FELIRAT,
    alt: 'A Lélek & Nyelv oldal nyitóképernyője: „Biztos tér. Bátrabb hang.” felirat, alatta rövid bemutatkozó szöveg és gomb.',
  },
  lapszabaszat: {
    sorok: ['Szabászatoknak'],
    // Forrás: public/demos/lapszabaszat/README.md.
    amitKap: 'Írjon be két-három saját tételt a kész méretekkel és az élzárással. Az összesítő azonnal számol, a kitöltött lapot Excelben töltheti le.',
    gomb: 'Kipróbálom a megrendelőlapot',
    alt: 'A lapszabászati bemutató: a megrendelő adatai, az anyag, és az összesítő 5 alkatrésszel, kész felülettel, élzárási hosszal és Excel-letöltés gombbal.',
  },
  kezikonyv: {
    sorok: ['Gépgyártóknak'],
    // Forrás: public/demos/kezikonyv/README.md.
    amitKap: 'Egy kitalált szalagfűrész kézikönyve úgy, ahogy a gépen lévő QR-kódról megnyílik: a gyári számhoz tartozó kiadás, keresés, nyomtatás és offline letöltés.',
    gomb: 'Kipróbálom a gépkönyvet',
    alt: 'A gépkönyv-bemutató: az MV-200 szalagfűrész kezelési kézikönyve gyári számmal, kiadással és QR-kóddal, alatta a nyomtatás, az offline letöltés és a papírpéldány gombja.',
  },
  adatgyujto: {
    sorok: ['Gyártó cégeknek'],
    amitKap: 'Három szimulált gép állapota, mérései és riasztásai. Indítson el egy hibát, és nézze meg, hogyan kerül a műszakjelentésbe.',
    gomb: 'Kipróbálom a gépadat-bemutatót',
    alt: 'A gépadat-bemutató: három gép kártyája hőmérséklettel, áramfelvétellel, ciklusszámmal és darabszámmal, felettük a műszak és a bemutatóidő.',
  },
  rollin: {
    // „Csapatmunka egy korábbi munkahelyen” (K5, Benjámin jóváhagyta, 2026-11-05): a régi főoldal „Szoftverfejlesztő” bejegyzése szerint 2023–2025 (munkáltató neve nélkül);
    // a Rollin megnevezése a munkahelyi csapatmunka projektjeként szintén ekkor.
    sorok: ['Csapatmunka egy korábbi munkahelyen', 'Elektromos rollerek és kerékpárok bérlése szállodáknak'],
    // Forrás: régi főoldal, „Rollin Technologies”; Benjámin leírása (2026-11-05): a recepció nyit, a lezárás, a bérlés befejezése és a töltés automatikus.
    feladat: 'Elektromos rollerek és kerékpárok szállodai bérlését összekapcsolni a dokkoló- és töltőállomásokkal.',
    amitCsinaltam: 'A csapatban a webes felületen, a szerveroldali rendszeren, az elektromos kerékpárok távoli vezérlésén és az állomásszoftveren dolgoztam.',
    amitKap: 'A recepció a szoftverből indíthatja a nyitást. A visszahelyezett jármű lezárása, a bérlés befejezése és a töltés automatikus.',
    technika: 'React, TypeScript, .NET, Azure, Raspberry Pi, Python.',
    gomb: ELO_FELIRAT,
    alt: ROLLIN_KEP_ALT,
  },
} satisfies Partial<Record<MunkaId, MunkaimSzoveg>>

export const MUNKAK = /* @__PURE__ */ (Object.keys(MUNKAIM_SZOVEG) as (keyof typeof MUNKAIM_SZOVEG)[]).map((id) => {
  const t = teny(id)
  const { alt, gomb, ...mezok }: MunkaimSzoveg = MUNKAIM_SZOVEG[id]
  if (!t.kep) throw new Error(`/munkaim/: a munkának kép kell: ${id}`)
  const arany = t.kep.szelesseg / t.kep.magassag
  if (Math.abs(arany - KEP_ARANY) > 0.005) throw new Error(`/munkaim/: a kép nem 16:10 arányú: ${id} (${t.kep.szelesseg} × ${t.kep.magassag})`)
  return { id, nev: t.nev, fajta: t.fajta, cim: cimke(t.href), ...mezok, elo: { felirat: gomb, href: t.href }, kep: { ...t.kep, alt: altKell(t, alt) } }
})
export type Munka = (typeof MUNKAK)[number]

/** A „Technika:” sor elemei egyenként (a címkék a /munkaim/ oldalon): a vesszővel tagolt felsorolás záró pontja nélkül; a „.NET” pontja a névhez tartozik. */
export function technikaCimkek(szoveg: string): string[] {
  return szoveg
    .replace(/\.$/, '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Ez a honlap mint saját munka (egy mondat). Forrás: README (a szöveg és az ár egy-egy helyen van megírva: src/content, src/data/pricing.ts). A korábbi „a böngészőbe kb. 2 KB-nyi szkript kerül” tagmondat kikerült: nincs mérve (spec 2.3). */
export const SAJAT_HONLAP = {
  cim: 'Ez a honlap',
  szoveg: 'Ezt a honlapot is magam terveztem és építettem: a szövegei és az árai egy-egy helyen vannak megírva, ezért az oldalak nem térhetnek el egymástól.',
  technika: 'Vite, TypeScript.',
}
