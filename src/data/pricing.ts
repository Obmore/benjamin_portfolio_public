// Single source of the package prices. The home page imports it, and the
// Vite build writes the same values into /megrendeles/ ({{huf:…}} placeholders).
// Keep this module free of aliases and import.meta.env: vite.config.ts loads it.

export const AMOUNTS = {
  orderForm: 149_000,
  orderFormSheet: 189_000,
  introSite: 129_000,
  hosting: 4_900,
  hostingWithEdits: 9_900,
  // Termékleírás webshopba: trial round of 20 products (owner's decision, 2026-10-20).
  productDescriptionsTrial: 49_000,
  // Gépkönyv belépő: „Egy gép, egy útmutató” – 1 géptípus, 1 nyelv, legfeljebb 40 oldal, egy javítási kör
  // (owner's decision, 2026-11-05).
  machineManualEntry: 149_000,
} as const

// Thresholds of the general terms (ÁSZF). Not package prices: they appear in no price place, no JSON-LD and no meta text. The ÁSZF shows
// them through {{huf:…}} placeholders. The one other place is the foot of the price table on /megrendeles/ (src/content/csomagok.ts
// CSOMAGOK_LAB, "{kuszob:depositFrom}"); scripts/check-megrendeles.mjs allows the threshold only there, never with an AAM mark.
export const THRESHOLDS = {
  // Fixed-price packages with a fee of at least this amount need a 50% deposit
  // (owner's decision, szabálykönyv 1.37 (a), 2026-11-05).
  depositFrom: 149_000,
} as const

export type AmountKey = keyof typeof AMOUNTS
type ThresholdKey = keyof typeof THRESHOLDS
type PriceLocale = 'hu' | 'en'

export const VAT_LABEL: Record<PriceLocale, string> = {
  hu: 'AAM (áfamentes)',
  en: 'VAT exempt (AAM)',
}

export function isAmountKey(key: string): key is AmountKey {
  return Object.hasOwn(AMOUNTS, key)
}

function isThresholdKey(key: string): key is ThresholdKey {
  return Object.hasOwn(THRESHOLDS, key)
}

/** Keys a {{huf:…}} placeholder may use: package prices and the ÁSZF thresholds. */
type PriceKey = AmountKey | ThresholdKey

export function isPriceKey(key: string): key is PriceKey {
  return isAmountKey(key) || isThresholdKey(key)
}

function priceOf(key: PriceKey): number {
  return isThresholdKey(key) ? THRESHOLDS[key] : AMOUNTS[key]
}

/** 149000 → "149 000 Ft" (hu) or "HUF 149,000" (en); spaces are non-breaking. */
export function formatHuf(key: PriceKey, locale: PriceLocale, space = ' '): string {
  const digits = String(priceOf(key))
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'hu' ? space : ',')
  return locale === 'hu' ? `${grouped}${space}Ft` : `HUF${space}${grouped}`
}
