// Az oldalak nyilvántartása. A vite.config.ts is betölti: ne használjon aliasokat és import.meta.env-et.

export type OldalId = 'fooldal' | 'munkaim' | 'csomagok'

export interface Oldal {
  id: OldalId
  /** Az oldal útvonala, perjellel a végén. */
  utvonal: string
  /** A sablon a repó gyökeréhez képest. */
  sablon: string
}

export const OLDALAK: readonly Oldal[] = [
  { id: 'fooldal', utvonal: '/', sablon: 'index.html' },
  // Munkák és évek (Benjámin jóváhagyott iránya, 2026-11-05; a /tapasztalat/ ebbe olvadt „Évek” szakaszként, PR 7): a főmenü „Munkák” linkje, a régi /tapasztalat/ és /cv/ címe átirányítás (src/content/atiranyitasok.ts). A négy régi ajánlatoldal (termékleírás, gépkönyv, lapszabászat, bemutatkozó oldal) a /megrendeles/ egy-egy paneljébe olvadt.
  { id: 'munkaim', utvonal: '/munkaim/', sablon: 'munkaim/index.html' },
  // A csomagok és árak oldala (főmenü): a régi, kézzel írt /megrendeles/ helyett React-oldal az új oldalkeretben (Benjámin döntése, 2026-11-05).
  { id: 'csomagok', utvonal: '/megrendeles/', sablon: 'megrendeles/index.html' },
]

/** Statikus, nem React-oldalak, amelyek az élesbe és a sitemapbe is kerülnek. */
export const STATIKUS_OLDALAK = [
  { utvonal: '/adatkezeles/', sablon: 'adatkezeles/index.html' },
  { utvonal: '/impresszum/', sablon: 'impresszum/index.html', hreflang: { hu: '/impresszum/', en: '/en/imprint/' } },
  { utvonal: '/en/imprint/', sablon: 'en/imprint/index.html', hreflang: { hu: '/impresszum/', en: '/en/imprint/' } },
  { utvonal: '/aszf/', sablon: 'aszf/index.html' },
] as const
