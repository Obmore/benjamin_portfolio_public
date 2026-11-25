import { JEL } from '@/content/fooldal'
import { RETEG } from '@/content/retegek'
import { Jelek, LANE } from './Rete'
import { savUt } from './sav'

// The 404's stack: open at rest, it cannot close (no edge strip, no thread beyond Szabály). Adat: the requested path (path only, as text: the script writes it, never as markup); Szabály: the header's
// three links with their targets; Felület: an empty dashed outline and the one sentence the owner approved. Nothing is sent anywhere and nothing is stored.
const SZELES = 250
/** The header's three links with the targets they have on the 404 (src/site/fooldal/Fejlec.tsx: the 404 is a sub-page of the shared header). */
const UTAK = [
  { felirat: JEL.nav.munkak, href: '/munkaim/' },
  { felirat: JEL.nav.csomagok, href: '/megrendeles/' },
  { felirat: JEL.nav.kapcsolat, href: '/#kapcsolat' },
] as const

function Fej({ lap }: { lap: 'adat' | 'szabaly' }) {
  return (
    <div className="rt-fej">
      <button type="button" className="rt-nev" data-rt-nev={lap} tabIndex={-1} disabled>{RETEG.nevek[lap]}</button>
    </div>
  )
}

export function Hiba404() {
  const lane = (lap: 'adat' | 'szabaly') => (
    <div className="rt-lane" aria-hidden="true">
      <svg viewBox={`0 0 ${SZELES} ${LANE}`} preserveAspectRatio="none" focusable="false">
        <path className="rt-ut" pathLength="1" d={savUt('hiba', lap, SZELES, LANE)} />
      </svg>
    </div>
  )
  return (
    <div className="rt-st rt-404" data-rt-st="">
      <div className="rt" data-rt="404" data-par="hiba" data-alak="p" data-allapot="nyitva" data-elol="felulet">
        <section className="rt-lap" data-s="adat" role="group" aria-label={RETEG.nevek.adat}>
          <Fej lap="adat" />
          {lane('adat')}
          <div className="rt-test">
            <dl>
              <div className="rt-s" data-rt-cim-sor="" hidden>
                <dt>{RETEG.kertCim}</dt>
                <dd className="mono" data-rt-cim="" />
              </div>
            </dl>
          </div>
          <Jelek extra={<><i className="mk" data-m="l" style={{ left: 20, top: 64 }} /><i className="mk" data-m="r" style={{ left: '100%', top: 64 }} /></>} />
        </section>
        <section className="rt-lap" data-s="szabaly" role="group" aria-label={RETEG.nevek.szabaly}>
          <Fej lap="szabaly" />
          {lane('szabaly')}
          <div className="rt-test rt-uta">
            {UTAK.map((u) => <a key={u.href} className="lnk tlnk" href={u.href}>{u.felirat}</a>)}
          </div>
          <Jelek extra={<><i className="mk" data-m="l" style={{ left: 20, top: 64 }} /><i className="mk" data-m="r" style={{ left: '100%', top: 64 }} /></>} />
        </section>
        <section className="rt-lap rt-fel rt-ures" data-s="felulet" role="group" aria-label={RETEG.nevek.felulet}>
          <div className="rt-fej">
            <button type="button" className="rt-nev" data-rt-nev="felulet" tabIndex={-1} disabled>{RETEG.nevek.felulet}</button>
          </div>
          <div className="rt-lane" aria-hidden="true" />
          <div className="rt-test"><p>{RETEG.nincsFelulet}</p></div>
          <Jelek extra={<i className="mk" data-m="nd" style={{ left: '100%', top: 22 }} />} />
        </section>
      </div>
      <svg className="rt-ov" aria-hidden="true" focusable="false" />
    </div>
  )
}
