# Tudáslap – műszaki tudás a gép mellett (semleges bemutató)

[Megnyitás](https://ottbenjamin.hu/demos/tudaslap/) (az oldal `noindex`)

QR-kóddal megnyitható műszaki tudáslapok egy kitalált üzemhez („Minta Fémmegmunkáló Üzem”): egy szalagszállító, kb. 2,2 kW-os háromfázisú aszinkronmotor és egy kitalált típusú frekvenciaváltó (FV-22). Fejlesztő: Ott Benjámin.

- Három lap: **Átállás termékváltáskor** (eszközök és anyagok, majd fő lépés – kulcspont – miért táblázat), **Hibakeresési fa** („Indításkor túláramhibával leold”: tünet, ellenőrzés, eredmény, teendő, mellékággal és „Ha egyik sem” zárással), **Mire figyelj** (egy pont, egy kártya).
- Minden lap tetején állapotsor: készítette, rögzítette, jóváhagyta, jóváhagyás dátuma, verzió. A szerepek: „tapasztalt kolléga” (készíti és jóváhagyja) és „új kolléga” (rögzíti). A nevek kitalált mintanevek, így is vannak jelölve.
- A QR-kód a **lap azonosítójához** kötött (`?lap=atallas`), nem a verzióhoz. Új verziónál a gépen lévő matrica ugyanaz marad, és a legújabb jóváhagyott verziót nyitja meg. A verziónapló példát ad: v1.0, majd v1.1, mindegyik bejegyzésnél ugyanazzal a QR-címmel és az „A QR-kód nem változott.” megjegyzéssel. A v1.1-ben módosult részeket „új a v1.1-ben” jelölés mutatja.
- „Így készül” szakasz három lépésben: a tapasztalt kolléga elmondja és megmutatja, az új kolléga rögzíti, a lap a tapasztalt kolléga jóváhagyásával élesedik.
- Keresés ékezet nélkül is, kiemelt találatokkal, előző és következő találat gombbal.
- Nyomtatás és mentés PDF-be A4-re: az állapotsor és a QR-kód az első oldalon, minden oldalon üzem, lap, verzió és oldalszám (a futófej Chromium-alapú böngészőkben jelenik meg).
- Világos és sötét megjelenés a böngésző beállítása szerint; nyomtatásban mindig világos.
- Minden nézetben látszik: „Bemutató – kitalált üzem és gép, mintaadatok”.

A lapok szövege kitalált mintaszöveg; valós gép kezeléséhez, javításához vagy biztonsági útmutatóként nem használható. A szöveg nem nevez meg valós gyártót vagy gyártói paraméterszámot, nem tartalmaz árat vagy eredményígéretet, és egyik lépése sem kerül meg védőburkolatot, reteszt vagy védelmet. Éles bevezetésnél az üzem saját tartalma, szakembere és jóváhagyása kerül a helyére. A tartalom és a jogszabályi megfelelés az üzemé; a demó a technikai megoldást mutatja.

## A `lap` paraméter

- `?lap=atallas`, `?lap=hibakereses` vagy `?lap=mirefigyelj`: a lap. A kis- és nagybetű mindegy.
- `lap` nélkül: lapválasztó a három lappal és mindegyik QR-kódjával. A kód az aktuális oldalcímből készül, így a képernyőről telefonnal beolvasva is működik.
- Ismeretlen azonosítónál hibaüzenet és a lapválasztó jelenik meg.

A lapok adatai (azonosító, verziók, verziónapló) az `app.js` elején, a `SHEETS` listában vannak; a lapok szövege a `content` objektumban.

## Fájlok

Az oldal önálló HTML, CSS és JavaScript, keretrendszer, build és külső hálózati kérés nélkül. A `public` könyvtárból a portfólió meglévő Vite buildje változatlanul másolja a GitHub Pages kimenetébe. A betűk a mappa `fonts` könyvtárában vannak (a kezikonyv-demó betűinek azonos másolata), a fejléc jele a `brand` könyvtárból jön (relatív hivatkozással, így alkönyvtárban is működik). Betöltés után minden funkció hálózat nélkül fut.

A QR-kódot a mellékelt qrcode-generator (Kazuhiko Arase) rajzolja meg a böngészőben. Licence: MIT, `qrcode-generator-LICENSE.txt`. A `qrcode-generator.min.js` a kezikonyv-demó fájljának változatlan másolata (az eredetről és az ellenőrző összegről lásd `../kezikonyv/README.md`).
