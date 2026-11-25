import { BELEPOK } from '../belepok'
import type { Szegmens } from './tipus'

// Lapszabászatok. Forrás: a lapszabászati demó (public/demos/lapszabaszat, index.html lábjegyzete
// és README: saját anyaglista, élzáró-választék, gyártási szabályok és Excel-sablon éles
// bevezetésnél; „Nincs automatikus árazás, szabásoptimalizálás vagy gyártási jóváhagyás”),
// megrendeles A (honlapba építve; összekötés külön árazva). A termék alapja a meglévő rendszer és a
// demó beállítása a szabászat saját formátumára (CLAUDE.md 8. szabály). Ár: src/content/belepok.ts.
export const LAPSZABASZAT: Szegmens = {
  id: 'lapszabaszat',
  hos: {
    kinek: 'Lapszabászatoknak',
    cim: 'Szabásrendelés, amit nem kell újra begépelni.',
    gomb: { felirat: 'Kérem a saját megrendelőlapomat' },
    garancia: 'Első rész: a megrendelőlap tervezete.',
  },
  demo: {
    mappa: 'lapszabaszat',
    href: '/demos/lapszabaszat/',
    cim: 'Próbálja ki a mintaszabászat lapját',
  },
  belepo: {
    ...BELEPOK.lapszabaszat,
    leiras: 'A mintaszabászat lapja az Ön adataira beállítva, a meglévő honlapjába építve.',
    ido: null,
    tartalmaz: [
      'Az Ön anyaglistája és élzáró-választéka a választható tételek között.',
      'Az Ön gyártási szabályai: kész méret, szálirány, forgathatóság.',
      'Excel-fájl az Ön mostani sablonja szerint.',
      'A lap a meglévő honlapjára kerül, a mostani rendelési mód mellé.',
    ],
    nemTartalmaz: ['automatikus árazás, szabásoptimalizálás, gyártási jóváhagyás', 'összekötés más programmal (külön ajánlat)'],
    kell: ['a mostani rendelőlap vagy egy régi rendelés, személyes adatok nélkül', 'az anyaglista és az élzáró-választék', 'az Excel-sablon, amelyben ma dolgoznak'],
  },
  lepcsok: [
    { nev: 'Összekötés más programmal', szoveg: 'Ha a rendelésnek a szabászprogramba vagy más rendszerbe is kell kerülnie, arra külön írásos árajánlatot küldök.', ar: undefined },
  ],
  csomagMondatok: [],
  kapcsolat: {
    level: {
      targy: 'Saját megrendelőlap – lapszabászat',
      torzs:
        'Jó napot kívánok!\n\nA szabásrendelések most így érkeznek (telefon, e-mail, Excel-lap):\n\nEzekkel az anyagokkal és élzárással dolgozunk:\n\nCégünk és honlapunk:\n',
    },
  },
}
