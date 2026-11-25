import type { Level } from './kozos'

// A /megrendeles/ oldal („Csomagok és árak”) szövege. Benjámin döntése, 2026-11-05: az oldal az új
// oldalkeretben épül újra. A szövegek szó szerint a korábbi megrendeles/index.html-ből és a Benjámin által
// jóváhagyott katalógusból (e2e/fixtures/catalog-approved.json) származnak; a négy belépő csomag neve, ára,
// terjedelme és levele a src/content/belepok.ts-ből és a szegmensfájlokból (src/content/szegmensek/*.ts) jön
// (az oldal React-komponense olvassa őket, itt nem ismétlődnek). Ár csak a src/data/pricing.ts-ből:
// „{ar:…}” helyére a formázott összeg kerül, és minden összeg mellett ott az „AAM (áfamentes)” jelölés.

export const CSOMAGOK_META = {
  cim: 'Csomagok és árak – Ott Benjámin',
  // A tulajdonos korábban jóváhagyott meta leírása, szó szerint.
  leiras:
    'Csomagok és árak: webes rendelőlap, bemutatkozó oldal, termékleírás és üzemeltetés fix díjjal, automatizálás és mérési adatok feldolgozása egyeztetett kerettel.',
}

export const CSOMAGOK_OLDAL = {
  // A főmenü felirata és az oldal H1-e.
  cim: 'Csomagok és árak',
  // A tulajdonos jóváhagyta (2026-11-18): mind a négy belépő csomag név szerint; a második mondat a tulajdonos korábban jóváhagyott szövege.
  bevezeto:
    'Fix áron rendelhet termékleírást, gépkönyvet, megrendelőlapot és bemutatkozó oldalt. Egyedi munkánál előbb megbeszéljük, mire van szüksége, és utána küldök ajánlatot.',
  // A szakaszcímek Benjámin megrendelése szerint (2026-11-05); a „Belépő csomag” megnevezés a főoldalon és a szegmensoldalakon is így áll.
  belepokCim: 'Belépő csomagok',
  // A tulajdonos jóváhagyta (2026-11-18): egyszer, a „Belépő csomagok” cím alatt, mind a négy csomagra érvényesen.
  belepokMondat: 'Nem kell semmit lecserélni: a mostani rendszere mellé kerül.',
  // A csoport neve: a tulajdonos korábban jóváhagyott megnevezése.
  tovabbiCim: 'További szolgáltatások',
  // A csomag adatlapjának fejsora és sorai (a tulajdonos jóváhagyta, 2026-11-18); az „Ár” a komponens alapértelmezett felirata.
  adatlap: { fej: 'Csomag', tartalom: 'Tartalom', hatarido: 'Határidő' },
  // A jobb oszlop tényszavai (a korábbi szegmensoldalak és belépő kártyák szavai).
  tenyek: { kinek: 'Kinek való', tartalmaz: 'Mit tartalmaz', nemTartalmaz: 'Mit nem tartalmaz', kell: 'Mi kell Öntől' },
  // Az ár nélküli szolgáltatások ár-cellája (a tulajdonos jóváhagyta, 2026-11-18); az adatlap hiányzó árának szövegével egyezik. Mellette nincs AAM-jelölés.
  egyediAjanlat: 'Egyedi ajánlat',
}

/** The ÁSZF first-part point: the page's two links (the promise line and the foot) point at it. */
export const ASZF_ELSO_RESZ = '/aszf/#elso-resz'

/**
 * A táblázat lába (a tulajdonos jóváhagyta, 2026-11-18; az ÁSZF 3. és 8. pontja szerint; a fizetés első mondata a tulajdonos döntése, 2026-11-18: „Feltétel a tábla alatt”, az ÁSZF első rész pontja szerint): két bekezdés, az ár véglegességéről szóló az első, a fizetésről szóló a második.
 * A küszöb-helyőrző helyére a pricing.ts küszöbe kerül, AAM-jelölés nélkül; az „{aszf}” helyén az „ÁSZF” hivatkozás áll (az ÁSZF első rész pontjára: /aszf/#elso-resz). Az összeg és az utána álló „-os” nem törik.
 */
export const CSOMAGOK_LAB = {
  dij: 'A díjat a munka előtt írásban rögzítem: csomagnál a fix díjat, egyedi munkánál az ajánlat összegét. Külön fizetendő például a domain és az új funkció.',
  fizetes:
    'A négy belépő csomagnál nem fizet, ha az első rész átadása után 8 munkanapon belül írásban jelzi, hogy nem folytatja. {kuszob:depositFrom}-os vagy nagyobb fix díjas csomagnál 50% előleg jár, a belépő csomagoknál csak az első rész elfogadása után. Részletek: {aszf}.',
  aszf: 'ÁSZF',
}

