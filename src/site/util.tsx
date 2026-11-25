import { createContext, useContext, type ReactNode } from 'react'
import { VAT_LABEL, formatHuf, isAmountKey, isPriceKey, type AmountKey } from '@/data/pricing'
import { levelCim } from '@/content/alapadatok'
import { isKerdes, type Ertek } from '@/content/kerdes'
import type { Level } from '@/content/kozos'

export interface Epites {
  /** Éles build (ELES_BUILD=1): csak a hozzájárulással bíró tartalom. */
  eles: boolean
  /** A public/demos alatti mappák, amelyek ebben a buildben megvannak. */
  demok: string[]
  /** A build éve: az „Évek” idővonal tengelye eddig az évig tart (a vite.config.ts adja; a 2027-es build egy cellával bővül). */
  ev: number
}

export const EpitesContext = createContext<Epites>({ eles: false, demok: [], ev: new Date().getFullYear() })
export const useEpites = () => useContext(EpitesContext)

const NBSP = '\u00a0'

export function huf(key: AmountKey): string {
  return formatHuf(key, 'hu', NBSP)
}

export const AFA = VAT_LABEL.hu

/** A helyőrző előnézetben látható jelölése. Az éles build ezt a szöveget keresi (helyorzoKapu). */
export function Kerdes({ szoveg }: { szoveg: string }) {
  return <span className="kerdes">[KÉRDÉS: {szoveg}]</span>
}

/** Egy tartalmi érték megjelenítése: szöveg, helyőrző, vagy semmi (null). */
export function ErtekJel({ ertek, children }: { ertek: Ertek; children?: (szoveg: string) => ReactNode }) {
  if (ertek === null) return null
  if (isKerdes(ertek)) return <Kerdes szoveg={ertek.kerdes} />
  return <>{children ? children(ertek) : ertek}</>
}

/** „{ar:orderForm}” → a pricing.ts formázott összege; „{kuszob:depositFrom}” → az ÁSZF küszöbe (THRESHOLDS). Ismeretlen kulcs build-hibát okoz. */
export function arakkal(szoveg: string): string {
  return szoveg.replace(/\{(ar|kuszob):(\w+)\}/g, (_, fajta: string, key: string) => {
    if (fajta === 'ar') {
      if (!isAmountKey(key)) throw new Error(`Ismeretlen árkulcs: ${key}`)
      return huf(key)
    }
    if (!isPriceKey(key) || isAmountKey(key)) throw new Error(`Ismeretlen küszöbkulcs: ${key}`)
    return formatHuf(key, 'hu', NBSP)
  })
}

export function mailto(level: Level): string {
  return levelCim(level)
}

export function Kep({
  alap,
  alt,
  szelesseg,
  magassag,
  meretek,
  kiemelt = false,
  egyfajl = false,
}: {
  alap: string
  alt: string
  szelesseg: number
  magassag: number
  meretek: string
  kiemelt?: boolean
  /** Egyetlen `<alap>.webp` fájl, srcset nélkül. */
  egyfajl?: boolean
}) {
  return (
    <img
      src={egyfajl ? `${alap}.webp` : `${alap}-1200.webp`}
      {...(egyfajl ? {} : { srcSet: `${alap}-640.webp 640w, ${alap}-1200.webp 1200w`, sizes: meretek })}
      width={szelesseg}
      height={magassag}
      alt={alt}
      loading={kiemelt ? 'eager' : 'lazy'}
      decoding="async"
      {...(kiemelt ? { fetchPriority: 'high' as const } : {})}
    />
  )
}
