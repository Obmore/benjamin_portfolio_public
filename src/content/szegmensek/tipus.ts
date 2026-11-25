import type { Ertek } from '../kerdes'
import type { Belepo } from '../belepok'
import type { Ar, KapcsolatSzoveg, Link } from '../kozos'

/** A négy belépő csomag azonosítója: a /megrendeles/ panelhorgonya (#szolgaltatas-<id>) is ez. */
export type SzegmensId = 'termekleiras' | 'gepkonyv' | 'lapszabaszat' | 'bemutatkozo'

/** Kipróbálható bemutató: a cím a sor linkjének felirata. A helyi bemutató (`mappa`) csak akkor jelenik meg, ha a mappája ebben a buildben megvan. */
interface Demo {
  href: string
  cim: string
  mappa?: string
}

/**
 * Egy belépő csomag teljes tartalma a /megrendeles/ oldalon (src/site/pages/Csomagok.tsx): a panel (név, leírás, határidő, ár, gomb, vállalás), a jobb oszlop
 * (kinek való, mit tartalmaz, mit nem, mi kell, a nem ár-os lépcsők, a csomag mondatai, egy hivatkozás) és a levél váza. A négy régi ajánlatoldal ebbe olvadt (2026-11-18).
 */
export interface Szegmens {
  id: SzegmensId
  hos: {
    kinek: string
    /** A sor hordozó mondata (a régi ajánlatoldal címsora). */
    cim: string
    /** A panel gombja a belépő csomagot kéri (a kapcsolat levelével). */
    gomb: { felirat: string }
    /** A vállalás első része: a panel linkje az ÁSZF első rész pontjára. */
    garancia: string
    /** A sor hivatkozása, ha nincs bemutatója. */
    masodlagos?: Link
  }
  /** Kipróbálható bemutató; ha van, a sor hivatkozása ez. */
  demo: Demo | null
  belepo: Belepo & {
    leiras: string
    ido: string | null
    tartalmaz: Ertek[]
    nemTartalmaz: string[]
    kell: string[]
  }
  /** A belépő utáni lépcsők (fő projekt, üzemeltetés). Az ár mindig a pricing.ts-ből (Ar), vagy nyitott kérdés; az ár nélküliek állnak a jobb oszlopban. */
  lepcsok: { nev: string; szoveg: string; ar: Ertek<Ar> | undefined }[]
  /** Mondatok, amelyeket csak ez a csomag mond a jobb oszlopban a tényszavak után (bekezdésenként egy elem). */
  csomagMondatok: string[]
  /** A csomag gombjának levele (a tárgy és a váz). */
  kapcsolat: Pick<KapcsolatSzoveg, 'level'>
}
