import type { RollinStage } from './scene'

// A Rollin-dokkoló szemléltető jelenet szövege. Az oldal (src/site/pages/Munkaim.tsx) és a jelenet csomagja (mount.ts) is innen veszi, egy példányban; DOM-ot nem használ,
// így az oldal építésekor is betölthető. A rajz szemléltetés, nem pontos másolat; leírása a rajzterület leírása, amíg a rajz látszik (a „Fénykép” kulcs a fotót mutatja).
export const SZOVEG = {
  /** A rajzterület leírása, amíg a rajz látszik. */
  leiras: 'A rajz négy dokkolóhelyet és egy elektromos rollert mutat. A nyitójel, a zárkar és a töltésjelző a kiválasztott lépéssel együtt változik.',
  /** A lépések kulcsai a „Fénykép” kulcs után. */
  lepesek: ['Dokkolva', 'Nyitás', 'Úton', 'Töltés'],
  csoport: 'Egy bérlés a dokkolóban',
  allapot: {
    docked: 'A jármű dokkolva van, a zár zárva. Válassza a Nyitás lépést.',
    signal: 'A kérés eljut az állomáshoz.',
    open: 'A zár kinyílik.',
    leaving: 'A jármű elhagyja a dokkolót.',
    ride: 'A jármű úton van, a bérlés folyamatban. A Töltés lépés a visszahelyezést mutatja.',
    return: 'A jármű visszakerül a dokkolóba.',
    locking: 'A jármű a helyén van, a zár bezárul.',
    charge: 'A zár zárva, a bérlés lezárult, a töltés elindult.',
  } satisfies Record<RollinStage, string>,
}
