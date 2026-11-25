import type { Link } from './kozos'

// Az „Évek” szakasz tartalma a /munkaim/ oldalon (a korábbi /tapasztalat/ oldal ebbe olvadt, PR 7; a régi cím átirányítás, src/content/atiranyitasok.ts). Forrás: Benjámin jóváhagyott iránya és
// leírása (2026-11-05): két terület (villamosmérnök, szoftverfejlesztő) kisvállalkozói
// szemmel, rövid idővonal CSAK terület és évszámok (munkáltató neve nincs: Benjámin döntése, 2026-11-05);
// önéletrajz-fájl, PDF és LinkedIn-link nincs (Benjámin döntése, 2026-11-04).
// Az oldal saját szövegei (az „Évek” címe, a záró mondat): src/content/munkaim.ts.

interface Terulet {
  id: string
  /** A cím; az összetett szó határán U+00AD kötőjelezési pont áll, hogy keskeny oszlopban csak ott törhessen (a „hungarian-nlp” szerint ez a szóösszetétel határa). */
  cim: string
  /** A terület részletesebb leírása. */
  reszlet: string
  link: Link
}

export const TERULETEK: Terulet[] = [
  {
    id: 'villamosmernok',
    cim: 'Villamosmérnök',
    // Forrás: az idővonal 2025– sora (ipari és energetikai projektek); a gépkönyv-ajánlat: src/content/szegmensek/gepkonyv.ts.
    // A „kevesebb magyarázat kell” mondat a szerkesztői következtetés: Benjámin jóváhagyása, 2026-11-05.
    reszlet:
      'Villamosmérnöki és projektvezetői munkát végzek ipari és energetikai projekteken: ipari kommunikáció, adatgyűjtés, távfelügyelet. Egy gépgyártónak vagy üzemnek ez azt jelenti, hogy értem a gép, a mérési adat és a műszaki dokumentáció nyelvét, ezért kevesebb magyarázat kell a munka elindításához.',
    link: { felirat: 'Digitális gépkönyv gépgyártóknak', href: '/megrendeles/#szolgaltatas-gepkonyv' },
  },
  {
    id: 'szoftverfejleszto',
    cim: 'Szoftver­fejlesztő',
    // Forrás: az idővonal 2023–2025 sora (webes felületek és szerveroldal); a megrendelőlap-ajánlat: src/content/szegmensek/lapszabaszat.ts.
    // Az „egy kézből kapja” mondat szerkesztői következtetés: Benjámin jóváhagyása, 2026-11-05.
    reszlet:
      'Webes felületeket és szerveroldali rendszereket fejlesztek. Egy kisvállalkozásnak ez azt jelenti, hogy a megrendelőlapot, a bemutatkozó oldalt vagy az adatgyűjtő felületet egy kézből kapja: a tervezéstől a működő oldalig ugyanaz dolgozik rajta.',
    link: { felirat: 'Online megrendelő lapszabászatoknak', href: '/megrendeles/#szolgaltatas-lapszabaszat' },
  },
]

/** Egy sor az idővonalon: a kezdő év, az utolsó év (kihagyva: tart, a „most” szélig), és a terület. */
export interface Idoszak {
  kezdet: number
  /** Az utolsó év, amely még az időszakhoz tartozik (a „2023–2025” a 2025-ös oszlop végéig tart); nincs: az időszak tart. */
  veg?: number
  terulet: string
}

/** Az idővonal: csak terület és évszám, munkáltató nélkül. A sorrend: kezdés szerint csökkenő; azonos kezdésnél a régi sorrend (jóváhagyott). */
// Soronként a régi főoldal „Szakmai tapasztalat” bejegyzése (git show 21501e7:src/data/content.hu.ts, experience.items), munkáltató neve nélkül
// (Benjámin döntése, 2026-11-05: csak terület és évszám). Az évszám a régi bejegyzés „period” mezője.
export const IDOVONAL: readonly Idoszak[] = [
  // „Elektronikai fejlesztőmérnök”, 2026 óta; a terület: „Elektronikai fejlesztési és rendszerszintű mérnöki feladatok”.
  { kezdet: 2026, terulet: 'Elektronikai fejlesztés' },
  // „Villamosmérnök és projektmenedzser”, 2025 óta; a terület: energetikai és ipari projektek, ipari kommunikációs, adatgyűjtési és távfelügyeleti feladatok.
  { kezdet: 2025, terulet: 'Villamosmérnöki és projektvezetői munka ipari és energetikai projekteken: ipari kommunikáció, adatgyűjtés, távfelügyelet' },
  // „Önálló fejlesztő, egyéni vállalkozó”, 2024 óta.
  { kezdet: 2024, terulet: 'Egyéni vállalkozó' },
  // „Szoftverfejlesztő”, 2023 és 2025 között; a terület: webalkalmazások felülete és szerveroldali működése.
  { kezdet: 2023, veg: 2025, terulet: 'Szoftverfejlesztés: webes felületek és szerveroldal' },
  // „Kutató”, 2023 és 2025 között; a terület: távközlési K+F feladatok, mérési és kísérleti munkák.
  { kezdet: 2023, veg: 2025, terulet: 'Távközlési kutatás-fejlesztés és mérések' },
]

/** Az időszak éve szövegként: „2026–” (tart) vagy „2023–2025” (az en-gondolatjel az eredeti szövegé). */
export const evSzoveg = (i: Idoszak) => `${i.kezdet}–${i.veg ?? ''}`
