# Gépadat-gyűjtő – semleges bemutató

[Megnyitás](https://ottbenjamin.hu/demos/adatgyujto/)

Három kitalált gép („Minta Gépgyár”) állapota, mérései és riasztásai egy webes felületen, szimulált adatokkal. Gyártó és gépgyártó cégeknek szóló bemutatókhoz készült. Fejlesztő: Ott Benjámin.

- Gépenként állapot (fut, áll, hiba), hőmérséklet, áramfelvétel, ciklus/óra és darabszám.
- Az utolsó 60 perc grafikonja a riasztási határral.
- Riasztások kezdete és megszűnése; a „Hiba szimulálása” gomb a kiválasztott gépen túlmelegedést és automatikus leállást játszik le.
- Műszakjelentés és CSV-letöltés (pontosvesszővel tagolt, UTF-8, Excelben megnyitható).

A demó nem kapcsolódik géphez és szerverhez: minden adat a böngészőben keletkezik egy rögzített kezdőértékű álvéletlen-generátorból. Egy másodperc a bemutatóban egy perc a műszakban (a `?tempo=1…20` paraméter gyorsítja, a `?kezdes=ÓÓPP` a kezdő időpontot állítja). A szimuláció folyamatos: három műszak váltja egymást, műszakváltáskor a műszakjelentés újraindul.

Éles bevezetésnél a cég saját gépei, jelei, riasztási határai és hálózati szabályai kerülnek a helyükre. Hogy egy gép mely jeleit lehet kiolvasni (Modbus TCP, OPC UA, digitális vagy analóg kimenet), azt gépenként fel kell mérni. Nincs benne gépvezérlés, karbantartás-tervezés vagy OEE-számítás.

## Fájlok

Az oldal önálló HTML, CSS és JavaScript, külső könyvtár és hálózati kérés nélkül. A `public` könyvtárból a portfólió meglévő Vite buildje változatlanul másolja a GitHub Pages kimenetébe. A relatív eszközhivatkozások miatt alkönyvtárban is működik.
