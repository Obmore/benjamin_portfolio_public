import { BELEPOK } from '../belepok'
import { GEPRENDELET } from '../jogszabalyok'
import { nagybetuvel } from '../kozos'
import type { Szegmens } from './tipus'

// Gépgyártók: digitális használati útmutató QR-kóddal. Forrás: Benjámin jóváhagyott
// szegmensleírása (2026-11-04 este): a gépen lévő QR-kódról a kezelő a saját gépe útmutatóját
// nyitja meg, letölthető, nyomtatható formában, verziózva, a meglévő PDF-ekből; megfelelést nem
// ígérünk (a gyártóé). Jogszabály: src/content/jogszabalyok.ts (GEPRENDELET, 54. cikk és
// 10. cikk (7) bekezdés). Bemutató: public/demos/kezikonyv. „Mérnöki dokumentáció”: a korábbi főoldal tapasztalat-szövege.
// A „Miért most?” első, harmadik és ötödik pontja: a /megrendeles/ gépkönyv-sorában egy bekezdésként, ebben a sorrendben áll (a tulajdonos döntése, 2026-11-18).
const RENDELET_ALKALMAZAS = `${nagybetuvel(GEPRENDELET.nev)} ${GEPRENDELET.alkalmazasTol} alkalmazandó.`
const RENDELET_10_EV = 'Az útmutatónak a gép várható élettartama alatt, de legalább a forgalomba hozataltól számított 10 évig online elérhetőnek kell lennie.'
const GYARTO_FELEL = 'A megfelelésért a gyártó felel; ezt nem vállalom át.'

export const GEPKONYV: Szegmens = {
  id: 'gepkonyv',
  hos: {
    kinek: 'Gépgyártóknak',
    cim: 'Melyik PDF az érvényes? A gépen lévő QR-kód megmutatja.',
    gomb: { felirat: 'Kérem az első gép útmutatóját' },
    garancia: 'Első rész: a gép útmutatójának első fejezete.',
  },
  demo: {
    mappa: 'kezikonyv',
    href: '/demos/kezikonyv/',
    cim: 'Próbálja ki a mintagép útmutatóját',
  },
  belepo: {
    ...BELEPOK.gepkonyv,
    leiras: 'Egy géptípus meglévő útmutatója online, QR-kóddal megnyitható formában.',
    ido: null,
    tartalmaz: [
      'Egy géptípus meglévő PDF-útmutatója online, fejezetekre bontva, telefonon is olvashatóan.',
      'QR-kód, amely a gépről ehhez az útmutatóhoz vezet.',
      'Letölthető és nyomtatható változat.',
      'Változatok dátummal: látszik, melyik az érvényes.',
      // Terjedelem: Benjámin döntése, 2026-11-05.
      'Egy nyelv, legfeljebb 40 oldal, egy javítási kör.',
    ],
    nemTartalmaz: ['az útmutató szövegének megírása vagy jogi ellenőrzése', 'a megfelelőség igazolása', 'további nyelvek és géptípusok (azokra külön árajánlat)'],
    kell: ['egy géptípus meglévő útmutatója PDF-ben', 'a géptípus neve és a nyelvek listája'],
  },
  lepcsok: [
    { nev: 'A többi géptípus', szoveg: 'Írásos árajánlat a géptípusok és a nyelvek száma szerint.', ar: undefined },
    {
      nev: 'Üzemeltetés',
      szoveg: 'Az útmutatók online elérhetősége; a rendelet szerint legalább 10 évig elérhetőnek kell lenniük. Új kiadás feltöltése külön munka.',
      // Benjámin döntése, 2026-11-05: a meglévő üzemeltetési díj (megrendeles F).
      ar: { osszeg: 'hosting', utotag: ' / hó' },
    },
  ],
  csomagMondatok: [`${RENDELET_ALKALMAZAS} ${RENDELET_10_EV} ${GYARTO_FELEL}`],
  kapcsolat: {
    level: {
      targy: 'Digitális használati útmutató – első gép',
      torzs: 'Jó napot kívánok!\n\nAz első gép digitális útmutatóját kérném.\n\nGéptípus:\n\nA mostani útmutató (PDF, papír, nyelvek):\n\nHány géptípusról van szó:\n',
    },
  },
}
