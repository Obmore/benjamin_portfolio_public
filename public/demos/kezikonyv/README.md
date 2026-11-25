# Digitális kezelési kézikönyv – semleges bemutató

[Megnyitás](https://ottbenjamin.hu/demos/kezikonyv/)

QR-kóddal megnyitható, gyári számhoz kötött kezelési kézikönyv egy kitalált géphez („Minta Gépgyár Kft.”, MV-200 szalagfűrész). Kis gépgyártóknak szóló bemutatókhoz készült. Fejlesztő: Ott Benjámin.

- A gépen lévő QR-kód a gyári számot hordozza (`?sn=MV200-0001`), és pontosan annak a gépnek a kiadását nyitja meg.
- Két gyári szám, két kiadás: az MV200-0001 a v1.2-t, az MV200-0002 a v1.3-at kapja. A régebbi gépnél az oldal kiírja, hogy van újabb kiadás, de az más gépekre vonatkozik. A v1.3-ban változott részeket módosítássáv jelöli.
- Fejezetek: biztonsági előírások, üzembe helyezés, kezelés, karbantartás, hibaelhárítás, alkatrészek; kiadások és változásnapló.
- Ragadó fejezetsáv mobilon, oldalsáv asztali nézetben; teljes szöveges keresés ékezet nélkül is, kiemelt találatokkal és fejezetenkénti találatszámmal.
- Biztonsági jelzések jelzőszóval (veszély, figyelmeztetés, vigyázat, megjegyzés), karbantartási terv és hibaelhárítási táblázat (hiba, ok, teendő).
- Nyomtatás és mentés PDF-be A4-re: az első oldalon az adattábla, minden oldalon gép, gyári szám, kiadás és oldalszám (a futófej Chromium-alapú böngészőkben jelenik meg).
- Letöltés offline használatra: egyetlen HTML-fájl, beágyazott stílussal és betűkkel, szkript nélkül.
- Papíralapú példány igénylése: bemutató űrlap, amely nem küld el semmit; beküldéskor megmutatja, mit kapna a gyártó.
- „Mit kap ebből a gyártó?” sáv (mobilon alapból csukva) a gyártónak szóló magyarázattal, mintakéréssel és a főoldalra mutató hivatkozással.

A kézikönyv szövege kitalált mintaszöveg; valós gép kezeléséhez vagy biztonsági útmutatóként nem használható. Éles bevezetésnél a gyártó saját tartalma, gyári számai és kiadásai kerülnek a helyükre. A tartalom és a jogszabályi megfelelés a gyártóé; a demó a technikai megoldást mutatja.

## A `sn` paraméter

- `?sn=MV200-0001` vagy `?sn=MV200-0002`: a gép kézikönyve. A kis- és nagybetű mindegy.
- `sn` nélkül: gépválasztó a két gyári számmal és mindkettő QR-kódjával. A kód az aktuális oldalcímből készül, így a képernyőről telefonnal beolvasva is működik.
- Ismeretlen gyári számnál hibaüzenet és a gépválasztó jelenik meg.
- Horgony is megadható, például `?sn=MV200-0002#hibaelharitas`.

A gyári számok és kiadások hozzárendelése az `app.js` elején, az `UNITS` és a `VERSIONS` listában van; a tartalom a `CHAPTERS` listában. Egy blokk `from` és `until` mezője adja meg, mely kiadásokban látszik, a `chg` pedig a módosítássávot.

## Fájlok

Az oldal önálló HTML, CSS és JavaScript, keretrendszer, build és külső hálózati kérés nélkül. A `public` könyvtárból a portfólió meglévő Vite buildje változatlanul másolja a GitHub Pages kimenetébe. A betűk a portfólió `fonts` könyvtárából, a fejléc jele a `brand` könyvtárból jön (relatív hivatkozással, így alkönyvtárban is működik). Betöltés után minden funkció hálózat nélkül fut; a letöltött HTML-fájl internet nélkül is megnyitható.

A QR-kódot a mellékelt qrcode-generator (Kazuhiko Arase) rajzolja meg a böngészőben. Licence: MIT, `qrcode-generator-LICENSE.txt`. A `qrcode-generator.min.js` az npm-csomag 2.0.4-es `dist/qrcode.js` fájljából (SHA-256: `79ec86f82856005b1c887905cfccfcfbec3821ca61c7fd5a952faa5f778f791c`) készült: a kódon nem változtattunk, csak a rolldown 1.1.5 `minifySync` függvényével tömörítettük, és licencfejlécet kapott. A tömörített és az eredeti fájl ugyanazokat a QR-mátrixokat adja.
