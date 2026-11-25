import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { SITE_URL, TELEFON, VALLALKOZO } from '@/content/alapadatok'
import { CSOMAGOK_META } from '@/content/csomagok'
import { META } from '@/content/fooldal'
import { isKerdes } from '@/content/kerdes'
import { MUNKAIM_META } from '@/content/munkaim'
import { OLDALAK, type OldalId } from '@/content/oldalak'
import { JelFejlec } from './fooldal/Fejlec'
import { JelLablec, type LablecAktualis } from './fooldal/Lablec'
import { Hiba404 } from './retegek/Hiba'
import { Csomagok } from './pages/Csomagok'
import { Fooldal } from './pages/Fooldal'
import { Munkaim } from './pages/Munkaim'
import { kotojelesekEgyben } from './kotojeles'
import { EpitesContext, type Epites } from './util'

// Build-idejű megjelenítés: a vite.config.ts `oldalak` bővítménye hívja minden oldalsablonra.
// A böngészőbe nem kerül React; az interakciót a lapok saját belépő szkriptje adja (src/site/main.ts, megrendeles.ts, munkaim.ts, keret.ts).

/** Egy oldal fejlécadata és tartalma. Új oldal = új bejegyzés itt (az `OldalId` típus ezt ki is kényszeríti). */
interface OldalTartalom {
  cim: string
  leiras: string
  elem: ReactElement
}

/** Az og.png minden oldalon ugyanaz, ezért az alt szövege is közös. */
const OG_KEP_ALT = 'Ott Benjámin – ami ma PDF-ben, Excelben vagy telefonon megy, abból rendezett online adat lesz'

const TARTALMAK: Record<OldalId, OldalTartalom> = {
  fooldal: { cim: META.cim, leiras: META.leiras, elem: <Fooldal /> },
  munkaim: { cim: MUNKAIM_META.cim, leiras: MUNKAIM_META.leiras, elem: <Munkaim /> },
  csomagok: { cim: CSOMAGOK_META.cim, leiras: CSOMAGOK_META.leiras, elem: <Csomagok /> },
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function telefonSzam(): string | undefined {
  return TELEFON && !isKerdes(TELEFON) ? TELEFON.href.replace(/^tel:/, '') : undefined
}

function strukturaltAdat(utvonal: string, nev: string, leiras: string) {
  const personId = `${SITE_URL}/#szemely`
  const telefon = telefonSzam()
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Person',
      '@id': personId,
      name: VALLALKOZO.nev,
      jobTitle: VALLALKOZO.szakma,
      email: VALLALKOZO.email,
      address: { '@type': 'PostalAddress', addressCountry: 'HU' },
      sameAs: [VALLALKOZO.linkedin],
    },
    {
      '@type': 'ProfessionalService',
      '@id': `${SITE_URL}/#szolgaltatas`,
      name: VALLALKOZO.jogiNev,
      description: META.leiras,
      url: `${SITE_URL}/`,
      email: VALLALKOZO.email,
      ...(telefon ? { telephone: telefon } : {}),
      founder: { '@id': personId },
      address: {
        '@type': 'PostalAddress',
        streetAddress: VALLALKOZO.szekhely.utca,
        postalCode: VALLALKOZO.szekhely.iranyitoszam,
        addressLocality: VALLALKOZO.szekhely.telepules,
        addressCountry: 'HU',
      },
      areaServed: { '@type': 'Country', name: VALLALKOZO.helyszin },
    },
  ]
  if (utvonal !== '/') {
    graph.push({
      '@type': 'WebPage',
      name: nev,
      description: leiras,
      url: `${SITE_URL}${utvonal}`,
      about: { '@id': `${SITE_URL}/#szolgaltatas` },
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

function fej(utvonal: string, cim: string, leiras: string): string {
  const url = `${SITE_URL}${utvonal}`
  const json = JSON.stringify(strukturaltAdat(utvonal, cim, leiras)).replace(/</g, '\\u003c')
  return [
    `<title>${esc(cim)}</title>`,
    `<meta name="description" content="${esc(leiras)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="hu_HU" />`,
    `<meta property="og:title" content="${esc(cim)}" />`,
    `<meta property="og:description" content="${esc(leiras)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(OG_KEP_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${json}</script>`,
  ]
    .join('\n    ')
}

interface Megjelenitett {
  fej: string
  test: string
}

export function renderOldal(id: string, epites: Epites): Megjelenitett {
  const oldal = OLDALAK.find((o) => o.id === id)
  if (!oldal) throw new Error(`Ismeretlen oldal: ${id}`)
  // Nincs csendes tartalék: a bejegyzés nélküli azonosító build-hiba (korábban a főoldal készült el helyette).
  const tartalom = TARTALMAK[oldal.id]
  if (!tartalom) throw new Error(`Nincs tartalom az oldalhoz: ${id} (src/site/render.tsx TARTALMAK)`)
  const test = kotojelesekEgyben(
    renderToStaticMarkup(<EpitesContext.Provider value={epites}>{tartalom.elem}</EpitesContext.Provider>),
  )
  return { fej: fej(oldal.utvonal, tartalom.cim, tartalom.leiras), test }
}

/**
 * The shared header and footer for the pages built from hand-written templates (the legal pages and 404). The template holds a marker
 * <!--keret:fejlec:hu--> or <!--keret:lablec:hu:impresszum--> (language, and for the footer the entry that is the page itself; without it no entry is).
 */
export function renderKeret(jel: string): string {
  const [mit, nyelv, aktualis] = jel.split(':')
  if (mit === 'retegek' && nyelv === 'hiba') return kotojelesekEgyben(renderToStaticMarkup(<Hiba404 />))   // the 404's stack
  if (nyelv !== 'hu' && nyelv !== 'en') throw new Error("Ismeretlen keret-jelölő: " + jel)
  const elem =
    mit === 'fejlec' ? (
      <JelFejlec keret={{ oldal: 'aloldal', nyelv }} />
    ) : mit === 'lablec' ? (
      <JelLablec aloldal nyelv={nyelv} aktualis={(aktualis || null) as LablecAktualis} />
    ) : null
  if (!elem) throw new Error("Ismeretlen keret-jelölő: " + jel)
  return kotojelesekEgyben(renderToStaticMarkup(elem))
}