/** Egy tartalmi blokk a szolgáltatás sorában, a jóváhagyott szöveg sorrendjében. */
export type Blokk =
  | { tipus: 'p'; szoveg: string }
  | { tipus: 'ul'; elemek: string[] }
  /** Egy sor szöveg „{ar:…}” összeggel és AAM-jelöléssel, szövegméretben. */
  | { tipus: 'arSor'; szoveg: string }
  /** A jóváhagyott díjmondat ott, ahol nincs összeg: félkövéren. */
  | { tipus: 'dij'; szoveg: string }

export interface Szolgaltatas {
  /** A horgony: #szolgaltatas-<id> (a régi horgonyok megmaradnak). */
  id: string
  cim: string
  /** A fejsor ár-cellája: „{ar:…}” és az utótag, a mondat záró pontja nélkül; ahol nincs összeg, a cella az „Egyedi ajánlat”. */
  ar?: string
  blokkok: Blokk[]
  /** Alsorok saját névvel és ár-cellával (a „Rendelőlap a saját táblázata szerint”, az „Üzemeltetés módosításokkal”). */
  alsorok?: { cim: string; ar: string; blokkok: Blokk[] }[]
  /** Az alsorok után, a hivatkozás előtt. */
  zaro?: Blokk[]
  /** A hivatkozás felirata: „Megrendelés” fix díjnál, „Kérjen ajánlatot” egyedi munkánál. */
  gomb: string
}

// Forrás: megrendeles/index.html (korábbi állapot) és e2e/fixtures/catalog-approved.json, A–F kártyák.
// A „Mit tartalmaz:” felvezetés és a felsorolás pontjai szó szerint. Az összeg a fejsor cellájában áll (a mondat záró pontja nélkül), az üzemeltetés két sora a vesszőnél szétválasztva.
export const TOVABBI_SZOLGALTATASOK: Szolgaltatas[] = [
  {
    id: 'rendelolap',
    cim: 'Webes rendelőlap vagy ajánlatkérő',
    ar: '{ar:orderForm} egyszeri díj',
    blokkok: [
      {
        tipus: 'p',
        szoveg:
          'Ha a vevőinek ma le kell tölteniük egy Excel- vagy PDF-lapot, ki kell tölteniük, majd e-mailben vissza kell küldeniük, ugyanezt egy webes űrlap is el tudja végezni az Ön oldalán. A vevő az oldalon adja meg az adatokat, és a rajzot vagy más fájlt is feltölthet. Ön a kérést egyben, rendezetten kapja meg e-mailben. A megszokott Excel-lap ettől még megmaradhat azoknak, akik ahhoz szoktak.',
      },
      { tipus: 'p', szoveg: 'Mit tartalmaz:' },
      {
        tipus: 'ul',
        elemek: [
          'egy űrlap az Ön meglévő honlapjába építve, legfeljebb tíz mezővel',
          'fájlfeltöltés, például Excel-, PDF- vagy DXF-fájl',
          'visszaigazoló e-mail a vevőnek',
          'egy javítási kör',
        ],
      },
      { tipus: 'p', szoveg: 'Nem tartalmaz árkalkulációt, adatbázist és a meglévő rendszereivel való összekötést. Ezeket egyeztetés után külön árazom.' },
      { tipus: 'arSor', szoveg: 'Üzemeltetés kérésre havi {ar:hosting}.' },
      { tipus: 'p', szoveg: 'Általában három héten belül elkészül, miután megkaptam a mostani lapot és a mezők listáját.' },
    ],
    alsorok: [
      {
        cim: 'Rendelőlap a saját táblázata szerint',
        ar: '{ar:orderFormSheet} egyszeri díj',
        blokkok: [
          {
            tipus: 'p',
            szoveg:
              'Ha a beérkező kérésekkel táblázatban dolgozik tovább, minden kérés ugyanabban az oszloprendben, új sorként érkezik a saját online táblázatába, amelyet Excel-fájlként is letölthet. Így nem kell kézzel átmásolnia az adatokat. A táblázat formáját a mostani táblázata alapján állítom be.',
          },
        ],
      },
    ],
    gomb: 'Megrendelés',
  },
  {
    id: 'automatizalas',
    cim: 'Ismétlődő feladatok automatizálása',
    blokkok: [
      {
        tipus: 'p',
        szoveg:
          'Ha valamit hetente vagy naponta ugyanúgy, kézzel végeznek, például táblázatokat másolnak össze, adatokat írnak át egyik helyről a másikra, vagy ugyanazt az e-mailt küldik ki sokszor, azt gyakran egy kis program is el tudja végezni. Excel-fájlokkal, CSV-exportokkal és e-mailekkel dolgozom, a programot Pythonban írom. A munka végén rövid leírást kap arról, hogyan kell használni.',
      },
      { tipus: 'dij', szoveg: 'Óradíj alapján, előre egyeztetett felső kerettel. A keretet a feladat átnézése után írásban megadom.' },
    ],
    gomb: 'Kérjen ajánlatot',
  },
  {
    id: 'adatok',
    cim: 'Mérési és műszaki adatok feldolgozása Pythonban',
    blokkok: [
      {
        tipus: 'p',
        szoveg:
          'Villamosmérnökként és szoftverfejlesztőként mérési és műszaki adatokkal is dolgozom. Ha a műszerekből vagy rendszerekből exportált fájlokat ma kézzel rendezik és összesítik, ezt egy bármikor újra lefuttatható Python-program is elvégezheti. Az eredmény egy összesítő táblázat vagy grafikon, és egy rövid leírás.',
      },
      { tipus: 'dij', szoveg: 'Óradíj alapján, előre egyeztetett felső kerettel.' },
    ],
    gomb: 'Kérjen ajánlatot',
  },
  {
    id: 'egyedi',
    cim: 'Egyedi webes megoldás',
    blokkok: [
      {
        tipus: 'p',
        szoveg:
          'Ha a rendelés vagy az ajánlatkérés számolást, állapotkövetést vagy saját kezelőfelületet igényel, vagy egy belső nyilvántartást szeretne egyszerűbbé tenni, ahhoz egyedi webes megoldást készítek. Ahol már létezik kész, megbízható megoldás, arra építek, és nem írok meg mindent az alapoktól. Írja le röviden, hogyan működik most. Átnézem, egyeztetünk, és utána írásos ajánlatot küldök, benne a pontos tartalommal, az árral és a várható időtartammal. Nagyobb munkánál először egy kisebb, de már használható változat készül el.',
      },
      { tipus: 'dij', szoveg: 'Az árat az igényfelmérés után adom meg.' },
    ],
    gomb: 'Kérjen ajánlatot',
  },
  {
    id: 'uzemeltetes',
    cim: 'Üzemeltetés',
    ar: 'havi {ar:hosting}',
    blokkok: [
      {
        tipus: 'p',
        szoveg:
          'Ha nem szeretne a tárhellyel és a technikai részletekkel foglalkozni, az oldal üzemeltetését átvállalom. Ez a webes csomagokhoz választható kiegészítő szolgáltatás.',
      },
      { tipus: 'ul', elemek: ['tárhely és biztonságos (https) kapcsolat', 'rendszeres mentés', 'működésfigyelés és javítás, ha az oldal leáll'] },
    ],
    alsorok: [
      {
        cim: 'Üzemeltetés módosításokkal',
        ar: 'havi {ar:hostingWithEdits}',
        blokkok: [
          {
            tipus: 'ul',
            elemek: [
              'minden, ami az üzemeltetésben szerepel',
              'havonta legfeljebb fél óra apró módosítás, például ár, nyitvatartás, szöveg vagy kép cseréje',
            ],
          },
        ],
      },
    ],
    zaro: [{ tipus: 'p', szoveg: 'A domain díja egyik csomagban sincs benne.' }],
    gomb: 'Kérjen ajánlatot',
  },
]

