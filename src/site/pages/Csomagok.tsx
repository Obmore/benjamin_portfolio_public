import type { ReactNode } from 'react'
import { ASZF_ELSO_RESZ, CSOMAGOK_KAPCSOLAT, CSOMAGOK_LAB, CSOMAGOK_OLDAL, TOVABBI_SZOLGALTATASOK, szolgaltatasLevel, type Blokk, type Szolgaltatas } from '@/content/csomagok'
import { JEL } from '@/content/fooldal'
import { GEPRENDELET } from '@/content/jogszabalyok'
import { isKerdes } from '@/content/kerdes'
import { GARANCIA_MONDAT } from '@/content/kozos'
import { BEMUTATKOZO } from '@/content/szegmensek/bemutatkozo'
import { GEPKONYV } from '@/content/szegmensek/gepkonyv'
import { LAPSZABASZAT } from '@/content/szegmensek/lapszabaszat'
import { TERMEKLEIRAS } from '@/content/szegmensek/termekleiras'
import type { Szegmens, SzegmensId } from '@/content/szegmensek/tipus'
import { Adatlap, type AdatlapSor } from '../elemek/Adatlap'
import { Cimmezo } from '../elemek/Cimmezo'
import { Ugrasok } from '../elemek/Ugrasok'
import { JelFejlec } from '../fooldal/Fejlec'
import { JelLablec } from '../fooldal/Lablec'
import { AFA, ErtekJel, arakkal, huf, mailto, useEpites } from '../util'

// The offer page (/megrendeles/) on the shared layer of the new system: the page header in the legal form, four record panels (src/site/elemek/Adatlap.tsx), each beside
// what the plate does not state, the price table with its foot, and the shared contact end. The four offer pages that used to stand beside it are merged into the panels
// (their old addresses are redirect stubs, src/content/atiranyitasok.ts). The lane's taps are drawn in markup and CSS (src/site/csomagok.css); the contact end draws its own.

/** Which row link a package carries: the segment's second link, or its demo (a local demo only when its folder is in the build). */
const BELEPOK: { adat: Szegmens; link: 'masodlagos' | 'demo' }[] = [
  { adat: TERMEKLEIRAS, link: 'masodlagos' },
  { adat: GEPKONYV, link: 'demo' },
  { adat: LAPSZABASZAT, link: 'demo' },
  { adat: BEMUTATKOZO, link: 'masodlagos' },
]

const kulso = (href: string) => /^https?:\/\//.test(href)

/** The text with some strings kept on one line (a date with its suffix, an amount with its "-os"); the text content stays as it is. */
function Egysoros({ szoveg, vedett }: { szoveg: string; vedett: readonly string[] }): ReactNode {
  const re = new RegExp(`(${vedett.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`)
  return szoveg.split(re).map((resz, i) =>
    i % 2 === 1 ? (
      <span className="cs-nb" key={i}>
        {resz}
      </span>
    ) : (
      resz
    ),
  )
}

/** A fact row's value: a list with the en-dash marker, or one text. */
function Lista({ elemek }: { elemek: (string | { kerdes: string } | null)[] }) {
  return (
    <ul className="cs-lista">
      {elemek.map((e, i) => (e === null ? null : <li key={i}>{isKerdes(e) ? <ErtekJel ertek={e} /> : e}</li>))}
    </ul>
  )
}

