import type { ReactNode } from 'react'
import { JEL, type ParId } from '@/content/fooldal'
import { KALAND } from '@/content/kaland'
import { Adatlap } from '../elemek/Adatlap'
import { HOM_MAX, HOM_MIN, HOM_UTOLSO, fmt, homAblak, homTrend } from './jelalak'
import { fagyottSav, gepadatEszkoz, qrAbra } from './rajz'
import { HatsoLap, LAP_SZELESSEG, erdeklodesHref, parLapok } from '../retegek/Rete'
import { RETEG, type RetegPar } from '@/content/retegek'

const N = JEL.nyito

/** The Gépadat pair's one machine card: the demo's CNC-1 with its state as a lamp with a legend, the four cells, the word that says the data is simulated, and the temperature as a trend. */
export function GepKartya() {
  const G = N.gepadat
  return (
    <div className="gk">
      <div className="gk-fej">
        <p className="gk-nev">{G.gep.nev}</p>
        <p className="gk-allapot">
          <span className="gk-lampa" aria-hidden="true" />
          {G.gep.allapot}
        </p>
      </div>
      <p className="gk-tipus">{G.gep.tipus}</p>
      <dl className="gk-cellak">
        {G.cellak.map(([cimke, jel, ertek]) => (
          <div key={cimke}>
            <dt>{cimke}</dt>
            <dd className={jel ? 'mono gk-hom' : 'mono'} {...(jel ? { 'data-hom': '' } : {})}>
              {jel ? JEL.munkak.olvasat.temp : ertek}
            </dd>
          </div>
        ))}
      </dl>
      <div className="gk-tr">
        <svg className="gk-trend" role="img" aria-label={G.alt} viewBox="0 0 200 40" preserveAspectRatio="none">
          <path className="ln pen-r" d={homTrend(homAblak(HOM_UTOLSO, 24))} data-trend="" />
        </svg>
        <p className="gk-skala mono" aria-hidden="true">
          <span data-skala="max">{`${fmt(HOM_MAX)} °C`}</span>
          <span data-skala="min">{`${fmt(HOM_MIN)} °C`}</span>
        </p>
      </div>
      <p className="gk-szim">{G.szimulalt}</p>
    </div>
  )
}

/**
 * The screen as one component with three slots in DOM order: the record (the source's data), the samples (the band's values) and the interface (what the screen shows).
 * This page fills only the interface; the other two stay empty (and take no room) until a later layer puts something in them. The head row is the figure's caption.
 */
function Kijelzo({ fej, olvasat, kezelo, rekord, mintak, erdeklodes }: { fej: string; olvasat: string; kezelo: ReactNode; rekord?: ReactNode; mintak?: ReactNode; erdeklodes: string }) {
  return (
    <figure className="kij" data-kij data-s="felulet">
      <figcaption className="kij-fej">
        <span className="kij-cimke">{fej}</span>
        <button type="button" className="rt-nev" data-rt-nev="felulet" tabIndex={-1} disabled>{RETEG.nevek.felulet}</button>
        <span className="mono kij-olv" data-fej-olv="">
          {olvasat}
        </span>
      </figcaption>
      <div className="kij-slot" data-slot="record">
        {rekord}
      </div>
      <div className="kij-slot" data-slot="samples">
        {mintak}
      </div>
      <div className="kij-slot kij-test" data-slot="interface">
        {kezelo}
      </div>
      <div className="rt-lab" hidden>
        <a className="lnk tlnk" data-cel={erdeklodes} hidden>
          {RETEG.erdeklodes}
        </a>
      </div>
      <span className="term" aria-hidden="true" />
    </figure>
  )
}