// A levél váza az új kártyákon: ugyanaz a bevezető, mint a /munkaim/ oldalé
// (src/content/munkaim.ts, MUNKAIM_KAPCSOLAT). A tárgy a kártya címe, „Érdeklődés: ” előtaggal
// (a többi oldal tárgysorának mintájára, pl. „Érdeklődés: bemutatkozó oldal”).
const LEVEL_TORZS = 'Jó napot kívánok!\n\nEzzel kapcsolatban írok:\n\nÍgy működik most:\n\nCégünk és honlapunk:\n'

export function szolgaltatasLevel(cim: string): Level {
  return { targy: `Érdeklődés: ${cim}`, torzs: LEVEL_TORZS }
}

// A kapcsolati szakasz (a tulajdonos jóváhagyta, 2026-11-18). Az első mondat a régi „Mit írjak az első üzenetbe?” kérdés válaszának első mondata, szó szerint
// (a válasz többi része és a régi kérdések kimaradnak); a másodikat a tulajdonos hagyta jóvá.
export const CSOMAGOK_KAPCSOLAT = {
  cim: 'Mit írjak az első üzenetbe?',
  szoveg: 'Írja le, hogyan dolgozik most, mi okoz nehézséget, és milyen eredményt szeretne.',
  masodik: 'Először egy kisebb, már használható változat készül.',
  // A „Levelet írok” hivatkozás levelének tárgya: a korábban jóváhagyott tárgy (a közös kapcsolati végen a tárgy opcionális).
  targy: 'Megrendelés',
}