function Csomag({ adat, link }: { adat: Szegmens; link: 'masodlagos' | 'demo' }) {
  const { demok } = useEpites()
  const id: SzegmensId = adat.id
  const { belepo, hos, lepcsok, demo } = adat
  const ar = belepo.ar
  if (!ar || isKerdes(ar)) throw new Error(`/megrendeles/: the entry price of ${id} must come from pricing.ts`)
  const sorok: AdatlapSor[] = [{ cimke: CSOMAGOK_OLDAL.adatlap.tartalom, ertek: belepo.leiras }]
  if (belepo.ido) sorok.push({ cimke: CSOMAGOK_OLDAL.adatlap.hatarido, ertek: belepo.ido })
  const T = CSOMAGOK_OLDAL.tenyek
  const levelHref = mailto(adat.kapcsolat.level)
  // The row's one text link (the segment's second link or its demo); a local demo only when its folder is in this build.
  const sorLink =
    link === 'demo'
      ? demo && (demo.mappa === undefined || demok.includes(demo.mappa))
        ? { felirat: demo.cim, href: demo.href, demo: true }
        : null
      : hos.masodlagos
        ? { felirat: hos.masodlagos.felirat, href: hos.masodlagos.href, demo: hos.masodlagos.href === demo?.href }
        : null
  const kulsoLink = sorLink !== null && kulso(sorLink.href)
  // The long accessible name only where the visible text differs from the demo's own title: the segment's second link that points at the demo's own address.
  const hosszuNev = link === 'masodlagos' && sorLink !== null && sorLink.demo && demo && sorLink.felirat !== demo.cim ? `${sorLink.felirat} – ${demo.cim}` : undefined
  return (
    <div className="in cs-sor">
      <i className="cs-tap" aria-hidden="true" />
      <div className="cs-par">
        <Adatlap
          id={`szolgaltatas-${id}`}
          fej={CSOMAGOK_OLDAL.adatlap.fej}
          cim={belepo.nev}
          cimSzint="h3"
          sorok={sorok}
          ar={{ osszeg: huf(ar.osszeg), utotag: ar.utotag, afa: AFA }}
          gomb={{ felirat: hos.gomb.felirat, href: levelHref, esemeny: 'fo-gomb' }}
          garancia={GARANCIA_MONDAT}
          link={{ felirat: hos.garancia, href: ASZF_ELSO_RESZ }}
        />
        <div className="cs-szov">
          <p className="cs-hos">{hos.cim}</p>
          <dl className="cs-tenyek">
            <div>
              <dt>{T.kinek}</dt>
              <dd>{hos.kinek}</dd>
            </div>
            <div>
              <dt>{T.tartalmaz}</dt>
              <dd>
                <Lista elemek={belepo.tartalmaz} />
              </dd>
            </div>
            <div>
              <dt>{T.nemTartalmaz}</dt>
              <dd>
                <Lista elemek={belepo.nemTartalmaz} />
              </dd>
            </div>
            <div>
              <dt>{T.kell}</dt>
              <dd>
                <Lista elemek={belepo.kell} />
              </dd>
            </div>
          </dl>
          {/* The steps after the entry package that have no price of their own; the priced hosting steps stand once, in the table's "Üzemeltetés" service. */}
          {lepcsok
            .filter((l) => l.ar === undefined)
            .map((l) => (
              <p key={l.nev}>
                <strong>{l.nev}</strong> {l.szoveg}
              </p>
            ))}
          {adat.csomagMondatok.map((m) => (
            <p key={m}>
              <Egysoros szoveg={m} vedett={[GEPRENDELET.alkalmazasTol]} />
            </p>
          ))}
          {sorLink && (
            <p className="cs-sorlink">
              <a
                className="lnk tlnk"
                href={sorLink.href}
                {...(sorLink.demo ? { 'data-esemeny': 'demo' } : {})}
                {...(kulsoLink ? { rel: 'noopener', ...(hosszuNev ? { 'aria-label': hosszuNev } : {}) } : {})}
              >
                {sorLink.felirat}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Blokkok({ blokkok }: { blokkok: Blokk[] }) {
  return (
    <>
      {blokkok.map((b, i) => {
        switch (b.tipus) {
          case 'p':
            return <p key={i}>{b.szoveg}</p>
          case 'dij':
            return (
              <p className="cs-dij" key={i}>
                {b.szoveg}
              </p>
            )
          case 'ul':
            return <Lista key={i} elemek={b.elemek} />
          case 'arSor':
            return (
              <p key={i}>
                {arakkal(b.szoveg)} <span className="cs-afa-i">{AFA}</span>
              </p>
            )
        }
      })}
    </>
  )
}

/** A service's head row: the name, the price cell and the VAT mark (empty where the cell is "Egyedi ajánlat"); the nested rows are indented. */
function FejSor({ cim, ar, al = false }: { cim: string; ar: string | undefined; al?: boolean }) {
  return (
    <tr className={al ? 'cs-fej cs-al' : 'cs-fej'} role="row">
      <th scope="row" className="cs-nev" role="rowheader">
        {cim}
      </th>
      <td className="cs-ar" role="cell">{ar === undefined ? CSOMAGOK_OLDAL.egyediAjanlat : arakkal(ar)}</td>
      <td className="cs-afa" role="cell">{ar === undefined ? null : AFA}</td>
    </tr>
  )
}

function Szoveg({ al = false, children }: { al?: boolean; children: ReactNode }) {
  return (
    <tr className={al ? 'cs-szoveg cs-al' : 'cs-szoveg'} role="row">
      <td colSpan={3} role="cell">
        <div className="cs-szoveg-be">{children}</div>
      </td>
    </tr>
  )
}

function Szolgaltatasok({ s }: { s: Szolgaltatas }) {
  return (
    <tbody className="cs-szolg" id={`szolgaltatas-${s.id}`} role="rowgroup">
      <FejSor cim={s.cim} ar={s.ar} />
      <Szoveg>
        <Blokkok blokkok={s.blokkok} />
      </Szoveg>
      {s.alsorok?.map((a) => [
        <FejSor key={`${a.cim}-fej`} cim={a.cim} ar={a.ar} al />,
        <Szoveg key={`${a.cim}-szoveg`} al>
          <Blokkok blokkok={a.blokkok} />
        </Szoveg>,
      ])}
      {s.zaro && (
        <Szoveg>
          <Blokkok blokkok={s.zaro} />
        </Szoveg>
      )}
      <tr className="cs-link" role="row">
        <td colSpan={3} role="cell">
          <a className="lnk tlnk" href={mailto(szolgaltatasLevel(s.cim))} data-esemeny="email" aria-label={`${s.gomb} – ${s.cim}`}>
            {s.gomb}
          </a>
        </td>
      </tr>
    </tbody>
  )
}

/** The table's foot (CSOMAGOK_LAB): the price-final paragraph, then the payment paragraph with the threshold from pricing.ts and the one link to the terms. */
function Lab() {
  const [elo, utan] = CSOMAGOK_LAB.fizetes.split('{aszf}') as [string, string]
  const kuszobos = (szoveg: string) =>
    szoveg.split(/(\{kuszob:\w+\}-os)/).map((resz, i) =>
      i % 2 === 1 ? (
        <span className="cs-nb" key={i}>
          {arakkal(resz)}
        </span>
      ) : (
        arakkal(resz)
      ),
    )
  return (
    <div className="cs-lab" data-lab="">
      <p>{CSOMAGOK_LAB.dij}</p>
      <p>
        {kuszobos(elo)}
        <a className="cs-aszf" href={ASZF_ELSO_RESZ}>
          {CSOMAGOK_LAB.aszf}
        </a>
        {utan}
      </p>
    </div>
  )
}

export function Csomagok() {
  const K = CSOMAGOK_KAPCSOLAT
  // The jump pills: the four entry packages by their names (each leads to its panel), "További szolgáltatások" and "Kapcsolat" by the page's own words, in the page's order.
  const ugrasok = [
    ...BELEPOK.map(({ adat }) => ({ felirat: adat.belepo.nev, cel: `szolgaltatas-${adat.id}` })),
    { felirat: CSOMAGOK_OLDAL.tovabbiCim, cel: 'egyeb-szolgaltatasok' },
    { felirat: JEL.nav.kapcsolat, cel: 'kapcsolat' },
  ]
  return (
    <div className="page al" id="top">
      <JelFejlec keret={{ oldal: 'aloldal', nyelv: 'hu', aktualis: 'csomagok', sajatKapcsolat: true }} />
      <main id="tartalom" className="tsec" tabIndex={-1}>
        <div className="sp-l" aria-hidden="true">
          <div className="in">
            <span className="sp" />
          </div>
        </div>
        <section className="ph" aria-labelledby="h1">
          <div className="in">
            <h1 className="ph-h1" id="h1">
              {CSOMAGOK_OLDAL.cim}
            </h1>
            <p className="cs-bev">{CSOMAGOK_OLDAL.bevezeto}</p>
            <Ugrasok elemek={ugrasok} />
          </div>
        </section>

        <section className="cs-sec" id="belepo-csomagok" aria-labelledby="belepok-cim">
          <div className="in cs-fej-be">
            <h2 className="h2" id="belepok-cim">
              {CSOMAGOK_OLDAL.belepokCim}
            </h2>
            <p className="cs-mondat">{CSOMAGOK_OLDAL.belepokMondat}</p>
          </div>
          {BELEPOK.map(({ adat, link }) => (
            <Csomag key={adat.id} adat={adat} link={link} />
          ))}
        </section>

        <section className="cs-sec" id="egyeb-szolgaltatasok" aria-labelledby="tovabbi-cim">
          <div className="in">
            <h2 className="h2" id="tovabbi-cim">
              {CSOMAGOK_OLDAL.tovabbiCim}
            </h2>
            <table className="cs-tabla" role="table">
              <caption className="sr">{CSOMAGOK_OLDAL.tovabbiCim}</caption>
              <colgroup>
                <col />
                <col className="cs-c-ar" />
                <col className="cs-c-afa" />
              </colgroup>
              {TOVABBI_SZOLGALTATASOK.map((s) => (
                <Szolgaltatasok key={s.id} s={s} />
              ))}
            </table>
            <Lab />
          </div>
        </section>

        <section className="cs-sec cs-kapcs" id="kapcsolat" aria-labelledby="h-kapcsolat">
          <div className="in">
            <h2 className="h2" id="h-kapcsolat">
              {K.cim}
            </h2>
            <p className="cs-par-k">
              {K.szoveg} {K.masodik}
            </p>
            <Cimmezo szoveg={JEL.kapcsolat} id="kapcsolat-email" targy={K.targy} />
          </div>
        </section>
      </main>
      <JelLablec aloldal />
    </div>
  )
}
