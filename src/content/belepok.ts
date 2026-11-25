import type { Ertek } from './kerdes'
import type { Ar } from './kozos'

// A szegmensek belépő csomagjai: fix terjedelem, saját név, látható ár (Benjámin jóváhagyott
// iránya, 2026-11-04 este: a honlapon a fizetős belépő csomag a fő ajánlat; a díjmentes hiánylista
// vagy minta a levelek apró előzetes értéke). Egy helyen él, a főoldal és a szegmensoldal is innen
// olvassa. Ár csak a src/data/pricing.ts-ből; ahol ott nincs tétel, helyőrző áll.

export interface Belepo {
  nev: string
  ar: Ertek<Ar>
}

export const BELEPOK = {
  // megrendeles G: „Termékleírás webshopba”, próbakör 20 termékre (pricing.ts productDescriptionsTrial).
  webshop: {
    nev: 'Termékleírás-próbakör',
    ar: { osszeg: 'productDescriptionsTrial', utotag: ' / 20 termék' },
  },
  gepkonyv: {
    nev: 'Egy gép, egy útmutató',
    // Benjámin döntése, 2026-11-05: pricing.ts machineManualEntry – 1 géptípus, 1 nyelv, legfeljebb 40 oldal,
    // egy javítási kör.
    ar: { osszeg: 'machineManualEntry', utotag: ' / 1 gép' },
  },
  lapszabaszat: {
    nev: 'Saját megrendelőlap',
    // Benjámin döntése, 2026-11-05: a „Rendelőlap a saját táblázata szerint” ára (megrendeles A), mert a
    // rendelés a szabászat saját Excel-sablonja szerint érkezik.
    ar: { osszeg: 'orderFormSheet', utotag: ' egyszeri díj' },
  },
  bemutatkozo: {
    nev: 'Bemutatkozó oldal',
    // megrendeles E (LAP E · CSOMAG, „Bemutatkozó oldal”): pricing.ts introSite, egyszeri díj; a csomag neve
    // változatlan (Benjámin döntése, 2026-11-05).
    ar: { osszeg: 'introSite', utotag: ' egyszeri díj' },
  },
} satisfies Record<string, Belepo>
