/**
 * Helyőrző olyan adathoz, amelyről csak Benjámin dönthet (telefonszám, belépő ajánlat, ár stb.).
 *
 * - Előnézetben (ág, PR, `npm run build`) a szöveg „[KÉRDÉS: …]” alakban, kiemelve látszik.
 * - Az éles build (`ELES_BUILD=1`, a Deploy workflow állítja) leáll, ha egy élesítendő oldal
 *   HTML-jében ilyen marad (vite.config.ts, `helyorzoKapu`).
 * - Feloldás: a `kerdes(…)` hívást cserélje a valós értékre, vagy `null`-ra, ha az elem
 *   ne jelenjen meg.
 * - Rejtett (pl. hozzájárulásra váró) tartalomba ne kerüljön helyőrző: a kapu a megjelenő
 *   HTML-t nézi.
 */
export interface Kerdes {
  readonly kerdes: string
}

export const kerdes = (szoveg: string): Kerdes => ({ kerdes: szoveg })

export function isKerdes(value: unknown): value is Kerdes {
  return typeof value === 'object' && value !== null && 'kerdes' in value
}

/** Egy tartalmi érték: kész szöveg, nyitott kérdés, vagy null (nem jelenik meg). */
export type Ertek<T = string> = T | Kerdes | null