/** The opening: H1, the subline, the two actions, the source (an offer record, an order row, a machine plate or the bus module), the four keys, the band, the screen and the readout. */
export function Nyitas() {
  const [s1, s2, s3] = JEL.h1.sorok
  const parok = N.parok
  const elso = parok[0]
  const eszkSzeles = gepadatEszkoz(33.6)
  const eszkKeskeny = gepadatEszkoz(20.8, true)
  const rejt = (id: ParId) => (id === 'honlap' ? {} : { hidden: true })
  return (
    <section className="tsec opening" id="nyitas" aria-labelledby="h1" data-run="run">
      <div className="in">
        <span className="lane-ssr" aria-hidden="true" />
        <h1 className="h1" id="h1">
          <span className="l">{s1}</span> <span className="l">{s2}</span> <span className="l">{s3}</span>
        </h1>
        <p className="sub" id="alcim">
          <b>{JEL.alcim.elso}</b> {JEL.alcim.tovabb}
        </p>
        <div className="acts">
          <a className="adl-gomb acts-gomb" href={JEL.akciok.weboldal.href} data-esemeny="fo-gomb">
            {JEL.akciok.weboldal.felirat}
          </a>
          <a className="lnk tlnk acts-link" href={JEL.akciok.szoftver.href}>
            {JEL.akciok.szoftver.felirat}
          </a>
          <button type="button" className="lnk tlnk acts-vilag" aria-haspopup="dialog" data-vilag-belepo="" hidden>
            {KALAND.belepes.gomb}
          </button>
        </div>
        <div className="par">
          <div className="src">
            <div className="sp" data-p="honlap" {...rejt('honlap')}>
              <Adatlap fej={N.honlap.fej} cim={N.honlap.cim} sorok={N.honlap.sorok.map(([cimke, ertek]) => ({ cimke, ertek }))} />
            </div>
            <div className="sp sp-rendeles" data-p="rendeles" {...rejt('rendeles')}>
              <Adatlap fej={N.rendeles.fej} cim={N.rendeles.cim} sorok={N.rendeles.sorok.map(([cimke, ertek]) => ({ cimke, ertek }))} />
            </div>
            <div className="sp sp-gk" data-p="gepkonyv" {...rejt('gepkonyv')}>
              <Adatlap fej={N.gepkonyv.fej} cim={N.gepkonyv.cim} sorok={N.gepkonyv.sorok.map(([cimke, ertek]) => ({ cimke, ertek }))} />
              <div className="qr-cimke">
                <span data-tema="vilagos" dangerouslySetInnerHTML={{ __html: qrAbra(N.gepkonyv.qrAlt) }} />
                <span className="qr-szoveg">{N.gepkonyv.qrCimke}</span>
              </div>
            </div>
            <div className="sp sp-gd" data-p="gepadat" {...rejt('gepadat')}>
              <span className="esz esz-w" style={{ width: eszkSzeles.w }} dangerouslySetInnerHTML={{ __html: eszkSzeles.svg }} />
              <span className="esz esz-n" style={{ width: eszkKeskeny.w }} dangerouslySetInnerHTML={{ __html: eszkKeskeny.svg }} />
            </div>
          </div>
          <div className="keys" role="radiogroup" aria-label={N.kulcsok.nev}>
            {parok.map((p) => (
              <button
                key={p.id}
                type="button"
                className="key-gomb"
                role="radio"
                aria-checked={p.id === elso.id}
                tabIndex={p.id === elso.id ? 0 : -1}
                data-p={p.id}
                data-ro={p.mondat}
                data-olv={p.olvasat}
                data-fej-olv={p.fejOlvasat}
                data-rt-erd={erdeklodesHref(p.munka)}
                data-jel-js=""
                disabled
              >
                {p.kulcs}
              </button>
            ))}
          </div>
        </div>
        <div className="sav" role="img" aria-label={N.savAlt}>
          <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: fagyottSav(971, 228, 'fz-ssr fz-w') + fagyottSav(340, 170, 'fz-ssr fz-m') + fagyottSav(225, 120, 'fz-ssr fz-n') }} />
        </div>
        {(['honlap', 'rendeles', 'gepkonyv', 'gepadat'] as RetegPar[]).flatMap((par) => {
          const L = parLapok(par)
          return (['adat', 'szabaly'] as const).map((lap) => <HatsoLap key={`${par}-${lap}`} par={par} lap={lap} tartalom={L[lap]} szeles={LAP_SZELESSEG[L.alak]} jel />)
        })}
        <Kijelzo
          fej={N.kijelzo}
          olvasat={elso.fejOlvasat}
          erdeklodes={erdeklodesHref(elso.munka)}
          kezelo={[
            <div className="kp kp-p" data-p="honlap" key="honlap" {...rejt('honlap')}>
              <img src={`/work/${N.honlap.kep.fajl}`} width={N.honlap.kep.szelesseg} height={N.honlap.kep.magassag} alt={N.honlap.kep.alt} />
            </div>,
            <div className="kp kp-l" data-p="rendeles" key="rendeles" {...rejt('rendeles')}>
              <img src={`/work/${N.rendeles.kep.fajl}`} width={N.rendeles.kep.szelesseg} height={N.rendeles.kep.magassag} alt={N.rendeles.kep.alt} />
            </div>,
            <div className="kp kp-p" data-p="gepkonyv" key="gepkonyv" {...rejt('gepkonyv')}>
              <img src={`/work/${N.gepkonyv.kep.fajl}`} width={N.gepkonyv.kep.szelesseg} height={N.gepkonyv.kep.magassag} alt={N.gepkonyv.kep.alt} />
            </div>,
            <div className="kp kp-l" data-p="gepadat" key="gepadat" {...rejt('gepadat')}>
              <GepKartya />
            </div>,
          ]}
        />
        <div className="ctl-row">
          <p className="readout" aria-live="polite">
            {elso.mondat}
          </p>
          <div className="ctl-grp">
            <span className="reading mono" aria-hidden="true" data-olv="">
              {elso.olvasat}
            </span>
            <div className="ctl">
              <button type="button" className="runbtn" aria-pressed="true" aria-label={JEL.futas.nev} data-jel-js="" disabled>
                <span className="rs" aria-hidden="true" />
                <span className="rt">{JEL.futas.fut}</span>
              </button>
              <span className="runlbl" hidden>
                {JEL.futas.egyszeri}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
