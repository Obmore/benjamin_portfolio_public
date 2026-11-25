# Teendő 2027-01-01: nyilvántartó szerv NAV → MKIK

**Forrás (Benjámin ellenőrzése, 2026-11-24):** 2026. évi III. törvény, az Evectv. új 3/A. §-a, hatály 2027-01-01 (<https://njt.jog.gov.hu/jogszabaly/2026-3-00-00>). A nyilvántartási szám (59492319) változatlanságát hivatalos forrás nem mondja ki: **ne írd át, csak ha az MKIK/NAV közleménye megerősíti**.

## Miért nem előre cserélünk
2027-01-01 előtt a NAV a nyilvántartó, tehát az oldalon is az áll. A build statikus és csak `main`-re push-ra épül újra (`deploy.yml`), a repóban nincs dátum szerinti váltás, ezért az átállás egy külön, kis PR, amit **2027-01-01-én vagy utána** kell merge-elni (a merge után a deploy automatikus). Dátumkapu nem érdemes: egy sor, kétszer előforduló szöveg.

## A PR tartalma (3 hely, mind szöveg)
1. `src/content/alapadatok.ts`: `NYILVANTARTO` értéke `'Magyar Kereskedelmi és Iparkamara'`, a fölötte lévő kommentet frissíteni (forrás + dátum). Ez adja a láblécet (`src/site/fooldal/Lablec.tsx`).
2. `impresszum/index.html:40`: „nyilvántartó: Nemzeti Adó- és Vámhivatal” → „nyilvántartó: Magyar Kereskedelmi és Iparkamara”.
3. `en/imprint/index.html:40`: „kept by the National Tax and Customs Administration” → az MKIK hivatalos angol neve (Hungarian Chamber of Commerce and Industry; ellenőrizd a kamara saját angol megnevezését).

Az `e2e/fooldal.spec.ts:90` a konstanst olvassa, nem kell módosítani. Az adatkezelési tájékoztató és az ÁSZF nem említi a nyilvántartót (grep), ezért az `docs/privacy-content.sha256` nem változik.

## Ellenőrzés a PR előtt
- A hivatalos szervnév pontos alakja és az Ekertv. 4. § szerinti kötelező adatkör az MKIK közleményében / a hatályos törvényben.
- `npm run check` és `e2e/fooldal.spec.ts` zöld; impresszum kézi átolvasása.
- Nem jogi tanács; kétség esetén könyvelő/kamara.
