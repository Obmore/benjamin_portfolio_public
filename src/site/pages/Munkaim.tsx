import type { CSSProperties } from 'react'
import { JEL } from '@/content/fooldal'
import { MUNKAIM_KAPCSOLAT, MUNKAIM_OLDAL, EVEK, ROLLIN_KEP } from '@/content/munkaim'
import { MUNKAK, SAJAT_HONLAP, technikaCimkek, type Munka } from '@/content/munkak'
import { IDOVONAL, TERULETEK, evSzoveg } from '@/content/tapasztalat'
import { SZOVEG as ROLLIN } from '../../rollin/szoveg'
import { Cimmezo } from '../elemek/Cimmezo'
import { Ugrasok } from '../elemek/Ugrasok'
import { evek } from '../evek'
import { JelFejlec } from '../fooldal/Fejlec'
import { JelLablec } from '../fooldal/Lablec'
import { Kep, useEpites } from '../util'

// /munkaim/ on the shared layer (PR 7, spec 40): the page header, five work blocks and "Ez a honlap" on the signal line, "Évek" (the former /tapasztalat/) and the shared
// contact end. A work block is one screen built from the record panel's parts (src/site/elemek/adatlap.css) with the text on the paper beside or under it; Rollin's screen also holds the dock
// scene (src/rollin/, started by src/site/munkaim.ts). The taps and the loop are drawn in markup and CSS (src/site/munkaim.css); the contact end draws its own.
// Pills (UI PR 1): a pill that can be operated is blue-collared or ink-outlined and 44 px high (the jump pills under the intro, the one link of a block: solid with "→" for a page of this site, outlined with "↗" for another site);
// a tag is small, mono, hairline-outlined and does nothing (the technique list). The words on them are the ones already on the page; nothing here adds a number, a status or a label.

const C = MUNKAIM_OLDAL.cimkek

/** The arrows of the link pills, drawn (the page font has no arrow glyphs): "→" for a page of this site, "↗" for another site. Decorative: the link's words say where it goes. */
function Nyil({ kulso }: { kulso: boolean }) {
  return (
    <svg className="mb-nyil" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path d={kulso ? 'M4 12L12 4M5.5 4H12V10.5' : 'M2.5 8H13M9 4L13 8L9 12'} />
    </svg>
  )
}

/** The headline with its accent word: the text is the content's `cim`, the word `kiemelt` gets the page's signal colour (munkaim.css, .ph-akc). A word that is not in the headline stops the build. */
function Cim({ szoveg, kiemelt }: { szoveg: string; kiemelt: string }) {
  const i = szoveg.lastIndexOf(kiemelt)
  if (i < 0) throw new Error(`/munkaim/: a kiemelt szó nincs a címben: ${kiemelt}`)
  return (
    <>
      {szoveg.slice(0, i)}
      <span className="ph-akc">{kiemelt}</span>
      {szoveg.slice(i + kiemelt.length)}
    </>
  )
}

