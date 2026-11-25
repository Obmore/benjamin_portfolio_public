// A /munkaim/ oldal szövege. A munkák adatai: src/content/munkak.ts (forrásokkal), az „Évek” szakasz adatai: src/content/tapasztalat.ts. Az ajánlatok a /megrendeles/ négy paneljében
// vannak (a korábbi „Négy ajánlatom van” sor megszűnt, PR 7). Benjámin jóváhagyott iránya: 2026-11-05; a PR 7 szövegei: 2026-11-24 (S1, S2, S5-S7, „Évek” idődiagram).

export const MUNKAIM_META = {
  cim: 'Munkáim – Ott Benjámin',
  leiras: 'Elkészült munkák kisvállalkozói szemmel: mi volt a feladat, mit csináltam, és mit kap belőle az ügyfél. Élő oldalakkal és kipróbálható bemutatókkal.',
}

export const MUNKAIM_OLDAL = {
  /** Az oldal H1-e (S1: „Munkák és évek”, mint a „Csomagok és árak”; Benjámin jóváhagyta, 2026-11-24). */
  cim: 'Munkák és évek',
  /** A H1-nek az a szava, amelyet a fejléc az oldal jelszínével emel ki (a szó a `cim`-ben benne van; ha nincs, a build elbukik). A szöveg nem változik, csak a megjelenése. */
  kiemelt: 'évek',
  bevezeto: 'Minden munkánál leírom, mi volt a feladat, mit csináltam, és mit kap belőle egy kisvállalkozás. Ahol van élő oldal, megnyithatja.',
  /** A munkák szakaszának látszólag rejtett H2-je. */
  munkakCim: 'Elkészült munkák',
  cimkek: { feladat: 'A feladat', amitCsinaltam: 'Amit csináltam', amitKap: 'Amit kap belőle', technika: 'Technika:' },
}

/** Az „Évek” szakasz: a H2, a rajz, a rejtett táblázat és a záró mondat (a terület- és időszak-adatok: src/content/tapasztalat.ts). */
export const EVEK = {
  cim: 'Évek',
  /** A rajz mellé tartozó rejtett táblázat felirata és oszlopfejei. */
  tablazat: { felirat: 'Évek', ev: 'Év', terulet: 'Terület' },
  // Az „Egyéni vállalkozóként…” mondat Benjámin jóváhagyott válasza (5. kérdés, 2026-11-19).
  zaro: 'Egyéni vállalkozóként, egyedül dolgozom: Ön velem beszél, nincs közvetítő, és ugyanaz készíti el a munkát, akivel egyeztet.',
}

/** A Rollin-képernyő vezérlőinek és állapotsorának szövege (S5, S6: Benjámin jóváhagyta, 2026-11-24). A lépések nevei és az állapotmondatok: src/rollin/szoveg.ts. */
export const ROLLIN_KEP = {
  fenykep: 'Fénykép',
  alairas: 'Fénykép a rollindocking.com oldaláról.',
}

/** A kapcsolati vég (C1): a H2 és a levél tárgya (jóváhagyott, 2026-11-05). */
export const MUNKAIM_KAPCSOLAT = {
  cim: 'Hasonló munkát szeretne?',
  szoveg: 'Írja meg, mit szeretne elkészíttetni. Pár mondat is elég: átnézem, és megírom, mit javaslok.',
  targy: 'Érdeklődés: munkáim alapján',
}
