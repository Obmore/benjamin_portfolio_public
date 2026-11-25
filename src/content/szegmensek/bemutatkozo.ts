import { BELEPOK } from '../belepok'
import type { Szegmens } from './tipus'

// Bemutatkozó oldal kisvállalkozásoknak és szakembereknek, akiknek nincs jó honlapjuk. Forrás: megrendeles E
// (LAP E · CSOMAG, „Bemutatkozó oldal”; az ottani szöveg és terjedelem, Benjámin döntése, 2026-11-05):
// legfeljebb hat tartalmi rész, legalább hat és legfeljebb tíz fotó (az ügyfél adja át, és jogosult a
// felhasználásukra), kapcsolatfelvételi lehetőség, alapvető keresőbeállítás (oldalcím, leírás, Google Search
// Console), egy javítási kör; a domain díja külön, a domain az ügyfél nevére szól; általában három héten
// belül kész, a szövegek és a fotók megérkezése után; üzemeltetés kérésre havi díjjal. Üzemeltetés:
// megrendeles F (LAP F · EGYEDI, „Üzemeltetés”; pricing.ts hosting, hostingWithEdits). Egyedi webes
// megoldás: megrendeles D. Ár: src/content/belepok.ts (pricing.ts introSite).
// Nincs benne 3D, ígéret a találati helyezésre, vélemény vagy logó, és a szöveg nem nevezi meg az ügyfelet mint személyt. A „Lélek & Nyelv” valódi
// ügyfélmunka (https://lelekesnyelv.hu/): az ügyfél beleegyezett a név, a képernyőkép és az élő link megjelenítésébe
// (Benjámin megerősítése, 2026-11-06). Benjámin: terv, fejlesztés, szövegek, domain és tárhely, üzemeltetés. A „Lélek & Nyelv”
// márkanév az ügyfél engedélyével szerepel; a képernyőkép az ügyfél oldalának saját fejlécét mutatja (keresztnév, aláíró
// kezdőbetű), ezt is a 2026-11-06-i engedély fedi. A képernyőkép: public/work/lelek-es-nyelv.webp (1280×800).
export const BEMUTATKOZO: Szegmens = {
  id: 'bemutatkozo',
  hos: {
    kinek: 'Kisvállalkozásoknak és szakembereknek',
    cim: 'Nincs jó honlapja? Elkészítem a bemutatkozó oldalát.',
    gomb: { felirat: 'Kérem a bemutatkozó oldalamat' },
    garancia: 'Első rész: az oldal terve.',
    masodlagos: { felirat: 'Megnézem az élő oldalt', href: 'https://lelekesnyelv.hu/' },
  },
  demo: {
    href: 'https://lelekesnyelv.hu/',
    cim: 'Lélek & Nyelv',
  },
  belepo: {
    ...BELEPOK.bemutatkozo,
    leiras: 'Legfeljebb hat részből álló bemutatkozó oldal az Ön szövegeiből és fotóiból, mobilon is jól olvasható.',
    ido: 'Általában három héten belül elkészül, miután megkaptam a szövegeket és a fotókat.',
    tartalmaz: [
      'Legfeljebb hat tartalmi rész, például bemutatkozás, szolgáltatások, munkák, elérhetőség.',
      'Legalább hat, legfeljebb tíz fotó, amelyet Ön ad át, és amelyek felhasználására jogosult.',
      'Kapcsolatfelvételi lehetőség.',
      'Alapvető keresőbeállítás: oldalcím és leírás a Google-találatokhoz, valamint az oldal regisztrálása a Google Search Console-ban.',
      'Egy javítási kör.',
    ],
    nemTartalmaz: ['a domain díja (külön fizetendő)', 'hat résznél több tartalmi rész, tíznél több fotó', 'üzemeltetés (kérésre, havi díjért)'],
    kell: [
      'a szövegek, amelyeket az oldalon látni szeretne',
      'legalább hat, legfeljebb tíz fotó, amelynek felhasználására jogosult',
      'a domain: a díját Ön fizeti, és a domain az Ön nevére szól',
    ],
  },
  lepcsok: [
    {
      nev: 'Üzemeltetés',
      szoveg: 'Kérésre átvállalom a tárhelyet és a biztonságos (https) kapcsolatot, a rendszeres mentést, a működésfigyelést, és javítom, ha az oldal leáll.',
      ar: { osszeg: 'hosting', utotag: ' / hó' },
    },
    {
      nev: 'Üzemeltetés módosításokkal',
      szoveg: 'Minden, ami az üzemeltetésben szerepel, és havonta legfeljebb fél óra apró módosítás, például ár, nyitvatartás, szöveg vagy kép cseréje.',
      ar: { osszeg: 'hostingWithEdits', utotag: ' / hó' },
    },
  ],
  csomagMondatok: [],
  kapcsolat: {
    level: {
      targy: 'Érdeklődés: bemutatkozó oldal',
      torzs: 'Jó napot kívánok!\n\nBemutatkozó oldalt szeretnék.\n\nEzzel foglalkozom:\n\nVan-e már honlapom (cím):\n',
    },
  },
}
