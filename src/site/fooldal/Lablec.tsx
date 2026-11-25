import type { ReactNode } from 'react'
import { NYILVANTARTO, VALLALKOZO } from '@/content/alapadatok'
import { ErtekJel } from '../util'

/** Which footer entry is the page one stands on: it is plain ink text there, not a link (design system 5.16). */
export type LablecAktualis = 'impresszum' | 'aszf' | 'adatkezeles' | null

/** The earth symbol drawn in markup, for the pages that have no script-drawn line (the legal pages and 404): three bars centred on the spine, 64/40/16 px wide, 28/18/8 on a phone. */
function FoldSzimbolum() {
  return (
    <>
      <svg className="ew" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path className="ln pen-r" d="M0 16H64" />
        <path className="ln pen-r" d="M12 32H52" />
        <path className="ln pen-r" d="M24 48H40" />
      </svg>
      <svg className="en" width="28" height="64" viewBox="0 0 28 64" aria-hidden="true" focusable="false">
        <path className="ln pen-r" d="M0 14.24H28" />
        <path className="ln pen-r" d="M5 26.72H23" />
        <path className="ln pen-r" d="M10 39.2H18" />
      </svg>
      <i className="stem" />
    </>
  )
}

interface Bejegyzes {
  kulcs: LablecAktualis
  href: string
  felirat: string
  hrefLang?: string
}

const HU: Bejegyzes[] = [
  { kulcs: 'impresszum', href: '/impresszum/', felirat: 'Impresszum' },
  { kulcs: 'aszf', href: '/aszf/', felirat: 'ÁSZF' },
  { kulcs: 'adatkezeles', href: '/adatkezeles/', felirat: 'Adatkezelési tájékoztató' },
]

// The English labels are the ones the English imprint already had.
const EN: Bejegyzes[] = [
  { kulcs: 'impresszum', href: '/en/imprint/', felirat: 'Imprint' },
  { kulcs: 'aszf', href: '/aszf/', felirat: 'Terms (Hungarian)', hrefLang: 'hu' },
  { kulcs: 'adatkezeles', href: '/adatkezeles/', felirat: 'Privacy notice (Hungarian)', hrefLang: 'hu' },
]

const ADATCIM = {
  hu: { szekhely: 'Székhely', nyilv: 'Nyilvántartási szám', ado: 'Adószám', jogi: 'Jogi információk és további oldalak' },
  en: { szekhely: 'Registered seat', nyilv: 'Registration number', ado: 'Tax number', jogi: 'Legal information' },
} as const

/**
 * The one footer of the site: the earth symbol (where the line ends) and the provider data of Ekertv. 4. § with the legal links. On the
 * home page the earth is drawn by the page script; on the legal pages and 404 (`aloldal`) it is drawn here, with the last stretch of the line.
 */
export function JelLablec({ aloldal, nyelv = 'hu', aktualis = null }: { aloldal?: boolean; nyelv?: 'hu' | 'en'; aktualis?: LablecAktualis }) {
  const { szekhely } = VALLALKOZO
  const lista = nyelv === 'en' ? EN : HU
  const cim = ADATCIM[nyelv]
  const bejegyzes = (b: Bejegyzes): ReactNode =>
    b.kulcs === aktualis ? (
      <span aria-current="page">{b.felirat}</span>
    ) : (
      <a href={b.href} {...(b.hrefLang ? { hrefLang: b.hrefLang } : {})}>
        {b.felirat}
      </a>
    )
  return (
    <footer className="tsec foot">
      <div className="in">
        <div className="earth" aria-hidden="true">
          {aloldal ? <FoldSzimbolum /> : null}
        </div>
        <div className="fdata">
          <p className="fnev">
            <b>{VALLALKOZO.rovidNev}</b> <a href={`mailto:${VALLALKOZO.email}`}>{VALLALKOZO.email}</a>
          </p>
          <nav aria-label={cim.jogi}>
            <ul>
              {lista.map((b) => (
                <li key={b.kulcs}>{bejegyzes(b)}</li>
              ))}
            </ul>
          </nav>
          <dl className="fadat">
            <div>
              <dt>{cim.szekhely}</dt>
              <dd>
                {szekhely.iranyitoszam} {szekhely.telepules}, {szekhely.utca}
              </dd>
            </div>
            <div>
              <dt>{cim.nyilv}</dt>
              <dd>
                {VALLALKOZO.nyilvantartasiSzam}
                <ErtekJel ertek={NYILVANTARTO}>{(s) => <>, {s}</>}</ErtekJel>
              </dd>
            </div>
            <div>
              <dt>{cim.ado}</dt>
              <dd>{VALLALKOZO.adoszam}</dd>
            </div>
          </dl>
        </div>
      </div>
    </footer>
  )
}
