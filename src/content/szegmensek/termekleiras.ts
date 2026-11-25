import { BELEPOK } from '../belepok'
import { levelCim } from '../alapadatok'
import type { Level } from '../kozos'
import type { Szegmens } from './tipus'

/** A díjmentes hiánylista levele (a sor hivatkozása). */
const LEVEL_HIANYLISTA: Level = {
  targy: 'Díjmentes hiánylista a webshopunkról',
  torzs: 'Jó napot kívánok!\n\nWebshopunk címe:\n\nPlatform (UNAS, Shoprenter, WooCommerce vagy más):\n\nNagyjából ennyi termékünk van:\n',
}

// Webshopok (UNAS, Shoprenter, WooCommerce). Forrás: megrendeles G (Termékleírás webshopba,
// Benjámin döntése 2026-10-20): 20 termék egységes szerkezetben, magyarul; a saját anyagokból és a
// gyártó műszaki adataiból; fájlban, a feltöltést a megrendelő végzi; jóváhagyás a feltöltés előtt,
// egy javítási kör; általában két héten belül, a termékadatok megérkezése után; a termékfotó, az
// árazás és a fordítás nincs benne; a próbakör után írásos ajánlat. Ár: pricing.ts
// productDescriptionsTrial. A képleírás, a WooCommerce és a díjmentes hiánylista: Benjámin jóváhagyott
// szegmensleírása (2026-11-04 este). Jogszabály: src/content/jogszabalyok.ts.
export const TERMEKLEIRAS: Szegmens = {
  id: 'termekleiras',
  hos: {
    kinek: 'Webshopoknak',
    cim: 'Termékoldalak leírás nélkül? Pótolom a mostani webshopjában.',
    gomb: { felirat: 'Kérem a 20 termékes próbakört' },
    garancia: 'Első rész: az első 5 termékleírás.',
    masodlagos: { felirat: 'Előbb díjmentes hiánylistát kérek', href: levelCim(LEVEL_HIANYLISTA) },
  },
  demo: null,
  belepo: {
    ...BELEPOK.webshop,
    leiras: '20 termék leírása egységes szerkezetben, magyarul, feltöltésre kész fájlban.',
    ido: 'Általában két héten belül elkészül, miután megkaptam a termékadatokat.',
    tartalmaz: [
      '20 termék leírása egységes szerkezetben, magyarul.',
      'Az Ön saját anyagaiból és a gyártó műszaki adataiból.',
      'A leírások fájlban, a webshopba való feltöltéshez.',
      'Jóváhagyás a feltöltés előtt, egy javítási körrel.',
      // Benjámin döntése, 2026-11-05: a képleírás a próbakör része.
      'A 20 termék képeinek szöveges leírása (alt szöveg) is.',
    ],
    nemTartalmaz: ['a feltöltés (azt Ön végzi)', 'termékfotó, árazás, fordítás'],
    kell: ['a 20 termék listája', 'a meglévő szövegek és saját anyagai', 'a gyártói adatlapok'],
  },
  lepcsok: [
    { nev: 'A többi termék', szoveg: 'A próbakör után a további termékekre írásos árajánlatot küldök. Hogy folytatja-e, azt Ön dönti el.', ar: undefined },
  ],
  // A régi „Nem Önnek való, ha…” harmadik pontja, szó szerint (az első kettő a „Mit nem tartalmaz” sorral azonos).
  csomagMondatok: ['Akadálymentességi megfelelést vagy auditot keres: ezt nem vállalom.'],
  kapcsolat: {
    level: {
      targy: 'Termékleírás-próbakör, 20 termék',
      torzs: 'Jó napot kívánok!\n\nA 20 termékes próbakört kérném.\n\nWebshopunk címe:\n\nPlatform (UNAS, Shoprenter, WooCommerce vagy más):\n',
    },
  },
}

