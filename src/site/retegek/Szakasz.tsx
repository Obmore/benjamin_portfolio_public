import { JEL, type ParId } from '@/content/fooldal'
import { RETEG, type RetegPar } from '@/content/retegek'
import { GepKartya } from '../fooldal/Nyitas'
import { HatsoLap, LAP_SZELESSEG, LANE, erdeklodesHref, parLapok } from './Rete'

const PAROK: readonly RetegPar[] = ['honlap', 'rendeles', 'gepkonyv', 'gepadat']
/** The pair whose stack the section shows first: GÉPADAT, the one whose three layers carry one real series end to end. */
const ALAP: RetegPar = 'gepadat'

/** Felület of one pair: PR B's screen (the capture, or the machine card), its head's reading, the blank lane, the reserved foot row with the earned link. */
function FeluletLap({ par, szeles }: { par: ParId; szeles: number }) {
  const N = JEL.nyito
  const p = N.parok.find((q) => q.id === par)!
  const kep = par === 'honlap' ? N.honlap.kep : par === 'rendeles' ? N.rendeles.kep : par === 'gepkonyv' ? N.gepkonyv.kep : null
  void szeles
  return (
    <section className="rt-lap rt-fel" data-s="felulet" role="group" aria-label={RETEG.nevek.felulet}>
      <div className="rt-fej">
        <button type="button" className="rt-nev" data-rt-nev="felulet" tabIndex={-1} disabled>{RETEG.nevek.felulet}</button>
        <span className="mono" {...(par === 'gepadat' ? { 'data-rt-olv': '' } : {})}>{p.fejOlvasat}</span>
      </div>
      <div className="rt-lane" aria-hidden="true" />
      <div className="rt-test rt-kep">
        {kep ? <img src={`/work/${kep.fajl}`} width={kep.szelesseg} height={kep.magassag} alt={kep.alt} loading="lazy" /> : <GepKartya />}
      </div>
      <div className="rt-lab"><a className="lnk tlnk" data-cel={erdeklodesHref(p.munka)} data-rt-erdeklodes="" hidden>{RETEG.erdeklodes}</a></div>
      <i className="mk" data-m="tl" style={{ left: 0, top: 0 }} />
      <i className="mk" data-m="tr" style={{ left: '100%', top: 0 }} />
      <i className="mk" data-m="bl" style={{ left: 0, top: '100%' }} />
      <i className="mk" data-m="br" style={{ left: '100%', top: '100%' }} />
      <i className="mk" data-m="nd" style={{ left: 'calc(100% - 17px)', top: 22 }} />
      <i className="rt-nd" aria-hidden="true" />
    </section>
  )
}

/** The pair's stack as the section draws it: closed (assembled) in the markup; the script takes it apart. */
export function ParRete({ par, rejtett }: { par: RetegPar; rejtett: boolean }) {
  const L = parLapok(par)
  const sz = LAP_SZELESSEG[L.alak]
  const key = par as ParId
  return (
    <div className="rt" data-rt="szakasz" data-par={par} data-alak={L.alak} data-allapot="zart" data-elol="felulet" {...(rejtett ? { hidden: true } : {})}>
      <HatsoLap par={par} lap="adat" tartalom={L.adat} szeles={sz} />
      <HatsoLap par={par} lap="szabaly" tartalom={L.szabaly} szeles={sz} />
      <FeluletLap par={key} szeles={sz} />
    </div>
  )
}

/** The "Rétegek" section (decision B, 2026-11-19): the taken-apart drawing in its own full-width section directly under the first screen. Left of the stack: the four pair keys, the pair's caption, the label. */
export function Retegek() {
  const N = JEL.nyito
  const alap = N.parok.find((p) => p.id === ALAP)!
  void LANE
  return (
    <section className="tsec rt-sec" id="retegek" aria-labelledby="h-retegek" data-retegek-sec="">
      <div className="in">
        <div className="rt-bal">
          <h2 className="rt-cim" id="h-retegek">{RETEG.szakasz}</h2>
          <p className="rt-leir" data-rt-leir="" aria-live="polite">{alap.mondat}</p>
          <div className="rt-keys" role="radiogroup" aria-label={N.kulcsok.nev}>
            {N.parok.map((p) => (
              <button key={p.id} type="button" className="rt-gomb" role="radio" aria-checked={p.id === ALAP} tabIndex={p.id === ALAP ? 0 : -1} data-rt-par={p.id} data-ro={p.mondat} disabled>
                {p.kulcs}
              </button>
            ))}
          </div>
        </div>
        <div className="rt-st" data-rt-st="">
          {PAROK.map((p) => <ParRete key={p} par={p} rejtett={p !== ALAP} />)}
          <svg className="rt-ov" aria-hidden="true" focusable="false" />
        </div>
      </div>
    </section>
  )
}
