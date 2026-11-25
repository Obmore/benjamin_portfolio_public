// The one list of removed or renamed URLs that keep working: the build writes one static stub page per entry (src/site/atiranyitas.ts).
// vite.config.ts loads this file: no aliases, no imports.

export interface Atiranyitas {
  /** The old path, with a leading and a trailing slash (the stub is written to <from>index.html). */
  from: string
  /** The new path with an optional #hash. */
  to: string
  /** The stub's title, as shown. */
  cim: string
  /** The visible link text, as shown. */
  link: string
}

export const ATIRANYITASOK: readonly Atiranyitas[] = [
  { from: '/megrendelo/', to: '/megrendeles/', cim: 'Átirányítás a megrendeléshez', link: 'Tovább a megrendeléshez' },
  { from: '/rendeles/', to: '/megrendeles/', cim: 'Átirányítás a megrendeléshez', link: 'Tovább a megrendeléshez' },
  { from: '/megrendelés/', to: '/megrendeles/', cim: 'Átirányítás a megrendeléshez', link: 'Tovább a megrendeléshez' },
  // The four offer pages are merged into the panels of /megrendeles/ (PR 6): each address goes to its own panel. The target's hash wins over an old incoming one.
  { from: '/termekleiras/', to: '/megrendeles/#szolgaltatas-termekleiras', cim: 'Átirányítás a megrendeléshez', link: 'Tovább a megrendeléshez' },
  { from: '/gepkonyv/', to: '/megrendeles/#szolgaltatas-gepkonyv', cim: 'Átirányítás a megrendeléshez', link: 'Tovább a megrendeléshez' },
  { from: '/lapszabaszat/', to: '/megrendeles/#szolgaltatas-lapszabaszat', cim: 'Átirányítás a megrendeléshez', link: 'Tovább a megrendeléshez' },
  { from: '/bemutatkozo-oldal/', to: '/megrendeles/#szolgaltatas-bemutatkozo', cim: 'Átirányítás a megrendeléshez', link: 'Tovább a megrendeléshez' },
  // The experience page is a section of /munkaim/ ("Évek", PR 7): the old addresses go to it. /cv/ names the final target, so no chain is left.
  { from: '/tapasztalat/', to: '/munkaim/#evek', cim: 'Átirányítás a tapasztalathoz', link: 'Tovább a tapasztalathoz' },
  { from: '/cv/', to: '/munkaim/#evek', cim: 'Átirányítás a tapasztalathoz', link: 'Tovább a tapasztalathoz' },
]
