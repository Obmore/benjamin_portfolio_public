import { OLDALAK, STATIKUS_OLDALAK } from '../src/content/oldalak'

// Page lists for the e2e specs, derived from the page registry so that a new page needs no test-list edit.
// Same rules as the build (vite.config.ts): every registry page is built; the sitemap leaves out `sitemap: false`.
const noSitemap = (o: object) => 'sitemap' in o && o.sitemap === false

/** React pages as URL paths. */
export const REGISTRY_PATHS: string[] = OLDALAK.map(o => o.utvonal)
/** Hand-written HTML pages. */
export const STATIC_PAGES: string[] = STATIKUS_OLDALAK.map(o => o.utvonal)
/** Every built page. */
export const ALL_PATHS: string[] = [...REGISTRY_PATHS, ...STATIC_PAGES]
/** Indexable pages: the ones the sitemap lists. */
export const LIVE_PATHS: string[] = [
  ...OLDALAK.map(o => o.utvonal),
  ...STATIKUS_OLDALAK.filter(o => !noSitemap(o)).map(o => o.utvonal),
]
/** Template files relative to the repository root ('index.html', 'aszf/index.html', ...). */
export const TEMPLATES: string[] = [...OLDALAK.map(o => o.sablon), ...STATIKUS_OLDALAK.map(o => o.sablon)]

/** The demo pages and the return link of the strip at their top. */
export const DEMOS: Record<string, { label: string; href: string }> = {
  '/demos/adatgyujto/': { label: 'Vissza az ajánlathoz', href: '/megrendeles/#szolgaltatas-adatok' },
  '/demos/kezikonyv/': { label: 'Vissza az ajánlathoz', href: '/megrendeles/#szolgaltatas-gepkonyv' },
  '/demos/lapszabaszat/': { label: 'Vissza az ajánlathoz', href: '/megrendeles/#szolgaltatas-lapszabaszat' },
  '/demos/tudaslap/': { label: 'Ott Benjámin főoldala', href: '/' },
}