/** The technique line: the label, then one tag per item (the source text is one comma-separated string, src/content/munkak.ts). */
function Technika({ szoveg }: { szoveg: string }) {
  return (
    <div className="mb-tech">
      <b>{C.technika}</b>
      <ul className="mb-tagek">
        {technikaCimkek(szoveg).map((t) => (
          <li className="mb-tag mono" key={t}>
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Sorok({ munka }: { munka: Munka }) {
  const sorok = [
    [C.feladat, munka.feladat],
    [C.amitCsinaltam, munka.amitCsinaltam],
    [C.amitKap, munka.amitKap],
  ].filter((s): s is [string, string] => Boolean(s[1]))
  if (sorok.length === 0) return null
  return (
    <dl className="adl-sorok">
      {sorok.map(([cimke, ertek]) => (
        <div className="adl-sor" key={cimke}>
          <dt className="adl-cimke">{cimke}</dt>
          <dd className="adl-ertek">{ertek}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The Rollin controls (S5): one single-choice group, the photo first, then the four steps; the status line shows the caption with the photo. Script only: no script, no keys (munkaim.css); the keys stay disabled until the scene chunk is ready. */
function RollinVezerlo() {
  const nevek = [ROLLIN_KEP.fenykep, ...ROLLIN.lepesek]
  return (
    <div className="mb-vez" data-rollin-vez="" data-allapot="betolt">
      <div className="mb-gombok" role="radiogroup" aria-label={ROLLIN.csoport}>
        {nevek.map((nev, i) => (
          <button key={nev} type="button" className="mb-gomb" role="radio" aria-checked={i === 0} tabIndex={i === 0 ? 0 : -1} data-lepes={i} data-jel-js="" disabled>
            {nev}
          </button>
        ))}
      </div>
      <p className="mb-allapot" aria-hidden="true" data-alairas={ROLLIN_KEP.alairas}>
        {ROLLIN_KEP.alairas}
      </p>
      <p className="sr mb-bejelentes" />
    </div>
  )
}

function Munkablokk({ munka, elso }: { munka: Munka; elso: boolean }) {
  const rollin = munka.id === 'rollin'
  const kulso = /^https?:\/\//.test(munka.elo.href)
  return (
    <li className="in mb" id={`munka-${munka.id}`}>
      <i className="mb-tap" aria-hidden="true" />
      <div className="mb-verem">
        <figure className="adl mb-kep" data-s="felulet">
          <div className="adl-fej">
            <span className="mb-fajta">{munka.fajta}</span>
            <span className="mb-cim mono">{munka.cim}</span>
          </div>
          <i className="adl-bel" aria-hidden="true" />
          <div className="mb-ter">
            {/* The first block's picture is the LCP element at 360 and 1280 px (measured 2026-11-06); the rest stay lazy. */}
            <Kep {...munka.kep} meretek="(min-width: 1024px) 564px, (min-width: 727px) 640px, calc(100vw - 60px)" kiemelt={elso} />
            {rollin ? (
              <div className="mb-rajz" role="img" aria-label={ROLLIN.leiras} hidden data-rollin-rajz="">
                <svg className="rd-render" viewBox="0 0 500 310" width="500" height="310" focusable="false" aria-hidden="true" />
              </div>
            ) : null}
          </div>
        </figure>
      </div>
      {rollin ? <RollinVezerlo /> : null}
      <div className="mb-szov">
        <h3 className="mb-h3">{munka.nev}</h3>
        {munka.sorok.map((s) => (
          <p className="mb-sor" key={s}>
            {s}
          </p>
        ))}
        <Sorok munka={munka} />
        {munka.technika ? <Technika szoveg={munka.technika} /> : null}
        <a className={`mb-cta ${kulso ? 'mb-cta-kulso' : 'mb-cta-teli'}`} href={munka.elo.href} {...(kulso ? { rel: 'noopener' } : {})}>
          {munka.elo.felirat}
          <span className="sr">: {munka.nev}</span>
          <Nyil kulso={kulso} />
        </a>
      </div>
    </li>
  )
}

/** "Ez a honlap": no screen. The line leaves the spine level with the H3, turns down 12 px before the text and returns at the Technika line (a bracket from 727 px, one node below). */
function SajatHonlap() {
  return (
    <li className="in mb mb-sajat" id="munka-sajat-honlap">
      <i className="mb-brk" aria-hidden="true" />
      <div className="mb-szov">
        <h3 className="mb-h3">{SAJAT_HONLAP.cim}</h3>
        <p className="mb-sajat-szoveg">{SAJAT_HONLAP.szoveg}</p>
        <Technika szoveg={SAJAT_HONLAP.technika} />
      </div>
    </li>
  )
}

/** "Évek": the timing diagram (a grid of equal year cells after a fixed lead-in, so every edge is exact at any width, with or without script), its table for assistive technology, the two areas and the closing sentence. */
function Evek() {
  const { ev: epitesEv } = useEpites()
  const g = evek(IDOVONAL, epitesEv)
  const n = g.cellak.length
  return (
    <section className="ev" id="evek" aria-labelledby="evek-cim">
      <div className="in">
        <h2 className="h2" id="evek-cim">
          {EVEK.cim}
        </h2>
        <div className="ev-rajz" id="idovonal" style={{ '--n': n } as CSSProperties} data-evek="">
          <div className="ev-fej" aria-hidden="true">
            <i className="ev-tap" />
            <div className="ev-ax">
              <div className="ev-cellak">
                {g.cellak.map((ev) => (
                  <span className="ev-cella mono" key={ev}>
                    {ev}
                  </span>
                ))}
              </div>
              <i className="ev-csomo" />
            </div>
          </div>
          {IDOVONAL.map((i, sor) => {
            const k = g.csatornak[sor]!
            return (
              <div className="ev-sor" key={`${i.kezdet}-${i.terulet}`} aria-hidden="true" style={{ '--i': sor } as CSSProperties}>
                <p className="ev-cimke">{i.terulet}</p>
                <div className="ev-kan" data-tart={k.tart ? '' : undefined} style={{ '--a': k.kezd, '--b': k.vege } as CSSProperties}>
                  <i className="ev-lo ev-lo-a" />
                  <i className="ev-hi" />
                  {k.tart ? null : <i className="ev-lo ev-lo-b" />}
                </div>
              </div>
            )
          })}
          <table className="sr">
            <caption>{EVEK.tablazat.felirat}</caption>
            <thead>
              <tr>
                <th scope="col">{EVEK.tablazat.ev}</th>
                <th scope="col">{EVEK.tablazat.terulet}</th>
              </tr>
            </thead>
            <tbody>
              {IDOVONAL.map((i) => (
                <tr key={`${i.kezdet}-${i.terulet}`}>
                  <td>{evSzoveg(i)}</td>
                  <td>{i.terulet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ev-teruletek" id="teruletek">
          {TERULETEK.map((t) => (
            <TeruletSor key={t.id} id={t.id} cim={t.cim} reszlet={t.reszlet} link={t.link} />
          ))}
        </div>
        <p className="ev-zaro">{EVEK.zaro}</p>
      </div>
    </section>
  )
}

function TeruletSor({ id, cim, reszlet, link }: { id: string; cim: string; reszlet: string; link: (typeof TERULETEK)[number]['link'] }) {
  return (
    <div className="ev-ter" id={`terulet-${id}`}>
      <h3 className="mb-h3">{cim}</h3>
      <p>{reszlet}</p>
      <p>
        <a className="lnk tlnk" href={link.href}>
          {link.felirat}
        </a>
      </p>
    </div>
  )
}

export function Munkaim() {
  const { demok } = useEpites()
  // A demo's block appears only when its folder is in this build (so a link never points at a 404); every other work has an address of its own.
  const munkak = MUNKAK.filter((m) => !m.elo.href.startsWith('/demos/') || demok.includes(m.id))
  const K = MUNKAIM_KAPCSOLAT
  // The jump pills: each kind of work (the word of the block heads) goes to its first block, "Évek" to its section; the same words as on the page, in the page's order.
  const ugrasok = [
    ...munkak.filter((m, i) => munkak.findIndex((x) => x.fajta === m.fajta) === i).map((m) => ({ felirat: m.fajta, cel: `munka-${m.id}` })),
    { felirat: EVEK.cim, cel: 'evek' },
  ]
  return (
    <div className="page al" id="top">
      <JelFejlec keret={{ oldal: 'aloldal', nyelv: 'hu', aktualis: 'munkak', sajatKapcsolat: true }} />
      <main id="tartalom" className="tsec mb-lap" tabIndex={-1}>
        <div className="sp-l" aria-hidden="true">
          <div className="in">
            <span className="sp" />
          </div>
        </div>
        <section className="ph" aria-labelledby="h1">
          <div className="in">
            <h1 className="ph-h1" id="h1">
              <Cim szoveg={MUNKAIM_OLDAL.cim} kiemelt={MUNKAIM_OLDAL.kiemelt} />
            </h1>
            <p className="mb-bev">{MUNKAIM_OLDAL.bevezeto}</p>
            <Ugrasok elemek={ugrasok} />
          </div>
        </section>

        <section className="mb-sec" id="munkak" aria-labelledby="munkak-cim">
          <h2 className="sr" id="munkak-cim">
            {MUNKAIM_OLDAL.munkakCim}
          </h2>
          <ul className="mb-lista">
            {munkak.map((m, i) => (
              <Munkablokk key={m.id} munka={m} elso={i === 0} />
            ))}
            <SajatHonlap />
          </ul>
        </section>

        <Evek />

        <section className="mb-kapcs" id="kapcsolat" aria-labelledby="h-kapcsolat">
          <div className="in">
            <h2 className="h2" id="h-kapcsolat">
              {K.cim}
            </h2>
            <p className="mb-kapcs-szoveg">{K.szoveg}</p>
            <Cimmezo szoveg={JEL.kapcsolat} id="kapcsolat-email" targy={K.targy} />
          </div>
        </section>
      </main>
      <JelLablec aloldal />
    </div>
  )
}
